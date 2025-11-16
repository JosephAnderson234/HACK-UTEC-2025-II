import boto3
import json
import os
from datetime import datetime

sns = boto3.client('sns', region_name='us-east-1')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN', '')


def handler(event, context):
    """
    Recibe evento UserRegistered desde EventBridge y envía email de bienvenida.
    
    Event format:
    {
        "source": "utec-alerta.auth",
        "detail-type": "UserRegistered",
        "detail": {
            "user_id": "uuid",
            "email": "user@utec.edu.pe",
            "first_name": "John",
            "last_name": "Doe",
            "role": "student"
        }
    }
    """
    try:
        print(f"Received event: {json.dumps(event)}")
        
        # Extraer datos del evento
        detail = event.get('detail', {})
        user_email = detail.get('email')
        first_name = detail.get('first_name')
        last_name = detail.get('last_name')
        role = detail.get('role')
        
        # Validar datos requeridos
        if not all([user_email, first_name, role]):
            print(f"Missing required data in event: email={user_email}, first_name={first_name}, role={role}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required data in event'})
            }
        
        # Generar contenido del email según el rol
        email_text = generate_email_text(first_name, last_name, role)
        subject = get_email_subject(role)
        
        # Publicar en SNS Topic (simula envío de email)
        response = sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=email_text,
            MessageAttributes={
                'role': {'DataType': 'String', 'StringValue': role},
                'user_email': {'DataType': 'String', 'StringValue': user_email}
            }
        )
        
        print(f"Welcome notification sent to SNS for {user_email}. MessageId: {response['MessageId']}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Welcome notification sent successfully via SNS',
                'messageId': response['MessageId']
            })
        }
    
    except Exception as e:
        print(f"Error sending welcome email: {str(e)}")
        # No fallar el flujo completo si el email falla
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Failed to send email: {str(e)}'})
        }


def get_email_subject(role):
    """Retorna el asunto del email según el rol"""
    subjects = {
        'student': '¡Bienvenido a UTEC Alerta! 🎓',
        'authority': 'Acceso a UTEC Alerta - Personal Autorizado 👮',
        'admin': 'Panel de Administración - UTEC Alerta 🔐'
    }
    return subjects.get(role, '¡Bienvenido a UTEC Alerta!')


def generate_email_text(first_name, last_name, role):
    """
    Genera el texto del email personalizado según el rol.
    Formato texto plano para SNS (compatible con email/SMS)
    """
    
    # Contenido específico por rol
    role_content = get_role_content(role)
    
    # Construir mensaje de texto
    message = f"""
╔══════════════════════════════════════╗
║     UTEC ALERTA - BIENVENIDO/A      ║
╚══════════════════════════════════════╝

{role_content['badge_text'].upper()}: {first_name} {last_name}

{role_content['greeting']}

{role_content['features_title']}
{role_content['features_text']}

💡 CONSEJO:
{role_content['tip']}

────────────────────────────────────────
UTEC Alerta - Sistema de Gestión de Incidencias
Universidad de Ingeniería y Tecnología

Este es un correo automático del sistema.
"""
    return message.strip()


def generate_email_html(first_name, last_name, role):
    """
    Genera el HTML del email personalizado según el rol.
    Colores corporativos: Azul #1E40AF, Verde #10B981, Rojo #EF4444
    (Mantenido para referencia/futuro con SES)
    """
    
    # Contenido específico por rol
    role_content = get_role_content(role)
    
    html = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a UTEC Alerta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Container principal -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- Header con gradiente -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 40px 40px 80px 40px; text-align: center; position: relative;">
                            <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                                UTEC Alerta
                            </h1>
                            <p style="color: #BFDBFE; font-size: 16px; margin: 0; font-weight: 500;">
                                Sistema de Gestión de Incidencias
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Badge de rol -->
                    <tr>
                        <td style="padding: 0 40px; margin-top: -40px; position: relative;">
                            <div style="background-color: {role_content['badge_color']}; color: white; padding: 12px 24px; border-radius: 24px; display: inline-block; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); margin-left: 20px;">
                                {role_content['badge_text']}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Contenido principal -->
                    <tr>
                        <td style="padding: 40px 40px 32px 40px;">
                            <h2 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                                ¡Hola, {first_name}! 👋
                            </h2>
                            <p style="color: #6B7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                                {role_content['greeting']}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Características -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                {role_content['features_title']}
                            </h3>
                            {role_content['features_html']}
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px; text-align: center;">
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); border-radius: 8px; padding: 16px 40px;">
                                        <a href="#" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                            Acceder al Sistema
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                        <td style="padding: 0 40px;">
                            <div style="border-top: 1px solid #E5E7EB; margin: 20px 0;"></div>
                        </td>
                    </tr>
                    
                    <!-- Info adicional -->
                    <tr>
                        <td style="padding: 24px 40px 40px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="background-color: #F3F4F6; border-radius: 8px; padding: 20px;">
                                        <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0;">
                                            <strong style="color: #111827;">💡 Consejo:</strong> {role_content['tip']}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 32px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
                            <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                                <strong style="color: #111827;">UTEC Alerta</strong> - Sistema de Gestión de Incidencias
                            </p>
                            <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 16px 0;">
                                Universidad de Ingeniería y Tecnología
                            </p>
                            <p style="color: #9CA3AF; font-size: 11px; margin: 0; line-height: 1.5;">
                                Este es un correo automático, por favor no responder.<br>
                                Si tienes alguna duda, contacta al soporte técnico.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return html


