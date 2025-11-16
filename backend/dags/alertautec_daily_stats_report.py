from datetime import datetime, timedelta
from airflow.decorators import dag, task
import boto3
from boto3.dynamodb.conditions import Attr
import json

AWS_REGION = "us-east-1"
DYNAMO_TABLE = "t_reportes"
S3_BUCKET_REPORTS = "alertautec-reports"
# Cambia TU_ID_CUENTA por tu ID de cuenta AWS
SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:197345439522:AlertaUTECNotificaciones"

@dag(
    dag_id="alertautec_daily_stats_report",
    schedule_interval="0 0 * * *",  # todos los días a medianoche
    start_date=datetime(2025, 11, 1),
    catchup=False,
    tags=["alertautec", "reportes", "diario"],
)
def daily_stats_report():

    @task()
    def extract_incidents_last_day():
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        table = dynamodb.Table(DYNAMO_TABLE)

        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)

        resp = table.scan(
            FilterExpression=Attr("created_at").gt(yesterday.isoformat())
        )
        return resp.get("Items", [])

    @task()
    def aggregate_stats(incidents):
        stats = {
            "generated_at": datetime.utcnow().isoformat(),
            "period": "last_24_hours",
            "total_incidents": len(incidents),
            "by_urgency": {
                "BAJA": 0,
                "MEDIA": 0,
                "ALTA": 0,
            },
            "by_estado": {
                "PENDIENTE": 0,
                "ATENDIENDO": 0,
                "RESUELTO": 0,
            },
            "by_sector": {},
            "classification_stats": {
                "auto_classified": 0,
                "manual_classified": 0,
                "avg_confidence_score": 0.0,
            },
            "urgency_reclassification": {
                "total_changes": 0,
                "elevated": 0,  # urgencia_original < urgencia_clasificada
                "reduced": 0,   # urgencia_original > urgencia_clasificada
            },
        }

        total_score = 0.0
        classified_count = 0

        for inc in incidents:
            # Contadores por urgencia clasificada
            urgencia = inc.get("urgencia_clasificada", inc.get("urgencia", "BAJA"))
            stats["by_urgency"][urgencia] = stats["by_urgency"].get(urgencia, 0) + 1

            # Contadores por estado
            estado = inc.get("estado", "PENDIENTE")
            stats["by_estado"][estado] = stats["by_estado"].get(estado, 0) + 1

            # Contadores por sector
            sector = inc.get("assigned_sector", "Sin asignar")
            stats["by_sector"][sector] = stats["by_sector"].get(sector, 0) + 1

            # Estadísticas de clasificación automática
            if inc.get("clasificacion_auto"):
                stats["classification_stats"]["auto_classified"] += 1
                score = inc.get("classification_score", 0.0)
                total_score += score
                classified_count += 1

                # Contar cambios de urgencia
                urgencia_original = inc.get("urgencia_original", "BAJA")
                urgencia_clasificada = inc.get("urgencia_clasificada", "BAJA")
                
                if urgencia_original != urgencia_clasificada:
                    stats["urgency_reclassification"]["total_changes"] += 1
                    
                    # Comparar niveles
                    urgency_levels = {"BAJA": 1, "MEDIA": 2, "ALTA": 3}
                    if urgency_levels.get(urgencia_clasificada, 1) > urgency_levels.get(urgencia_original, 1):
                        stats["urgency_reclassification"]["elevated"] += 1
                    else:
                        stats["urgency_reclassification"]["reduced"] += 1
            else:
                stats["classification_stats"]["manual_classified"] += 1

        # Calcular score promedio
        if classified_count > 0:
            stats["classification_stats"]["avg_confidence_score"] = round(
                total_score / classified_count, 2
            )

        return stats

    @task()
    def save_report_to_s3(stats):
        s3 = boto3.client("s3", region_name=AWS_REGION)
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        key = f"daily_reports/{today_str}.json"

        body = json.dumps(stats, indent=2)

        s3.put_object(
            Bucket=S3_BUCKET_REPORTS,
            Key=key,
            Body=body.encode("utf-8"),
            ContentType="application/json",
        )
        return f"s3://{S3_BUCKET_REPORTS}/{key}"

    @task()
    def notify_new_report(report_s3_path: str):
        sns = boto3.client("sns", region_name=AWS_REGION)
        msg = {
            "message": "Nuevo reporte estadístico diario de AlertaUTEC",
            "report_path": report_s3_path,
        }

        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject="[AlertaUTEC] Reporte diario de incidentes generado",
            Message=json.dumps(msg),
        )

    incidents = extract_incidents_last_day()
    stats = aggregate_stats(incidents)
    report_path = save_report_to_s3(stats)
    notify_new_report(report_path)

dag = daily_stats_report()