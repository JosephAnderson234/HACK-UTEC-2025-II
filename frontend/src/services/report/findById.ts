import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";
import type { GetReportDetailResponse } from "@/interfaces/api";

const REPORTS_URL = loadEnv('REPORTS_URL');

export const findById = async (id_reporte: string) => {
    const token = useToken.getState().token;
    const user = useToken.getState().user;
    if (!token) {
        throw new Error('User is not authenticated');
    }
    const response = await fetch(`${REPORTS_URL}/${id_reporte}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok && user.role !== 'admin') {
        throw new Error('No puedes visualizar reportes que no son de tu sector :(');
    } else if (!response.ok) {
        throw new Error('Error fetching report by ID');
    }
    return response.json() as Promise<GetReportDetailResponse>;
}