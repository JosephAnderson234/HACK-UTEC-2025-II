import { useState, useEffect, useRef } from "react";
import { NavegationPaginated } from "@/components/Navegation";
import { getReports } from "@/services/report/getReports";
import type { GetReportsResponse } from "@/interfaces/api";
import { SearchBar } from '../components/Navegation';
import { ReportCard } from "@/components/cards/ReportCards";
import useDebounce from "@/hooks/useDebounce";


export default function AllReportsPage (){

    const [page, setPage] = useState(0);
    const size = 10;
    const [term, setTerm] = useState<string>("");
    const debouncedTerm = useDebounce(term, 500);
    const [currentData, setCurrentData] = useState<GetReportsResponse>();
    const requestSeqRef = useRef(0);

    const handleNextPage = () => {
        if (currentData?.pagination.has_next) {
            setPage((prevPage) => prevPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentData?.pagination.has_previous && page > 0) {
            setPage((prevPage) => prevPage - 1);
        }
    };

    const custemSetTerm: React.Dispatch<React.SetStateAction<string>> = (newTerm) => {
        setTerm(newTerm);
        setPage(0); // Reset to first page on new search term
    }


    useEffect(() => {
        let isActive = true;
        const seq = ++requestSeqRef.current;

        const fetchReports = async () => {
            try {
                const data = await getReports(debouncedTerm, page, size);
                // ignora respuestas antiguas o efecto desmontado
                if (!isActive || seq !== requestSeqRef.current) return;
                setCurrentData(data);
            } catch (error) {
                if (!isActive) return;
                console.error("Error fetching reports:", error);
            }
        };

        fetchReports();
        return () => {
            isActive = false;
        };
    }, [page, debouncedTerm]);

    return(
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-(--color-primary) mb-2">
                        Todos los Reportes
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                        Explora y filtra los reportes del sistema
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <SearchBar term={term} setTerm={custemSetTerm} />
                </div>

                {/* Reports Grid */}
                {!currentData ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-(--color-primary) border-r-transparent mb-4" role="status">
                                <span className="sr-only">Cargando...</span>
                            </div>
                            <p className="text-gray-600">Cargando reportes...</p>
                        </div>
                    </div>
                ) : currentData.reports.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No se encontraron reportes</h3>
                        <p className="text-sm text-gray-500">
                            {term ? `No hay resultados para "${term}"` : "Aún no hay reportes en el sistema"}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 mb-6">
                            {currentData.reports.map((report) => (
                                <ReportCard key={report.id_reporte} data={report} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {currentData.pagination && (
                            <NavegationPaginated 
                                page={page}
                                pagination={currentData.pagination} 
                                onNext={handleNextPage} 
                                onPrevious={handlePreviousPage} 
                            />
                        )}
                    </>
                )}

            </div>
        </div>
    )
}