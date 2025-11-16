# 🔐 Control de Acceso y Flujo del Sistema - UTEC Alerta

## 📋 Índice
1. [Roles y Permisos](#roles-y-permisos)
2. [Matriz de Acceso por Endpoint](#matriz-de-acceso-por-endpoint)
3. [Flujos Completos](#flujos-completos)
4. [Notificaciones WebSocket](#notificaciones-websocket)
5. [Credenciales de Prueba](#credenciales-de-prueba)

---

## 🎭 Roles y Permisos

### **1. Estudiante (student)**
**Descripción:** Usuarios que reportan incidencias en el campus

**Permisos:**
- ✅ Registrarse en el sistema
- ✅ Iniciar sesión
- ✅ Crear reportes de incidencias
- ✅ Ver sus propios reportes
- ✅ Recibir notificaciones de actualizaciones en sus reportes
- ❌ NO puede actualizar estado de reportes
- ❌ NO puede ver reportes de otros estudiantes
- ❌ NO puede acceder a funciones administrativas

**Datos específicos:**
```json
{
  "data_student": {
    "career": "Nombre de la carrera",
    "cycle": 5,
    "code": 202012345
  }
}
```

---

### **2. Autoridad (authority)**
**Descripción:** Personal administrativo que atiende reportes por sector

**Permisos:**
- ✅ Registrarse en el sistema
- ✅ Iniciar sesión
- ✅ Ver reportes de su sector asignado
- ✅ Actualizar estado de reportes (PENDIENTE → ATENDIENDO → RESUELTO)
- ✅ Recibir notificaciones de nuevos reportes en su sector
- ✅ Agregar comentarios/notas a reportes
- ❌ NO puede crear reportes
- ❌ NO puede ver reportes de otros sectores (excepto admin)
- ❌ NO puede eliminar reportes

**Sectores disponibles:**
- `Mantenimiento`: Baños, aulas, laboratorios, auditorios
- `Seguridad`: Estacionamientos, entradas, patrullas
- `Limpieza`: Patios, jardines, áreas comunes
- `Servicios`: Cafetería, biblioteca, servicios generales
- `General`: Otros tipos de incidencias

**Datos específicos:**
```json
{
  "data_authority": {
    "sector": "Mantenimiento",
    "charge": "Jefe de Mantenimiento",
    "notifications_urgency": ["ALTA", "MEDIA"]
  }
}
```

**Niveles de urgencia:**
- Solo reciben notificaciones de reportes con urgencia en su lista
- Ejemplo: Si `notifications_urgency: ["ALTA"]`, solo ve reportes ALTA

---

### **3. Administrador (admin)**
**Descripción:** Personal de alto nivel con acceso total

**Permisos:**
- ✅ Todos los permisos de Autoridad
- ✅ Ver reportes de TODOS los sectores
- ✅ Actualizar estado de cualquier reporte
- ✅ Recibir notificaciones de todos los reportes
- ✅ Acceso a dashboards y estadísticas (futura integración con Airflow)
- ✅ Gestión de usuarios (futuro)
- ❌ NO puede crear reportes (deben usar cuenta de estudiante)

**Datos específicos:**
```json
{
  "data_authority": {
    "sector": "Administración",
    "charge": "Director de Operaciones",
    "notifications_urgency": ["ALTA"]
  }
}
```

---

## 🔒 Matriz de Acceso por Endpoint

| Endpoint | Método | Estudiante | Autoridad | Admin | Auth Requerida |
|----------|--------|------------|-----------|-------|----------------|
| `/auth/register` | POST | ✅ | ✅ | ✅ | ❌ |
| `/auth/login` | POST | ✅ | ✅ | ✅ | ❌ |
| `/reports/create` | POST | ✅ | ❌ | ❌ | ✅ JWT |
| `/reports/update-status` | POST | ❌ | ✅ | ✅ | ✅ JWT |
| `wss://.../connect` | WS | ✅ | ✅ | ✅ | ✅ JWT (query param) |

### Detalles de Validación

#### **POST /reports/create**
```javascript
// Validación en sendReport.py
if (user_role != 'student') {
    return 403 Forbidden: "Only students can create reports"
}
```

#### **POST /reports/update-status**
```javascript
// Validación en updateStatus.py
if (user_role not in ['authority', 'admin']) {
    return 403 Forbidden: "Only authorities can update report status"
}
```

#### **WebSocket Connect**
```javascript
// Validación en onConnect.py
// Todos los roles pueden conectarse
// Las notificaciones se filtran según el rol
```

---

## 🔄 Flujos Completos

### **FLUJO 1: Estudiante Crea Reporte**

```
1️⃣ ESTUDIANTE INICIA SESIÓN
   POST /auth/login
   {
     "email": "juan.perez@utec.edu.pe",
     "password": "student123"
   }
   → Recibe JWT token

2️⃣ ESTUDIANTE CONECTA WEBSOCKET
   wss://endpoint/dev?token=JWT_TOKEN
   → Conexión guardada en t_connections
   → Listo para recibir notificaciones

3️⃣ ESTUDIANTE CREA REPORTE
   POST /reports/create
   Headers: Authorization: Bearer JWT_TOKEN
   {
     "lugar_id": "uuid-del-baño",
     "urgencia": "ALTA",
     "descripcion": "Fuga de agua",
     "imagen_base64": "..."
   }
   
   Validaciones:
   ✓ Token JWT válido
   ✓ Usuario existe en BD
   ✓ Rol = "student"
   ✓ Lugar existe
   ✓ Urgencia válida (BAJA/MEDIA/ALTA)
   
   Proceso:
   → Genera ID único
   → Determina sector automáticamente (tipo "baño" → Mantenimiento)
   → Sube imagen a S3 (si existe)
   → Guarda en t_reportes con estado "PENDIENTE"
   → Publica evento en EventBridge: "ReportCreated"

4️⃣ EVENTBRIDGE DISPARA NOTIFICACIÓN
   Event: ReportCreated
   → Lambda sendNotify se ejecuta
   → Lee t_connections (todas las conexiones activas)
   → Filtra por rol y sector:
     * Autoridades del sector "Mantenimiento"
     * Administradores
   → Envía notificación via WebSocket a conexiones filtradas

5️⃣ AUTORIDAD RECIBE NOTIFICACIÓN
   WebSocket Message:
   {
     "type": "ReportCreated",
     "data": {
       "id_reporte": "uuid",
       "urgencia": "ALTA",
       "lugar": "Baño Torre 1 Piso 3",
       "descripcion": "Fuga de agua",
       "created_at": "2025-11-16T10:30:00Z"
     }
   }
```

---

### **FLUJO 2: Autoridad Actualiza Estado**

```
1️⃣ AUTORIDAD INICIA SESIÓN
   POST /auth/login
   {
     "email": "roberto.sanchez@utec.edu.pe",
     "password": "authority123"
   }
   → Recibe JWT token

2️⃣ AUTORIDAD CONECTA WEBSOCKET
   wss://endpoint/dev?token=JWT_TOKEN
   → Conexión guardada con user_role="authority"

3️⃣ AUTORIDAD ACTUALIZA ESTADO
   POST /reports/update-status
   Headers: Authorization: Bearer JWT_TOKEN
   {
     "id_reporte": "uuid-del-reporte",
     "nuevo_estado": "ATENDIENDO",
     "notas": "Personal en camino"
   }
   
   Validaciones:
   ✓ Token JWT válido
   ✓ Usuario existe en BD
   ✓ Rol = "authority" o "admin"
   ✓ Reporte existe
   ✓ Estado válido (PENDIENTE/ATENDIENDO/RESUELTO)
   
   Proceso:
   → Actualiza estado en t_reportes
   → Guarda assigned_to = user_id de la autoridad
   → Si estado = "RESUELTO", guarda resolved_at
   → Publica evento en EventBridge: "StatusUpdated"

4️⃣ EVENTBRIDGE DISPARA NOTIFICACIÓN
   Event: StatusUpdated
   → Lambda sendNotify se ejecuta
   → Lee t_connections
   → Filtra por:
     * author_id del reporte (el estudiante que lo creó)
     * Otras autoridades del mismo sector
     * Administradores
   → Envía notificación via WebSocket

5️⃣ ESTUDIANTE RECIBE NOTIFICACIÓN
   WebSocket Message:
   {
     "type": "StatusUpdated",
     "data": {
       "id_reporte": "uuid",
       "nuevo_estado": "ATENDIENDO",
       "notas": "Personal en camino",
       "updated_by": {
         "first_name": "Roberto",
         "last_name": "Sánchez"
       },
       "updated_at": "2025-11-16T10:45:00Z"
     }
   }
```

---

### **FLUJO 3: Resolución de Reporte**

```
1️⃣ AUTORIDAD MARCA COMO RESUELTO
   POST /reports/update-status
   Headers: Authorization: Bearer JWT_TOKEN
   {
     "id_reporte": "uuid",
     "nuevo_estado": "RESUELTO",
     "notas": "Problema solucionado exitosamente"
   }
   
   Proceso especial para RESUELTO:
   → estado = "RESUELTO"
   → resolved_at = timestamp actual
   → updated_at = timestamp actual
   
2️⃣ ESTUDIANTE RECIBE CONFIRMACIÓN
   WebSocket Message:
   {
     "type": "StatusUpdated",
     "data": {
       "id_reporte": "uuid",
       "nuevo_estado": "RESUELTO",
       "notas": "Problema solucionado exitosamente",
       "resolved_at": "2025-11-16T11:00:00Z"
     }
   }
```

---

## 📡 Notificaciones WebSocket

### **Lógica de Filtrado en sendNotify.py**

#### **Evento: ReportCreated**
```python
# Cuando se crea un reporte nuevo
should_notify = False

if user_role == 'authority':
    # Solo si el reporte es de su sector
    if report_sector == user_sector:
        should_notify = True

elif user_role == 'admin':
    # Admins ven todos los reportes
    should_notify = True

elif user_role == 'student':
    # Estudiantes NO reciben notificaciones de reportes creados
    should_notify = False
```

#### **Evento: StatusUpdated**
```python
# Cuando se actualiza un reporte
should_notify = False

if user_id == report_author_id:
    # El estudiante que creó el reporte
    should_notify = True
    message = "Tu reporte ha sido actualizado"

elif user_role == 'authority' and report_sector == user_sector:
    # Otras autoridades del mismo sector
    should_notify = True
    message = "Reporte actualizado en tu sector"

elif user_role == 'admin':
    # Admins ven todas las actualizaciones
    should_notify = True
```

---

## 🎯 Determinación Automática de Sector

```python
# En sendReport.py
sector_mapping = {
    'baño': 'Mantenimiento',
    'aula': 'Mantenimiento',
    'laboratorio': 'Mantenimiento',
    'auditorio': 'Mantenimiento',
    'sala_sum': 'Mantenimiento',
    'estacionamiento': 'Seguridad',
    'entrada': 'Seguridad',
    'patio': 'Limpieza',
    'jardin': 'Limpieza',
    'cafeteria': 'Servicios',
    'biblioteca': 'Servicios'
}

# Ejemplo:
lugar = {type: 'baño'} 
→ assigned_sector = 'Mantenimiento'
```

---

## 🔑 Credenciales de Prueba

### **Estudiantes**
```
Email: juan.perez@utec.edu.pe
Password: student123
Carrera: Ingeniería de Sistemas

Email: maria.gonzalez@utec.edu.pe
Password: student123
Carrera: Ingeniería Civil

Email: carlos.ramirez@utec.edu.pe
Password: student123
Carrera: Ingeniería Industrial

Email: ana.martinez@utec.edu.pe
Password: student123
Carrera: Ingeniería de Software

Email: luis.fernandez@utec.edu.pe
Password: student123
Carrera: Ingeniería Mecatrónica
```

### **Autoridades**
```
Email: roberto.sanchez@utec.edu.pe
Password: authority123
Sector: Mantenimiento
Cargo: Jefe de Mantenimiento

Email: patricia.diaz@utec.edu.pe
Password: authority123
Sector: Seguridad
Cargo: Jefe de Seguridad

Email: miguel.castro@utec.edu.pe
Password: authority123
Sector: Limpieza
Cargo: Supervisor de Limpieza

Email: elena.vargas@utec.edu.pe
Password: authority123
Sector: Servicios
Cargo: Coordinadora de Servicios

Email: jorge.rojas@utec.edu.pe
Password: authority123
Sector: Mantenimiento
Cargo: Técnico de Mantenimiento
```

### **Administradores**
```
Email: andrea.torres@utec.edu.pe
Password: admin123
Cargo: Directora de Operaciones

Email: fernando.jimenez@utec.edu.pe
Password: admin123
Cargo: Gerente de Infraestructura
```

---

## 🚀 Cómo Usar los Seeders

### **1. Poblar Lugares**
```bash
python scripts/seed_lugares.py
```

### **2. Poblar Usuarios**
```bash
python scripts/seed_users.py
```

### **3. Verificar en Postman**
```bash
# Login como estudiante
POST /auth/login
{
  "email": "juan.perez@utec.edu.pe",
  "password": "student123"
}

# Login como autoridad
POST /auth/login
{
  "email": "roberto.sanchez@utec.edu.pe",
  "password": "authority123"
}

# Login como admin
POST /auth/login
{
  "email": "andrea.torres@utec.edu.pe",
  "password": "admin123"
}
```

---

## 📊 Resumen de Permisos

| Acción | Estudiante | Autoridad | Admin |
|--------|------------|-----------|-------|
| Crear reporte | ✅ | ❌ | ❌ |
| Ver propios reportes | ✅ | N/A | N/A |
| Ver reportes del sector | ❌ | ✅ | ✅ (todos) |
| Actualizar estado | ❌ | ✅ | ✅ |
| Recibir notificaciones nuevos reportes | ❌ | ✅ (sector) | ✅ (todos) |
| Recibir actualizaciones propios reportes | ✅ | N/A | N/A |
| Conectar WebSocket | ✅ | ✅ | ✅ |
| Subir imágenes | ✅ | ❌ | ❌ |

---

## 🔐 Seguridad Implementada

1. **JWT Tokens:** Expiran en 7 días
2. **Validación compartida:** `utils/jwt_validator.py`
3. **Verificación de existencia:** Cada request valida que el usuario existe en BD
4. **Roles estrictos:** Cada endpoint valida el rol antes de ejecutar
5. **Passwords hasheados:** SHA-256
6. **CORS:** Configurado para `*` en desarrollo (restringir en producción)

---

¡El sistema está completamente documentado y listo para usar! 🎉
