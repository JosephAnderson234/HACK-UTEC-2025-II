# 📮 Guía de Uso - Colección Postman UTEC Alerta

## 🚀 Configuración Inicial

### 1️⃣ Importar la Colección

1. Abrir Postman
2. Click en **Import** (esquina superior izquierda)
3. Seleccionar el archivo `UTEC_Alerta_API.postman_collection.json`
4. Click en **Import**

### 2️⃣ Configurar Variables de Entorno

La colección usa variables que debes configurar:

#### Variables que DEBES configurar manualmente:

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `base_url` | URL de tu API Gateway REST | `https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev` |
| `ws_url` | URL de tu API Gateway WebSocket | `wss://xyz456abc.execute-api.us-east-1.amazonaws.com/dev` |

#### Variables que se configuran automáticamente:

Estas variables se guardan automáticamente al hacer login:

- `student_token` - Token JWT del estudiante
- `authority_token` - Token JWT de autoridad
- `admin_token` - Token JWT de administrador
- `student_id` - ID del estudiante
- `authority_id` - ID de autoridad
- `admin_id` - ID de administrador
- `last_report_id` - ID del último reporte creado

### 3️⃣ Obtener las URLs del API Gateway

Ejecuta en tu terminal (dentro del directorio `backend`):

```bash
# Desplegar el proyecto
serverless deploy

# Al finalizar verás algo como:
# endpoints:
#   POST - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/auth/register
#   ...
```

Copia la URL base (sin el path) y configúrala en Postman.

---

## 🎯 Flujo de Prueba Recomendado

### Paso 1: Autenticación

#### 🔐 Login como Estudiante
```
Carpeta: 🔓 Auth - Autenticación
Request: Login Student
```
**Credenciales de prueba:**
- Email: `juan.perez@utec.edu.pe`
- Password: `student123`

✅ **Auto-guarda** el `student_token` en las variables

---

#### 🔐 Login como Autoridad
```
Request: Login Authority
```
**Credenciales de prueba:**
- Email: `roberto.sanchez@utec.edu.pe` (Jefe de Mantenimiento)
- Password: `authority123`

✅ **Auto-guarda** el `authority_token` en las variables

---

#### 🔐 Login como Admin
```
Request: Login Admin
```
**Credenciales de prueba:**
- Email: `andrea.torres@utec.edu.pe` (Directora de Operaciones)
- Password: `admin123`

✅ **Auto-guarda** el `admin_token` en las variables

---

### Paso 2: Crear Reportes (Estudiante)

#### 📝 Crear Reporte con Imagen
```
Carpeta: 👨‍🎓 Student - Reportes
Request: Create Report (con imagen)
```

Usa el token del estudiante (ya configurado automáticamente).

✅ **Auto-guarda** el `last_report_id` para usarlo en otros requests

**Body incluye:**
- `lugar_id`: ID del lugar (ej: Baño Torre 1 Piso 3)
- `urgencia`: BAJA, MEDIA o ALTA
- `descripcion`: Texto descriptivo
- `image`: Base64 de la imagen (opcional)

---

### Paso 3: Consultar Reportes

#### 👨‍🎓 Ver Mis Reportes (Estudiante)
```
Request: Get My Reports (all)
```

Retorna todos los reportes del estudiante autenticado con:
- **Paginación** (page, size)
- **Filtros** (estado, urgencia)
- **Ordenamiento** (orderBy, order)

---

#### 👷 Ver Reportes de Mi Sector (Autoridad)
```
Carpeta: 👷 Authority - Gestión de Reportes
Request: Get Reports (authority view - sector)
```

La autoridad solo ve reportes de su sector (ej: Mantenimiento).

---

### Paso 4: Gestión por Autoridad

#### 1️⃣ Tomar Reporte (Auto-asignación)
```
Request: Take Report (self-assign)
```

La autoridad se asigna a sí misma un reporte de su sector.

---

#### 2️⃣ Actualizar Estado a ATENDIENDO
```
Request: Update Status to ATENDIENDO
```

Cambia el estado y agrega comentario:
```json
{
  "id_reporte": "{{last_report_id}}",
  "estado": "ATENDIENDO",
  "comentario": "Personal en camino"
}
```

---

#### 3️⃣ Resolver Reporte
```
Request: Update Status to RESUELTO
```

Marca como resuelto con comentario de cierre:
```json
{
  "id_reporte": "{{last_report_id}}",
  "estado": "RESUELTO",
  "comentario": "Problema solucionado"
}
```

---

### Paso 5: Administración Completa (Admin)

#### 🔍 Ver Todos los Reportes
```
Carpeta: 👔 Admin - Administración Completa
Request: Get All Reports (admin view)
```

El admin ve **TODOS** los reportes sin restricción de sector.

---

#### 📌 Asignar Reporte Manualmente
```
Request: Assign Report to Authority
```

El admin puede asignar cualquier reporte a cualquier autoridad:
```json
{
  "id_reporte": "{{last_report_id}}",
  "assigned_to": "{{authority_id}}"
}
```

