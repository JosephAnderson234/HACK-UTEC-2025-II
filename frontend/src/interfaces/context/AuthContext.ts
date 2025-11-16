import type { DataStudent, UserResponse } from "../user";

export interface AuthContextType {
    token: string | null;
    login:  (credentials: AuthRequest) => Promise<void>;
    logout: () => void;
}


export interface AuthRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user_data: UserResponse;
}


//only for students
export interface AuthRegisterRequest {
        first_name: string; // puede no venir en versiones antiguas
        last_name: string;
        email: string; // email válido
        password: string; // hash SHA-256 almacenado como hex/base64 (string)
        DNI?: string;
        cellphone?: string;
        data_student?: DataStudent; // presente cuando role === 'student'
}