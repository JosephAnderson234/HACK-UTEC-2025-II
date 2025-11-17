# Plan de Ejecución: Email de Bienvenida con EventBridge

## Objetivo
Enviar email de bienvenida automático cuando un usuario se registra, usando el patrón EventBridge ya implementado en `sendReport.py`.

## Flujo de Arquitectura
```
POST /auth/register 
  → auth.py (registra usuario + publica evento)
  → EventBridge (escucha evento "UserRegistered")
  → sendWelcomeEmail.py (genera email HTML por rol)
  → AWS SES (envía email)
```

## Archivos a Modificar

### 1. `functions/auth.py`
**Línea ~90-95** (después de `table.put_item()`)

Agregar publicación de evento:
```python
# Publicar evento de registro
try:
    events = boto3.client('events')
    events.put_events(
        Entries=[{
            'Source': 'utec-alerta.auth',
            'DetailType': 'UserRegistered',
            'Detail': json.dumps({
                'user_id': user_id,
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'role': role
            })
        }]
    )
except Exception as e:
    print(f"Error publicando evento: {str(e)}")
```

**Nota**: No fallar registro si evento falla.

---

### 2. `serverless.yml`
**Agregar función** (después de `sendNotify`):
```yaml
sendWelcomeEmail:
  handler: functions/sendWelcomeEmail.handler
  role: arn:aws:iam::533267422935:role/LabRole
  environment:
    SENDER_EMAIL: noreply@utec.edu.pe
  events:
    - eventBridge:
        pattern:
          source:
            - utec-alerta.auth
          detail-type:
            - UserRegistered
```

---

## Archivos a Crear

### 3. `functions/sendWelcomeEmail.py`
Estructura:
```python
import boto3
import json
import os

ses = boto3.client('ses')
SENDER_EMAIL = os.environ['SENDER_EMAIL']

def handler(event, context):
    """Recibe evento UserRegistered y envía email de bienvenida"""
    
def generate_email_html(first_name, last_name, role):
    """Genera HTML personalizado por rol"""
    # student: menciona reportar incidentes
    # authority: menciona gestión de reportes
    # admin: menciona administración completa
```

**Plantillas HTML por rol**:
- **Estudiante**: Crear reportes, ver mis reportes, seguimiento
- **Autoridad**: Gestionar reportes asignados, actualizar estados
- **Admin**: Control completo, asignaciones, usuarios

---

## Pasos de Configuración

### 4. AWS SES Setup
```bash
# Verificar email remitente (SANDBOX)
aws ses verify-email-identity --email-address noreply@utec.edu.pe

# Verificar estado
aws ses get-identity-verification-attributes \
  --identities noreply@utec.edu.pe
```

**Limitación Sandbox**:
- Solo 200 emails/día
- Solo a emails verificados
- **Producción**: Solicitar salida de sandbox (AWS Console → SES → Request production access)

---

## Plan de Testing

### Paso 1: Verificar email
```bash
aws ses verify-email-identity --email-address tu-email@utec.edu.pe
```
Revisar email y confirmar verificación.

### Paso 2: Deploy
```bash
serverless deploy
```

### Paso 3: Probar registro
```bash
# POST /auth/register con:
{
  "dni": "77777777",
  "first_name": "Test",
  "last_name": "Welcome",
  "email": "tu-email@utec.edu.pe",  # email verificado
  "password": "Test123!",
  "role": "student"
}
```

### Paso 4: Validar
1. ✅ Usuario creado en DynamoDB
2. ✅ Evento publicado en EventBridge (CloudWatch Logs → auth)
3. ✅ Lambda `sendWelcomeEmail` ejecutado (CloudWatch Logs)
4. ✅ Email recibido en bandeja de entrada

---

## Estimación de Tiempo
- Modificar `auth.py`: **5 min**
- Crear `sendWelcomeEmail.py`: **15 min**
- Actualizar `serverless.yml`: **5 min**
- Setup AWS SES: **10 min** (incluye verificación)
- Testing completo: **10 min**

**Total**: ~45 minutos

---

## Costos Estimados
- EventBridge: $0.001 por 1,000 eventos = **~$0.00001/registro**
- SES Sandbox: **GRATIS** (hasta 200 emails/día)
- SES Producción: $0.10 por 1,000 emails = **~$0.0001/email**

**Costo total por registro**: ~$0.00011 (insignificante)

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Email no verificado | Verificar antes de probar, documentar proceso |
| Sandbox limita testing | Usar emails verificados, solicitar producción después |
| Fallo en SES no debe bloquear registro | Wrappear evento en try-catch en auth.py |
| Plantilla incorrecta por rol | Validar HTML generado para los 3 roles |

---

## Próximos Pasos (Después de Implementación)
1. Solicitar salida de Sandbox SES (producción)
2. Agregar templates más elaborados (con imágenes)
3. Implementar preferencias de notificación (opt-out)
4. Métricas: tasa de apertura, clicks (SES + SNS)
