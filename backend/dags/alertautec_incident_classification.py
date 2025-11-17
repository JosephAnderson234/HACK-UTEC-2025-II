from datetime import datetime, timedelta
from airflow.decorators import dag, task
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Attr
import json

AWS_REGION = "us-east-1"
DYNAMO_TABLE = "t_reportes"
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
                Attr("estado").is_in(["PENDIENTE", "ATENDIENDO"])
                & (
                    Attr("clasificacion_auto").not_exists()
                    | Attr("clasificacion_auto").eq(False)
                )
            )
        )
        return resp.get("Items", [])

    @task()
    def classify_incidents(incidents):
        for inc in incidents:
            tipo_lugar = (inc.get("lugar", {}).get("type") or "").lower()
            urgencia_original = (inc.get("urgencia") or "BAJA").upper()
            descripcion = (inc.get("descripcion") or "").lower()
            assigned_sector = (inc.get("assigned_sector") or "").lower()

            # Clasificación de urgencia basada en heurísticas
            score = 0.0
            urgencia_clasificada = urgencia_original

            # Factores que aumentan la urgencia
            high_risk_keywords = ["robo", "violencia", "seguridad", "fuego", "incendio", "emergencia"]
            medium_risk_keywords = ["fuga", "agua", "electricidad", "daño", "roto", "sistema"]
            
            # Análisis de descripción
            for keyword in high_risk_keywords:
                if keyword in descripcion:
                    score += 0.3
                    
            for keyword in medium_risk_keywords:
                if keyword in descripcion:
                    score += 0.15

            # Análisis por tipo de lugar
            if tipo_lugar in ["baño", "cocina"]:
                score += 0.1
            elif tipo_lugar in ["entrada", "estacionamiento"]:
                score += 0.15

            # Ajustar score según urgencia original
            if urgencia_original == "ALTA":
                score = min(1.0, score + 0.4)
            elif urgencia_original == "MEDIA":
                score = min(1.0, score + 0.2)

            # Clasificar según score
            if score >= 0.7:
                urgencia_clasificada = "ALTA"
            elif score >= 0.4:
                urgencia_clasificada = "MEDIA"
            else:
                urgencia_clasificada = "BAJA"

            # Guardar resultados
            inc["urgencia_original"] = urgencia_original
            inc["urgencia_clasificada"] = urgencia_clasificada
            inc["clasificacion_auto"] = True
            inc["classification_score"] = round(score, 2)
            inc["notification_sent"] = False
            inc["notification_sent_at"] = None

        return incidents

    @task()
    def update_incidents(incidents):
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        table = dynamodb.Table(DYNAMO_TABLE)

        for inc in incidents:
            update_expr = (
                "SET urgencia_original = :urgencia_original, "
                "urgencia_clasificada = :urgencia_clasificada, "
                "clasificacion_auto = :clasificacion_auto, "
                "classification_score = :score, "
                "updated_at = :updated_at"
            )

            # Convertir float → Decimal (requisito de DynamoDB)
            score = inc.get("classification_score", 0.0)
            if isinstance(score, float):
                score = Decimal(str(score))

            expr_values = {
               ":urgencia_original": inc.get("urgencia_original"),
               ":urgencia_clasificada": inc.get("urgencia_clasificada"),
               ":clasificacion_auto": True,
               ":score": score,
               ":updated_at": datetime.utcnow().isoformat(),
            }

            try:
                table.update_item(
                    Key={"id_reporte": inc["id_reporte"]},
                    UpdateExpression=update_expr,
                    ExpressionAttributeValues=expr_values,
                )
            except Exception as e:
                print(f"Error updating incident {inc['id_reporte']}: {str(e)}")

        return incidents


    @task()
    def notify_responsibles(incidents):
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        table = dynamodb.Table(DYNAMO_TABLE)
        sns = boto3.client("sns", region_name=AWS_REGION)

        for inc in incidents:
            urgencia_clasificada = inc.get("urgencia_clasificada", "BAJA")
            score = inc.get("classification_score", 0.0)
            
            # Solo notificar si la clasificación cambió significativamente
            # o si tiene alta urgencia
            should_notify = (urgencia_clasificada == "ALTA" or score >= 0.7)

            if should_notify and not inc.get("notification_sent"):
                message = {
                    "id_reporte": inc["id_reporte"],
                    "urgencia_original": inc.get("urgencia_original"),
                    "urgencia_clasificada": urgencia_clasificada,
                    "classification_score": score,
                    "descripcion": inc.get("descripcion"),
                    "lugar": inc.get("lugar"),
                    "assigned_sector": inc.get("assigned_sector"),
                    "estado": inc.get("estado"),
                    "created_at": inc.get("created_at"),
                    "clasificacion_auto": True,
                }

                try:
                    sns.publish(
                        TopicArn=SNS_TOPIC_ARN,
                        Subject=f"[AlertaUTEC] Incidente clasificado - {urgencia_clasificada}",
                        Message=json.dumps(message),
                    )
                    
                    # Marcar notificación como enviada
                    table.update_item(
                        Key={"id_reporte": inc["id_reporte"]},
                        UpdateExpression="SET notification_sent = :sent, notification_sent_at = :sent_at",
                        ExpressionAttributeValues={
                            ":sent": True,
                            ":sent_at": datetime.utcnow().isoformat(),
                        },
                    )
                except Exception as e:
                    print(f"Error notifying for incident {inc['id_reporte']}: {str(e)}")

    incidents = get_unclassified_incidents()
    classified = classify_incidents(incidents)
    updated = update_incidents(classified)
    notify_responsibles(updated)

dag = incident_classification_and_notifications()