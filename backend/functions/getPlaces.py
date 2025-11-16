"""
Lambda: getPlaces
Propósito: Listar lugares disponibles con filtros opcionales y búsqueda de texto
Roles permitidos: Todos los roles autenticados
"""

import json
import boto3
from utils.jwt_validator import validate_token, extract_token_from_event, create_response
from utils.pagination import paginate_results, extract_pagination_params
from utils.filters import apply_filters, apply_text_search, sort_items, extract_filter_params

dynamodb = boto3.resource('dynamodb')
places_table = dynamodb.Table('t_lugares')


def handler(event, context):
    """
    GET /places
    Query params: ?page=1&size=50&tower=T1&floor=3&type=baño&term=laboratorio
    """
    try:
        # 1. Extraer y validar token
        token = extract_token_from_event(event)
        if not token:
            return create_response(401, {'error': 'Authorization token required'})
        
        # 2. Validar token y verificar usuario en BD
        payload = validate_token(token)
        # No se requiere validación de rol específico, todos pueden listar lugares
        
        # 3. Extraer parámetros de query
        query_params = event.get('queryStringParameters') or {}
        page, size = extract_pagination_params(query_params)
        term = query_params.get('term', '').strip()
        
        # 4. Obtener todos los lugares
        response = places_table.scan()
        places = response.get('Items', [])
        
        # Manejar paginación de DynamoDB
        while 'LastEvaluatedKey' in response:
            response = places_table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            places.extend(response.get('Items', []))
        
        # 5. Aplicar filtros opcionales
        filters = extract_filter_params(query_params, ['tower', 'type'])
        if filters:
            places = apply_filters(places, filters)
        
        # Filtro especial para floor (convertir a int)
        floor_filter = query_params.get('floor')
        if floor_filter is not None and floor_filter != '':
            try:
                floor_int = int(floor_filter)
                places = [p for p in places if p.get('floor') == floor_int]
            except ValueError:
                pass  # Ignorar si no es un número válido
        
        # 6. Búsqueda de texto en el campo 'name'
        if term:
            places = apply_text_search(places, 'name', term)
        
        # 7. Ordenar alfabéticamente por nombre
        places = sort_items(places, order_by='name', order='asc')
        
        # 8. Aplicar paginación manual
        paginated_result = paginate_results(places, page, size, max_size=100)
        
        # 9. Retornar respuesta
        return create_response(200, {
            'places': paginated_result['items'],
            'pagination': paginated_result['pagination']
        })
        
    except ValueError as e:
        return create_response(400, {'error': f'Invalid parameters: {str(e)}'})
    except Exception as e:
        print(f"Error in getPlaces: {str(e)}")
        return create_response(500, {'error': 'Internal server error', 'details': str(e)})
