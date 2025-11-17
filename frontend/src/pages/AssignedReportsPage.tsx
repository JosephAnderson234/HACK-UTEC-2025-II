import { useEffect, useState, useCallback } from "react";
import { getReports } from "@/services/report/getReports";
import { assignSelfReport } from "@/services/report/assignReport";
import { updateStatus } from "@/services/report/updateStatus";
import type { Report } from "@/interfaces/api/reports";
import { useToken } from "@/store/authStore";
import { useNotification } from "@/hooks/useNotification";
import Modal from "@/components/ui/Modal";

export default function AssignedReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const user = useToken.getState().user;
    const { showNotification } = useNotification();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalReportId, setModalReportId] = useState<string | null>(null);
    const [resolutionText, setResolutionText] = useState<string>("Fuga reparada exitosamente. Baño limpio y funcional.");

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Request only reports in ATENDIENDO state
            const data = await getReports({ page: 1, size: 50, estado: 'ATENDIENDO' });
            // Keep only those attending and assigned to the current user (authority)
            const incoming = (data.reports || []).filter((r) => r.estado === 'ATENDIENDO' && r.assigned_to === user?.id);
            setReports(incoming);
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : String(err);
            setError(message || "Error fetching reports");
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const setRowLoading = (id: string, value: boolean) => {
        setActionLoading((prev) => ({ ...prev, [id]: value }));
    };

    const badgeClassFor = (estado?: string) => {
        switch (estado) {
            case 'ATENDIENDO':
                return 'bg-yellow-100 text-yellow-800';
            case 'RESUELTO':
                return 'bg-green-100 text-green-800';
            case 'PENDIENTE':
            default:
                return 'bg-slate-100 text-slate-800';
        }
    };

    const handleTake = async (id_reporte: string) => {
        setRowLoading(id_reporte, true);
        try {
            // POST /reports/{id_reporte}/take
            await assignSelfReport(id_reporte);

            // Then update status to ATENDIENDO with a comment
            await updateStatus({
                id_reporte,
                estado: "ATENDIENDO",
                comentario: "Personal técnico en camino al lugar del reporte"
            });

            showNotification({ message: "Reporte tomado y marcado como ATENDIENDO", type: "success", duration: 3000 });
            await fetchReports();
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : String(err);
            showNotification({ message: message || "Error al tomar el reporte", type: "error", duration: 5000 });
        } finally {
            setRowLoading(id_reporte, false);
        }
    };

    const openResolveModal = (id_reporte: string) => {
        setModalReportId(id_reporte);
        setResolutionText("Fuga reparada exitosamente. Baño limpio y funcional.");
        setModalOpen(true);
    };

    const handleResolveConfirm = async () => {
        if (!modalReportId) return;
        setRowLoading(modalReportId, true);
        try {
            await updateStatus({
                id_reporte: modalReportId,
                estado: "RESUELTO",
                comentario: resolutionText
            });

            showNotification({ message: "Reporte marcado como RESUELTO", type: "success", duration: 3000 });
            setModalOpen(false);
            setModalReportId(null);
            await fetchReports();
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : String(err);
            showNotification({ message: message || "Error al marcar como resuelto", type: "error", duration: 5000 });
        } finally {
            if (modalReportId) setRowLoading(modalReportId, false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Reportes</h1>

            {loading && (
                <div className="p-4 border rounded-lg bg-white/5 shadow-sm">
                    <p className="text-gray-600">Cargando reportes...</p>
                </div>
            )}
            {error && <div className="text-red-500">{error}</div>}

            {!loading && reports.length === 0 && <div>No hay reportes disponibles.</div>}

            <div className="grid gap-4">
                {reports.map((r) => {
                    const isAttending = r.estado === 'ATENDIENDO';
                    const isAssignedToMe = r.assigned_to === user?.id;

                    return (
                    <div key={r.id_reporte} className="p-4 border rounded-lg bg-white/5 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-semibold text-lg">{r.lugar?.name ?? 'Lugar'}</div>
                                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClassFor(r.estado)}`}>{r.estado}</div>
                                    </div>
                                    <div className="text-sm text-(--color-tertiary)">ID: {r.id_reporte}</div>
                                    <div className="mt-3 text-base">{r.descripcion}</div>
                                    <div className="mt-2 text-sm text-(--color-tertiary)">Asignado: {r.assigned_name ?? r.assigned_to ?? '—'}</div>
                                    {r.created_at && <div className="text-xs text-(--color-tertiary) mt-1">{new Date(r.created_at).toLocaleString()}</div>}
                                </div>
                            <div className="flex flex-col gap-2 w-40">
                                {/* Mostrar botón 'Tomar' sólo si no está ATENDIENDO */}
                                {!isAttending && (
                                    <button
                                        className="px-3 py-2 rounded bg-(--color-secondary) text-(--color-primary)"
                                        disabled={!!actionLoading[r.id_reporte]}
                                        onClick={() => handleTake(r.id_reporte)}
                                    >
                                        {actionLoading[r.id_reporte] ? 'Procesando...' : 'Tomar'}
                                    </button>
                                )}

                                {/* Mostrar 'Marcar Resuelto' sólo si está ATENDIENDO y es asignado a este usuario */}
                                {isAttending && isAssignedToMe && (
                                    <button
                                        className="px-3 py-2 rounded border border-(--color-secondary) text-(--color-tertiary)"
                                        disabled={!!actionLoading[r.id_reporte]}
                                        onClick={() => openResolveModal(r.id_reporte)}
                                    >
                                        {actionLoading[r.id_reporte] ? 'Procesando...' : 'Marcar Resuelto'}
                                    </button>
                                )}

                                {/* Si está ATENDIENDO pero no es tu ID, mostrar información no interactiva */}
                                {isAttending && !isAssignedToMe && (
                                    <div className="text-sm text-(--color-tertiary)">En atención por otro usuario</div>
                                )}
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            <Modal
                open={modalOpen}
                title="Marcar reporte como resuelto"
                onClose={() => setModalOpen(false)}
                onConfirm={handleResolveConfirm}
                confirmLabel="Marcar Resuelto"
                cancelLabel="Cancelar"
            >
                <label className="block text-sm font-medium mb-2">Comentario de resolución</label>
                <textarea
                    className="w-full min-h-[120px] p-2 rounded-md border border-white/10 bg-transparent text-(--color-tertiary)"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                />
            </Modal>
        </div>
    );
}
