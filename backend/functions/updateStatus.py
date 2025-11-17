import json
import boto3
import os
import sys
from datetime import datetime
from decimal import Decimal

# Agregar el directorio padre al path para importar utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.jwt_validator import validate_token, extract_token_from_event, create_response

dynamodb = boto3.resource('dynamodb')
events = boto3.client('events')

# Helper para convertir Decimal a tipos nativos de Python
def decimal_to_native(obj):
    """Convierte Decimal a int o float según corresponda"""
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

def handler(event, context):
    """
    Handler para actualizar el estado de un reporte.
    Requiere autenticación JWT.
    Solo autoridades y administradores pueden actualizar estados.
    
    POST /update-status
    Body: {
        "id_reporte": "uuid",
        "estado": "PENDIENTE" | "ATENDIENDO" | "RESUELTO",
        "comentario": "string" (opcional)
    }
    """
    try:
        # Validar token JWT
        token = extract_token_from_event(event)
        if not token:
            return create_response(401, {'error': 'Missing authentication token'})
        
        try:
            token_data = validate_token(token)
            user_id = token_data['user_id']
            user_role = token_data.get('role')
        except Exception as e:
            return create_response(401, {'error': f'Invalid token: {str(e)}'})
        
        # Solo autoridades pueden actualizar estados
        if user_role not in ['authority', 'admin']:
            return create_response(403, {'error': 'Only authorities can update report status'})
        
        # Parsear el body
        body = json.loads(event.get('body', '{}'))
        
        # Validar campos requeridos
        if 'id_reporte' not in body or 'estado' not in body:
            return create_response(400, {'error': 'id_reporte and estado are required'})
        
        # Validar estado
        valid_estados = ['PENDIENTE', 'ATENDIENDO', 'RESUELTO']
        if body['estado'] not in valid_estados:
            return create_response(400, {'error': f'estado must be one of: {", ".join(valid_estados)}'})
        
        report_id = body['id_reporte']
        new_status = body['estado']
        
        # Obtener el reporte actual
        reports_table = dynamodb.Table('t_reportes')
        report_response = reports_table.get_item(Key={'id_reporte': report_id})
        
        if 'Item' not in report_response:
            return create_response(404, {'error': 'Report not found'})
        
        # Convertir Decimal a tipos nativos
        report = decimal_to_native(report_response['Item'])
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Preparar actualización
        update_expression = 'SET estado = :estado, updated_at = :updated_at, assigned_to = :assigned_to'
        expression_values = {
            ':estado': new_status,
            ':updated_at': timestamp,
            ':assigned_to': user_id
        }
        
        # Si el estado es RESUELTO, agregar resolved_at
        if new_status == 'RESUELTO':
            update_expression += ', resolved_at = :resolved_at'
            expression_values[':resolved_at'] = timestamp
        
        # Actualizar reporte
        reports_table.update_item(
            Key={'id_reporte': report_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        # Preparar mensaje de notificación
        lugar_nombre = report.get('lugar', {}).get('nombre', 'lugar desconocido')
        urgencia = report.get('urgencia', 'MEDIA')
        author_id = report.get('author_id')
        sector = report.get('assigned_sector', 'General')
        
        notification_message = f'Estado del reporte actualizado a {new_status} para {lugar_nombre}'
        
        if 'comentario' in body:
            notification_message += f'. Comentario: {body["comentario"]}'
        
        # Enviar notificación a través de EventBridge
        try:
            event_detail = {
                'report_id': report_id,
                'old_status': report.get('estado', 'PENDIENTE'),
                'new_status': new_status,
                'urgencia': urgencia,
                'lugar': lugar_nombre,
                'sector': sector,
                'updated_by': user_id,
                'author_id': author_id,
                'message': notification_message,
                'timestamp': timestamp
            }
            print(f"Sending EventBridge event: {json.dumps(event_detail)}")
            
            events.put_events(
                Entries=[
                    {
                        'Source': 'utec-alerta.reports',
                        'DetailType': 'StatusUpdated',
                        'Detail': json.dumps(event_detail)
                    }
                ]
            )
            print("EventBridge event sent successfully")
        except Exception as e:
            print(f"Error sending EventBridge notification: {e}")
            import traceback
            traceback.print_exc()
        
        return create_response(200, {
            'message': 'Status updated successfully',
            'report': {
                'id_reporte': report_id,
                'estado': new_status,
                'urgencia': report.get('urgencia'),
                'urgencia_clasificada': report.get('urgencia_clasificada'),
                'clasificacion_auto': report.get('clasificacion_auto', False),
                'classification_score': report.get('classification_score'),
                'updated_at': timestamp,
                'assigned_to': user_id
            }
        })
    
    except Exception as e:
        print(f"Error in updateStatus handler: {e}")
        return create_response(500, {'error': f'Internal server error: {str(e)}'})
