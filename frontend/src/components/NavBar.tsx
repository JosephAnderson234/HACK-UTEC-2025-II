
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
        <header className="bg-(--color-tertiary) text-(--color-primary) p-4 shadow-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img src={utecLogo} alt="UTEC Logo" className="h-10 w-auto rounded" />
                    <div>
                        <div className="text-lg font-semibold">Sistema de Reportes UTEC</div>
                        <div className="text-xs text-(--color-primary) opacity-80">Plataforma de gestión y notificación de reportes</div>
                    </div>
                </div>

                <nav aria-label="Main navigation" className="flex-1 mx-6">
                    <ul className="flex flex-wrap justify-center items-center gap-2">
                        {token && links.length > 0 ? (
                            links.map((link) => (
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
                            ))
                        ) : (
                            !token && (
                                <>
                                    <li>
                                        <Link
                                            to="/login"
                                            className="px-3 py-2 rounded-md text-sm font-medium border border-(--color-secondary) text-(--color-primary) hover:bg-(--color-secondary) hover:text-(--color-primary) transition-colors"
                                        >
                                            Iniciar sesión
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="/register"
                                            className="px-3 py-2 rounded-md text-sm font-medium bg-(--color-secondary) text-(--color-primary) hover:opacity-90 transition-colors"
                                        >
                                            Registrar (estudiantes)
                                        </Link>
                                    </li>
                                </>
                            )
                        )}
                    </ul>
                </nav>

                <div className="flex items-center gap-3">
                    {token ? (
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-(--color-primary) text-(--color-tertiary) font-semibold">{username ? username[0].toUpperCase() : '?'}</div>
                            <div className="flex flex-col text-right">
                                <span className="text-sm font-medium">{username ?? 'Usuario'}</span>
                                {claims?.role && <span className="text-xs px-2 py-0.5 rounded-full bg-(--color-primary) text-(--color-tertiary) opacity-90">{claims.role}</span>}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}