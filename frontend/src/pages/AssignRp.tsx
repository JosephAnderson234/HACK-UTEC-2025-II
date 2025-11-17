import type { User, ReportDetail } from "@/interfaces/api";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { getAuthorities } from "@/services/users";
import { assignReport } from "@/services/report/assignReport";
import { findById } from "@/services/report/findById";
import { useNotification } from "@/hooks/useNotification";
import { ArrowLeft, Search, User as UserIcon, Mail, Phone, Building, MapPin, AlertCircle, Clock } from "lucide-react";

export default function AssignReportsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    const [report, setReport] = useState<ReportDetail | null>(null);
    const [authorities, setAuthorities] = useState<User[]>([]);
    const [filteredAuthorities, setFilteredAuthorities] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAuthority, setSelectedAuthority] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar el reporte y las autoridades
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                if (!id) {
                    setError("ID de reporte no válido");
                    return;
                }

                // Cargar datos en paralelo
                const [reportData, authoritiesData] = await Promise.all([
                    findById(id),
                    getAuthorities()
                ]);

                setReport(reportData.report);
                
                if (authoritiesData.users.length === 0) {
                    setError("No hay autoridades disponibles para asignar");
                }
                
                setAuthorities(authoritiesData.users);
                setFilteredAuthorities(authoritiesData.users);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Error al cargar datos";
                setError(errorMessage);
                showNotification({
                    type: "error",
                    message: errorMessage
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, showNotification]);

    // Filtrar autoridades por búsqueda
    useEffect(() => {
        const filtered = authorities.filter(auth => {
            const fullName = `${auth.first_name} ${auth.last_name}`.toLowerCase();
            const email = auth.email.toLowerCase();
            const charge = auth.data_authority?.charge?.toLowerCase() || "";
            const search = searchTerm.toLowerCase();

            return fullName.includes(search) || email.includes(search) || charge.includes(search);
        });
        setFilteredAuthorities(filtered);
    }, [searchTerm, authorities]);

    // Asignar reporte
    const handleAssign = async () => {
        if (!selectedAuthority || !id) return;

        try {
            setIsAssigning(true);
            
            const selectedAuth = authorities.find(auth => auth.id === selectedAuthority);
            
            await assignReport(id, { assigned_to: selectedAuthority });
            
            showNotification({
                type: "success",
                message: `Reporte asignado exitosamente a ${selectedAuth?.first_name} ${selectedAuth?.last_name}`
            });

            // Esperar un momento antes de navegar para que el usuario vea la notificación
            setTimeout(() => {
                navigate(`/reports/${id}`);
            }, 500);
        } catch (error) {
            showNotification({
                type: "error",
                message: error instanceof Error ? error.message : "Error al asignar reporte"
            });
            setIsAssigning(false);
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'high': return 'text-red-600 bg-red-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            case 'low': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getUrgencyText = (urgency: string) => {
        switch (urgency) {
            case 'high': return 'Alta';
            case 'medium': return 'Media';
            case 'low': return 'Baja';
            default: return urgency;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando información...</p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        {error || "Reporte no encontrado"}
                    </h2>
                    <p className="text-gray-600 mb-4">
                        {error ? "Por favor, intenta nuevamente." : "El reporte que buscas no existe."}
                    </p>
                    <button
                        onClick={() => navigate('/reports')}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        Volver a reportes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Volver
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Asignar Reporte</h1>
                    <p className="mt-2 text-gray-600">Selecciona una autoridad para asignar este reporte</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Información del Reporte */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-4">
                            <h2 className="text-xl font-semibold text-white">Detalles del Reporte</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Imagen */}
                            {report.image_url && (
                                <div className="mb-4">
                                    <img
                                        src={report.image_url}
                                        alt="Reporte"
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                </div>
                            )}

                            {/* ID y Urgencia */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">ID del Reporte</p>
                                    <p className="text-sm font-mono text-gray-900">{report.id_reporte}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(report.urgencia)}`}>
                                    {getUrgencyText(report.urgencia)}
                                </span>
                            </div>

                            {/* Lugar */}
                            <div className="flex items-start space-x-3">
                                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Ubicación</p>
                                    <p className="font-medium text-gray-900">{report.lugar.name}</p>
                                    {report.lugar.tower && (
                                        <p className="text-sm text-gray-600">Torre {report.lugar.tower} - Piso {report.lugar.floor}</p>
                                    )}
                                </div>
                            </div>

                            {/* Descripción */}
                            <div className="flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Descripción</p>
                                    <p className="text-gray-900">{report.descripcion}</p>
                                </div>
                            </div>

                            {/* Fecha */}
                            <div className="flex items-start space-x-3">
                                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Fecha y hora</p>
                                    <p className="text-gray-900">
                                        {new Date(report.fecha_hora).toLocaleString('es-PE', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Autor */}
                            <div className="flex items-start space-x-3">
                                <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Reportado por</p>
                                    <p className="font-medium text-gray-900">
                                        {report.author.first_name} {report.author.last_name}
                                    </p>
                                    <p className="text-sm text-gray-600">{report.author.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Selección de Autoridad */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="bg-linear-to-r from-green-600 to-green-700 px-6 py-4">
                            <h2 className="text-xl font-semibold text-white">Seleccionar Autoridad</h2>
                        </div>
                        <div className="p-6">
                            {/* Búsqueda */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, email o departamento..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Lista de Autoridades */}
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {authorities.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Building className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                        <p className="text-gray-600 font-medium">No hay autoridades disponibles</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            No se encontraron autoridades registradas en el sistema.
                                        </p>
                                    </div>
                                ) : filteredAuthorities.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Search className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                        <p className="text-gray-600 font-medium">No se encontraron resultados</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Intenta con otros términos de búsqueda
                                        </p>
                                    </div>
                                ) : (
                                    filteredAuthorities.map((authority) => (
                                        <button
                                            key={authority.id}
                                            onClick={() => setSelectedAuthority(authority.id)}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                                selectedAuthority === authority.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {authority.first_name} {authority.last_name}
                                                    </h3>
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Mail className="h-4 w-4 mr-2" />
                                                            {authority.email}
                                                        </div>
                                                        {authority.cellphone && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Phone className="h-4 w-4 mr-2" />
                                                                {authority.cellphone}
                                                            </div>
                                                        )}
                                                        {authority.data_authority?.charge && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Building className="h-4 w-4 mr-2" />
                                                                {authority.data_authority.charge} - {authority.data_authority.sector}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {selectedAuthority === authority.id && (
                                                    <div className="ml-4">
                                                        <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Botón de Asignar */}
                            <div className="mt-6">
                                {!selectedAuthority && authorities.length > 0 && (
                                    <p className="text-sm text-gray-500 text-center mb-2">
                                        Selecciona una autoridad para continuar
                                    </p>
                                )}
                                <button
                                    onClick={handleAssign}
                                    disabled={!selectedAuthority || isAssigning || authorities.length === 0}
                                    className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                                        !selectedAuthority || isAssigning || authorities.length === 0
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                                    }`}
                                >
                                    {isAssigning ? (
                                        <span className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Asignando...
                                        </span>
                                    ) : authorities.length === 0 ? (
                                        'No hay autoridades disponibles'
                                    ) : (
                                        'Asignar Reporte'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}