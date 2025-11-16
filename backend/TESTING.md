# Datos de prueba para UTEC Alerta

## Ejemplo de lugares (t_lugares)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Baño torre 1 piso 3",
    "type": "baño",
    "tower": "T1",
    "floor": 3
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Aula A101",
    "type": "aula",
    "tower": "T1",
    "floor": 1
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Laboratorio de Cómputo",
    "type": "laboratorio",
    "tower": "T2",
    "floor": 2
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "name": "Auditorio Principal",
    "type": "auditorio",
    "tower": "T3",
    "floor": 1
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "name": "Estacionamiento Norte",
    "type": "estacionamiento",
    "tower": "",
    "floor": 0
  }
]
```

## Script para insertar lugares en DynamoDB

```python
import boto3
import json

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('t_lugares')

lugares = [
    {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Baño torre 1 piso 3",
        "type": "baño",
        "tower": "T1",
        "floor": 3
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Aula A101",
        "type": "aula",
        "tower": "T1",
        "floor": 1
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "Laboratorio de Cómputo",
        "type": "laboratorio",
        "tower": "T2",
        "floor": 2
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "name": "Auditorio Principal",
        "type": "auditorio",
        "tower": "T3",
        "floor": 1
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "name": "Estacionamiento Norte",
        "type": "estacionamiento",
        "tower": "",
        "floor": 0
    }
]

for lugar in lugares:
    table.put_item(Item=lugar)
    print(f"Insertado: {lugar['name']}")
```

## Ejemplos de requests

### 1. Registrar un estudiante

```bash
curl -X POST https://YOUR_API_ENDPOINT/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "María",
    "last_name": "García",
    "email": "maria.garcia@utec.edu.pe",
    "password": "student123",
    "role": "student",
    "DNI": "72345678",
    "cellphone": "987654321",
    "data_student": {
      "career": "Ingeniería de Software",
      "cycle": 5,
      "code": 202010456
    }
  }'
```

### 2. Registrar una autoridad

```bash
curl -X POST https://YOUR_API_ENDPOINT/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Carlos",
    "last_name": "Rodríguez",
    "email": "carlos.rodriguez@utec.edu.pe",
    "password": "authority123",
    "role": "authority",
    "DNI": "12345678",
    "cellphone": "987123456",
    "data_authority": {
      "sector": "Mantenimiento",
      "charge": "Jefe de Mantenimiento",
      "notifications_urgency": ["MEDIA", "ALTA"]
    }
  }'
```

### 3. Login

```bash
curl -X POST https://YOUR_API_ENDPOINT/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.garcia@utec.edu.pe",
    "password": "student123"
  }'
```

Guarda el token JWT que retorna para usarlo en las siguientes requests.

### 4. Crear un reporte (como estudiante)

```bash
# Reemplaza YOUR_TOKEN con el token JWT del login
curl -X POST https://YOUR_API_ENDPOINT/reports/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "lugar_id": "550e8400-e29b-41d4-a716-446655440001",
    "urgencia": "ALTA",
    "descripcion": "Hay una fuga de agua en el baño del tercer piso de la torre 1. El agua está saliendo del lavabo y está inundando el piso."
  }'
```

### 5. Actualizar estado de reporte (como autoridad)

```bash
# Reemplaza YOUR_TOKEN con el token JWT de la autoridad
# Reemplaza REPORT_ID con el id del reporte creado
curl -X POST https://YOUR_API_ENDPOINT/reports/update-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id_reporte": "REPORT_ID",
    "estado": "ATENDIENDO",
    "comentario": "Personal de mantenimiento ha sido notificado y está en camino"
  }'
```

### 6. Marcar reporte como resuelto

```bash
curl -X POST https://YOUR_API_ENDPOINT/reports/update-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id_reporte": "REPORT_ID",
    "estado": "RESUELTO",
    "comentario": "La fuga fue reparada exitosamente"
  }'
```

## Conexión WebSocket

```javascript
// En tu frontend (JavaScript)
const token = 'YOUR_JWT_TOKEN';
const wsUrl = `wss://YOUR_WEBSOCKET_ENDPOINT?token=${token}`;

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('WebSocket conectado');
};

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Notificación recibida:', notification);
  
  // Mostrar notificación al usuario
  if (notification.type === 'ReportCreated') {
    alert(`Nuevo reporte: ${notification.message}`);
  } else if (notification.type === 'StatusUpdated') {
    alert(`Actualización: ${notification.message}`);
  }
};

ws.onerror = (error) => {
  console.error('Error WebSocket:', error);
};

ws.onclose = () => {
  console.log('WebSocket desconectado');
};
```

## Flujo de trabajo completo

### Para estudiantes:

1. **Registro**: POST /auth/register con rol "student"
2. **Login**: POST /auth/login → Guarda el token
3. **Conectar WebSocket**: wss://...?token=JWT_TOKEN
4. **Crear reporte**: POST /reports/create con el token
5. **Recibir notificaciones**: Escuchar mensajes del WebSocket cuando las autoridades actualicen el estado

### Para autoridades:

1. **Registro/Login**: Como autoridad
2. **Conectar WebSocket**: wss://...?token=JWT_TOKEN
3. **Recibir notificaciones**: Cuando se crean nuevos reportes en su sector
4. **Actualizar estado**: POST /reports/update-status
5. **El estudiante recibe notificación** de la actualización automáticamente

## Notas importantes

- Los tokens JWT expiran en 7 días
- Las imágenes deben enviarse en formato base64
- El sistema determina automáticamente el sector según el tipo de lugar:
  - baño, aula, laboratorio, auditorio, sala_sum → Mantenimiento
  - estacionamiento, entrada → Seguridad
  - patio, jardin → Limpieza
  - cafeteria, biblioteca → Servicios
  - otros → General
