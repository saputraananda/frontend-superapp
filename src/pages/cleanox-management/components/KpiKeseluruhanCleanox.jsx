import { useCallback, useEffect, useState } from "react";
import { HiOutlineChartBar, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { api } from "../../../lib/api";

const STATUS_STYLES = {
	"Melampaui Target": "border-emerald-200 bg-emerald-50 text-emerald-700",
	"Sangat Baik": "border-blue-200 bg-blue-50 text-blue-700",
	Produktif: "border-amber-200 bg-amber-50 text-amber-700",
	Cukup: "border-slate-200 bg-slate-50 text-slate-600",
};

const TABLE_HEADERS = [
	{ label: "No", align: "text-center" },
	{ label: "Nama Worker", align: "text-left" },
	{ label: "Waschen (Jam)", align: "text-right" },
	{ label: "Waschen (%)", align: "text-right" },
	{ label: "Home Service (Jam)", align: "text-right" },
	{ label: "Home Service (%)", align: "text-right" },
	{ label: "Take Home (Jam)", align: "text-right" },
	{ label: "Take Home (%)", align: "text-right" },
	{ label: "Total Jam Kerja", align: "text-right" },
	{ label: "Target Jam", align: "text-right" },
	{ label: "Total Capaian (%)", align: "text-right" },
	{ label: "Status", align: "text-center" },
];

const formatDecimal = (value) =>
	Number(value || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatHours = (value) => `${formatDecimal(value)} j`;
const formatPercent = (value) => `${formatDecimal(value)}%`;

function StatusBadge({ status }) {
	return (
		<span
			className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.Cukup}`}
		>
			{status}
		</span>
	);
}

function SummaryCard({ title, hours, percent, highlighted = false }) {
	return (
		<div
			className={
				highlighted
					? "rounded-xl bg-gradient-to-br from-[#1b3459] to-[#12233c] p-4 text-white"
					: "rounded-xl border border-slate-200 bg-slate-50 p-4"
			}
		>
			<p
				className={`text-[10px] font-semibold uppercase tracking-wider ${highlighted ? "text-white/70" : "text-slate-500"}`}
			>
				{title}
			</p>
			<p className={`mt-1 text-2xl font-black ${highlighted ? "" : "text-[#1b3459]"}`}>{formatPercent(percent)}</p>
			<p className={`text-xs ${highlighted ? "text-white/70" : "text-slate-500"}`}>Rata-rata {formatHours(hours)}</p>
		</div>
	);
}

/**
 * KPI Keseluruhan: gabungan By Waschen + Home Service + Take Home per worker terhadap target jam.
 * Isi tabel sama dengan sheet "Ringkasan KPI Keseluruhan" pada hasil ekspor Excel.
 */
export default function KpiKeseluruhanCleanox({ dateStart, dateEnd }) {
	const [workers, setWorkers] = useState([]);
	const [average, setAverage] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const loadOverall = useCallback(async () => {
		if (!dateStart || !dateEnd) return;
		try {
			setLoading(true);
			setError("");
			const params = new URLSearchParams({ date_start: dateStart, date_end: dateEnd });
			const response = await api(`/kpi/all/summary?${params.toString()}`);
			setWorkers(response.workers || []);
			setAverage(response.average || null);
		} catch (err) {
			setError(err.message || "Gagal memuat data KPI Keseluruhan");
			setWorkers([]);
			setAverage(null);
		} finally {
			setLoading(false);
		}
	}, [dateStart, dateEnd]);

	useEffect(() => {
		loadOverall();
	}, [loadOverall]);

	if (error) {
		return (
			<section className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
				<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
				{error}
			</section>
		);
	}

	return (
		<>
			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
					<HiOutlineChartBar className="h-4 w-4 text-[#97bd3f]" />
					Ringkasan KPI Keseluruhan
				</h2>
				{loading || !average ? (
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
						{Array.from({ length: 5 }).map((_, index) => (
							<div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />
						))}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
						<SummaryCard highlighted title="Total Capaian" hours={average.total_hours} percent={average.total_pct} />
						<SummaryCard title="By Waschen" hours={average.waschen_hours} percent={average.waschen_pct} />
						<SummaryCard title="Home Service" hours={average.home_service_hours} percent={average.home_service_pct} />
						<SummaryCard title="Take Home" hours={average.take_home_hours} percent={average.take_home_pct} />
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Jumlah Worker</p>
							<p className="mt-1 text-2xl font-black text-[#1b3459]">{average.worker_count}</p>
							<p className="text-xs text-slate-500">Target {average.target_hours} jam / worker</p>
						</div>
					</div>
				)}
			</section>

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-100 text-sm">
						<thead className="bg-slate-50">
							<tr>
								{TABLE_HEADERS.map((header) => (
									<th
										key={header.label}
										className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${header.align}`}
									>
										{header.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{loading ? (
								<tr>
									<td colSpan={TABLE_HEADERS.length} className="px-4 py-10 text-center text-sm text-slate-400">
										Memuat data KPI Keseluruhan...
									</td>
								</tr>
							) : workers.length === 0 ? (
								<tr>
									<td colSpan={TABLE_HEADERS.length} className="px-4 py-10 text-center text-sm text-slate-400">
										Tidak ada data KPI pada periode ini.
									</td>
								</tr>
							) : (
								workers.map((worker) => (
									<tr key={worker.name} className="hover:bg-slate-50">
										<td className="px-4 py-3 text-center text-slate-500">{worker.rank}</td>
										<td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{worker.name}</td>
										<td className="px-4 py-3 text-right text-slate-700">{formatHours(worker.waschen_hours)}</td>
										<td className="px-4 py-3 text-right text-slate-700">{formatPercent(worker.waschen_pct)}</td>
										<td className="px-4 py-3 text-right text-slate-700">{formatHours(worker.home_service_hours)}</td>
										<td className="px-4 py-3 text-right text-slate-700">{formatPercent(worker.home_service_pct)}</td>
										<td className="px-4 py-3 text-right text-slate-700">{formatHours(worker.take_home_hours)}</td>
										<td className="px-4 py-3 text-right text-slate-700">{formatPercent(worker.take_home_pct)}</td>
										<td className="px-4 py-3 text-right font-semibold text-slate-900">{formatHours(worker.total_hours)}</td>
										<td className="px-4 py-3 text-right text-slate-500">{worker.target_hours} j</td>
										<td className="px-4 py-3 text-right font-bold text-[#1b3459]">{formatPercent(worker.total_pct)}</td>
										<td className="px-4 py-3 text-center">
											<StatusBadge status={worker.status} />
										</td>
									</tr>
								))
							)}
						</tbody>
						{!loading && workers.length > 0 && average && (
							<tfoot className="bg-slate-50">
								<tr className="font-bold text-slate-800">
									<td className="px-4 py-3" />
									<td className="whitespace-nowrap px-4 py-3">RATA-RATA TIM ({average.worker_count} WORKER)</td>
									<td className="px-4 py-3 text-right">{formatHours(average.waschen_hours)}</td>
									<td className="px-4 py-3 text-right">{formatPercent(average.waschen_pct)}</td>
									<td className="px-4 py-3 text-right">{formatHours(average.home_service_hours)}</td>
									<td className="px-4 py-3 text-right">{formatPercent(average.home_service_pct)}</td>
									<td className="px-4 py-3 text-right">{formatHours(average.take_home_hours)}</td>
									<td className="px-4 py-3 text-right">{formatPercent(average.take_home_pct)}</td>
									<td className="px-4 py-3 text-right">{formatHours(average.total_hours)}</td>
									<td className="px-4 py-3 text-right">{average.target_hours} j</td>
									<td className="px-4 py-3 text-right text-[#1b3459]">{formatPercent(average.total_pct)}</td>
									<td className="px-4 py-3 text-center">
										<StatusBadge status={average.status} />
									</td>
								</tr>
							</tfoot>
						)}
					</table>
				</div>
			</section>
		</>
	);
}
