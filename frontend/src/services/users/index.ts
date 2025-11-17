import type { GetUsersResponse } from "@/interfaces/api";
import { useToken } from "@/store/authStore";
import { loadEnv } from "@/utils/loaderEnv";

const API_URL_USERS = loadEnv("USERS_URL");

export const getAuthorities = async (term?: string): Promise<GetUsersResponse> => {
    const token = useToken.getState().token;

    if (!token) {
        throw new Error('No se encontró token de autenticación');
    }

    const params = new URLSearchParams({
        role: 'authority',
        ...(term && { term })
    });

    const response = await fetch(`${API_URL_USERS}?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error al obtener autoridades' }));
        throw new Error(error.error || error.message || 'Error al obtener autoridades');
    }

    return response.json();
};