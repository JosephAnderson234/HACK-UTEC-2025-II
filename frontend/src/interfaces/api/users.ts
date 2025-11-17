/**
 * Tipados para endpoints de usuarios
 * GET /users
 */

import type { Role } from './common';
import type { PaginationResponse, PaginationParams } from './common';
import type { DataStudent, DataAuthority } from '../user';

// ==================== USER ====================

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  DNI?: string;
  cellphone?: string;
  registration_date: string; // ISO8601
  data_student?: DataStudent;
  data_authority?: DataAuthority;
}

// ==================== GET USERS ====================

export interface GetUsersParams extends PaginationParams {
  role?: Role;
  term?: string;
}

export interface GetUsersResponse {
  users: User[];
  pagination: PaginationResponse;
}
