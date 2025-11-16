# 📡 API Requests - UTEC Alerta

## Base URLs
- **HTTP API**: `https://kmstbjfbm9.execute-api.us-east-1.amazonaws.com/dev`
- **WebSocket**: `wss://786fnnhd7k.execute-api.us-east-1.amazonaws.com/dev`

---

## 🔐 Autenticación

### 1. Registro de Usuario

**Endpoint**: `POST /auth/register`

**Body - Estudiante**:
```json
{
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan.perez@utec.edu.pe",
  "password": "student123",
  "role": "student",
  "DNI": "12345678",
  "cellphone": "987654321",
  "data_student": {
    "career": "Ingeniería de Sistemas",
    "cycle": 5,
    "code": 202012345
  }
}
```

**Body - Autoridad**:
```json
{
  "first_name": "Roberto",
  "last_name": "Sánchez",
  "email": "roberto.sanchez@utec.edu.pe",
  "password": "authority123",
  "role": "authority",
  "DNI": "87654321",
  "cellphone": "987654322",
  "data_authority": {
    "sector": "Mantenimiento",
    "charge": "Jefe de Mantenimiento",
    "notifications_urgency": ["ALTA", "MEDIA"]
  }
}
```

**Body - Administrador**:
```json
{
  "first_name": "Andrea",
  "last_name": "Torres",
  "email": "andrea.torres@utec.edu.pe",
  "password": "admin123",
  "role": "admin",
  "DNI": "11223344",
  "cellphone": "987654323",
  "data_authority": {
    "sector": "Administración",
    "charge": "Directora de Operaciones",
    "notifications_urgency": ["ALTA"]
  }
}
```

**Campos Requeridos**:
- `first_name` (string): Nombre
- `last_name` (string): Apellido
- `email` (string): Email institucional
- `password` (string): Contraseña (se hashea con SHA-256)
- `role` (string): `"student"` | `"authority"` | `"admin"`
- `DNI` (string): Documento de identidad
- `cellphone` (string): Número de celular

**Campos Opcionales según rol**:
- `data_student` (object): Solo para role="student"
  - `career` (string): Carrera
  - `cycle` (number): Ciclo actual
  - `code` (number): Código de estudiante
  
- `data_authority` (object): Para role="authority" o "admin"
  - `sector` (string): `"Mantenimiento"` | `"Seguridad"` | `"Limpieza"` | `"Servicios"` | `"Administración"`
  - `charge` (string): Cargo del trabajador
  - `notifications_urgency` (array): Lista de urgencias a recibir: `["BAJA"]` | `["MEDIA"]` | `["ALTA"]`

**Response 201 - Success**:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "36a63bc2-3d75-4798-ba64-b5226bf40dc6",
    "email": "juan.perez@utec.edu.pe",
    "role": "student",
    "first_name": "Juan",
    "last_name": "Pérez"
  }
}
```

**Response 400 - Bad Request**:
```json
{
  "error": "Missing required field: email"
}
```

**Response 409 - Conflict**:
```json
{
  "error": "Email already registered"
}
```

---

### 2. Login de Usuario

**Endpoint**: `POST /auth/login`

**Body**:
```json
{
  "email": "juan.perez@utec.edu.pe",
  "password": "student123"
}
```

**Campos Requeridos**:
- `email` (string): Email registrado
- `password` (string): Contraseña

**Response 200 - Success**:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "36a63bc2-3d75-4798-ba64-b5226bf40dc6",
    "email": "juan.perez@utec.edu.pe",
    "role": "student",
    "first_name": "Juan",
    "last_name": "Pérez",
    "data_student": {
      "career": "Ingeniería de Sistemas",
      "cycle": 5,
      "code": 202012345
    }
  }
}
```

**Response 401 - Unauthorized**:
```json
{
  "error": "Invalid credentials"
}
```

**Response 400 - Bad Request**:
```json
{
  "error": "Email and password are required"
}
```

