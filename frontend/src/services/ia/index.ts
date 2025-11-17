import { useToken } from "@/store/authStore";
import { loadEnv } from "@/utils/loaderEnv";

const API_URL = loadEnv("INCIDENTS_URL");

export interface PredictIncidentRequest {
    tower: string;
    tipo_lugar: string;
    hora: number;
    dia_semana?: number;
}

export interface PredictIncidentResponse {
    input: {
        tower: string;
        tipo_lugar: string;
        hora: number;
        dia_semana?: number;
    };
    prediccion: {
        clase_incidente_probable: string;
        nivel_modelo: string;
        clave_usada: string;
        probabilidades: Record<string, number>;
    };
    mensaje: string;
}

export const predictIncident = async (request: PredictIncidentRequest): Promise<PredictIncidentResponse> => {
    const token = useToken.getState().token;

    const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
    });

    // Leemos primero como texto para manejar respuestas no-JSON sin romper
    const raw = await response.text();

    // Intentar parsear JSON si es posible
    let data: any = null;
    try {
        data = raw ? JSON.parse(raw) : null;
    } catch (e) {
        // No es JSON válido
        // Log opcional para diagnóstico (se puede quitar si es muy ruidoso)
        console.debug('[predictIncident] Respuesta no-JSON:', raw);
    }

    if (!response.ok) {
        const msg = data?.error || data?.message || raw || 'Error al predecir incidente';
        console.error('[predictIncident] Error HTTP:', response.status, msg);
        throw new Error(msg);
    }

    if (!data) {
        // 200 pero cuerpo vacío o no JSON: devolvemos un mensaje claro para la UI
        console.error('[predictIncident] 200 OK pero sin JSON válido');
        throw new Error('La respuesta del servidor no contiene datos válidos');
    }

    return data as PredictIncidentResponse;
};