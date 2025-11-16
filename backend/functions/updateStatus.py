import json
import boto3

dynamodb = boto3.resource('dynamodb')
events = boto3.client('events')

def handler(event, context):
    body = json.loads(event['body'])
    report_id = body['reportId']
    new_status = body['status']
    
    table = dynamodb.Table('Reports')
    table.update_item(
        Key={'reportId': report_id},
        UpdateExpression='SET #s = :val',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={':val': new_status}
    )
    
    # Lanzar evento EventBridge para notificación
    events.put_events(
        Entries=[
            {
                'Source': 'aws.events',
                'DetailType': 'Status Update Notification',
                'Detail': json.dumps({
                    'message': f'Status updated for report {report_id} to {new_status}'
                })
            }
        ]
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Status updated'})
    }
