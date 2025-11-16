import json
import boto3
import os
import sys
import base64
import uuid
from datetime import datetime
from decimal import Decimal

# Agregar el directorio padre al path para importar utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.jwt_validator import validate_token, extract_token_from_event, create_response
from utils.s3_helper import generate_presigned_url

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
events = boto3.client('events')

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

def handler(event, context):
    """
    Handler para crear un nuevo reporte.
    Requiere autenticación JWT.
    
    POST /send-report
    Body: {
        "lugar_id": "uuid",
        "urgencia": "BAJA" | "MEDIA" | "ALTA",
        "descripcion": "string",
        "image": "base64_string" (opcional)
    }
    """
    try:
        # Validar token JWT
        token = extract_token_from_event(event)
        if not token:
            return create_response(401, {'error': 'Missing authentication token'})
        
        try:
            token_data = validate_token(token)
            user_id = token_data['user_id']
            user_role = token_data.get('role')
        except Exception as e:
            return create_response(401, {'error': f'Invalid token: {str(e)}'})
        
        # Solo estudiantes pueden crear reportes
        if user_role != 'student':
            return create_response(403, {'error': 'Only students can create reports'})
        
        # Parsear el body
        body = json.loads(event.get('body', '{}'))
        
        # Validar campos requeridos
        required_fields = ['lugar_id', 'urgencia', 'descripcion']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # Validar urgencia
        if body['urgencia'] not in ['BAJA', 'MEDIA', 'ALTA']:
            return create_response(400, {'error': 'urgencia must be BAJA, MEDIA, or ALTA'})
        
        # Verificar que el lugar existe
        lugares_table = dynamodb.Table('t_lugares')
        lugar_response = lugares_table.get_item(Key={'id': body['lugar_id']})
        
        if 'Item' not in lugar_response:
            return create_response(404, {'error': 'Place not found'})
        
        # Convertir Decimal a tipos nativos
        lugar = decimal_to_native(lugar_response['Item'])
        
        # Generar ID del reporte
        report_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Manejar imagen si existe
        image_url = None
        if 'image' in body and body['image']:
            try:
                # Decodificar imagen base64
                image_data = base64.b64decode(body['image'])
                
                # Subir a S3
                bucket_name = os.environ.get('BUCKET_INGESTA')
                image_key = f'reports/{report_id}.jpg'
                
                s3.put_object(
                    Bucket=bucket_name,
                    Key=image_key,
                    Body=image_data,
                    ContentType='image/jpeg'
                )
                
                # Generar URL HTTP firmada para el frontend (válida por 1 hora)
            image_url = generate_presigned_url(image_key)
            
            if not image_url:
                return create_response(500, {
                    'error': 'No se pudo generar URL de acceso a la imagen'
                })
                
            except Exception as e:
                print(f"Error uploading image: {e}")
                return create_response(500, {'error': f'Failed to upload image: {str(e)}'})
        
        # Determinar sector asignado basado en el tipo de lugar
        assigned_sector = determine_sector(lugar.get('type', 'general'))
        
        # Crear reporte en DynamoDB
        reports_table = dynamodb.Table('t_reportes')
        report_item = {
            'id_reporte': report_id,
            'lugar': {
                'id': lugar['id'],
                'nombre': lugar.get('name', 'Sin nombre'),
                'type': lugar.get('type', 'general'),
                'tower': lugar.get('tower', ''),
                'floor': lugar.get('floor', 0)
            },
            'descripcion': body['descripcion'],
            'fecha_hora': timestamp,
            'urgencia': body['urgencia'],
            'urgencia_original': body['urgencia'],
            'urgencia_clasificada': body['urgencia'],
            'estado': 'PENDIENTE',
            'author_id': user_id,
            'assigned_to': None,
            'assigned_sector': assigned_sector,
            'created_at': timestamp,
            'updated_at': timestamp,
            'resolved_at': None,
            'clasificacion_auto': False,
            'classification_score': None,
            'notification_sent': False,
            'notification_sent_at': None
        }
        
        if image_url:
            report_item['image_url'] = image_url
        
        reports_table.put_item(Item=report_item)
        
        # Enviar notificación a través de EventBridge
        try:
            event_detail = {
                'report_id': report_id,
                'urgencia': body['urgencia'],
                'lugar': lugar.get('name', 'Sin nombre'),
                'sector': assigned_sector,
                'author_id': user_id,
                'timestamp': timestamp,
                'message': f'Nuevo reporte de urgencia {body["urgencia"]} en {lugar.get("name", "Sin nombre")}'
            }
            print(f"Sending EventBridge event: {json.dumps(event_detail)}")
            
            events.put_events(
                Entries=[
                    {
                        'Source': 'utec-alerta.reports',
                        'DetailType': 'ReportCreated',
                        'Detail': json.dumps(event_detail)
                    }
                ]
            )
            print("EventBridge event sent successfully")
        except Exception as e:
            print(f"Error sending EventBridge notification: {e}")
            import traceback
            traceback.print_exc()
        
        return create_response(201, {
            'message': 'Report created successfully',
            'report': {
                'id_reporte': report_id,
                'estado': 'PENDIENTE',
                'urgencia': body['urgencia'],
                'urgencia_original': body['urgencia'],
                'urgencia_clasificada': body['urgencia'],
                'clasificacion_auto': False,
                'classification_score': None,
                'lugar': report_item['lugar'],
                'created_at': timestamp
            }
        })
    
    except Exception as e:
        print(f"Error in sendReport handler: {e}")
        return create_response(500, {'error': f'Internal server error: {str(e)}'})


def determine_sector(lugar_type):
    """
    Determina el sector que debe atender el reporte basado en el tipo de lugar
    """
    sector_mapping = {
        'baño': 'Mantenimiento',
        'aula': 'Mantenimiento',
        'laboratorio': 'Mantenimiento',
        'auditorio': 'Mantenimiento',
        'sala_sum': 'Mantenimiento',
        'estacionamiento': 'Seguridad',
        'entrada': 'Seguridad',
        'patio': 'Limpieza',
        'jardin': 'Limpieza',
        'cafeteria': 'Servicios',
        'biblioteca': 'Servicios'
    }
    
    return sector_mapping.get(lugar_type.lower(), 'General')