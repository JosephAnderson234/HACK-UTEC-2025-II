import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    connection_id = event['requestContext']['connectionId']
    table = dynamodb.Table('WSConnections')
    
    # Guardar conexión, asumiendo userId en queryStringParameters o algo
    user_id = event.get('queryStringParameters', {}).get('userId', 'anonymous')
    table.put_item(Item={'connectionId': connection_id, 'userId': user_id})
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Connected'})
    }