---

## 📝 Reportes

### 3. Crear Reporte

**Endpoint**: `POST /reports/create`

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body - Sin Imagen**:
```json
{
  "lugar_id": "550e8400-e29b-41d4-a716-446655440002",
  "urgencia": "ALTA",
  "descripcion": "Fuga de agua en el baño, inodoro roto"
}
```

**Body - Con Imagen**:
```json
{
  "lugar_id": "550e8400-e29b-41d4-a716-446655440002",
  "urgencia": "MEDIA",
  "descripcion": "Puerta del baño no cierra bien",
  "image": "/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

**Campos Requeridos**:
- `lugar_id` (string): UUID del lugar donde ocurre la incidencia
- `urgencia` (string): `"BAJA"` | `"MEDIA"` | `"ALTA"`
- `descripcion` (string): Descripción detallada del problema

**Campos Opcionales**:
- `image` (string): Imagen en base64 (formato JPEG)

**Validaciones**:
- ✅ Solo usuarios con role="student" pueden crear reportes
- ✅ El lugar_id debe existir en t_lugares
- ✅ La imagen se sube automáticamente a S3
- ✅ Se asigna automáticamente el sector según el tipo de lugar
- ✅ Se envía notificación automática vía EventBridge

**Response 201 - Success**:
```json
{
  "message": "Report created successfully",
  "report": {
    "id_reporte": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "estado": "PENDIENTE",
    "urgencia": "ALTA",
    "lugar": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "nombre": "Baño Torre 1 Piso 3",
      "type": "baño",
      "tower": "Torre 1",
      "floor": 3
    },
    "created_at": "2025-11-16T10:30:00.000Z"
  }
}
```

**Response 403 - Forbidden**:
```json
{
  "error": "Only students can create reports"
}
```

**Response 404 - Not Found**:
```json
{
  "error": "Place not found"
}
```

**Response 400 - Bad Request**:
```json
{
  "error": "urgencia must be BAJA, MEDIA, or ALTA"
}
```

**Response 401 - Unauthorized**:
```json
{
  "error": "Missing authentication token"
}
```

---

### 4. Actualizar Estado de Reporte

**Endpoint**: `POST /reports/update-status`

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body - Sin Comentario**:
```json
{
  "id_reporte": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "estado": "ATENDIENDO"
}
```

**Body - Con Comentario**:
```json
{
  "id_reporte": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "estado": "RESUELTO",
  "comentario": "Problema solucionado exitosamente. Se reemplazó la tubería dañada."
}
```

**Campos Requeridos**:
- `id_reporte` (string): UUID del reporte a actualizar
- `estado` (string): `"PENDIENTE"` | `"ATENDIENDO"` | `"RESUELTO"`

**Campos Opcionales**:
- `comentario` (string): Comentario sobre la actualización

**Validaciones**:
- ✅ Solo usuarios con role="authority" o "admin" pueden actualizar
- ✅ El reporte debe existir
- ✅ Se registra quién actualizó el reporte (assigned_to)
- ✅ Si estado="RESUELTO", se guarda resolved_at
- ✅ Se envía notificación automática vía EventBridge

**Response 200 - Success**:
```json
{
  "message": "Status updated successfully",
  "report": {
    "id_reporte": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "estado": "ATENDIENDO",
    "updated_at": "2025-11-16T10:45:00.000Z",
    "assigned_to": "f8d2c1a0-4b3e-4f5a-9c8d-1e2f3a4b5c6d"
  }
}
```

**Response 403 - Forbidden**:
```json
{
  "error": "Only authorities can update report status"
}
```

**Response 404 - Not Found**:
```json
{
  "error": "Report not found"
}
```

**Response 400 - Bad Request**:
```json
{
  "error": "estado must be one of: PENDIENTE, ATENDIENDO, RESUELTO"
}
```

**Response 401 - Unauthorized**:
```json
{
  "error": "Invalid token: Token expired"
}
```

---

## 🔌 WebSocket

### 5. Conectar WebSocket

**Endpoint**: `wss://786fnnhd7k.execute-api.us-east-1.amazonaws.com/dev?token=<JWT_TOKEN>`

