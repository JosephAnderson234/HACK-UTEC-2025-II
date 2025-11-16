import json
import boto3
import hashlib
import os
import jwt
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
ssm = boto3.client('ssm')

# Cache para JWT_SECRET
_jwt_secret_cache = None

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


def hash_password(password):
    """Hashea la contraseña usando SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_jwt(user_id, email, role):
    """Genera un token JWT"""
    secret = get_jwt_secret()
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow() + timedelta(days=7),  # Token válido por 7 días
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, secret, algorithm='HS256')


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
    Handler para autenticación (login y register)
    Endpoints:
    - POST /auth/register
    - POST /auth/login
    """
    try:
        # Parsear el body
        body = json.loads(event.get('body', '{}'))
        path = event.get('path', '')
        
        # Determinar la acción basada en el path o body
        if '/register' in path or body.get('action') == 'register':
            return handle_register(body)
        elif '/login' in path or body.get('action') == 'login':
            return handle_login(body)
        else:
            return create_response(400, {'error': 'Invalid action. Use /auth/register or /auth/login'})
    
    except Exception as e:
        print(f"Error in auth handler: {e}")
        return create_response(500, {'error': f'Internal server error: {str(e)}'})


def handle_register(body):
    """Registra un nuevo estudiante (siempre rol student)"""
    try:
        # Validar campos requeridos
        required_fields = ['first_name', 'last_name', 'email', 'password', 'DNI', 'cellphone']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
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
        user_id = str(uuid.uuid4())
        
        # Hash de la contraseña
        password_hash = hash_password(body['password'])
        
        # Preparar item del usuario (siempre estudiante)
        user_item = {
            'id': user_id,
            'first_name': body['first_name'],
            'last_name': body['last_name'],
            'email': body['email'],
            'role': 'student',
            'password': password_hash,
            'DNI': body['DNI'],
            'cellphone': body['cellphone'],
            'registration_date': datetime.utcnow().isoformat()
        }
        
        # Agregar datos específicos del estudiante si existen
        if 'data_student' in body:
            user_item['data_student'] = body['data_student']
        
        # Guardar usuario
        table.put_item(Item=user_item)
        
        # Generar JWT
        token = generate_jwt(user_id, body['email'], 'student')
        
        return create_response(201, {
            'message': 'Student registered successfully',
            'token': token,
            'user': {
                'id': user_id,
                'email': body['email'],
                'role': 'student',
                'first_name': body['first_name'],
                'last_name': body['last_name']
            }
        })
    
    except Exception as e:
        print(f"Error in register: {e}")
        return create_response(500, {'error': f'Registration failed: {str(e)}'})


def handle_login(body):
    """Autentica un usuario existente"""
    try:
        # Validar campos requeridos
        if 'email' not in body or 'password' not in body:
            return create_response(400, {'error': 'Email and password are required'})
        
        table = dynamodb.Table('t_usuarios')
        
        # Buscar usuario por email
        response = table.query(
            IndexName='EmailIndex',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': body['email']}
        )
        
        if not response['Items']:
            return create_response(401, {'error': 'Invalid credentials'})
        
        user = response['Items'][0]
        
        # Convertir Decimal a tipos nativos
        user = decimal_to_native(user)
        
        # Verificar contraseña
        password_hash = hash_password(body['password'])
        if password_hash != user['password']:
            return create_response(401, {'error': 'Invalid credentials'})
        
        # Generar JWT
        token = generate_jwt(user['id'], user['email'], user['role'])
        
        # Preparar datos del usuario (sin contraseña)
        user_data = {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'first_name': user['first_name'],
            'last_name': user['last_name']
        }
        
        # Agregar datos específicos del rol
        if 'data_student' in user:
            user_data['data_student'] = user['data_student']
        if 'data_authority' in user:
            user_data['data_authority'] = user['data_authority']
        
        return create_response(200, {
            'message': 'Login successful',
            'token': token,
            'user': user_data
        })
    
    except Exception as e:
        print(f"Error in login: {e}")
        return create_response(500, {'error': f'Login failed: {str(e)}'})