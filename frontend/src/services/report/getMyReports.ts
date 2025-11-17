import type { GetMyReportsParams, GetMyReportsResponse } from "@/interfaces/api/reports";
import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";

const REPORTS_URL = loadEnv('REPORTS_URL');

export const getMyReports = async (params?: GetMyReportsParams) => {
    const token = useToken.getState().token;
    if (!token) {
        throw new Error('User is not authenticated');
    }

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.size) queryParams.append('size', params.size.toString());
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.urgencia) queryParams.append('urgencia', params.urgencia);
    if (params?.tower) queryParams.append('tower', params.tower);
    if (params?.floor) queryParams.append('floor', params.floor.toString());
    if (params?.term) queryParams.append('term', params.term);
    if (params?.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params?.order) queryParams.append('order', params.order);

    const url = queryParams.toString() 
        ? `${REPORTS_URL}/my-reports?${queryParams.toString()}` 
        : `${REPORTS_URL}/my-reports`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Error fetching my reports');
    }

    return response.json() as Promise<GetMyReportsResponse>;
}
