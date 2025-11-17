

import { useState } from "react";
import { predictIncident, type PredictIncidentRequest, type PredictIncidentResponse } from "@/services/ia";
import { useNotification } from "@/hooks/useNotification";
import { 
    Brain, 
    TrendingUp, 
    Clock, 
    MapPin, 
    AlertTriangle, 
    BarChart3, 
    Lightbulb,
    Calendar,
    Building2,
    Sparkles
} from "lucide-react";

const TOWERS = ["T1", "T2", "T3", "T4", "T5"];
const PLACE_TYPES = [
    { value: "aula", label: "Aula" },
    { value: "pasillo", label: "Pasillo" },
    { value: "baño", label: "Baño" },
    { value: "laboratorio", label: "Laboratorio" },
    { value: "cafeteria", label: "Cafetería" },
    { value: "estacionamiento", label: "Estacionamiento" },
    { value: "biblioteca", label: "Biblioteca" },
    { value: "auditorio", label: "Auditorio" }
];

const DAYS_OF_WEEK = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Lunes" },
    { value: 2, label: "Martes" },
    { value: 3, label: "Miércoles" },
    { value: 4, label: "Jueves" },
    { value: 5, label: "Viernes" },
    { value: 6, label: "Sábado" }
];

export default function PredictionsPage() {
    const { showNotification } = useNotification();
    
    const [formData, setFormData] = useState<PredictIncidentRequest>({
        tower: "",
        tipo_lugar: "",
        hora: new Date().getHours(),
        dia_semana: new Date().getDay()
    });
    
    const [prediction, setPrediction] = useState<PredictIncidentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (field: keyof PredictIncidentRequest, value: string | number | undefined) => {
        setFormData(prev => ({
            ...prev,
            [field]: value as unknown as PredictIncidentRequest[keyof PredictIncidentRequest]
        }));
    };

    const handlePredict = async () => {
        // Validaciones
        if (!formData.tower || !formData.tipo_lugar) {
            showNotification({
                type: "error",
                message: "Por favor completa todos los campos requeridos"
            });
            return;
        }

        try {
            setIsLoading(true);
            const result = await predictIncident(formData);
            setPrediction(result);
            showNotification({
                type: "success",
                message: "Predicción generada exitosamente"
            });
        } catch (error) {
            showNotification({
                type: "error",
                message: error instanceof Error ? error.message : "Error al generar predicción"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getIncidentColor = (incidentType: string) => {
        const colors: Record<string, string> = {
            "robo": "bg-red-100 text-red-700 border-red-300",
            "vandalismo": "bg-orange-100 text-orange-700 border-orange-300",
            "accidente": "bg-yellow-100 text-yellow-700 border-yellow-300",
            "pelea": "bg-purple-100 text-purple-700 border-purple-300",
            "emergencia_medica": "bg-pink-100 text-pink-700 border-pink-300",
            "incendio": "bg-red-200 text-red-800 border-red-400",
            "otro": "bg-gray-100 text-gray-700 border-gray-300"
        };
        return colors[incidentType] || colors["otro"];
    };

    const getModelLevelBadge = (level: string) => {
        const badges: Record<string, { color: string; label: string }> = {
            "level1": { color: "bg-green-100 text-green-700", label: "Alta Precisión" },
            "level2": { color: "bg-blue-100 text-blue-700", label: "Precisión Media" },
            "level3": { color: "bg-yellow-100 text-yellow-700", label: "Precisión Baja" },
            "global": { color: "bg-gray-100 text-gray-700", label: "Predicción Global" }
        };
        return badges[level] || badges["global"];
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Brain className="h-12 w-12 text-blue-600 mr-3" />
                        <h1 className="text-4xl font-bold text-gray-900">Predicción de Incidentes</h1>
                    </div>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                        Sistema de predicción inteligente basado en análisis histórico de incidentes.
                        Ingresa los parámetros para obtener una predicción del tipo de incidente más probable.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Formulario de Predicción */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                            <div className="flex items-center">
                                <Sparkles className="h-6 w-6 text-white mr-2" />
                                <h2 className="text-xl font-semibold text-white">Parámetros de Predicción</h2>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Torre */}
                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                                    Torre *
                                </label>
                                <select
                                    value={formData.tower}
                                    onChange={(e) => handleInputChange("tower", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="">Selecciona una torre</option>
                                    {TOWERS.map(tower => (
                                        <option key={tower} value={tower}>{tower}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tipo de Lugar */}
                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                                    Tipo de Lugar *
                                </label>
                                <select
                                    value={formData.tipo_lugar}
                                    onChange={(e) => handleInputChange("tipo_lugar", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="">Selecciona un tipo de lugar</option>
                                    {PLACE_TYPES.map(place => (
                                        <option key={place.value} value={place.value}>{place.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Hora */}
                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                                    Hora del día *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={formData.hora}
                                    onChange={(e) => handleInputChange("hora", parseInt(e.target.value))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="0-23"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Formato 24 horas (ej: 14 para 2:00 PM)
                                </p>
                            </div>

                            {/* Día de la Semana */}
                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                                    Día de la Semana (opcional)
                                </label>
                                <select
                                    value={formData.dia_semana ?? ""}
                                    onChange={(e) => handleInputChange("dia_semana", e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="">Selecciona un día (opcional)</option>
                                    {DAYS_OF_WEEK.map(day => (
                                        <option key={day.value} value={day.value}>{day.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Botón de Predicción */}
                            <button
                                onClick={handlePredict}
                                disabled={isLoading || !formData.tower || !formData.tipo_lugar}
                                className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all flex items-center justify-center ${
                                    isLoading || !formData.tower || !formData.tipo_lugar
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 shadow-lg'
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                        Generando predicción...
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp className="h-5 w-5 mr-2" />
                                        Generar Predicción
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Resultados */}
                    <div className="space-y-6">
                        {prediction ? (
                            <>
                                {/* Predicción Principal */}
                                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                                        <div className="flex items-center">
                                            <AlertTriangle className="h-6 w-6 text-white mr-2" />
                                            <h2 className="text-xl font-semibold text-white">Resultado de la Predicción</h2>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 space-y-4">
                                        {/* Incidente Probable */}
                                        <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                                            <p className="text-sm text-gray-600 mb-2">Tipo de Incidente Más Probable</p>
                                            <div className={`inline-block px-6 py-3 rounded-full text-2xl font-bold border-2 ${getIncidentColor(prediction.prediccion.clase_incidente_probable)}`}>
                                                {prediction.prediccion.clase_incidente_probable.toUpperCase()}
                                            </div>
                                        </div>

                                        {/* Nivel del Modelo */}
                                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                            <div className="flex items-center">
                                                <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
                                                <span className="text-sm font-medium text-gray-700">Nivel del Modelo</span>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getModelLevelBadge(prediction.prediccion.nivel_modelo).color}`}>
                                                {getModelLevelBadge(prediction.prediccion.nivel_modelo).label}
                                            </span>
                                        </div>

                                        {/* Clave Usada */}
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 mb-1">Clave del Modelo</p>
                                            <p className="text-sm font-mono text-gray-700">{prediction.prediccion.clave_usada}</p>
                                        </div>

                                        {/* Mensaje */}
                                        <div className="flex items-start p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                                            <Lightbulb className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-700">{prediction.mensaje}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Probabilidades */}
                                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                                        <div className="flex items-center">
                                            <BarChart3 className="h-6 w-6 text-white mr-2" />
                                            <h2 className="text-xl font-semibold text-white">Distribución de Probabilidades</h2>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 space-y-3">
                                        {Object.entries(prediction.prediccion.probabilidades)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([tipo, prob]) => (
                                                <div key={tipo} className="space-y-1">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="font-medium text-gray-700 capitalize">{tipo}</span>
                                                        <span className="font-semibold text-gray-900">{(prob * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 rounded-full"
                                                            style={{ width: `${prob * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>

                                {/* Datos de Entrada */}
                                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
                                        <h3 className="text-lg font-semibold text-white">Parámetros Utilizados</h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Torre</p>
                                            <p className="text-sm font-semibold text-gray-900">{prediction.input.tower}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Tipo de Lugar</p>
                                            <p className="text-sm font-semibold text-gray-900 capitalize">{prediction.input.tipo_lugar}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Hora</p>
                                            <p className="text-sm font-semibold text-gray-900">{prediction.input.hora}:00</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500">Día de la Semana</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {prediction.input.dia_semana !== undefined 
                                                    ? DAYS_OF_WEEK[prediction.input.dia_semana].label 
                                                    : "No especificado"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                                <Brain className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    Sin Predicción
                                </h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    Completa los parámetros en el formulario y haz clic en "Generar Predicción" 
                                    para obtener un análisis predictivo del tipo de incidente más probable.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Información Adicional */}
                <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-start">
                        <Lightbulb className="h-6 w-6 mr-3 mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Cómo funciona el sistema de predicción</h3>
                            <p className="text-blue-100 text-sm mb-3">
                                El modelo predictivo utiliza un enfoque jerárquico de 4 niveles para generar predicciones precisas:
                            </p>
                            <ul className="text-blue-100 text-sm space-y-2">
                                <li className="flex items-start">
                                    <span className="font-semibold mr-2">•</span>
                                    <span><strong>Nivel 1 (Alta Precisión):</strong> Considera torre, tipo de lugar y bloque horario específico</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="font-semibold mr-2">•</span>
                                    <span><strong>Nivel 2 (Precisión Media):</strong> Analiza tipo de lugar y bloque horario</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="font-semibold mr-2">•</span>
                                    <span><strong>Nivel 3 (Precisión Baja):</strong> Evalúa solo el tipo de lugar</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="font-semibold mr-2">•</span>
                                    <span><strong>Global:</strong> Utiliza estadísticas generales cuando no hay datos específicos</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}