---

#### 🔍 Búsqueda Avanzada
```
Request: Get Reports (text search)
Request: Get Reports (complex filters)
```

Filtros disponibles:
- `term` - Búsqueda de texto (descripción, lugar)
- `estado` - PENDIENTE, ATENDIENDO, RESUELTO
- `urgencia` - BAJA, MEDIA, ALTA
- `assigned_sector` - Mantenimiento, Seguridad, Limpieza, Servicios
- `orderBy` - Campo para ordenar (created_at, urgencia, etc.)
- `order` - asc o desc

---

## 📋 IDs Útiles (desde seed)

### Lugares:
```
550e8400-e29b-41d4-a716-446655440001 - Baño torre 1 piso 3
550e8400-e29b-41d4-a716-446655440002 - Aula A101
550e8400-e29b-41d4-a716-446655440003 - Laboratorio de Cómputo L201
550e8400-e29b-41d4-a716-446655440007 - Cafetería Principal
550e8400-e29b-41d4-a716-446655440008 - Biblioteca Central
```

### Usuarios de Prueba:

| Rol | Email | Password | Sector |
|-----|-------|----------|--------|
| Estudiante | juan.perez@utec.edu.pe | student123 | - |
| Estudiante | maria.gonzalez@utec.edu.pe | student123 | - |
| Autoridad | roberto.sanchez@utec.edu.pe | authority123 | Mantenimiento |
| Autoridad | patricia.diaz@utec.edu.pe | authority123 | Seguridad |
| Autoridad | miguel.castro@utec.edu.pe | authority123 | Limpieza |
| Admin | andrea.torres@utec.edu.pe | admin123 | Administración |

---

## 🧪 Tests Automáticos

La colección incluye tests automáticos que:

✅ Verifican códigos de estado HTTP válidos  
✅ Validan tiempo de respuesta < 5s  
✅ Comprueban formato JSON  
✅ Auto-guardan tokens en variables de entorno  
✅ Auto-guardan IDs de reportes creados  

**Ver resultados:** Después de cada request, check la pestaña **Test Results** en Postman.

---

## 🔄 Flujo Completo de Testing

### Escenario: Reportar y Resolver Fuga de Agua

1. **Login Student** → Guarda `student_token`
2. **Create Report (con imagen)** → Reporte de fuga en baño T1P3 → Guarda `last_report_id`
3. **Get My Reports** → Verificar que aparece el reporte
4. **Login Authority** → Guarda `authority_token` (Jefe Mantenimiento)
5. **Get Reports (authority view)** → Ver reporte en sector Mantenimiento
6. **Take Report** → Auto-asignarse el reporte
7. **Update Status to ATENDIENDO** → "Personal en camino"
8. **Get Assigned Reports** → Verificar reporte en mis asignados
9. **Update Status to RESUELTO** → "Fuga reparada"
10. **Login Student** → Usar `student_token` guardado
11. **Get Report Detail** → Verificar estado RESUELTO con comentarios

---

## 🎨 Características de la Colección

### ✨ Auto-guardado de Tokens
Todos los endpoints de login guardan automáticamente el token en la variable correspondiente (`student_token`, `authority_token`, `admin_token`).

### 🔗 Variables Dinámicas
Usa `{{last_report_id}}` en los requests que necesitan un ID de reporte sin copiarlo manualmente.

### 📊 Organización por Rol
Los requests están organizados en carpetas según el rol que los puede ejecutar:
- 🔓 Auth (público)
- 👨‍🎓 Student
- 👷 Authority
- 👔 Admin
- 🔍 Shared (todos los roles)

### 🧪 Tests Globales
Todos los requests ejecutan tests automáticos para validar respuestas.

---

## 🚨 Troubleshooting

### ❌ Error 401 Unauthorized
**Causa:** Token expirado o inválido  
**Solución:** Hacer login nuevamente

### ❌ Error 403 Forbidden
**Causa:** Rol sin permisos para el endpoint  
**Solución:** Usar el token correcto según el rol requerido

### ❌ Error 404 Not Found
**Causa:** `last_report_id` no existe  
**Solución:** Crear un reporte primero con "Create Report"

### ❌ Error 500 Internal Server Error
**Causa:** Error en el servidor  
**Solución:** Verificar logs de Lambda en CloudWatch

---

## 📚 Recursos Adicionales

- **Documentación API:** `API_ENDPOINTS.md`
- **Arquitectura:** `resumen_ruta_elaborada.md`
- **Schema DynamoDB:** Ver `resources/dynamodb-tables.yml`

---

## 🤝 Contribución

Para agregar nuevos requests:

1. Crear el request en la carpeta apropiada según el rol
2. Agregar tests automáticos si aplica
3. Usar variables en lugar de valores hardcodeados
4. Documentar en la descripción del request

---

**¡Listo para probar! 🚀**

Para cualquier duda, revisar la documentación completa en `API_ENDPOINTS.md`.
