import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { loadEnv } from "@/utils/loaderEnv";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList, Area, AreaChart, Legend } from "recharts";
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Users, Briefcase, Target, Zap } from "lucide-react";

type Period = "today" | "week" | "month" | "year";

type AuthorityStats = {
    role: "authority";
    sector: string;
    period: Period;
    date_range: { from: string; to: string };
    my_sector: {
        total_reports: number;
        in_period: number;
        pendiente: number;
        atendiendo: number;
        resuelto: number;
        by_urgencia: { BAJA: number; MEDIA: number; ALTA: number };
    };
    my_assigned: {
        total: number;
        pendiente: number;
        atendiendo: number;
        resuelto: number;
    };
};

type AirflowStats = {
    period: string;
    date_range: { from: string; to: string };
    airflow_processing: {
        total_reports: number;
        processed_by_ml: number;
        pending_classification: number;
        processing_rate: number;
        avg_processing_time_minutes: number;
    };
    ml_classification: {
        avg_confidence_score: number;
        confidence_distribution: {
            high: number;
            medium: number;
            low: number;
        };
    };
    urgency_reclassification: {
        total_reclassified: number;
        reclassification_rate: number;
        changes: {
            elevated: number;
            reduced: number;
            elevation_rate: number;
        };
        by_original_urgency: Record<string, number>;
    };
    urgency_comparison: {
        original: { BAJA: number; MEDIA: number; ALTA: number };
        classified: { BAJA: number; MEDIA: number; ALTA: number };
        impact: string;
    };
    automated_notifications: {
        total_sent: number;
        notification_rate: number;
        by_reason: {
            high_urgency: number;
            high_confidence: number;
        };
        avg_notification_time_minutes: number;
    };
    top_detected_keywords: Array<{
        keyword: string;
        count: number;
        risk_level: string;
    }>;
    impact_metrics: {
        reports_prioritized: number;
        authorities_notified: number;
        avg_response_improvement: string;
    };
};

const URGENCY_COLORS = {
    BAJA: "#00BFFE",
    MEDIA: "#11C4FC", 
    ALTA: "#145C74"
};

const STATUS_COLORS = {
    pendiente: "#11C4FC",
    atendiendo: "#00BAF5",
    resuelto: "#145C74"
};

