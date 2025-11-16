# UTEC Alerta - Resumen de Implementación

## ✅ Implementación Completa

### Arquitectura Implementada

Basado en el diagrama de Eraser proporcionado, se implementaron todos los componentes:

#### 1. **Autenticación (Auth)**
- ✅ Lambda `auth.py` con register y login
- ✅ Generación de JWT tokens
- ✅ Hash de contraseñas con SHA-256
- ✅ Almacenamiento en tabla `t_usuarios` (DynamoDB)
- ✅ JWT_SECRET en AWS Systems Manager Parameter Store
- ✅ Endpoints:
  - `POST /auth/register`
  - `POST /auth/login`

#### 2. **Gestión de Reportes**
- ✅ Lambda `sendReport.py` para crear reportes
- ✅ Validación JWT compartida (utils/jwt_validator.py)
- ✅ Upload de imágenes a S3 (base64 → JPG)
- ✅ Almacenamiento en tabla `t_reportes` (DynamoDB)
- ✅ Determinación automática de sector por tipo de lugar
- ✅ Trigger de notificación vía EventBridge
- ✅ Endpoint: `POST /reports/create` (protegido con JWT)

#### 3. **Actualización de Estados**
- ✅ Lambda `updateStatus.py` para autoridades
- ✅ Validación JWT compartida
- ✅ Actualización de estado en `t_reportes`
- ✅ Trigger de notificación vía EventBridge
- ✅ Solo autoridades pueden actualizar
- ✅ Endpoint: `POST /reports/update-status` (protegido con JWT)

#### 4. **WebSocket para Notificaciones en Tiempo Real**
- ✅ Lambda `onConnect.py` con validación JWT
- ✅ Lambda `onDisconnect.py`
- ✅ Lambda `sendNotify.py` trigger por EventBridge
- ✅ Almacenamiento de conexiones en `t_connections`
- ✅ Notificaciones inteligentes por rol:
  - Estudiantes: reciben updates de sus reportes
  - Autoridades: reciben nuevos reportes de su sector
- ✅ WebSocket URL: `wss://[endpoint]?token=[jwt]`

#### 5. **EventBridge para Eventos**
- ✅ Eventos personalizados:
  - `ReportCreated` (cuando se crea un reporte)
  - `StatusUpdated` (cuando se actualiza el estado)
- ✅ Source: `utec-alerta.reports`
- ✅ Trigger automático de `sendNotify`

#### 6. **Tablas DynamoDB**
- ✅ `t_usuarios` (usuarios con GSI por email)
- ✅ `t_lugares` (lugares del campus)
- ✅ `t_reportes` (reportes de incidencias)
- ✅ `t_connections` (conexiones WebSocket activas)

#### 7. **S3 para Almacenamiento**
- ✅ Bucket para imágenes de reportes
- ✅ Path: `reports/{report_id}.jpg`
- ✅ Upload desde base64

#### 8. **Seguridad y Autenticación**
- ✅ JWT tokens con expiración (7 días)
- ✅ Validación compartida en `utils/jwt_validator.py`
- ✅ Funciones que comparten validación:
  - `sendReport` ✅
  - `updateStatus` ✅
  - `onConnect` ✅
- ✅ Verificación de existencia de usuario en BD
- ✅ JWT_SECRET en Parameter Store
- ✅ Roles y permisos:
  - `student`: crear reportes
  - `authority`: actualizar estados
  - `admin`: acceso completo

## 📊 Esquema de Datos

### t_usuarios
```json
{
  "id": "UUID",
  "first_name": "string",
  "last_name": "string",
  "email": "email",
  "role": "student|authority|admin",
  "password": "sha256_hash",
  "DNI": "string",
  "cellphone": "string",
  "registration_date": "ISO8601",
  "data_student": {
    "career": "string",
    "cycle": "number",
    "code": "number"
  },
  "data_authority": {
    "sector": "string",
    "charge": "string",
    "notifications_urgency": ["string"]
  }
}
```

### t_lugares
```json
{
  "id": "UUID",
  "name": "string",
  "type": "baño|auditorio|sala_sum|aula|etc",
  "tower": "T1|T2|T3|T4",
  "floor": "number"
}
```

### t_reportes
```json
{
  "id_reporte": "UUID",
  "lugar": {
    "id": "UUID",
    "nombre": "string",
    "type": "string",
    "tower": "string",
    "floor": "number"
  },
  "descripcion": "string",
  "fecha_hora": "ISO8601",
  "urgencia": "BAJA|MEDIA|ALTA",
  "estado": "PENDIENTE|ATENDIENDO|RESUELTO",
  "author_id": "UUID",
  "assigned_to": "UUID|null",
  "assigned_sector": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "resolved_at": "ISO8601|null",
  "image_url": "s3://bucket/path"
}
```

### t_connections
```json
{
  "connectionId": "string",
  "user_id": "UUID",
  "user_role": "student|authority|admin",
  "user_email": "email",
  "connected_at": "ISO8601"
}
```

## 🔄 Flujos Implementados

### Flujo 1: Registro y Login (Estudiante)
```
1. Frontend → POST /auth/register
2. auth.py → Valida datos
3. auth.py → Hashea password
4. auth.py → Guarda en t_usuarios
5. auth.py → Genera JWT
6. auth.py → Retorna token + user data
```

