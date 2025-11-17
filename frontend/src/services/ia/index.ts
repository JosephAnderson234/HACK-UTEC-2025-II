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

    if (!response.ok) {

        throw new Error( 'Error al predecir incidente');
    }

    return await response.json();
};