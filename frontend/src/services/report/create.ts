import type { CreateReportRequest, CreateReportResponse } from "@/interfaces/api";
import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";

const REPORTS_URL = loadEnv('REPORTS_URL');
export const createReport = async (reportData: CreateReportRequest) => {
    const token = useToken.getState().token;
    if (!token) {
        throw new Error('User is not authenticated');
    }
    const response = await fetch(`${REPORTS_URL}/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, 
        },
        body: JSON.stringify(reportData),
    });
    if (!response.ok) {
        throw new Error('Error creating report');
    }
    return response.json() as Promise<CreateReportResponse>;
}