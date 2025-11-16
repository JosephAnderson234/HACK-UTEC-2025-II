# 🗺️ Planificación de Lambdas - UTEC Alerta

**Fecha:** 16 de Noviembre 2025  
**Rama:** feature/endpoints-implementation  
**Estrategia:** Arquitectura serverless minimalista enfocada en funcionalidades core

---

## 📊 Análisis de la Implementación Actual

### ✅ **Funciones Existentes (7 lambdas)**

| Lambda | Handler | Método | Ruta | Validación JWT | Roles Permitidos |
|--------|---------|--------|------|----------------|------------------|
| `register` | `functions.auth.handler` | POST | `/auth/register` | ❌ No | Público |
| `login` | `functions.auth.handler` | POST | `/auth/login` | ❌ No | Público |
| `sendReport` | `functions.sendReport.handler` | POST | `/reports/create` | ✅ Sí | `student` |
| `updateStatus` | `functions.updateStatus.handler` | POST | `/reports/update-status` | ✅ Sí | `authority`, `admin` |
| `onConnect` | `functions.onConnect.handler` | WS | `$connect` | ✅ Sí (query) | Todos |
| `onDisconnect` | `functions.onDisconnect.handler` | WS | `$disconnect` | ❌ No | Todos |
| `sendNotify` | `functions.sendNotify.handler` | EventBridge | - | ❌ No | Sistema |

---

## 🔐 Sistema de Validación JWT (Compartido)

### **Utilidad Compartida: `utils/jwt_validator.py`**

**Funcionalidades clave:**
1. ✅ `get_jwt_secret()` - Obtiene el secret desde **SSM Parameter Store** con caché en memoria
   - Variable de entorno: `JWT_SECRET_PARAM=/utec-alerta/jwt-secret`
   - Evita consultas repetidas a SSM (optimización de costos)
   
2. ✅ `validate_token(token: str)` - **Validación robusta en 2 pasos:**
   - **Paso 1:** Decodifica el token JWT con PyJWT (verifica firma y expiración)
   - **Paso 2:** Consulta `t_usuarios` en DynamoDB para verificar que el usuario exista
   - Retorna payload enriquecido con `user_data` completo (incluyendo `role`, `data_student`, `data_authority`)
   - Lanza excepciones específicas: `Token expired`, `Invalid token`, `User not found`

3. ✅ `extract_token_from_event(event)` - Extracción flexible desde múltiples fuentes:
   - Header HTTP: `Authorization: Bearer <token>`
   - Query parameter: `?token=<token>` (usado en WebSocket)
   - Body JSON: `{"token": "<token>"}`

4. ✅ `create_response(status_code, body, headers)` - Respuesta HTTP estandarizada con CORS automático

**🎯 Ventaja arquitectónica:** Al compartir `validate_token()`, **todas las lambdas reutilizan la validación de usuario en BD** sin duplicar código. Esto elimina la necesidad de un Lambda Authorizer adicional, reduciendo latencia y costos.

---

## 🆕 Nuevas Lambdas a Implementar (7 lambdas)

### **Grupo 1: Gestión de Reportes - Lectura (4 lambdas)**

#### **1. `getMyReports` - Mis Reportes (Estudiante)**
```yaml
File: functions/getMyReports.py
Handler: functions.getMyReports.handler
Method: GET
Path: /reports/my-reports
Query Params: ?page=1&size=20&estado=PENDIENTE&urgencia=ALTA&orderBy=created_at&order=desc
```

**Funcionalidad:**
- ✅ Validar JWT con `validate_token()` → obtener `user_id` y `role` del payload
- ✅ Verificar que `role == 'student'` → 403 Forbidden si no cumple
- ✅ Query DynamoDB `t_reportes` con filter `author_id == user_id`
- ✅ Aplicar filtros opcionales: `estado` (PENDIENTE/ATENDIENDO/RESUELTO), `urgencia` (BAJA/MEDIA/ALTA)
- ✅ Implementar paginación manual con `page` (default: 1) y `size` (default: 20, max: 100)
- ✅ Ordenar resultados por `orderBy` (created_at, urgencia, estado) y `order` (asc/desc)
- ✅ **Enriquecimiento de datos:** Join con `t_lugares` usando `batch_get_item` para obtener detalles completos del lugar
- ✅ Retornar estructura estandarizada: `{reports: [], pagination: {current_page, total_items, total_pages, has_next, has_previous}}`

