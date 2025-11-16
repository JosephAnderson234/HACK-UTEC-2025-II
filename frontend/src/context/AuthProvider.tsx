import type { AuthRegisterRequest, AuthRequest } from "@/interfaces/context/AuthContext";
import { AuthContext } from "./context";
import { useToken } from "@/store/authStore";
import { login } from "@/services/auth";
import { register } from "@/services/auth";
import type { DataAuthority, DataStudent, UserResponse } from "@/interfaces/user";

const handleLogout = (setter: (token: string | null) => void) => {
    setter(null);
};


const handleLogin = async (credentials: AuthRequest, setter: (token: string) => void, setterData: (user: UserResponse & { data_student?: DataStudent } & { data_authority?: DataAuthority }) => void) => {
    const response = await login(credentials);

    setter(response.token);
    setterData(response.user);
};

const handleRegister = async (data: AuthRegisterRequest, setter: (token: string) => void, setterData: (user: UserResponse & { data_student?: DataStudent } & { data_authority?: DataAuthority }) => void) => {

    const response = await register(data);
    setter(response.token);
    setterData(response.user);
}

export default function AuthContextProvider({ children }: { children: React.ReactNode }) {
    const { token, setToken, user, setUser } = useToken();


    return (
        <AuthContext.Provider value={{
            token,
            login: (credentials: AuthRequest) => handleLogin(credentials, setToken, setUser),
            register: (data: AuthRegisterRequest) => handleRegister(data, setToken, setUser),
            logout: () => handleLogout(setToken),
            user
        }}>
            {children}
        </AuthContext.Provider>
    );
}