### Flujo 2: Crear Reporte
```
1. Frontend → POST /reports/create (con JWT)
2. sendReport.py → Valida JWT (validate_token)
3. sendReport.py → Verifica usuario existe
4. sendReport.py → Valida lugar existe
5. sendReport.py → Sube imagen a S3 (si hay)
6. sendReport.py → Guarda en t_reportes
7. sendReport.py → Publica evento en EventBridge
8. EventBridge → Trigger sendNotify
9. sendNotify → Notifica a autoridades vía WebSocket
```

### Flujo 3: Actualizar Estado (Autoridad)
```
1. Frontend → POST /reports/update-status (con JWT)
2. updateStatus.py → Valida JWT (validate_token)
3. updateStatus.py → Verifica rol = authority
4. updateStatus.py → Actualiza en t_reportes
5. updateStatus.py → Publica evento en EventBridge
6. EventBridge → Trigger sendNotify
7. sendNotify → Notifica al estudiante autor vía WebSocket
```

### Flujo 4: Conexión WebSocket
```
1. Frontend → wss://endpoint?token=JWT
2. onConnect.py → Valida JWT (validate_token)
3. onConnect.py → Verifica usuario existe
4. onConnect.py → Guarda conexión en t_connections
5. Usuario conectado y listo para recibir notificaciones
```

### Flujo 5: Notificaciones en Tiempo Real
```
1. Evento en EventBridge (ReportCreated/StatusUpdated)
2. sendNotify.py → Lee t_connections
3. sendNotify.py → Filtra por rol y relevancia
4. sendNotify.py → Envía notificación vía API Gateway WS
5. Frontend → Recibe notificación
6. Frontend → Muestra alerta al usuario
```

## 🎯 Funciones Lambda

| Función | Trigger | JWT | Descripción |
|---------|---------|-----|-------------|
| auth | HTTP POST /auth/register, /auth/login | ❌ | Registro y login de usuarios |
| sendReport | HTTP POST /reports/create | ✅ | Crear reportes (estudiantes) |
| updateStatus | HTTP POST /reports/update-status | ✅ | Actualizar estados (autoridades) |
| onConnect | WebSocket $connect | ✅ | Conectar WebSocket con validación |
| onDisconnect | WebSocket $disconnect | ❌ | Desconectar WebSocket |
| sendNotify | EventBridge | ❌ | Enviar notificaciones vía WS |

## 🔐 Seguridad

### JWT Validation
La función `validate_token()` en `utils/jwt_validator.py` es compartida por:
- ✅ `sendReport.py`
- ✅ `updateStatus.py`
- ✅ `onConnect.py`

Todas estas funciones:
1. Extraen el token del evento
2. Validan el token con `validate_token()`
3. Verifican que el usuario exista en `t_usuarios`
4. Obtienen los datos del usuario

### Environment Variables
```yaml
JWT_SECRET_PARAM: /utec-alerta/jwt-secret
BUCKET_INGESTA: utec-alerta-{stage}-bucket-of-hack-utec
WEBSOCKET_API_ENDPOINT: {WebsocketsApi}.execute-api.us-east-1.amazonaws.com
```

## 📱 Frontend Integration

### Headers para API HTTP
```javascript
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

### WebSocket Connection
```javascript
const token = localStorage.getItem('jwt_token');
const ws = new WebSocket(`wss://${WS_ENDPOINT}?token=${token}`);
```

## 🚀 Scripts de Ayuda

1. **seed_lugares.py**: Puebla la tabla t_lugares con datos de ejemplo
2. **quick_test.py**: Test completo del sistema (registro, login, crear reporte, actualizar)

## 📝 Documentación

- ✅ README.md: Documentación principal
- ✅ DEPLOYMENT.md: Guía de despliegue
- ✅ TESTING.md: Ejemplos de testing
- ✅ ARCHITECTURE.md: Este archivo

## ✨ Características Especiales

1. **Determinación Automática de Sector**
   - Los reportes se asignan automáticamente al sector según el tipo de lugar
   - Ejemplo: "baño" → Mantenimiento, "estacionamiento" → Seguridad

2. **Notificaciones Inteligentes**
   - Estudiantes solo reciben notificaciones de sus propios reportes
   - Autoridades reciben notificaciones de nuevos reportes en su sector
   - Filtrado automático por rol

3. **Validación JWT Centralizada**
   - Una única función `validate_token()` compartida
   - Evita duplicación de código
   - Verifica existencia en BD

4. **Gestión de Imágenes**
   - Upload desde base64
   - Conversión automática a JPG
   - Almacenamiento en S3 con path organizado

## 🎓 Listo para Probar

El sistema está completamente implementado y listo para:
1. ✅ Deploy con `serverless deploy`
2. ✅ Poblar datos con `python scripts/seed_lugares.py`
3. ✅ Probar con `python scripts/quick_test.py`
4. ✅ Integrar con frontend React/Vue/Angular
5. ✅ Conectar Apache Airflow para análisis de datos

---

**Implementado por**: GitHub Copilot
**Fecha**: 16 de noviembre de 2025
**Tecnologías**: AWS Lambda, API Gateway, DynamoDB, S3, EventBridge, Serverless Framework