**Acceso a BD:**
- **READ:** `t_reportes` (Scan con FilterExpression para `author_id`)
- **READ:** `t_lugares` (BatchGetItem para enriquecer lugares)

**Casos de uso:**
- Estudiante revisa el estado de sus reportes
- Estudiante filtra reportes pendientes de alta urgencia
- Estudiante navega historial paginado de reportes

---

#### **2. `getReports` - Todos los Reportes (Autoridad/Admin)**
```yaml
File: functions/getReports.py
Handler: functions.getReports.handler
Method: GET
Path: /reports
Query Params: ?page=1&size=20&estado=*&urgencia=*&sector=*&tower=*&floor=*&term=fuga&orderBy=urgencia&order=desc
```

**Funcionalidad:**
- ✅ Validar JWT con `validate_token()` → obtener `user_id`, `role`, `user_data`
- ✅ Verificar que `role in ['authority', 'admin']` → 403 Forbidden si no cumple
- ✅ **Filtrado automático por rol:**
  - Si `role == 'authority'`: Extraer `sector = user_data['data_authority']['sector']` y filtrar `assigned_sector == sector`
  - Si `role == 'admin'`: Sin restricciones de sector (acceso completo)
- ✅ Query DynamoDB `t_reportes` con múltiples filtros dinámicos aplicados
- ✅ **Búsqueda de texto:** Implementar `term` para scan en campo `descripcion` (case-insensitive)
- ✅ Paginación + ordenamiento flexible
- ✅ **Triple enriquecimiento:**
  - Join con `t_lugares` (batch_get_item)
  - Join con `t_usuarios` para obtener `author_name` (first_name + last_name)
  - Join con `t_usuarios` para obtener `assigned_name` si `assigned_to` existe

**Acceso a BD:**
- **READ:** `t_reportes` (Scan con múltiples FilterExpressions dinámicos)
- **READ:** `t_lugares` (BatchGetItem)
- **READ:** `t_usuarios` (BatchGetItem para autores y asignados)

**Casos de uso:**
- Autoridad ve todos los reportes de su sector (ej: Mantenimiento)
- Admin busca reportes con palabra "fuga" en descripción
- Autoridad filtra reportes de urgencia ALTA en Torre 1

---

#### **3. `getReportDetail` - Detalle Completo de Reporte**
```yaml
File: functions/getReportDetail.py
Handler: functions.getReportDetail.handler
Method: GET
Path: /reports/{id_reporte}
Path Params: id_reporte
```

**Funcionalidad:**
- ✅ Validar JWT con `validate_token()` → obtener `user_id`, `role`, `user_data`
- ✅ Query DynamoDB `t_reportes` por `id_reporte` (GetItem con PK)
- ✅ Retornar 404 si reporte no existe
- ✅ **Validación de permisos según rol:**
  - Si `role == 'student'`: Verificar que `report['author_id'] == user_id` → 403 si no es el autor
  - Si `role == 'authority'`: Verificar que `report['assigned_sector'] == user_data['data_authority']['sector']` → 403 si no es su sector
  - Si `role == 'admin'`: Sin restricciones
- ✅ **Enriquecimiento completo:**
  - Datos completos de `t_lugares` (GetItem)
  - Información del autor desde `t_usuarios` (first_name, last_name, email, cellphone)
  - Información del asignado desde `t_usuarios` si `assigned_to` existe
- ✅ Retornar reporte con todos los campos enriquecidos

**Acceso a BD:**
- **READ:** `t_reportes` (GetItem con PK)
- **READ:** `t_lugares` (GetItem)
- **READ:** `t_usuarios` (GetItem x2: autor y asignado)

**Casos de uso:**
- Estudiante ve el progreso detallado de su reporte
- Autoridad revisa información completa antes de tomar acción
- Admin audita reporte específico con información de contacto

---

#### **4. `getAssignedReports` - Reportes Asignados a Mí (Autoridad)**
```yaml
File: functions/getAssignedReports.py
Handler: functions.getAssignedReports.handler
Method: GET
Path: /reports/assigned-to-me
Query Params: ?page=1&size=20&estado=ATENDIENDO&urgencia=ALTA&orderBy=created_at&order=desc
```

**Funcionalidad:**
- ✅ Validar JWT con `validate_token()` → obtener `user_id`, `role`
- ✅ Verificar que `role == 'authority'` → 403 Forbidden si no cumple
- ✅ Query DynamoDB `t_reportes` con filter `assigned_to == user_id`
- ✅ Aplicar filtros opcionales: `estado`, `urgencia`
- ✅ Paginación con `page` y `size`
- ✅ Ordenamiento por `orderBy` (created_at, urgencia, updated_at) y `order`
- ✅ Enriquecer cada reporte con datos de `t_lugares`