def get_role_content(role):
    """Retorna el contenido específico según el rol del usuario"""
    
    content = {
        'student': {
            'badge_text': 'Estudiante',
            'badge_color': '#3B82F6',
            'greeting': 'Tu cuenta de estudiante ha sido creada exitosamente. Ahora puedes reportar incidencias en el campus y ayudar a mantener un ambiente seguro para toda la comunidad universitaria.',
            'features_title': '¿Qué puedes hacer?',
            'features_text': """
• Crear reportes de incidentes
  → Documenta problemas con fotos y ubicación precisa

• Seguimiento en tiempo real
  → Consulta el estado de tus reportes y recibe actualizaciones

• Adjuntar evidencias
  → Sube fotos para respaldar tus reportes
""",
            'features_html': """
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            📝
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Crear reportes de incidentes
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Documenta problemas con fotos y ubicación precisa
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10B981 0%, #34D399 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            👀
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Seguimiento en tiempo real
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Consulta el estado de tus reportes y recibe actualizaciones
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            📸
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Adjuntar evidencias
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Sube fotos para respaldar tus reportes
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            """,
            'tip': 'Incluye fotos claras y una descripción detallada en tus reportes para una resolución más rápida.'
        },
        'authority': {
            'badge_text': 'Autoridad',
            'badge_color': '#10B981',
            'greeting': 'Tu cuenta de personal autorizado ha sido activada. Ahora formas parte del equipo encargado de gestionar y resolver las incidencias reportadas en tu sector asignado.',
            'features_title': 'Tus responsabilidades',
            'features_text': """
• Gestionar reportes asignados
  → Revisa y atiende incidencias de tu sector

• Actualizar estados
  → Mantén informados a los usuarios sobre el progreso

• Respuesta rápida
  → Toma reportes sin asignar para agilizar soluciones
""",
            'features_html': """
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10B981 0%, #34D399 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            📋
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Gestionar reportes asignados
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Revisa y atiende incidencias de tu sector
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            🔄
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Actualizar estados
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Mantén informados a los usuarios sobre el progreso
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            ⚡
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Respuesta rápida
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Toma reportes sin asignar para agilizar soluciones
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            """,
            'tip': 'Actualiza el estado de los reportes regularmente para mantener a la comunidad informada.'
        },
        'admin': {
            'badge_text': 'Administrador',
            'badge_color': '#EF4444',
            'greeting': 'Tu cuenta de administrador ha sido configurada con acceso completo al sistema. Tienes control total sobre usuarios, reportes y configuraciones del sistema.',
            'features_title': 'Accesos completos',
            'features_text': """
• Gestión de usuarios
  → Administra cuentas, roles y permisos del sistema

• Asignación manual
  → Asigna reportes a autoridades específicas

• Métricas y estadísticas
  → Supervisa el rendimiento y eficiencia del sistema

• Control total
  → Acceso completo a todas las funciones del sistema
""",
            'features_html': """
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #EF4444 0%, #F87171 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            👥
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Gestión de usuarios
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Administra cuentas, roles y permisos del sistema
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            🎯
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Asignación manual
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Asigna reportes a autoridades específicas
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            📊
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Métricas y estadísticas
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Supervisa el rendimiento y eficiencia del sistema
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10B981 0%, #34D399 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                            🔐
                                        </div>
                                    </td>
                                    <td style="padding-left: 16px;">
                                        <p style="color: #111827; font-weight: 600; font-size: 15px; margin: 0 0 4px 0;">
                                            Control total
                                        </p>
                                        <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                            Acceso completo a todas las funciones del sistema
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            """,
            'tip': 'Revisa las métricas semanalmente para identificar patrones y optimizar la asignación de recursos.'
        }
    }
    
    return content.get(role, content['student'])