**Query Parameters**:
- `token` (string): Token JWT obtenido del login/register

**Ejemplo de Conexión**:
```javascript
// JavaScript
const ws = new WebSocket('wss://786fnnhd7k.execute-api.us-east-1.amazonaws.com/dev?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Notification received:', notification);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

**Validaciones**:
- ✅ El token debe ser válido
- ✅ El usuario debe existir en la BD
- ✅ Se guarda la conexión en t_connections con user_id, user_role

**Response 200 - Success**:
```json
{
  "message": "Connected successfully",
  "connectionId": "abc123def456",
  "userId": "36a63bc2-3d75-4798-ba64-b5226bf40dc6"
}
```

**Response 401 - Unauthorized**:
```json
{
  "error": "Missing authentication token in query parameters"
}
```

---

### 6. Notificaciones WebSocket (Recibidas)

Las notificaciones se envían automáticamente cuando:
1. Se crea un nuevo reporte (ReportCreated)
2. Se actualiza el estado de un reporte (StatusUpdated)

**Mensaje: ReportCreated** (Para Autoridades/Admins):
```json
{
  "type": "ReportCreated",
  "timestamp": "2025-11-16T10:30:00.000Z",
  "message": "Nuevo reporte de urgencia ALTA en tu sector (Mantenimiento)",
  "data": {
    "report_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "urgencia": "ALTA"
  }
}
```

**Mensaje: StatusUpdated** (Para Estudiante autor):
```json
{
  "type": "StatusUpdated",
  "timestamp": "2025-11-16T10:45:00.000Z",
  "message": "Tu reporte ha sido actualizado: Estado del reporte actualizado a ATENDIENDO",
  "data": {
    "report_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "urgencia": "ALTA"
  }
}
```

**Mensaje: StatusUpdated** (Para Autoridades del mismo sector):
```json
{
  "type": "StatusUpdated",
  "timestamp": "2025-11-16T11:00:00.000Z",
  "message": "Reporte actualizado en tu sector: Estado del reporte actualizado a RESUELTO",
  "data": {
    "report_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "urgencia": "ALTA"
  }
}
```

**Lógica de Filtrado**:

| Evento | Rol | Condición | Recibe Notificación |
|--------|-----|-----------|-------------------|
| ReportCreated | student | Cualquiera | ❌ No |
| ReportCreated | authority | sector == report.sector | ✅ Sí |
| ReportCreated | admin | Siempre | ✅ Sí |
| StatusUpdated | student | user_id == report.author_id | ✅ Sí (solo su reporte) |
| StatusUpdated | authority | sector == report.sector | ✅ Sí |
| StatusUpdated | admin | Siempre | ✅ Sí |

---

## 🗂️ Estructura de Datos

### Usuario (t_usuarios)
```json
{
  "id": "uuid",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "role": "student" | "authority" | "admin",
  "password": "sha256_hash",
  "DNI": "string",
  "cellphone": "string",
  "registration_date": "iso_timestamp",
  "data_student": {
    "career": "string",
    "cycle": number,
    "code": number
  },
  "data_authority": {
    "sector": "string",
    "charge": "string",
    "notifications_urgency": ["string"]
  }
}
```

### Reporte (t_reportes)
```json
{
  "id_reporte": "uuid",
  "lugar": {
    "id": "uuid",
    "nombre": "string",
    "type": "string",
    "tower": "string",
    "floor": number
  },
  "descripcion": "string",
  "fecha_hora": "iso_timestamp",
  "urgencia": "BAJA" | "MEDIA" | "ALTA",
  "estado": "PENDIENTE" | "ATENDIENDO" | "RESUELTO",
  "author_id": "uuid",
  "assigned_to": "uuid | null",
  "assigned_sector": "string",
  "created_at": "iso_timestamp",
  "updated_at": "iso_timestamp",
  "resolved_at": "iso_timestamp | null",
  "image_url": "https://bucket.s3.amazonaws.com/reports/uuid.jpg?X-Amz-..." // Pre-signed URL válida 1 hora
}
```

### Lugar (t_lugares)
```json
{
  "id": "uuid",
  "name": "string",
  "type": "baño" | "aula" | "laboratorio" | "auditorio" | "estacionamiento" | "patio" | "cafeteria" | ...,
  "tower": "string",
  "floor": number,
  "location": {
    "latitude": number,
    "longitude": number
  }
}
```

### Conexión WebSocket (t_connections)
```json
{
  "connectionId": "string",
  "user_id": "uuid",
  "user_role": "student" | "authority" | "admin",
  "user_email": "string",
  "connected_at": "iso_timestamp"
}
```

---

## 🔄 Mapeo de Sectores

El sistema asigna automáticamente el sector según el tipo de lugar:

| Tipo de Lugar | Sector Asignado |
|---------------|-----------------|
| baño | Mantenimiento |
| aula | Mantenimiento |
| laboratorio | Mantenimiento |
| auditorio | Mantenimiento |
| sala_sum | Mantenimiento |
| estacionamiento | Seguridad |
| entrada | Seguridad |
| patio | Limpieza |
| jardin | Limpieza |
| cafeteria | Servicios |
| biblioteca | Servicios |
| otro | General |

---

## 🧪 Ejemplos de Flujos Completos

### Flujo 1: Estudiante reporta incidencia

```bash
# 1. Login
curl -X POST https://kmstbjfbm9.execute-api.us-east-1.amazonaws.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@utec.edu.pe",
    "password": "student123"
  }'

