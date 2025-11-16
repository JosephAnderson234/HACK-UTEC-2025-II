# Arquitectura: Email de Bienvenida con EventBridge + SNS

## Flujo Completo desde el Registro

```
┌─────────────┐
│   Cliente   │
│  (Postman)  │
└──────┬──────┘
       │
       │ POST /auth/register
       │ {
       │   "first_name": "Leonardo",
       │   "email": "leonardo.sanchez.t@utec.edu.pe",
       │   "role": "student",
       │   ...
       │ }
       ▼
┌──────────────────────────────────────────────┐
│          API Gateway (REST API)              │
└──────┬───────────────────────────────────────┘
       │
       │ HTTP Event
       ▼
┌──────────────────────────────────────────────┐
│       Lambda: auth.py (register)             │
│  ┌────────────────────────────────────────┐  │
│  │ 1. Validar datos                       │  │
│  │ 2. Verificar email único               │  │
│  │ 3. Hash password                       │  │
│  │ 4. Guardar en DynamoDB (t_usuarios)    │  │
│  │ 5. Publicar evento EventBridge ✅      │  │
│  │ 6. Generar JWT                         │  │
│  │ 7. Responder 201 (no espera email)    │  │
│  └────────────────────────────────────────┘  │
└──────┬───────────────────────────────────────┘
       │                                    │
       │ ✅ 201 Created                     │ ⚡ Asíncrono
       │ {"token": "...", "user": {...}}    │
       ▼                                    ▼
┌─────────────┐              ┌──────────────────────────────┐
│   Cliente   │              │   AWS EventBridge (Event Bus)│
│  Recibe OK  │              │                              │
└─────────────┘              │  Event:                      │
                             │  {                           │
                             │    "source": "utec-alerta.auth",
                             │    "detail-type": "UserRegistered",
                             │    "detail": {               │
                             │      "user_id": "uuid",      │
                             │      "email": "...",         │
                             │      "first_name": "...",    │
                             │      "last_name": "...",     │
                             │      "role": "student"       │
                             │    }                         │
                             │  }                           │
                             └──────┬───────────────────────┘
                                    │
                                    │ Event Pattern Match:
                                    │ source: utec-alerta.auth
                                    │ detail-type: UserRegistered
                                    ▼
                   ┌──────────────────────────────────────────┐
                   │  Lambda: sendWelcomeEmail.py             │
                   │  ┌────────────────────────────────────┐  │
                   │  │ 1. Extraer datos del evento        │  │
                   │  │ 2. Validar email, nombre, rol      │  │
                   │  │ 3. generate_email_text(role)       │  │
                   │  │ 4. get_email_subject(role)         │  │
                   │  │ 5. sns.publish(Topic)              │  │
                   │  │ 6. Log MessageId                   │  │
                   │  └────────────────────────────────────┘  │
                   └──────┬───────────────────────────────────┘
                          │
                          │ sns.publish()
                          ▼
              ┌─────────────────────────────────────┐
              │   AWS SNS Topic                     │
              │   "WelcomeEmailTopic"               │
              │                                     │
              │   TopicArn:                         │
              │   utec-alerta-dev-welcome-email-topic
              └──────┬──────────────────────────────┘
                     │
                     │ Message Distribution
                     │
          ┏━━━━━━━━━━┻━━━━━━━━━━━━━━━━┓
          ▼                            ▼
┌────────────────────┐      ┌────────────────────────┐
│  Email Subscription│      │  Otras Suscripciones   │
│                    │      │  (futuras)             │
│  leonardo.sanchez  │      │                        │
│  .t@utec.edu.pe    │      │  - SMS                 │
│                    │      │  - Lambda logging      │
│  Status: Confirmed │      │  - Slack webhook       │
└────────┬───────────┘      └────────────────────────┘
         │
         │ Email delivery
         ▼
┌─────────────────────────────────────────────────┐
│          📧 Bandeja de Entrada                  │
│                                                 │
│  De: AWS Notifications                          │
│  Asunto: ¡Bienvenido a UTEC Alerta! 🎓        │
│                                                 │
│  ╔══════════════════════════════════════╗      │
│  ║     UTEC ALERTA - BIENVENIDO/A      ║      │
│  ╚══════════════════════════════════════╝      │
│                                                 │
│  ESTUDIANTE: Leonardo Sanchez                   │
│                                                 │
│  Tu cuenta de estudiante ha sido creada...     │
│                                                 │
│  ¿Qué puedes hacer?                            │
│  • Crear reportes de incidentes               │
│  • Seguimiento en tiempo real                 │
│  • Adjuntar evidencias                        │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

---

## Componentes de la Arquitectura

### 1. **API Gateway + Lambda (auth.py)**
- **Función**: Procesar registro de usuarios
- **Responsabilidad**: 
  - Validación de datos
  - Persistencia en DynamoDB
  - Publicación de evento asíncrono
- **Respuesta**: Inmediata (201) sin esperar email

### 2. **EventBridge (Event Bus)**
- **Función**: Desacoplar servicios
- **Event Source**: `utec-alerta.auth`
- **Event Type**: `UserRegistered`
- **Ventaja**: Múltiples consumidores pueden escuchar el evento

### 3. **Lambda (sendWelcomeEmail.py)**
- **Trigger**: EventBridge pattern match
- **Función**: Generar y enviar notificación de bienvenida
- **Personalización**: Contenido basado en rol (student/authority/admin)

### 4. **SNS Topic**
- **Función**: Distribución de mensajes multi-protocolo
- **Suscripciones**: Email, SMS, Lambda, HTTP/S
- **Ventaja**: Escalable, múltiples destinatarios

---

## Datos que Fluyen

### Event: auth.py → EventBridge
```json
{
  "version": "0",
  "id": "event-uuid",
  "source": "utec-alerta.auth",
  "detail-type": "UserRegistered",
  "time": "2025-11-16T10:30:00Z",
  "region": "us-east-1",
  "account": "292984540358",
  "detail": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "leonardo.sanchez.t@utec.edu.pe",
    "first_name": "Leonardo",
    "last_name": "Sanchez",
    "role": "student"
  }
}
```

### Message: sendWelcomeEmail.py → SNS
```json
{
  "TopicArn": "arn:aws:sns:us-east-1:...:utec-alerta-dev-welcome-email-topic",
  "Subject": "¡Bienvenido a UTEC Alerta! 🎓",
  "Message": "╔══════════════════════╗\n║ UTEC ALERTA - BIENVENIDO/A ║...",
  "MessageAttributes": {
    "role": {
      "DataType": "String",
      "StringValue": "student"
    },
    "user_email": {
      "DataType": "String",
      "StringValue": "leonardo.sanchez.t@utec.edu.pe"
    }
  }
}
```

---

## Ventajas de Esta Arquitectura

### ✅ Desacoplamiento
- `auth.py` no conoce a `sendWelcomeEmail.py`
- Pueden cambiar/fallar independientemente
- Fácil agregar más suscriptores

### ✅ Asincronía
- Registro responde en ~200ms (no espera email)
- Email se envía en ~3-5 segundos (background)
- Si SNS falla, el registro ya está completo

### ✅ Escalabilidad
- EventBridge maneja millones de eventos
- SNS distribuye a múltiples destinos
- Sin código adicional para nuevos canales

### ✅ Trazabilidad
- CloudWatch Logs por cada Lambda
- SNS Message ID para tracking
- EventBridge replay si necesario

---

## Comparación con Arquitectura Anterior (SES)

| Aspecto | SES (bloqueado) | SNS (implementado) |
|---------|-----------------|-------------------|
| **Servicio** | AWS SES | AWS SNS |
| **Permiso** | ❌ No disponible en Academy | ✅ Disponible en Academy |
| **Formato** | HTML + Texto | Texto plano |
| **Destinos** | Solo email | Email, SMS, Lambda, HTTP |
| **Verificación** | Email sender + recipient | Solo suscripción |
| **Costo** | $0.10 / 1000 emails | $0.50 / 1M requests |
| **Sandbox** | Sí (200/día) | No (sin límite) |

---

## Recursos de AWS Creados

```yaml
# serverless.yml - Resources section
WelcomeEmailTopic:
  Type: AWS::SNS::Topic
  Properties:
    TopicName: utec-alerta-dev-welcome-email-topic
    DisplayName: UTEC Alerta - Welcome Email Notifications
