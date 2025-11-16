import json
import boto3
import os
import sys
import base64
import uuid
from datetime import datetime

# Agregar el directorio padre al path para importar utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.jwt_validator import validate_token, extract_token_from_event, create_response

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
events = boto3.client('events')

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
        
        lugar = lugar_response['Item']
        
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
                
                image_url = f"s3://{bucket_name}/{image_key}"
                
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
            'estado': 'PENDIENTE',
            'author_id': user_id,
            'assigned_to': None,
            'assigned_sector': assigned_sector,
            'created_at': timestamp,
            'updated_at': timestamp,
            'resolved_at': None
        }
        
        if image_url:
            report_item['image_url'] = image_url
        
        reports_table.put_item(Item=report_item)
        
        # Enviar notificación a través de EventBridge
        try:
            events.put_events(
                Entries=[
                    {
                        'Source': 'utec-alerta.reports',
                        'DetailType': 'ReportCreated',
                        'Detail': json.dumps({
                            'report_id': report_id,
                            'urgencia': body['urgencia'],
                            'lugar': lugar.get('name', 'Sin nombre'),
                            'sector': assigned_sector,
                            'author_id': user_id,
                            'message': f'Nuevo reporte de urgencia {body["urgencia"]} en {lugar.get("name", "Sin nombre")}'
                        })
                    }
                ]
            )
        except Exception as e:
            print(f"Error sending EventBridge notification: {e}")
        
        return create_response(201, {
            'message': 'Report created successfully',
            'report': {
                'id_reporte': report_id,
                'estado': 'PENDIENTE',
                'urgencia': body['urgencia'],
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