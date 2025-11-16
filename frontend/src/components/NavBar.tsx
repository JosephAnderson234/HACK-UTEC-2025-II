
import utecLogo from "@/assets/UTEC-Logo.jpg";
import type { Role } from "@/interfaces/user";
import useAuth from "@/hooks/useAuth";
import { decodeJWT } from "@/utils/jwtDocoder";
import { Link, useLocation } from "react-router-dom";

const linksByRole: Record<Role, { name: string; href: string }[]> = {
    admin: [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Manage Users', href: '/admin/users' },
        { name: 'Reportes', href: '/report' }
    ],
    authority: [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Mis Reportes', href: '/authority/reports' },
        { name: 'Nuevo Reporte', href: '/report/new' },
        { name: 'Reportes', href: '/report' }
    ],
    student: [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Nuevo Reporte', href: '/report/new' },
        { name: 'Mis Reportes', href: '/report' }
    ]
};

export default function NavBar() {
    const location = useLocation();
    const { token } = useAuth();
    let links: { name: string; href: string }[] = [];
    const claims = token ? (decodeJWT(token) as { role?: Role; email?: string } | null) : null;
    if (claims?.role && linksByRole[claims.role]) {
        links = linksByRole[claims.role];
    }

    // No mostrar NavBar en la página de login o register
    if (location.pathname === '/login' || location.pathname === '/register') {
        return null;
    }

    const username = claims?.email ? String(claims.email).split('@')[0] : undefined;

    return (
        <header className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center space-x-3">
                <img src={utecLogo} alt="UTEC Logo" className="h-10 w-auto rounded" />
                <span className="text-lg font-semibold">Sistema de Reportes UTEC</span>
            </div>

            <div className="flex flex-col items-end space-y-2">
                {token && (
                    <div className="text-sm font-medium">
                        Bienvenido{username ? `, ${username}` : ''}
                    </div>
                )}

                <nav aria-label="Main navigation">
                    <ul className="flex space-x-4">
                        {token && links.length > 0 ? (
                            links.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        to={link.href}
                                        className={`px-3 py-2 rounded transition-colors ${location.pathname === link.href
                                                ? 'bg-blue-500 text-white font-semibold'
                                                : 'text-white hover:bg-gray-700'
                                            }`}
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))
                        ) : (
                            !token && (
                                <>
                                    <li>
                                        <Link
                                            to="/login"
                                            className="px-3 py-2 rounded text-white hover:bg-gray-700 transition-colors"
                                        >
                                            Login
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="/register"
                                            className="px-3 py-2 rounded text-white hover:bg-gray-700 transition-colors"
                                        >
                                            Register
                                        </Link>
                                    </li>
                                </>
                            )
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
}