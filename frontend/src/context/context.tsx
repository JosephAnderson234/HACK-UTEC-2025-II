import { createContext } from "react";
import type {AuthContextType} from "@/interfaces/context/AuthContext";


export const AuthContext = createContext<AuthContextType | undefined>(undefined);