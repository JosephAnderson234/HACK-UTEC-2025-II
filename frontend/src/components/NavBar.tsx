
import utecLogo from "@/assets/UTEC-Logo.jpg";
import type { Role } from "@/interfaces/user";
import useAuth from "@/hooks/useAuth";
import { decodeJWT } from "@/utils/jwtDocoder";
import { Link, useLocation, useNavigate } from "react-router-dom";

const linksByRole: Record<Role, { name: string; href: string }[]> = {
    admin: [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Gestionar Autoridades', href: '/admin/users' },
        { name: 'All reports', href: '/report' },
        { name: 'Nuevo Reporte', href: '/report/new' },
        { name: 'Nuevo Reporte', href: '/predictions' }
    ],
    authority: [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Nuevo Reporte', href: '/report/new' },
        { name: 'All reports', href: '/report' },
        {name:"Mis Asignaciones", href:"/report/assigned"}
    ],
    student: [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Nuevo Reporte', href: '/report/new' },
        { name: 'Mis Reportes', href: '/my-report/' }
    ]
};

export default function NavBar() {
    const location = useLocation();
    const { token, logout } = useAuth();
    const navigate = useNavigate();
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
        <header className="bg-(--color-tertiary) text-(--color-primary) p-4 shadow-md">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img src={utecLogo} alt="UTEC Logo" className="h-10 w-auto rounded" />
                    <div>
                        <div className="text-lg font-semibold">Sistema de Reportes UTEC</div>
                        <div className="text-xs text-(--color-primary) opacity-80">Plataforma de gestión y notificación de reportes</div>
                    </div>
                </div>

                <nav aria-label="Main navigation" className="flex-1 mx-6">
                    {token && links.length > 0 ? (
                        <ul className="flex flex-wrap justify-center items-center gap-2">
                            {links.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        to={link.href}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === link.href
                                            ? 'bg-(--color-secondary) text-(--color-primary) shadow'
                                            : 'text-(--color-primary) hover:bg-(--color-secondary) hover:text-(--color-primary)'
                                        }`}
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        // cuando no está loggeado mostramos un pequeño tagline centrado en pantallas md+
                        <div className="hidden md:flex justify-center w-full">
                            <span className="text-sm text-(--color-primary) opacity-90"> </span>
                        </div>
                    )}
                </nav>

                <div className="flex items-center gap-3">
                    {token ? (
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-(--color-primary) text-(--color-tertiary) font-semibold">{username ? username[0].toUpperCase() : '?'}</div>
                            <div className="flex flex-col text-right">
                                <span className="text-sm font-medium">{username ?? 'Usuario'}</span>
                                {claims?.role && <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-primary) text-(--color-tertiary) opacity-90">{claims.role}</span>}
                            </div>
                            <button
                                onClick={() => {
                                    logout();
                                    // force navigate to home after logout to avoid staying on protected route
                                    navigate('/');
                                }}
                                className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-(--color-secondary) text-(--color-primary) hover:opacity-90 transition-colors"
                            >Cerrar sesión</button>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <Link
                                to="/login"
                                className="w-full sm:w-auto text-center px-3 py-2 rounded-md text-sm font-medium border border-(--color-secondary) text-(--color-primary) hover:bg-(--color-secondary) hover:text-(--color-primary) transition-colors"
                            >
                                Iniciar sesión
                            </Link>
                            <Link
                                to="/register"
                                className="w-full sm:w-auto text-center px-3 py-2 rounded-md text-sm font-medium bg-(--color-secondary) text-(--color-primary) hover:opacity-90 transition-colors"
                            >
                                Registrar (estudiantes)
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}