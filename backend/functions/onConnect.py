import json
import boto3
import os
import sys
from datetime import datetime

# Agregar el directorio padre al path para importar utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.jwt_validator import validate_token

dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    """
    Handler para conexión WebSocket.
    Requiere autenticación JWT en query parameters.
    
    WS connect: wss://...?token=<jwt_token>
    """
    try:
        connection_id = event['requestContext']['connectionId']
        
        # Extraer token desde query parameters
        query_params = event.get('queryStringParameters', {})
        if not query_params or 'token' not in query_params:
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Missing authentication token in query parameters'})
            }
        
        token = query_params['token']
        
        # Validar token
        try:
            token_data = validate_token(token)
            user_id = token_data['user_id']
            user_role = token_data.get('role', 'unknown')
            user_email = token_data.get('email', '')
        except Exception as e:
            print(f"Token validation failed: {e}")
            return {
                'statusCode': 401,
                'body': json.dumps({'error': f'Invalid token: {str(e)}'})
            }
        
        # Guardar conexión en DynamoDB
        connections_table = dynamodb.Table('t_connections')
        
        connection_item = {
            'connectionId': connection_id,
            'user_id': user_id,
            'user_role': user_role,
            'user_email': user_email,
            'connected_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        connections_table.put_item(Item=connection_item)
        
        print(f"WebSocket connected: {connection_id} for user {user_id} ({user_role})")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Connected successfully',
                'connectionId': connection_id,
                'userId': user_id
            })
        }
    
    except Exception as e:
        print(f"Error in onConnect handler: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }
