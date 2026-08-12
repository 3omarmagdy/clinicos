/**
 * API Request/Response Types
 */

export interface ApiRequest {
  organizationId?: string;
  userId?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
  version: string;
}
