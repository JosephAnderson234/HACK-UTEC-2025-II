import type { DataAuthority, DataStudent, UserResponse } from "../user";

export interface AuthContextType {
    token: string | null;
    user: UserResponse & { data_student?: DataStudent } & {data_authority?: DataAuthority};
    login:  (credentials: AuthRequest) => Promise<void>;
    logout: () => void;
    register: (data: AuthRegisterRequest) => Promise<void>;
}


export interface AuthRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    // Mensaje de la API (p. ej. 'Login successful')
    message: string;
    // JWT de autenticación
    token: string;
    // Datos del usuario autenticado. Se extiende con `data_student` cuando aplica.
    user: UserResponse & { data_student?: DataStudent } & {data_authority?: DataAuthority};
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