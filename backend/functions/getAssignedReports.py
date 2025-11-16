"""
Lambda: getAssignedReports
Propósito: Obtener reportes asignados específicamente a la autoridad autenticada
Rol permitido: authority
"""

import json
import boto3
from boto3.dynamodb.conditions import Attr
from utils.jwt_validator import validate_token, extract_token_from_event, create_response
from utils.pagination import paginate_results, extract_pagination_params
from utils.filters import apply_filters, sort_items, extract_filter_params, extract_sort_params

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')
places_table = dynamodb.Table('t_lugares')


def handler(event, context):
    """
    GET /reports/assigned-to-me
    Query params: ?page=1&size=20&estado=ATENDIENDO&urgencia=ALTA&orderBy=created_at&order=desc
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
        
        # 3. Verificar que sea authority
        if role != 'authority':
            return create_response(403, {'error': 'Only authorities can access this endpoint'})
        
        # 4. Extraer parámetros de query
        query_params = event.get('queryStringParameters') or {}
        page, size = extract_pagination_params(query_params)
        order_by, order = extract_sort_params(query_params, default_order_by='created_at')
        
        # 5. Obtener reportes asignados al usuario
        response = reports_table.scan(
            FilterExpression=Attr('assigned_to').eq(user_id)
        )
        reports = response.get('Items', [])
        
        # Manejar paginación de DynamoDB
        while 'LastEvaluatedKey' in response:
            response = reports_table.scan(
                FilterExpression=Attr('assigned_to').eq(user_id),
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            reports.extend(response.get('Items', []))
        
        # 6. Aplicar filtros opcionales
        filters = extract_filter_params(query_params, ['estado', 'urgencia'])
        if filters:
            reports = apply_filters(reports, filters)
        
        # 7. Ordenar reportes
        reports = sort_items(reports, order_by, order)
        
        # 8. Enriquecer con datos de lugares
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
        
        # Enriquecer cada reporte
        enriched_reports = []
        for report in reports:
            if 'lugar' in report and 'id' in report['lugar']:
                lugar_id = report['lugar']['id']
                if lugar_id in lugares_dict:
                    report['lugar'] = lugares_dict[lugar_id]
            enriched_reports.append(report)
        
        # 9. Aplicar paginación manual
        paginated_result = paginate_results(enriched_reports, page, size)
        
        # 10. Retornar respuesta
        return create_response(200, {
            'reports': paginated_result['items'],
            'pagination': paginated_result['pagination']
        })
        
    except ValueError as e:
        return create_response(400, {'error': f'Invalid parameters: {str(e)}'})
    except Exception as e:
        print(f"Error in getAssignedReports: {str(e)}")
        return create_response(500, {'error': 'Internal server error', 'details': str(e)})
