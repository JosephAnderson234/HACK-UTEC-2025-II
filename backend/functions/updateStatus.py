import json
import boto3

dynamodb = boto3.resource('dynamodb')

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
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Status updated'})
    }