```

### ARN resultante:
```
arn:aws:sns:us-east-1:292984540358:utec-alerta-dev-welcome-email-topic
```

---

## Testing y Monitoreo

### CloudWatch Logs para Debugging:

**auth.py** - Confirmar evento publicado:
```bash
serverless logs -f register --tail
```
Buscar: `UserRegistered event published for user <uuid>`

**sendWelcomeEmail.py** - Confirmar SNS publish:
```bash
serverless logs -f sendWelcomeEmail --tail
```
Buscar: `Welcome notification sent to SNS for <email>. MessageId: <id>`

### SNS Metrics en CloudWatch:
- `NumberOfMessagesPublished`
- `NumberOfNotificationsDelivered`
- `NumberOfNotificationsFailed`

---

## Evolución Futura

### Fácilmente se puede agregar:

1. **SMS Notifications** (cuando usuario no tiene email)
2. **Slack/Discord webhook** (notificar al equipo)
3. **Lambda de Analytics** (registrar métricas de onboarding)
4. **DLQ (Dead Letter Queue)** (reintentar fallos)
5. **Cambiar a SES** (cuando salgas de Academy, solo cambiar el código de sendWelcomeEmail.py)

---

## Patrón Replicable

Este mismo patrón se usa en:
- ✅ `sendReport.py` → EventBridge → `sendNotify.py` (ya implementado)
- ✅ `auth.py` → EventBridge → `sendWelcomeEmail.py` (nuevo)
- 🔮 Futuro: `updateUser.py` → EventBridge → `sendUpdateNotification.py`
