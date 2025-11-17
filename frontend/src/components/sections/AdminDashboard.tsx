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