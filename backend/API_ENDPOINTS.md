# 📋 API Endpoints - UTEC Alerta

**Sistema de Reportes de Incidencias para UTEC**  
**Fecha:** 16 de Noviembre 2025  
**Versión:** 1.0

---

## 🔐 Autenticación

Todos los endpoints (excepto `/auth/*`) requieren JWT en el header:
```
Authorization: Bearer <token>
```

---

## 📊 Endpoints Actuales (Implementados)

### **🔓 Autenticación Pública**

#### `POST /auth/register`
**Descripción:** Registrar nuevo usuario  
**Acceso:** Público  
**Body:**
```json
{
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan.perez@utec.edu.pe",
  "password": "SecurePass123",
  "role": "student|authority|admin",
  "DNI": "72345678",
  "cellphone": "987654321",
  "data_student": {
    "career": "Ingeniería de Sistemas",
    "code": "U202012345"
  }
}
```
**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "juan.perez@utec.edu.pe",
    "role": "student",
    "first_name": "Juan",
    "last_name": "Pérez"
  }
}
```

---

#### `POST /auth/login`
**Descripción:** Iniciar sesión  
**Acceso:** Público  
**Body:**
```json
{
  "email": "juan.perez@utec.edu.pe",
  "password": "SecurePass123"
}
```
**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "juan.perez@utec.edu.pe",
    "role": "student",
    "first_name": "Juan",
    "last_name": "Pérez",
    "data_student": {
      "career": "Ingeniería de Sistemas",
      "code": "U202012345"
    }
  }
}
```

---

### **📝 Reportes (Estudiantes)**

#### `POST /reports/create`
**Descripción:** Crear reporte de incidencia  
**Acceso:** Solo `student`  
**Body:**
```json
{
  "lugar_id": "uuid",
  "urgencia": "BAJA|MEDIA|ALTA",
  "descripcion": "Descripción del problema",
  "image": "base64_string_opcional"
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
      "nombre": "Baño Torre 1 Piso 3",
      "type": "baño",
      "tower": "T1",
      "floor": 3
    },
    "created_at": "2025-11-16T10:30:00Z"
  }
}
```

---

### **🔄 Actualización de Estado (Autoridades)**

#### `POST /reports/update-status`
**Descripción:** Actualizar estado del reporte  
**Acceso:** Solo `authority` y `admin`  
**Body:**
```json
{
  "id_reporte": "uuid",
  "estado": "PENDIENTE|ATENDIENDO|RESUELTO",
  "comentario": "Opcional: Personal en camino"
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
    "assigned_to": "uuid_autoridad"
  }
}
```

---

### **🌐 WebSocket**

#### `WS $connect`
**Descripción:** Conectar al WebSocket con JWT  
**Query Parameter:** `?token=jwt_token`

#### `WS $disconnect`
**Descripción:** Desconectar del WebSocket

---

## 🆕 Endpoints Propuestos por Rol

### **👨‍🎓 ESTUDIANTE (Student)**

