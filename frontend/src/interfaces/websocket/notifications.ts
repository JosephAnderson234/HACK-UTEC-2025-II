/**
 * Tipados para notificaciones WebSocket
 * Basado en functions/sendNotify.py
 */

export type NotificationType = 'ReportCreated' | 'StatusUpdated';

export interface WebSocketNotification {
  type: NotificationType;
  timestamp: string;
  message: string;
  data: {
    report_id?: string;
    urgencia?: 'BAJA' | 'MEDIA' | 'ALTA';
    sector?: string;
    estado?: 'PENDIENTE' | 'ATENDIENDO' | 'RESUELTO';
  };
}

export interface WebSocketMessage {
  action?: string;
  message?: string;
  // Otros campos que el backend pueda enviar
  [key: string]: unknown;
}
