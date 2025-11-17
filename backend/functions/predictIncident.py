import json
import os
from typing import Dict, Any

import boto3

s3 = boto3.client("s3")

_model_cache: Dict[str, Any] | None = None

# Headers CORS comunes para todas las respuestas
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",  # Cambiar por el origen específico en producción si se requiere
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
}


def load_model_from_s3() -> Dict[str, Any]:
    """
    Carga el modelo predictivo desde S3 y lo cachea en memoria.
    """
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    bucket = os.environ.get("PREDICTIVE_MODEL_BUCKET")
    key = os.environ.get("PREDICTIVE_MODEL_KEY", "ml/predictive_model.json")

    if not bucket:
        raise RuntimeError("PREDICTIVE_MODEL_BUCKET no está configurado")

    print(f"[predictIncident] Cargando modelo de s3://{bucket}/{key}")
    obj = s3.get_object(Bucket=bucket, Key=key)
    data = obj["Body"].read().decode("utf-8")
    _model_cache = json.loads(data)
    return _model_cache


def build_time_block(hora: int) -> str:
    if 6 <= hora < 12:
        return "mañana"
    elif 12 <= hora < 18:
        return "tarde"
    elif 18 <= hora < 24:
        return "noche"
    else:
        return "madrugada"


def predict_class(model: Dict[str, Any], tower: str,
                  tipo_lugar: str, hora: int) -> Dict[str, Any]:
    """
    Aplica la lógica jerárquica de predicción.
    """
    bloque = build_time_block(hora)

    level1_key = f"{tower}|{tipo_lugar}|{bloque}"
    level2_key = f"{tipo_lugar}|{bloque}"
    level3_key = tipo_lugar

    for level_name, key in [
        ("level1", level1_key),
        ("level2", level2_key),
        ("level3", level3_key),
    ]:
        probs = model[level_name].get(key)
        if probs:
            clase_predicha = max(probs.items(), key=lambda x: x[1])[0]
            return {
                "nivel_usado": level_name,
                "clave": key,
                "clase_predicha": clase_predicha,
                "probabilidades": probs,
            }

    probs = model["global"]
    clase_predicha = max(probs.items(), key=lambda x: x[1])[0]
    return {
        "nivel_usado": "global",
        "clave": "global",
        "clase_predicha": clase_predicha,
        "probabilidades": probs,
    }


def handler(event, context):
    """
    Handler simplificado para debug:
    - NO valida JWT aún.
    - Siempre devuelve un JSON con detalle de error si algo falla.
    """
    try:
        # Soporte explícito para preflight CORS por si el API Gateway no lo maneja automáticamente
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": ""
            }

        print("[predictIncident] EVENT:", json.dumps(event))

        body = event.get("body", {})
        if isinstance(body, str):
            body_str = body
            body = json.loads(body_str or "{}")

        tower = body.get("tower")
        tipo_lugar = body.get("tipo_lugar")
        hora = body.get("hora")

        if tower is None or tipo_lugar is None or hora is None:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "error": "tower, tipo_lugar y hora son obligatorios",
                    "ejemplo_body": {
                        "tower": "T1",
                        "tipo_lugar": "aula",
                        "hora": 9,
                        "dia_semana": 2
                    }
                }, ensure_ascii=False)
            }

        tower = str(tower)
        tipo_lugar = str(tipo_lugar)
        hora = int(hora)

        model = load_model_from_s3()
        pred = predict_class(model, tower, tipo_lugar, hora)

        response_body = {
            "input": {
                "tower": tower,
                "tipo_lugar": tipo_lugar,
                "hora": hora,
                "dia_semana": body.get("dia_semana"),
            },
            "prediccion": {
                "clase_incidente_probable": pred["clase_predicha"],
                "nivel_modelo": pred["nivel_usado"],
                "clave_usada": pred["clave"],
                "probabilidades": pred["probabilidades"],
            },
            "mensaje": (
                "Predicción basada en el historial de incidentes sintéticos. "
                "Módulo de apoyo a la toma de decisiones."
            )
        }

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(response_body, ensure_ascii=False)
        }

    except Exception as e:
        # Aquí queremos ver el error REAL
        print("[predictIncident] ERROR:", repr(e))
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "error": "Error interno en la predicción",
                "detalle": str(e)
            }, ensure_ascii=False)
        }
