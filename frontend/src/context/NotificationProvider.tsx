import Notification from "@/components/Notification";
import type { NotificationData } from "@/interfaces/context/NotificationContext";
import { useState, useCallback, type ReactNode } from "react";
import { NotificationContext } from "./context";

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notification, setNotification] = useState<NotificationData & { visible: boolean }>({ message: "", type: "info", visible: false });
    const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

    const hideNotification = useCallback(() => {
        setNotification((n) => ({ ...n, visible: false }));
        if (timeoutId) clearTimeout(timeoutId);
    }, [timeoutId]);

    const showNotification = useCallback((data: NotificationData) => {
        setNotification({ ...data, visible: true });
        if (timeoutId) clearTimeout(timeoutId);
        if (data.duration && data.duration > 0) {
            const id = setTimeout(() => setNotification((n) => ({ ...n, visible: false })), data.duration);
            setTimeoutId(id);
        }
    }, [timeoutId]);

    return (
        <NotificationContext.Provider value={{ showNotification, hideNotification }}>
            {children}
            <Notification
                message={notification.message}
                visible={notification.visible}
                onClose={hideNotification}
                status={notification.type || "info"}
            />
        </NotificationContext.Provider>
    );
};