#### `GET /reports/my-reports`
**Descripción:** Listar mis reportes con paginación  
**Acceso:** `student`  
**Query Params:**
```
?page=1&size=20&estado=PENDIENTE&urgencia=ALTA&orderBy=created_at&order=desc
```
**Response:**
```json
{
  "reports": [
    {
      "id_reporte": "uuid",
      "lugar": {
        "nombre": "Baño T1 Piso 3",
        "type": "baño",
        "tower": "T1",
        "floor": 3
      },
      "descripcion": "Fuga de agua",
      "urgencia": "ALTA",
      "estado": "ATENDIENDO",
      "assigned_sector": "Mantenimiento",
      "created_at": "2025-11-16T10:30:00Z",
      "updated_at": "2025-11-16T10:45:00Z",
      "image_url": "https://bucket.s3.amazonaws.com/reports/abc-123.jpg?X-Amz-Algorithm=..."
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 20,
    "total_items": 45,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

---

#### `GET /reports/{id_reporte}`
**Descripción:** Ver detalle de un reporte específico  
**Acceso:** `student` (solo sus reportes), `authority`, `admin`  
**Response:**
```json
{
  "id_reporte": "uuid",
  "lugar": {
    "id": "uuid",
    "nombre": "Baño Torre 1 Piso 3",
    "type": "baño",
    "tower": "T1",
    "floor": 3
  },
  "descripcion": "Fuga de agua grave",
  "urgencia": "ALTA",
  "estado": "RESUELTO",
  "assigned_sector": "Mantenimiento",
  "author_id": "uuid",
  "assigned_to": "uuid_autoridad",
  "created_at": "2025-11-16T10:30:00Z",
  "updated_at": "2025-11-16T12:00:00Z",
  "resolved_at": "2025-11-16T12:00:00Z",
  "image_url": "https://bucket.s3.amazonaws.com/reports/xyz-456.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Expires=3600"
}
```

---

#### `GET /places`
**Descripción:** Listar lugares disponibles para reportar  
**Acceso:** Todos  
**Query Params:**
```
?page=1&size=50&tower=T1&floor=3&type=baño&term=baño
```
**Response:**
```json
{
  "places": [
    {
      "id": "uuid",
      "name": "Baño Torre 1 Piso 3",
      "type": "baño",
      "tower": "T1",
      "floor": 3
    },
    {
      "id": "uuid",
      "name": "Aula A301",
      "type": "aula",
      "tower": "T1",
      "floor": 3
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 50,
    "total_items": 120,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

---

#### `GET /dashboard/public-stats`
**Descripción:** Estadísticas públicas (transparencia)  
**Acceso:** Todos  
**Query Params:**
```
?period=week|month|year
```
**Response:**
```json
{
  "period": "week",
  "summary": {
    "total_reportes": 125,
    "resueltos": 102,
    "pendientes": 15,
    "en_atencion": 8
  },
  "by_urgencia": {
    "ALTA": 25,
    "MEDIA": 50,
    "BAJA": 50
  },
  "by_sector": {
    "Mantenimiento": 45,
    "Seguridad": 30,
    "Limpieza": 25,
    "Servicios": 25
  },
  "avg_resolution_time": "2.5 horas"
}
```

---

### **👷 AUTORIDAD (Authority)**

#### `GET /reports`
**Descripción:** Listar todos los reportes (filtrado por sector si aplica)  
**Acceso:** `authority`, `admin`  
**Query Params:**
```
?page=1&size=20&estado=PENDIENTE&urgencia=ALTA&sector=Mantenimiento&tower=T1&floor=3&term=fuga&orderBy=urgencia&order=desc
```
**Response:**
```json
{
  "reports": [
    {
      "id_reporte": "uuid",
      "lugar": {
        "nombre": "Baño T1 Piso 3",
        "type": "baño",
        "tower": "T1",
        "floor": 3
      },
      "descripcion": "Fuga de agua grave",
      "urgencia": "ALTA",
      "estado": "PENDIENTE",
      "assigned_sector": "Mantenimiento",
      "author_id": "uuid",
      "author_name": "Juan Pérez",
      "assigned_to": null,
      "created_at": "2025-11-16T10:30:00Z",
      "updated_at": "2025-11-16T10:30:00Z",
      "image_url": "https://bucket.s3.amazonaws.com/reports/def-789.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Expires=3600"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 20,
    "total_items": 85,
    "total_pages": 5,
    "has_next": true,
    "has_previous": false
  },
  "filters_applied": {
    "estado": "PENDIENTE",
    "urgencia": "ALTA",
    "sector": "Mantenimiento"
  }
}
```

---

#### `GET /reports/assigned-to-me`
**Descripción:** Reportes asignados a la autoridad  
**Acceso:** `authority`  
**Query Params:** Mismos que `/reports`  
**Response:** Mismo formato que `/reports`

---

#### `POST /reports/{id_reporte}/take`
**Descripción:** Auto-asignar un reporte pendiente  
**Acceso:** `authority`  
**Body:**
```json
{
  "comentario": "Tomando el reporte, personal en camino"
}
```
**Response:**
```json
{
  "message": "Report assigned successfully",
  "report": {
    "id_reporte": "uuid",
    "estado": "ATENDIENDO",
    "assigned_to": "uuid_autoridad",
    "updated_at": "2025-11-16T10:50:00Z"
  }
}
```

---

#### `GET /dashboard/my-sector-stats`
**Descripción:** Estadísticas del sector de la autoridad  
**Acceso:** `authority`  
**Response:**
```json
{
  "sector": "Mantenimiento",
  "period": "week",
  "summary": {
    "total_asignados": 45,
    "resueltos": 38,
    "pendientes": 5,
    "en_atencion": 2
  },
  "my_reports": {
    "total": 12,
    "resueltos": 10,
    "pendientes": 2
  },
  "avg_resolution_time": "2.1 horas",
  "hot_locations": [
    {
      "lugar": "Baño T1 Piso 3",
      "incidents": 8,
      "last_incident": "2025-11-16T10:30:00Z"
    }
  ]
}
```

---

### **👨‍💼 ADMINISTRADOR (Admin)**

#### `GET /reports` (versión completa)
**Descripción:** Listar TODOS los reportes sin restricciones  
**Acceso:** `admin`  
**Query Params:**
```
?page=1&size=100&estado=*&sector=*&urgencia=*&author_id=uuid&assigned_to=uuid&date_from=2025-11-01&date_to=2025-11-16&term=fuga
```
**Response:** Mismo formato que autoridades pero sin filtros de sector

---

#### `GET /dashboard/admin-stats`
**Descripción:** Dashboard completo con todas las métricas  
**Acceso:** `admin`  
**Query Params:**
```
?period=week|month|year&sector=*
```
**Response:**
```json
{
  "period": "week",
  "summary": {
    "total_reportes": 125,
    "resueltos": 102,
    "pendientes": 15,
    "en_atencion": 8,
    "tasa_resolucion": 81.6
  },
  "by_urgencia": {
    "ALTA": 25,
    "MEDIA": 50,
    "BAJA": 50
  },
  "by_sector": {
    "Mantenimiento": {
      "total": 45,
      "resueltos": 38,
      "pendientes": 5,
      "avg_time": "2.1h"
    },
    "Seguridad": {
      "total": 30,
      "resueltos": 28,
      "pendientes": 2,
      "avg_time": "1.5h"
    }
  },
  "by_estado": {
    "PENDIENTE": 15,
    "ATENDIENDO": 8,
    "RESUELTO": 102
  },
  "performance_metrics": {
    "avg_resolution_time": "2.5 horas",
    "fastest_sector": "Seguridad",
    "slowest_sector": "Mantenimiento"
  },
  "daily_trend": [
    {"date": "2025-11-09", "created": 12, "resolved": 10},
    {"date": "2025-11-10", "created": 15, "resolved": 14},
    {"date": "2025-11-11", "created": 18, "resolved": 15}
  ],
  "top_locations": [
    {
      "lugar": "Baño T1 Piso 3",
      "type": "baño",
      "incidents": 15,
      "sector": "Mantenimiento"
    }
  ],
  "authority_performance": [
    {
      "authority_id": "uuid",
      "name": "Roberto Sánchez",
      "sector": "Mantenimiento",
      "total_assigned": 25,
      "resolved": 23,
      "avg_time": "2.0h"
    }
  ]
}
```

---

#### `POST /reports/{id_reporte}/assign`
**Descripción:** Asignar reporte manualmente a una autoridad  
**Acceso:** `admin`  
**Body:**
```json
{
  "assigned_to": "uuid_autoridad",
  "estado": "ATENDIENDO"
}
```
**Response:**
```json
{
  "message": "Report assigned successfully",
  "report": {
    "id_reporte": "uuid",
    "assigned_to": "uuid_autoridad",
    "assigned_sector": "Mantenimiento",
    "estado": "ATENDIENDO",
    "updated_at": "2025-11-16T11:00:00Z"
  }
}
```

---

#### `GET /users`
**Descripción:** Listar usuarios del sistema  
**Acceso:** `admin`  
**Query Params:**
```
?page=1&size=50&role=authority&term=roberto&sector=Mantenimiento
```
**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "first_name": "Roberto",
      "last_name": "Sánchez",
      "email": "roberto.sanchez@utec.edu.pe",
      "role": "authority",
      "DNI": "72345678",
      "cellphone": "987654321",
      "data_authority": {
        "sector": "Mantenimiento",
        "charge": "Jefe de Mantenimiento"
      },
      "registration_date": "2025-11-01T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 50,
    "total_items": 85,
    "total_pages": 2,
    "has_next": true,
    "has_previous": false
  }
}
```

---

#### `POST /places`
**Descripción:** Crear nuevo lugar en el sistema  
**Acceso:** `admin`  
**Body:**
```json
{
  "name": "Laboratorio L301",
  "type": "laboratorio",
  "tower": "T3",
  "floor": 3
}
```
**Response:**
```json
{
  "message": "Place created successfully",
  "place": {
    "id": "uuid",
    "name": "Laboratorio L301",
    "type": "laboratorio",
    "tower": "T3",
    "floor": 3
  }
}
```

---

#### `PUT /places/{id}`
**Descripción:** Actualizar datos de un lugar  
**Acceso:** `admin`  
**Body:**
```json
{
  "name": "Laboratorio L301 - Actualizado",
  "type": "laboratorio",
  "tower": "T3",
  "floor": 3
}
```

---

#### `DELETE /places/{id}`
**Descripción:** Eliminar un lugar (solo si no tiene reportes)  
**Acceso:** `admin`  
**Response:**
```json
{
  "message": "Place deleted successfully"
}
```

---

## 📊 Estructura de Datos

### **Usuario (t_usuarios)**
```json
{
  "id": "uuid",
  "first_name": "string",
  "last_name": "string",
  "email": "string (único)",
  "password": "string (hash SHA-256)",
  "role": "student|authority|admin",
  "DNI": "string",
  "cellphone": "string",
  "registration_date": "ISO timestamp",
  
  // Si role = student
  "data_student": {
    "career": "string",
    "code": "string"
  },
  
  // Si role = authority
  "data_authority": {
    "sector": "Mantenimiento|Seguridad|Limpieza|Servicios",
    "charge": "string"
  }
}
```

---

### **Reporte (t_reportes)**
```json
{
  "id_reporte": "uuid",
  "lugar": {
    "id": "uuid",
    "nombre": "string",
    "type": "baño|aula|laboratorio|...",
    "tower": "T1|T2|T3|T4",
    "floor": 0-10
  },
  "descripcion": "string",
  "fecha_hora": "ISO timestamp",
  "urgencia": "BAJA|MEDIA|ALTA",
  "estado": "PENDIENTE|ATENDIENDO|RESUELTO",
  "author_id": "uuid",
  "assigned_to": "uuid|null",
  "assigned_sector": "Mantenimiento|Seguridad|Limpieza|Servicios|General",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "resolved_at": "ISO timestamp|null",
  "image_url": "https://bucket.s3.amazonaws.com/reports/uuid.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Expires=3600|null"
}
```

---

## 🖼️ Gestión de Imágenes con Pre-Signed URLs

**Importante:** El campo `image_url` retorna URLs HTTP firmadas de S3 con las siguientes características:

### ✅ Formato de URL
```
https://bucket.s3.amazonaws.com/reports/uuid.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Expires=3600
```

### 🔐 Características de Seguridad
- **Expiración:** 1 hora (3600 segundos)
- **Acceso temporal:** URL válida solo durante el tiempo de expiración
- **Sin credenciales:** No requiere autenticación adicional para acceder
- **Consumo frontend:** Directamente usable en `<img src="url">` o fetch/axios

### 📝 Notas Importantes
1. **Almacenamiento interno:** DynamoDB guarda claves S3 (`reports/uuid.jpg`)
2. **Transformación dinámica:** Lambda genera URLs HTTP al momento de consultar
3. **Renovación:** Cada GET request genera nueva URL firmada
4. **Frontend:** Debe usar la URL tal cual viene en el response (no modificar)

### 💡 Ejemplo de Uso en Frontend
```javascript
// Response de API
const report = await fetch('/reports/123', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Usar directamente en imagen
<img src={report.image_url} alt="Reporte" />

// La URL expira en 1 hora, refrescar si es necesario
```

---

### **Lugar (t_lugares)**
```json
{
  "id": "uuid",
  "name": "string",
  "type": "baño|aula|laboratorio|auditorio|sala_sum|estacionamiento|entrada|patio|jardin|cafeteria|biblioteca",
  "tower": "T1|T2|T3|T4|''",
  "floor": 0-10
}
```

---

### **Conexión WebSocket (t_connections)**
```json
{
  "connectionId": "string",
  "user_id": "uuid",
  "role": "student|authority|admin",
  "connected_at": "ISO timestamp"
}
```

---

## 🔄 Sistema de Paginación Estándar

**Query Parameters:**
```typescript
{
  page?: number,        // Página actual (default: 1, min: 1)
  size?: number,        // Items por página (default: 20, max: 100)
  orderBy?: string,     // Campo para ordenar
  order?: 'asc'|'desc'  // Dirección del orden (default: 'desc')
}
```

**Response Structure:**
```typescript
{
  items: Array<T>,      // Array de items (nombre puede variar: reports, places, users)
  pagination: {
    current_page: number,
    page_size: number,
    total_items: number,
    total_pages: number,
    has_next: boolean,
    has_previous: boolean
  }
}
```

---

## 🎯 Mapeo de Sectores por Tipo de Lugar

| Tipo de Lugar | Sector Asignado |
|--------------|-----------------|
| baño, aula, laboratorio, auditorio, sala_sum | Mantenimiento |
| estacionamiento, entrada | Seguridad |
| patio, jardin | Limpieza |
| cafeteria, biblioteca | Servicios |
| Otros | General |

---

## 🔔 Sistema de Notificaciones

### **EventBridge Events**

**1. ReportCreated**
```json
{
  "Source": "utec-alerta.reports",
  "DetailType": "ReportCreated",
  "Detail": {
    "report_id": "uuid",
    "urgencia": "ALTA",
    "lugar": "Baño T1 Piso 3",
    "sector": "Mantenimiento",
    "author_id": "uuid",
    "timestamp": "2025-11-16T10:30:00Z",
    "message": "Nuevo reporte de urgencia ALTA en Baño T1 Piso 3"
  }
}
```

**2. StatusUpdated**
```json
{
  "Source": "utec-alerta.reports",
  "DetailType": "StatusUpdated",
  "Detail": {
    "report_id": "uuid",
    "old_status": "PENDIENTE",
    "new_status": "ATENDIENDO",
    "urgencia": "ALTA",
    "lugar": "Baño T1 Piso 3",
    "sector": "Mantenimiento",
    "updated_by": "uuid_autoridad",
    "author_id": "uuid_estudiante",
    "message": "Estado actualizado a ATENDIENDO",
    "timestamp": "2025-11-16T10:45:00Z"
  }
}
```

### **WebSocket Notifications**

Las notificaciones se envían vía WebSocket a:
- **Estudiantes**: Cuando su reporte cambia de estado
- **Autoridades**: Cuando hay nuevo reporte en su sector o reportes asignados cambian
- **Admins**: Todos los eventos

---

## 📊 Apache Airflow Analytics

### `GET /reports/airflow/analytics`
**Descripción:** Dashboard de métricas de Apache Airflow ML  
**Acceso:** admin, authority (filtrado por sector)  
**Query Parameters:**
- `period`: today|week|month (opcional, default: week)
- `sector`: Filtro por sector (opcional para admin, ignorado para authority)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "period": "week",
  "date_range": {
    "from": "2025-11-09T00:00:00Z",
    "to": "2025-11-16T12:00:00Z"
  },
  "airflow_processing": {
    "total_reports": 150,
    "processed_by_ml": 145,
    "pending_classification": 5,
    "processing_rate": 96.7,
    "avg_processing_time_minutes": 3.2
  },
  "ml_classification": {
    "avg_confidence_score": 0.68,
    "confidence_distribution": {
      "high": 82,
      "medium": 51,
      "low": 12
    }
  },
  "urgency_reclassification": {
    "total_reclassified": 47,
    "reclassification_rate": 32.4,
    "changes": {
      "elevated": 35,
      "reduced": 12,
      "elevation_rate": 74.5
    },
    "by_original_urgency": {
      "BAJA_to_MEDIA": 15,
      "BAJA_to_ALTA": 8,
      "MEDIA_to_ALTA": 12,
      "MEDIA_to_BAJA": 7,
      "ALTA_to_MEDIA": 5
    }
  },
  "urgency_comparison": {
    "original": {
      "BAJA": 60,
      "MEDIA": 55,
      "ALTA": 30
    },
    "classified": {
      "BAJA": 52,
      "MEDIA": 58,
      "ALTA": 35
    },
    "impact": "+16% más urgencias ALTA detectadas por ML"
  },
  "automated_notifications": {
    "total_sent": 38,
    "notification_rate": 26.2,
    "by_reason": {
      "high_urgency": 35,
      "high_confidence": 3
    },
    "avg_notification_time_minutes": 4.1
  },
  "top_detected_keywords": [
    {
      "keyword": "robo",
      "count": 15,
      "risk_level": "high"
    },
    {
      "keyword": "fuga",
      "count": 12,
      "risk_level": "medium"
    }
  ],
  "impact_metrics": {
    "reports_prioritized": 35,
    "authorities_notified": 8,
    "avg_response_improvement": "23%"
  }
}
```

**Seguridad:**
- Authority: Solo ve datos de su sector asignado
- Admin: Ve todos los datos (puede filtrar por sector opcionalmente)

---

## 📝 Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o faltante |
| 403 | Forbidden - Sin permisos para la operación |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Recurso duplicado |
| 500 | Internal Server Error - Error del servidor |

---

## 🔒 Permisos por Rol

| Endpoint | Student | Authority | Admin |
|----------|---------|-----------|-------|
| POST /auth/register | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ |
| POST /reports/create | ✅ | ❌ | ❌ |
| POST /reports/update-status | ❌ | ✅ | ✅ |
| GET /reports/my-reports | ✅ | ❌ | ❌ |
| GET /reports (filtrado) | ❌ | ✅ | ✅ |
| GET /reports (completo) | ❌ | ❌ | ✅ |
| GET /reports/{id} | ✅* | ✅ | ✅ |
| POST /reports/{id}/take | ❌ | ✅ | ❌ |
| POST /reports/{id}/assign | ❌ | ❌ | ✅ |
| GET /places | ✅ | ✅ | ✅ |
| POST /places | ❌ | ❌ | ✅ |
| PUT /places/{id} | ❌ | ❌ | ✅ |
| DELETE /places/{id} | ❌ | ❌ | ✅ |
| GET /users | ❌ | ❌ | ✅ |
| GET /dashboard/public-stats | ✅ | ✅ | ✅ |
| GET /dashboard/my-sector-stats | ❌ | ✅ | ❌ |
| GET /dashboard/admin-stats | ❌ | ❌ | ✅ |
| GET /reports/airflow/analytics | ❌ | ✅* | ✅ |

*Estudiantes solo pueden ver sus propios reportes  
**Autoridades solo ven métricas de su sector asignado

---

**Documento generado:** 16 de Noviembre 2025  
**Mantenido por:** Equipo UTEC Alerta
