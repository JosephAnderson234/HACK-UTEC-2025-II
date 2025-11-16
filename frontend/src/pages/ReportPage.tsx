import type { ReportDetail } from "@/interfaces/api";
import { findById } from "@/services/report/findById";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from '../components/buttons/BackButton';

export default function ReportPage() {
    const { id } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [currentData, setCurrentData] = useState<ReportDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();


    useEffect(() => {
        let isActive = true;
        const fetchReport = async () => {
            if (!id) return;
            setIsLoading(true);
            setError(null);
            try {
                const reportData = await findById(id);
                if (!isActive) return;
                setCurrentData(reportData.report);
                setIsLoading(false);
            }
            catch (error) {
                if (!isActive) return;
                console.error("Error fetching report:", error);
                setError((error as Error)?.message ?? String(error));
                setIsLoading(false);
            }
        };
        fetchReport();
        return () => {
            isActive = false;
        }
    }, [id]);

    return (
        <div className="min-h-screen bg-gray-50 py-8 relative">
            <BackButton />
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <button type="button" onClick={() => navigate(-1)} className="text-sm text-(--color-primary) hover:underline">
                            ← Volver
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 mt-2">Detalle del reporte</h1>
                        <p className="text-sm text-gray-600">ID: {currentData?.id_reporte ?? "-"}</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 bg-white rounded shadow-sm text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-(--color-primary) border-r-transparent mb-4" />
                        <p className="text-gray-600">Cargando reporte...</p>
                    </div>
                ) : error ? (
                    <div className="p-6 bg-red-50 border border-red-100 text-red-800 rounded">
                        <strong>Error:</strong> {error}
                    </div>
                ) : currentData ? (
                    <article className="bg-white shadow-sm rounded border border-gray-200 overflow-hidden">
                        {/* Imagen comentada: backend devuelve URL S3 por ahora; descomentar cuando esté en HTTP */}
                        {/* <img src={currentData.image_url ?? ''} alt="Imagen del reporte" className="w-full h-64 object-cover" /> */}

                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-700">Estado:</span>
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm font-semibold text-gray-800">{currentData.estado}</span>
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm font-semibold text-gray-800">{currentData.urgencia}</span>
                                </div>
                            </div>

                            <h2 className="text-xl font-semibold text-gray-900">{currentData.lugar?.name ?? 'Lugar desconocido'}</h2>
                            <p className="mt-3 text-gray-700 whitespace-pre-line">{currentData.descripcion}</p>

                            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                    <dt className="font-medium text-gray-800">Autor</dt>
                                    <dd>{currentData.author ? `${currentData.author.first_name} ${currentData.author.last_name ?? ''}` : '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-800">Asignado</dt>
                                    <dd>{currentData.assigned ? `${currentData.assigned.first_name} ${currentData.assigned.last_name ?? ''}` : '—'}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-800">Ubicación</dt>
                                    <dd>{currentData.lugar?.tower ?? ''} {currentData.lugar?.floor ? `· Piso ${currentData.lugar.floor}` : ''}</dd>
                                </div>
                                <div>
                                    <dt className="font-medium text-gray-800">Creado</dt>
                                    <dd>{new Date(currentData.created_at).toLocaleString()}</dd>
                                </div>
                            </dl>
                        </div>
                    </article>
                ) : (
                    <div className="p-6 bg-white rounded shadow-sm text-center">Reporte no disponible.</div>
                )}
            </div>
        </div>
    )
}