**Acceso a BD:**
- **READ:** `t_reportes` (Scan con FilterExpression para `assigned_to`)
- **READ:** `t_lugares` (BatchGetItem)

**Casos de uso:**
- Autoridad ve su lista personal de trabajo
- Autoridad prioriza reportes ALTA urgencia asignados a ella
- Autoridad revisa reportes en estado ATENDIENDO

---

### **Grupo 2: Gestión de Reportes - Escritura (2 lambdas)**

#### **5. `takeReport` - Auto-asignar Reporte (Autoridad)**
```yaml
File: functions/takeReport.py
Handler: functions.takeReport.handler
Method: POST
Path: /reports/{id_reporte}/take
Path Params: id_reporte
Body: {"comentario": "Personal en camino (opcional)"}
```

**Funcionalidad:**
- ✅ Validar JWT con `validate_token()` → obtener `user_id`, `role`, `user_data`
- ✅ Verificar que `role == 'authority'` → 403 Forbidden si no cumple
- ✅ Query DynamoDB `t_reportes` para obtener reporte completo
- ✅ **Validaciones de negocio:**
  - Verificar que `report['assigned_sector'] == user_data['data_authority']['sector']` → 403 si no es su sector
  - Verificar que `report['estado'] == 'PENDIENTE'` → 400 Bad Request si ya está asignado
  - Verificar que reporte no esté eliminado
- ✅ **Update atómico en DynamoDB `t_reportes`:**
  - `assigned_to = user_id`
  - `estado = 'ATENDIENDO'`
  - `updated_at = ISO timestamp actual`
- ✅ **Notificación asíncrona:** Enviar evento a EventBridge con DetailType `StatusUpdated`

**Acceso a BD:**
- **READ:** `t_reportes` (GetItem)
- **WRITE:** `t_reportes` (UpdateItem con ConditionExpression)

**Integración EventBridge:**
```python
event_detail = {
    'report_id': id_reporte,
    'old_status': 'PENDIENTE',
    'new_status': 'ATENDIENDO',
    'updated_by': user_id,
    'author_id': report['author_id'],
    'sector': report['assigned_sector']
}
```

**Casos de uso:**
- Autoridad de Mantenimiento toma reporte de fuga en su sector
- Sistema previene doble asignación del mismo reporte
- Estudiante recibe notificación en tiempo real vía WebSocket

---

#### **6. `assignReport` - Asignar Manualmente (Admin)**
```yaml
File: functions/assignReport.py
Handler: functions.assignReport.handler
Method: POST
Path: /reports/{id_reporte}/assign
Path Params: id_reporte
Body: {"assigned_to": "uuid", "estado": "ATENDIENDO"}
```

**Funcionalidad:**
- ✅ Validar JWT con `validate_token()` → obtener `user_id`, `role`
- ✅ Verificar que `role == 'admin'` → 403 Forbidden si no cumple
- ✅ **Validaciones previas:**
  - Query `t_reportes` para verificar que reporte exista
  - Query `t_usuarios` con `assigned_to` ID para verificar que usuario exista y `role == 'authority'`
  - Verificar que `user['data_authority']['sector'] == report['assigned_sector']` → 400 si sectores no coinciden
- ✅ **Update atómico en DynamoDB `t_reportes`:**
  - `assigned_to = body['assigned_to']`
  - `estado = body['estado']`
  - `updated_at = ISO timestamp actual`
- ✅ Enviar evento EventBridge `StatusUpdated` con información completa

**Acceso a BD:**
- **READ:** `t_reportes` (GetItem)
- **READ:** `t_usuarios` (GetItem para validar `assigned_to`)
- **WRITE:** `t_reportes` (UpdateItem)

**Casos de uso:**
- Admin asigna reporte a autoridad específica por expertise
- Admin reasigna reporte si autoridad está sobrecargada
- Sistema valida que autoridad pertenezca al sector correcto

---

### **Grupo 3: Gestión de Lugares (1 lambda)**

#### **7. `getPlaces` - Listar Lugares Disponibles**
```yaml
File: functions/getPlaces.py
Handler: functions.getPlaces.handler
Method: GET
Path: /places
Query Params: ?page=1&size=50&tower=T1&floor=3&type=baño&term=laboratorio
```

