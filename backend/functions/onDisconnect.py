import json
import boto3

dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    """
    Handler para desconexión WebSocket.
    Elimina la conexión de la tabla.
    """
    try:
        connection_id = event['requestContext']['connectionId']
        connections_table = dynamodb.Table('t_connections')
        
        # Eliminar conexión
        connections_table.delete_item(Key={'connectionId': connection_id})
        
        print(f"WebSocket disconnected: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Disconnected successfully'})
        }
    
    except Exception as e:
        print(f"Error in onDisconnect handler: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }
