import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlineArrowDownTray,
	HiOutlineClock,
	HiOutlineMagnifyingGlass,
	HiOutlineXMark,
	HiOutlineCheckCircle,
	HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { exportLemburCleanoxExcel } from "../utils/exportLemburCleanoxExcel";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function toDateInput(date) {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getCutoffRange(cutoffMonth, cutoffYear) {
	const start = new Date(cutoffYear, cutoffMonth - 2, 26);
	const end = new Date(cutoffYear, cutoffMonth - 1, 25);
	return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

function getDefaultCutoff(now = new Date()) {
	let cutoffMonth = now.getMonth() + 1;
	let cutoffYear = now.getFullYear();
	if (now.getDate() > 25) {
		cutoffMonth += 1;
		if (cutoffMonth > 12) {
			cutoffMonth = 1;
			cutoffYear += 1;
		}
	}
	return { cutoffMonth, cutoffYear };
}

function formatDateOnly(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function formatDuration(mins) {
	if (mins == null || Number.isNaN(Number(mins))) return "—";
	const m = Math.max(0, Math.round(Number(mins)));
	const h = Math.floor(m / 60);
	const rem = m % 60;
	if (h <= 0) return `${rem}m`;
	return `${h}j ${rem}m`;
}

const PERIOD_MONTHS = [
	{ value: 1, label: "Januari" },
	{ value: 2, label: "Februari" },
	{ value: 3, label: "Maret" },
	{ value: 4, label: "April" },
	{ value: 5, label: "Mei" },
	{ value: 6, label: "Juni" },
	{ value: 7, label: "Juli" },
	{ value: 8, label: "Agustus" },
	{ value: 9, label: "September" },
	{ value: 10, label: "Oktober" },
	{ value: 11, label: "November" },
	{ value: 12, label: "Desember" },
];

const TYPE_LABEL = { checkout: "Checkout", pengajuan: "Pengajuan" };

function StatCard({ title, value, subtitle, tone = "blue", Icon }) {
	const toneClass =
		tone === "emerald"
			? "bg-emerald-50 border-emerald-100 text-emerald-700"
			: tone === "amber"
				? "bg-amber-50 border-amber-100 text-amber-700"
				: "bg-blue-50 border-blue-100 text-blue-700";
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm text-left w-full">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
					<p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
					<p className="mt-1 text-xs text-slate-500">{subtitle}</p>
				</div>
				<div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClass)}>
					{Icon ? <Icon className="h-5 w-5" /> : null}
				</div>
			</div>
		</div>
	);
}

function StatusBadge({ status }) {
	const s = String(status || "").toLowerCase();
	const cls =
		s === "aktif"
			? "bg-amber-50 text-amber-700 border-amber-200"
			: s === "selesai"
				? "bg-emerald-50 text-emerald-700 border-emerald-200"
				: "bg-slate-50 text-slate-600 border-slate-200";
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize", cls)}>
			{status || "-"}
		</span>
	);
}

