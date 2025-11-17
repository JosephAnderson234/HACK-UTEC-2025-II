import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-(--color-primary)">
            <div className="max-w-3xl w-full">
                <div className="bg-white/95 rounded-2xl shadow-2xl p-10 border border-white/20 text-center">
                    <div className="flex items-center justify-center mb-6">
                        <div className="rounded-full p-4" style={{ background: 'linear-gradient(135deg, #00BFFE 0%, #11C4FC 100%)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-5xl font-extrabold mb-2" style={{ color: '#231F20' }}>404</h1>
                    <p className="text-lg mb-6 text-(--color-tertiary)">Página no encontrada</p>

                    <p className="max-w-xl mx-auto text-sm text-tertiary/90 mb-6">
                        Lo sentimos, la página que intentas ver no existe o no tienes permiso para acceder.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <Link to="/" className="inline-block px-6 py-3 rounded-lg font-semibold shadow" style={{ background: '#00BFFE', color: '#FFFFFF' }}>
                            Ir al inicio
                        </Link>
                        <Link to="/login" className="inline-block px-6 py-3 rounded-lg font-semibold border-2" style={{ borderColor: '#145C74', color: '#145C74' }}>
                            Iniciar sesión
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}