import useAuth from "@/hooks/useAuth";
import type { Role } from "@/interfaces/user";


export default function ProtectedComponent({children, requiredRoles, publicAccess}:{children: React.ReactNode, requiredRoles: Role[], publicAccess?: boolean}) {
    const user = useAuth();

    if (!user.token) {
        return null;
    }
    if (!publicAccess && requiredRoles.length > 0 && !requiredRoles.includes(user.user.role)) {
        return null;
    }
    return <>{children}</>;
}