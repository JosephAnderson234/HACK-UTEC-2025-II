import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";
import type { GetReportsResponse } from "@/interfaces/api";
const API_URL = loadEnv("REPORTS_URL");

/**
 * Parámetros soportados por el Lambda GET /reports
 * - page?: number
 * - size?: number
 * - estado?: string (e.g., PENDIENTE, ATENDIDO)
 * - urgencia?: string (e.g., ALTA, MEDIA, BAJA)
 * - orderBy?: string (e.g., created_at)
 * - order?: 'asc' | 'desc'
 * - term?: string (búsqueda de texto si el backend lo soporta)
 */
export interface GetReportsQuery {
    term?: string;
    page?: number;
    size?: number;
    estado?: string;
    urgencia?: string;
    orderBy?: string;
    order?: "asc" | "desc";
    assigned_sector?: string;
}

/**
 * Obtiene reportes con soporte para todos los query params aceptados por el Lambda.
 *
 * Compatibilidad retro:
 * - getReports(term?, page?, size?) seguirá funcionando.
 *
 * Uso recomendado:
 * - getReports({ page, size, estado, urgencia, orderBy, order, term })
 */
export const getReports = async (
    params?: GetReportsQuery | string,
    legacyPage?: number,
    legacySize?: number
): Promise<GetReportsResponse> => {
    // Normalizar a objeto de parámetros
    let query: GetReportsQuery = {};
    if (typeof params === "string" || typeof params === "number" || params == null) {
        // Firma antigua: (term?: string, page?: number, size?: number)
        if (typeof params === "string") query.term = params;
        if (typeof legacyPage === "number") query.page = legacyPage;
        if (typeof legacySize === "number") query.size = legacySize;
    } else {
        query = params;
    }


    const user = useToken.getState().user;
    const role = user?.role;
    if (!role){
        throw new Error("User role is undefined");
    }

    const url = new URL(`${API_URL}`);

    const append = (key: string, value?: string | number) => {
        if (value !== undefined && value !== null && `${value}` !== "") {
            url.searchParams.append(key, String(value));
        }
    };

    // Mapear todos los parámetros que el Lambda acepta
    append("term", query.term);
    append("page", query.page);
    append("size", query.size);
    append("estado", query.estado);
    append("urgencia", query.urgencia);
    append("orderBy", query.orderBy);
    append("order", query.order);

    if (role === "authority"){
        append("assigned_sector", user.data_authority?.sector);
    }

    const token = useToken.getState().token;

    const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });



    if (!res.ok) throw new Error("Error fetching reports");
    const data = await res.json();
    return data as GetReportsResponse;
};