"""
Lambda: takeReport
Propósito: Permitir a una autoridad auto-asignarse un reporte pendiente de su sector
Rol permitido: authority
"""

import json
import boto3
from datetime import datetime
from utils.jwt_validator import validate_token, extract_token_from_event, create_response

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')
events_client = boto3.client('events')


def handler(event, context):
    """
    POST /reports/{id_reporte}/take
    Path params: id_reporte
    Body: {"comentario": "Optional message"}
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
        
        # 3. Verificar que sea authority
        if role != 'authority':
            return create_response(403, {'error': 'Only authorities can take reports'})
        
        # 4. Extraer id_reporte del path
        path_params = event.get('pathParameters', {})
        id_reporte = path_params.get('id_reporte')
        
        if not id_reporte:
            return create_response(400, {'error': 'Report ID is required'})
        
        # 5. Extraer comentario opcional del body
        body = {}
        if event.get('body'):
            try:
                body = json.loads(event['body'])
            except json.JSONDecodeError:
                return create_response(400, {'error': 'Invalid JSON body'})
        
        comentario = body.get('comentario', '')
        
        # 6. Obtener reporte de DynamoDB
        response = reports_table.get_item(Key={'id_reporte': id_reporte})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Report not found'})
        
        report = response['Item']
        
        # 7. Validaciones de negocio
        
        # 7.1 Verificar que el reporte pertenezca al sector de la autoridad
        user_sector = user_data.get('data_authority', {}).get('sector')
        if not user_sector:
            return create_response(400, {'error': 'Authority sector not configured'})
        
        if report.get('assigned_sector') != user_sector:
            return create_response(403, {
                'error': f'This report belongs to sector {report.get("assigned_sector")}, you can only take reports from your sector ({user_sector})'
            })
        
        # 7.2 Verificar que el reporte esté PENDIENTE
        if report.get('estado') != 'PENDIENTE':
            return create_response(400, {
                'error': f'Report is already in state {report.get("estado")}. Only PENDIENTE reports can be taken'
            })
        
        # 8. Actualizar reporte en DynamoDB (update atómico)
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        update_response = reports_table.update_item(
            Key={'id_reporte': id_reporte},
            UpdateExpression='SET assigned_to = :user_id, estado = :estado, updated_at = :timestamp',
            ConditionExpression='estado = :old_estado',  # Condición para evitar race conditions
            ExpressionAttributeValues={
                ':user_id': user_id,
                ':estado': 'ATENDIENDO',
                ':timestamp': timestamp,
                ':old_estado': 'PENDIENTE'
            },
            ReturnValues='ALL_NEW'
        )
        
        updated_report = update_response['Attributes']
        
        # 9. Enviar evento a EventBridge para notificaciones
        try:
            event_detail = {
                'report_id': id_reporte,
                'old_status': 'PENDIENTE',
                'new_status': 'ATENDIENDO',
                'updated_by': user_id,
                'author_id': report.get('author_id'),
                'sector': user_sector,
                'urgencia': report.get('urgencia'),
                'lugar': report.get('lugar', {}).get('nombre', 'Desconocido'),
                'message': f'Reporte asignado a {user_data.get("first_name", "")} {user_data.get("last_name", "")}',
                'comentario': comentario,
                'timestamp': timestamp
            }
            
            events_client.put_events(
                Entries=[{
                    'Source': 'utec-alerta.reports',
                    'DetailType': 'StatusUpdated',
                    'Detail': json.dumps(event_detail)
                }]
            )
        except Exception as e:
            print(f"Error sending EventBridge event: {str(e)}")
            # No fallar si la notificación falla
        
        # 10. Retornar respuesta exitosa
        return create_response(200, {
            'message': 'Report successfully assigned to you',
            'report': {
                'id_reporte': updated_report['id_reporte'],
                'estado': updated_report['estado'],
                'assigned_to': updated_report['assigned_to'],
                'updated_at': updated_report['updated_at'],
                'lugar': updated_report.get('lugar', {}),
                'urgencia': updated_report.get('urgencia'),
                'descripcion': updated_report.get('descripcion')
            }
        })
        
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return create_response(409, {
            'error': 'Report was already taken by someone else or status changed'
        })
    except ValueError as e:
        return create_response(400, {'error': f'Invalid parameters: {str(e)}'})
    except Exception as e:
        print(f"Error in takeReport: {str(e)}")
        return create_response(500, {'error': 'Internal server error', 'details': str(e)})
