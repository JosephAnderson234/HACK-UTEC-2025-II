# 🔄 Cambio: image_url - S3 URI → HTTP Pre-Signed URLs

**Fecha:** 16 Noviembre 2025  
**Issue:** Frontend no puede consumir URLs en formato `s3://bucket/key`  
**Solución:** Generar URLs HTTP firmadas temporales con boto3

---

## 🎯 Problema Identificado

### ❌ Antes (INCORRECTO)
```json
{
  "id_reporte": "abc-123",
  "image_url": "s3://utec-alerta-bucket/reports/xyz-456.jpg"
}
```

**Problema:** El formato `s3://` no es accesible desde navegadores web. Frontend no puede renderizar imágenes en `<img src="">`.

### ✅ Después (CORRECTO)
```json
{
  "id_reporte": "abc-123",
  "image_url": "https://utec-alerta-bucket.s3.amazonaws.com/reports/xyz-456.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAEXAMPLE...&X-Amz-Date=20251116T150000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=..."
}
```

**Solución:** URL HTTP firmada válida por 1 hora, consumible directamente por frontend.

---

## 📝 Cambios Implementados

### 1️⃣ Nuevo Helper: `utils/s3_helper.py`

**Funciones creadas:**

#### `generate_presigned_url(s3_key_or_url, expiration=3600)`
- Genera URL HTTP firmada para acceso temporal a S3
- Acepta formato `s3://bucket/key` o solo `key`
- Expira en 1 hora (3600 segundos)
- Retorna `None` si hay error

#### `add_image_urls_to_report(report: dict)`
- Transforma campo `image_url` de S3 URI a HTTP en un reporte
- Maneja `None` y valores vacíos

#### `add_image_urls_to_reports(reports: list)`
- Aplica transformación a lista de reportes
- Uso en endpoints que retornan múltiples reportes

---

### 2️⃣ Modificaciones en Lambdas

#### **functions/sendReport.py** (POST /reports/create)
**Cambio:** Línea 109
```python
# ❌ ANTES
image_url = f"s3://{bucket_name}/{image_key}"

# ✅ DESPUÉS
image_url = generate_presigned_url(image_key)
if not image_url:
    return create_response(500, {
        'error': 'No se pudo generar URL de acceso a la imagen'
    })
```

**Importación agregada:**
```python
from utils.s3_helper import generate_presigned_url
```

**Comportamiento:**
- Genera URL HTTP firmada al momento de crear el reporte
- Valida que la URL se generó correctamente
- Retorna error 500 si falla la generación

---

#### **functions/getMyReports.py** (GET /reports/my-reports)
**Cambio:** Antes de paginación
```python
# ✅ AGREGADO
enriched_reports = add_image_urls_to_reports(enriched_reports)
```

**Importación agregada:**
```python
from utils.s3_helper import add_image_urls_to_reports
```

**Comportamiento:**
- Convierte S3 URIs almacenados a URLs HTTP antes de paginar
- Cada request genera nuevas URLs firmadas (renovación automática)

---

#### **functions/getReports.py** (GET /reports)
**Cambio:** Antes de paginación
```python
# ✅ AGREGADO
enriched_reports = add_image_urls_to_reports(enriched_reports)
```

**Importación agregada:**
```python
from utils.s3_helper import add_image_urls_to_reports
```

**Comportamiento:**
- Aplica transformación después de enriquecer con author/assigned names
- Garantiza URLs frescas en cada consulta

---

#### **functions/getReportDetail.py** (GET /reports/:id)
**Cambio:** Antes de retornar response
```python
# ✅ AGREGADO
report = add_image_urls_to_report(report)
```

**Importación agregada:**
```python
from utils.s3_helper import add_image_urls_to_report
```

**Comportamiento:**
- Transforma S3 URI a HTTP en reporte individual
- Usa función singular (no lista)

---

#### **functions/getAssignedReports.py** (GET /reports/assigned-to-me)
**Cambio:** Antes de paginación
```python
# ✅ AGREGADO
enriched_reports = add_image_urls_to_reports(enriched_reports)
```

**Importación agregada:**
```python
from utils.s3_helper import add_image_urls_to_reports
```

**Comportamiento:**
- Convierte URLs para reportes asignados a autoridad
- Misma lógica que getMyReports

---

### 3️⃣ Documentación Actualizada

#### **API_ENDPOINTS.md**
- ✅ Todos los ejemplos de `image_url` ahora muestran URLs HTTP
- ✅ Agregada sección: **"🖼️ Gestión de Imágenes con Pre-Signed URLs"**
- ✅ Incluye características de seguridad y ejemplos de uso en frontend

#### **resumen_ruta_elaborada.md**
- ✅ Actualizado formato de `image_url` con nota de expiración

#### **docs/API_REQUESTS.md**
- ✅ Corregido formato de response con URLs HTTP

#### **ARCHITECTURE.md**
- ✅ Actualizado diagrama de estructura de datos

---

## 🔐 Características de Seguridad

### Pre-Signed URLs
| Propiedad | Valor |
|-----------|-------|
| **Expiración** | 3600 segundos (1 hora) |
| **Algoritmo** | AWS4-HMAC-SHA256 |
| **Renovación** | Automática en cada GET request |
| **Acceso público** | Solo durante período de validez |
| **Credenciales** | Embebidas en firma de URL |

### Ventajas
✅ **Sin autenticación adicional:** Frontend no necesita pasar JWT para descargar imagen  
✅ **Temporal:** URL expira automáticamente después de 1 hora  
✅ **Seguro:** No expone credenciales AWS permanentes  
✅ **Escalable:** S3 maneja el tráfico de imágenes  

