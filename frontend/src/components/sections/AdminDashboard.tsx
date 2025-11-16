import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { loadEnv } from "@/utils/loaderEnv";

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

function StatCard({ title, value, color }: { title: string; value: number | string; color?: string }) {
    return (
        <div style={{ background: color || "#1f2937" }} className="rounded-lg p-4 text-white shadow">
            <div className="text-sm opacity-80">{title}</div>
            <div className="text-2xl font-semibold">{value}</div>
        </div>
    );
}

function UrgenciaBlock({ data }: { data: { BAJA: number; MEDIA: number; ALTA: number } }) {
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            <StatCard title="Baja" value={data.BAJA} color="#065f46" />
            <StatCard title="Media" value={data.MEDIA} color="#92400e" />
            <StatCard title="Alta" value={data.ALTA} color="#7f1d1d" />
        </div>
    );
}

function SectorTable({ title, data }: { title: string; data: Record<string, number> }) {
    const entries = Object.entries(data || {});
    return (
            <div className="rounded-lg overflow-hidden border border-black/10">
                <div className="bg-black/5 text-black/80 px-4 py-2 text-sm font-semibold">{title}</div>
                <div className="divide-y divide-black/10">
                    {entries.length === 0 && <div className="px-4 py-3 text-black/60">Sin datos</div>}
                    {entries.map(([sector, count]) => (
                        <div key={sector} className="px-4 py-2 flex items-center justify-between text-black">
                        <span className="text-sm">{sector}</span>
                        <span className="font-semibold">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-black/90 text-2xl font-bold">Panel de Administración</h1>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                    className="rounded px-3 py-2 bg-white/90"
                >
                    <option value="today">Hoy</option>
                    <option value="week">Últimos 7 días</option>
                    <option value="month">Últimos 30 días</option>
                    <option value="year">Último año</option>
                </select>
            </div>

            {loading && <div className="text-black/70">Cargando…</div>}
            {error && <div className="text-red-600">{error}</div>}

            {stats && (
                <div className="space-y-8">
                                <section className="space-y-3">
                                    <h2 className="text-black/80 font-semibold">Resumen</h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                            <StatCard title="Total" value={stats.summary.total_reportes} />
                            <StatCard title="En período" value={stats.summary.in_period} />
                            <StatCard title="Pendiente" value={stats.summary.pendiente} color="#7c3aed" />
                            <StatCard title="Atendiendo" value={stats.summary.atendiendo} color="#1e40af" />
                            <StatCard title="Resuelto" value={stats.summary.resuelto} color="#065f46" />
                            <StatCard title="Sin asignar" value={stats.summary.sin_asignar} color="#6b7280" />
                        </div>
                    </section>

                                <section className="space-y-3">
                                    <h2 className="text-black/80 font-semibold">Distribución por urgencia</h2>
                        <UrgenciaBlock data={stats.by_urgencia} />
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <SectorTable title="Reportes por sector (total)" data={stats.by_sector.total} />
                        <SectorTable title="Reportes por sector (período)" data={stats.by_sector.in_period} />
                    </section>

                                <section className="space-y-3">
                                    <h2 className="text-black/80 font-semibold">Performance</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <StatCard
                                title="Tiempo prom. de resolución (h)"
                                value={
                                    stats.performance.avg_resolution_time_hours !== null
                                        ? Math.round(stats.performance.avg_resolution_time_hours * 100) / 100
                                        : "N/D"
                                }
                                color="#0f766e"
                            />
                            <StatCard title="Tasa de resolución (%)" value={`${stats.performance.resolution_rate}%`} color="#065f46" />
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}