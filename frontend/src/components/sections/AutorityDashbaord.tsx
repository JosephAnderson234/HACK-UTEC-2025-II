import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { loadEnv } from "@/utils/loaderEnv";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList, Area, AreaChart } from "recharts";
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Users, Briefcase } from "lucide-react";

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

export default function AutorityDashbaord() {
    const { token } = useAuth();
    const [period, setPeriod] = useState<Period>("week");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<AuthorityStats | null>(null);

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