/**
 * Tipados para endpoints de lugares (places)
 * GET /places
 */

import type { PaginationResponse, PaginationParams } from './common';

// ==================== PLACE ====================

export interface Place {
  id: string;
  name: string;
  type: string;
  tower?: string;
  floor?: number;
}

// ==================== GET PLACES ====================

export interface GetPlacesParams extends PaginationParams {
  tower?: string;
  floor?: number;
  type?: string;
  term?: string;
}

export interface GetPlacesResponse {
  places: Place[];
  pagination: PaginationResponse;
}
