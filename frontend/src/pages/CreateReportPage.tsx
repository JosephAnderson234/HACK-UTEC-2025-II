import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { getPlaces } from "@/services/places";
import { createReport } from "@/services/report/create";
import type { Place } from "@/interfaces/api/places";
import type { ReportUrgency } from "@/interfaces/api/common";
import { NotificationContext } from "@/context/context";

export default function CreateReportPage() {
    const navigate = useNavigate();
    const notificationContext = useContext(NotificationContext);
    
    if (!notificationContext) {
        throw new Error("CreateReportPage must be used within NotificationProvider");
    }
    
    const { showNotification } = notificationContext;
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingPlaces, setLoadingPlaces] = useState(true);

    const [formData, setFormData] = useState({
        lugar_id: "",
        urgencia: "MEDIA" as ReportUrgency,
        descripcion: "",
        image: "",
    });

    const [imagePreview, setImagePreview] = useState("");

    useEffect(() => {
        const fetchPlaces = async () => {
            try {
                const response = await getPlaces();
                setPlaces(response.places);
            } catch {
                showNotification({ message: "Error al cargar lugares", type: "error" });
            } finally {
                setLoadingPlaces(false);
            }
        };
        fetchPlaces();
    }, [showNotification]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Guardar el data URL completo para el preview
                setImagePreview(base64String);
                // Guardar solo el base64 sin prefijo para enviar al servidor
                const base64Data = base64String.split(',')[1] || base64String;
                setFormData({ ...formData, image: base64Data });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.lugar_id || !formData.descripcion) {
            showNotification({ message: "Por favor complete los campos requeridos", type: "error" });
            return;
        }

        setLoading(true);
        try {
            const reportData = {
                lugar_id: formData.lugar_id,
                urgencia: formData.urgencia,
                descripcion: formData.descripcion,
                ...(formData.image && { image: formData.image }),
            };

            await createReport(reportData);
            showNotification({ message: "Reporte creado exitosamente", type: "success" });
            navigate("/dashboard");
        } catch {
            showNotification({ message: "Error al crear el reporte", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    if (loadingPlaces) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 text-lg">Cargando lugares...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Crear Nuevo Reporte</h1>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="lugar" className="block text-sm font-medium mb-2">
                        Lugar *
                    </label>
                    <select
                        id="lugar"
                        value={formData.lugar_id}
                        onChange={(e) => setFormData({ ...formData, lugar_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="">Seleccione un lugar</option>
                        {places.map((place) => (
                            <option key={place.id} value={place.id}>
                                {place.name} {place.tower ? `- Torre ${place.tower}` : ""} {place.floor ? `- Piso ${place.floor}` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="urgencia" className="block text-sm font-medium mb-2">
                        Urgencia *
                    </label>
                    <select
                        id="urgencia"
                        value={formData.urgencia}
                        onChange={(e) => setFormData({ ...formData, urgencia: e.target.value as ReportUrgency })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="BAJA">Baja</option>
                        <option value="MEDIA">Media</option>
                        <option value="ALTA">Alta</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="descripcion" className="block text-sm font-medium mb-2">
                        Descripción *
                    </label>
                    <textarea
                        id="descripcion"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={5}
                        placeholder="Describa el problema o incidente..."
                        required
                    />
                </div>

                <div>
                    <label htmlFor="image" className="block text-sm font-medium mb-2">
                        Imagen (opcional)
                    </label>
                    <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {imagePreview && (
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="mt-2 max-w-xs rounded-md"
                        />
                    )}
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creando..." : "Crear Reporte"}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/dashboard")}
                        className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}