import useAuth from "@/hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";


export default function ProtectedRoute() {
	const authContext = useAuth();
	const location = useLocation();

	if (!authContext.token )
		return <Navigate to={`/login?from=${location.pathname}`} replace />;

	return <Outlet />;
}