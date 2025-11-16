import { Link } from "react-router-dom";

export default function HomePage(){
    return(
    <main className="min-h-screen flex items-center justify-center bg-(--color-primary)">
            <section className="max-w-3xl w-full p-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4 text-(--color-tertiary)">Bienvenido a ALERTA UTEC</h1>
                    <p className="text-lg text-(--color-tertiary) mb-6">
                        Plataforma para crear y enviar reportes. Aquí puedes revisar tus reportes y recibir notificaciones.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link to="/login" className="block text-center py-3 rounded-md bg-(--color-secondary) text-(--color-primary) hover:opacity-90">Iniciar sesión</Link>
                    <Link to="/register" className="block text-center py-3 rounded-md border border-(--color-secondary) text-(--color-tertiary) hover:bg-(--color-secondary) hover:text-(--color-primary)">Registrar (solo estudiantes)</Link>
                </div>

                <p className="mt-6 text-sm text-(--color-tertiary)">
                    Nota: El registro está habilitado únicamente para estudiantes. Si perteneces al staff o a otra categoría, contacta al administrador para crear una cuenta.
                </p>
            </section>
        </main>
    )
}