import { createContext } from "react";

export interface WebSocketContextValue {
  isConnected: boolean;
  send: (data: unknown) => boolean;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(null);
