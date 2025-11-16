import json
import boto3
import hashlib
import os

dynamodb = boto3.resource('dynamodb')
ssm = boto3.client('ssm')

def handler(event, context):
    body = json.loads(event['body'])
    action = body.get('action')  # 'login' or 'register'
    table = dynamodb.Table('users')
    
    if action == 'register':
        # Registrar usuario
        user_id = body['id']
        password_hash = hashlib.sha256(body['password'].encode()).hexdigest()
        table.put_item(Item={
            'id': user_id,
            'first_name': body['first_name'],
            'last_name': body['last_name'],
            'email': body['email'],
            'role': body['role'],
            'password': password_hash,
            'DNI': body['DNI'],
            'cellphone': body['cellphone'],
            'registration_date': body['registration_date'],
            'data_student': body.get('data_student', {}),
            'data_authority': body.get('data_authority', {})
        })
        return {'statusCode': 201, 'body': json.dumps({'message': 'User registered'})}
    
    elif action == 'login':
        # Login
        user = table.get_item(Key={'id': body['id']})
        if 'Item' in user:
            stored_hash = user['Item']['password']
            if hashlib.sha256(body['password'].encode()).hexdigest() == stored_hash:
                return {'statusCode': 200, 'body': json.dumps({'message': 'Login successful'})}
        return {'statusCode': 401, 'body': json.dumps({'message': 'Invalid credentials'})}
    
    return {'statusCode': 400, 'body': json.dumps({'message': 'Invalid action'})}