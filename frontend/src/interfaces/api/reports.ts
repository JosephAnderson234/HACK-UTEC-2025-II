/**
 * Tipados para endpoints de reportes
 * POST /reports/create
 * POST /reports/update-status
 * GET /reports/my-reports
 * GET /reports
 * GET /reports/{id_reporte}
 * GET /reports/assigned-to-me
 * POST /reports/{id_reporte}/take
 * POST /reports/{id_reporte}/assign
 */

import type { ReportStatus, ReportUrgency, PaginationResponse, PaginationParams, FilterParams } from './common';
import type { DataStudent, DataAuthority } from '../user';

// ==================== LUGAR (PLACE) ====================

export interface Lugar {
  id: string;
  name: string;
  type: string;
  tower?: string;
  floor?: number;
}

// ==================== AUTOR Y ASIGNADO ====================

export interface ReportAuthor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  cellphone?: string;
  role: 'student';
  data_student?: DataStudent;
}

export interface ReportAssigned {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  cellphone?: string;
  role: 'authority' | 'admin';
  data_authority?: DataAuthority;
}

// ==================== REPORTE BASE ====================

export interface Report {
  id_reporte: string;
  lugar: Lugar;
  descripcion: string;
  fecha_hora: string; // ISO8601
  urgencia: ReportUrgency;
  estado: ReportStatus;
  author_id: string;
  assigned_to: string | null;
  assigned_sector: string;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
  resolved_at: string | null; // ISO8601
  image_url?: string;
  // Campos enriquecidos opcionales
  author_name?: string;
  assigned_name?: string;
}

// ==================== REPORTE DETALLADO ====================

export interface ReportDetail extends Omit<Report, 'author_name' | 'assigned_name'> {
  author: ReportAuthor;
  assigned?: ReportAssigned;
}

// ==================== CREATE REPORT ====================

export interface CreateReportRequest {
  lugar_id: string;
  urgencia: ReportUrgency;
  descripcion: string;
  image?: string; // base64 encoded image
}

export interface CreateReportResponse {
  message: string;
  report: {
    id_reporte: string;
    estado: ReportStatus;
    urgencia: ReportUrgency;
    lugar: Lugar;
    created_at: string;
  };
}

// ==================== UPDATE STATUS ====================

export interface UpdateStatusRequest {
  id_reporte: string;
  estado: ReportStatus;
  comentario?: string;
}

export interface UpdateStatusResponse {
  message: string;
  report: {
    id_reporte: string;
    estado: ReportStatus;
    updated_at: string;
    assigned_to: string;
  };
}

// ==================== GET MY REPORTS ====================

export interface GetMyReportsParams extends FilterParams, PaginationParams {}

export interface GetMyReportsResponse {
  reports: Report[];
  pagination: PaginationResponse;
}

// ==================== GET REPORTS ====================

export interface GetReportsParams extends FilterParams, PaginationParams {
  assigned_sector?: string;
}

export interface GetReportsResponse {
  reports: Report[];
  pagination: PaginationResponse;
  filters_applied?: {
    role_filter: string;
    query_filters: Record<string, string>;
    text_search: string | null;
  };
}

// ==================== GET REPORT DETAIL ====================

export interface GetReportDetailResponse {
  report: ReportDetail;
}

// ==================== GET ASSIGNED REPORTS ====================

export interface GetAssignedReportsParams extends FilterParams, PaginationParams {}

export interface GetAssignedReportsResponse {
  reports: Report[];
  pagination: PaginationResponse;
}

// ==================== TAKE REPORT ====================

export interface TakeReportRequest {
  comentario?: string;
}

export interface TakeReportResponse {
  message: string;
  report: {
    id_reporte: string;
    estado: ReportStatus;
    assigned_to: string;
    updated_at: string;
    lugar: Lugar;
    urgencia: ReportUrgency;
    descripcion: string;
  };
}

// ==================== ASSIGN REPORT ====================

export interface AssignReportRequest {
  assigned_to: string; // user ID
  estado?: ReportStatus;
}

export interface AssignReportResponse {
  message: string;
  report: {
    id_reporte: string;
    estado: ReportStatus;
    assigned_to: string;
    assigned_name: string;
    assigned_sector: string;
    updated_at: string;
    resolved_at: string | null;
    lugar: Lugar;
    urgencia: ReportUrgency;
    descripcion: string;
  };
}
