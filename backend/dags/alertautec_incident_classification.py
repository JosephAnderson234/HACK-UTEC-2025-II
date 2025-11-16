from datetime import datetime, timedelta
from airflow.decorators import dag, task
import boto3
from boto3.dynamodb.conditions import Attr
import json

AWS_REGION = "us-east-1"
DYNAMO_TABLE = "Incidents"
# Cambia TU_ID_CUENTA por tu ID de cuenta AWS
SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:197345439522:AlertaUTECNotificaciones"

@dag(
    dag_id="alertautec_incident_classification_and_notifications",
    schedule_interval="*/5 * * * *",  # cada 5 minutos
    start_date=datetime(2025, 11, 1),
    catchup=False,
    tags=["alertautec", "clasificacion", "notificaciones", "5min"],
)
def incident_classification_and_notifications():

    @task()
    def get_unclassified_incidents():
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        table = dynamodb.Table(DYNAMO_TABLE)

        resp = table.scan(
            FilterExpression=(
                Attr("status").is_in(["pendiente", "en_atencion"])
                & (
                    Attr("classified").not_exists()
                    | Attr("classified").eq(False)
                )
            )
        )
        return resp.get("Items", [])

    @task()
    def classify_incidents(incidents):
        for inc in incidents:
            incident_type = (inc.get("type") or "").lower()
            urgency = (inc.get("urgency") or "").lower()
            location = (inc.get("location") or "").lower()
            description = (inc.get("description") or "").lower()

            # Área responsable (reglas simples)
            if "baño" in location or "fuga" in description or "agua" in description:
                inc["area_responsible"] = "Infraestructura"
            elif "robo" in description or "violencia" in description or "seguridad" in incident_type:
                inc["area_responsible"] = "Seguridad"
            elif "sistema" in description or "wifi" in description or "computo" in description:
                inc["area_responsible"] = "Soporte TI"
            else:
                inc["area_responsible"] = "Mesa de ayuda"

            # Nivel de riesgo
            if urgency == "alta":
                inc["risk_level"] = "critico"
            elif urgency == "media":
                inc["risk_level"] = "moderado"
            else:
                inc["risk_level"] = "bajo"

            inc["classified"] = True

        return incidents

    @task()
    def update_incidents(incidents):
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        table = dynamodb.Table(DYNAMO_TABLE)

        for inc in incidents:
            table.update_item(
                Key={"incident_id": inc["incident_id"]},
                UpdateExpression=(
                    "SET area_responsible = :area, "
                    "risk_level = :risk, "
                    "classified = :classified"
                ),
                ExpressionAttributeValues={
                    ":area": inc.get("area_responsible", "Pendiente"),
                    ":risk": inc.get("risk_level", "desconocido"),
                    ":classified": True,
                },
            )
        return incidents

    @task()
    def notify_responsibles(incidents):
        sns = boto3.client("sns", region_name=AWS_REGION)

        for inc in incidents:
            risk = inc.get("risk_level", "bajo")
            urgency = (inc.get("urgency") or "").lower()

            # Solo notificar los importantes
            if risk != "critico" and urgency != "alta":
                continue

            message = {
                "incident_id": inc["incident_id"],
                "type": inc.get("type"),
                "urgency": inc.get("urgency"),
                "location": inc.get("location"),
                "area_responsible": inc.get("area_responsible"),
                "risk_level": risk,
                "status": inc.get("status"),
                "created_at": inc.get("created_at"),
            }

            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=f"[AlertaUTEC] Nuevo incidente crítico - {inc['incident_id']}",
                Message=json.dumps(message),
            )

    incidents = get_unclassified_incidents()
    classified = classify_incidents(incidents)
    updated = update_incidents(classified)
    notify_responsibles(updated)

dag = incident_classification_and_notifications()