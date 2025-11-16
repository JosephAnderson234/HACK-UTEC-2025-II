"""
Lambda: assignReport
Propósito: Permitir a un administrador asignar manualmente un reporte a una autoridad específica
Rol permitido: admin
"""

import json
import boto3
from datetime import datetime
from utils.jwt_validator import validate_token, extract_token_from_event, create_response

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')
users_table = dynamodb.Table('t_usuarios')
events_client = boto3.client('events')


def handler(event, context):
    """
    POST /reports/{id_reporte}/assign
    Path params: id_reporte
    Body: {"assigned_to": "uuid", "estado": "ATENDIENDO"}
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
        
        # 3. Verificar que sea admin
        if role != 'admin':
            return create_response(403, {'error': 'Only admins can manually assign reports'})
        
        # 4. Extraer id_reporte del path
        path_params = event.get('pathParameters', {})
        id_reporte = path_params.get('id_reporte')
        
        if not id_reporte:
            return create_response(400, {'error': 'Report ID is required'})
        
        # 5. Extraer y validar body
        if not event.get('body'):
            return create_response(400, {'error': 'Request body is required'})
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return create_response(400, {'error': 'Invalid JSON body'})
        
        assigned_to = body.get('assigned_to')
        new_estado = body.get('estado', 'ATENDIENDO')
        
        if not assigned_to:
            return create_response(400, {'error': 'assigned_to field is required'})
        
        # Validar estado
        valid_estados = ['PENDIENTE', 'ATENDIENDO', 'RESUELTO']
        if new_estado not in valid_estados:
            return create_response(400, {
                'error': f'Invalid estado. Must be one of: {", ".join(valid_estados)}'
            })
        
        # 6. Obtener reporte de DynamoDB
        report_response = reports_table.get_item(Key={'id_reporte': id_reporte})
        
        if 'Item' not in report_response:
            return create_response(404, {'error': 'Report not found'})
        
        report = report_response['Item']
        old_estado = report.get('estado')
        
        # 7. Validar que el assigned_to exista y sea authority
        user_response = users_table.get_item(Key={'id': assigned_to})
        
        if 'Item' not in user_response:
            return create_response(404, {'error': 'User to assign not found'})
        
        assigned_user = user_response['Item']
        
        if assigned_user.get('role') != 'authority':
            return create_response(400, {
                'error': 'Can only assign reports to users with authority role'
            })
        
        # 8. Validar que el assigned_to pertenezca al mismo sector del reporte
        assigned_sector = assigned_user.get('data_authority', {}).get('sector')
        report_sector = report.get('assigned_sector')
        
        if assigned_sector != report_sector:
            return create_response(400, {
                'error': f'Authority belongs to sector {assigned_sector}, but report is for sector {report_sector}'
            })
        
        # 9. Actualizar reporte en DynamoDB
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        update_expression = 'SET assigned_to = :user_id, estado = :estado, updated_at = :timestamp'
        expression_values = {
            ':user_id': assigned_to,
            ':estado': new_estado,
            ':timestamp': timestamp
        }
        
        # Si el estado es RESUELTO, agregar resolved_at
        if new_estado == 'RESUELTO':
            update_expression += ', resolved_at = :resolved_at'
            expression_values[':resolved_at'] = timestamp
        
        update_response = reports_table.update_item(
            Key={'id_reporte': id_reporte},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )
        
        updated_report = update_response['Attributes']
        
        # 10. Enviar evento a EventBridge para notificaciones
        try:
            event_detail = {
                'report_id': id_reporte,
                'old_status': old_estado,
                'new_status': new_estado,
                'updated_by': user_id,
                'author_id': report.get('author_id'),
                'assigned_to': assigned_to,
                'assigned_name': f"{assigned_user.get('first_name', '')} {assigned_user.get('last_name', '')}".strip(),
                'sector': report_sector,
                'urgencia': report.get('urgencia'),
                'lugar': report.get('lugar', {}).get('nombre', 'Desconocido'),
                'message': f'Reporte asignado manualmente por administrador a {assigned_user.get("first_name", "")} {assigned_user.get("last_name", "")}',
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
        
        # 11. Retornar respuesta exitosa
        return create_response(200, {
            'message': 'Report successfully assigned',
            'report': {
                'id_reporte': updated_report['id_reporte'],
                'estado': updated_report['estado'],
                'assigned_to': updated_report['assigned_to'],
                'assigned_name': f"{assigned_user.get('first_name', '')} {assigned_user.get('last_name', '')}".strip(),
                'assigned_sector': updated_report.get('assigned_sector'),
                'updated_at': updated_report['updated_at'],
                'resolved_at': updated_report.get('resolved_at'),
                'lugar': updated_report.get('lugar', {}),
                'urgencia': updated_report.get('urgencia'),
                'descripcion': updated_report.get('descripcion')
            }
        })
        
    except ValueError as e:
        return create_response(400, {'error': f'Invalid parameters: {str(e)}'})
    except Exception as e:
        print(f"Error in assignReport: {str(e)}")
        return create_response(500, {'error': 'Internal server error', 'details': str(e)})
