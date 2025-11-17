import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";
import type { AssignReportRequest, AssignReportResponse } from "@/interfaces/api/reports";

const API_URL = loadEnv("REPORTS_URL");

export const assignReport = async (id_reporte: string, request: AssignReportRequest): Promise<AssignReportResponse> => {
    const token = useToken.getState().token;
    
    const res = await fetch(`${API_URL}/${id_reporte}/assign`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
    });
    
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Error assigning report' }));
        throw new Error(error.message || 'Error assigning report');
    }
    
    return await res.json();
};