### Consideraciones
⚠️ **Caché frontend:** Si imagen se cachea, URL puede expirar (refrescar reporte para nueva URL)  
⚠️ **Compartir URLs:** URLs pueden ser compartidas mientras sean válidas  
⚠️ **DynamoDB:** Sigue guardando claves S3 (`reports/uuid.jpg`), no URLs HTTP  

---

## 📊 Flujo de Datos

### Creación de Reporte (POST)
```
1. Frontend envía imagen en base64
2. Lambda sube a S3 (key: "reports/uuid.jpg")
3. Lambda genera presigned URL HTTP
4. Lambda guarda key en DynamoDB (NO la URL HTTP)
5. Response al frontend con URL HTTP firmada
```

### Consulta de Reportes (GET)
```
1. Frontend solicita reportes
2. Lambda consulta DynamoDB (obtiene keys S3)
3. Lambda transforma keys → presigned URLs HTTP
4. Response al frontend con URLs HTTP firmadas (válidas 1h)
5. Frontend usa URLs directamente en <img src="">
```

---

## 🧪 Testing

### Verificar Funcionamiento

#### 1. Crear Reporte con Imagen
```bash
curl -X POST https://api.utec-alerta.com/reports/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lugar_id": "uuid",
    "urgencia": "ALTA",
    "descripcion": "Test imagen",
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

**Validar:**
- ✅ Response incluye `image_url` en formato `https://...?X-Amz-...`
- ✅ URL es accesible desde navegador (sin autenticación)
- ✅ Imagen se visualiza correctamente

#### 2. Consultar Reportes
```bash
curl -X GET "https://api.utec-alerta.com/reports/my-reports" \
  -H "Authorization: Bearer $TOKEN"
```

**Validar:**
- ✅ Todos los reportes tienen `image_url` en formato HTTP
- ✅ No aparecen URLs con formato `s3://`
- ✅ Cada URL es única (con firma diferente)

#### 3. Verificar Expiración
```bash
# Copiar URL de image_url
curl "https://bucket.s3.amazonaws.com/reports/abc.jpg?X-Amz-..."

# Esperar >1 hora y volver a intentar
# ❌ Debe fallar con error 403 Forbidden
```

---

## 🚀 Deploy

### Pasos para Despliegue

1. **Commit cambios:**
```bash
git add functions/ utils/ *.md
git commit -m "feat: convert image_url from S3 URI to HTTP presigned URLs"
```

2. **Push a feature branch:**
```bash
git push origin feature/endpoints-implementation
```

3. **Deploy con Serverless:**
```bash
cd /home/leonardo/Cursos/Cloud/hackaton/HACK-UTEC-2025-II/backend
serverless deploy --stage dev
```

4. **Verificar CloudWatch Logs:**
```bash
serverless logs -f sendReport --tail
serverless logs -f getMyReports --tail
```

---

## 📋 Checklist de Validación

### Código
- [x] Helper `s3_helper.py` creado con 3 funciones
- [x] `sendReport.py` genera URLs HTTP al crear reporte
- [x] `getMyReports.py` transforma URLs antes de paginar
- [x] `getReports.py` transforma URLs antes de paginar
- [x] `getReportDetail.py` transforma URL en reporte individual
- [x] `getAssignedReports.py` transforma URLs antes de paginar
- [x] Todas las importaciones agregadas correctamente

### Documentación
- [x] `API_ENDPOINTS.md` - Ejemplos actualizados con URLs HTTP
- [x] `API_ENDPOINTS.md` - Sección de gestión de imágenes agregada
- [x] `resumen_ruta_elaborada.md` - Formato corregido
- [x] `docs/API_REQUESTS.md` - Responses actualizados
- [x] `ARCHITECTURE.md` - Diagrama actualizado
- [x] `CHANGELOG_IMAGE_URLS.md` - Documento creado

### Testing Pendiente
- [ ] Crear reporte con imagen y verificar URL HTTP
- [ ] Consultar reportes y validar que todas las URLs sean HTTP
- [ ] Verificar que URLs expiran después de 1 hora
- [ ] Validar frontend puede consumir URLs directamente
- [ ] Verificar error 500 si falla generación de URL

---

## 🔧 Troubleshooting

### Error: "No se pudo generar URL de acceso a la imagen"
**Causa:** boto3 no puede generar presigned URL  
**Solución:**
1. Verificar permisos IAM de Lambda: `s3:GetObject`
2. Verificar que BUCKET_INGESTA existe
3. Revisar CloudWatch Logs para error específico

### Frontend recibe URLs pero expiran rápido
**Causa:** Caché de frontend guarda URL expirada  
**Solución:**
- Refrescar lista de reportes periódicamente
- No cachear campo `image_url` más de 45 minutos
- Implementar lógica de refetch en error 403

### URLs no son accesibles desde navegador
**Causa:** Bucket S3 tiene políticas restrictivas  
**Solución:**
- Presigned URLs no requieren permisos públicos en bucket
- Verificar que Lambda tiene rol con permisos `s3:GetObject`
- Revisar CORS del bucket si hay problemas desde frontend

---

## 📚 Referencias

- [AWS S3 Pre-Signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [boto3 generate_presigned_url](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html#S3.Client.generate_presigned_url)
- [Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

---

**Autor:** GitHub Copilot  
**Proyecto:** UTEC Alerta - Sistema de Reportes  
**Status:** ✅ Implementado y Documentado
