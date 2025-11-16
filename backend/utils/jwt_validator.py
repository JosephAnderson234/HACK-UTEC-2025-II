import jwt
import json
import boto3
import os
from typing import Dict, Optional

dynamodb = boto3.resource('dynamodb')
ssm = boto3.client('ssm')

# Cache para JWT_SECRET
_jwt_secret_cache = None

def get_jwt_secret() -> str:
    """Obtiene el JWT_SECRET desde Parameter Store con caché"""
    global _jwt_secret_cache
    
    if _jwt_secret_cache is None:
        try:
            response = ssm.get_parameter(
                Name=os.environ.get('JWT_SECRET_PARAM', '/utec-alerta/jwt-secret'),
                WithDecryption=True
            )
            _jwt_secret_cache = response['Parameter']['Value']
        except Exception as e:
            print(f"Error getting JWT_SECRET: {e}")
            raise Exception("JWT_SECRET not configured")
    
    return _jwt_secret_cache


def validate_token(token: str) -> Dict:
    """
    Valida el token JWT y retorna el payload decodificado.
    También verifica que el usuario exista en la BD.
    
    Args:
        token: Token JWT a validar
        
    Returns:
        Dict con los datos del usuario del token
        
    Raises:
        Exception: Si el token es inválido o el usuario no existe
    """
    try:
        # Decodificar token
        secret = get_jwt_secret()
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        
        # Verificar que el usuario existe en la BD
        users_table = dynamodb.Table('t_usuarios')
        response = users_table.get_item(Key={'id': payload['user_id']})
        
        if 'Item' not in response:
            raise Exception("User not found in database")
        
        # Agregar información del usuario al payload
        payload['user_data'] = response['Item']
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")
    except Exception as e:
        raise Exception(f"Token validation failed: {str(e)}")


def extract_token_from_event(event: Dict) -> Optional[str]:
    """
    Extrae el token JWT desde diferentes fuentes del evento.
    
    Soporta:
    - Header Authorization: "Bearer <token>"
    - Query parameter: ?token=<token>
    - Body: {"token": "<token>"}
    
    Args:
        event: Evento de Lambda
        
    Returns:
        Token JWT o None si no se encuentra
    """
    # Intentar desde headers
    headers = event.get('headers', {})
    auth_header = headers.get('Authorization') or headers.get('authorization')
    
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header[7:]
    
    # Intentar desde query parameters
    query_params = event.get('queryStringParameters', {})
    if query_params and 'token' in query_params:
        return query_params['token']
    
    # Intentar desde body
    try:
        if 'body' in event and event['body']:
            body = json.loads(event['body'])
            if 'token' in body:
                return body['token']
    except:
        pass
    
    return None


def create_response(status_code: int, body: Dict, headers: Dict = None) -> Dict:
    """
    Crea una respuesta HTTP estandarizada.
    
    Args:
        status_code: Código de estado HTTP
        body: Cuerpo de la respuesta
        headers: Headers adicionales
        
    Returns:
        Respuesta formateada para API Gateway
    """
    default_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': True
    }
    
    if headers:
        default_headers.update(headers)
    
    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body)
    }
