import type { PaginationResponse } from "@/interfaces/api";

interface Props {
    /**
     * Página actual (1-indexed). Si no se envía, se usa pagination.current_page.
     */
    page?: number;
    /**
     * Información de paginación proveniente de la API.
     */
    pagination: PaginationResponse;
    /**
     * Handler para ir a la página siguiente.
     */
    onNext: () => void | Promise<void>;
    /**
     * Handler para ir a la página anterior.
     */
    onPrevious: () => void | Promise<void>;
    /**
     * (Opcional) Clases extra para el contenedor raíz.
     */
    className?: string;
    /**
     * (Opcional) Mostrar texto de totales (página X de Y · N ítems). Por defecto true.
     */
    showTotals?: boolean;
    /**
     * (Opcional) Etiquetas de accesibilidad/UX.
     */
    labels?: {
        previous?: string;
        next?: string;
        page?: string; // prefijo para "Página"
        of?: string;   // conector para "de"
        items?: string; // sufijo para "ítems"
    };
}

export const NavegationPaginated = ({
    page,
    onNext,
    onPrevious,
    pagination,
    className,
    showTotals = true,
    labels,
}: Props) => {
    const currentPage = Number.isFinite(page) && (page as number) > 0 ? (page as number) : pagination.current_page;
    const totalPages = Math.max(1, pagination.total_pages || 1);

    const canPrev = Boolean(pagination.has_previous && currentPage > 1);
    const canNext = Boolean(pagination.has_next && currentPage < totalPages);

    const ui = {
        previous: labels?.previous ?? "Anterior",
        next: labels?.next ?? "Siguiente",
        page: labels?.page ?? "Página",
        of: labels?.of ?? "de",
        items: labels?.items ?? "ítems",
    };

    return (
        <div className={`flex items-center justify-between mt-4 gap-4 ${className ?? ""}`}>
            <button
                type="button"
                onClick={onPrevious}
                disabled={!canPrev}
                aria-label={ui.previous}
                aria-disabled={!canPrev}
                className="px-4 py-2 rounded bg-gray-300 text-gray-700 disabled:opacity-50 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-secondary)"
            >
                {ui.previous}
            </button>

            <div className="flex-1 text-center text-sm text-gray-600">
                {showTotals && (
                    <span>
                        {ui.page} {currentPage} {ui.of} {totalPages}
                        {typeof pagination.total_items === "number" && (
                            <>
                                {" "}· {pagination.total_items} {ui.items}
                            </>
                        )}
                    </span>
                )}
            </div>

            <button
                type="button"
                onClick={onNext}
                disabled={!canNext}
                aria-label={ui.next}
                aria-disabled={!canNext}
                className="px-4 py-2 rounded bg-gray-300 text-gray-700 disabled:opacity-50 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-secondary)"
            >
                {ui.next}
            </button>
        </div>
    );
};


export const SearchBar = ({term, setTerm}: {term: string; setTerm: React.Dispatch<React.SetStateAction<string>>}) => {
    return (
        <div className="w-full max-w-md mx-auto mb-4">
            <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-(--color-secondary) focus:border-(--color-secondary)"
            />
        </div>
    )
}