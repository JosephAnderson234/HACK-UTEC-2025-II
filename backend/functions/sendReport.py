import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
events = boto3.client('events')

def handler(event, context):
    # Lógica para enviar reporte
    # Ejemplo: guardar en DynamoDB y subir imagen a S3
    table = dynamodb.Table('Reports')
    # Asumir datos en event
    report_data = json.loads(event['body']) if 'body' in event else {}
    report_id = str(datetime.now().timestamp())
    table.put_item(Item={'reportId': report_id, **report_data})
    
    # Subir imagen a S3 si hay
    if 'image' in report_data:
        s3.put_object(Bucket='s3-img', Key=f'report-{report_id}.jpg', Body=report_data['image'])
    
    # Lanzar evento EventBridge para notificación WebSocket
    events.put_events(
        Entries=[
            {
                'Source': 'aws.events',
                'DetailType': 'New Report Notification',
                'Detail': json.dumps({
                    'message': f'Nuevo reporte creado: {report_data.get("description", "Sin descripción")}'
                })
            }
        ]
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Report sent', 'reportId': report_id})
    }