import type { CreateReportRequest, CreateReportResponse } from "@/interfaces/api";
import { loadEnv } from "@/utils/loaderEnv";


const REPORTS_URL = loadEnv('REPORTS_URL');
export const createReport = async (reportData: CreateReportRequest) => {
    const response = await fetch(`${REPORTS_URL}/reports`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Agregar token de autenticación si es necesario
        },
        body: JSON.stringify(reportData),
    });
    if (!response.ok) {
        throw new Error('Error creating report');
    }
    return response.json() as Promise<CreateReportResponse>;
}