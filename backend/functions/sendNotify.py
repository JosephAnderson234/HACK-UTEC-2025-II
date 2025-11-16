import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    # Asumir que event viene de EventBridge con datos de notificación
    message = event.get('detail', {}).get('message', 'Notification')
    
    table = dynamodb.Table('WSConnections')
    connections = table.scan()['Items']
    
    # Obtener endpoint de API Gateway WS
    domain = os.environ.get('WEBSOCKET_API_DOMAIN')
    stage = os.environ.get('WEBSOCKET_STAGE', '$default')
    api_client = boto3.client('apigatewaymanagementapi', endpoint_url=f'https://{domain}/{stage}')
    
    for conn in connections:
        try:
            api_client.post_to_connection(
                ConnectionId=conn['connectionId'],
                Data=json.dumps({'message': message})
            )
        except Exception as e:
            print(f"Error sending to {conn['connectionId']}: {e}")
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Notifications sent'})
    }
