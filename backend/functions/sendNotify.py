import json
import boto3
import os
import sys
from decimal import Decimal

# Agregar el directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

dynamodb = boto3.resource('dynamodb')

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
        connections = [decimal_to_native(item) for item in connections_response.get('Items', [])]
        
        if not connections:
            print("No active connections to notify")
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'No active connections'})
            }
        
        # Obtener el endpoint de WebSocket desde variables de entorno
        websocket_endpoint = os.environ.get('WEBSOCKET_API_ENDPOINT')
        
        if not websocket_endpoint:
            print("ERROR: WEBSOCKET_API_ENDPOINT environment variable not set")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'WebSocket endpoint not configured'})
            }
        
        # Crear cliente de API Gateway Management
        endpoint_url = f"https://{websocket_endpoint}"
        api_client = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)
        print(f"WebSocket endpoint: {endpoint_url}")
        
        # Obtener tabla de usuarios para consultar sectores
        users_table = dynamodb.Table('t_usuarios')
        
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
                custom_message = message
                
                if detail_type == 'ReportCreated':
                    # Notificar a autoridades del sector correspondiente y admins
                    if user_role == 'authority':
                        # Obtener el sector del usuario
                        try:
                            user_response = users_table.get_item(Key={'id': user_id})
                            if 'Item' in user_response:
                                user_data = decimal_to_native(user_response['Item'])
                                user_sector = user_data.get('data_authority', {}).get('sector', '')
                                
                                # Solo notificar si el reporte es de su sector
                                if user_sector == sector:
                                    should_notify = True
                                    custom_message = f"Nuevo reporte de urgencia {urgencia} en tu sector ({sector})"
                                    print(f"Authority {user_id} matches sector {sector}")
                                else:
                                    print(f"Authority {user_id} sector {user_sector} doesn't match report sector {sector}")
                        except Exception as e:
                            print(f"Error getting user data for {user_id}: {e}")
                    
                    elif user_role == 'admin':
                        # Admins reciben todas las notificaciones
                        should_notify = True
                        custom_message = f"Nuevo reporte de urgencia {urgencia} en sector {sector}"
                        print(f"Admin {user_id} notified")
                
                elif detail_type == 'StatusUpdated':
                    # Notificar al autor del reporte
                    if user_id == author_id:
                        should_notify = True
                        custom_message = f"Tu reporte ha sido actualizado: {message}"
                        print(f"Author {user_id} notified about status update")
                    # También notificar a autoridades del sector y admins
                    elif user_role == 'authority':
                        try:
                            user_response = users_table.get_item(Key={'id': user_id})
                            if 'Item' in user_response:
                                user_data = decimal_to_native(user_response['Item'])
                                user_sector = user_data.get('data_authority', {}).get('sector', '')
                                
                                if user_sector == sector:
                                    should_notify = True
                                    custom_message = f"Reporte actualizado en tu sector: {message}"
                        except Exception as e:
                            print(f"Error getting user data for {user_id}: {e}")
                    elif user_role == 'admin':
                        should_notify = True
                        custom_message = f"Reporte actualizado: {message}"
                
                if should_notify:
                    # Actualizar el mensaje en la notificación
                    notification['message'] = custom_message
                    
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
                import traceback
                traceback.print_exc()
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
