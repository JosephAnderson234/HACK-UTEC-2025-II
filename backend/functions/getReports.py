"""
Lambda: getReports
Propósito: Obtener todos los reportes (transparencia total para todos los roles)
Roles permitidos: student, authority, admin
"""

import json
import boto3
from boto3.dynamodb.conditions import Attr
from utils.jwt_validator import validate_token, extract_token_from_event, create_response
from utils.pagination import paginate_results, extract_pagination_params
from utils.filters import apply_filters, apply_text_search, sort_items, extract_filter_params, extract_sort_params
from utils.s3_helper import add_image_urls_to_reports

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')
places_table = dynamodb.Table('t_lugares')
users_table = dynamodb.Table('t_usuarios')


def handler(event, context):
    """
    GET /reports
    Query params: ?page=1&size=20&estado=PENDIENTE&urgencia=ALTA&sector=Mantenimiento&orderBy=created_at&order=desc
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
        
        # 3. Todos los roles pueden ver reportes (transparencia total)
        # No hay restricción de roles
        
        # 4. Extraer parámetros de query
        query_params = event.get('queryStringParameters') or {}
        page, size = extract_pagination_params(query_params)
        order_by, order = extract_sort_params(query_params, default_order_by='created_at')
        
        # 5. Obtener todos los reportes
        response = reports_table.scan()
        reports = response.get('Items', [])
        
        # Manejar paginación de DynamoDB
        while 'LastEvaluatedKey' in response:
            response = reports_table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            reports.extend(response.get('Items', []))
        
        # 6. Sin filtrado automático por rol (transparencia total)
        # Todos los usuarios pueden ver todos los reportes
        
        # 7. Aplicar filtros opcionales (estado, urgencia y sector)
        filters = extract_filter_params(query_params, ['estado', 'urgencia', 'assigned_sector'])
        if filters:
            if 'estado' in filters:
                reports = [r for r in reports if r.get('estado') == filters['estado']]
            if 'urgencia' in filters:
                reports = [r for r in reports if r.get('urgencia') == filters['urgencia']]
            if 'assigned_sector' in filters:
                reports = [r for r in reports if r.get('assigned_sector') == filters['assigned_sector']]
        
        # 9. Ordenar reportes
        reports = sort_items(reports, order_by, order)
        
        # 10. Enriquecimiento TRIPLE: lugares + autores + asignados
        
        # 10.1 Enriquecer con lugares
        lugar_ids = list(set([r['lugar']['id'] for r in reports if 'lugar' in r and 'id' in r['lugar']]))
        lugares_dict = {}
        if lugar_ids:
            for i in range(0, len(lugar_ids), 100):
                batch_ids = lugar_ids[i:i+100]
                batch_response = dynamodb.batch_get_item(
                    RequestItems={
                        't_lugares': {
                            'Keys': [{'id': lugar_id} for lugar_id in batch_ids]
                        }
                    }
                )
                for lugar in batch_response.get('Responses', {}).get('t_lugares', []):
                    lugares_dict[lugar['id']] = lugar
        
        # 10.2 Enriquecer con nombres de autores
        author_ids = list(set([r.get('author_id') for r in reports if r.get('author_id')]))
        authors_dict = {}
        if author_ids:
            for i in range(0, len(author_ids), 100):
                batch_ids = author_ids[i:i+100]
                batch_response = dynamodb.batch_get_item(
                    RequestItems={
                        't_usuarios': {
                            'Keys': [{'id': author_id} for author_id in batch_ids]
                        }
                    }
                )
                for user in batch_response.get('Responses', {}).get('t_usuarios', []):
                    authors_dict[user['id']] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        
        # 10.3 Enriquecer con nombres de asignados
        assigned_ids = list(set([r.get('assigned_to') for r in reports if r.get('assigned_to')]))
        assigned_dict = {}
        if assigned_ids:
            for i in range(0, len(assigned_ids), 100):
                batch_ids = assigned_ids[i:i+100]
                batch_response = dynamodb.batch_get_item(
                    RequestItems={
                        't_usuarios': {
                            'Keys': [{'id': assigned_id} for assigned_id in batch_ids]
                        }
                    }
                )
                for user in batch_response.get('Responses', {}).get('t_usuarios', []):
                    assigned_dict[user['id']] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        
        # Aplicar enriquecimientos
        enriched_reports = []
        for report in reports:
            # Enriquecer lugar
            if 'lugar' in report and 'id' in report['lugar']:
                lugar_id = report['lugar']['id']
                if lugar_id in lugares_dict:
                    report['lugar'] = lugares_dict[lugar_id]
            
            # Agregar nombre del autor
            if 'author_id' in report:
                report['author_name'] = authors_dict.get(report['author_id'], 'Desconocido')
            
            # Agregar nombre del asignado
            if 'assigned_to' in report and report['assigned_to']:
                report['assigned_name'] = assigned_dict.get(report['assigned_to'], 'Desconocido')
            
            enriched_reports.append(report)
        
        # Convertir S3 URIs a URLs HTTP firmadas
        enriched_reports = add_image_urls_to_reports(enriched_reports)
        
        # 11. Aplicar paginación manual
        paginated_result = paginate_results(enriched_reports, page, size)
        
        # 12. Retornar respuesta
        return create_response(200, {
            'reports': paginated_result['items'],
            'pagination': paginated_result['pagination'],
            'filters_applied': filters
        })
        
    except ValueError as e:
        return create_response(400, {'error': f'Invalid parameters: {str(e)}'})
    except Exception as e:
        print(f"Error in getReports: {str(e)}")
        return create_response(500, {'error': 'Internal server error', 'details': str(e)})
