import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMyReports } from "@/services/report/getMyReports";
import type { Report, GetMyReportsParams } from "@/interfaces/api/reports";
import type { ReportStatus, ReportUrgency } from "@/interfaces/api/common";
import { NotificationContext } from "@/context/context";

export default function MyReports() {
    const navigate = useNavigate();
    const notificationContext = useContext(NotificationContext);
    
    if (!notificationContext) {
        throw new Error("MyReports must be used within NotificationProvider");
    }
    
    const { showNotification } = notificationContext;
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const [filters, setFilters] = useState({
        estado: "" as ReportStatus | "",
        urgencia: "" as ReportUrgency | "",
    });

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const params: GetMyReportsParams = { page: currentPage, size: 10 };
            if (filters.estado) params.estado = filters.estado;
            if (filters.urgencia) params.urgencia = filters.urgencia;

            const response = await getMyReports(params);
            setReports(response.reports);
            setTotalPages(response.pagination.total_pages);
        } catch {
            showNotification({ message: "Error al cargar mis reportes", type: "error" });
        } finally {
            setLoading(false);
        }
    }, [currentPage, filters, showNotification]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const getStatusColor = (estado: ReportStatus) => {
        switch (estado) {
            case "PENDIENTE": return "bg-yellow-100 text-yellow-800";
            case "ATENDIENDO": return "bg-blue-100 text-blue-800";
            case "RESUELTO": return "bg-green-100 text-green-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getUrgencyColor = (urgencia: ReportUrgency) => {
        switch (urgencia) {
            case "BAJA": return "bg-green-100 text-green-800";
            case "MEDIA": return "bg-yellow-100 text-yellow-800";
            case "ALTA": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    if (loading && reports.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 text-lg">Cargando mis reportes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Mis Reportes</h1>
                <button
                    onClick={() => navigate("/report/new")}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Crear Nuevo Reporte
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Estado</label>
                    <select
                        value={filters.estado}
                        onChange={(e) => setFilters({ ...filters, estado: e.target.value as ReportStatus | "" })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">Todos</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="ATENDIENDO">Atendiendo</option>
                        <option value="RESUELTO">Resuelto</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Urgencia</label>
                    <select
                        value={filters.urgencia}
                        onChange={(e) => setFilters({ ...filters, urgencia: e.target.value as ReportUrgency | "" })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">Todas</option>
                        <option value="BAJA">Baja</option>
                        <option value="MEDIA">Media</option>
                        <option value="ALTA">Alta</option>
                    </select>
                </div>
            </div>

            {/* Lista de reportes */}
            {reports.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                    No tienes reportes aún
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <div
                            key={report.id_reporte}
                            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(`/report/${report.id_reporte}`)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold mb-1">
                                        {report.lugar.name}
                                        {report.lugar.tower && ` - Torre ${report.lugar.tower}`}
                                        {report.lugar.floor !== undefined && ` - Piso ${report.lugar.floor}`}
                                    </h3>
                                    <p className="text-gray-600 text-sm">{report.descripcion}</p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.estado)}`}>
                                        {report.estado}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(report.urgencia)}`}>
                                        {report.urgencia}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 text-sm text-gray-500">
                                <span>📅 {new Date(report.created_at).toLocaleDateString('es-ES')}</span>
                                {report.assigned_name && <span>👤 Asignado a: {report.assigned_name}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Anterior
                    </button>
                    <span className="px-4 py-2 bg-white border border-gray-300 rounded-md">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
}