# Response: {"token": "eyJ...", ...}

# 2. Crear reporte
curl -X POST https://kmstbjfbm9.execute-api.us-east-1.amazonaws.com/dev/reports/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "lugar_id": "550e8400-e29b-41d4-a716-446655440002",
    "urgencia": "ALTA",
    "descripcion": "Fuga de agua grave"
  }'

# Response: {"report": {...}, ...}
# → EventBridge dispara notificación a autoridades de Mantenimiento
```

### Flujo 2: Autoridad actualiza reporte

```bash
# 1. Login como autoridad
curl -X POST https://kmstbjfbm9.execute-api.us-east-1.amazonaws.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "roberto.sanchez@utec.edu.pe",
    "password": "authority123"
  }'

# 2. Actualizar estado
curl -X POST https://kmstbjfbm9.execute-api.us-east-1.amazonaws.com/dev/reports/update-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "id_reporte": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "estado": "ATENDIENDO",
    "comentario": "Personal enviado al lugar"
  }'

# Response: {"report": {...}, ...}
# → EventBridge dispara notificación al estudiante autor
```

---

## 🔐 Seguridad

### Autenticación JWT
- **Algoritmo**: HS256
- **Expiración**: 7 días
- **Payload**:
  ```json
  {
    "user_id": "uuid",
    "email": "string",
    "role": "string",
    "exp": timestamp,
    "iat": timestamp
  }
  ```

### Hash de Contraseñas
- **Algoritmo**: SHA-256
- Las contraseñas nunca se almacenan en texto plano

### Validaciones
- Todos los endpoints protegidos validan el token JWT
- Se verifica que el usuario exista en la BD
- Se valida el rol antes de permitir acciones específicas
- Las contraseñas se hashean automáticamente

---

## ❌ Códigos de Error

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Parámetros inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos para esta acción |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: email ya existe) |
| 500 | Internal Server Error - Error del servidor |

---

¡Documentación completa actualizada! 🎉
