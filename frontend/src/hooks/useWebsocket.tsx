/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";

export type ReadyState = "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED";

export interface UseWebSocketOptions {
    url: string;
    protocols?: string | string[];
    maxReconnectAttempts?: number;
    reconnectIntervalMs?: number; // base interval for exponential backoff
    onMessage?: (data: any) => void;
    onOpen?: () => void;
    onClose?: (ev?: CloseEvent) => void;
    onError?: (ev?: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
    const {
        url,
        protocols,
        maxReconnectAttempts = 10,
        reconnectIntervalMs = 1000,
        onMessage,
        onOpen,
        onClose,
        onError,
    } = options;

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mounted = useRef(true);
    const messageQueue = useRef<any[]>([]);
    const connectRef = useRef<() => void>(() => {});

    const [readyState, setReadyState] = useState<ReadyState>("CLOSED");
    const [lastMessage, setLastMessage] = useState<any>(null);

    const connect = useCallback(() => {
        if (!mounted.current) return;
        setReadyState("CONNECTING");
        const ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            reconnectAttempts.current = 0;
            setReadyState("OPEN");
            onOpen?.();
            // enviar mensajes encolados si los hay
            try {
                while (messageQueue.current.length > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const m = messageQueue.current.shift();
                    wsRef.current.send(m);
                }
            } catch {
                // ignore send errors here
            }
        };

        ws.onmessage = (ev) => {
            let payload: any = ev.data;
            try {
                payload = JSON.parse(ev.data);
            } catch {
                // non-json payload
            }
            setLastMessage(payload);
            onMessage?.(payload);
        };

        ws.onclose = (ev) => {
            setReadyState("CLOSED");
            onClose?.(ev);
            // reconectar si no excede intentos
            if (mounted.current && reconnectAttempts.current < maxReconnectAttempts) {
                const backoff = reconnectIntervalMs * 2 ** reconnectAttempts.current;
                reconnectAttempts.current += 1;
                reconnectTimer.current = window.setTimeout(() => {
                    // use connectRef to avoid accessing connect before declaration
                    connectRef.current();
                }, backoff);
            }
        };

        ws.onerror = (ev) => {
            onError?.(ev);
        };
    }, [url, protocols, maxReconnectAttempts, reconnectIntervalMs, onMessage, onOpen, onClose, onError]);

    // mantener referencia actualizada a la función connect para llamadas desde timers
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        mounted.current = true;
        // avoid synchronous setState inside effect by scheduling connect
        const t = window.setTimeout(() => {
            connectRef.current();
        }, 0);

        return () => {
            mounted.current = false;
            if (t) window.clearTimeout(t);
            if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
            wsRef.current = null;
        };
    }, [connect]);

    /**
     * Envía un mensaje. Si el socket no está abierto, lo encola y retorna false.
     * Retorna true si el mensaje fue enviado inmediatamente.
     */
    const send = useCallback((data: any): boolean => {
        const ws = wsRef.current;
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            // encolar para enviar al abrir
            messageQueue.current.push(payload);
            return false;
        }
        ws.send(payload);
        return true;
    }, []);

    const close = useCallback(() => {
        if (reconnectTimer.current) {
            window.clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
        }
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch {
                // ignore
            }
            wsRef.current = null;
        }
    }, []);

    return {
        send,
        close,
        lastMessage,
        readyState,
    };
}