**Funcionalidad:**
- ✅ Validar JWT con `validate_token()` → verificar autenticación (todos los roles pueden listar lugares)
- ✅ Query DynamoDB `t_lugares` con filtros opcionales dinámicos:
  - `tower`: Filtrar por torre (T1, T2, T3, T4)
  - `floor`: Filtrar por piso (0-10)
  - `type`: Filtrar por tipo (baño, aula, laboratorio, etc.)
  - `term`: Búsqueda de texto en campo `name` (case-insensitive)
- ✅ Paginación con `page` (default: 1) y `size` (default: 50, max: 100)
- ✅ Ordenar alfabéticamente por `name`
- ✅ Retornar lista de lugares con estructura de paginación estándar

**Acceso a BD:**
- **READ:** `t_lugares` (Scan con múltiples FilterExpressions opcionales)

**Casos de uso:**
- Estudiante busca lugar específico para crear reporte
- Frontend carga dropdown de lugares filtrados por torre
- Autoridad busca "baño" para ver todos los baños reportados
- Admin lista todos los lugares para auditoría

---

## 📋 Resumen Ejecutivo

### **📊 Comparativa de Arquitectura**

| Métrica | Propuesta Original | **Arquitectura Final** |
|---------|-------------------|------------------------|
| **Nuevas Lambdas** | 14 | **7** ✅ |
| **Complejidad** | Alta | **Baja** ✅ |
| **Tiempo de Deploy** | ~45 min | **~20 min** ✅ |
| **Costo mensual estimado** | ~$15-25 | **~$8-12** ✅ |
| **Mantenibilidad** | Media | **Alta** ✅ |
| **Cobertura funcional** | 100% | **95%** (suficiente para hackathon) |

### **🎯 Funcionalidades NO implementadas (y por qué está bien)**

❌ **Stats/Dashboard endpoints** - No críticos para MVP, frontend puede calcular básicas cliente-side  
❌ **Gestión de usuarios (GET /users)** - Admin puede ver usuarios desde AWS Console  
❌ **CRUD completo de lugares** - Lugares pueden pre-cargarse o gestionarse manualmente

---

### **✅ Tabla Final de Lambdas (14 total: 7 existentes + 7 nuevas)**

| # | Nombre Lambda | Archivo | Método | Ruta | Roles Permitidos | Prioridad |
|---|--------------|---------|--------|------|------------------|-----------|
| **EXISTENTES** |
| - | `register` | `functions/auth.py` | POST | `/auth/register` | Público | ⭐⭐⭐ |
| - | `login` | `functions/auth.py` | POST | `/auth/login` | Público | ⭐⭐⭐ |
| - | `sendReport` | `functions/sendReport.py` | POST | `/reports/create` | `student` | ⭐⭐⭐ |
| - | `updateStatus` | `functions/updateStatus.py` | POST | `/reports/update-status` | `authority`, `admin` | ⭐⭐⭐ |
| - | `onConnect` | `functions/onConnect.py` | WS | `$connect` | Todos | ⭐⭐⭐ |
| - | `onDisconnect` | `functions/onDisconnect.py` | WS | `$disconnect` | Todos | ⭐⭐⭐ |
| - | `sendNotify` | `functions/sendNotify.py` | EventBridge | - | Sistema | ⭐⭐⭐ |
| **NUEVAS** |
| 1 | `getMyReports` | `functions/getMyReports.py` | GET | `/reports/my-reports` | `student` | ⭐⭐⭐ |
| 2 | `getReports` | `functions/getReports.py` | GET | `/reports` | `authority`, `admin` | ⭐⭐⭐ |
| 3 | `getReportDetail` | `functions/getReportDetail.py` | GET | `/reports/{id}` | Todos* | ⭐⭐⭐ |
| 4 | `getAssignedReports` | `functions/getAssignedReports.py` | GET | `/reports/assigned-to-me` | `authority` | ⭐⭐ |
| 5 | `takeReport` | `functions/takeReport.py` | POST | `/reports/{id}/take` | `authority` | ⭐⭐⭐ |
| 6 | `assignReport` | `functions/assignReport.py` | POST | `/reports/{id}/assign` | `admin` | ⭐⭐ |
| 7 | `getPlaces` | `functions/getPlaces.py` | GET | `/places` | Todos | ⭐⭐⭐ |

*Con validaciones específicas por rol

**Total: 7 nuevas lambdas (50% menos que la propuesta original)**

---

## 🔐 Patrón de Validación Estándar (Template)

