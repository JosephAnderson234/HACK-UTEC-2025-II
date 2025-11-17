import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { loadEnv } from "@/utils/loaderEnv";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList, RadialBarChart, RadialBar, Legend } from "recharts";
import { Shield, TrendingUp, Clock, Target, AlertCircle, CheckCircle2, Zap, BarChart3 } from "lucide-react";

type Period = "today" | "week" | "month" | "year";

type AdminStats = {
    role: "admin";
    period: Period;
    date_range: { from: string; to: string };
    summary: {
        total_reportes: number;
        in_period: number;
        pendiente: number;
        atendiendo: number;
        resuelto: number;
        sin_asignar: number;
    };
    by_urgencia: { BAJA: number; MEDIA: number; ALTA: number };
    by_sector: { total: Record<string, number>; in_period: Record<string, number> };
    performance: { avg_resolution_time_hours: number | null; resolution_rate: number };
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

const SECTOR_COLORS = ["#00BFFE", "#11C4FC", "#00BAF5", "#145C74", "#164E5F", "#231F20"];

export default function AdminDashboard() {
    const { token } = useAuth();
    const [period, setPeriod] = useState<Period>("week");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [airflowStats, setAirflowStats] = useState<AirflowStats | null>(null);
    const [loadingAirflow, setLoadingAirflow] = useState(false);
    const [selectedSector, setSelectedSector] = useState<string>("");

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
                const data = (await res.json()) as AdminStats;
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

    // Fetch Airflow Analytics
    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        const run = async () => {
            setLoadingAirflow(true);
            try {
                const reportsUrl = loadEnv("REPORTS_URL");
                const url = new URL(`${reportsUrl}/airflow/analytics`);
                url.searchParams.set("period", period);
                if (selectedSector) {
                    url.searchParams.set("sector", selectedSector);
                }
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
    }, [token, period, selectedSector]);

    return (
        <div className="space-y-6 pb-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl p-8 text-white" style={{background: 'linear-gradient(to right, #145C74, #00BFFE, #11C4FC)'}}>
                <div className="absolute inset-0 bg-black opacity-10"></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Shield className="h-10 w-10" />
                                <h1 className="text-4xl font-black">Panel de Control Administrativo</h1>
                            </div>
                            <p className="text-white/90 text-lg">Vista completa del sistema y rendimiento general</p>
                        </div>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as Period)}
                            className="rounded-lg px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold border-2 border-white/30 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all"
                        >
                            <option value="today" className="text-gray-900">📅 Hoy</option>
                            <option value="week" className="text-gray-900">📅 Últimos 7 días</option>
                            <option value="month" className="text-gray-900">📅 Últimos 30 días</option>
                            <option value="year" className="text-gray-900">📅 Último año</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-r-transparent mb-4" style={{borderColor: '#00BFFE', borderRightColor: 'transparent'}}></div>
                        <p className="text-gray-600 text-lg">Cargando dashboard...</p>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-red-700">
                    <p className="font-semibold text-lg">Error: {error}</p>
                </div>
            )}

            {stats && (
                <div className="space-y-6">
                    {/* KPI Cards Principales */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                        <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #145C74, #164E5F)'}}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-white/90">
                                    Total Sistema
                                </CardTitle>
                                <BarChart3 className="h-5 w-5 text-white/80" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.summary.total_reportes}</div>
                                <p className="text-xs text-white/70 mt-1">Reportes totales</p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #00BFFE, #11C4FC)'}}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-white/90">
                                    En Período
                                </CardTitle>
                                <TrendingUp className="h-5 w-5 text-white/80" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.summary.in_period}</div>
                                <p className="text-xs text-white/70 mt-1">Reportes recientes</p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #00BAF5, #00BFFE)'}}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-white/90">
                                    Pendientes
                                </CardTitle>
                                <Clock className="h-5 w-5 text-white/80" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.summary.pendiente}</div>
                                <p className="text-xs text-white/70 mt-1">Por atender</p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #11C4FC, #00BAF5)'}}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-white/90">
                                    En Proceso
                                </CardTitle>
                                <Zap className="h-5 w-5 text-white/80" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.summary.atendiendo}</div>
                                <p className="text-xs text-white/70 mt-1">Siendo atendidos</p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #164E5F, #145C74)'}}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-white/90">
                                    Resueltos
                                </CardTitle>
                                <CheckCircle2 className="h-5 w-5 text-white/80" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.summary.resuelto}</div>
                                <p className="text-xs text-white/70 mt-1">Completados</p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #DADADA, #EDEDED)', color: '#231F20'}}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium" style={{color: '#231F20'}}>
                                    Sin Asignar
                                </CardTitle>
                                <AlertCircle className="h-5 w-5" style={{color: '#231F20'}} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.summary.sin_asignar}</div>
                                <p className="text-xs text-white/70 mt-1">Esperando</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Apache Airflow ML Analytics Section */}
                    {airflowStats && (
                        <div className="space-y-6">
                            {/* Airflow Header con controles */}
                            <div className="relative overflow-hidden rounded-xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #231F20 0%, #145C74 50%, #00BFFE 100%)'}}>
                                <div className="absolute inset-0 bg-black opacity-10"></div>
                                <div className="relative z-10">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                                                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold">Apache Airflow ML Analytics</h2>
                                                <p className="text-white/90 text-sm">Sistema automático de clasificación cada 5 minutos</p>
                                            </div>
                                        </div>
                                        {stats && Object.keys(stats.by_sector.total).length > 0 && (
                                            <select
                                                value={selectedSector}
                                                onChange={(e) => setSelectedSector(e.target.value)}
                                                className="rounded-lg px-4 py-2 bg-white/20 backdrop-blur-sm text-white font-semibold border-2 border-white/30 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all"
                                            >
                                                <option value="" className="text-gray-900">🔍 Todos los sectores</option>
                                                {Object.keys(stats.by_sector.total).map((sector) => (
                                                    <option key={sector} value={sector} className="text-gray-900">
                                                        📊 {sector}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Explicación del sistema */}
                            <Card className="border-2 border-cyan-200 bg-cyan-50">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-cyan-100 rounded-lg">
                                            <svg className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                <strong>¿Cómo funciona?</strong> Airflow analiza automáticamente cada reporte cada 5 minutos usando Machine Learning. 
                                                Detecta palabras clave de riesgo (robo, violencia, fuego), evalúa el tipo de lugar y calcula un <strong>score de confianza (0-100%)</strong>. 
                                                Basado en esto, puede <strong>reclasificar la urgencia</strong> del reporte para priorizar casos críticos y enviar <strong>notificaciones automáticas</strong> a las autoridades.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Airflow KPIs */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #00BFFE, #00BAF5)'}}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-white/90">
                                            Tasa de Procesamiento ML
                                        </CardTitle>
                                        <Zap className="h-5 w-5 text-white/80" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">{airflowStats.airflow_processing.processing_rate}%</div>
                                        <p className="text-xs text-white/70 mt-1">
                                            {airflowStats.airflow_processing.processed_by_ml}/{airflowStats.airflow_processing.total_reports} reportes analizados
                                        </p>
                                        <p className="text-xs text-white/60 mt-2 italic">
                                            Reportes procesados por el pipeline ML
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #145C74, #164E5F)'}}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-white/90">
                                            Confianza Promedio ML
                                        </CardTitle>
                                        <Target className="h-5 w-5 text-white/80" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">{(airflowStats.ml_classification.avg_confidence_score * 100).toFixed(0)}%</div>
                                        <p className="text-xs text-white/70 mt-1">Score de clasificación del modelo</p>
                                        <p className="text-xs text-white/60 mt-2 italic">
                                            Precisión: Alta ≥70%, Media 40-69%, Baja &lt;40%
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #11C4FC, #00BFFE)'}}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-white/90">
                                            Reclasificaciones
                                        </CardTitle>
                                        <TrendingUp className="h-5 w-5 text-white/80" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">{airflowStats.urgency_reclassification.total_reclassified}</div>
                                        <p className="text-xs text-white/70 mt-1">
                                            {airflowStats.urgency_reclassification.reclassification_rate}% del total procesado
                                        </p>
                                        <p className="text-xs text-white/60 mt-2 italic">
                                            Urgencias ajustadas por el modelo ML
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 text-white shadow-lg hover:shadow-xl transition-shadow" style={{background: 'linear-gradient(to bottom right, #231F20, #4A4649)'}}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-white/90">
                                            Notificaciones Auto
                                        </CardTitle>
                                        <AlertCircle className="h-5 w-5 text-white/80" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">{airflowStats.automated_notifications.total_sent}</div>
                                        <p className="text-xs text-white/70 mt-1">
                                            {airflowStats.automated_notifications.notification_rate}% enviadas automáticamente
                                        </p>
                                        <p className="text-xs text-white/60 mt-2 italic">
                                            Alertas a autoridades por urgencia ALTA
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Airflow Charts */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Distribución de Confianza ML */}
                                <Card className="border-2" style={{borderColor: '#00BFFE'}}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Target className="h-5 w-5" style={{color: '#00BFFE'}} />
                                            Distribución de Confianza ML
                                        </CardTitle>
                                        <CardDescription>
                                            Precisión del modelo: <strong>Alta ≥70%</strong> (clasificación muy confiable), 
                                            <strong> Media 40-69%</strong> (requiere revisión), <strong>Baja &lt;40%</strong> (dudoso)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer
                                            config={{
                                                high: { label: "Alta (≥70%)", color: "#10b981" },
                                                medium: { label: "Media (40-69%)", color: "#f59e0b" },
                                                low: { label: "Baja (<40%)", color: "#ef4444" },
                                            }}
                                            className="h-[300px]"
                                        >
                                            <BarChart
                                                data={[
                                                    { nivel: "Alta", cantidad: airflowStats.ml_classification.confidence_distribution.high, fill: "#10b981" },
                                                    { nivel: "Media", cantidad: airflowStats.ml_classification.confidence_distribution.medium, fill: "#f59e0b" },
                                                    { nivel: "Baja", cantidad: airflowStats.ml_classification.confidence_distribution.low, fill: "#ef4444" },
                                                ]}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="nivel" />
                                                <YAxis />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                                <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                                                    <LabelList dataKey="cantidad" position="top" style={{ fontWeight: 'bold' }} />
                                                </Bar>
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                {/* Comparación de Urgencias: Original vs Clasificada */}
                                <Card className="border-2" style={{borderColor: '#145C74'}}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5" style={{color: '#145C74'}} />
                                            Impacto de Reclasificación ML
                                        </CardTitle>
                                        <CardDescription>
                                            <strong>{airflowStats.urgency_comparison.impact}</strong> - 
                                            El ML detecta patrones que el reporte inicial podría no capturar
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer
                                            config={{
                                                original: { label: "Original", color: "#94a3b8" },
                                                clasificada: { label: "Clasificada ML", color: "#00BFFE" },
                                            }}
                                            className="h-[300px]"
                                        >
                                            <BarChart
                                                data={[
                                                    { 
                                                        urgencia: "BAJA", 
                                                        original: airflowStats.urgency_comparison.original.BAJA,
                                                        clasificada: airflowStats.urgency_comparison.classified.BAJA
                                                    },
                                                    { 
                                                        urgencia: "MEDIA", 
                                                        original: airflowStats.urgency_comparison.original.MEDIA,
                                                        clasificada: airflowStats.urgency_comparison.classified.MEDIA
                                                    },
                                                    { 
                                                        urgencia: "ALTA", 
                                                        original: airflowStats.urgency_comparison.original.ALTA,
                                                        clasificada: airflowStats.urgency_comparison.classified.ALTA
                                                    },
                                                ]}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="urgencia" />
                                                <YAxis />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar dataKey="original" fill="#94a3b8" name="Original" radius={[8, 8, 0, 0]} />
                                                <Bar dataKey="clasificada" fill="#00BFFE" name="Clasificada ML" radius={[8, 8, 0, 0]} />
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Reclassification Details */}
                            <div className="grid gap-6 lg:grid-cols-3">
                                <Card className="border-2" style={{borderColor: '#10b981', background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)'}}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-green-700">
                                            <TrendingUp className="h-5 w-5" />
                                            Urgencias Elevadas por ML
                                        </CardTitle>
                                        <CardDescription>
                                            Casos priorizados automáticamente - El ML detectó patrones de alto riesgo (palabras clave, tipo de lugar)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center">
                                            <div className="text-5xl font-bold text-green-600">
                                                {airflowStats.urgency_reclassification.changes.elevated}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2">
                                                {airflowStats.urgency_reclassification.changes.elevation_rate.toFixed(1)}% de reclasificaciones
                                            </p>
                                            <p className="text-xs text-gray-500 mt-3 italic">
                                                Ej: BAJA→MEDIA, MEDIA→ALTA por detección de keywords críticas
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-2" style={{borderColor: '#00BFFE', background: 'linear-gradient(to bottom, #ecfeff, #ffffff)'}}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2" style={{color: '#145C74'}}>
                                            <Target className="h-5 w-5" />
                                            Urgencias Reducidas por ML
                                        </CardTitle>
                                        <CardDescription>
                                            Optimización de recursos - El ML determinó que el caso no requiere máxima prioridad
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center">
                                            <div className="text-5xl font-bold" style={{color: '#00BFFE'}}>
                                                {airflowStats.urgency_reclassification.changes.reduced}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2">
                                                Reasignación eficiente de prioridad
                                            </p>
                                            <p className="text-xs text-gray-500 mt-3 italic">
                                                Ej: ALTA→MEDIA, MEDIA→BAJA por score de confianza bajo
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-2" style={{borderColor: '#231F20', background: 'linear-gradient(to bottom, #f5f5f5, #ffffff)'}}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2" style={{color: '#231F20'}}>
                                            <Clock className="h-5 w-5" />
                                            Tiempo de Procesamiento
                                        </CardTitle>
                                        <CardDescription>
                                            Velocidad del pipeline ML - Airflow ejecuta cada 5 minutos automáticamente
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center">
                                            <div className="text-5xl font-bold" style={{color: '#231F20'}}>
                                                {airflowStats.airflow_processing.avg_processing_time_minutes.toFixed(1)}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2">
                                                minutos promedio de análisis
                                            </p>
                                            <p className="text-xs text-gray-500 mt-3 italic">
                                                Análisis de descripción, lugar y cálculo de score ML
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Keywords Detection */}
                            {airflowStats.top_detected_keywords.length > 0 && (
                                <Card className="border-2" style={{borderColor: '#00BFFE'}}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5" style={{color: '#00BFFE'}} />
                                            Palabras Clave Detectadas por ML
                                        </CardTitle>
                                        <CardDescription>
                                            Patrones de riesgo en descripciones: <strong className="text-red-600">🔴 Alto Riesgo</strong> (+30% score: robo, violencia, fuego), 
                                            <strong className="text-orange-600"> 🟡 Medio Riesgo</strong> (+15% score: fuga, agua, daño)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {airflowStats.top_detected_keywords.map((kw, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="p-4 rounded-lg border-2 text-center hover:shadow-lg transition-shadow"
                                                    style={{
                                                        borderColor: kw.risk_level === 'high' ? '#ef4444' : '#f59e0b',
                                                        background: kw.risk_level === 'high' ? 'linear-gradient(to bottom, #fef2f2, #ffffff)' : 'linear-gradient(to bottom, #fffbeb, #ffffff)'
                                                    }}
                                                >
                                                    <div className="text-sm font-bold text-gray-700 mb-1">"{kw.keyword}"</div>
                                                    <div 
                                                        className="text-3xl font-black"
                                                        style={{ color: kw.risk_level === 'high' ? '#dc2626' : '#d97706' }}
                                                    >
                                                        {kw.count}
                                                    </div>
                                                    <div className="text-xs font-semibold mt-2" style={{color: kw.risk_level === 'high' ? '#dc2626' : '#d97706'}}>
                                                        {kw.risk_level === 'high' ? '🔴 ALTO' : '🟡 MEDIO'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {kw.risk_level === 'high' ? '+30% score' : '+15% score'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {loadingAirflow && (
                        <div className="flex items-center justify-center py-12 rounded-xl border-2" style={{background: 'linear-gradient(to right, #ecfeff, #f0f9ff)', borderColor: '#00BFFE'}}>
                            <div className="text-center">
                                <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-r-transparent mb-3" style={{borderColor: '#00BFFE', borderRightColor: 'transparent'}}></div>
                                <p className="font-semibold" style={{color: '#145C74'}}>Cargando métricas de Apache Airflow ML...</p>
                                <p className="text-sm text-gray-600 mt-1">Analizando reportes y clasificaciones automáticas</p>
                            </div>
                        </div>
                    )}

                    {/* Performance Metrics - Destacados */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="border-2" style={{background: 'linear-gradient(to bottom right, #EDEDED, #FFFFFF)', borderColor: '#00BFFE'}}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-2xl" style={{color: '#145C74'}}>
                                    <Clock className="h-6 w-6" style={{color: '#00BFFE'}} />
                                    Tiempo de Resolución
                                </CardTitle>
                                <CardDescription className="text-base">Promedio del sistema</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-6">
                                    <div className="text-6xl font-black mb-2" style={{color: '#145C74'}}>
                                        {stats.performance.avg_resolution_time_hours !== null
                                            ? Math.round(stats.performance.avg_resolution_time_hours * 10) / 10
                                            : "N/D"}
                                    </div>
                                    <div className="text-2xl font-semibold" style={{color: '#00BFFE'}}>HORAS</div>
                                    <p className="text-sm mt-4" style={{color: '#145C74'}}>
                                        Tiempo promedio desde creación hasta resolución
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2" style={{background: 'linear-gradient(to bottom right, #EDEDED, #FFFFFF)', borderColor: '#00BFFE'}}>
                            <CardHeader>
                                <CardTitle className="flex items-center  gap-2 text-2xl" style={{color: '#145C74'}}>
                                    <Target className="h-6 w-6" style={{color: '#00BFFE'}} />
                                    Tasa de Resolución
                                </CardTitle>
                                <CardDescription className="text-base">Efectividad del sistema</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center  py-4 mx-auto">
                                    <ChartContainer
                                        config={{
                                            resuelto: {
                                                label: "Resuelto",
                                                color: "#10b981",
                                            },
                                        }}
                                        className="h-[200px] mx-auto  "
                                    >
                                        <RadialBarChart
                                            data={[{
                                                name: "Resolución",
                                                value: stats.performance.resolution_rate,
                                                fill: "#00BFFE"
                                            }]}
                                            startAngle={90}
                                            endAngle={-270}
                                            innerRadius="60%"
                                            outerRadius="100%"
                                        >
                                            <RadialBar
                                                background
                                                dataKey="value"
                                                cornerRadius={10}
                                            />
                                            <text
                                                x="50%"
                                                y="50%"
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="text-4xl font-bold"
                                                fill="#145C74"
                                            >
                                                {stats.performance.resolution_rate}%
                                            </text>
                                        </RadialBarChart>
                                    </ChartContainer>
                                    <p className="text-sm mt-2" style={{color: '#145C74'}}>
                                        De todos los reportes han sido resueltos
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Gráficos de Análisis */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Distribución por Estado - Horizontal Bar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribución por Estado</CardTitle>
                                <CardDescription>Vista general del estado de reportes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer
                                    config={{
                                        cantidad: {
                                            label: "Cantidad",
                                            color: "#00BFFE",
                                        },
                                    }}
                                    className="h-[350px]"
                                >
                                    <BarChart
                                        data={[
                                            { 
                                                estado: "Resuelto", 
                                                cantidad: stats.summary.resuelto, 
                                                fill: "#145C74" 
                                            },
                                            { 
                                                estado: "Atendiendo", 
                                                cantidad: stats.summary.atendiendo, 
                                                fill: "#11C4FC" 
                                            },
                                            { 
                                                estado: "Pendiente", 
                                                cantidad: stats.summary.pendiente, 
                                                fill: "#00BAF5" 
                                            },
                                            { 
                                                estado: "Sin Asignar", 
                                                cantidad: stats.summary.sin_asignar, 
                                                fill: "#DADADA" 
                                            },
                                        ]}
                                        layout="vertical"
                                        margin={{ left: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="estado" type="category" width={90} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="cantidad" radius={[0, 8, 8, 0]}>
                                            <LabelList dataKey="cantidad" position="right" style={{ fontWeight: 'bold' }} />
                                            {[
                                                { fill: "#145C74" },
                                                { fill: "#11C4FC" },
                                                { fill: "#00BAF5" },
                                                { fill: "#DADADA" },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Urgencia */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Niveles de Urgencia</CardTitle>
                                <CardDescription>Prioridad de reportes activos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer
                                    config={{
                                        BAJA: { label: "Baja", color: "#00BFFE" },
                                        MEDIA: { label: "Media", color: "#11C4FC" },
                                        ALTA: { label: "Alta", color: "#145C74" },
                                    }}
                                    className="h-[350px]"
                                >
                                    <BarChart
                                        data={[
                                            { urgencia: "Baja", cantidad: stats.by_urgencia.BAJA, fill: URGENCY_COLORS.BAJA },
                                            { urgencia: "Media", cantidad: stats.by_urgencia.MEDIA, fill: URGENCY_COLORS.MEDIA },
                                            { urgencia: "Alta", cantidad: stats.by_urgencia.ALTA, fill: URGENCY_COLORS.ALTA },
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="urgencia" />
                                        <YAxis />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                                            <LabelList dataKey="cantidad" position="top" style={{ fontWeight: 'bold' }} />
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

                    {/* Análisis por Sector */}
                    <Card className="md:col-span-2">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">📊 Análisis por Sector</CardTitle>
                            <CardDescription className="text-base">
                                Comparativa de reportes totales vs período actual
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-center flex-col  items-center mb-6">
                                <div className="w-full max-w-6xl mx-auto ">
                                    <ChartContainer
                                        config={{
                                            total: { label: "Total", color: "#145C74" },
                                            periodo: { label: "En Período", color: "#00BFFE" },
                                        }}
                                        className="h-[400px] mx-auto "
                                    >
                                        <BarChart
                                            data={Object.keys(stats.by_sector.total).map((sector, index) => ({
                                                sector,
                                                total: stats.by_sector.total[sector],
                                                periodo: stats.by_sector.in_period[sector] || 0,
                                                fill: SECTOR_COLORS[index % SECTOR_COLORS.length]
                                            }))}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="sector" />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                            <Bar dataKey="total" fill="#145C74" name="Total" radius={[8, 8, 0, 0]}>
                                                <LabelList dataKey="total" position="top" />
                                            </Bar>
                                            <Bar dataKey="periodo" fill="#00BFFE" name="En Período" radius={[8, 8, 0, 0]}>
                                                <LabelList dataKey="periodo" position="top" />
                                            </Bar>
                                        </BarChart>
                                    </ChartContainer>
                                </div>
                            </div>

                            {/* Tabla resumen por sector */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.keys(stats.by_sector.total).map((sector, index) => (
                                    <div 
                                        key={sector}
                                        className="p-4 rounded-lg border-2"
                                        style={{ 
                                            borderColor: SECTOR_COLORS[index % SECTOR_COLORS.length],
                                            background: `${SECTOR_COLORS[index % SECTOR_COLORS.length]}10`
                                        }}
                                    >
                                        <div className="text-sm font-semibold text-gray-700">{sector}</div>
                                        <div className="text-2xl font-bold mt-1" style={{ color: SECTOR_COLORS[index % SECTOR_COLORS.length] }}>
                                            {stats.by_sector.total[sector]}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {stats.by_sector.in_period[sector] || 0} en período
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}