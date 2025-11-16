import json
import boto3

dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    connection_id = event['requestContext']['connectionId']
    table = dynamodb.Table('WSConnections')
    
    # Eliminar conexión
    table.delete_item(Key={'connectionId': connection_id})
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Disconnected'})
    }
