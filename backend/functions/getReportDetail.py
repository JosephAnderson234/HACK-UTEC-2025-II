"""
Lambda: getReportDetail
Propósito: Obtener detalle completo de un reporte específico con validación de permisos por rol
Roles permitidos: student (solo sus reportes), authority (solo su sector), admin (todos)
"""

import json
import boto3
from utils.jwt_validator import validate_token, extract_token_from_event, create_response

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')
places_table = dynamodb.Table('t_lugares')
users_table = dynamodb.Table('t_usuarios')


def handler(event, context):
    """
    GET /reports/{id_reporte}
    Path params: id_reporte
    """
    try:
        # 1. Extraer y validar token
        token = extract_token_from_event(event)
        if not token:
            return create_response(401, {'error': 'Authorization token required'})
        
        # 2. Validar token y verificar usuario en BD
        payload = validate_token(token)
        user_id = payload['user_id']
        role = payload['user_data']['role']
        user_data = payload['user_data']
        
        # 3. Extraer id_reporte del path
        path_params = event.get('pathParameters', {})
        id_reporte = path_params.get('id_reporte')
        
        if not id_reporte:
            return create_response(400, {'error': 'Report ID is required'})
        
        # 4. Obtener reporte de DynamoDB
        response = reports_table.get_item(Key={'id_reporte': id_reporte})
        
        if 'Item' not in response:
            return create_response(404, {'error': 'Report not found'})
        
        report = response['Item']
        
        # 5. Validar permisos según rol
        if role == 'student':
            # Estudiantes solo pueden ver sus propios reportes
            if report.get('author_id') != user_id:
                return create_response(403, {'error': 'You can only view your own reports'})
        
        elif role == 'authority':
            # Autoridades solo pueden ver reportes de su sector
            user_sector = user_data.get('data_authority', {}).get('sector')
            if report.get('assigned_sector') != user_sector:
                return create_response(403, {'error': 'You can only view reports from your sector'})
        
        elif role == 'admin':
            # Admins tienen acceso completo
            pass
        
        else:
            return create_response(403, {'error': 'Invalid role'})
        
        # 6. Enriquecimiento completo del reporte
        
        # 6.1 Enriquecer con datos completos del lugar
        if 'lugar' in report and 'id' in report['lugar']:
            lugar_response = places_table.get_item(Key={'id': report['lugar']['id']})
            if 'Item' in lugar_response:
                report['lugar'] = lugar_response['Item']
        
        # 6.2 Enriquecer con información del autor
        if 'author_id' in report:
            author_response = users_table.get_item(Key={'id': report['author_id']})
            if 'Item' in author_response:
                author = author_response['Item']
                report['author'] = {
                    'id': author['id'],
                    'first_name': author.get('first_name'),
                    'last_name': author.get('last_name'),
                    'email': author.get('email'),
                    'cellphone': author.get('cellphone'),
                    'role': author.get('role')
                }
                # Agregar data_student si es estudiante
                if author.get('role') == 'student' and 'data_student' in author:
                    report['author']['data_student'] = author['data_student']
        
        # 6.3 Enriquecer con información del asignado (si existe)
        if 'assigned_to' in report and report['assigned_to']:
            assigned_response = users_table.get_item(Key={'id': report['assigned_to']})
            if 'Item' in assigned_response:
                assigned = assigned_response['Item']
                report['assigned'] = {
                    'id': assigned['id'],
                    'first_name': assigned.get('first_name'),
                    'last_name': assigned.get('last_name'),
                    'email': assigned.get('email'),
                    'cellphone': assigned.get('cellphone'),
                    'role': assigned.get('role')
                }
                # Agregar data_authority si es autoridad
                if assigned.get('role') == 'authority' and 'data_authority' in assigned:
                    report['assigned']['data_authority'] = assigned['data_authority']
        
        # 7. Remover campo password si por alguna razón existe
        if 'password' in report:
            del report['password']
        
        # 8. Retornar reporte completo enriquecido
        return create_response(200, {
            'report': report
        })
        
    except ValueError as e:
        return create_response(400, {'error': f'Invalid parameters: {str(e)}'})
    except Exception as e:
        print(f"Error in getReportDetail: {str(e)}")
        return create_response(500, {'error': 'Internal server error', 'details': str(e)})