export default function LemburCleanox() {
	const defaultCutoff = useMemo(() => getDefaultCutoff(), []);
	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, i) => base - 3 + i);
	}, []);

	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const cutoffRange = useMemo(() => getCutoffRange(cutoffMonth, cutoffYear), [cutoffMonth, cutoffYear]);

	const [records, setRecords] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [summary, setSummary] = useState({ total: 0, total_minutes: 0, aktif: 0, selesai: 0 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [filterType, setFilterType] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [detailItem, setDetailItem] = useState(null);
	const [exporting, setExporting] = useState(false);

	const fetchInFlight = useRef(false);

	const fetchRecords = useCallback(
		async ({ silent = false } = {}) => {
			if (fetchInFlight.current) return;
			fetchInFlight.current = true;
			if (!silent) {
				setLoading(true);
				setError("");
			}
			try {
				const qs = new URLSearchParams();
				qs.set("page", String(pagination.page));
				qs.set("limit", String(pagination.limit));
				qs.set("startDate", cutoffRange.startDate);
				qs.set("endDate", cutoffRange.endDate);
				if (filterType) qs.set("type", filterType);
				if (filterStatus) qs.set("status", filterStatus);
				if (search) qs.set("search", search);

				const data = await api(`/cleanox/overtime?${qs.toString()}`);
				setRecords(data?.records || []);
				setPagination((prev) => ({
					...prev,
					...(data?.pagination || {}),
					page: data?.pagination?.page || prev.page,
				}));
				setSummary(data?.summary || { total: 0, total_minutes: 0, aktif: 0, selesai: 0 });
			} catch (err) {
				setError(err?.message || "Gagal memuat data lembur");
			} finally {
				setLoading(false);
				fetchInFlight.current = false;
			}
		},
		[pagination.page, pagination.limit, cutoffRange.startDate, cutoffRange.endDate, filterType, filterStatus, search]
	);

	useEffect(() => {
		document.title = "Monitoring Lembur Cleanox | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		fetchRecords();
	}, [fetchRecords]);

	useEffect(() => {
		setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
	}, [cutoffMonth, cutoffYear, filterType, filterStatus, search]);

	const periodLabel = useMemo(() => {
		const monthName = PERIOD_MONTHS.find((m) => m.value === cutoffMonth)?.label || cutoffMonth;
		return `${monthName} ${cutoffYear} (${formatDateOnly(cutoffRange.startDate)} – ${formatDateOnly(cutoffRange.endDate)})`;
	}, [cutoffMonth, cutoffYear, cutoffRange]);

	const handleExport = async () => {
		setExporting(true);
		try {
			const qs = new URLSearchParams();
			qs.set("page", "1");
			qs.set("limit", "500");
			qs.set("startDate", cutoffRange.startDate);
			qs.set("endDate", cutoffRange.endDate);
			if (filterType) qs.set("type", filterType);
			if (filterStatus) qs.set("status", filterStatus);
			if (search) qs.set("search", search);
			const data = await api(`/cleanox/overtime?${qs.toString()}`);
			exportLemburCleanoxExcel({
				records: data?.records || [],
				periodLabel,
				activePeriod: cutoffRange,
				typeFilter: filterType,
				statusFilter: filterStatus,
			});
		} catch (err) {
			setError(err?.message || "Gagal export Excel");
		} finally {
			setExporting(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">Monitoring Lembur</h1>
						<p className="mt-1 text-sm text-slate-500">
							Pantau lembur karyawan Cleanox — read-only, cutoff 26→25.
						</p>
					</div>
					<button
						type="button"
						onClick={handleExport}
						disabled={exporting || loading}
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b3459] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152a4a] disabled:opacity-60"
					>
						<HiOutlineArrowDownTray className="h-4 w-4" />
						{exporting ? "Menyiapkan Excel..." : "Export Excel"}
					</button>
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<StatCard
						title="Total Record"
						value={summary.total}
						subtitle="Di periode terfilter"
						tone="blue"
						Icon={HiOutlineClock}
					/>
					<StatCard
						title="Total Jam Lembur"
						value={formatDuration(summary.total_minutes)}
						subtitle={`${summary.total_minutes || 0} menit (selesai)`}
						tone="emerald"
						Icon={HiOutlineCheckCircle}
					/>
					<StatCard
						title="Sedang Aktif"
						value={summary.aktif}
						subtitle="Pengajuan belum selesai"
						tone="amber"
						Icon={HiOutlineExclamationTriangle}
					/>
				</div>

				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
						<div>
							<label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Bulan Cutoff</label>
							<select
								value={cutoffMonth}
								onChange={(e) => setCutoffMonth(Number(e.target.value))}
								className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								{PERIOD_MONTHS.map((m) => (
									<option key={m.value} value={m.value}>{m.label}</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tahun</label>
							<select
								value={cutoffYear}
								onChange={(e) => setCutoffYear(Number(e.target.value))}
								className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								{yearOptions.map((y) => (
									<option key={y} value={y}>{y}</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tipe</label>
							<select
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
								className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="">Semua</option>
								<option value="checkout">Checkout</option>
								<option value="pengajuan">Pengajuan</option>
							</select>
						</div>
						<div>
							<label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</label>
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="">Semua</option>
								<option value="aktif">Aktif</option>
								<option value="selesai">Selesai</option>
							</select>
						</div>
						<div>
							<label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cari nama</label>
							<div className="mt-1 flex gap-2">
								<div className="relative flex-1">
									<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
									<input
										value={searchInput}
										onChange={(e) => setSearchInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") setSearch(searchInput.trim());
										}}
										placeholder="Nama / kode..."
										className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
									/>
								</div>
								<button
									type="button"
									onClick={() => setSearch(searchInput.trim())}
									className="rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"
								>
									Cari
								</button>
							</div>
						</div>
					</div>
					<p className="text-xs text-slate-400">{periodLabel}</p>
				</div>

				{error ? (
					<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
				) : null}

				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-100 text-sm">
							<thead className="bg-slate-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nama</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tipe</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mulai</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Selesai</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Durasi</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Deskripsi</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading ? (
									<tr>
										<td colSpan={8} className="px-4 py-10 text-center text-slate-400">Memuat data...</td>
									</tr>
								) : records.length === 0 ? (
									<tr>
										<td colSpan={8} className="px-4 py-10 text-center text-slate-400">Tidak ada data lembur.</td>
									</tr>
								) : (
									records.map((row) => (
										<tr
											key={row.id}
											className="cursor-pointer hover:bg-slate-50"
											onClick={() => setDetailItem(row)}
										>
											<td className="px-4 py-3 font-semibold text-slate-800">{row.full_name || row.employee_name}</td>
											<td className="px-4 py-3 text-slate-600">{formatDateOnly(row.overtime_date)}</td>
											<td className="px-4 py-3 text-slate-600">{TYPE_LABEL[row.type] || row.type}</td>
											<td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(row.start_at)}</td>
											<td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(row.end_at)}</td>
											<td className="px-4 py-3 font-semibold text-[#1b3459]">{formatDuration(row.duration_minutes)}</td>
											<td className="px-4 py-3 text-slate-500 max-w-[220px] truncate">{row.description || "-"}</td>
											<td className="px-4 py-3"><StatusBadge status={row.status} /></td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{pagination.totalPages > 1 ? (
						<div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
							<span>
								Halaman {pagination.page} / {pagination.totalPages} · {pagination.total} data
							</span>
							<div className="flex gap-2">
								<button
									type="button"
									disabled={pagination.page <= 1}
									onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
									className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
								>
									Prev
								</button>
								<button
									type="button"
									disabled={pagination.page >= pagination.totalPages}
									onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
									className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
								>
									Next
								</button>
							</div>
						</div>
					) : null}
				</div>
			</div>

			{detailItem ? (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
					onClick={() => setDetailItem(null)}
					role="presentation"
				>
					<div
						className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
						aria-modal="true"
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<h3 className="text-lg font-bold text-slate-900">{detailItem.full_name || detailItem.employee_name}</h3>
								<p className="text-xs text-slate-400 mt-0.5">{detailItem.employee_code || `ID ${detailItem.worker_id}`}</p>
							</div>
							<button
								type="button"
								onClick={() => setDetailItem(null)}
								className="rounded-lg border border-slate-200 p-1.5 text-slate-500"
								aria-label="Tutup"
							>
								<HiOutlineXMark className="h-5 w-5" />
							</button>
						</div>
						<div className="mt-4 space-y-3 text-sm">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<p className="text-[11px] font-semibold uppercase text-slate-400">Tanggal</p>
									<p className="mt-0.5 font-semibold text-slate-800">{formatDateOnly(detailItem.overtime_date)}</p>
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase text-slate-400">Tipe</p>
									<p className="mt-0.5 font-semibold text-slate-800">{TYPE_LABEL[detailItem.type] || detailItem.type}</p>
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase text-slate-400">Mulai</p>
									<p className="mt-0.5 text-slate-700">{formatDateTime(detailItem.start_at)}</p>
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase text-slate-400">Selesai</p>
									<p className="mt-0.5 text-slate-700">{formatDateTime(detailItem.end_at)}</p>
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase text-slate-400">Durasi</p>
									<p className="mt-0.5 font-semibold text-[#1b3459]">{formatDuration(detailItem.duration_minutes)}</p>
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase text-slate-400">Status</p>
									<div className="mt-1"><StatusBadge status={detailItem.status} /></div>
								</div>
							</div>
							<div>
								<p className="text-[11px] font-semibold uppercase text-slate-400">Deskripsi</p>
								<p className="mt-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-700 whitespace-pre-wrap">
									{detailItem.description || "-"}
								</p>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
