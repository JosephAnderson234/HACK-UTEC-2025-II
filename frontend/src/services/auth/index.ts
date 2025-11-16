import type { AuthRegisterRequest, AuthRequest, AuthResponse } from "@/interfaces/context/AuthContext";
import { loadEnv } from "@/utils/loaderEnv";

const API_URL = loadEnv("AUTH_URL");

export const login = async (credentials: AuthRequest) => {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
    });
    if (!response.ok) {
        throw new Error("Login failed");
    }
    return response.json() as Promise<AuthResponse>;
}

export const register = async (data: AuthRegisterRequest) => {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error("Registration failed");
    }
    return response.json() as Promise<AuthResponse>;
}
