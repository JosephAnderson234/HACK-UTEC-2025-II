import json
import boto3
import hashlib
import os
import jwt
import uuid
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
ssm = boto3.client('ssm')

# Cache para JWT_SECRET
_jwt_secret_cache = None


def get_jwt_secret():
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


def verify_token(token):
    """Verifica y decodifica el token JWT"""
    try:
        secret = get_jwt_secret()
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")


def hash_password(password):
    """Hashea la contraseña usando SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def create_response(status_code, body):
    """Crea una respuesta HTTP estandarizada"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': True
        },
        'body': json.dumps(body)
    }


def handler(event, context):
    """
    Handler para gestión de autoridades por parte de administradores
    Endpoints:
    - POST /admin/authorities - Crear nueva autoridad
    """
    try:
        # Verificar autenticación
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization')
        
        if not auth_header:
            return create_response(401, {'error': 'Authorization header required'})
        
        # Extraer token
        token = auth_header.replace('Bearer ', '')
        
        try:
            payload = verify_token(token)
        except Exception as e:
            return create_response(401, {'error': str(e)})
        
        # Verificar que el usuario sea administrador
        if payload.get('role') != 'admin':
            return create_response(403, {'error': 'Only administrators can create authorities'})
        
        # Parsear el body
        body = json.loads(event.get('body', '{}'))
        
        # Determinar la acción
        http_method = event.get('httpMethod', 'POST')
        
        if http_method == 'POST':
            return create_authority(body, payload)
        else:
            return create_response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        print(f"Error in manageAuthorities handler: {e}")
        return create_response(500, {'error': f'Internal server error: {str(e)}'})


def create_authority(body, admin_payload):
    """Crea una nueva autoridad"""
    try:
        # Validar campos requeridos
        required_fields = ['first_name', 'last_name', 'email', 'password', 'DNI', 'cellphone', 'data_authority']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # Validar data_authority
        authority_data = body['data_authority']
        required_authority_fields = ['department', 'position']
        for field in required_authority_fields:
            if field not in authority_data:
                return create_response(400, {'error': f'Missing required field in data_authority: {field}'})
        
        table = dynamodb.Table('t_usuarios')
        
        # Verificar si el email ya existe
        response = table.query(
            IndexName='EmailIndex',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': body['email']}
        )
        
        if response['Items']:
            return create_response(409, {'error': 'Email already registered'})
        
        # Generar ID único
        authority_id = str(uuid.uuid4())
        
        # Hash de la contraseña
        password_hash = hash_password(body['password'])
        
        # Preparar item de la autoridad
        authority_item = {
            'id': authority_id,
            'first_name': body['first_name'],
            'last_name': body['last_name'],
            'email': body['email'],
            'role': 'authority',
            'password': password_hash,
            'DNI': body['DNI'],
            'cellphone': body['cellphone'],
            'data_authority': authority_data,
            'registration_date': datetime.utcnow().isoformat(),
            'created_by': admin_payload['user_id']  # Registrar quién creó la autoridad
        }
        
        # Guardar autoridad
        table.put_item(Item=authority_item)
        
        return create_response(201, {
            'message': 'Authority created successfully',
            'authority': {
                'id': authority_id,
                'email': body['email'],
                'role': 'authority',
                'first_name': body['first_name'],
                'last_name': body['last_name'],
                'data_authority': authority_data
            }
        })
    
    except Exception as e:
        print(f"Error creating authority: {e}")
        return create_response(500, {'error': f'Failed to create authority: {str(e)}'})
