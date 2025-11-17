import type { ReportDetail } from "@/interfaces/api";
import type { ReportStatus } from "@/interfaces/api/common";
import { findById } from "@/services/report/findById";
import { assignReport } from "@/services/report/assignReport";
import { updateStatus } from "@/services/report/updateStatus";
import { getAuthoritiesBySector, type AuthorityUser } from "@/services/report/getAuthorities";
import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { NotificationContext } from "@/context/context";
import useAuth from "@/hooks/useAuth";

export default function ReportPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const notificationContext = useContext(NotificationContext);

    const [isLoading, setIsLoading] = useState(true);
    const [currentData, setCurrentData] = useState<ReportDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para asignación
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [authorities, setAuthorities] = useState<AuthorityUser[]>([]);
    const [selectedAuthority, setSelectedAuthority] = useState<string>("");
    const [isAssigning, setIsAssigning] = useState(false);
    
    // Estados para cambio de estado
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<ReportStatus>("PENDIENTE");
    const [statusComment, setStatusComment] = useState("");
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const fetchReport = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
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
            await assignReport(id, { 
                assigned_to: user.id,
                estado: "ATENDIENDO"
            });
            notificationContext?.showNotification({ message: "Te has asignado el reporte exitosamente", type: "success" });
            await fetchReport();
        } catch (error) {
            console.error("Error self-assigning:", error);
            notificationContext?.showNotification({ message: (error as Error).message || "Error al asignarte el reporte", type: "error" });
        } finally {
            setIsAssigning(false);
        }
    };

    const handleOpenAssignModal = async () => {
        if (!currentData?.assigned_sector) return;
        try {
            const data = await getAuthoritiesBySector(currentData.assigned_sector);
            setAuthorities(data.users || []);
            setShowAssignModal(true);
        } catch (error) {
            console.error("Error fetching authorities:", error);
            notificationContext?.showNotification({ message: "Error al cargar autoridades", type: "error" });
        }
    };

    const handleAssignToAuthority = async () => {
        if (!id || !selectedAuthority) return;
        setIsAssigning(true);
        try {
            await assignReport(id, { 
                assigned_to: selectedAuthority,
                estado: "ATENDIENDO"
            });
            notificationContext?.showNotification({ message: "Reporte asignado exitosamente", type: "success" });
            setShowAssignModal(false);
            setSelectedAuthority("");
            await fetchReport();
        } catch (error) {
            console.error("Error assigning report:", error);
            notificationContext?.showNotification({ message: (error as Error).message || "Error al asignar reporte", type: "error" });
        } finally {
            setIsAssigning(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!id) return;
        setIsUpdatingStatus(true);
        try {
            await updateStatus({
                id_reporte: id,
                estado: selectedStatus,
                comentario: statusComment
            });
            notificationContext?.showNotification({ message: "Estado actualizado exitosamente", type: "success" });
            setShowStatusModal(false);
            setStatusComment("");
            await fetchReport();
        } catch (error) {
            console.error("Error updating status:", error);
            notificationContext?.showNotification({ message: (error as Error).message || "Error al actualizar estado", type: "error" });
        } finally {
            setIsUpdatingStatus(false);
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
                                            : 'Sin asignar'}
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

                        {/* Botones de acción */}
                        {(user?.role === 'authority' || user?.role === 'admin') && (
                            <div className="border-t border-gray-200 pt-6 mt-6 flex flex-wrap gap-3">
                                {/* Botón auto-asignarse (solo authority, si no está asignado) */}
                                {user?.role === 'authority' && !currentData.assigned_to && (
                                    <button
                                        onClick={handleSelfAssign}
                                        disabled={isAssigning}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isAssigning ? 'Asignando...' : 'Asignarme este reporte'}
                                    </button>
                                )}

                                {/* Botón asignar a authority (solo admin) */}
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={handleOpenAssignModal}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                                    >
                                        Asignar a Authority
                                    </button>
                                )}

                                {/* Botón cambiar estado (authority asignado o admin) */}
                                {(user?.role === 'admin' || (user?.role === 'authority' && currentData.assigned_to === user?.id)) && (
                                    <button
                                        onClick={() => {
                                            setSelectedStatus(currentData.estado);
                                            setShowStatusModal(true);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                    >
                                        Cambiar Estado
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal: Asignar a Authority */}
                {showAssignModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Asignar reporte a Authority
                            </h3>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seleccionar Authority (Sector: {currentData?.assigned_sector})
                                </label>
                                <select
                                    value={selectedAuthority}
                                    onChange={(e) => setSelectedAuthority(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Seleccione una autoridad</option>
                                    {authorities.map((auth) => (
                                        <option key={auth.id} value={auth.id}>
                                            {auth.first_name} {auth.last_name} - {auth.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        setSelectedAuthority("");
                                    }}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={isAssigning}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAssignToAuthority}
                                    disabled={!selectedAuthority || isAssigning}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isAssigning ? 'Asignando...' : 'Asignar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Cambiar Estado */}
                {showStatusModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Actualizar Estado del Reporte
                            </h3>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nuevo Estado
                                </label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as ReportStatus)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="PENDIENTE">Pendiente</option>
                                    <option value="ATENDIENDO">Atendiendo</option>
                                    <option value="RESUELTO">Resuelto</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Comentario (opcional)
                                </label>
                                <textarea
                                    value={statusComment}
                                    onChange={(e) => setStatusComment(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Agrega un comentario sobre el cambio de estado..."
                                />
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowStatusModal(false);
                                        setStatusComment("");
                                    }}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={isUpdatingStatus}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={isUpdatingStatus}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isUpdatingStatus ? 'Actualizando...' : 'Actualizar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}