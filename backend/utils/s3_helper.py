"""
S3 Helper - Generación de Pre-Signed URLs
Convierte claves S3 en URLs HTTP seguras y temporales para consumo del frontend
"""
import boto3
import os
from botocore.exceptions import ClientError

# Cliente S3 (singleton)
s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('BUCKET_INGESTA', 'utec-alerta-dev-bucket-of-hack-utec')
URL_EXPIRATION = 3600  # 1 hora en segundos


def generate_presigned_url(s3_key_or_url: str, expiration: int = URL_EXPIRATION) -> str:
    """
    Genera URL HTTP firmada para acceder a imagen en S3
    
    Args:
        s3_key_or_url: Puede ser:
                       - Clave S3: "reports/abc-123.jpg"
                       - URL S3: "s3://bucket/reports/abc-123.jpg"
        expiration: Tiempo de expiración en segundos (default: 3600 = 1 hora)
    
    Returns:
        str: URL HTTP firmada válida por {expiration} segundos
             Ejemplo: "https://bucket.s3.amazonaws.com/reports/abc.jpg?X-Amz-..."
        None: Si hay error o input es None/vacío
    """
    if not s3_key_or_url:
        return None
    
    try:
        # Si viene en formato s3://bucket/key, extraer solo la key
        s3_key = s3_key_or_url
        if s3_key_or_url.startswith('s3://'):
            # Formato: s3://bucket-name/path/to/file.jpg
            parts = s3_key_or_url.replace('s3://', '').split('/', 1)
            if len(parts) == 2:
                s3_key = parts[1]  # Tomar solo la key después del bucket
        
        # Generar URL firmada
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key
            },
            ExpiresIn=expiration
        )
        
        return presigned_url
    
    except ClientError as e:
        print(f"❌ Error generando presigned URL para {s3_key_or_url}: {e}")
        return None
    except Exception as e:
        print(f"❌ Error inesperado en generate_presigned_url: {e}")
        return None


def add_image_urls_to_report(report: dict) -> dict:
    """
    Agrega/actualiza campo 'image_url' con URL HTTP en un reporte
    
    Args:
        report: Dict con datos del reporte, puede tener 'image_url' con formato s3://
    
    Returns:
        dict: Mismo reporte con 'image_url' convertido a HTTP
    """
    if not report:
        return report
    
    image_url = report.get('image_url')
    
    if image_url:
        # Convertir s3:// a https:// pre-firmado
        http_url = generate_presigned_url(image_url)
        if http_url:
            report['image_url'] = http_url
        else:
            # Si falla la generación, dejar como null
            report['image_url'] = None
    else:
        report['image_url'] = None
    
    return report


def add_image_urls_to_reports(reports: list) -> list:
    """
    Agrega/actualiza campo 'image_url' con URLs HTTP en lista de reportes
    
    Args:
        reports: Lista de reportes (dicts)
    
    Returns:
        list: Misma lista con 'image_url' convertidos a HTTP
    """
    if not reports:
        return []
    
    return [add_image_urls_to_report(report) for report in reports]
