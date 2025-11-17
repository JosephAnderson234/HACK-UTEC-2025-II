import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";
import type { DataAuthority } from "@/interfaces/user";

const API_URL = loadEnv("AUTH_URL");

export interface AuthorityUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'authority';
    data_authority: DataAuthority;
}

export interface GetAuthoritiesResponse {
    users: AuthorityUser[];
}

export const getAuthoritiesBySector = async (sector: string): Promise<GetAuthoritiesResponse> => {
    const token = useToken.getState().token;
    const url = new URL(`${API_URL}/users`);
    url.searchParams.append('role', 'authority');
    url.searchParams.append('sector', sector);
    
    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!res.ok) {
        throw new Error('Error fetching authorities');
    }
    
    return await res.json();
};
