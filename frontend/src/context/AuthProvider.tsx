import type { AuthRequest } from "@/interfaces/context/AuthContext";
import { AuthContext } from "./context";
import { useToken } from "@/store/authStore";
import { login } from "@/services/auth";


const handleLogout = (setter: (token: string | null) => void) => {
    setter(null);
};


const handleLogin = async (credentials: AuthRequest, setter: (token: string) => void) => {
    const response = await login(credentials);
    setter(response.token);
};

export default function AuthContextProvider({ children }: { children: React.ReactNode }) {
    const { token, setToken } = useToken();


    return (
        <AuthContext.Provider value={{ token, login: (credentials: AuthRequest) => handleLogin(credentials, setToken), logout: () => handleLogout(setToken) }}>
            {children}
        </AuthContext.Provider>
    );
}