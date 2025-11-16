import type { Report } from "@/interfaces/api";

export const ReportCard = ({data}: {data: Report}) => {
	const formatDateTime = (iso?: string | null) => {
		if (!iso) return "";
		try {
			const d = new Date(iso);
			return d.toLocaleString();
		} catch {
			return iso;
		}
	};

	const statusClasses = (() => {
		switch (data.estado) {
			case "PENDIENTE":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "ATENDIENDO":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "RESUELTO":
				return "bg-green-100 text-green-800 border-green-200";
			default:
				return "bg-gray-100 text-gray-700 border-gray-200";
		}
	})();

	const urgencyClasses = (() => {
		switch (data.urgencia) {
			case "ALTA":
				return "bg-red-100 text-red-800 border-red-200";
			case "MEDIA":
				return "bg-orange-100 text-orange-800 border-orange-200";
			case "BAJA":
				return "bg-emerald-100 text-emerald-800 border-emerald-200";
			default:
				return "bg-gray-100 text-gray-700 border-gray-200";
		}
	})();

	return (
		<article className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
			{/* Imagen del reporte (aún no lista). Actualmente el backend devuelve una URL de S3.
					Cuando la URL sea accesible por HTTP, descomentar y asegurar el dominio en la política CSP:
					<img src={data.image_url ?? ''} alt="Imagen del reporte" className="w-full h-40 object-cover" />
			*/}

			<div className="p-4 sm:p-5">
				<div className="flex flex-wrap items-center gap-2 mb-2">
					<span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusClasses}`}>
						<svg aria-hidden className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
							<circle cx="12" cy="12" r="6" />
						</svg>
						{data.estado}
					</span>
					<span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${urgencyClasses}`}>
						<svg aria-hidden className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2L15 8l6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" />
						</svg>
						{data.urgencia}
					</span>
				</div>

				<h3 className="text-base sm:text-lg font-semibold text-gray-900">
					{data.lugar?.name ?? "Lugar no especificado"}
				</h3>

				<p className="mt-1 text-sm text-gray-600 line-clamp-3">
					{data.descripcion}
				</p>

				<dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 sm:text-sm">
					<div className="flex items-center gap-1">
						<dt className="font-medium text-gray-700">Fecha:</dt>
						<dd>{formatDateTime(data.created_at || data.fecha_hora)}</dd>
					</div>
					{data.lugar?.tower && (
						<div className="flex items-center gap-1">
							<dt className="font-medium text-gray-700">Torre:</dt>
							<dd>{data.lugar.tower}</dd>
						</div>
					)}
					{typeof data.lugar?.floor === "number" && (
						<div className="flex items-center gap-1">
							<dt className="font-medium text-gray-700">Piso:</dt>
							<dd>{data.lugar.floor}</dd>
						</div>
					)}
					{data.assigned_name && (
						<div className="col-span-2 flex items-center gap-1">
							<dt className="font-medium text-gray-700">Asignado a:</dt>
							<dd className="truncate">{data.assigned_name}</dd>
						</div>
					)}
				</dl>
			</div>
		</article>
	);
}