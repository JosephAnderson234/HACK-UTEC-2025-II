# Guía de Despliegue - UTEC Alerta Backend

## Prerrequisitos

1. **Node.js** (v18 o superior)
2. **Python** (3.12)
3. **AWS CLI** configurado con credenciales
4. **Serverless Framework**

## Instalación

### 1. Instalar Serverless Framework

```bash
npm install -g serverless
```

### 2. Instalar dependencias Python

```bash
pip install -r requirements.txt
```

## Despliegue

### 1. Deploy a AWS

```bash
# Deploy a ambiente de desarrollo
serverless deploy --stage dev

# Deploy a ambiente de producción
serverless deploy --stage prod
```

El comando mostrará información importante al finalizar:

```
✔ Service deployed to stack utec-alerta-dev

endpoints:
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/auth/register
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/auth/login
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/reports/create
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/reports/update-status
  
websocket:
  wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev
```

**⚠️ IMPORTANTE:** Guarda estos endpoints, los necesitarás para el frontend.

### 2. Poblar tabla de lugares

Después del deploy, inserta datos de prueba en la tabla `t_lugares`:

```bash
python scripts/seed_lugares.py
```

### 3. Verificar el despliegue

```bash
# Ver información del stack
serverless info --stage dev

# Ver logs en tiempo real
serverless logs -f sendReport --tail --stage dev
```

## Configuración Post-Deploy

### 1. Verificar Parameter Store

El JWT_SECRET debe estar en Systems Manager Parameter Store:

```bash
aws ssm get-parameter --name /utec-alerta/jwt-secret --region us-east-1
```

Si necesitas cambiarlo en producción:

```bash
aws ssm put-parameter \
  --name /utec-alerta/jwt-secret \
  --value "tu-super-secreto-seguro-aqui" \
  --type String \
  --overwrite \
  --region us-east-1
```

### 2. Configurar CORS (si es necesario)

Si tienes problemas con CORS desde el frontend, verifica que el dominio esté permitido en las respuestas de las Lambdas. Ya está configurado `Access-Control-Allow-Origin: *` para desarrollo.

### 3. Verificar permisos IAM

El LabRole debe tener permisos para:
- DynamoDB (read/write en las tablas)
- S3 (read/write en el bucket)
- EventBridge (put events)
- SSM Parameter Store (read)
- API Gateway Management API (post to connection)
- Lambda (basic execution)

## Testing

### 1. Test de Health Check básico

```bash
# Registrar un usuario de prueba
curl -X POST https://YOUR_API_ENDPOINT/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@utec.edu.pe",
    "password": "test123",
    "role": "student",
    "DNI": "12345678",
    "cellphone": "987654321",
    "data_student": {
      "career": "Ingeniería de Software",
      "cycle": 1,
      "code": 202010001
    }
  }'
```

### 2. Login

```bash
curl -X POST https://YOUR_API_ENDPOINT/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@utec.edu.pe",
    "password": "test123"
  }'
```

Si recibes un token JWT, ¡el sistema está funcionando! 🎉

### 3. Test de WebSocket

Usa una herramienta como [WebSocket King](https://websocketking.com/) o este código JavaScript:

```javascript
const token = 'TU_TOKEN_JWT_AQUI';
const ws = new WebSocket(`wss://YOUR_WEBSOCKET_ENDPOINT/dev?token=${token}`);

ws.onopen = () => console.log('✅ Conectado');
ws.onmessage = (e) => console.log('📨 Mensaje:', e.data);
ws.onerror = (e) => console.error('❌ Error:', e);
```

## Monitoreo

### Ver logs

```bash
# Logs de una función específica
serverless logs -f auth --tail --stage dev

# Ver logs de todos los servicios
aws logs tail /aws/lambda/utec-alerta-dev-sendReport --follow
```

### CloudWatch

Las métricas y logs también están disponibles en AWS CloudWatch Console:
- Lambda → Functions → Monitoring
- CloudWatch → Log groups → /aws/lambda/

## Troubleshooting

### Error: "JWT_SECRET not configured"
- Verifica que el parámetro exista en Systems Manager
- Verifica que el Lambda tenga permisos para leer SSM

### Error: "User not found in database"
- La tabla `t_usuarios` está vacía o el usuario no existe
- Registra un usuario primero con `/auth/register`

### Error: "Place not found"
- La tabla `t_lugares` está vacía
- Ejecuta `python scripts/seed_lugares.py`

### Error: "Failed to upload image"
- Verifica que el bucket S3 exista
- Verifica permisos del LabRole en S3
- La imagen debe estar en formato base64

### Error en WebSocket: "410 Gone"
- La conexión WebSocket expiró
- Reconecta con un nuevo token

### Error: "Missing authentication token"
- Incluye el header `Authorization: Bearer TOKEN` en requests HTTP
- Incluye `?token=TOKEN` en conexiones WebSocket

## Rollback

Si algo sale mal, puedes hacer rollback:

```bash
# Ver deployments anteriores
serverless deploy list --stage dev

# Rollback al deployment anterior
serverless rollback --timestamp TIMESTAMP --stage dev
```

## Eliminar el Stack

Para eliminar completamente el deployment:

```bash
serverless remove --stage dev
```

**⚠️ ADVERTENCIA:** Esto eliminará:
- Todas las Lambdas
- Las tablas DynamoDB (y sus datos)
- El bucket S3 (si está vacío)
- Los API Gateways
- Los parámetros de SSM

## Siguientes Pasos

1. **Frontend**: Conecta tu aplicación frontend con estos endpoints
2. **Seguridad**: En producción, cambia el JWT_SECRET por uno más seguro
3. **Monitoreo**: Configura alertas en CloudWatch para errores
4. **Costos**: Revisa AWS Cost Explorer para monitorear gastos
5. **Logs**: Configura retention policies para los logs de CloudWatch

## Endpoints de Producción

Una vez desplegado, tendrás estos endpoints:

**HTTP API:**
- POST /auth/register - Registrar usuario
- POST /auth/login - Login
- POST /reports/create - Crear reporte (requiere JWT)
- POST /reports/update-status - Actualizar estado (requiere JWT)

**WebSocket API:**
- wss://[websocket-url]?token=[jwt] - Conexión en tiempo real

## Soporte

Si tienes problemas:
1. Revisa los logs de CloudWatch
2. Verifica los permisos del LabRole
3. Asegúrate de que todas las tablas DynamoDB existan
4. Verifica que el JWT_SECRET esté en Parameter Store
