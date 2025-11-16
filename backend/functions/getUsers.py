import json
import boto3
import os
from decimal import Decimal
from utils.jwt_validator import validate_jwt

dynamodb = boto3.resource('dynamodb')
table_usuarios = dynamodb.Table('t_usuarios')

def decimal_to_native(obj):
    """Convierte Decimal a tipos nativos de Python"""
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
    GET /users
    Lista todos los usuarios con paginación y filtros
    
    Query params:
    - page: número de página (default: 1)
    - size: tamaño de página (default: 20, max: 100)
    - role: filtro por rol (student|authority|admin)
    - term: búsqueda por nombre o email
    
    Roles permitidos: admin (principalmente), authority (ver su sector)
    """
    try:
        # Validar JWT
        claims = validate_jwt(event)
        user_role = claims.get('role')
        user_id = claims.get('sub')
        
        # Solo admin y authority pueden ver listado de usuarios
        if user_role not in ['admin', 'authority']:
            return {
                'statusCode': 403,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'No tienes permisos para ver usuarios'
                })
            }
        
        # Obtener parámetros de query
        params = event.get('queryStringParameters') or {}
        page = int(params.get('page', 1))
        size = min(int(params.get('size', 20)), 100)  # Max 100
        role_filter = params.get('role', '').lower()
        term = params.get('term', '').lower()
        
        # Escanear tabla de usuarios
        scan_params = {
            'Select': 'ALL_ATTRIBUTES'
        }
        
        # Aplicar filtro de rol si se especifica
        if role_filter and role_filter in ['student', 'authority', 'admin']:
            scan_params['FilterExpression'] = '#role = :role'
            scan_params['ExpressionAttributeNames'] = {'#role': 'role'}
            scan_params['ExpressionAttributeValues'] = {':role': role_filter}
        
        response = table_usuarios.scan(**scan_params)
        items = response.get('Items', [])
        
        # Aplicar filtro de búsqueda si se especifica
        if term:
            items = [
                user for user in items
                if term in user.get('first_name', '').lower()
                or term in user.get('last_name', '').lower()
                or term in user.get('email', '').lower()
            ]
        
        # Si es authority, solo puede ver usuarios de su sector
        if user_role == 'authority':
            # Obtener sector del authority
            user_response = table_usuarios.get_item(Key={'id': user_id})
            if 'Item' in user_response:
                user_data = user_response['Item']
                user_sector =    user_data.get('data_authority', {}).get('sector', '')
                
                # Filtrar solo usuarios del mismo sector (otros authority/admin del mismo sector)
                items = [
                    user for user in items
                    if user.get('data_authority', {}).get('sector', '') == user_sector
                ]
        
        # Remover passwords de la respuesta
        users = []
        for user in items:
            user_clean = {
                'id': user.get('id'),
                'first_name': user.get('first_name'),
                'last_name': user.get('last_name'),
                'email': user.get('email'),
                'role': user.get('role'),
                'DNI': user.get('DNI'),
                'cellphone': user.get('cellphone'),
                'registration_date': user.get('registration_date')
            }
            
            # Agregar data_student o data_authority según corresponda
            if user.get('role') == 'student' and 'data_student' in user:
                user_clean['data_student'] = user.get('data_student')
            elif user.get('role') in ['authority', 'admin'] and 'data_authority' in user:
                user_clean['data_authority'] = user.get('data_authority')
            
            users.append(user_clean)
        
        # Ordenar por fecha de registro (más recientes primero)
        users.sort(key=lambda x: x.get('registration_date', ''), reverse=True)
        
        # Paginación
        total_items = len(users)
        total_pages = (total_items + size - 1) // size  # Ceiling division
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        
        paginated_users = users[start_idx:end_idx]
        
        # Convertir Decimal a tipos nativos
        paginated_users = decimal_to_native(paginated_users)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'users': paginated_users,
                'pagination': {
                    'current_page': page,
                    'page_size': size,
                    'total_items': total_items,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_previous': page > 1
                }
            })
        }
        
    except Exception as e:
        print(f"Error getting users: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Error al obtener usuarios',
                'details': str(e)
            })
        }
