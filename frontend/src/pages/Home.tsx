import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import { useEffect } from "react";
export default function HomePage(){
    const navigate = useNavigate();
    const { token } = useAuth();
    
    useEffect(() => {
        if (token) {
            navigate('/dashboard');
        }
    }, [token, navigate]);
    
    return(
        <main className="min-h-screen flex items-center justify-center bg-(--color-primary) p-4">
            <section className="max-w-4xl w-full">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="inline-block mb-6">
                        <div className="bg-(--color-secondary) text-(--color-primary) px-4 py-2 rounded-full text-sm font-semibold mb-4 inline-block">
                             Sistema de Reportes UTEC
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black mb-6 text-(--color-tertiary) leading-tight">
                        Bienvenido a<br />
                        <span className="text-(--color-secondary)">ALERTA UTEC</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-(--color-tertiary) mb-8 max-w-2xl mx-auto leading-relaxed">
                        Plataforma integral para crear, gestionar y dar seguimiento a reportes de incidencias en el campus.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white/5 backdrop-blur-sm border border-(--color-secondary)/20 rounded-xl p-6 text-center hover:bg-white/10 transition-all">
                        <div className="text-4xl mb-3">📝</div>
                        <h3 className="text-lg font-bold text-(--color-tertiary) mb-2">Crea Reportes</h3>
                        <p className="text-sm text-(--color-tertiary)/80">Informa incidencias de forma rápida y sencilla</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm border border-(--color-secondary)/20 rounded-xl p-6 text-center hover:bg-white/10 transition-all">
                        <div className="text-4xl mb-3">🔔</div>
                        <h3 className="text-lg font-bold text-(--color-tertiary) mb-2">Recibe Notificaciones</h3>
                        <p className="text-sm text-(--color-tertiary)/80">Mantente informado del estado de tus reportes</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm border border-(--color-secondary)/20 rounded-xl p-6 text-center hover:bg-white/10 transition-all">
                        <div className="text-4xl mb-3">📊</div>
                        <h3 className="text-lg font-bold text-(--color-tertiary) mb-2">Seguimiento</h3>
                        <p className="text-sm text-(--color-tertiary)/80">Revisa el progreso de tus reportes en tiempo real</p>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="bg-white/5 backdrop-blur-sm border border-(--color-secondary)/20 rounded-2xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-(--color-tertiary) text-center mb-6">Comienza Ahora</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        <Link 
                            to="/login" 
                            className="block text-center py-4 px-6 rounded-xl bg-(--color-secondary) text-(--color-primary) font-semibold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-lg"
                        >
                             Iniciar Sesión
                        </Link>
                        <Link 
                            to="/register" 
                            className="block text-center py-4 px-6 rounded-xl border-2 border-(--color-secondary) text-(--color-tertiary) font-semibold text-lg hover:bg-(--color-secondary) hover:text-(--color-primary) hover:scale-105 transition-all"
                        >
                             Registrarse
                        </Link>
                    </div>
                </div>

                {/* Info Notice */}
                <div className="bg-(--color-secondary)/10 border border-(--color-secondary)/30 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">ℹ️</div>
                        <div>
                            <h4 className="font-bold text-(--color-tertiary) mb-2">Información Importante</h4>
                            <p className="text-sm text-(--color-tertiary)/90 leading-relaxed">
                                El registro está habilitado únicamente para <strong>estudiantes</strong>. Si perteneces al staff, autoridades o administración, contacta al administrador del sistema para la creación de tu cuenta.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}