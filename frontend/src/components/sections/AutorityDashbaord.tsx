import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { loadEnv } from "@/utils/loaderEnv";

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
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-black/90 text-2xl font-bold">Panel de Autoridad</h1>
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
                        <h2 className="text-black/80 font-semibold">Mi sector: {stats.sector || "—"}</h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <StatCard title="Total" value={stats.my_sector.total_reports} />
                            <StatCard title="En período" value={stats.my_sector.in_period} />
                            <StatCard title="Pendiente" value={stats.my_sector.pendiente} color="#7c3aed" />
                            <StatCard title="Atendiendo" value={stats.my_sector.atendiendo} color="#1e40af" />
                            <StatCard title="Resuelto" value={stats.my_sector.resuelto} color="#065f46" />
                        </div>
                        <div>
                            <h3 className="text-black/70 text-sm mb-2">Por urgencia</h3>
                            <UrgenciaBlock data={stats.my_sector.by_urgencia} />
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-black/80 font-semibold">Mis asignaciones</h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard title="Total" value={stats.my_assigned.total} />
                            <StatCard title="Pendiente" value={stats.my_assigned.pendiente} color="#7c3aed" />
                            <StatCard title="Atendiendo" value={stats.my_assigned.atendiendo} color="#1e40af" />
                            <StatCard title="Resuelto" value={stats.my_assigned.resuelto} color="#065f46" />
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}