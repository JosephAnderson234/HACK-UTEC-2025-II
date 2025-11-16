# UTEC Alerta Backend

Sistema de reportes y alertas para la Universidad de Ingeniería y Tecnología (UTEC).

## Arquitectura

El sistema utiliza:
- **AWS Lambda** para funciones serverless
- **API Gateway HTTP** para endpoints REST
- **API Gateway WebSocket** para notificaciones en tiempo real
- **DynamoDB** para almacenamiento de datos
- **S3** para almacenamiento de imágenes
- **EventBridge** para eventos y notificaciones
- **Systems Manager Parameter Store** para secretos

## Estructura del Proyecto

```
backend/
├── functions/              # Lambda functions
│   ├── auth.py            # Login y registro con JWT
│   ├── sendReport.py      # Crear reportes (estudiantes)
│   ├── updateStatus.py    # Actualizar estado de reportes (autoridades)
│   ├── onConnect.py       # Conexión WebSocket con JWT
│   ├── onDisconnect.py    # Desconexión WebSocket
│   └── sendNotify.py      # Enviar notificaciones vía WS
├── utils/                  # Utilidades compartidas
│   └── jwt_validator.py   # Validación JWT compartida
├── resources/              # Recursos CloudFormation
│   ├── dynamodb-tables.yml
│   ├── s3.yml
│   └── parameter-store.yml
├── serverless.yml          # Configuración Serverless Framework
└── requirements.txt        # Dependencias Python
```

## Tablas DynamoDB

### t_usuarios
Almacena información de usuarios (estudiantes, autoridades, admin).
- **PK**: `id` (UUID)
- **GSI**: `EmailIndex` por email
- Campos: first_name, last_name, email, role, password, DNI, cellphone, registration_date, data_student, data_authority

### t_lugares
Almacena información de lugares en el campus.
- **PK**: `id` (UUID)
- Campos: name, type, tower, floor

### t_reportes
Almacena reportes de incidencias.
- **PK**: `id_reporte` (UUID)
- Campos: lugar, descripcion, fecha_hora, urgencia (BAJA|MEDIA|ALTA), estado (PENDIENTE|ATENDIENDO|RESUELTO), author_id, assigned_to, assigned_sector, created_at, updated_at, resolved_at, image_url

### t_connections
Almacena conexiones WebSocket activas.
- **PK**: `connectionId`
- Campos: user_id, user_role, user_email, connected_at

## API Endpoints

### Autenticación

#### POST /auth/register
Registra un nuevo usuario.

**Request:**
```json
{
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan.perez@utec.edu.pe",
  "password": "securepassword123",
  "role": "student",
  "DNI": "12345678",
  "cellphone": "987654321",
  "data_student": {
    "career": "Ingeniería de Software",
    "cycle": 5,
    "code": 202010123
  }
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "juan.perez@utec.edu.pe",
    "role": "student",
    "first_name": "Juan",
    "last_name": "Pérez"
  }
}
```

#### POST /auth/login
Autentica un usuario.

**Request:**
```json
{
  "email": "juan.perez@utec.edu.pe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "juan.perez@utec.edu.pe",
    "role": "student",
    "first_name": "Juan",
    "last_name": "Pérez"
  }
}
```

### Reportes

#### POST /reports/create
Crea un nuevo reporte (solo estudiantes, requiere JWT).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "lugar_id": "uuid-del-lugar",
  "urgencia": "ALTA",
  "descripcion": "Fuga de agua en el baño del tercer piso",
  "image": "base64_encoded_image_string"
}
```

**Response:**
```json
{
  "message": "Report created successfully",
  "report": {
    "id_reporte": "uuid",
    "estado": "PENDIENTE",
    "urgencia": "ALTA",
    "lugar": {
      "id": "uuid",
      "nombre": "Baño torre 1 piso 3",
      "type": "baño",
      "tower": "T1",
      "floor": 3
    },
    "created_at": "2025-11-16T10:30:00Z"
  }
}
```

#### POST /reports/update-status
Actualiza el estado de un reporte (solo autoridades, requiere JWT).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "id_reporte": "uuid-del-reporte",
  "estado": "ATENDIENDO",
  "comentario": "Personal de mantenimiento en camino"
}
```

**Response:**
```json
{
  "message": "Status updated successfully",
  "report": {
    "id_reporte": "uuid",
    "estado": "ATENDIENDO",
    "updated_at": "2025-11-16T10:45:00Z",
    "assigned_to": "uuid-autoridad"
  }
}
```

### WebSocket

#### Conexión
```
wss://<websocket-api-url>?token=<jwt-token>
```

El token JWT debe incluirse en los query parameters para autenticación.

#### Mensajes recibidos
```json
{
  "type": "ReportCreated",
  "timestamp": "2025-11-16T10:30:00Z",
  "message": "Nuevo reporte de urgencia ALTA en sector Mantenimiento",
  "data": {
    "report_id": "uuid",
    "urgencia": "ALTA"
  }
}
```

## Roles y Permisos

### Student (Estudiante)
- Puede registrarse y hacer login
- Puede crear reportes
- Recibe notificaciones sobre sus reportes

### Authority (Autoridad)
- Puede hacer login
- Puede actualizar estado de reportes
- Recibe notificaciones de nuevos reportes en su sector

### Admin
- Todos los permisos
- Acceso completo al sistema

## Deploy

```bash
# Instalar dependencias
npm install -g serverless
pip install -r requirements.txt

# Configurar AWS credentials
# Las credenciales ya están configuradas para usar LabRole

# Deploy
serverless deploy --stage dev

# Ver logs
serverless logs -f sendReport --tail
```

## Testing

### Registro de usuario estudiante
```bash
curl -X POST https://API_ENDPOINT/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan.perez@utec.edu.pe",
    "password": "test123",
    "role": "student",
    "DNI": "12345678",
    "cellphone": "987654321",
    "data_student": {
      "career": "Ingeniería de Software",
      "cycle": 5,
      "code": 202010123
    }
  }'
```

### Login
```bash
curl -X POST https://API_ENDPOINT/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@utec.edu.pe",
    "password": "test123"
  }'
```

### Crear reporte
```bash
curl -X POST https://API_ENDPOINT/reports/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "lugar_id": "lugar-uuid",
    "urgencia": "ALTA",
    "descripcion": "Fuga de agua"
  }'
```

## Seguridad

- Todas las contraseñas se hashean con SHA-256
- JWT con expiración de 7 días
- JWT_SECRET almacenado en AWS Systems Manager Parameter Store
- Validación de tokens en sendReport, updateStatus y onConnect
- Roles y permisos estrictos por endpoint

## Notificaciones en Tiempo Real

El sistema usa EventBridge + WebSocket para notificaciones:

1. **Nuevo reporte**: Se notifica a todas las autoridades del sector correspondiente
2. **Actualización de estado**: Se notifica al autor del reporte y a las autoridades

## Variables de Entorno

Las siguientes variables se configuran automáticamente en `serverless.yml`:

- `BUCKET_INGESTA`: Nombre del bucket S3 para imágenes
- `JWT_SECRET_PARAM`: Path del JWT secret en Parameter Store
- `WEBSOCKET_API_ENDPOINT`: Endpoint del API Gateway WebSocket

## Notas Importantes

- El LabRole debe tener permisos para DynamoDB, S3, EventBridge, SSM, Lambda y API Gateway
- El JWT_SECRET se genera automáticamente en el deploy (cambiar en producción)
- Las imágenes se almacenan en formato base64 y se convierten a JPG en S3
- El sistema determina el sector automáticamente basado en el tipo de lugar
