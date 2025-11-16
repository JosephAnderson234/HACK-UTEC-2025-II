import { useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebsocket";
import { useNotification } from "@/hooks/useNotification";
import useAuth from "@/hooks/useAuth";
import type { WebSocketNotification } from "@/interfaces/websocket/notifications";
import { WebSocketContext, type WebSocketContextValue } from "./WebSocketContext";
import { loadEnv } from '../utils/loaderEnv';

interface WebSocketProviderProps {
    children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
    const { showNotification } = useNotification();
    const { token, user } = useAuth();
    const hasShownConnectionStatus = useRef(false);
    const isDev = import.meta.env.DEV;

    // Construir URL del WebSocket desde variables de entorno
    const wsUrl = loadEnv("WS_URL");

    // Estabilizar handlers con useCallback para evitar reconexiones
    const handleMessage = useCallback((data: unknown) => {
        try {
            const notification = data as WebSocketNotification;

            if (notification.type === "ReportCreated" || notification.type === "StatusUpdated") {
                showNotification({
                    message: notification.message,
                    type: "info",
                    duration: 5000,
                });

                if (isDev) console.log("[WS] Notification:", notification.type);
            }
        } catch (error) {
            console.error("[WS] Error processing message:", error);
        }
    }, [showNotification, isDev]);

    const handleOpen = useCallback(() => {
        if (isDev) console.log("[WS] Connected");

        if (!hasShownConnectionStatus.current) {
            showNotification({
                message: "Conectado al sistema de notificaciones",
                type: "success",
                duration: 3000,
            });
            hasShownConnectionStatus.current = true;
        }
    }, [showNotification, isDev]);

    const handleClose = useCallback(() => {
        if (isDev) console.log("[WS] Disconnected");
    }, [isDev]);

    const handleError = useCallback((ev?: Event) => {
        console.error("[WS] Connection error:", ev);
    }, []);

    // Construir URL con token si está disponible (memoizado para evitar reconexiones)
    const connectionUrl = useMemo(() => {
        return token && wsUrl ? `${wsUrl}?token=${encodeURIComponent(token)}` : "";
    }, [token, wsUrl]);

    // Solo intentar conectar si hay token y URL configurada
    if (!connectionUrl || !token) {
        return (
            <WebSocketContext.Provider value={{ isConnected: false, send: () => false }}>
                {children}
            </WebSocketContext.Provider>
        );
    }

    return <WebSocketProviderConnected 
        connectionUrl={connectionUrl}
        handleMessage={handleMessage}
        handleOpen={handleOpen}
        handleClose={handleClose}
        handleError={handleError}
        token={token}
        user={user}
    hasShownConnectionStatusRef={hasShownConnectionStatus}
    >
        {children}
    </WebSocketProviderConnected>;
};

// Componente separado que solo se monta cuando hay conexión válida
interface WebSocketProviderConnectedProps {
    connectionUrl: string;
    handleMessage: (data: unknown) => void;
    handleOpen: () => void;
    handleClose: () => void;
    handleError: (ev?: Event) => void;
    token: string | null;
    user: unknown;
    hasShownConnectionStatusRef: React.MutableRefObject<boolean>;
    children: ReactNode;
}

const WebSocketProviderConnected = ({
    connectionUrl,
    handleMessage,
    handleOpen,
    handleClose,
    handleError,
    token,
    user,
    hasShownConnectionStatusRef,
    children
}: WebSocketProviderConnectedProps) => {
    const { send, readyState } = useWebSocket({
        url: connectionUrl,
        maxReconnectAttempts: 3,
        reconnectIntervalMs: 2000,
        onMessage: handleMessage,
        onOpen: handleOpen,
        onClose: handleClose,
        onError: handleError,
    });

    // Efecto para manejar cambios de autenticación
    useEffect(() => {
        if (!token || !user) {
            hasShownConnectionStatusRef.current = false;
        }
    }, [token, user, hasShownConnectionStatusRef]);

    // Memoizar el contextValue para evitar re-renders innecesarios
    const contextValue: WebSocketContextValue = useMemo(() => ({
        isConnected: readyState === "OPEN",
        send,
    }), [readyState, send]);

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
};
