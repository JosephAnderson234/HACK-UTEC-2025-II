import { useContext } from "react";
import { WebSocketContext } from "@/context/WebSocketContext";

export const useWebSocketConnection = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketConnection must be used within a WebSocketProvider");
  }
  return context;
};
