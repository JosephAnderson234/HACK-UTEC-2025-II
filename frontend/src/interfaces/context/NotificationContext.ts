
export interface NotificationData {
    message: string;
    type?: "success" | "error" | "info";
    duration?: number; 
}

export interface NotificationContextProps {
    showNotification: (data: NotificationData) => void;
    hideNotification: () => void;
}