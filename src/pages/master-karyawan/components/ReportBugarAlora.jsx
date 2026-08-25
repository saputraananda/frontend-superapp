import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlineAdjustmentsHorizontal,
	HiOutlineArrowDownTray,
	HiOutlineCalendarDays,
	HiOutlineChevronDown,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineChevronUp,
	HiOutlineClock,
	HiOutlineDocumentCheck,
	HiOutlineFire,
	HiOutlineHeart,
	HiOutlineMagnifyingGlass,
	HiOutlineMapPin,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { exportReportBugarAloraExcel } from "../utils/exportReportBugarAloraExcel";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function toDateInput(date) {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return "";
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatDateOnly(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
}

function formatDateTime(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function formatDuration(totalSec) {
	const sec = Math.max(Number(totalSec) || 0, 0);
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function generatePages(current, total) {
	if (total <= 1) return [];
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
	if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "...", current - 1, current, current + 1, "...", total];
}

function getDefaultCutoffSelection(now = new Date(), cutoffStartDay = 26) {
	const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
	const endDay = startDay - 1;
	let cutoffMonth = now.getMonth() + 1;
	let cutoffYear = now.getFullYear();
	if (now.getDate() > endDay) {
		cutoffMonth += 1;
		if (cutoffMonth > 12) {
			cutoffMonth = 1;
			cutoffYear += 1;
		}
	}
	const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
	const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
	return {
		cutoffMonth,
		cutoffYear,
		startDate: toDateInput(start),
		endDate: toDateInput(end),
	};
}

function toneClass(tone) {
	if (tone === "emerald") return "bg-emerald-50 border-emerald-100 text-emerald-700";
	if (tone === "amber") return "bg-amber-50 border-amber-100 text-amber-700";
	if (tone === "rose") return "bg-rose-50 border-rose-100 text-rose-700";
	return "bg-blue-50 border-blue-100 text-blue-700";
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

function StatCard({ title, value, subtitle, tone = "blue", Icon }) {
	return (
		<div className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm sm:p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
					<p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
					<p className="mt-1 text-xs text-slate-500">{subtitle}</p>
				</div>
				<div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClass(tone))}>
					{Icon ? <Icon className="h-5 w-5" /> : null}
				</div>
			</div>
		</div>
	);
}

function SportBadge({ sport }) {
	const map = {
		run: { label: "Lari", cls: "bg-sky-50 text-sky-700 border-sky-200" },
		cycle: { label: "Sepeda", cls: "bg-violet-50 text-violet-700 border-violet-200" },
	};
	const meta = map[sport] ?? { label: sport || "-", cls: "bg-slate-50 text-slate-600 border-slate-200" };
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", meta.cls)}>
			{meta.label}
		</span>
	);
}

function HaidBadge({ active }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
				active ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-500",
			)}
		>
			{active ? "Ya" : "Tidak"}
		</span>
	);
}

function SortTh({ col, label, sort, onSort, className = "" }) {
	const active = sort.col === col;
	return (
		<th
			className={cn(
				"cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-slate-100",
				active ? "bg-blue-50/60 text-blue-600" : "text-slate-500",
				className,
			)}
			onClick={() => onSort(col)}
		>
			<div className="flex items-center gap-1">
				{label}
				{active ? (
					sort.dir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />
				) : (
					<HiOutlineChevronUp className="h-3.5 w-3.5 opacity-30" />
				)}
			</div>
		</th>
	);
}

function SkeletonRow({ cols = 11 }) {
	return (
		<tr className="animate-pulse border-t border-slate-100">
			{Array.from({ length: cols }).map((_, i) => (
				<td key={i} className="px-4 py-4">
					<div className={cn("h-3.5 rounded-md bg-slate-200", i <= 1 ? "w-24" : "w-14")} />
				</td>
			))}
		</tr>
	);
}

