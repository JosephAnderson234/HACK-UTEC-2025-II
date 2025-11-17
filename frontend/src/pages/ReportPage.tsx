import type { ReportDetail } from "@/interfaces/api";
import { findById } from "@/services/report/findById";
import { assignSelfReport } from "@/services/report/assignReport";
import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { NotificationContext } from "@/context/context";
import useAuth from "@/hooks/useAuth";
import ProtectedComponent from "@/components/ProtectedComponent";

export default function ReportPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const notificationContext = useContext(NotificationContext);

    const [isLoading, setIsLoading] = useState(true);
    const [currentData, setCurrentData] = useState<ReportDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    

    const fetchReport = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        //refresh al final
        try {
            const reportData = await findById(id);
            setCurrentData(reportData.report);
        
        } catch (error) {
            console.error("Error fetching report:", error);
            setError((error as Error)?.message ?? String(error));
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleSelfAssign = async () => {
        if (!id || !user?.id) return;
        setIsAssigning(true);
        try {
            await assignSelfReport(id);
            notificationContext?.showNotification({ message: "Te has asignado el reporte exitosamente", type: "success" });
            await fetchReport();
        } catch (error) {
            console.error("Error self-assigning:", error);
            notificationContext?.showNotification({ message: (error as Error).message || "Error al asignarte el reporte", type: "error" });
        } finally {
            setIsAssigning(false);
        }
        
    };



    const getStatusColor = (estado: string) => {
        switch (estado) {
            case "PENDIENTE": return "bg-yellow-100 text-yellow-800";
            case "ATENDIENDO": return "bg-blue-100 text-blue-800";
            case "RESUELTO": return "bg-green-100 text-green-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getUrgencyColor = (urgencia: string) => {
        switch (urgencia) {
            case "BAJA": return "bg-green-100 text-green-800";
            case "MEDIA": return "bg-yellow-100 text-yellow-800";
            case "ALTA": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 text-lg">Cargando reporte...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                        ← Volver
                    </button>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h2 className="text-red-800 font-semibold text-lg mb-2">Error al cargar el reporte</h2>
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentData) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                        ← Volver
                    </button>
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <p className="text-gray-600">Reporte no disponible.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-blue-600 hover:text-blue-700 font-medium mb-2 inline-block"
                    >
                        ← Volver
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Detalle del Reporte</h1>
                    <p className="text-sm text-gray-500 mt-1">ID: {currentData.id_reporte}</p>
                </div>

                {/* Card Principal */}
                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                    {/* Imagen del reporte si existe */}
                    {currentData.image_url && (
                        <img 
                            src={currentData.image_url} 
                            alt="Imagen del reporte" 
                            className="w-full h-64 object-cover"
                        />
                    )}

                    <div className="p-6">
                        {/* Estado y Urgencia */}
                        <div className="flex gap-2 mb-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentData.estado)}`}>
                                {currentData.estado}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(currentData.urgencia)}`}>
                                {currentData.urgencia}
                            </span>
                        </div>

                        {/* Lugar */}
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                            {currentData.lugar?.name ?? 'Lugar desconocido'}
                        </h2>
                        
                        {/* Ubicación detallada */}
                        {(currentData.lugar?.tower || currentData.lugar?.floor !== undefined) && (
                            <p className="text-gray-600 mb-4">
                                {currentData.lugar?.tower && `Torre ${currentData.lugar.tower}`}
                                {currentData.lugar?.tower && currentData.lugar?.floor !== undefined && ' · '}
                                {currentData.lugar?.floor !== undefined && `Piso ${currentData.lugar.floor}`}
                            </p>
                        )}

                        {/* Descripción */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h3>
                            <p className="text-gray-700 whitespace-pre-line">{currentData.descripcion}</p>
                        </div>

                        {/* Información adicional */}
                        <div className="border-t border-gray-200 pt-6">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 mb-1">Autor</dt>
                                    <dd className="text-gray-900">
                                        {currentData.author 
                                            ? `${currentData.author.first_name} ${currentData.author.last_name ?? ''}`
                                            : '—'}
                                    </dd>
                                    {currentData.author?.email && (
                                        <dd className="text-sm text-gray-600">{currentData.author.email}</dd>
                                    )}
                                </div>
                                
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 mb-1">Asignado a</dt>
                                    <dd className="text-gray-900">
                                        {currentData.assigned 
                                            ? `${currentData.assigned.first_name} ${currentData.assigned.last_name ?? ''}`
                                            :
                                            <>
                                            <ProtectedComponent requiredRoles={[ 'authority']}>
                                                <button
                                                    onClick={handleSelfAssign}
                                                    disabled={isAssigning}
                                                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-400"
                                                >
                                                    {isAssigning ? 'Asignando...' : 'Asignarme este reporte'}
                                            </button>
                                            </ProtectedComponent>
                                            <ProtectedComponent requiredRoles={['admin']}>
                                                <span>No asignado</span>
                                            </ProtectedComponent>
                                            
                                            </>}
                                    </dd>
                                    {currentData.assigned?.email && (
                                        <dd className="text-sm text-gray-600">{currentData.assigned.email}</dd>
                                    )}
                                </div>

                                <div>
                                    <dt className="text-sm font-medium text-gray-500 mb-1">Fecha de creación</dt>
                                    <dd className="text-gray-900">
                                        {new Date(currentData.created_at).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="text-sm font-medium text-gray-500 mb-1">Última actualización</dt>
                                    <dd className="text-gray-900">
                                        {new Date(currentData.updated_at).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </dd>
                                </div>

                                {currentData.resolved_at && (
                                    <div className="sm:col-span-2">
                                        <dt className="text-sm font-medium text-gray-500 mb-1">Fecha de resolución</dt>
                                        <dd className="text-gray-900">
                                            {new Date(currentData.resolved_at).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>


                    </div>
                </div>

            </div>
        </div>
    );
}