# Configuración de Entornos

Este archivo documenta las configuraciones específicas por entorno.

## Development (dev)

```yaml
stage: dev
region: us-east-1

# DynamoDB
dynamodb:
  billing_mode: PROVISIONED
  read_capacity: 5
  write_capacity: 5

# S3
s3:
  bucket_name: utec-alerta-dev-bucket-of-hack-utec
  versioning: false

# JWT
jwt:
  expiration: 7d  # 7 días
  secret_param: /utec-alerta/jwt-secret

# CORS
cors:
  allowed_origins: "*"
  allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
```

## Production (prod)

```yaml
stage: prod
region: us-east-1

# DynamoDB
dynamodb:
  billing_mode: PAY_PER_REQUEST  # Mejor para producción
  
# S3
s3:
  bucket_name: utec-alerta-prod-bucket-of-hack-utec
  versioning: true  # Habilitado en producción

# JWT
jwt:
  expiration: 7d
  secret_param: /utec-alerta/jwt-secret
  # ⚠️ IMPORTANTE: Cambiar el secret en producción

# CORS
cors:
  allowed_origins: "https://tu-dominio-frontend.com"
  allowed_methods: ["GET", "POST", "PUT", "OPTIONS"]
```

## Variables de Entorno por Lambda

### Todas las Lambdas
```env
JWT_SECRET_PARAM=/utec-alerta/jwt-secret
WEBSOCKET_API_ENDPOINT={WebsocketsApi}.execute-api.us-east-1.amazonaws.com
```

### sendReport
```env
BUCKET_INGESTA=utec-alerta-{stage}-bucket-of-hack-utec
```

## Configuración IAM (LabRole)

El LabRole debe tener estos permisos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/t_usuarios",
        "arn:aws:dynamodb:us-east-1:*:table/t_lugares",
        "arn:aws:dynamodb:us-east-1:*:table/t_reportes",
        "arn:aws:dynamodb:us-east-1:*:table/t_connections",
        "arn:aws:dynamodb:us-east-1:*:table/t_usuarios/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::utec-alerta-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter"
      ],
      "Resource": "arn:aws:ssm:us-east-1:*:parameter/utec-alerta/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:PutEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "execute-api:ManageConnections"
      ],
      "Resource": "arn:aws:execute-api:us-east-1:*:*/*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Límites y Cuotas

### DynamoDB (Provisioned en dev)
- Read Capacity Units: 5
- Write Capacity Units: 5
- Aprox: 5 lecturas/segundo, 5 escrituras/segundo
- Escalar si se necesita más

### Lambda
- Memory: 512 MB (por defecto)
- Timeout: 30 segundos
- Concurrent executions: Sin límite (usar LabRole default)

### WebSocket
- Connection duration: 2 horas (API Gateway default)
- Message size: 128 KB max
- Connections: 500 simultáneas (cuenta learner lab)

### S3
- Max file size: 5 GB (Lambda limita a ~6MB por invoke)
- Recomendación para imágenes: < 5 MB

## Monitoreo Recomendado

### CloudWatch Alarms

```yaml
alarms:
  # Lambda Errors
  - name: HighErrorRate
    metric: Errors
    threshold: 10
    period: 300  # 5 minutos
    
  # Lambda Duration
  - name: HighDuration
    metric: Duration
    threshold: 25000  # 25 segundos
    
  # DynamoDB Throttles
  - name: DynamoThrottles
    metric: UserErrors
    threshold: 5
    
  # WebSocket Errors
  - name: WebSocketErrors
    metric: ExecutionError
    threshold: 10
```

### Logs Retention
```yaml
logs:
  retention_days: 7  # dev
  retention_days: 30  # prod
```

## Costos Estimados (Learner Lab)

### Por Mes (uso moderado)
```
Lambda:
  - Invocations: 1M/month = $0.20
  - Compute: 100K GB-seconds = $1.67
  
DynamoDB (Provisioned):
  - t_usuarios: $0.58/month (5 RCU, 5 WCU)
  - t_lugares: $0.58/month
  - t_reportes: $0.58/month
  - t_connections: $0.58/month
  - Storage: ~$0.25/GB
  
S3:
  - Storage: $0.023/GB
  - Requests: $0.0004/1000 PUT
  
API Gateway:
  - HTTP: $1.00/million requests
  - WebSocket: $1.00/million messages
  
EventBridge:
  - $1.00/million events
  
Total Estimado: ~$10-15/month (uso bajo-moderado)
```

**Nota**: Learner Lab tiene créditos limitados, monitorear el uso regularmente.

## Backup y Recuperación

### DynamoDB
- Point-in-time recovery: Deshabilitado (para reducir costos)
- On-demand backups: Manual cuando sea necesario

```bash
# Backup manual
aws dynamodb create-backup \
  --table-name t_reportes \
  --backup-name reportes-backup-$(date +%Y%m%d)
```

### S3
- Versioning: Solo en producción
- Lifecycle policies: Archivar imágenes después de 1 año

## Seguridad Adicional

### Recomendaciones para Producción

1. **JWT Secret**
   ```bash
   # Generar secret seguro
   openssl rand -base64 32
   
   # Actualizar en Parameter Store
   aws ssm put-parameter \
     --name /utec-alerta/jwt-secret \
     --value "NUEVO_SECRET_AQUI" \
     --overwrite
   ```

2. **API Rate Limiting**
   - Configurar Usage Plans en API Gateway
   - Límite sugerido: 100 req/segundo por API key

3. **WAF (Web Application Firewall)**
   - Protección contra SQL injection
   - Protección contra XSS
   - Rate limiting por IP

4. **Encryption**
   - DynamoDB: Encryption at rest (habilitado por defecto)
   - S3: Server-side encryption (SSE-S3 o SSE-KMS)
   - Parameter Store: SecureString con KMS

## Troubleshooting por Entorno

### Development
- Logs más verbosos
- CORS permisivo (*)
- Sin alertas automáticas

### Production
- Logs solo de errores
- CORS restrictivo
- Alertas configuradas
- Backups regulares

## Checklist de Deploy

### Pre-Deploy
- [ ] Actualizar JWT_SECRET en prod
- [ ] Verificar límites de cuota AWS
- [ ] Revisar permisos IAM
- [ ] Configurar CORS correcto

### Post-Deploy
- [ ] Ejecutar seed_lugares.py
- [ ] Ejecutar quick_test.py
- [ ] Verificar CloudWatch Logs
- [ ] Probar WebSocket connection
- [ ] Validar notificaciones
- [ ] Documentar endpoints para frontend

### Rollback Plan
```bash
# Si algo falla
serverless rollback --timestamp YYYYMMDDHHMMSS
```