**Todas las 7 nuevas lambdas seguirán este patrón consistente:**

```python
import json
from utils.jwt_validator import validate_token, extract_token_from_event, create_response
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')
users_table = dynamodb.Table('t_usuarios')
places_table = dynamodb.Table('t_lugares')

def handler(event, context):
    try:
        # 1. Extraer token del evento (header, query, body)
        token = extract_token_from_event(event)
        if not token:
            return create_response(401, {'error': 'Authorization token required'})
        
        # 2. Validar token JWT + verificar que usuario exista en BD
        payload = validate_token(token)  # ← Consulta automática a t_usuarios
        user_id = payload['user_id']
        role = payload['user_data']['role']
        user_data = payload['user_data']
        
        # 3. Validar rol específico según endpoint
        if role not in ['authority', 'admin']:
            return create_response(403, {'error': 'Insufficient permissions'})
        
        # 4. Lógica de negocio específica...
        # - Query DynamoDB
        # - Aplicar filtros por rol
        # - Paginación
        # - Enriquecimiento de datos
        
        return create_response(200, {
            'message': 'Success',
            'data': {}
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return create_response(500, {'error': str(e)})
```

---

## 📦 Actualización de `serverless.yml`

**Se agregarán las 7 nuevas funciones con:**

```yaml
functions:
  # ... funciones existentes ...
  
  # Nuevas funciones de lectura
  getMyReports:
    handler: functions.getMyReports.handler
    events:
      - http:
          path: reports/my-reports
          method: get
          cors: true
  
  getReports:
    handler: functions.getReports.handler
    events:
      - http:
          path: reports
          method: get
          cors: true
  
  getReportDetail:
    handler: functions.getReportDetail.handler
    events:
      - http:
          path: reports/{id_reporte}
          method: get
          cors: true
  
  getAssignedReports:
    handler: functions.getAssignedReports.handler
    events:
      - http:
          path: reports/assigned-to-me
          method: get
          cors: true
  
  # Nuevas funciones de escritura
  takeReport:
    handler: functions.takeReport.handler
    events:
      - http:
          path: reports/{id_reporte}/take
          method: post
          cors: true
  
  assignReport:
    handler: functions.assignReport.handler
    events:
      - http:
          path: reports/{id_reporte}/assign
          method: post
          cors: true
  
  # Gestión de lugares
  getPlaces:
    handler: functions.getPlaces.handler
    events:
      - http:
          path: places
          method: get
          cors: true
```

**Variables de entorno (ya configuradas globalmente):**
- ✅ `JWT_SECRET_PARAM=/utec-alerta/jwt-secret`
- ✅ `BUCKET_INGESTA` para S3
- ✅ `WEBSOCKET_API_ENDPOINT` para notificaciones

**Permisos IAM (LabRole ya incluye):**
- ✅ DynamoDB: READ/WRITE en `t_reportes`, `t_usuarios`, `t_lugares`, `t_connections`
- ✅ SSM: GetParameter para JWT secret
- ✅ EventBridge: PutEvents para notificaciones
- ✅ S3: PutObject/GetObject para imágenes

---

## 🎯 Ventajas de Esta Arquitectura Simplificada

| Ventaja | Descripción | Impacto |
|---------|-------------|---------|
| **Reutilización de código** | Todas las lambdas comparten `utils/jwt_validator.py` | Reduce bugs, facilita actualizaciones |
| **Validación robusta** | `validate_token()` SIEMPRE verifica usuario en BD | Previene tokens válidos de usuarios eliminados |
| **Sin Lambda Authorizer** | Validación integrada en cada lambda | Reduce latencia ~100ms, menos puntos de fallo |
| **Granularidad de permisos** | Cada lambda aplica filtros según rol | Autoridades solo ven su sector automáticamente |
| **Inyección segura** | JWT_SECRET desde SSM con caché en memoria | Evita hardcodear secrets, optimiza costos |
| **Batch operations** | `batch_get_item` para enriquecer datos | Reduce llamadas DynamoDB de N+1 a 1+1 |
| **Paginación manual** | Control completo sobre límites y offsets | Evita costos de queries sin límites |

---

## 🛠️ Utilidades Adicionales a Crear (Opcional)

