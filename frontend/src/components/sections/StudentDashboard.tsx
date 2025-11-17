import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { loadEnv } from "@/utils/loaderEnv";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList, Area, AreaChart } from "recharts";
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";

type Period = "today" | "week" | "month" | "year";

type StudentStats = {
    role: "student";
    period: Period;
    date_range: { from: string; to: string };
    my_reports: {
        total: number;
        in_period: number;
        pendiente: number;
        atendiendo: number;
        resuelto: number;
        by_urgencia: { BAJA: number; MEDIA: number; ALTA: number };
    };
    system_overview: {
        total_reports_in_period: number;
        by_urgencia: { BAJA: number; MEDIA: number; ALTA: number };
    };
};

const URGENCY_COLORS = {
    BAJA: "#10b981",
    MEDIA: "#f59e0b", 
    ALTA: "#ef4444"
};

const STATUS_COLORS = {
    pendiente: "#a855f7",
    atendiendo: "#3b82f6",
    resuelto: "#10b981"
};

export default function StudentDashboard() {
    const { token } = useAuth();
    const [period, setPeriod] = useState<Period>("week");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<StudentStats | null>(null);

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
                const data = (await res.json()) as StudentStats;
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

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">📊 Mi Panel Estadístico</h1>
                    <p className="text-gray-600 mt-1">Visualiza el rendimiento de tus reportes</p>
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
                    {/* Cards de resumen */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-linear-to-br from-purple-50 to-purple-100 border-purple-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-purple-900">
                                    Total de Reportes
                                </CardTitle>
                                <AlertCircle className="h-4 w-4 text-purple-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-900">{stats.my_reports.total}</div>
                                <p className="text-xs text-purple-700 mt-1">
                                    {stats.my_reports.in_period} en este período
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-linear-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-yellow-900">
                                    Pendientes
                                </CardTitle>
                                <Clock className="h-4 w-4 text-yellow-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-900">{stats.my_reports.pendiente}</div>
                                <p className="text-xs text-yellow-700 mt-1">
                                    Esperando atención
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-linear-to-br from-blue-50 to-blue-100 border-blue-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-blue-900">
                                    En Proceso
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-900">{stats.my_reports.atendiendo}</div>
                                <p className="text-xs text-blue-700 mt-1">
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
                                <div className="text-2xl font-bold text-green-900">{stats.my_reports.resuelto}</div>
                                <p className="text-xs text-green-700 mt-1">
                                    Completados exitosamente
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Gráficos principales */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Gráfico de estado de mis reportes - Barras Horizontales */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Estado de Mis Reportes</CardTitle>
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
                                                cantidad: stats.my_reports.pendiente, 
                                                fill: STATUS_COLORS.pendiente 
                                            },
                                            { 
                                                estado: "Atendiendo", 
                                                cantidad: stats.my_reports.atendiendo, 
                                                fill: STATUS_COLORS.atendiendo 
                                            },
                                            { 
                                                estado: "Resuelto", 
                                                cantidad: stats.my_reports.resuelto, 
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

                        {/* Gráfico de urgencia de mis reportes */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Urgencia de Mis Reportes</CardTitle>
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
                                            { urgencia: "Baja", cantidad: stats.my_reports.by_urgencia.BAJA, fill: URGENCY_COLORS.BAJA },
                                            { urgencia: "Media", cantidad: stats.my_reports.by_urgencia.MEDIA, fill: URGENCY_COLORS.MEDIA },
                                            { urgencia: "Alta", cantidad: stats.my_reports.by_urgencia.ALTA, fill: URGENCY_COLORS.ALTA },
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

                    {/* Panorama del sistema */}
                    <Card className="md:col-span-2">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">🌐 Panorama General del Sistema</CardTitle>
                            <CardDescription className="text-base">
                                Estadísticas de todos los reportes en el período seleccionado
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Total destacado */}
                                <div className="flex items-center justify-center">
                                    <div className="text-center p-6 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg text-white min-w-[280px]">
                                        <p className="text-sm font-medium opacity-90 mb-2">Total de reportes en el sistema</p>
                                        <p className="text-6xl font-bold mb-2">
                                            {stats.system_overview.total_reports_in_period}
                                        </p>
                                        <p className="text-xs opacity-75">Durante {
                                            period === "today" ? "hoy" :
                                            period === "week" ? "los últimos 7 días" :
                                            period === "month" ? "los últimos 30 días" :
                                            "el último año"
                                        }</p>
                                    </div>
                                </div>

                                {/* Gráfico de área */}
                                <div className="flex justify-center">
                                    <div className="w-full flex flex-col items-center max-w-4xl">
                                        <h3 className="text-center text-sm font-semibold text-gray-700 mb-4">
                                            Distribución por Urgencia
                                        </h3>
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
                                            className="h-[280px]"
                                        >
                                            <AreaChart
                                                data={[
                                                    { 
                                                        urgencia: "Baja", 
                                                        cantidad: stats.system_overview.by_urgencia.BAJA,
                                                        fill: URGENCY_COLORS.BAJA
                                                    },
                                                    { 
                                                        urgencia: "Media", 
                                                        cantidad: stats.system_overview.by_urgencia.MEDIA,
                                                        fill: URGENCY_COLORS.MEDIA
                                                    },
                                                    { 
                                                        urgencia: "Alta", 
                                                        cantidad: stats.system_overview.by_urgencia.ALTA,
                                                        fill: URGENCY_COLORS.ALTA
                                                    },
                                                ]}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorBaja" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={URGENCY_COLORS.BAJA} stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor={URGENCY_COLORS.BAJA} stopOpacity={0.1}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorMedia" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={URGENCY_COLORS.MEDIA} stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor={URGENCY_COLORS.MEDIA} stopOpacity={0.1}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorAlta" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={URGENCY_COLORS.ALTA} stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor={URGENCY_COLORS.ALTA} stopOpacity={0.1}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis 
                                                    dataKey="urgencia" 
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
                                                    stroke="#8b5cf6"
                                                    strokeWidth={3}
                                                    fill="url(#colorBaja)"
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
                                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                                        <div className="text-xs text-green-700 font-medium mb-1">BAJA</div>
                                        <div className="text-2xl font-bold text-green-900">
                                            {stats.system_overview.by_urgencia.BAJA}
                                        </div>
                                        <div className="text-xs text-green-600 mt-1">
                                            {((stats.system_overview.by_urgencia.BAJA / stats.system_overview.total_reports_in_period) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                                        <div className="text-xs text-orange-700 font-medium mb-1">MEDIA</div>
                                        <div className="text-2xl font-bold text-orange-900">
                                            {stats.system_overview.by_urgencia.MEDIA}
                                        </div>
                                        <div className="text-xs text-orange-600 mt-1">
                                            {((stats.system_overview.by_urgencia.MEDIA / stats.system_overview.total_reports_in_period) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                                        <div className="text-xs text-red-700 font-medium mb-1">ALTA</div>
                                        <div className="text-2xl font-bold text-red-900">
                                            {stats.system_overview.by_urgencia.ALTA}
                                        </div>
                                        <div className="text-xs text-red-600 mt-1">
                                            {((stats.system_overview.by_urgencia.ALTA / stats.system_overview.total_reports_in_period) * 100).toFixed(1)}%
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