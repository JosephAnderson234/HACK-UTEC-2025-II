import { AuthContext } from "./context";
import { useToken } from "@/store/authStore";


export default function AuthContextProvider({ children }: { children: React.ReactNode }) {
    const { token, setToken } = useToken();




    return (
        <AuthContext.Provider value={{ token, setToken }}>
            {children}
        </AuthContext.Provider>
    );
}