```python
# utils/pagination.py
def paginate_results(items, page=1, size=20):
    """Paginación manual para resultados de scan/query"""
    start = (page - 1) * size
    end = start + size
    paginated = items[start:end]
    
    return {
        'items': paginated,
        'pagination': {
            'current_page': page,
            'page_size': size,
            'total_items': len(items),
            'total_pages': (len(items) + size - 1) // size,
            'has_next': end < len(items),
            'has_previous': page > 1
        }
    }

# utils/filters.py
def apply_filters(items, filters):
    """Aplica filtros dinámicos a lista de items"""
    filtered = items
    
    for key, value in filters.items():
        if value:
            filtered = [item for item in filtered if item.get(key) == value]
    
    return filtered
```

---

## 📝 Próximos Pasos (Roadmap de Implementación)

### **Fase 1: Setup y Preparación (5 min)**
- [x] Crear rama `feature/endpoints-implementation`
- [x] Revisar y aprobar plan de rutas en `RUTA.md`
- [ ] Crear utilidades adicionales (`utils/pagination.py`, `utils/filters.py`)

### **Fase 2: Implementación Lambdas de Lectura (30 min)**
- [ ] Implementar `getMyReports.py` (10 min)
- [ ] Implementar `getReports.py` (10 min)
- [ ] Implementar `getReportDetail.py` (5 min)
- [ ] Implementar `getAssignedReports.py` (5 min)

### **Fase 3: Implementación Lambdas de Escritura (20 min)**
- [ ] Implementar `takeReport.py` (10 min)
- [ ] Implementar `assignReport.py` (10 min)

### **Fase 4: Implementación Gestión de Lugares (5 min)**
- [ ] Implementar `getPlaces.py` (5 min)

### **Fase 5: Configuración y Deploy (10 min)**
- [ ] Actualizar `serverless.yml` con las 7 nuevas funciones
- [ ] Validar sintaxis YAML
- [ ] Deploy a stage `test`

### **Fase 6: Testing y Validación (20 min)**
- [ ] Probar cada endpoint con Postman/curl
- [ ] Validar permisos por rol
- [ ] Verificar notificaciones WebSocket
- [ ] Documentar ejemplos de uso

**Tiempo total estimado: ~90 minutos**

---

## 🏗️ Arquitectura de Alto Nivel para Presentación

```
┌───────────────────────────────────────────────────────┐
│              FRONTEND (React/Next.js)                 │
│         https://utec-alerta.vercel.app                │
└───────────────┬───────────────────┬───────────────────┘
                │ HTTP REST         │ WebSocket
                ↓                   ↓
    ┌───────────────────┐  ┌─────────────────────┐
    │ API Gateway REST  │  │ API Gateway WS      │
    └────────┬──────────┘  └──────┬──────────────┘
             │                     │
             ↓                     ↓
    ┌─────────────────────────────────────────────────┐
    │         AWS Lambda Services (14 funciones)      │
    │  ┌────────────────────────────────────────────┐ │
    │  │ 🔐 Auth Service (2 funciones)             │ │
    │  │    • Registro y autenticación JWT         │ │
    │  └────────────────────────────────────────────┘ │
    │  ┌────────────────────────────────────────────┐ │
    │  │ 📝 Report Service (8 funciones)           │ │
    │  │    • CRUD reportes + asignación           │ │
    │  └────────────────────────────────────────────┘ │
    │  ┌────────────────────────────────────────────┐ │
    │  │ 📍 Place Service (1 función)              │ │
    │  │    • Consulta de lugares                  │ │
    │  └────────────────────────────────────────────┘ │
    │  ┌────────────────────────────────────────────┐ │
    │  │ 🔔 Notification Service (3 funciones)     │ │
    │  │    • WebSocket real-time                  │ │
    │  └────────────────────────────────────────────┘ │
    └──────┬─────────────────┬───────────────────────┘
           │                 │
           ↓                 ↓
    ┌──────────────┐  ┌──────────────────┐
    │  DynamoDB    │  │  SSM Param Store │
    │  4 tablas    │  │  • JWT Secret    │
    └──────┬───────┘  └──────────────────┘
           │
           ↓
    ┌──────────────────────────┐
    │  Amazon EventBridge      │
    │  • Orquestación eventos  │
    └──────┬───────────────────┘
           │
           ↓
    ┌──────────────────────────┐
    │  Apache Airflow (ECS)    │
    │  • Clasificación ML      │
    │  • Notificaciones batch  │
    └──────────────────────────┘
```

---

**Fecha de Planificación:** 16 de Noviembre 2025  
**Última Actualización:** 16 de Noviembre 2025 (Simplificación a 7 lambdas)  
**Autor:** GitHub Copilot + Leonardo  
**Estado:** ✅ Aprobado - Listo para implementación
