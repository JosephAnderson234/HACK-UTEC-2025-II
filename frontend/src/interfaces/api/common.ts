/**
 * Tipados comunes para todas las respuestas de la API
 */

export interface ApiResponse<T = unknown> {
  statusCode: number;
  body: T;
}

export interface PaginationParams {
  page?: number;
  size?: number;
}

export interface PaginationResponse {
  current_page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface FilterParams {
  estado?: ReportStatus;
  urgencia?: ReportUrgency;
  sector?: string;
  tower?: string;
  floor?: number;
  term?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export type ReportStatus = 'PENDIENTE' | 'ATENDIENDO' | 'RESUELTO';
export type ReportUrgency = 'BAJA' | 'MEDIA' | 'ALTA';
export type Role = 'student' | 'authority' | 'admin';
