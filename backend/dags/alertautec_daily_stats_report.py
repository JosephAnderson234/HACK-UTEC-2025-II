from datetime import datetime, timedelta
from airflow.decorators import dag, task
import boto3
from boto3.dynamodb.conditions import Attr
import json

AWS_REGION = "us-east-1"
DYNAMO_TABLE = "Incidents"
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
            "by_type": {},
            "by_location": {},
            "by_status": {},
            "by_urgency": {},
        }

        for inc in incidents:
            t = inc.get("type", "desconocido")
            loc = inc.get("location", "desconocida")
            status = inc.get("status", "desconocido")
            urgency = inc.get("urgency", "desconocida")

            stats["by_type"][t] = stats["by_type"].get(t, 0) + 1
            stats["by_location"][loc] = stats["by_location"].get(loc, 0) + 1
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
            stats["by_urgency"][urgency] = stats["by_urgency"].get(urgency, 0) + 1

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