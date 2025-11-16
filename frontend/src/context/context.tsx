import { createContext } from "react";
import type {AuthContextType} from "@/interfaces/context/AuthContext";
import type { NotificationContextProps } from "@/interfaces/context/NotificationContext";


export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);