export default function AutorityDashbaord() {
    const { token } = useAuth();
    const [period, setPeriod] = useState<Period>("week");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<AuthorityStats | null>(null);
    const [airflowStats, setAirflowStats] = useState<AirflowStats | null>(null);
    const [loadingAirflow, setLoadingAirflow] = useState(false);

    const statsUrl = useMemo(() => {
        try {
            return loadEnv("STATS_URL");
        } catch {
            try {
                const reports = loadEnv("REPORTS_URL");
                return reports.replace(/\/reports\b/, "/stats");
            } catch {
                return "";
            }
        }
    }, []);

    useEffect(() => {
        if (!token || !statsUrl) return;
        const controller = new AbortController();
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                const url = new URL(statsUrl);
                url.searchParams.set("period", period);
                const res = await fetch(url.toString(), {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error("Error obteniendo estadísticas");
                const data = (await res.json()) as AuthorityStats;
                setStats(data);
                    } catch (e: unknown) {
                        if (e instanceof DOMException && e.name === "AbortError") return;
                        const message = e instanceof Error ? e.message : "Error inesperado";
                        setError(message);
            } finally {
                setLoading(false);
            }
        };
        run();
        return () => controller.abort();
    }, [token, statsUrl, period]);

    // Fetch Airflow Analytics (filtrado por sector automáticamente en backend)
    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        const run = async () => {
            setLoadingAirflow(true);
            try {
                const reportsUrl = loadEnv("REPORTS_URL");
                const url = new URL(`${reportsUrl}/airflow/analytics`);
                url.searchParams.set("period", period);
                const res = await fetch(url.toString(), {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    signal: controller.signal,
                });
                if (res.ok) {
                    const data = (await res.json()) as AirflowStats;
                    setAirflowStats(data);
                }
            } catch (e: unknown) {
                if (e instanceof DOMException && e.name === "AbortError") return;
                console.error("Error obteniendo métricas de Airflow:", e);
            } finally {
                setLoadingAirflow(false);
            }
        };
        run();
        return () => controller.abort();
    }, [token, period]);

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">🛡️ Panel de Autoridad</h1>
                    <p className="text-gray-600 mt-1">Gestión y estadísticas de tu sector</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                    className="rounded-lg px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-medium hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                    <option value="today">📅 Hoy</option>
                    <option value="week">📅 Últimos 7 días</option>
                    <option value="month">📅 Últimos 30 días</option>
                    <option value="year">📅 Último año</option>
                </select>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
                        <p className="text-gray-600">Cargando estadísticas...</p>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <p className="font-medium">Error: {error}</p>
                </div>
            )}

            {stats && (
                <div className="space-y-6">
                    {/* Badge de sector */}
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg">
                            <Briefcase className="h-5 w-5" />
                            <span className="font-semibold">Sector: {stats.sector || "—"}</span>
                        </div>
                    </div>

                    {/* Mi Sector - Cards de resumen */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            Reportes de Mi Sector
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            <Card className="bg-linear-to-br from-slate-50 to-slate-100 border-slate-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-900">
                                        Total de Reportes
                                    </CardTitle>
                                    <AlertCircle className="h-4 w-4 text-slate-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-900">{stats.my_sector.total_reports}</div>
                                    <p className="text-xs text-slate-700 mt-1">
                                        Todos los reportes
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-linear-to-br from-blue-50 to-blue-100 border-blue-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-blue-900">
                                        En Período
                                    </CardTitle>
                                    <TrendingUp className="h-4 w-4 text-blue-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-900">{stats.my_sector.in_period}</div>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Reportes recientes
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-linear-to-br from-purple-50 to-purple-100 border-purple-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-purple-900">
                                        Pendientes
                                    </CardTitle>
                                    <Clock className="h-4 w-4 text-purple-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-purple-900">{stats.my_sector.pendiente}</div>
                                    <p className="text-xs text-purple-700 mt-1">
                                        Sin asignar
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-linear-to-br from-blue-50 to-cyan-100 border-cyan-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-cyan-900">
                                        En Proceso
                                    </CardTitle>
                                    <TrendingUp className="h-4 w-4 text-cyan-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-cyan-900">{stats.my_sector.atendiendo}</div>
                                    <p className="text-xs text-cyan-700 mt-1">
                                        Siendo atendidos
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-linear-to-br from-green-50 to-green-100 border-green-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-green-900">
                                        Resueltos
                                    </CardTitle>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-900">{stats.my_sector.resuelto}</div>
                                    <p className="text-xs text-green-700 mt-1">
                                        Completados
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Gráficos del Sector */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Estado del Sector */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Estado de Reportes del Sector</CardTitle>
                                <CardDescription>
                                    Distribución por estado actual
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer
                                    config={{
                                        cantidad: {
                                            label: "Cantidad",
                                            color: "#3b82f6",
                                        },
                                    }}
                                    className="h-[300px]"
                                >
                                    <BarChart
                                        data={[
                                            { 
                                                estado: "Pendiente", 
                                                cantidad: stats.my_sector.pendiente, 
                                                fill: STATUS_COLORS.pendiente 
                                            },
                                            { 
                                                estado: "Atendiendo", 
                                                cantidad: stats.my_sector.atendiendo, 
                                                fill: STATUS_COLORS.atendiendo 
                                            },
                                            { 
                                                estado: "Resuelto", 
                                                cantidad: stats.my_sector.resuelto, 
                                                fill: STATUS_COLORS.resuelto 
                                            },
                                        ]}
                                        layout="vertical"
                                        margin={{ left: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="estado" type="category" width={80} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="cantidad" radius={[0, 8, 8, 0]}>
                                            <LabelList dataKey="cantidad" position="right" />
                                            {[
                                                { fill: STATUS_COLORS.pendiente },
                                                { fill: STATUS_COLORS.atendiendo },
                                                { fill: STATUS_COLORS.resuelto },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Urgencia del Sector */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Urgencia del Sector</CardTitle>
                                <CardDescription>
                                    Clasificación por nivel de urgencia
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer
                                    config={{
                                        BAJA: {
                                            label: "Baja",
                                            color: URGENCY_COLORS.BAJA,
                                        },
                                        MEDIA: {
                                            label: "Media",
                                            color: URGENCY_COLORS.MEDIA,
                                        },
                                        ALTA: {
                                            label: "Alta",
                                            color: URGENCY_COLORS.ALTA,
                                        },
                                    }}
                                    className="h-[300px]"
                                >
                                    <BarChart
                                        data={[
                                            { urgencia: "Baja", cantidad: stats.my_sector.by_urgencia.BAJA, fill: URGENCY_COLORS.BAJA },
                                            { urgencia: "Media", cantidad: stats.my_sector.by_urgencia.MEDIA, fill: URGENCY_COLORS.MEDIA },
                                            { urgencia: "Alta", cantidad: stats.my_sector.by_urgencia.ALTA, fill: URGENCY_COLORS.ALTA },
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="urgencia" />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                                            {[
                                                { fill: URGENCY_COLORS.BAJA },
                                                { fill: URGENCY_COLORS.MEDIA },
                                                { fill: URGENCY_COLORS.ALTA },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Apache Airflow Analytics */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-[#00BFFE] to-[#145C74] rounded-lg p-6 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div className="text-white space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Target className="w-8 h-8" />
                                        <h2 className="text-2xl font-bold">Apache Airflow - Análisis de Clasificación ML</h2>
                                    </div>
                                    <p className="text-sm opacity-90">Datos procesados de tu sector</p>
                                </div>
                            </div>
                        </div>

                        {loadingAirflow ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <div className="animate-pulse">Cargando métricas de Airflow...</div>
                                </CardContent>
                            </Card>
                        ) : !airflowStats ? (
                            <Card>
                                <CardContent className="p-8 text-center text-gray-500">
                                    <p>No hay datos de Airflow disponibles para el período seleccionado</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* Explicación del Sistema ML */}
                                <Card className="border-[#00BFFE] shadow-md">
                                    <CardHeader className="bg-gradient-to-r from-[#00BFFE]/10 to-[#145C74]/10">
                                        <CardTitle className="flex items-center gap-2 text-[#145C74]">
                                            <Target className="w-5 h-5" />
                                            ¿Cómo funciona el sistema de clasificación automática?
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="space-y-3 text-sm text-gray-700">
                                            <p>
                                                <strong className="text-[#145C74]">Apache Airflow</strong> ejecuta un DAG cada 5 minutos que analiza reportes pendientes usando Machine Learning heurístico:
                                            </p>
                                            <div className="pl-4 border-l-4 border-[#00BFFE] space-y-2">
                                                <p><strong>1. Detección de palabras clave:</strong> "robo", "violencia", "fuego" aumentan prioridad en +30%, "fuga", "agua", "daño" en +15%</p>
                                                <p><strong>2. Análisis de ubicación:</strong> Tipos de lugares críticos (baños, estacionamientos) suman +10-15%</p>
                                                <p><strong>3. Urgencia original:</strong> La clasificación inicial del usuario aporta +0-40% al score</p>
                                                <p><strong>4. Score final:</strong> Se calcula un puntaje de 0 a 1 que determina si se reclasifica a ALTA, MEDIA o BAJA</p>
                                            </div>
                                            <p className="text-[#145C74] font-medium">
                                                El sistema envía notificaciones automáticas solo para reportes elevados a urgencia ALTA
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* KPIs Principales */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card className="border-[#00BFFE] shadow-md hover:shadow-lg transition-shadow">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium text-gray-600">Tasa de Procesamiento</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-[#145C74]">
                                                {airflowStats.airflow_processing.processing_rate.toFixed(1)}%
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {airflowStats.airflow_processing.processed_by_ml} de {airflowStats.airflow_processing.total_reports} reportes procesados
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-[#00BFFE] shadow-md hover:shadow-lg transition-shadow">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium text-gray-600">Confianza Promedio</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-[#145C74]">
                                                {(airflowStats.ml_classification.avg_confidence_score * 100).toFixed(1)}%
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Score ML del clasificador
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-[#00BFFE] shadow-md hover:shadow-lg transition-shadow">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium text-gray-600">Reclasificaciones</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-[#145C74]">
                                                {airflowStats.urgency_reclassification.total_reclassified}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {airflowStats.urgency_reclassification.reclassification_rate.toFixed(1)}% del total procesado
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-[#00BFFE] shadow-md hover:shadow-lg transition-shadow">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium text-gray-600">Notificaciones Automáticas</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-[#145C74]">
                                                {airflowStats.automated_notifications.total_sent}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {airflowStats.automated_notifications.notification_rate.toFixed(1)}% de reportes elevados
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Gráficos de Análisis */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card className="border-[#00BFFE] shadow-md">
                                        <CardHeader>
                                            <CardTitle className="text-[#145C74]">Distribución de Confianza</CardTitle>
                                            <CardDescription>Rangos de scores del clasificador ML</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ChartContainer
                                                config={{
                                                    cantidad: {
                                                        label: "Reportes",
                                                        color: "#00BFFE",
                                                    },
                                                }}
                                                className="h-[300px]"
                                            >
                                                <BarChart data={[
                                                    { range: "Alta (70-100%)", count: airflowStats.ml_classification.confidence_distribution.high },
                                                    { range: "Media (40-70%)", count: airflowStats.ml_classification.confidence_distribution.medium },
                                                    { range: "Baja (0-40%)", count: airflowStats.ml_classification.confidence_distribution.low },
                                                ]}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="range" />
                                                    <ChartTooltip content={<ChartTooltipContent />} />
                                                    <Bar dataKey="count" fill="#00BFFE" radius={[8, 8, 0, 0]} />
                                                </BarChart>
                                            </ChartContainer>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-[#00BFFE] shadow-md">
                                        <CardHeader>
                                            <CardTitle className="text-[#145C74]">Comparación de Urgencias</CardTitle>
                                            <CardDescription>Original vs Clasificación ML</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ChartContainer
                                                config={{
                                                    original: {
                                                        label: "Original",
                                                        color: "#145C74",
                                                    },
                                                    clasificada: {
                                                        label: "ML",
                                                        color: "#00BFFE",
                                                    },
                                                }}
                                                className="h-[300px]"
                                            >
                                                <BarChart data={[
                                                    { urgencia: "BAJA", original: airflowStats.urgency_comparison.original.BAJA, clasificada: airflowStats.urgency_comparison.classified.BAJA },
                                                    { urgencia: "MEDIA", original: airflowStats.urgency_comparison.original.MEDIA, clasificada: airflowStats.urgency_comparison.classified.MEDIA },
                                                    { urgencia: "ALTA", original: airflowStats.urgency_comparison.original.ALTA, clasificada: airflowStats.urgency_comparison.classified.ALTA },
                                                ]}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="urgencia" />
                                                    <Legend />
                                                    <ChartTooltip content={<ChartTooltipContent />} />
                                                    <Bar dataKey="original" fill="#145C74" radius={[8, 8, 0, 0]} />
                                                    <Bar dataKey="clasificada" fill="#00BFFE" radius={[8, 8, 0, 0]} />
                                                </BarChart>
                                            </ChartContainer>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Detalles de Reclasificación */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="border-[#00BFFE] shadow-md">
                                        <CardHeader>
                                            <CardTitle className="text-[#145C74] flex items-center gap-2">
                                                <Zap className="w-5 h-5 text-[#00BFFE]" />
                                                Urgencias Elevadas
                                            </CardTitle>
                                            <CardDescription>Reportes aumentados de prioridad</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-gray-600">Total Elevadas</p>
                                                    <p className="text-2xl font-bold text-[#145C74]">
                                                        {airflowStats.urgency_reclassification.changes.elevated}
                                                    </p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {airflowStats.urgency_reclassification.changes.elevation_rate.toFixed(1)}% del total
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-[#00BFFE] shadow-md">
                                        <CardHeader>
                                            <CardTitle className="text-[#145C74] flex items-center gap-2">
                                                <Target className="w-5 h-5 text-[#00BFFE]" />
                                                Urgencias Reducidas
                                            </CardTitle>
                                            <CardDescription>Reportes disminuidos de prioridad</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-gray-600">Total Reducidas</p>
                                                    <p className="text-2xl font-bold text-[#145C74]">
                                                        {airflowStats.urgency_reclassification.changes.reduced}
                                                    </p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {((airflowStats.urgency_reclassification.changes.reduced / airflowStats.urgency_reclassification.total_reclassified) * 100).toFixed(1)}% del total
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-[#00BFFE] shadow-md">
                                        <CardHeader>
                                            <CardTitle className="text-[#145C74]">Tiempo de Procesamiento</CardTitle>
                                            <CardDescription>Duración del análisis ML</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Promedio</p>
                                                    <p className="text-2xl font-bold text-[#145C74]">
                                                        {airflowStats.airflow_processing.avg_processing_time_minutes.toFixed(1)} min
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Total procesado</p>
                                                    <p className="text-xl font-semibold text-[#145C74]">
                                                        {airflowStats.airflow_processing.processed_by_ml} reportes
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Keywords Detection */}
                                {airflowStats.top_detected_keywords.length > 0 && (
                                    <Card className="border-[#00BFFE] shadow-md">
                                        <CardHeader>
                                            <CardTitle className="text-[#145C74]">Palabras Clave Detectadas</CardTitle>
                                            <CardDescription>Keywords más frecuentes en el período</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {airflowStats.top_detected_keywords.map((kw, idx) => (
                                                    <div key={idx} className="border border-[#00BFFE] rounded-lg p-4 hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-semibold text-[#145C74] capitalize">{kw.keyword}</span>
                                                            <span
                                                                className={`text-xs px-2 py-1 rounded-full ${
                                                                    kw.risk_level === "high"
                                                                        ? "bg-[#00BFFE] text-white"
                                                                        : kw.risk_level === "medium"
                                                                        ? "bg-[#11C4FC] text-white"
                                                                        : "bg-[#145C74] text-white"
                                                                }`}
                                                            >
                                                                {kw.risk_level === "high" ? "Riesgo Alto" : kw.risk_level === "medium" ? "Riesgo Medio" : "Riesgo Bajo"}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-2xl font-bold text-[#145C74]">{kw.count}</span>
                                                            <span className="text-sm text-gray-500">
                                                                {kw.risk_level === "high" ? "+30%" : kw.risk_level === "medium" ? "+15%" : "+5%"} score
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>

                    {/* Mis Asignaciones */}
                    <Card className="md:col-span-2">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">📋 Mis Asignaciones Personales</CardTitle>
                            <CardDescription className="text-base">
                                Reportes que tienes asignados directamente
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Total destacado */}
                                <div className="flex items-center justify-center">
                                    <div className="text-center p-6 bg-linear-to-br from-orange-500 to-pink-600 rounded-2xl shadow-lg text-white min-w-[280px]">
                                        <p className="text-sm font-medium opacity-90 mb-2">Total de asignaciones</p>
                                        <p className="text-6xl font-bold mb-2">
                                            {stats.my_assigned.total}
                                        </p>
                                        <p className="text-xs opacity-75">Reportes bajo tu responsabilidad</p>
                                    </div>
                                </div>

                                {/* Gráfico de área para asignaciones */}
                                <div className="flex justify-center">
                                    <div className="w-full flex flex-col items-center max-w-4xl">
                                        <h3 className="text-center text-sm font-semibold text-gray-700 mb-4">
                                            Distribución por Estado
                                        </h3>
                                        <ChartContainer
                                            config={{
                                                cantidad: {
                                                    label: "Cantidad",
                                                    color: "#f97316",
                                                },
                                            }}
                                            className="h-[280px]"
                                        >
                                            <AreaChart
                                                data={[
                                                    { 
                                                        estado: "Pendiente", 
                                                        cantidad: stats.my_assigned.pendiente,
                                                        fill: STATUS_COLORS.pendiente
                                                    },
                                                    { 
                                                        estado: "Atendiendo", 
                                                        cantidad: stats.my_assigned.atendiendo,
                                                        fill: STATUS_COLORS.atendiendo
                                                    },
                                                    { 
                                                        estado: "Resuelto", 
                                                        cantidad: stats.my_assigned.resuelto,
                                                        fill: STATUS_COLORS.resuelto
                                                    },
                                                ]}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis 
                                                    dataKey="estado" 
                                                    tick={{ fontSize: 12, fontWeight: 500 }}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="cantidad" 
                                                    stroke="#f97316"
                                                    strokeWidth={3}
                                                    fill="url(#colorAssigned)"
                                                    fillOpacity={1}
                                                >
                                                    <LabelList 
                                                        dataKey="cantidad" 
                                                        position="top" 
                                                        style={{ fontSize: 14, fontWeight: 'bold' }}
                                                    />
                                                </Area>
                                            </AreaChart>
                                        </ChartContainer>
                                    </div>
                                </div>

                                {/* Indicadores visuales */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                                        <div className="text-xs text-purple-700 font-medium mb-1">PENDIENTE</div>
                                        <div className="text-2xl font-bold text-purple-900">
                                            {stats.my_assigned.pendiente}
                                        </div>
                                        <div className="text-xs text-purple-600 mt-1">
                                            {stats.my_assigned.total > 0 ? ((stats.my_assigned.pendiente / stats.my_assigned.total) * 100).toFixed(1) : 0}%
                                        </div>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                                        <div className="text-xs text-blue-700 font-medium mb-1">ATENDIENDO</div>
                                        <div className="text-2xl font-bold text-blue-900">
                                            {stats.my_assigned.atendiendo}
                                        </div>
                                        <div className="text-xs text-blue-600 mt-1">
                                            {stats.my_assigned.total > 0 ? ((stats.my_assigned.atendiendo / stats.my_assigned.total) * 100).toFixed(1) : 0}%
                                        </div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                                        <div className="text-xs text-green-700 font-medium mb-1">RESUELTO</div>
                                        <div className="text-2xl font-bold text-green-900">
                                            {stats.my_assigned.resuelto}
                                        </div>
                                        <div className="text-xs text-green-600 mt-1">
                                            {stats.my_assigned.total > 0 ? ((stats.my_assigned.resuelto / stats.my_assigned.total) * 100).toFixed(1) : 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}