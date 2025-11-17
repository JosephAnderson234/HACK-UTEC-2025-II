"""
Lambda: getStats
Propósito: Obtener estadísticas personalizadas según el rol del usuario
Roles permitidos: student, authority, admin
"""

import json
import boto3
from datetime import datetime, timedelta
from utils.jwt_validator import validate_token, extract_token_from_event, create_response

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')
users_table = dynamodb.Table('t_usuarios')
places_table = dynamodb.Table('t_lugares')


def handler(event, context):
    """
    GET /stats
    Query params: ?period=week (today|week|month|year)
    
    Retorna estadísticas personalizadas según el rol:
    - student: Mis reportes + estadísticas generales
    - authority: Reportes de mi sector + estadísticas de mi sector
    - admin: Estadísticas completas del sistema
    """
    try:
        # 1. Extraer y validar token
        token = extract_token_from_event(event)
        if not token:
            return create_response(401, {'error': 'Authorization token required'})
        
        # 2. Validar token y verificar usuario en BD
        payload = validate_token(token)
        user_id = payload['user_id']
        role = payload['user_data']['role']
        user_data = payload['user_data']
        
        # 3. Obtener período de tiempo
        query_params = event.get('queryStringParameters') or {}
        period = query_params.get('period', 'week').lower()
        
        # Calcular rango de fechas
        now = datetime.utcnow()
        if period == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=7)  # Default: week
        
        start_date_str = start_date.isoformat() + 'Z'
        
        # 4. Obtener todos los reportes
        response = reports_table.scan()
        all_reports = response.get('Items', [])
        
        while 'LastEvaluatedKey' in response:
            response = reports_table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            all_reports.extend(response.get('Items', []))
        
        # Filtrar por fecha
        reports_in_period = [
            r for r in all_reports 
            if r.get('created_at', '') >= start_date_str
        ]
        
        # 5. Generar estadísticas según el rol
        if role == 'student':
            stats = generate_student_stats(user_id, reports_in_period, all_reports, period, start_date_str, now)
        elif role == 'authority':
            user_sector = user_data.get('data_authority', {}).get('sector', '')
            stats = generate_authority_stats(user_id, user_sector, reports_in_period, all_reports, period, start_date_str, now)
        elif role == 'admin':
            stats = generate_admin_stats(reports_in_period, all_reports, period, start_date_str, now)
        else:
            return create_response(403, {'error': 'Invalid role'})
        
        return create_response(200, stats)
        
    except Exception as e:
        print(f"Error in getStats: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': 'Internal server error', 'details': str(e)})


def generate_student_stats(user_id, reports_in_period, all_reports, period, start_date, now):
    """Estadísticas para estudiantes: sus reportes + vista general"""
    
    # Mis reportes en el período
    my_reports_period = [r for r in reports_in_period if r.get('author_id') == user_id]
    my_reports_total = [r for r in all_reports if r.get('author_id') == user_id]
    
    # Contadores de mis reportes
    my_pending = len([r for r in my_reports_total if r.get('estado') == 'PENDIENTE'])
    my_in_progress = len([r for r in my_reports_total if r.get('estado') == 'ATENDIENDO'])
    my_resolved = len([r for r in my_reports_total if r.get('estado') == 'RESUELTO'])
    
    # Estadísticas generales del sistema (para contexto)
    total_system = len(reports_in_period)
    system_by_urgencia = {
        'BAJA': len([r for r in reports_in_period if r.get('urgencia') == 'BAJA']),
        'MEDIA': len([r for r in reports_in_period if r.get('urgencia') == 'MEDIA']),
        'ALTA': len([r for r in reports_in_period if r.get('urgencia') == 'ALTA'])
    }
    
    return {
        'role': 'student',
        'period': period,
        'date_range': {
            'from': start_date,
            'to': now.isoformat() + 'Z'
        },
        'my_reports': {
            'total': len(my_reports_total),
            'in_period': len(my_reports_period),
            'pendiente': my_pending,
            'atendiendo': my_in_progress,
            'resuelto': my_resolved,
            'by_urgencia': {
                'BAJA': len([r for r in my_reports_total if r.get('urgencia') == 'BAJA']),
                'MEDIA': len([r for r in my_reports_total if r.get('urgencia') == 'MEDIA']),
                'ALTA': len([r for r in my_reports_total if r.get('urgencia') == 'ALTA'])
            }
        },
        'system_overview': {
            'total_reports_in_period': total_system,
            'by_urgencia': system_by_urgencia
        }
    }


def generate_authority_stats(user_id, user_sector, reports_in_period, all_reports, period, start_date, now):
    """Estadísticas para autoridades: reportes de su sector"""
    
    # Reportes de mi sector
    sector_reports_period = [r for r in reports_in_period if r.get('assigned_sector') == user_sector]
    sector_reports_total = [r for r in all_reports if r.get('assigned_sector') == user_sector]
    
    # Reportes asignados a mí
    my_assigned_reports = [r for r in sector_reports_total if r.get('assigned_to') == user_id]
    
    # Contadores por estado (sector)
    sector_pending = len([r for r in sector_reports_total if r.get('estado') == 'PENDIENTE'])
    sector_in_progress = len([r for r in sector_reports_total if r.get('estado') == 'ATENDIENDO'])
    sector_resolved = len([r for r in sector_reports_total if r.get('estado') == 'RESUELTO'])
    
    # Contadores por urgencia (sector)
    sector_by_urgencia = {
        'BAJA': len([r for r in sector_reports_period if r.get('urgencia') == 'BAJA']),
        'MEDIA': len([r for r in sector_reports_period if r.get('urgencia') == 'MEDIA']),
        'ALTA': len([r for r in sector_reports_period if r.get('urgencia') == 'ALTA'])
    }
    
    # Mis reportes asignados por estado
    my_pending = len([r for r in my_assigned_reports if r.get('estado') == 'PENDIENTE'])
    my_in_progress = len([r for r in my_assigned_reports if r.get('estado') == 'ATENDIENDO'])
    my_resolved = len([r for r in my_assigned_reports if r.get('estado') == 'RESUELTO'])
    
    return {
        'role': 'authority',
        'sector': user_sector,
        'period': period,
        'date_range': {
            'from': start_date,
            'to': now.isoformat() + 'Z'
        },
        'my_sector': {
            'total_reports': len(sector_reports_total),
            'in_period': len(sector_reports_period),
            'pendiente': sector_pending,
            'atendiendo': sector_in_progress,
            'resuelto': sector_resolved,
            'by_urgencia': sector_by_urgencia
        },
        'my_assigned': {
            'total': len(my_assigned_reports),
            'pendiente': my_pending,
            'atendiendo': my_in_progress,
            'resuelto': my_resolved
        }
    }


def generate_admin_stats(reports_in_period, all_reports, period, start_date, now):
    """Estadísticas para administradores: vista completa del sistema"""
    
    # Totales
    total_reports = len(all_reports)
    total_in_period = len(reports_in_period)
    
    # Por estado
    by_estado = {
        'PENDIENTE': len([r for r in all_reports if r.get('estado') == 'PENDIENTE']),
        'ATENDIENDO': len([r for r in all_reports if r.get('estado') == 'ATENDIENDO']),
        'RESUELTO': len([r for r in all_reports if r.get('estado') == 'RESUELTO'])
    }
    
    # Por urgencia (en período)
    by_urgencia = {
        'BAJA': len([r for r in reports_in_period if r.get('urgencia') == 'BAJA']),
        'MEDIA': len([r for r in reports_in_period if r.get('urgencia') == 'MEDIA']),
        'ALTA': len([r for r in reports_in_period if r.get('urgencia') == 'ALTA'])
    }
    
    # Por sector
    sectores = {}
    for report in all_reports:
        sector = report.get('assigned_sector', 'Sin asignar')
        sectores[sector] = sectores.get(sector, 0) + 1
    
    # Por sector en período
    sectores_period = {}
    for report in reports_in_period:
        sector = report.get('assigned_sector', 'Sin asignar')
        sectores_period[sector] = sectores_period.get(sector, 0) + 1
    
    # Reportes sin asignar
    unassigned = len([r for r in all_reports if r.get('assigned_to') is None])
    
    # Promedio de tiempo de resolución (solo resueltos)
    resolved_reports = [r for r in all_reports if r.get('estado') == 'RESUELTO' and r.get('resolved_at') and r.get('created_at')]
    avg_resolution_time = None
    if resolved_reports:
        total_time = 0
        for r in resolved_reports:
            try:
                created = datetime.fromisoformat(r['created_at'].replace('Z', '+00:00'))
                resolved = datetime.fromisoformat(r['resolved_at'].replace('Z', '+00:00'))
                total_time += (resolved - created).total_seconds()
            except:
                pass
        if len(resolved_reports) > 0:
            avg_resolution_time = total_time / len(resolved_reports) / 3600  # En horas
    
    return {
        'role': 'admin',
        'period': period,
        'date_range': {
            'from': start_date,
            'to': now.isoformat() + 'Z'
        },
        'summary': {
            'total_reportes': total_reports,
            'in_period': total_in_period,
            'pendiente': by_estado['PENDIENTE'],
            'atendiendo': by_estado['ATENDIENDO'],
            'resuelto': by_estado['RESUELTO'],
            'sin_asignar': unassigned
        },
        'by_urgencia': by_urgencia,
        'by_sector': {
            'total': sectores,
            'in_period': sectores_period
        },
        'performance': {
            'avg_resolution_time_hours': round(avg_resolution_time, 2) if avg_resolution_time else None,
            'resolution_rate': round((by_estado['RESUELTO'] / total_reports * 100), 2) if total_reports > 0 else 0
        }
    }
