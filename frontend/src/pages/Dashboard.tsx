import StudentDashboard from "@/components/sections/StudentDashboard";
import useAuth from "@/hooks/useAuth"
import type { Role } from "@/interfaces/user";
import { decodeJWT } from "@/utils/jwtDocoder";
import type { JSX } from "react";

export default function DashboardPage () {


    const {token} = useAuth();


    //we are into a protected route so here we can use the token
    let role

    if (token){
        const decoded = decodeJWT(token);
        if (decoded){
            role = decoded.role;
        }
    }


    const DasboardsByRole: Record<Role, JSX.Element> = {
        student: <StudentDashboard />,
        authority: <div>Teacher Dashboard Section</div>,
        admin: <div>Admin Dashboard Section</div>,
    }

    return(
        <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-primary)' }}>
            {role && DasboardsByRole[role]}
        </div>
    )
}