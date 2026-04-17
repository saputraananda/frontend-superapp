import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	HiOutlineAdjustmentsHorizontal,
	HiOutlineArrowLeft,
	HiOutlineArrowsUpDown,
	HiOutlineCalendarDays,
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineChevronUp,
	HiOutlineClock,
	HiOutlineDocumentCheck,
	HiOutlineExclamationTriangle,
	HiOutlineMagnifyingGlass,
	HiOutlineMapPin,
	HiOutlinePhoto,
	HiOutlineXMark,
} from "react-icons/hi2";
import { BASE_URL, api } from "../../lib/api";

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

function calcDuration(checkIn, checkOut) {
	if (!checkIn || !checkOut) return null;
	const diff = new Date(checkOut) - new Date(checkIn);
	if (diff <= 0) return null;
	const h = Math.floor(diff / 3_600_000);
	const m = Math.floor((diff % 3_600_000) / 60_000);
	return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function formatMinutesToHourMinute(totalMinutes) {
	const minutes = Math.max(Number(totalMinutes) || 0, 0);
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${h}j ${m}m`;
}

function generatePages(current, total) {
	if (total <= 1) return [];
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
	if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "...", current - 1, current, current + 1, "...", total];
}

function getCutoffRange(cutoffMonth, cutoffYear, cutoffStartDay) {
	const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
	const endDay = startDay - 1;

	const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
	const end = new Date(cutoffYear, cutoffMonth - 1, endDay);

	return {
		startDate: toDateInput(start),
		endDate: toDateInput(end),
	};
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

	const range = getCutoffRange(cutoffMonth, cutoffYear, startDay);
	return {
		cutoffMonth,
		cutoffYear,
		cutoffStartDay: startDay,
		...range,
	};
}

function toneClass(tone) {
	if (tone === "emerald") return "bg-emerald-50 border-emerald-100 text-emerald-700";
	if (tone === "amber") return "bg-amber-50 border-amber-100 text-amber-700";
	if (tone === "rose") return "bg-rose-50 border-rose-100 text-rose-700";
	return "bg-blue-50 border-blue-100 text-blue-700";
}

const SHIFT_STYLE = {
	pagi: "bg-sky-50 text-sky-700 border-sky-200",
	siang: "bg-amber-50 text-amber-700 border-amber-200",
	sore: "bg-orange-50 text-orange-700 border-orange-200",
	lembur: "bg-purple-50 text-purple-700 border-purple-200",
};

const SHIFT_ORDER = { pagi: 0, siang: 1, sore: 2, lembur: 3 };
const STATUS_ORDER = { "Belum check-in": 0, "Belum check-out": 1, "Foto belum lengkap": 2, Lengkap: 3 };

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
		<div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
					<p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
					<p className="mt-1 text-xs text-slate-500">{subtitle}</p>
				</div>
				<div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClass(tone))}>
					<Icon className="h-5 w-5" />
				</div>
			</div>
		</div>
	);
}

function ShiftBadge({ type }) {
	const style = SHIFT_STYLE[type] ?? "bg-slate-50 text-slate-600 border-slate-200";
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", style)}>
			{type}
		</span>
	);
}

function StatusBadge({ label }) {
	const map = {
		Lengkap: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: HiOutlineCheckCircle },
		"Belum check-out": { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: HiOutlineClock },
		"Belum check-in": { cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: HiOutlineExclamationTriangle },
		"Foto belum lengkap": { cls: "bg-orange-50 text-orange-700 border-orange-200", Icon: HiOutlinePhoto },
	};
	const { cls, Icon: BadgeIcon } = map[label] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: null };

	return (
		<span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap", cls)}>
			{BadgeIcon && <BadgeIcon className="h-3.5 w-3.5 shrink-0" />}
			{label ?? "-"}
		</span>
	);
}

function SortTh({ col, label, sort, onSort, className = "" }) {
	const active = sort.col === col;
	return (
		<th
			className={cn(
				"px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100",
				active ? "text-blue-600 bg-blue-50/60" : "text-slate-500",
				className,
			)}
			onClick={() => onSort(col)}
		>
			<div className="flex items-center gap-1">
				{label}
				{active ? (
					sort.dir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />
				) : (
					<HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />
				)}
			</div>
		</th>
	);
}

function SkeletonRow({ cols = 11 }) {
	return (
		<tr className="border-t border-slate-100 animate-pulse">
			{Array.from({ length: cols }).map((_, i) => (
				<td key={i} className="px-4 py-4">
					<div className={cn("h-3.5 rounded-md bg-slate-200", i <= 1 ? "w-24" : "w-14")} />
				</td>
			))}
		</tr>
	);
}

function PhotoThumb({ url, label, onOpen, className = "h-10 w-10" }) {
	return (
		<button
			type="button"
			onClick={() => onOpen(url, label)}
			className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:border-blue-300"
			title={`Lihat ${label}`}
		>
			<img
				src={url}
				alt={label}
				loading="lazy"
				className={cn("object-cover transition-transform duration-200 group-hover:scale-[1.04]", className)}
			/>
		</button>
	);
}

function PhotoViewerModal({ item, onClose }) {
	if (!item) return null;

	return (
		<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
				<button
					type="button"
					onClick={onClose}
					className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition hover:bg-white hover:text-slate-800"
					aria-label="Tutup preview foto"
				>
					<HiOutlineXMark className="h-5 w-5" />
				</button>

				<img src={item.url} alt={item.label} className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl object-contain shadow-2xl" />
			</div>
		</div>
	);
}

function MobileAttendanceCard({ row, onOpenPhoto }) {
	const duration = calcDuration(row.check_in_time, row.check_out_time);
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
			<div className="flex items-start justify-between gap-2">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm font-bold text-slate-800">{row.employee_name}</span>
						<ShiftBadge type={row.shift_type} />
					</div>
					<p className="mt-0.5 text-xs text-slate-400">{row.employee_code || "-"}</p>
					<p className="text-xs text-slate-400">{formatDateOnly(row.work_date)}</p>
				</div>
				<StatusBadge label={row.status_label} />
			</div>

			<div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
				<div>
					<p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">Absen In</p>
					<p className="text-slate-700">{formatDateTime(row.check_in_time)}</p>
					{row.check_in_photo_url && (
						<div className="mt-1.5 inline-flex items-center gap-1.5">
							<PhotoThumb
								url={row.check_in_photo_url}
								label={`Foto absen in ${row.employee_name}`}
								onOpen={onOpenPhoto}
								className="h-12 w-12"
							/>
							<span className="text-[11px] font-medium text-blue-600">Foto in</span>
						</div>
					)}
				</div>
				<div>
					<p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">Absen Out</p>
					<p className="text-slate-700">
						{row.check_out_time ? formatDateTime(row.check_out_time) : <span className="italic text-slate-400">belum</span>}
					</p>
					{row.check_out_photo_url && (
						<div className="mt-1.5 inline-flex items-center gap-1.5">
							<PhotoThumb
								url={row.check_out_photo_url}
								label={`Foto absen out ${row.employee_name}`}
								onOpen={onOpenPhoto}
								className="h-12 w-12"
							/>
							<span className="text-[11px] font-medium text-blue-600">Foto out</span>
						</div>
					)}
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
				{duration && (
					<span className="flex items-center gap-1">
						<HiOutlineClock className="h-3.5 w-3.5" />
						Durasi: <strong className="text-slate-700 ml-0.5">{duration}</strong>
					</span>
				)}
				{row.check_in_lat && (
					<a
						href={`https://www.google.com/maps?q=${row.check_in_lat},${row.check_in_lng}`}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-1 text-blue-600 hover:underline"
					>
						<HiOutlineMapPin className="h-3.5 w-3.5" /> Lokasi in
					</a>
				)}
				{row.check_out_lat && (
					<a
						href={`https://www.google.com/maps?q=${row.check_out_lat},${row.check_out_lng}`}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-1 text-blue-600 hover:underline"
					>
						<HiOutlineMapPin className="h-3.5 w-3.5" /> Lokasi out
					</a>
				)}
			</div>
		</div>
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
				<button
					type="button"
					onClick={() => onPage(1)}
					disabled={page <= 1 || loading}
					className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{"<<"}
				</button>
				<button
					type="button"
					onClick={() => onPage(page - 1)}
					disabled={page <= 1 || loading}
					className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
				>
					<HiOutlineChevronLeft className="h-3.5 w-3.5" />
				</button>

				{pages.map((p, i) =>
					p === "..." ? (
						<span key={`el-${i}`} className="flex h-7 w-6 items-center justify-center text-xs text-slate-400">
							...
						</span>
					) : (
						<button
							key={p}
							type="button"
							onClick={() => onPage(p)}
							disabled={loading}
							className={cn(
								"flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed",
								p === page
									? "border-blue-500 bg-blue-600 text-white shadow-sm"
									: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
							)}
						>
							{p}
						</button>
					),
				)}

				<button
					type="button"
					onClick={() => onPage(page + 1)}
					disabled={page >= totalPages || loading}
					className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
				>
					<HiOutlineChevronRight className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={() => onPage(totalPages)}
					disabled={page >= totalPages || loading}
					className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{">>"}
				</button>
			</div>
		</div>
	);
}

