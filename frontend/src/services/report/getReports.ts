import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";
import type { GetReportsResponse } from "@/interfaces/api";
const API_URL = loadEnv("REPORTS_URL");


export const getReports = async (term?: string, page?: number, size?: number) =>{
    const url = new URL(`${API_URL}`);
    if(term) url.searchParams.append('term', term);
    if(page) url.searchParams.append('page', page.toString());
    if(size) url.searchParams.append('size', size.toString());
    
    const token = useToken.getState().token;
    
    const res =await  fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if(!res.ok) throw new Error('Error fetching reports');
    const data = await res.json();
    return data as Promise<GetReportsResponse>;
}