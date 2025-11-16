import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";
import type { GetReportDetailResponse } from "@/interfaces/api";

const REPORTS_URL = loadEnv('REPORTS_URL');

export const findById = async (id_reporte: string) => {
    const token = useToken.getState().token;
    if (!token) {
        throw new Error('User is not authenticated');
    }
    const response = await fetch(`${REPORTS_URL}/${id_reporte}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Error fetching report by ID');
    }
    return response.json() as Promise<GetReportDetailResponse>;
}