function PaginationBar({ pagination, onPage, onLimitChange, loading }) {
	const { page, totalPages, total, limit } = pagination;
	const from = total === 0 ? 0 : (page - 1) * limit + 1;
	const to = Math.min(page * limit, total);
	const pages = generatePages(page, totalPages);

	return (
		<div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-wrap items-center gap-3 text-sm">
				<span className="text-slate-500">
					{total > 0 ? (
						<>
							Menampilkan <strong className="text-slate-700">{from}-{to}</strong> dari{" "}
							<strong className="text-slate-700">{total.toLocaleString("id-ID")}</strong> data
						</>
					) : (
						"Tidak ada data"
					)}
				</span>
				<label className="flex items-center gap-1.5 text-xs text-slate-400">
					Tampil:
					<select
						value={limit}
						onChange={(e) => onLimitChange(Number(e.target.value))}
						disabled={loading}
						className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-60"
					>
						<option value={25}>25</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</label>
			</div>
			<div className="flex items-center gap-1">
				<button type="button" onClick={() => onPage(1)} disabled={page <= 1 || loading} className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
					{"<<"}
				</button>
				<button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1 || loading} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
					<HiOutlineChevronLeft className="h-3.5 w-3.5" />
				</button>
				{pages.map((p, i) =>
					p === "..." ? (
						<span key={`el-${i}`} className="flex h-7 w-6 items-center justify-center text-xs text-slate-400">...</span>
					) : (
						<button
							key={p}
							type="button"
							onClick={() => onPage(p)}
							disabled={loading}
							className={cn(
								"flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed",
								p === page ? "border-blue-500 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
							)}
						>
							{p}
						</button>
					),
				)}
				<button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages || loading} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
					<HiOutlineChevronRight className="h-3.5 w-3.5" />
				</button>
				<button type="button" onClick={() => onPage(totalPages)} disabled={page >= totalPages || loading} className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
					{">>"}
				</button>
			</div>
		</div>
	);
}

