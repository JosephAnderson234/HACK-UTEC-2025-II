import type { GetUsersResponse } from "@/interfaces/api";
import { useToken } from "@/store/authStore";
import { loadEnv } from "@/utils/loaderEnv";

const API_URL_USERS = loadEnv("USERS_URL");
const API_ADMIN_AUTH = loadEnv("ADMIN_URL");

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

export interface CreateAuthorityRequest {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    DNI: string;
    cellphone: string;
    data_authority: {
        department: string;
        position: string;
        sector: string;
        charge: string;
    };
}

export interface CreateAuthorityResponse {
    message: string;
    authority: {
        id: string;
        email: string;
        role: string;
        first_name: string;
        last_name: string;
        data_authority: {
            department: string;
            position: string;
            sector: string;
            charge: string;
        };
    };
}

export const createNewAuthority = async (request: CreateAuthorityRequest): Promise<CreateAuthorityResponse> => {
    const token = useToken.getState().token;

    if (!token) {
        throw new Error('No se encontró token de autenticación');
    }

    const response = await fetch(API_ADMIN_AUTH, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error al crear autoridad' }));
        throw new Error(error.error || error.message || 'Error al crear autoridad');
    }

    return response.json();
};