import { useNavigate } from "react-router-dom";

export default function BackButton (){
    const navigate = useNavigate();
    return (
        <button
            aria-label="Volver"
            onClick={() => navigate(-1)}
            className="fixed top-24 left-4 z-50 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-(--color-secondary) bg-transparent text-(--color-tertiary) shadow-sm hover:bg-(--color-secondary) hover:text-(--color-primary) transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-(--color-secondary)"
        >
            {/* Icono flecha izquierda */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L4.414 9H18a1 1 0 110 2H4.414l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Volver</span>
        </button>
    );
}