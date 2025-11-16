# 🚀 Endpoints Futuros y Mejoras - UTEC Alerta

> **Documento de Planificación para Desarrollo Futuro**  
> **Fecha de Creación**: 16 de Noviembre 2025  
> **Versión**: 1.0

---

## 📑 Tabla de Contenidos

1. [Endpoints Actuales (Ya Implementados)](#endpoints-actuales-ya-implementados)
2. [Endpoints Nuevos Propuestos](#endpoints-nuevos-propuestos)
3. [Mejoras de Base de Datos](#mejoras-de-base-de-datos)
4. [Integración con Apache Airflow](#integración-con-apache-airflow)
5. [Sistema de Paginación Estándar](#sistema-de-paginación-estándar)
6. [Arquitectura de Búsqueda](#arquitectura-de-búsqueda)
7. [Roadmap de Implementación](#roadmap-de-implementación)

---

## 🟢 Endpoints Actuales (Ya Implementados)

### **Autenticación**
- ✅ `POST /auth/register` - Registrar usuario
- ✅ `POST /auth/login` - Iniciar sesión

### **Reportes (Escritura)**
- ✅ `POST /reports/create` - Crear reporte (solo estudiantes)
- ✅ `POST /reports/update-status` - Actualizar estado (solo autoridades/admin)

### **WebSocket**
- ✅ `WS $connect` - Conectar WebSocket con JWT
- ✅ `WS $disconnect` - Desconectar WebSocket

### **Notificaciones Automáticas**
- ✅ EventBridge `ReportCreated` → `sendNotify.handler`
- ✅ EventBridge `StatusUpdated` → `sendNotify.handler`

---

## 🆕 Endpoints Nuevos Propuestos

### **📊 FASE 1 - Crítico (1-2 semanas)**

#### **1. GET /reports**
**Prioridad**: 🔴 ALTA  
**Descripción**: Endpoint principal para listar TODOS los reportes con paginación, filtros y búsqueda.  
**Roles**: Todos (Student, Authority, Admin)  
**Lambda**: `getReports.handler` (NUEVO)

**Query Parameters**:
```typescript
{
  // Paginación
  page?: number,              // Número de página (default: 1)
  size?: number,              // Items por página (default: 20, max: 100)
  
  // Búsqueda
  term?: string,              // Búsqueda en descripción, lugar, autor
  
  // Ordenamiento
  orderBy?: string,           // created_at|updated_at|urgencia|estado
  order?: string,             // asc|desc (default: desc)
  
  // Filtros
  estado?: string,            // PENDIENTE|ATENDIENDO|RESUELTO
  urgencia?: string,          // BAJA|MEDIA|ALTA
  sector?: string,            // Mantenimiento|Seguridad|Limpieza|Servicios
  tower?: string,             // T1|T2|T3|T4
  floor?: number,             // 0-10
  author_id?: string,         // UUID del autor
  assigned_to?: string,       // UUID de autoridad
  date_from?: string,         // ISO date
  date_to?: string            // ISO date
}
```

**Ejemplo de Request**:
```bash
GET /reports?page=1&size=20&term=fuga&estado=PENDIENTE&orderBy=urgencia&order=desc
```

**Respuesta**:
```json
{
  "reports": [
    {
      "id_reporte": "uuid",
      "lugar": {
        "id": "uuid",
        "nombre": "Baño Torre 1 Piso 3",
        "type": "baño",
        "tower": "T1",
        "floor": 3
      },
      "descripcion": "Fuga de agua en lavabo",
      "urgencia": "ALTA",
      "estado": "PENDIENTE",
      "author": {
        "id": "uuid",
        "name": "Juan Pérez",
        "email": "juan.perez@utec.edu.pe",
        "role": "student"
      },
      "assigned_to": null,
      "assigned_sector": "Mantenimiento",
      "created_at": "2025-11-16T10:30:00Z",
      "updated_at": "2025-11-16T10:30:00Z",
      "resolved_at": null,
      "image_url": "https://...",
      "comments_count": 0,
      "rating": null
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 20,
    "total_items": 145,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  },
  "filters_applied": {
    "term": "fuga",
    "estado": "PENDIENTE",
    "orderBy": "urgencia",
    "order": "desc"
  },
  "summary": {
    "total_in_query": 12,
    "by_estado": {
      "PENDIENTE": 5,
      "ATENDIENDO": 4,
      "RESUELTO": 3
    },
    "by_urgencia": {
      "ALTA": 6,
      "MEDIA": 4,
      "BAJA": 2
    }
  }
}
```

**Implementación**:
```python
# functions/getReports.py
import boto3
from boto3.dynamodb.conditions import Attr, Key
from utils.jwt_validator import validate_token, extract_token_from_event, create_response
from decimal import Decimal

def handler(event, context):
    # Validar JWT
    token = extract_token_from_event(event)
    if not token:
        return create_response(401, {'error': 'Missing authentication token'})
    
    token_data = validate_token(token)
    
    # Extraer query parameters
    params = event.get('queryStringParameters', {}) or {}
    
    page = int(params.get('page', 1))
    size = min(int(params.get('size', 20)), 100)
    term = params.get('term', '').lower().strip()
    order_by = params.get('orderBy', 'created_at')
    order = params.get('order', 'desc')
    
    # Filtros opcionales
    filters = {
        'estado': params.get('estado'),
        'urgencia': params.get('urgencia'),
        'sector': params.get('sector'),
        'tower': params.get('tower'),
        'floor': params.get('floor'),
        'author_id': params.get('author_id'),
        'assigned_to': params.get('assigned_to'),
        'date_from': params.get('date_from'),
        'date_to': params.get('date_to')
    }
    
    # Obtener reportes con filtros
    reports = get_filtered_reports(term, filters)
    
    # Ordenar
    reports = sort_reports(reports, order_by, order)
    
    # Calcular paginación
    total_items = len(reports)
    total_pages = (total_items + size - 1) // size
    start = (page - 1) * size
    end = start + size
    paginated_reports = reports[start:end]
    
    # Enriquecer con datos de usuarios
    enriched_reports = enrich_reports_with_users(paginated_reports)
    
    # Calcular resumen
    summary = calculate_summary(reports)
    
    return create_response(200, {
        'reports': enriched_reports,
        'pagination': {
            'current_page': page,
            'page_size': size,
            'total_items': total_items,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_previous': page > 1
        },
        'filters_applied': {k: v for k, v in filters.items() if v},
        'summary': summary
    })
```

---

#### **2. GET /reports/my-reports**
**Prioridad**: 🔴 ALTA  
**Descripción**: Atajo para que estudiantes vean sus propios reportes.  
**Roles**: Student  
**Lambda**: Reutiliza `getReports.handler` con filtro automático

**Equivalente a**: `GET /reports?author_id={user_id_from_token}`

**Query Parameters**: Mismos que `/reports` (page, size, term, orderBy, estado, urgencia, etc.)

---

#### **3. GET /reports/{id_reporte}**
**Prioridad**: 🔴 ALTA  
**Descripción**: Ver detalle completo de un reporte con historial.  
**Roles**: Todos  
**Lambda**: `getReportById.handler` (NUEVO)

**Path Parameter**: `id_reporte` (UUID)

**Respuesta**:
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
  "descripcion": "Fuga de agua grave en el lavabo",
  "urgencia": "ALTA",
  "estado": "ATENDIENDO",
  "author": {
    "id": "uuid",
    "name": "Juan Pérez García",
    "email": "juan.perez@utec.edu.pe",
    "role": "student",
    "data_student": {
      "career": "Ingeniería de Sistemas",
      "code": 202012345
    }
  },
  "assigned_to": {
    "id": "uuid",
    "name": "Roberto Sánchez Morales",
    "sector": "Mantenimiento",
    "charge": "Jefe de Mantenimiento"
  },
  "assigned_sector": "Mantenimiento",
  "created_at": "2025-11-16T10:30:00Z",
  "updated_at": "2025-11-16T10:45:00Z",
  "resolved_at": null,
  "image_url": "https://...",
  
  "history": [
    {
      "id": "uuid",
      "timestamp": "2025-11-16T10:30:00Z",
      "action": "CREATED",
      "user": {
        "id": "uuid",
        "name": "Juan Pérez",
        "role": "student"
      },
      "details": "Reporte creado con urgencia ALTA"
    },
    {
      "id": "uuid",
      "timestamp": "2025-11-16T10:45:00Z",
      "action": "STATUS_CHANGED",
      "user": {
        "id": "uuid",
        "name": "Roberto Sánchez",
        "role": "authority"
      },
      "old_value": "PENDIENTE",
      "new_value": "ATENDIENDO",
      "comment": "Personal en camino"
    }
  ],
  
  "comments": [
    {
      "id": "uuid",
      "user": {
        "name": "Roberto Sánchez",
        "role": "authority"
      },
      "comment": "Personal en camino",
      "timestamp": "2025-11-16T10:45:00Z"
    }
  ],
  
  "rating": null,
  "estimated_resolution_time": "2 horas",
  "time_since_created": "1 hora 30 minutos"
}
```

---

#### **4. GET /dashboard/stats**
**Prioridad**: 🔴 ALTA  
**Descripción**: Estadísticas en tiempo real para el dashboard.  
**Roles**: Todos (transparencia para estudiantes)  
**Lambda**: `getDashboardStats.handler` (NUEVO)

**Query Parameters**:
```typescript
{
  sector?: string,        // Filtrar por sector
  period?: string,        // today|week|month|year|all (default: week)
  date_from?: string,     // ISO date
  date_to?: string        // ISO date
}
```

**Respuesta**:
```json
{
  "period": "week",
  "date_range": {
    "from": "2025-11-09T00:00:00Z",
    "to": "2025-11-16T23:59:59Z"
  },
  "summary": {
    "total_reportes": 125,
    "pendientes": 15,
    "atendiendo": 8,
    "resueltos": 102,
    "pendientes_urgencia_alta": 5
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
  "by_estado": {
    "PENDIENTE": 15,
    "ATENDIENDO": 8,
    "RESUELTO": 102
  },
  "performance_metrics": {
    "avg_resolution_time": "2.5 horas",
    "avg_response_time": "15 minutos",
    "resolution_rate": "81.6%",
    "satisfaction_rating": 4.5
  },
  "daily_trend": [
    {"date": "2025-11-09", "count": 12, "resolved": 10},
    {"date": "2025-11-10", "count": 15, "resolved": 12},
    {"date": "2025-11-11", "count": 18, "resolved": 15}
  ],
  "top_locations": [
    {
      "lugar": "Baño Torre 1 Piso 3",
      "count": 15,
      "trend": "up"
    }
  ]
}
```

---

#### **5. GET /places**
**Prioridad**: 🔴 ALTA  
**Descripción**: Listar lugares disponibles con paginación.  
**Roles**: Todos  
**Lambda**: `getPlaces.handler` (NUEVO)

**Query Parameters**:
```typescript
{
  page?: number,
  size?: number,
  term?: string,          // Buscar por nombre
  orderBy?: string,       // name|tower|floor|type
  order?: string,         // asc|desc
  tower?: string,         // T1|T2|T3|T4
  floor?: number,
  type?: string,          // baño|aula|laboratorio|...
  sector?: string
}
```

**Respuesta**:
```json
{
  "places": [
    {
      "id": "uuid",
      "name": "Baño Torre 1 Piso 3",
      "type": "baño",
      "tower": "T1",
      "floor": 3,
      "sector": "Mantenimiento",
      "total_reports": 15,
      "pending_reports": 2,
      "last_incident": "2025-11-16T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 50,
    "total_items": 12,
    "total_pages": 1,
    "has_next": false,
    "has_previous": false
  }
}
```

---

#### **6. POST /reports/{id_reporte}/comment**
**Prioridad**: 🔴 ALTA  
**Descripción**: Agregar comentarios al reporte.  
**Roles**: Authority, Admin (y Student para sus reportes)  
**Lambda**: `addReportComment.handler` (NUEVO)

**Path Parameter**: `id_reporte` (UUID)

**Body**:
```json
{
  "comment": "Se envió al técnico Juan. Estimado 2 horas."
}
```

**Respuesta**:
```json
{
  "message": "Comment added successfully",
  "comment": {
    "id": "uuid",
    "user": {
      "id": "uuid",
      "name": "Roberto Sánchez",
      "role": "authority"
    },
    "comment": "Se envió al técnico Juan. Estimado 2 horas.",
    "timestamp": "2025-11-16T11:00:00Z"
  }
}
```

**Proceso**:
1. Valida JWT
2. Verifica permisos (autoridad/admin o autor del reporte)
3. Guarda en tabla `t_report_history`
4. Notifica vía WebSocket a usuarios relevantes

---

### **📈 FASE 2 - Importante (2-3 semanas)**

#### **7. GET /reports/{id_reporte}/history**
**Prioridad**: 🟡 MEDIA  
**Descripción**: Ver historial completo de cambios del reporte.  
**Roles**: Todos  
**Lambda**: `getReportHistory.handler` (NUEVO)

**Path Parameter**: `id_reporte` (UUID)

**Respuesta**:
```json
{
  "id_reporte": "uuid",
  "history": [
    {
      "id": "uuid",
      "timestamp": "2025-11-16T10:30:00Z",
      "action": "CREATED",
      "user": {
        "id": "uuid",
        "name": "Juan Pérez",
        "role": "student"
      },
      "details": "Reporte creado con urgencia ALTA"
    },
    {
      "id": "uuid",
      "timestamp": "2025-11-16T10:45:00Z",
      "action": "STATUS_CHANGED",
      "user": {
        "id": "uuid",
        "name": "Roberto Sánchez",
        "role": "authority"
      },
      "old_value": "PENDIENTE",
      "new_value": "ATENDIENDO",
      "comment": "Personal en camino"
    },
    {
      "id": "uuid",
      "timestamp": "2025-11-16T11:00:00Z",
      "action": "COMMENT_ADDED",
      "user": {
        "id": "uuid",
        "name": "Roberto Sánchez",
        "role": "authority"
      },
      "comment": "Técnico llegó al lugar"
    }
  ],
  "total_actions": 3
}
```

---

#### **8. POST /notifications/send-email**
**Prioridad**: 🟡 MEDIA  
**Descripción**: Enviar notificaciones por email vía AWS SES.  
**Trigger**: EventBridge (automático)  
**Lambda**: `sendEmailNotification.handler` (NUEVO)

**Integración**: AWS SES (Simple Email Service)

**Casos de uso**:
- Reporte creado con urgencia ALTA
- Reporte asignado a autoridad
- Reporte resuelto
- Reclasificación de urgencia por Airflow

**Email Template**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>UTEC Alerta - Notificación</title>
</head>
<body>
  <h1>Nuevo Reporte - Urgencia ALTA</h1>
  <p><strong>Lugar:</strong> Baño Torre 1 Piso 3</p>
  <p><strong>Descripción:</strong> Fuga de agua grave</p>
  <p><strong>Sector:</strong> Mantenimiento</p>
  <p><strong>Fecha:</strong> 16/11/2025 10:30</p>
  <a href="https://utec-alerta.com/reports/uuid">Ver Reporte</a>
</body>
</html>
```

---

#### **9. GET /dashboard/heatmap**
**Prioridad**: 🟡 MEDIA  
**Descripción**: Datos para mapa de calor de incidencias.  
**Roles**: Authority, Admin  
**Lambda**: `getHeatmapData.handler` (NUEVO)

**Query Parameters**:
```typescript
{
  period?: string         // week|month|year
}
```

**Respuesta**:
```json
{
  "locations": [
    {
      "lugar_id": "uuid",
      "name": "Baño Torre 1 Piso 3",
      "tower": "T1",
      "floor": 3,
      "incident_count": 15,
      "urgency_distribution": {
        "ALTA": 5,
        "MEDIA": 7,
        "BAJA": 3
      },
      "coordinates": {
        "lat": -12.1234,
        "lng": -77.5678
      }
    }
  ],
  "hot_zones": [
    {
      "area": "Torre 1 - Pisos 2-4",
      "count": 45,
      "main_issue": "Problemas de plomería"
    }
  ]
}
```

---

#### **10. POST /reports/{id_reporte}/assign**
**Prioridad**: 🟡 MEDIA  
**Descripción**: Asignar reporte manualmente a una autoridad específica.  
**Roles**: Admin, Jefe de Sector  
**Lambda**: `assignReport.handler` (NUEVO)

**Path Parameter**: `id_reporte` (UUID)

**Body**:
```json
{
  "assigned_to": "user_id",
  "priority": "high",
  "estimated_time": "2 hours"
}
```

**Respuesta**:
```json
{
  "message": "Report assigned successfully",
  "report": {
    "id_reporte": "uuid",
    "assigned_to": {
      "id": "uuid",
      "name": "Roberto Sánchez",
      "sector": "Mantenimiento"
    },
    "priority": "high",
    "estimated_time": "2 hours"
  }
}
```

---

#### **11. POST /reports/{id_reporte}/rating**
**Prioridad**: 🟡 MEDIA  
**Descripción**: Calificar la atención recibida (solo cuando estado = RESUELTO).  
**Roles**: Student (autor del reporte)  
**Lambda**: `rateReport.handler` (NUEVO)

**Path Parameter**: `id_reporte` (UUID)

**Body**:
```json
{
  "rating": 5,
  "comment": "Excelente servicio, muy rápido",
  "tags": ["rapido", "profesional"]
}
```

**Respuesta**:
```json
{
  "message": "Rating submitted successfully",
  "rating": {
    "rating": 5,
    "comment": "Excelente servicio, muy rápido",
    "tags": ["rapido", "profesional"],
    "submitted_at": "2025-11-16T12:00:00Z"
  }
}
```

---

### **🔧 FASE 3 - Mejoras (3-4 semanas)**

#### **12. GET /users**
**Prioridad**: 🟢 BAJA  
**Descripción**: Listar usuarios del sistema.  
**Roles**: Solo Admin  
**Lambda**: `getUsers.handler` (NUEVO)

**Query Parameters**:
```typescript
{
  page?: number,
  size?: number,
  term?: string,          // Buscar por nombre o email
  role?: string,          // student|authority|admin
  sector?: string,        // Para authorities
  active?: boolean        // true|false
}
```

**Respuesta**:
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Juan Pérez",
      "email": "juan.perez@utec.edu.pe",
      "role": "student",
      "registration_date": "2025-11-01T10:00:00Z",
      "total_reports": 5,
      "active": true
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

---

#### **13. PUT /notifications/preferences**
**Prioridad**: 🟢 BAJA  
**Descripción**: Actualizar preferencias de notificación.  
**Roles**: Todos  
**Lambda**: `updateNotificationPreferences.handler` (NUEVO)

**Body**:
```json
{
  "websocket": true,
  "email": true,
  "sms": false,
  "urgency_levels": ["ALTA", "MEDIA"]
}
```

---

#### **14. POST /notifications/send-sms**
**Prioridad**: 🟢 BAJA  
**Descripción**: Enviar SMS vía AWS SNS (solo urgencia ALTA).  
**Trigger**: EventBridge (automático)  
**Lambda**: `sendSMSNotification.handler` (NUEVO)

**Integración**: AWS SNS (Simple Notification Service)

---

#### **15. GET /reports/export**
**Prioridad**: 🟢 BAJA  
**Descripción**: Exportar reportes en CSV/Excel.  
**Roles**: Admin  
**Lambda**: `exportReports.handler` (NUEVO)

**Query Parameters**:
```typescript
{
  format?: string,        // csv|excel|json
  period?: string,        // week|month|year
  sector?: string
}
```

**Respuesta**: Descarga directa del archivo o URL de S3

---

#### **16. POST /places** (Admin)
**Prioridad**: 🟢 BAJA  
**Descripción**: Agregar nuevos lugares al sistema.  
**Roles**: Solo Admin  
**Lambda**: `createPlace.handler` (NUEVO)

**Body**:
```json
{
  "name": "Nuevo Laboratorio L301",
  "type": "laboratorio",
  "tower": "T3",
  "floor": 3
}
```

---

### **🤖 FASE 4 - Machine Learning (1-2 meses)**

#### **17. GET /analytics/trends**
**Prioridad**: 🔵 OPCIONAL  
**Descripción**: Análisis de tendencias (integrado con Airflow).  
**Roles**: Admin  
**Lambda**: `getAnalyticsTrends.handler` (NUEVO)

**Respuesta**:
```json
{
  "weekly_trends": {
    "total_reports": [12, 15, 18, 20, 22, 19, 17],
    "avg_resolution_time": [2.5, 2.3, 2.1, 2.0, 1.8, 1.9, 2.0]
  },
  "peak_hours": [
    {"hour": 9, "count": 25},
    {"hour": 14, "count": 30}
  ],
  "recurring_issues": [
    {
      "issue": "Fuga de agua",
      "locations": ["Baño T1", "Baño T2"],
      "frequency": "weekly",
      "predicted_next": "2025-11-23"
    }
  ]
}
```

---

#### **18. POST /ml/predict-incident**
**Prioridad**: 🔵 OPCIONAL  
**Descripción**: Predecir incidentes futuros con ML.  
**Roles**: Admin  
**Lambda**: `predictIncident.handler` (NUEVO)  
**Integración**: AWS SageMaker

**Body**:
```json
{
  "location_id": "uuid",
  "time_range": "next_week",
  "historical_days": 30
}
```

**Respuesta**:
```json
{
  "predictions": [
    {
      "location": "Baño Torre 1 Piso 3",
      "incident_type": "Fuga de agua",
      "probability": 0.78,
      "recommended_action": "Inspección preventiva",
      "estimated_date": "2025-11-20"
    }
  ]
}
```

---

#### **19. GET /ml/incident-patterns**
**Prioridad**: 🔵 OPCIONAL  
**Descripción**: Patrones identificados por ML.  
**Roles**: Admin  
**Lambda**: `getIncidentPatterns.handler` (NUEVO)

**Respuesta**:
```json
{
  "patterns": [
    {
      "pattern": "Lunes 8-10am - Pico de reportes en cafetería",
      "confidence": 0.85,
      "recommendation": "Aumentar staff de limpieza"
    }
  ]
}
```

---

## 🗄️ Mejoras de Base de Datos

### **Nueva Tabla: t_report_history**

**Propósito**: Almacenar el historial completo de cambios de cada reporte para trazabilidad total.

**Estructura CloudFormation**:
```yaml
Resources:
  ReportHistoryTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: t_report_history
      AttributeDefinitions:
        - AttributeName: id_reporte
          AttributeType: S
        - AttributeName: timestamp
          AttributeType: S
      KeySchema:
        - AttributeName: id_reporte
          KeyType: HASH
        - AttributeName: timestamp
          KeyType: RANGE
      ProvisionedThroughput:
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5
```

**Estructura de Item**:
```json
{
  "id_reporte": "uuid",
  "timestamp": "2025-11-16T10:45:00.123Z",
  "action": "CREATED|STATUS_CHANGED|COMMENT_ADDED|ASSIGNED|PRIORITY_CHANGED|RATED|URGENCY_RECLASSIFIED",
  "user_id": "uuid",
  "user_name": "Roberto Sánchez",
  "user_role": "authority",
  "old_value": "PENDIENTE",
  "new_value": "ATENDIENDO",
  "comment": "Personal en camino al lugar",
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "source": "web|mobile|airflow"
  }
}
```

**Acciones registradas**:
- `CREATED` - Reporte creado
- `STATUS_CHANGED` - Cambio de estado (PENDIENTE → ATENDIENDO → RESUELTO)
- `COMMENT_ADDED` - Comentario agregado
- `ASSIGNED` - Reporte asignado a autoridad
- `PRIORITY_CHANGED` - Cambio de urgencia manual
- `RATED` - Reporte calificado por usuario
- `URGENCY_RECLASSIFIED` - Urgencia reclasificada por Airflow

---

### **GSI (Global Secondary Indexes) Recomendados**

#### **GSI1: SectorDateIndex**
**Propósito**: Queries rápidas por sector y rango de fechas.

```yaml
GlobalSecondaryIndexes:
  - IndexName: SectorDateIndex
    KeySchema:
      - AttributeName: assigned_sector
        KeyType: HASH
      - AttributeName: created_at
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
    ProvisionedThroughput:
      ReadCapacityUnits: 5
      WriteCapacityUnits: 5
```

**Query de ejemplo**:
```python
# Obtener reportes de Mantenimiento de la última semana
table.query(
    IndexName='SectorDateIndex',
    KeyConditionExpression='assigned_sector = :sector AND created_at > :week_ago',
    ExpressionAttributeValues={
        ':sector': 'Mantenimiento',
        ':week_ago': (datetime.utcnow() - timedelta(days=7)).isoformat()
    }
)
```

---

#### **GSI2: EstadoUrgenciaIndex**
**Propósito**: Filtrar reportes por estado y urgencia.

```yaml
  - IndexName: EstadoUrgenciaIndex
    KeySchema:
      - AttributeName: estado
        KeyType: HASH
      - AttributeName: urgencia
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
    ProvisionedThroughput:
      ReadCapacityUnits: 5
      WriteCapacityUnits: 5
```

**Query de ejemplo**:
```python
# Obtener reportes PENDIENTES de urgencia ALTA
table.query(
    IndexName='EstadoUrgenciaIndex',
    KeyConditionExpression='estado = :estado AND urgencia = :urgencia',
    ExpressionAttributeValues={
        ':estado': 'PENDIENTE',
        ':urgencia': 'ALTA'
    }
)
```

---

#### **GSI3: AuthorDateIndex**
**Propósito**: Obtener reportes de un estudiante por fecha.

```yaml
  - IndexName: AuthorDateIndex
    KeySchema:
      - AttributeName: author_id
        KeyType: HASH
      - AttributeName: created_at
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
    ProvisionedThroughput:
      ReadCapacityUnits: 5
      WriteCapacityUnits: 5
```

---

### **Nueva Tabla: t_notifications_preferences**

**Propósito**: Almacenar preferencias de notificación de cada usuario.

```yaml
Resources:
  NotificationPreferencesTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: t_notifications_preferences
      AttributeDefinitions:
        - AttributeName: user_id
          AttributeType: S
      KeySchema:
        - AttributeName: user_id
          KeyType: HASH
      ProvisionedThroughput:
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5
```

**Estructura**:
```json
{
  "user_id": "uuid",
  "websocket": true,
  "email": true,
  "sms": false,
  "urgency_levels": ["ALTA", "MEDIA"],
  "email_address": "juan.perez@utec.edu.pe",
  "phone_number": "+51987654321",
  "updated_at": "2025-11-16T10:00:00Z"
}
```

---

### **Nueva Tabla: t_report_ratings**

**Propósito**: Almacenar calificaciones de reportes resueltos.

```yaml
Resources:
  ReportRatingsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: t_report_ratings
      AttributeDefinitions:
        - AttributeName: id_reporte
          AttributeType: S
      KeySchema:
        - AttributeName: id_reporte
          KeyType: HASH
      ProvisionedThroughput:
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5
```

**Estructura**:
```json
{
  "id_reporte": "uuid",
  "user_id": "uuid",
  "rating": 5,
  "comment": "Excelente servicio, muy rápido",
  "tags": ["rapido", "profesional", "efectivo"],
  "submitted_at": "2025-11-16T12:00:00Z"
}
```

---

### **Actualización de t_reportes**

**Campos adicionales a agregar**:
```json
{
  // ... campos existentes ...
  
  // Clasificación automática por Airflow
  "urgencia_original": "MEDIA",
  "urgencia_clasificada": "ALTA",
  "clasificacion_auto": true,
  "classification_score": 0.85,
  "classification_timestamp": "2025-11-16T10:35:00Z",
  
  // Notificaciones
  "notification_sent": true,
  "notification_sent_at": "2025-11-16T10:36:00Z",
  "email_sent": true,
  "sms_sent": false,
  
  // Rating
  "rating": 5,
  "rating_comment": "Excelente servicio",
  "rated_at": "2025-11-16T12:00:00Z",
  
  // Asignación
  "priority": "high",
  "estimated_time": "2 hours",
  
  // Métricas de tiempo
  "time_to_assign": "15 minutes",
  "time_to_resolve": "2.5 hours",
  "response_time": "10 minutes"
}
```

---

## 🔄 Integración con Apache Airflow

### **DAGs Actuales**

#### **1. alertautec_incident_classification_and_notifications**
**Schedule**: Cada 5 minutos  
**Propósito**: Clasificación automática de incidentes con ML/heurísticas

**Flujo**:
1. `get_unclassified_incidents()` - Obtiene reportes sin clasificar
2. `classify_incidents()` - Clasifica con heurísticas
3. `update_incidents()` - Actualiza DynamoDB
4. `notify_responsibles()` - Envía notificaciones SNS

**Campos agregados**:
- `urgencia_original`
- `urgencia_clasificada`
- `clasificacion_auto`
- `classification_score`
- `notification_sent`

---

#### **2. alertautec_daily_stats_report**
**Schedule**: Diario a medianoche  
**Propósito**: Generar reporte estadístico diario

**Flujo**:
1. `extract_incidents_last_day()` - Obtiene reportes de últimas 24h
2. `aggregate_stats()` - Calcula estadísticas
3. `save_report_to_s3()` - Guarda en S3
4. `notify_new_report()` - Notifica vía SNS

**Salida en S3**: `s3://alertautec-reports/daily_reports/2025-11-16.json`

---

### **Nuevos DAGs Propuestos**

#### **3. alertautec_weekly_trends_analysis** (NUEVO)
**Schedule**: Semanal (domingos a medianoche)  
**Propósito**: Análisis de tendencias semanales

**Tareas**:
```python
@dag(
    dag_id="alertautec_weekly_trends_analysis",
    schedule_interval="0 0 * * 0",  # Domingos medianoche
    start_date=datetime(2025, 11, 1),
    catchup=False,
    tags=["alertautec", "analytics", "weekly"],
)
def weekly_trends_analysis():
    
    @task()
    def extract_week_incidents():
        # Obtener reportes de la última semana
        pass
    
    @task()
    def analyze_trends(incidents):
        # Identificar:
        # - Lugares con más incidentes
        # - Horarios pico
        # - Tipos de problemas recurrentes
        # - Sectores con mejor/peor rendimiento
        pass
    
    @task()
    def generate_predictions(trends):
        # Predecir problemas de la próxima semana
        pass
    
    @task()
    def save_to_s3(analysis):
        # Guardar análisis en S3
        pass
    
    @task()
    def notify_admins(report_path):
        # Notificar a administradores
        pass
```

---

#### **4. alertautec_hot_zones_detection** (NUEVO)
**Schedule**: Diario  
**Propósito**: Detectar zonas críticas que requieren atención preventiva

**Tareas**:
```python
@dag(
    dag_id="alertautec_hot_zones_detection",
    schedule_interval="0 6 * * *",  # 6 AM diario
    start_date=datetime(2025, 11, 1),
    catchup=False,
    tags=["alertautec", "prevention", "daily"],
)
def hot_zones_detection():
    
    @task()
    def get_recent_incidents():
        # Últimos 30 días
        pass
    
    @task()
    def identify_hot_zones(incidents):
        # Lugares con >5 incidentes en 30 días
        # O >3 incidentes de urgencia ALTA
        pass
    
    @task()
    def generate_recommendations(hot_zones):
        # Recomendar mantenimiento preventivo
        pass
    
    @task()
    def notify_authorities(recommendations):
        # Notificar a jefes de sector
        pass
```

---

#### **5. alertautec_sla_monitoring** (NUEVO)
**Schedule**: Cada hora  
**Propósito**: Monitorear SLAs (Service Level Agreements)

**SLAs definidos**:
- Urgencia ALTA: Respuesta en 15 min, Resolución en 2h
- Urgencia MEDIA: Respuesta en 1h, Resolución en 8h
- Urgencia BAJA: Respuesta en 4h, Resolución en 24h

**Tareas**:
```python
@dag(
    dag_id="alertautec_sla_monitoring",
    schedule_interval="0 * * * *",  # Cada hora
    start_date=datetime(2025, 11, 1),
    catchup=False,
    tags=["alertautec", "sla", "monitoring"],
)
def sla_monitoring():
    
    @task()
    def get_pending_incidents():
        # Reportes PENDIENTE o ATENDIENDO
        pass
    
    @task()
    def check_sla_violations(incidents):
        # Verificar si se violaron SLAs
        pass
    
    @task()
    def escalate_violations(violations):
        # Escalar a supervisores si hay violaciones
        pass
    
    @task()
    def update_metrics(sla_data):
        # Actualizar métricas en DynamoDB
        pass
```

---

#### **6. alertautec_sentiment_analysis** (NUEVO - Opcional)
**Schedule**: Diario  
**Propósito**: Analizar sentimiento de comentarios y ratings

**Integración**: AWS Comprehend (NLP)

**Tareas**:
```python
@dag(
    dag_id="alertautec_sentiment_analysis",
    schedule_interval="0 2 * * *",  # 2 AM diario
    start_date=datetime(2025, 11, 1),
    catchup=False,
    tags=["alertautec", "nlp", "sentiment"],
)
def sentiment_analysis():
    
    @task()
    def get_recent_comments():
        # Comentarios y ratings de últimas 24h
        pass
    
    @task()
    def analyze_sentiment(comments):
        # Usar AWS Comprehend para detectar sentimiento
        # POSITIVE, NEGATIVE, NEUTRAL, MIXED
        pass
    
    @task()
    def identify_issues(sentiment_data):
        # Identificar autoridades con bajo rating
        # Lugares con comentarios negativos
        pass
    
    @task()
    def generate_alerts(issues):
        # Alertar a supervisores
        pass
```

---

### **Endpoints para Airflow**

#### **GET /airflow/daily-report**
**Descripción**: Obtener último reporte diario generado por Airflow.  
**Roles**: Admin  
**Lambda**: `getAirflowDailyReport.handler` (NUEVO)

**Respuesta**:
```json
{
  "report_date": "2025-11-16",
  "report_url": "s3://alertautec-reports/daily_reports/2025-11-16.json",
  "summary": {
    "total_incidents": 25,
    "auto_classified": 20,
    "manual_classified": 5,
    "avg_confidence_score": 0.78,
    "urgency_reclassification": {
      "elevated": 5,
      "reduced": 2
    }
  }
}
```

---

#### **GET /airflow/weekly-trends**
**Descripción**: Obtener análisis de tendencias semanal.  
**Roles**: Admin  
**Lambda**: `getAirflowWeeklyTrends.handler` (NUEVO)

---

#### **GET /airflow/hot-zones**
**Descripción**: Obtener zonas críticas detectadas.  
**Roles**: Admin, Authority  
**Lambda**: `getAirflowHotZones.handler` (NUEVO)

**Respuesta**:
```json
{
  "hot_zones": [
    {
      "location": "Baño Torre 1 Piso 3",
      "incident_count": 8,
      "period": "last_30_days",
      "urgency_distribution": {
        "ALTA": 3,
        "MEDIA": 4,
        "BAJA": 1
      },
      "recommendation": "Inspección preventiva recomendada",
      "priority": "high"
    }
  ],
  "generated_at": "2025-11-16T06:00:00Z"
}
```

---

## 📐 Sistema de Paginación Estándar

Todos los endpoints que retornen listas usarán esta estructura consistente:

### **Query Parameters Estándar**:
```typescript
{
  page?: number,              // Número de página (default: 1, min: 1)
  size?: number,              // Items por página (default: 20, min: 1, max: 100)
  term?: string,              // Término de búsqueda
  orderBy?: string,           // Campo para ordenar
  order?: 'asc' | 'desc'      // Orden ascendente o descendente
}
```

### **Respuesta Estándar**:
```typescript
interface PaginatedResponse<T> {
  items: T[],                   // Array de items (nombre varía: reports, places, users)
  pagination: {
    current_page: number,       // Página actual
    page_size: number,          // Tamaño de página usado
    total_items: number,        // Total de items en toda la BD
    total_pages: number,        // Total de páginas calculado
    has_next: boolean,          // Hay siguiente página?
    has_previous: boolean       // Hay página anterior?
  },
  filters_applied?: {           // Filtros que se aplicaron (opcional)
    [key: string]: any
  },
  summary?: {                   // Resumen de datos (opcional)
    [key: string]: any
  }
}
```

### **Implementación Helper**:
```python
# utils/pagination.py
from typing import List, Dict, Any
import math

def paginate(items: List[Dict], page: int, size: int) -> Dict[str, Any]:
    """
    Helper para paginar resultados
    """
    total_items = len(items)
    total_pages = math.ceil(total_items / size) if size > 0 else 0
    
    start = (page - 1) * size
    end = start + size
    paginated_items = items[start:end]
    
    return {
        'items': paginated_items,
        'pagination': {
            'current_page': page,
            'page_size': size,
            'total_items': total_items,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_previous': page > 1
        }
    }

def validate_pagination_params(params: Dict) -> Dict:
    """
    Valida y normaliza parámetros de paginación
    """
    page = max(1, int(params.get('page', 1)))
    size = min(100, max(1, int(params.get('size', 20))))
    
    return {
        'page': page,
        'size': size,
        'term': params.get('term', '').strip(),
        'orderBy': params.get('orderBy', 'created_at'),
        'order': params.get('order', 'desc')
    }
```

---

## 🔍 Arquitectura de Búsqueda

### **Nivel 1: Búsqueda Básica (MVP - Actual)**

**Método**: DynamoDB Scan con FilterExpression

**Ventajas**:
- Simple de implementar
- No requiere servicios adicionales
- Funciona para volúmenes bajos (<10,000 items)

**Desventajas**:
- Lento en grandes volúmenes
- Consume muchas RCUs
- No soporta fuzzy search

**Implementación**:
```python
def search_basic(term, filters):
    table = dynamodb.Table('t_reportes')
    
    filter_expr = 'contains(descripcion, :term) OR contains(#lugar.#nombre, :term)'
    
    expr_attr_names = {
        '#lugar': 'lugar',
        '#nombre': 'nombre'
    }
    
    expr_attr_values = {
        ':term': term.lower()
    }
    
    # Agregar filtros adicionales
    if filters.get('estado'):
        filter_expr += ' AND estado = :estado'
        expr_attr_values[':estado'] = filters['estado']
    
    response = table.scan(
        FilterExpression=filter_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )
    
    return response['Items']
```

---

### **Nivel 2: Búsqueda con GSI (Recomendado para Producción)**

**Método**: Global Secondary Indexes + Query

**Ventajas**:
- Más rápido que Scan
- Consume menos RCUs
- Permite queries optimizadas

**Desventajas**:
- Requiere planificación de índices
- No soporta full-text search nativo

**GSI propuesto**:
```yaml
# SearchableFieldsIndex
GlobalSecondaryIndexes:
  - IndexName: SearchableFieldsIndex
    KeySchema:
      - AttributeName: searchable_text
        KeyType: HASH
      - AttributeName: created_at
        KeyType: RANGE
```

**Preparación de datos**:
```python
# Al crear/actualizar reporte
searchable_text = ' '.join([
    report['descripcion'].lower(),
    report['lugar']['nombre'].lower(),
    report['author']['name'].lower()
]).strip()

report_item['searchable_text'] = searchable_text
```

---

### **Nivel 3: Búsqueda Avanzada con Elasticsearch (Futuro)**

**Método**: DynamoDB Streams → Lambda → Elasticsearch

**Ventajas**:
- Full-text search potente
- Fuzzy search (tolera errores de tipeo)
- Ranking por relevancia
- Faceted search
- Autocomplete
- Búsqueda en múltiples idiomas

**Arquitectura**:
```
DynamoDB (t_reportes)
    ↓ (Streams)
Lambda (indexToElasticsearch)
    ↓
Amazon Elasticsearch Service
    ↑
Lambda (searchReports)
    ↑
API Gateway GET /reports/search
```

**Configuración Elasticsearch**:
```yaml
Resources:
  ElasticsearchDomain:
    Type: AWS::Elasticsearch::Domain
    Properties:
      DomainName: utec-alerta-search
      ElasticsearchVersion: 7.10
      ElasticsearchClusterConfig:
        InstanceType: t3.small.elasticsearch
        InstanceCount: 1
      EBSOptions:
        EBSEnabled: true
        VolumeType: gp2
        VolumeSize: 10
```

**Mapping de índice**:
```json
{
  "mappings": {
    "properties": {
      "id_reporte": {"type": "keyword"},
      "descripcion": {
        "type": "text",
        "analyzer": "spanish",
        "fields": {
          "keyword": {"type": "keyword"}
        }
      },
      "lugar": {
        "properties": {
          "nombre": {"type": "text", "analyzer": "spanish"},
          "type": {"type": "keyword"},
          "tower": {"type": "keyword"},
          "floor": {"type": "integer"}
        }
      },
      "urgencia": {"type": "keyword"},
      "estado": {"type": "keyword"},
      "created_at": {"type": "date"},
      "author_name": {"type": "text", "analyzer": "spanish"}
    }
  }
}
```

**Query de ejemplo**:
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "fuga agua",
            "fields": ["descripcion^2", "lugar.nombre", "author_name"],
            "fuzziness": "AUTO"
          }
        }
      ],
      "filter": [
        {"term": {"estado": "PENDIENTE"}},
        {"term": {"urgencia": "ALTA"}}
      ]
    }
  },
  "sort": [
    {"created_at": {"order": "desc"}}
  ],
  "from": 0,
  "size": 20
}
```

---

## 📅 Roadmap de Implementación

### **Sprint 1 (Semana 1-2): FASE 1 - Crítico**
**Objetivo**: Funcionalidad básica para frontend

- [ ] `GET /reports` - Listar reportes con paginación
- [ ] `GET /reports/my-reports` - Mis reportes (estudiantes)
- [ ] `GET /reports/{id}` - Detalle de reporte
- [ ] `GET /dashboard/stats` - Estadísticas básicas
- [ ] `GET /places` - Listar lugares
- [ ] `POST /reports/{id}/comment` - Agregar comentarios
- [ ] Crear tabla `t_report_history`
- [ ] Actualizar `serverless.yml` con nuevas lambdas
- [ ] Testing de endpoints críticos

**Entregables**:
- 6 nuevas lambdas funcionales
- Sistema de paginación implementado
- Historial básico de reportes
- Documentación de API actualizada

---

### **Sprint 2 (Semana 3-4): FASE 2 - Importante**
**Objetivo**: Notificaciones y visualización avanzada

- [ ] `GET /reports/{id}/history` - Historial completo
- [ ] `POST /notifications/send-email` - Emails automáticos
- [ ] Configurar AWS SES para emails
- [ ] `GET /dashboard/heatmap` - Mapa de calor
- [ ] `POST /reports/{id}/assign` - Asignación manual
- [ ] `POST /reports/{id}/rating` - Sistema de rating
- [ ] Crear tabla `t_report_ratings`
- [ ] Integrar Airflow con endpoints
- [ ] Testing de notificaciones

**Entregables**:
- Sistema de notificaciones email funcionando
- Dashboard avanzado con heatmap
- Sistema de ratings implementado
- Integración básica con Airflow

---

### **Sprint 3 (Semana 5-6): FASE 3 - Mejoras**
**Objetivo**: Gestión avanzada y preferencias

- [ ] `GET /users` - Gestión de usuarios (admin)
- [ ] `PUT /notifications/preferences` - Preferencias
- [ ] `POST /notifications/send-sms` - SMS críticos
- [ ] Configurar AWS SNS para SMS
- [ ] `GET /reports/export` - Exportación CSV/Excel
- [ ] `POST /places` - Crear lugares (admin)
- [ ] Crear tabla `t_notifications_preferences`
- [ ] Implementar GSI en DynamoDB
- [ ] Optimización de queries

**Entregables**:
- Panel admin completo
- Sistema de preferencias
- Exportación de datos
- Performance mejorado con GSI

---

### **Sprint 4 (Semana 7-10): FASE 4 - ML y Analytics**
**Objetivo**: Machine Learning y predicciones

- [ ] `GET /analytics/trends` - Análisis de tendencias
- [ ] `POST /ml/predict-incident` - Predicciones ML
- [ ] `GET /ml/incident-patterns` - Patrones detectados
- [ ] Configurar AWS SageMaker
- [ ] Entrenar modelo de ML
- [ ] Nuevos DAGs de Airflow:
  - [ ] `alertautec_weekly_trends_analysis`
  - [ ] `alertautec_hot_zones_detection`
  - [ ] `alertautec_sla_monitoring`
- [ ] Dashboard de analytics avanzado
- [ ] Testing de predicciones

**Entregables**:
- Modelo ML desplegado en SageMaker
- Sistema de predicciones funcionando
- 3 nuevos DAGs de Airflow
- Dashboard de analytics

---

### **Sprint 5+ (Futuro): Optimizaciones**
**Objetivo**: Escalabilidad y performance

- [ ] Migrar a Elasticsearch para búsqueda
- [ ] Implementar caché con Redis/ElastiCache
- [ ] Optimizar costos de DynamoDB
- [ ] Monitoreo con CloudWatch dashboards
- [ ] Alertas automáticas de errores
- [ ] Tests automatizados (unit + integration)
- [ ] CI/CD con GitHub Actions
- [ ] Documentación completa con Swagger/OpenAPI

---

## 📊 Métricas de Éxito

### **KPIs Técnicos**:
- Tiempo de respuesta API: < 500ms (p95)
- Disponibilidad: > 99.5%
- Tasa de error: < 1%
- Cobertura de tests: > 80%

### **KPIs de Negocio**:
- Reportes creados/día: Medible
- Tiempo promedio de resolución: < 4 horas
- Satisfacción de usuarios (rating): > 4.0/5.0
- Tasa de reclasificación por Airflow: > 80%

---

## 🔗 Recursos Adicionales

### **Documentación AWS**:
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [SageMaker Developer Guide](https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html)
- [Elasticsearch Service](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/what-is.html)

### **Herramientas Recomendadas**:
- **Postman**: Testing de APIs
- **AWS CloudWatch**: Monitoreo y logs
- **DynamoDB Local**: Testing local
- **Serverless Offline**: Testing local de Lambdas
- **Artillery**: Load testing

---

## ✅ Checklist de Implementación

### **Por cada nuevo endpoint**:
- [ ] Crear función Lambda
- [ ] Agregar en `serverless.yml`
- [ ] Implementar validación JWT
- [ ] Implementar paginación (si aplica)
- [ ] Agregar manejo de errores
- [ ] Convertir Decimal a tipos nativos
- [ ] Testing manual con Postman
- [ ] Documentar en README
- [ ] Agregar ejemplos de uso
- [ ] Deploy y testing en dev

### **Por cada nueva tabla**:
- [ ] Definir en `resources/dynamodb-tables.yml`
- [ ] Planificar GSI necesarios
- [ ] Crear script de seed
- [ ] Testing de queries
- [ ] Validar performance
- [ ] Documentar estructura

---

**Documento actualizado**: 16 de Noviembre 2025  
**Próxima revisión**: Inicio de cada Sprint  
**Mantenido por**: Equipo de Desarrollo UTEC Alerta
