"""
Utilidad de filtrado dinámico para resultados de DynamoDB.
Usado por lambdas que necesitan aplicar múltiples filtros opcionales.
"""

def apply_filters(items, filters):
    """
    Aplica múltiples filtros opcionales a una lista de items.
    
    Args:
        items: Lista de items (dicts) a filtrar
        filters: Dict con pares {campo: valor} para filtrar
                 Si valor es None o '', el filtro se ignora
        
    Returns:
        Lista filtrada de items
    """
    filtered_items = items
    
    for field, value in filters.items():
        if value is not None and value != '':
            filtered_items = [
                item for item in filtered_items 
                if item.get(field) == value
            ]
    
    return filtered_items


def apply_text_search(items, field, term):
    """
    Aplica búsqueda de texto case-insensitive en un campo específico.
    
    Args:
        items: Lista de items a buscar
        field: Nombre del campo donde buscar
        term: Término de búsqueda (case-insensitive)
        
    Returns:
        Lista de items que contienen el término
    """
    if not term:
        return items
    
    term_lower = term.lower()
    return [
        item for item in items 
        if term_lower in str(item.get(field, '')).lower()
    ]


def sort_items(items, order_by='created_at', order='desc'):
    """
    Ordena items por un campo específico.
    
    Args:
        items: Lista de items a ordenar
        order_by: Campo por el cual ordenar (default: 'created_at')
        order: Dirección 'asc' o 'desc' (default: 'desc')
        
    Returns:
        Lista ordenada de items
    """
    if not items:
        return items
    
    reverse = (order.lower() == 'desc')
    
    try:
        # Ordenar con manejo de valores None
        sorted_items = sorted(
            items,
            key=lambda x: x.get(order_by) or '',
            reverse=reverse
        )
        return sorted_items
    except (KeyError, TypeError):
        # Si hay error, retornar sin ordenar
        return items


def extract_filter_params(query_params, allowed_filters):
    """
    Extrae parámetros de filtro desde query params.
    
    Args:
        query_params: Dict de query string parameters
        allowed_filters: Lista de nombres de filtros permitidos
        
    Returns:
        Dict con filtros extraídos {campo: valor}
    """
    filters = {}
    
    if not query_params:
        return filters
    
    for filter_name in allowed_filters:
        value = query_params.get(filter_name)
        if value is not None and value != '':
            filters[filter_name] = value
    
    return filters


def extract_sort_params(query_params, default_order_by='created_at'):
    """
    Extrae parámetros de ordenamiento desde query params.
    
    Args:
        query_params: Dict de query string parameters
        default_order_by: Campo por defecto para ordenar
        
    Returns:
        Tuple (order_by, order) con valores extraídos
    """
    order_by = default_order_by
    order = 'desc'
    
    if query_params:
        order_by = query_params.get('orderBy', default_order_by)
        order = query_params.get('order', 'desc')
        
        # Validar que order sea 'asc' o 'desc'
        if order.lower() not in ['asc', 'desc']:
            order = 'desc'
    
    return order_by, order
