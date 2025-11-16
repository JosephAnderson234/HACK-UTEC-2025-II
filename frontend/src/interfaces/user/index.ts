/**
 * Tipado para usuarios según la especificación JSON recibida.
 * Algunos campos son opcionales dependiendo del `role`.
 */
export type Role = 'student' | 'authority' | 'admin';

export interface DataStudent {
    career: string;
    cycle: number; // número entero
    code: number; // número entero (código estudiantil)
}

export interface DataAuthority {
    sector: string;
    charge: string;
    notifications_urgency: string[]; // lista de strings
}

export interface User {
    id: string; // UUID (v4) en formato string
    first_name: string; // puede no venir en versiones antiguas
    last_name: string;
    email: string; // email válido
    role: Role;
    password: string; // hash SHA-256 almacenado como hex/base64 (string)
    DNI?: string;
    cellphone?: string;
    registration_date: string; // ISO8601 string, p.ej. 2023-01-01T12:00:00Z
    data_student?: DataStudent; // presente cuando role === 'student'
    data_authority?: DataAuthority; // presente cuando role === 'authority'
}

export interface UserResponse {
    id: string; // UUID (v4) en formato string
    email: string; // email válido
    role : Role;
    first_name: string;
    last_name: string;
}


