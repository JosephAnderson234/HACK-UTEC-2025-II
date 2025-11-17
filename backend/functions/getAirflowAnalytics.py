"""
Lambda: getAirflowAnalytics
Propósito: Dashboard de métricas de Apache Airflow ML
Roles permitidos: admin, authority (filtrado por sector)
"""

import json
import boto3
from datetime import datetime, timedelta
from collections import Counter
from decimal import Decimal
import sys
import os

# Agregar el directorio padre al path para importar utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.jwt_validator import validate_token, extract_token_from_event, create_response

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')


def handler(event, context):
    """
    GET /reports/airflow/analytics
    Query params: ?period=today|week|month&sector=Mantenimiento
    """
    try:
        # 1. Validar JWT
        token = extract_token_from_event(event)
        if not token:
            return create_response(401, {'error': 'Authorization token required'})
        
        try:
            payload = validate_token(token)
            user_id = payload['user_id']
            role = payload['user_data']['role']
            user_data = payload['user_data']
        except Exception as e:
            return create_response(401, {'error': f'Invalid token: {str(e)}'})
        
        # 2. Solo admin y authority pueden acceder
        if role not in ['admin', 'authority']:
            return create_response(403, {'error': 'Access denied. Only admin and authority roles allowed'})
        
        # 3. Extraer parámetros de query
        query_params = event.get('queryStringParameters') or {}
        period = query_params.get('period', 'week')
        sector_filter = query_params.get('sector')
        
        # Validar período
        if period not in ['today', 'week', 'month']:
            period = 'week'
        
        # Authority solo puede ver su sector
        if role == 'authority':
            user_sector = user_data.get('data_authority', {}).get('sector')
            if not user_sector:
                return create_response(400, {'error': 'Authority user must have a sector assigned'})
            sector_filter = user_sector
        
        # 4. Calcular rango de fechas
        now = datetime.utcnow()
        if period == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        else:  # week
            start_date = now - timedelta(days=7)
        
        start_date_str = start_date.isoformat() + 'Z'
        
        # 5. Obtener reportes del período
        print(f"Scanning reports from {start_date_str} to now")
        response = reports_table.scan()
        all_reports = response.get('Items', [])
        
        # Manejar paginación de DynamoDB
        while 'LastEvaluatedKey' in response:
            response = reports_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            all_reports.extend(response.get('Items', []))
        
        # Filtrar por fecha
        reports = [r for r in all_reports if r.get('created_at', '') >= start_date_str]
        print(f"Found {len(reports)} reports in period")
        
        # Filtrar por sector si aplica
        if sector_filter:
            reports = [r for r in reports if r.get('assigned_sector') == sector_filter]
            print(f"Filtered to {len(reports)} reports for sector {sector_filter}")
        
        # 6. Calcular métricas de Airflow
        analytics = calculate_airflow_analytics(reports, period, start_date_str, now.isoformat() + 'Z')
        
        return create_response(200, analytics)
        
    except Exception as e:
        print(f"Error in getAirflowAnalytics: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': 'Internal server error', 'details': str(e)})


def calculate_airflow_analytics(reports, period, start_date, end_date):
    """
    Calcula todas las métricas de Apache Airflow ML
    """
    # Convertir Decimal a tipos nativos
    reports = decimal_to_native(reports)
    
    total_reports = len(reports)
    ml_reports = [r for r in reports if r.get('clasificacion_auto')]
    pending_ml = [r for r in reports if not r.get('clasificacion_auto')]
    
    # 1. Procesamiento de Airflow
    processing_rate = (len(ml_reports) / total_reports * 100) if total_reports > 0 else 0
    
    # Calcular tiempo promedio de procesamiento
    processing_times = []
    for r in ml_reports:
        if r.get('created_at') and r.get('updated_at'):
            try:
                created = datetime.fromisoformat(r['created_at'].replace('Z', '+00:00'))
                updated = datetime.fromisoformat(r['updated_at'].replace('Z', '+00:00'))
                minutes = (updated - created).total_seconds() / 60
                if 0 < minutes < 30:  # Filtrar outliers
                    processing_times.append(minutes)
            except:
                pass
    
    avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
    
    # 2. Clasificación ML
    scores = [r.get('classification_score', 0) for r in ml_reports if r.get('classification_score')]
    avg_score = sum(scores) / len(scores) if scores else 0
    
    high_conf = len([s for s in scores if s >= 0.7])
    medium_conf = len([s for s in scores if 0.4 <= s < 0.7])
    low_conf = len([s for s in scores if s < 0.4])
    
    # 3. Reclasificaciones
    reclassified = [
        r for r in ml_reports 
        if r.get('urgencia_original') and r.get('urgencia_clasificada')
        and r.get('urgencia_original') != r.get('urgencia_clasificada')
    ]
    
    elevated = [
        r for r in reclassified 
        if urgency_level(r['urgencia_clasificada']) > urgency_level(r['urgencia_original'])
    ]
    reduced = [r for r in reclassified if r not in elevated]
    
    # Contar cambios específicos
    changes_count = Counter()
    for r in reclassified:
        orig = r.get('urgencia_original')
        clasif = r.get('urgencia_clasificada')
        key = f"{orig}_to_{clasif}"
        changes_count[key] += 1
    
    # 4. Comparación de urgencias
    original_dist = {'BAJA': 0, 'MEDIA': 0, 'ALTA': 0}
    classified_dist = {'BAJA': 0, 'MEDIA': 0, 'ALTA': 0}
    
    for r in ml_reports:
        if r.get('urgencia_original'):
            original_dist[r['urgencia_original']] += 1
        if r.get('urgencia_clasificada'):
            classified_dist[r['urgencia_clasificada']] += 1
    
    # Calcular impacto en ALTA urgencias
    original_alta = original_dist['ALTA']
    classified_alta = classified_dist['ALTA']
    if original_alta > 0:
        alta_increase = ((classified_alta - original_alta) / original_alta * 100)
        if alta_increase > 0:
            impact_message = f"+{int(alta_increase)}% más urgencias ALTA detectadas por ML"
        else:
            impact_message = f"{int(alta_increase)}% cambio en urgencias ALTA"
    else:
        if classified_alta > 0:
            impact_message = f"{classified_alta} urgencias ALTA detectadas por ML"
        else:
            impact_message = "Sin urgencias ALTA en el período"
    
    # 5. Notificaciones automáticas
    notified = [r for r in ml_reports if r.get('notification_sent')]
    high_urgency_notif = [r for r in notified if r.get('urgencia_clasificada') == 'ALTA']
    high_score_notif = [
        r for r in notified 
        if r.get('classification_score', 0) >= 0.7 and r.get('urgencia_clasificada') != 'ALTA'
    ]
    
    # Tiempo promedio de notificación
    notif_times = []
    for r in notified:
        if r.get('created_at') and r.get('notification_sent_at'):
            try:
                created = datetime.fromisoformat(r['created_at'].replace('Z', '+00:00'))
                notif = datetime.fromisoformat(r['notification_sent_at'].replace('Z', '+00:00'))
                minutes = (notif - created).total_seconds() / 60
                if 0 < minutes < 30:
                    notif_times.append(minutes)
            except:
                pass
    
    avg_notif_time = sum(notif_times) / len(notif_times) if notif_times else 0
    
    # 6. Keywords detectadas
    high_risk_kw = ['robo', 'violencia', 'seguridad', 'fuego', 'incendio', 'emergencia']
    medium_risk_kw = ['fuga', 'agua', 'electricidad', 'daño', 'roto', 'sistema']
    
    keyword_counts = Counter()
    keyword_risk = {}
    
    for r in ml_reports:
        desc = (r.get('descripcion') or '').lower()
        for kw in high_risk_kw:
            if kw in desc:
                keyword_counts[kw] += 1
                keyword_risk[kw] = 'high'
        for kw in medium_risk_kw:
            if kw in desc:
                keyword_counts[kw] += 1
                keyword_risk[kw] = 'medium'
    
    top_keywords = [
        {
            'keyword': kw,
            'count': count,
            'risk_level': keyword_risk.get(kw, 'medium')
        }
        for kw, count in keyword_counts.most_common(10)
    ]
    
    # 7. Métricas de impacto
    authorities_notified = len(set([r.get('assigned_to') for r in notified if r.get('assigned_to')]))
    
    # Calcular mejora en respuesta (reportes con alta confianza se resuelven más rápido)
    high_conf_reports = [r for r in ml_reports if r.get('classification_score', 0) >= 0.7]
    low_conf_reports = [r for r in ml_reports if r.get('classification_score', 0) < 0.7]
    
    high_conf_resolved = [r for r in high_conf_reports if r.get('estado') == 'RESUELTO']
    low_conf_resolved = [r for r in low_conf_reports if r.get('estado') == 'RESUELTO']
    
    response_improvement = "N/A"
    if len(high_conf_resolved) > 0 and len(low_conf_resolved) > 0:
        # Calcular tiempo promedio de resolución
        high_times = []
        for r in high_conf_resolved:
            if r.get('created_at') and r.get('resolved_at'):
                try:
                    created = datetime.fromisoformat(r['created_at'].replace('Z', '+00:00'))
                    resolved = datetime.fromisoformat(r['resolved_at'].replace('Z', '+00:00'))
                    hours = (resolved - created).total_seconds() / 3600
                    if 0 < hours < 72:  # Filtrar outliers (menos de 3 días)
                        high_times.append(hours)
                except:
                    pass
        
        low_times = []
        for r in low_conf_resolved:
            if r.get('created_at') and r.get('resolved_at'):
                try:
                    created = datetime.fromisoformat(r['created_at'].replace('Z', '+00:00'))
                    resolved = datetime.fromisoformat(r['resolved_at'].replace('Z', '+00:00'))
                    hours = (resolved - created).total_seconds() / 3600
                    if 0 < hours < 72:
                        low_times.append(hours)
                except:
                    pass
        
        if high_times and low_times:
            avg_high = sum(high_times) / len(high_times)
            avg_low = sum(low_times) / len(low_times)
            improvement = ((avg_low - avg_high) / avg_low * 100)
            if improvement > 0:
                response_improvement = f"{int(improvement)}%"
    
    return {
        'period': period,
        'date_range': {
            'from': start_date,
            'to': end_date
        },
        'airflow_processing': {
            'total_reports': total_reports,
            'processed_by_ml': len(ml_reports),
            'pending_classification': len(pending_ml),
            'processing_rate': round(processing_rate, 1),
            'avg_processing_time_minutes': round(avg_processing_time, 1)
        },
        'ml_classification': {
            'avg_confidence_score': round(avg_score, 2),
            'confidence_distribution': {
                'high': high_conf,
                'medium': medium_conf,
                'low': low_conf
            }
        },
        'urgency_reclassification': {
            'total_reclassified': len(reclassified),
            'reclassification_rate': round(len(reclassified) / len(ml_reports) * 100, 1) if ml_reports else 0,
            'changes': {
                'elevated': len(elevated),
                'reduced': len(reduced),
                'elevation_rate': round(len(elevated) / len(reclassified) * 100, 1) if reclassified else 0
            },
            'by_original_urgency': dict(changes_count)
        },
        'urgency_comparison': {
            'original': original_dist,
            'classified': classified_dist,
            'impact': impact_message
        },
        'automated_notifications': {
            'total_sent': len(notified),
            'notification_rate': round(len(notified) / len(ml_reports) * 100, 1) if ml_reports else 0,
            'by_reason': {
                'high_urgency': len(high_urgency_notif),
                'high_confidence': len(high_score_notif)
            },
            'avg_notification_time_minutes': round(avg_notif_time, 1)
        },
        'top_detected_keywords': top_keywords,
        'impact_metrics': {
            'reports_prioritized': len(elevated),
            'authorities_notified': authorities_notified,
            'avg_response_improvement': response_improvement
        }
    }


def urgency_level(urgency):
    """Convierte urgencia a nivel numérico para comparación"""
    levels = {'BAJA': 1, 'MEDIA': 2, 'ALTA': 3}
    return levels.get(urgency, 0)


def decimal_to_native(obj):
    """Convierte objetos Decimal de DynamoDB a tipos nativos de Python"""
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj
