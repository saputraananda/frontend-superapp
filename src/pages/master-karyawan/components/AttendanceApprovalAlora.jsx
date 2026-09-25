import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlineArrowsUpDown,
	HiOutlineCalendarDays,
	HiOutlineChevronDown,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineChevronUp,
	HiOutlineClock,
	HiOutlineExclamationTriangle,
	HiOutlineFunnel,
	HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
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

function generatePages(current, total) {
	if (total <= 1) return [1];
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
	if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "...", current - 1, current, current + 1, "...", total];
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

const MODE_META = {
	wfa: { label: "WFA", cls: "bg-violet-50 text-violet-700 border-violet-200" },
	wod: { label: "WOD", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const STATUS_META = {
	Pending_Supervisor: { label: "Menunggu Supervisor", cls: "bg-amber-50 text-amber-700 border-amber-200" },
	Rejected_Supervisor: { label: "Ditolak Supervisor", cls: "bg-rose-50 text-rose-700 border-rose-200" },
	disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function ModeBadge({ type }) {
	const meta = MODE_META[type] ?? { label: type || "-", cls: "bg-slate-50 text-slate-600 border-slate-200" };
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", meta.cls)}>
			{meta.label}
		</span>
	);
}

function StatusBadge({ status, label }) {
	const meta = STATUS_META[status] ?? { label: label || status || "-", cls: "bg-slate-50 text-slate-600 border-slate-200" };
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", meta.cls)}>
			{meta.label}
		</span>
	);
}

function SortTh({ col, label, sort, onSort }) {
	const active = sort.col === col;
	return (
		<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
			<button type="button" onClick={() => onSort(col)} className="inline-flex items-center gap-1 hover:text-slate-700">
				{label}
				{active ? (
					sort.dir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />
				) : (
					<HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-40" />
				)}
			</button>
		</th>
	);
}

function SkeletonRow({ cols = 6 }) {
	return (
		<tr className="border-t border-slate-100 animate-pulse">
			{Array.from({ length: cols }).map((_, i) => (
				<td key={i} className="px-4 py-4">
					<div className={cn("h-3.5 rounded-md bg-slate-200", i <= 1 ? "w-28" : "w-16")} />
				</td>
			))}
		</tr>
	);
}

export default function AttendanceApprovalAlora() {
	const defaultCutoff = useMemo(() => getDefaultCutoff(), []);
	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, i) => base - 3 + i);
	}, []);

	const [records, setRecords] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [filterStatus, setFilterStatus] = useState("");
	const [filterMode, setFilterMode] = useState("");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const cutoffRange = useMemo(() => getCutoffRange(cutoffMonth, cutoffYear), [cutoffMonth, cutoffYear]);

	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sort, setSort] = useState({ col: "work_date", dir: "desc" });

	const fetchInFlight = useRef(false);

	const fetchList = useCallback(
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
				if (filterStatus) qs.set("status", filterStatus);
				if (filterMode) qs.set("requestType", filterMode);
				if (search) qs.set("search", search);

				const data = await api(`/alora/attendance-mode-requests?${qs.toString()}`);
				setRecords(data.records ?? []);
				setPagination((prev) => ({
					...prev,
					total: data.pagination?.total ?? 0,
					totalPages: data.pagination?.totalPages ?? 1,
				}));
			} catch (err) {
				if (!silent) setError(err.message || "Gagal memuat pengajuan WFA/WOD");
				setRecords([]);
			} finally {
				fetchInFlight.current = false;
				if (!silent) setLoading(false);
			}
		},
		[pagination.page, pagination.limit, cutoffRange.startDate, cutoffRange.endDate, filterStatus, filterMode, search],
	);

	useEffect(() => {
		document.title = "Monitoring WFA/WOD | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const handleSort = (col) =>
		setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));

	const handlePage = (p) =>
		setPagination((prev) => ({ ...prev, page: Math.max(1, Math.min(p, prev.totalPages)) }));

	const handleLimitChange = (newLimit) =>
		setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		setSearch(searchInput.trim());
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const sortedRecords = useMemo(() => {
		if (!sort.col) return records;
		return [...records].sort((a, b) => {
			let va = a[sort.col] ?? "";
			let vb = b[sort.col] ?? "";
			if (typeof va === "string") va = va.toLowerCase();
			if (typeof vb === "string") vb = vb.toLowerCase();
			if (va < vb) return sort.dir === "asc" ? -1 : 1;
			if (va > vb) return sort.dir === "asc" ? 1 : -1;
			return 0;
		});
	}, [records, sort]);

	const pages = generatePages(pagination.page, pagination.totalPages);
	const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
	const to = Math.min(pagination.page * pagination.limit, pagination.total);

	return (
		<div className="space-y-5 p-4 md:p-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<div className="mb-1 inline-flex items-center gap-2 text-blue-600">
						<HiOutlineClock className="h-5 w-5" />
						<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
					</div>
					<h1 className="text-xl font-black text-slate-800">Monitoring WFA/WOD</h1>
					<p className="mt-1 text-sm text-slate-500">
						Monitoring pengajuan WFA & WOD. Periode cutoff 26–25.
					</p>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
					{error}
				</div>
			)}

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
				<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
					<HiOutlineFunnel className="h-4 w-4 text-slate-400" />
					Filter
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
						<select
							value={filterStatus}
							onChange={(e) => {
								setFilterStatus(e.target.value);
								setPagination((p) => ({ ...p, page: 1 }));
							}}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							<option value="">Semua Status</option>
							{Object.entries(STATUS_META).map(([key, meta]) => (
								<option key={key} value={key}>{meta.label}</option>
							))}
						</select>
					</label>

					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Tipe</span>
						<select
							value={filterMode}
							onChange={(e) => {
								setFilterMode(e.target.value);
								setPagination((p) => ({ ...p, page: 1 }));
							}}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							<option value="">Semua Tipe</option>
							<option value="wfa">WFA</option>
							<option value="wod">WOD</option>
						</select>
					</label>

					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
						<select
							value={cutoffMonth}
							onChange={(e) => {
								setCutoffMonth(Number(e.target.value));
								setPagination((p) => ({ ...p, page: 1 }));
							}}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							{PERIOD_MONTHS.map((m) => (
								<option key={m.value} value={m.value}>{m.label}</option>
							))}
						</select>
					</label>

					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
						<select
							value={cutoffYear}
							onChange={(e) => {
								setCutoffYear(Number(e.target.value));
								setPagination((p) => ({ ...p, page: 1 }));
							}}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>{y}</option>
							))}
						</select>
					</label>
				</div>

				<div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
					<HiOutlineCalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
					<span>
						Periode: <strong className="text-slate-800">{formatDateOnly(cutoffRange.startDate)}</strong>
						{" "}&ndash;{" "}
						<strong className="text-slate-800">{formatDateOnly(cutoffRange.endDate)}</strong>
					</span>
				</div>

				<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<form onSubmit={handleSearchSubmit} className="flex max-w-xs flex-1 gap-2">
						<div className="relative flex-1">
							<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Cari ID karyawan..."
								className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							/>
						</div>
						<button type="submit" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
							Cari
						</button>
					</form>

					<button
						type="button"
						onClick={() => {
							setFilterStatus("");
							setFilterMode("");
							const def = getDefaultCutoff();
							setCutoffMonth(def.cutoffMonth);
							setCutoffYear(def.cutoffYear);
							setSearch("");
							setSearchInput("");
							setPagination((p) => ({ ...p, page: 1 }));
						}}
						className="self-end rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
					>
						Reset
					</button>
				</div>
			</section>

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
					<div className="flex items-center gap-2">
						<HiOutlineClock className="h-5 w-5 text-blue-500" />
						<h2 className="text-base font-bold text-slate-800">Daftar Pengajuan</h2>
					</div>
					<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
						{pagination.total.toLocaleString("id-ID")} data
					</span>
				</div>

				<div className="hidden overflow-x-auto md:block">
					<table className="w-full border-collapse text-sm">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">No</th>
								<SortTh col="employee_name" label="Karyawan" sort={sort} onSort={handleSort} />
								<SortTh col="work_date" label="Tanggal" sort={sort} onSort={handleSort} />
								<SortTh col="request_type" label="Tipe" sort={sort} onSort={handleSort} />
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Alasan</th>
								<SortTh col="status" label="Status" sort={sort} onSort={handleSort} />
								<SortTh col="created_at" label="Diajukan" sort={sort} onSort={handleSort} />
							</tr>
						</thead>
						<tbody>
							{loading
								? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
								: sortedRecords.length === 0
									? (
										<tr>
											<td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
												Tidak ada data pengajuan
											</td>
										</tr>
									)
									: sortedRecords.map((row, idx) => (
										<tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
											<td className="px-4 py-3 text-xs text-slate-400">{from + idx}</td>
											<td className="px-4 py-3">
												<p className="whitespace-nowrap font-semibold text-slate-800">{row.employee_name || "-"}</p>
												<p className="text-xs text-slate-400">{row.department_name || row.employee_id}</p>
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{formatDateOnly(row.work_date)}</td>
											<td className="px-4 py-3"><ModeBadge type={row.request_type} /></td>
											<td className="max-w-[240px] px-4 py-3">
												<p className="truncate text-xs text-slate-600">{row.reason || "-"}</p>
												{row.supervisor_rejection_reason && (
													<p className="mt-0.5 truncate text-xs text-rose-600">Tolak: {row.supervisor_rejection_reason}</p>
												)}
											</td>
											<td className="whitespace-nowrap px-4 py-3">
												<StatusBadge status={row.status} label={row.status_label} />
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDateTime(row.created_at)}</td>
										</tr>
									))}
						</tbody>
					</table>
				</div>

				<div className="space-y-3 p-4 md:hidden">
					{loading
						? Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="h-28 animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
						))
						: sortedRecords.length === 0
							? <p className="py-10 text-center text-sm text-slate-400">Tidak ada data pengajuan</p>
							: sortedRecords.map((row) => (
								<div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
									<div className="flex items-start justify-between gap-2">
										<div>
											<p className="text-sm font-bold text-slate-800">{row.employee_name || "-"}</p>
											<p className="text-xs text-slate-400">{row.department_name || row.employee_id}</p>
										</div>
										<StatusBadge status={row.status} label={row.status_label} />
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<ModeBadge type={row.request_type} />
										<span className="text-xs text-slate-600">{formatDateOnly(row.work_date)}</span>
									</div>
									<p className="text-xs text-slate-500 line-clamp-2">{row.reason || "-"}</p>
									<p className="text-[11px] text-slate-400">Diajukan: {formatDateTime(row.created_at)}</p>
								</div>
							))}
				</div>

				<div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<span className="text-slate-500">
							{pagination.total > 0 ? (
								<>
									Menampilkan <strong className="text-slate-700">{from}-{to}</strong> dari{" "}
									<strong className="text-slate-700">{pagination.total.toLocaleString("id-ID")}</strong> data
								</>
							) : "Tidak ada data"}
						</span>
						<label className="flex items-center gap-1.5 text-xs text-slate-400">
							Tampil:
							<select
								value={pagination.limit}
								onChange={(e) => handleLimitChange(Number(e.target.value))}
								disabled={loading}
								className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 disabled:opacity-60"
							>
								<option value={25}>25</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</label>
					</div>

					<div className="flex items-center gap-1">
						<button type="button" onClick={() => handlePage(1)} disabled={pagination.page <= 1 || loading}
							className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
							{"<<"}
						</button>
						<button type="button" onClick={() => handlePage(pagination.page - 1)} disabled={pagination.page <= 1 || loading}
							className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
							<HiOutlineChevronLeft className="h-3.5 w-3.5" />
						</button>
						{pages.map((p, i) =>
							p === "..." ? (
								<span key={`el-${i}`} className="flex h-7 w-6 items-center justify-center text-xs text-slate-400">...</span>
							) : (
								<button key={p} type="button" onClick={() => handlePage(p)} disabled={loading}
									className={cn(
										"flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed",
										p === pagination.page
											? "border-blue-500 bg-blue-600 text-white shadow-sm"
											: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
									)}>
									{p}
								</button>
							),
						)}
						<button type="button" onClick={() => handlePage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || loading}
							className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
							<HiOutlineChevronRight className="h-3.5 w-3.5" />
						</button>
						<button type="button" onClick={() => handlePage(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages || loading}
							className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
							{">>"}
						</button>
					</div>
				</div>
			</section>
		</div>
	);
}