export default function AbsensiIKM() {
	const navigate = useNavigate();
	const todayStr = useMemo(() => toDateInput(new Date()), []);
	const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date(), 26), []);
	const cutoffStartDay = 26;

	const [periodMode, setPeriodMode] = useState("cutoff");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
	const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);

	const [filters, setFilters] = useState({
		shiftType: "",
		onlyIncomplete: false,
	});
	const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
	const [employeeOptions, setEmployeeOptions] = useState([]);
	const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
	const [employeeOptionSearch, setEmployeeOptionSearch] = useState("");
	const employeeDropdownRef = useRef(null);
	const fetchInFlightRef = useRef(false);
	const latestFetchRef = useRef(null);

	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [summary, setSummary] = useState(null);
	const [employeeSummary, setEmployeeSummary] = useState([]);
	const [employeeSummaryPage, setEmployeeSummaryPage] = useState(1);
	const [employeeSummaryLimit, setEmployeeSummaryLimit] = useState("5");
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [photoViewer, setPhotoViewer] = useState(null);

	const [statusFilter, setStatusFilter] = useState("");
	const [sort, setSort] = useState({ col: null, dir: "asc" });

	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
	}, []);

	const activePeriod = useMemo(() => {
		if (periodMode === "today") {
			return { startDate: todayStr, endDate: todayStr };
		}
		if (periodMode === "custom") {
			return { startDate: customStartDate || todayStr, endDate: customEndDate || customStartDate || todayStr };
		}
		return getCutoffRange(cutoffMonth, cutoffYear, cutoffStartDay);
	}, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear, cutoffStartDay]);

	const activePeriodLabel = useMemo(() => {
		if (periodMode === "today") return `Hari ini (${formatDateOnly(todayStr)})`;
		if (periodMode === "custom") return `Custom ${formatDateOnly(activePeriod.startDate)} - ${formatDateOnly(activePeriod.endDate)}`;
		const monthLabel = PERIOD_MONTHS.find((m) => m.value === cutoffMonth)?.label || `Bulan ${cutoffMonth}`;
		return `Cutoff ${monthLabel} ${cutoffYear} (${formatDateOnly(activePeriod.startDate)} - ${formatDateOnly(activePeriod.endDate)})`;
	}, [periodMode, todayStr, activePeriod.startDate, activePeriod.endDate, cutoffMonth, cutoffYear]);

	useEffect(() => {
		document.title = "Absensi IKM | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		if (!employeeDropdownOpen) return;

		const onPointerDown = (event) => {
			if (!employeeDropdownRef.current) return;
			if (!employeeDropdownRef.current.contains(event.target)) {
				setEmployeeDropdownOpen(false);
			}
		};

		window.addEventListener("mousedown", onPointerDown);
		window.addEventListener("touchstart", onPointerDown);
		return () => {
			window.removeEventListener("mousedown", onPointerDown);
			window.removeEventListener("touchstart", onPointerDown);
		};
	}, [employeeDropdownOpen]);

	const fetchAbsensi = useCallback(
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
				if (filters.shiftType) qs.set("shiftType", filters.shiftType);
				if (selectedEmployeeIds.length > 0) qs.set("employeeIds", selectedEmployeeIds.join(","));
				if (filters.onlyIncomplete) qs.set("onlyIncomplete", "1");

				const response = await api(`/ikm/absensi/shifts?${qs.toString()}`);
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
					setError(err.message || "Gagal mengambil data absensi IKM");
					setSummary(null);
					setEmployeeSummary([]);
					setRecords([]);
				}
			} finally {
				fetchInFlightRef.current = false;
				if (!silent) {
					setLoading(false);
				}
			}
		},
		[
			activePeriod.startDate,
			activePeriod.endDate,
			filters.shiftType,
			filters.onlyIncomplete,
			selectedEmployeeIds,
			pagination.page,
			pagination.limit,
		],
	);

	useEffect(() => {
		latestFetchRef.current = fetchAbsensi;
	}, [fetchAbsensi]);

	useEffect(() => {
		fetchAbsensi();
	}, [fetchAbsensi]);

	useEffect(() => {
		if (typeof window === "undefined" || typeof EventSource === "undefined") return;

		const streamUrl = BASE_URL ? `${BASE_URL}/ikm/absensi/stream` : "/ikm/absensi/stream";
		const stream = new EventSource(streamUrl, { withCredentials: true });

		const handleAttendanceUpdate = () => {
			if (document.hidden) return;
			latestFetchRef.current?.({ silent: true });
		};

		const handleVisibilityChange = () => {
			if (!document.hidden) {
				latestFetchRef.current?.({ silent: true });
			}
		};

		stream.addEventListener("attendance_update", handleAttendanceUpdate);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			stream.removeEventListener("attendance_update", handleAttendanceUpdate);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			stream.close();
		};
	}, []);

	useEffect(() => {
		if (!photoViewer) return;
		const onKeyDown = (e) => {
			if (e.key === "Escape") setPhotoViewer(null);
		};
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [photoViewer]);

	const displayedRecords = useMemo(() => {
		let result = records;
		if (statusFilter) {
			result = result.filter((r) => r.status_label === statusFilter);
		}
		if (!sort.col) return result;

		const dir = sort.dir === "asc" ? 1 : -1;
		return [...result].sort((a, b) => {
			if (sort.col === "employee_name") return String(a.employee_name || "").localeCompare(String(b.employee_name || "")) * dir;
			if (sort.col === "employee_id") return (Number(a.employee_id) - Number(b.employee_id)) * dir;
			if (sort.col === "shift_type") return ((SHIFT_ORDER[a.shift_type] ?? 9) - (SHIFT_ORDER[b.shift_type] ?? 9)) * dir;
			if (sort.col === "status_label") return ((STATUS_ORDER[a.status_label] ?? 9) - (STATUS_ORDER[b.status_label] ?? 9)) * dir;
			if (["work_date", "check_in_time", "check_out_time"].includes(sort.col)) {
				const ta = a[sort.col] ? new Date(a[sort.col]).getTime() : 0;
				const tb = b[sort.col] ? new Date(b[sort.col]).getTime() : 0;
				return (ta - tb) * dir;
			}
			return String(a[sort.col] ?? "").localeCompare(String(b[sort.col] ?? "")) * dir;
		});
	}, [records, statusFilter, sort]);

	const statusOptions = useMemo(() => [...new Set(records.map((r) => r.status_label).filter(Boolean))], [records]);
	const totalLembur = useMemo(
		() => records.filter((row) => String(row.shift_type || "").toLowerCase() === "lembur").length,
		[records],
	);
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

		const selectedNameMap = new Map(employeeOptions.map((item) => [Number(item.employee_id), item.employee_name || `ID ${item.employee_id}`]));
		const names = selectedEmployeeIds
			.slice(0, 2)
			.map((id) => selectedNameMap.get(Number(id)) || `ID ${id}`)
			.filter(Boolean);

		if (selectedEmployeeIds.length <= 2) return names.join(", ");
		return `${names.join(", ")} +${selectedEmployeeIds.length - 2} lainnya`;
	}, [selectedEmployeeIds, employeeOptions]);
	const allFilteredSelected =
		filteredEmployeeOptions.length > 0 && filteredEmployeeOptions.every((item) => selectedEmployeeSet.has(Number(item.employee_id)));
	const employeeSummaryPerPage = useMemo(() => {
		if (employeeSummaryLimit === "all") return Math.max(employeeSummary.length, 1);
		const parsed = Number(employeeSummaryLimit);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
	}, [employeeSummaryLimit, employeeSummary.length]);
	const employeeSummaryTotalPages = useMemo(() => {
		if (employeeSummary.length === 0) return 1;
		if (employeeSummaryLimit === "all") return 1;
		return Math.max(1, Math.ceil(employeeSummary.length / employeeSummaryPerPage));
	}, [employeeSummary.length, employeeSummaryLimit, employeeSummaryPerPage]);
	const paginatedEmployeeSummary = useMemo(() => {
		if (employeeSummaryLimit === "all") return employeeSummary;
		const startIdx = (employeeSummaryPage - 1) * employeeSummaryPerPage;
		return employeeSummary.slice(startIdx, startIdx + employeeSummaryPerPage);
	}, [employeeSummary, employeeSummaryLimit, employeeSummaryPage, employeeSummaryPerPage]);
	const employeeSummaryVisibleFrom = employeeSummary.length === 0 ? 0 : (employeeSummaryPage - 1) * employeeSummaryPerPage + 1;
	const employeeSummaryVisibleTo =
		employeeSummary.length === 0
			? 0
			: employeeSummaryLimit === "all"
				? employeeSummary.length
				: Math.min(employeeSummaryPage * employeeSummaryPerPage, employeeSummary.length);

	useEffect(() => {
		setEmployeeSummaryPage((prev) => Math.max(1, Math.min(prev, employeeSummaryTotalPages)));
	}, [employeeSummaryTotalPages]);

	const resetFilters = () => {
		const resetCutoff = getDefaultCutoffSelection(new Date(), 26);
		setPeriodMode("cutoff");
		setCutoffMonth(resetCutoff.cutoffMonth);
		setCutoffYear(resetCutoff.cutoffYear);
		setCustomStartDate(resetCutoff.startDate);
		setCustomEndDate(resetCutoff.endDate);
		setFilters({ shiftType: "", onlyIncomplete: false });
		setSelectedEmployeeIds([]);
		setEmployeeOptionSearch("");
		setEmployeeDropdownOpen(false);
		setPagination((prev) => ({ ...prev, page: 1 }));
		setEmployeeSummaryPage(1);
		setEmployeeSummaryLimit("5");
		setStatusFilter("");
		setSort({ col: null, dir: "asc" });
		setError("");
	};

	const toggleEmployeeSelection = (employeeId) => {
		setSelectedEmployeeIds((prev) => {
			const id = Number(employeeId);
			if (prev.includes(id)) {
				return prev.filter((item) => item !== id);
			}
			return [...prev, id];
		});
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const toggleAllFilteredEmployees = () => {
		const ids = filteredEmployeeOptions.map((item) => Number(item.employee_id));
		setSelectedEmployeeIds((prev) => {
			if (allFilteredSelected) {
				return prev.filter((id) => !ids.includes(id));
			}
			return [...new Set([...prev, ...ids])];
		});
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const handleSort = (col) =>
		setSort((prev) =>
			prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" },
		);

	const handlePage = (p) =>
		setPagination((prev) => ({ ...prev, page: Math.max(1, Math.min(p, prev.totalPages)) }));

	const handleLimitChange = (newLimit) =>
		setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));

	const handleEmployeeSummaryLimitChange = (value) => {
		setEmployeeSummaryLimit(value);
		setEmployeeSummaryPage(1);
	};

	const handleEmployeeSummaryPage = (nextPage) => {
		setEmployeeSummaryPage(Math.max(1, Math.min(nextPage, employeeSummaryTotalPages)));
	};

	return (
		<>
			<main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
				<div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">
					<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 p-5 shadow-sm sm:p-6">
						<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
						<div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="relative max-w-3xl">
								<button
									type="button"
									onClick={() => navigate("/portal")}
									className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
								>
									<HiOutlineArrowLeft className="h-4 w-4" />
									Kembali ke Portal
								</button>

								<h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Dashboard Absensi IKM</h1>
								<p className="mt-2 text-sm text-white/80 sm:text-base">
									Pantau absensi karyawan per periode cutoff.
								</p>
								<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
									<HiOutlineCalendarDays className="h-4 w-4" />
									{activePeriodLabel}
								</div>
							</div>
						</div>
					</section>

					{error && (
						<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
					)}

					<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
						<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2">
								<div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
									<HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
								</div>
								<div>
									<h2 className="text-base font-bold text-slate-800">Filter Periode & Data</h2>
									<p className="text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah. Data update otomatis saat ada absen baru.</p>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
										<HiOutlineChevronDown
											className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", employeeDropdownOpen ? "rotate-180" : "")}
										/>
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
																<label
																	key={id}
																	className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
																>
																	<input
																		type="checkbox"
																		checked={checked}
																		onChange={() => toggleEmployeeSelection(id)}
																		className="mt-0.5 h-4 w-4 rounded border-slate-300"
																	/>
																	<span className="min-w-0">
																		<span className="block truncate font-medium text-slate-700">{item.employee_name || `ID ${id}`}</span>
																		<span className="block truncate text-[11px] text-slate-400">
																			{item.employee_code || "Belum ada NIK"}
																		</span>
																	</span>
																</label>
															);
														})}
													</div>
												)}
											</div>

											<div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-2">
												<button
													type="button"
													onClick={toggleAllFilteredEmployees}
													className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
												>
													{allFilteredSelected ? "Batal pilih semua" : "Pilih semua hasil"}
												</button>
												<button
													type="button"
													onClick={() => setEmployeeDropdownOpen(false)}
													className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
												>
													Tutup
												</button>
											</div>
										</div>
									)}
								</div>
							</div>

							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Shift</span>
								<select
									value={filters.shiftType}
									onChange={(e) => {
										setFilters((prev) => ({ ...prev, shiftType: e.target.value }));
										setPagination((prev) => ({ ...prev, page: 1 }));
									}}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									<option value="">Semua Shift</option>
									<option value="pagi">Pagi</option>
									<option value="siang">Siang</option>
									<option value="sore">Sore</option>
									<option value="lembur">Lembur</option>
								</select>
							</label>
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
											<option key={month.value} value={month.value}>
												{month.label}
											</option>
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
											<option key={year} value={year}>
												{year}
											</option>
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
										className="w-full rounded-xl border border-[#D6F0F7] bg-[#F8FCFE] px-3 py-2.5 text-sm outline-none focus:border-[#3FADD1] focus:ring-2 focus:ring-[#3FADD1]/25"
									/>
								</label>
							</div>
						)}

						<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
								<input
									type="checkbox"
									checked={filters.onlyIncomplete}
									onChange={(e) => {
										setFilters((prev) => ({ ...prev, onlyIncomplete: e.target.checked }));
										setPagination((prev) => ({ ...prev, page: 1 }));
									}}
									className="h-4 w-4"
								/>
								Hanya data belum lengkap
							</label>

							<div className="inline-flex flex-wrap items-center gap-2 self-end">
								<button
									type="button"
									onClick={resetFilters}
									className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
								>
									Reset
								</button>
							</div>
						</div>

						<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
							Periode aktif: <strong>{formatDateOnly(activePeriod.startDate)}</strong> sampai <strong>{formatDateOnly(activePeriod.endDate)}</strong>
						</div>
					</section>

					<section className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<StatCard
							title="Total Absen"
							value={summary?.totalRecords ?? 0}
							subtitle="Total record absensi pada periode aktif"
							tone="blue"
							Icon={HiOutlineDocumentCheck}
						/>
						<StatCard
							title="Total Sakit"
							value={0}
							subtitle="Dummy sementara (menunggu data final)"
							tone="rose"
							Icon={HiOutlineExclamationTriangle}
						/>
						<StatCard
							title="Total Izin"
							value={0}
							subtitle="Dummy sementara (menunggu data final)"
							tone="amber"
							Icon={HiOutlineCalendarDays}
						/>
						<StatCard
							title="Total Lembur"
							value={totalLembur}
							subtitle="Akumulasi shift lembur pada data aktif"
							tone="blue"
							Icon={HiOutlineClock}
						/>
					</section>

					<section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
						<div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-base font-bold text-slate-800">Ringkasan Per Karyawan</h2>
								<p className="mt-0.5 text-xs text-slate-500">Ringkasan performa kehadiran pada periode aktif.</p>
							</div>
							<div className="flex flex-wrap items-center gap-2 sm:justify-end">
								<label className="inline-flex items-center gap-2 text-xs text-slate-500">
									Tampil:
									<select
										value={employeeSummaryLimit}
										onChange={(e) => handleEmployeeSummaryLimitChange(e.target.value)}
										className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
									>
										<option value="5">5</option>
										<option value="10">10</option>
										<option value="25">25</option>
										<option value="50">50</option>
										<option value="all">All</option>
									</select>
								</label>
								<div className="inline-flex items-center gap-1">
									<button
										type="button"
										onClick={() => handleEmployeeSummaryPage(employeeSummaryPage - 1)}
										disabled={employeeSummaryPage <= 1}
										className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<HiOutlineChevronLeft className="h-3.5 w-3.5" />
									</button>
									<span className="min-w-[74px] text-center text-xs font-semibold text-slate-600">
										{employeeSummaryPage}/{employeeSummaryTotalPages}
									</span>
									<button
										type="button"
										onClick={() => handleEmployeeSummaryPage(employeeSummaryPage + 1)}
										disabled={employeeSummaryPage >= employeeSummaryTotalPages}
										className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<HiOutlineChevronRight className="h-3.5 w-3.5" />
									</button>
								</div>
							</div>
						</div>

						<div className="overflow-x-auto pb-1">
							<table className="min-w-[860px] w-full table-fixed text-sm">
								<thead className="border-b border-slate-100 bg-slate-50">
									<tr>
										<th className="w-[34%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Karyawan</th>
										<th className="w-[18%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Jabatan</th>
										<th className="w-[18%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Total Jam Absen</th>
										<th className="w-[18%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Total Jam Lembur</th>
										<th className="w-[12%] px-4 py-3 pr-8 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Lengkap</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{employeeSummary.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
												Belum ada data ringkasan karyawan untuk periode/filter ini.
											</td>
										</tr>
									) : (
										paginatedEmployeeSummary.map((row) => (
											<tr key={row.employee_id} className="hover:bg-blue-50/30">
												<td className="px-4 py-3">
													<div className="text-sm font-semibold text-slate-800">{row.employee_name}</div>
													<div className="text-xs text-slate-400">{row.employee_code || "-"}</div>
												</td>
												<td className="px-4 py-3 text-center text-xs text-slate-600">{row.jabatan || "-"}</td>
												<td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{formatMinutesToHourMinute(row.total_absen_minutes)}</td>
												<td className="px-4 py-3 text-center text-sm font-semibold text-indigo-700">{formatMinutesToHourMinute(row.total_lembur_minutes)}</td>
												<td className="px-4 py-3 pr-8 text-center text-sm font-semibold text-emerald-700">{row.total_complete}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						<div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
							<span>
								Menampilkan <strong className="text-slate-700">{employeeSummaryVisibleFrom}-{employeeSummaryVisibleTo}</strong> dari <strong className="text-slate-700">{employeeSummary.length}</strong> karyawan
							</span>
							<span className="text-slate-400">Geser horizontal jika kolom belum terlihat semua.</span>
						</div>
					</section>

					<section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
						<div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-base font-bold text-slate-800">Detail Riwayat Absensi</h2>
								<p className="mt-0.5 text-xs text-slate-500">
									Lihat detail tanggal masuk, jam absen in/absen out, bukti foto, dan status kelengkapan.
								</p>
							</div>
							<div className="flex items-center gap-2">
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
								>
									<option value="">Semua Status</option>
									{statusOptions.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
								{statusFilter && (
									<button
										type="button"
										onClick={() => setStatusFilter("")}
										className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
									>
										<HiOutlineXMark className="h-3.5 w-3.5" />
										Bersihkan
									</button>
								)}
							</div>
						</div>

						<div className="hidden md:block overflow-x-auto">
							<table className="min-w-full text-sm">
								<thead className="bg-slate-50 border-b border-slate-100">
									<tr>
										<SortTh col="work_date" label="Tanggal" sort={sort} onSort={handleSort} />
										<SortTh col="employee_name" label="Karyawan" sort={sort} onSort={handleSort} />
										<SortTh col="shift_type" label="Shift" sort={sort} onSort={handleSort} />
										<SortTh col="check_in_time" label="Absen In" sort={sort} onSort={handleSort} />
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Foto In</th>
										<SortTh col="check_out_time" label="Absen Out" sort={sort} onSort={handleSort} />
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Foto Out</th>
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Durasi</th>
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Koordinat</th>
										<SortTh col="status_label" label="Status" sort={sort} onSort={handleSort} />
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={10} />)}

									{!loading && displayedRecords.length === 0 && (
										<tr>
											<td colSpan={10} className="px-4 py-14 text-center">
												<div className="flex flex-col items-center gap-2 text-slate-400">
													<HiOutlineDocumentCheck className="h-9 w-9 opacity-40" />
													<p className="text-sm">Data absensi tidak ditemukan pada filter aktif.</p>
												</div>
											</td>
										</tr>
									)}

									{!loading &&
										displayedRecords.map((row) => {
											const duration = calcDuration(row.check_in_time, row.check_out_time);
											return (
												<tr key={row.shift_record_id} className="align-top transition-colors hover:bg-blue-50/30">
													<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDateOnly(row.work_date)}</td>
													<td className="whitespace-nowrap px-4 py-3">
														<div className="text-xs font-bold text-slate-800">{row.employee_name}</div>
														<div className="text-[11px] text-slate-400">{row.employee_code || "-"}</div>
													</td>
													<td className="whitespace-nowrap px-4 py-3">
														<ShiftBadge type={row.shift_type} />
													</td>
													<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">{formatDateTime(row.check_in_time)}</td>
													<td className="whitespace-nowrap px-4 py-3">
														{row.check_in_photo_url ? (
															<PhotoThumb
																url={row.check_in_photo_url}
																label={`Foto absen in ${row.employee_name}`}
																onOpen={(url, label) => setPhotoViewer({ url, label })}
															/>
														) : (
															<span className="text-slate-300 text-xs">-</span>
														)}
													</td>
													<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">{formatDateTime(row.check_out_time)}</td>
													<td className="whitespace-nowrap px-4 py-3">
														{row.check_out_photo_url ? (
															<PhotoThumb
																url={row.check_out_photo_url}
																label={`Foto absen out ${row.employee_name}`}
																onOpen={(url, label) => setPhotoViewer({ url, label })}
															/>
														) : (
															<span className="text-slate-300 text-xs">-</span>
														)}
													</td>
													<td className="whitespace-nowrap px-4 py-3">
														{duration ? (
															<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
																<HiOutlineClock className="h-3 w-3" /> {duration}
															</span>
														) : (
															<span className="text-slate-300 text-xs">-</span>
														)}
													</td>
													<td className="px-4 py-3 text-xs">
														<div className="flex flex-col gap-0.5">
															{row.check_in_lat ? (
																<a
																	href={`https://www.google.com/maps?q=${row.check_in_lat},${row.check_in_lng}`}
																	target="_blank"
																	rel="noreferrer"
																	className="flex items-center gap-1 text-blue-600 hover:underline"
																>
																	<HiOutlineMapPin className="h-3 w-3 shrink-0" />
																	<span>In</span>
																</a>
															) : (
																<span className="text-slate-300">-</span>
															)}
															{row.check_out_lat && (
																<a
																	href={`https://www.google.com/maps?q=${row.check_out_lat},${row.check_out_lng}`}
																	target="_blank"
																	rel="noreferrer"
																	className="flex items-center gap-1 text-blue-600 hover:underline"
																>
																	<HiOutlineMapPin className="h-3 w-3 shrink-0" />
																	<span>Out</span>
																</a>
															)}
														</div>
													</td>
													<td className="whitespace-nowrap px-4 py-3">
														<StatusBadge label={row.status_label} />
													</td>
												</tr>
											);
										})}
								</tbody>
							</table>
						</div>

						<div className="md:hidden">
							{loading ? (
								<div className="space-y-3 p-4">
									{Array.from({ length: 3 }).map((_, i) => (
										<div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
											<div className="flex justify-between">
												<div className="h-4 w-28 rounded-md bg-slate-200" />
												<div className="h-4 w-20 rounded-md bg-slate-200" />
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div className="h-14 rounded-lg bg-slate-200" />
												<div className="h-14 rounded-lg bg-slate-200" />
											</div>
										</div>
									))}
								</div>
							) : displayedRecords.length === 0 ? (
								<div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-400">
									<HiOutlineDocumentCheck className="h-8 w-8 opacity-40" />
									<p>Data absensi tidak ditemukan.</p>
								</div>
							) : (
								<div className="grid gap-3 p-4 sm:grid-cols-2">
									{displayedRecords.map((row) => (
										<MobileAttendanceCard key={row.shift_record_id} row={row} onOpenPhoto={(url, label) => setPhotoViewer({ url, label })} />
									))}
								</div>
							)}
						</div>

						<PaginationBar pagination={pagination} onPage={handlePage} onLimitChange={handleLimitChange} loading={loading} />
					</section>
				</div>
			</main>

			<PhotoViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
		</>
	);
}