import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";
import type { UpdateStatusRequest, UpdateStatusResponse } from "@/interfaces/api/reports";

const API_URL = loadEnv("REPORTS_URL");

export const updateStatus = async (request: UpdateStatusRequest): Promise<UpdateStatusResponse> => {
    const token = useToken.getState().token;
    
    const res = await fetch(`${API_URL}/update-status`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
    });
    
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Error updating status' }));
        throw new Error(error.message || 'Error updating status');
    }
    
    return await res.json();
};
