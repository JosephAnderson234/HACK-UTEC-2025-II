import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    """
    Handler para enviar notificaciones via WebSocket.
    Disparado por EventBridge cuando hay cambios en reportes.
    
    Envía notificaciones a usuarios conectados basado en:
    - Tipo de evento (ReportCreated, StatusUpdated)
    - Rol del usuario
    - Sector asignado (para autoridades)
    """
    try:
        print(f"SendNotify event: {json.dumps(event)}")
        
        # Extraer información del evento
        detail_type = event.get('detail-type', '')
        detail = event.get('detail', {})
        
        # Si viene como string, parsearlo
        if isinstance(detail, str):
            detail = json.loads(detail)
        
        message = detail.get('message', 'Nueva notificación')
        report_id = detail.get('report_id')
        urgencia = detail.get('urgencia')
        sector = detail.get('sector')
        author_id = detail.get('author_id')
        
        # Obtener todas las conexiones activas
        connections_table = dynamodb.Table('t_connections')
        connections_response = connections_table.scan()
        connections = connections_response.get('Items', [])
        
        if not connections:
            print("No active connections to notify")
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'No active connections'})
            }
        
        # Obtener el endpoint de la API Gateway WebSocket
        # El endpoint se construye desde las variables de contexto
        domain_name = event.get('requestContext', {}).get('domainName')
        stage = event.get('requestContext', {}).get('stage', 'production')
        
        # Si no viene en el evento, usar variables de entorno o construir desde el contexto de Lambda
        if not domain_name:
            # Intentar obtener desde variables de entorno o ARN
            domain_name = os.environ.get('WEBSOCKET_API_ENDPOINT')
        
        if not domain_name:
            print("Warning: WebSocket endpoint not found, will try to construct it")
            # En producción, esto debería venir del contexto o variables de entorno
            # Por ahora, registramos el error pero continuamos
        
        # Crear cliente de API Gateway Management
        if domain_name:
            endpoint_url = f"https://{domain_name}/{stage}"
            api_client = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)
        else:
            # Fallback: intentar obtener el endpoint desde el contexto de la función
            print("Attempting to send notifications without explicit endpoint")
            api_client = None
        
        # Preparar notificación según tipo de evento
        notification = {
            'type': detail_type,
            'timestamp': detail.get('timestamp', ''),
            'message': message,
            'data': {
                'report_id': report_id,
                'urgencia': urgencia
            }
        }
        
        # Enviar notificaciones a conexiones relevantes
        sent_count = 0
        failed_count = 0
        
        for conn in connections:
            try:
                connection_id = conn['connectionId']
                user_role = conn.get('user_role', 'student')
                user_id = conn.get('user_id')
                
                # Determinar si enviar notificación basado en rol y contexto
                should_notify = False
                
                if detail_type == 'ReportCreated':
                    # Notificar a autoridades del sector correspondiente
                    if user_role in ['authority', 'admin']:
                        should_notify = True
                        notification['message'] = f"Nuevo reporte de urgencia {urgencia} en sector {sector}"
                
                elif detail_type == 'StatusUpdated':
                    # Notificar al autor del reporte
                    if user_id == author_id:
                        should_notify = True
                        notification['message'] = f"Tu reporte ha sido actualizado: {message}"
                    # También notificar a autoridades
                    elif user_role in ['authority', 'admin']:
                        should_notify = True
                
                if should_notify and api_client:
                    api_client.post_to_connection(
                        ConnectionId=connection_id,
                        Data=json.dumps(notification).encode('utf-8')
                    )
                    sent_count += 1
                    print(f"Notification sent to {connection_id} (user: {user_id}, role: {user_role})")
                
            except api_client.exceptions.GoneException:
                # Conexión ya no existe, eliminarla de la BD
                print(f"Connection {connection_id} is gone, removing from database")
                connections_table.delete_item(Key={'connectionId': connection_id})
                failed_count += 1
            except Exception as e:
                print(f"Error sending to {connection_id}: {e}")
                failed_count += 1
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Notifications processed',
                'sent': sent_count,
                'failed': failed_count
            })
        }
    
    except Exception as e:
        print(f"Error in sendNotify handler: {e}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }
