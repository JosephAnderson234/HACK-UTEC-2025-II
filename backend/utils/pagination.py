"""
Utilidad de paginación manual para resultados de DynamoDB.
Usado por todas las lambdas que retornan listas de items.
"""

def paginate_results(items, page=1, size=20, max_size=100):
    """
    Aplica paginación manual a una lista de items.
    
    Args:
        items: Lista completa de items a paginar
        page: Número de página (default: 1, min: 1)
        size: Items por página (default: 20, max: 100)
        max_size: Tamaño máximo permitido de página
        
    Returns:
        Dict con estructura:
        {
            'items': [...],
            'pagination': {
                'current_page': int,
                'page_size': int,
                'total_items': int,
                'total_pages': int,
                'has_next': bool,
                'has_previous': bool
            }
        }
    """
    # Validar y ajustar parámetros
    page = max(1, int(page))
    size = max(1, min(int(size), max_size))
    
    total_items = len(items)
    total_pages = (total_items + size - 1) // size if total_items > 0 else 1
    
    # Calcular índices de slice
    start = (page - 1) * size
    end = start + size
    
    # Obtener items paginados
    paginated_items = items[start:end]
    
    return {
        'items': paginated_items,
        'pagination': {
            'current_page': page,
            'page_size': size,
            'total_items': total_items,
            'total_pages': total_pages,
            'has_next': end < total_items,
            'has_previous': page > 1
        }
    }


def extract_pagination_params(query_params):
    """
    Extrae y valida parámetros de paginación desde query params.
    
    Args:
        query_params: Dict de query string parameters del evento Lambda
        
    Returns:
        Tuple (page, size) con valores validados
    """
    page = 1
    size = 20
    
    if query_params:
        try:
            page = int(query_params.get('page', 1))
            page = max(1, page)  # Mínimo 1
        except (ValueError, TypeError):
            page = 1
        
        try:
            size = int(query_params.get('size', 20))
            size = max(1, min(size, 100))  # Entre 1 y 100
        except (ValueError, TypeError):
            size = 20
    
    return page, size