export default function ReportBugarAlora() {
	const todayStr = useMemo(() => toDateInput(new Date()), []);
	const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date(), 26), []);
	const cutoffStartDay = 26;

	const [periodMode, setPeriodMode] = useState("cutoff");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
	const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);
	const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
	const [employeeOptions, setEmployeeOptions] = useState([]);
	const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
	const [employeeOptionSearch, setEmployeeOptionSearch] = useState("");
	const [sportFilter, setSportFilter] = useState("");
	const [haidFilter, setHaidFilter] = useState("");
	const employeeDropdownRef = useRef(null);
	const fetchInFlightRef = useRef(false);

	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [summary, setSummary] = useState(null);
	const [employeeSummary, setEmployeeSummary] = useState([]);
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [sort, setSort] = useState({ col: "ended_at", dir: "desc" });
	const [exporting, setExporting] = useState(false);

	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
	}, []);

	const activePeriod = useMemo(() => {
		if (periodMode === "today") return { startDate: todayStr, endDate: todayStr };
		if (periodMode === "custom") {
			return { startDate: customStartDate || todayStr, endDate: customEndDate || customStartDate || todayStr };
		}
		const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
		const endDay = startDay - 1;
		const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
		const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
		return { startDate: toDateInput(start), endDate: toDateInput(end) };
	}, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear]);

	const activePeriodLabel = useMemo(() => {
		if (periodMode === "today") return `Hari ini (${formatDateOnly(todayStr)})`;
		if (periodMode === "custom") return `Custom ${formatDateOnly(activePeriod.startDate)} - ${formatDateOnly(activePeriod.endDate)}`;
		const monthLabel = PERIOD_MONTHS.find((m) => m.value === cutoffMonth)?.label || `Bulan ${cutoffMonth}`;
		return `Cutoff ${monthLabel} ${cutoffYear} (${formatDateOnly(activePeriod.startDate)} - ${formatDateOnly(activePeriod.endDate)})`;
	}, [periodMode, todayStr, activePeriod.startDate, activePeriod.endDate, cutoffMonth, cutoffYear]);

	useEffect(() => {
		document.title = "Report Alora Bugar | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		if (!employeeDropdownOpen) return;
		const onPointerDown = (event) => {
			if (!employeeDropdownRef.current) return;
			if (!employeeDropdownRef.current.contains(event.target)) setEmployeeDropdownOpen(false);
		};
		window.addEventListener("mousedown", onPointerDown);
		window.addEventListener("touchstart", onPointerDown);
		return () => {
			window.removeEventListener("mousedown", onPointerDown);
			window.removeEventListener("touchstart", onPointerDown);
		};
	}, [employeeDropdownOpen]);

	const fetchReport = useCallback(
		async ({ silent = false } = {}) => {
			if (fetchInFlightRef.current) return;
			if (!activePeriod.startDate || !activePeriod.endDate) {
				setError("Periode belum valid");
				setSummary(null);
				setEmployeeSummary([]);
				setRecords([]);
				return;
			}
			if (activePeriod.endDate < activePeriod.startDate) {
				setError("Tanggal akhir tidak boleh lebih kecil dari tanggal awal");
				setSummary(null);
				setEmployeeSummary([]);
				setRecords([]);
				return;
			}

			try {
				fetchInFlightRef.current = true;
				if (!silent) {
					setLoading(true);
					setError("");
				}
				const qs = new URLSearchParams();
				qs.set("startDate", activePeriod.startDate);
				qs.set("endDate", activePeriod.endDate);
				qs.set("page", String(pagination.page));
				qs.set("limit", String(pagination.limit));
				if (selectedEmployeeIds.length > 0) qs.set("employeeIds", selectedEmployeeIds.join(","));
				if (sportFilter) qs.set("sport", sportFilter);
				if (haidFilter) qs.set("haidMode", haidFilter);

				const response = await api(`/alora/bugar?${qs.toString()}`);
				setSummary(response.summary ?? null);
				setEmployeeSummary(response.employeeSummary ?? []);
				setRecords(response.records ?? []);
				setEmployeeOptions(Array.isArray(response.employeeOptions) ? response.employeeOptions : []);
				setPagination((prev) => ({
					...prev,
					total: response.pagination?.total ?? 0,
					totalPages: response.pagination?.totalPages ?? 1,
				}));
			} catch (err) {
				if (!silent) {
					setError(err.message || "Gagal mengambil report Alora Bugar");
					setSummary(null);
					setEmployeeSummary([]);
					setRecords([]);
				}
			} finally {
				fetchInFlightRef.current = false;
				if (!silent) setLoading(false);
			}
		},
		[activePeriod.startDate, activePeriod.endDate, selectedEmployeeIds, sportFilter, haidFilter, pagination.page, pagination.limit],
	);

	useEffect(() => {
		fetchReport();
	}, [fetchReport]);

	const displayedRecords = useMemo(() => {
		if (!sort.col) return records;
		const dir = sort.dir === "asc" ? 1 : -1;
		return [...records].sort((a, b) => {
			if (sort.col === "employee_name") return String(a.employee_name || "").localeCompare(String(b.employee_name || "")) * dir;
			if (sort.col === "sport") return String(a.sport || "").localeCompare(String(b.sport || "")) * dir;
			if (["ended_at", "started_at"].includes(sort.col)) {
				const ta = a[sort.col] ? new Date(a[sort.col]).getTime() : 0;
				const tb = b[sort.col] ? new Date(b[sort.col]).getTime() : 0;
				return (ta - tb) * dir;
			}
			if (["distance_km", "calories", "duration_sec"].includes(sort.col)) {
				return (Number(a[sort.col] || 0) - Number(b[sort.col] || 0)) * dir;
			}
			return String(a[sort.col] ?? "").localeCompare(String(b[sort.col] ?? "")) * dir;
		});
	}, [records, sort]);

	const selectedEmployeeSet = useMemo(() => new Set(selectedEmployeeIds), [selectedEmployeeIds]);
	const filteredEmployeeOptions = useMemo(() => {
		const keyword = employeeOptionSearch.trim().toLowerCase();
		if (!keyword) return employeeOptions;
		return employeeOptions.filter((item) => {
			const name = String(item.employee_name || "").toLowerCase();
			const code = String(item.employee_code || "").toLowerCase();
			const id = String(item.employee_id || "").toLowerCase();
			return name.includes(keyword) || code.includes(keyword) || id.includes(keyword);
		});
	}, [employeeOptions, employeeOptionSearch]);

	const selectedEmployeeText = useMemo(() => {
		if (selectedEmployeeIds.length === 0) return "Semua karyawan";
		const selectedNameMap = new Map(
			employeeOptions.map((item) => [Number(item.employee_id), item.employee_name || `ID ${item.employee_id}`]),
		);
		const names = selectedEmployeeIds
			.slice(0, 2)
			.map((id) => selectedNameMap.get(Number(id)) || `ID ${id}`)
			.filter(Boolean);
		if (selectedEmployeeIds.length <= 2) return names.join(", ");
		return `${names.join(", ")} +${selectedEmployeeIds.length - 2} lainnya`;
	}, [selectedEmployeeIds, employeeOptions]);

	const allFilteredSelected =
		filteredEmployeeOptions.length > 0 &&
		filteredEmployeeOptions.every((item) => selectedEmployeeSet.has(Number(item.employee_id)));

	const resetFilters = () => {
		const resetCutoff = getDefaultCutoffSelection(new Date(), 26);
		setPeriodMode("cutoff");
		setCutoffMonth(resetCutoff.cutoffMonth);
		setCutoffYear(resetCutoff.cutoffYear);
		setCustomStartDate(resetCutoff.startDate);
		setCustomEndDate(resetCutoff.endDate);
		setSelectedEmployeeIds([]);
		setEmployeeOptionSearch("");
		setEmployeeDropdownOpen(false);
		setSportFilter("");
		setHaidFilter("");
		setPagination((prev) => ({ ...prev, page: 1 }));
		setSort({ col: "ended_at", dir: "desc" });
		setError("");
	};

	const toggleEmployeeSelection = (employeeId) => {
		setSelectedEmployeeIds((prev) => {
			const id = Number(employeeId);
			if (prev.includes(id)) return prev.filter((item) => item !== id);
			return [...prev, id];
		});
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const toggleAllFilteredEmployees = () => {
		const ids = filteredEmployeeOptions.map((item) => Number(item.employee_id));
		setSelectedEmployeeIds((prev) => {
			if (allFilteredSelected) return prev.filter((id) => !ids.includes(id));
			return [...new Set([...prev, ...ids])];
		});
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const handleSort = (col) =>
		setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
	const handlePage = (p) => setPagination((prev) => ({ ...prev, page: Math.max(1, Math.min(p, prev.totalPages)) }));
	const handleLimitChange = (newLimit) => setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));

	const handleExport = async () => {
		try {
			setExporting(true);
			const qs = new URLSearchParams();
			qs.set("startDate", activePeriod.startDate);
			qs.set("endDate", activePeriod.endDate);
			qs.set("page", "1");
			qs.set("limit", "99999");
			if (selectedEmployeeIds.length > 0) qs.set("employeeIds", selectedEmployeeIds.join(","));
			if (sportFilter) qs.set("sport", sportFilter);
			if (haidFilter) qs.set("haidMode", haidFilter);
			const response = await api(`/alora/bugar?${qs.toString()}`);
			const selectedNames = selectedEmployeeIds.map((id) => {
				const opt = employeeOptions.find((o) => Number(o.employee_id) === id);
				return opt?.employee_name || `ID ${id}`;
			});
			exportReportBugarAloraExcel({
				records: response.records || [],
				periodLabel: activePeriodLabel,
				activePeriod,
				filters: {
					sportFilter,
					haidFilter,
					selectedEmployeeNames: selectedNames,
				},
			});
		} catch (err) {
			console.error("Gagal mendownload excel:", err);
			alert(`Gagal mengunduh data excel: ${err.message}`);
		} finally {
			setExporting(false);
		}
	};

	return (
		<main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
			<div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-900 via-indigo-800 to-cyan-700 p-5 shadow-sm sm:p-6">
					<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
					<div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
					<div className="relative max-w-3xl">
						<p className="text-xs font-bold uppercase tracking-wider text-white/70">Master Karyawan</p>
						<h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Report Alora Bugar</h1>
						<p className="mt-2 text-sm text-white/80 sm:text-base">
							Pantau record sesi olahraga karyawan Alora Bugar per periode cutoff.
						</p>
						<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
							<HiOutlineCalendarDays className="h-4 w-4" />
							{activePeriodLabel}
						</div>
					</div>
				</section>

				{error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
					<div className="mb-4 flex items-center gap-2">
						<div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
							<HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
						</div>
						<div>
							<h2 className="text-base font-bold text-slate-800">Filter Periode & Data</h2>
							<p className="text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
							<select
								value={periodMode}
								onChange={(e) => {
									setPeriodMode(e.target.value);
									setPagination((prev) => ({ ...prev, page: 1 }));
								}}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="cutoff">Periode Cutoff</option>
								<option value="today">Hari Ini</option>
								<option value="custom">Custom Tanggal</option>
							</select>
						</label>

						<div className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Cari Karyawan</span>
							<div className="relative" ref={employeeDropdownRef}>
								<button
									type="button"
									onClick={() => setEmployeeDropdownOpen((prev) => !prev)}
									className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									<span className="truncate">{selectedEmployeeText}</span>
									<HiOutlineChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", employeeDropdownOpen ? "rotate-180" : "")} />
								</button>
								{employeeDropdownOpen && (
									<div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
										<div className="border-b border-slate-100 p-2">
											<div className="relative">
												<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
												<input
													type="text"
													value={employeeOptionSearch}
													onChange={(e) => setEmployeeOptionSearch(e.target.value)}
													placeholder="Cari nama, kode, employee id"
													className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
												/>
											</div>
										</div>
										<div className="max-h-56 overflow-auto p-2">
											{filteredEmployeeOptions.length === 0 ? (
												<p className="px-2 py-4 text-center text-xs text-slate-400">Karyawan tidak ditemukan</p>
											) : (
												<div className="space-y-1">
													{filteredEmployeeOptions.map((item) => {
														const id = Number(item.employee_id);
														const checked = selectedEmployeeSet.has(id);
														return (
															<label key={id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
																<input type="checkbox" checked={checked} onChange={() => toggleEmployeeSelection(id)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
																<span className="min-w-0">
																	<span className="block truncate font-medium text-slate-700">{item.employee_name || `ID ${id}`}</span>
																	<span className="block truncate text-[11px] text-slate-400">{item.employee_code || "Belum ada NIK"}</span>
																</span>
															</label>
														);
													})}
												</div>
											)}
										</div>
										<div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-2">
											<button type="button" onClick={toggleAllFilteredEmployees} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
												{allFilteredSelected ? "Batal pilih semua" : "Pilih semua hasil"}
											</button>
											<button type="button" onClick={() => setEmployeeDropdownOpen(false)} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
												Tutup
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{periodMode === "cutoff" && (
						<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
								<select
									value={cutoffMonth}
									onChange={(e) => {
										setCutoffMonth(Number(e.target.value));
										setPagination((prev) => ({ ...prev, page: 1 }));
									}}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									{PERIOD_MONTHS.map((month) => (
										<option key={month.value} value={month.value}>{month.label}</option>
									))}
								</select>
							</label>
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
								<select
									value={cutoffYear}
									onChange={(e) => {
										setCutoffYear(Number(e.target.value));
										setPagination((prev) => ({ ...prev, page: 1 }));
									}}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									{yearOptions.map((year) => (
										<option key={year} value={year}>{year}</option>
									))}
								</select>
							</label>
						</div>
					)}

					{periodMode === "custom" && (
						<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
								<input
									type="date"
									value={customStartDate}
									onChange={(e) => {
										setCustomStartDate(e.target.value);
										setPagination((prev) => ({ ...prev, page: 1 }));
									}}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</label>
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
								<input
									type="date"
									value={customEndDate}
									onChange={(e) => {
										setCustomEndDate(e.target.value);
										setPagination((prev) => ({ ...prev, page: 1 }));
									}}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</label>
						</div>
					)}

					<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Olahraga</span>
							<select
								value={sportFilter}
								onChange={(e) => {
									setSportFilter(e.target.value);
									setPagination((prev) => ({ ...prev, page: 1 }));
								}}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="">Semua</option>
								<option value="run">Lari</option>
								<option value="cycle">Sepeda</option>
							</select>
						</label>
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Mode Haid</span>
							<select
								value={haidFilter}
								onChange={(e) => {
									setHaidFilter(e.target.value);
									setPagination((prev) => ({ ...prev, page: 1 }));
								}}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="">Semua</option>
								<option value="1">Haid saja</option>
								<option value="0">Non-haid</option>
							</select>
						</label>
					</div>

					<div className="mt-4 flex justify-end">
						<button type="button" onClick={resetFilters} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
							Reset
						</button>
					</div>
					<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
						Periode aktif: <strong>{formatDateOnly(activePeriod.startDate)}</strong> sampai <strong>{formatDateOnly(activePeriod.endDate)}</strong>
					</div>
				</section>

				<section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
					<StatCard title="Total Sesi" value={summary?.totalSessions ?? 0} subtitle="Record sesi pada periode aktif" tone="blue" Icon={HiOutlineDocumentCheck} />
					<StatCard title="Total KM" value={summary?.totalKm ?? 0} subtitle="Akumulasi jarak sesi" tone="emerald" Icon={HiOutlineMapPin} />
					<StatCard title="Kalori" value={summary?.totalCalories ?? 0} subtitle="Akumulasi kalori terbakar" tone="rose" Icon={HiOutlineFire} />
					<StatCard title="Durasi" value={formatDuration(summary?.totalDurationSec)} subtitle={`Lari ${summary?.runCount ?? 0} · Sepeda ${summary?.cycleCount ?? 0}`} tone="amber" Icon={HiOutlineClock} />
				</section>

				{employeeSummary.length > 0 && (
					<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div className="border-b border-slate-100 px-5 py-4">
							<h2 className="text-base font-bold text-slate-800">Ringkasan Per Karyawan</h2>
							<p className="mt-0.5 text-xs text-slate-500">Akumulasi sesi olahraga pada periode aktif.</p>
						</div>
						<div className="overflow-x-auto pb-1">
							<table className="min-w-[900px] w-full table-fixed text-sm">
								<thead className="border-b border-slate-100 bg-slate-50">
									<tr>
										<th className="w-[24%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Karyawan</th>
										<th className="w-[12%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">NIK</th>
										<th className="w-[20%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Jabatan</th>
										<th className="w-[12%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Sesi</th>
										<th className="w-[12%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">KM</th>
										<th className="w-[10%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Kalori</th>
										<th className="w-[10%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Durasi</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{employeeSummary.map((row) => (
										<tr key={row.employee_id} className="transition-colors hover:bg-blue-50/30">
											<td className="px-4 py-3 text-sm font-semibold text-slate-800">{row.employee_name}</td>
											<td className="px-4 py-3 text-center text-sm text-slate-600">{row.employee_code || "-"}</td>
											<td className="px-4 py-3 text-sm text-slate-600">{row.jabatan || "-"}</td>
											<td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{row.session_count}</td>
											<td className="px-4 py-3 text-center text-sm font-semibold text-emerald-700">{row.total_km}</td>
											<td className="px-4 py-3 text-center text-sm font-semibold text-rose-700">{row.total_calories}</td>
											<td className="px-4 py-3 text-center text-sm text-slate-600">{formatDuration(row.total_duration_sec)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				)}

				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-base font-bold text-slate-800">Detail Record Sesi Alora Bugar</h2>
							<p className="mt-0.5 text-xs text-slate-500">Lihat tanggal, olahraga, jarak, kalori, langkah, dan mode haid.</p>
						</div>
						<button
							type="button"
							onClick={handleExport}
							disabled={exporting || loading}
							className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
						>
							<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
							{exporting ? "Mengunduh..." : "Download Excel"}
						</button>
					</div>

					<div className="hidden overflow-x-auto md:block">
						<table className="min-w-full text-sm">
							<thead className="border-b border-slate-100 bg-slate-50">
								<tr>
									<SortTh col="ended_at" label="Tanggal" sort={sort} onSort={handleSort} />
									<SortTh col="employee_name" label="Karyawan" sort={sort} onSort={handleSort} />
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Jabatan</th>
									<SortTh col="sport" label="Sport" sort={sort} onSort={handleSort} />
									<SortTh col="duration_sec" label="Durasi" sort={sort} onSort={handleSort} />
									<SortTh col="distance_km" label="Jarak" sort={sort} onSort={handleSort} />
									<SortTh col="calories" label="Kalori" sort={sort} onSort={handleSort} />
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pace/Speed</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Steps</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Goal</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Haid</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={11} />)}
								{!loading && displayedRecords.length === 0 && (
									<tr>
										<td colSpan={11} className="px-4 py-14 text-center">
											<div className="flex flex-col items-center gap-2 text-slate-400">
												<HiOutlineHeart className="h-9 w-9 opacity-40" />
												<p className="text-sm">Data sesi Alora Bugar tidak ditemukan pada filter aktif.</p>
											</div>
										</td>
									</tr>
								)}
								{!loading &&
									displayedRecords.map((row) => (
										<tr key={row.session_id} className="align-top transition-colors hover:bg-blue-50/30">
											<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDateTime(row.ended_at)}</td>
											<td className="whitespace-nowrap px-4 py-3">
												<div className="text-xs font-bold text-slate-800">{row.employee_name}</div>
												<div className="text-[11px] text-slate-400">{row.employee_code || "-"}</div>
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{row.jabatan || "-"}</td>
											<td className="whitespace-nowrap px-4 py-3"><SportBadge sport={row.sport} /></td>
											<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">{formatDuration(row.duration_sec)}</td>
											<td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-700">{row.distance_km ?? 0} km</td>
											<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">{row.calories ?? 0}</td>
											<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{row.avg_pace_or_speed ?? "-"}</td>
											<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{row.sport === "run" ? (row.step_count ?? 0) : "-"}</td>
											<td className="whitespace-nowrap px-4 py-3 text-xs capitalize text-slate-600">{row.goal_focus || "-"}</td>
											<td className="whitespace-nowrap px-4 py-3"><HaidBadge active={row.haid_mode} /></td>
										</tr>
									))}
							</tbody>
						</table>
					</div>

					<div className="space-y-3 p-4 md:hidden">
						{loading && <p className="text-center text-sm text-slate-400">Memuat data...</p>}
						{!loading && displayedRecords.length === 0 && (
							<p className="py-8 text-center text-sm text-slate-400">Data sesi Alora Bugar tidak ditemukan.</p>
						)}
						{!loading &&
							displayedRecords.map((row) => (
								<article key={row.session_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-sm font-bold text-slate-800">{row.employee_name}</p>
											<p className="text-xs text-slate-400">{row.employee_code || "-"} · {row.jabatan || "-"}</p>
											<p className="mt-1 text-xs text-slate-500">{formatDateTime(row.ended_at)}</p>
										</div>
										<SportBadge sport={row.sport} />
									</div>
									<div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
										<div>
											<p className="font-semibold text-slate-400">Durasi</p>
											<p>{formatDuration(row.duration_sec)}</p>
										</div>
										<div>
											<p className="font-semibold text-slate-400">Jarak</p>
											<p>{row.distance_km ?? 0} km</p>
										</div>
										<div>
											<p className="font-semibold text-slate-400">Kalori</p>
											<p>{row.calories ?? 0}</p>
										</div>
										<div>
											<p className="font-semibold text-slate-400">Haid</p>
											<p>{row.haid_mode ? "Ya" : "Tidak"}</p>
										</div>
									</div>
								</article>
							))}
					</div>

					<PaginationBar pagination={pagination} onPage={handlePage} onLimitChange={handleLimitChange} loading={loading} />
				</section>
			</div>
		</main>
	);
}
