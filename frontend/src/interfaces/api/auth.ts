/**
 * Tipados para endpoints de autenticación
 * POST /auth/register
 * POST /auth/login
 */

import type { DataStudent, DataAuthority } from '../user';

// ==================== REGISTER ====================

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'student' | 'authority' | 'admin';
  DNI: string;
  cellphone: string;
  data_student?: DataStudent;
  data_authority?: DataAuthority;
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
  };
}

// ==================== LOGIN ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    data_student?: DataStudent;
    data_authority?: DataAuthority;
  };
}
