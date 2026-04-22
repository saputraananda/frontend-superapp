import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
	HiOutlineArrowLeft,
	HiOutlineCalendarDays,
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineExclamationTriangle,
	HiOutlineMagnifyingGlass,
	HiOutlinePhoto,
	HiOutlineXMark,
	HiOutlineClipboardDocumentList,
	HiOutlineNoSymbol,
	HiOutlineFunnel,
	HiOutlineArrowsUpDown,
	HiOutlineChevronUp,
	HiOutlineDocumentText,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

// ─── Utility ──────────────────────────────────────────────────────────────────
function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function getCurrentUserDisplayName() {
	try {
		const raw = localStorage.getItem("user");
		if (!raw) return "";
		const parsed = JSON.parse(raw);
		const userData = parsed?.user ?? parsed;
		return String(
			userData?.employee?.full_name || userData?.name || userData?.username || ""
		)
			.trim()
			.slice(0, 255);
	} catch {
		return "";
	}
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
		day: "2-digit", month: "short", year: "numeric",
		hour: "2-digit", minute: "2-digit",
	}).format(date);
}

function generatePages(current, total) {
	if (total <= 1) return [1];
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
	if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "...", current - 1, current, current + 1, "...", total];
}

// ─── Cutoff period helpers ────────────────────────────────────────────────────
function toDateInput(date) {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getCutoffRange(cutoffMonth, cutoffYear) {
	// e.g. cutoffMonth=4 (April), cutoffYear=2026 → 26 Mar – 25 Apr
	const start = new Date(cutoffYear, cutoffMonth - 2, 26);
	const end = new Date(cutoffYear, cutoffMonth - 1, 25);
	return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

function getDefaultCutoff(now = new Date()) {
	let cutoffMonth = now.getMonth() + 1;
	let cutoffYear = now.getFullYear();
	// If today > 25, the active cutoff is next month's label
	if (now.getDate() > 25) {
		cutoffMonth += 1;
		if (cutoffMonth > 12) { cutoffMonth = 1; cutoffYear += 1; }
	}
	return { cutoffMonth, cutoffYear, ...getCutoffRange(cutoffMonth, cutoffYear) };
}

const PERIOD_MONTHS = [
	{ value: 1, label: "Januari" }, { value: 2, label: "Februari" },
	{ value: 3, label: "Maret" }, { value: 4, label: "April" },
	{ value: 5, label: "Mei" }, { value: 6, label: "Juni" },
	{ value: 7, label: "Juli" }, { value: 8, label: "Agustus" },
	{ value: 9, label: "September" }, { value: 10, label: "Oktober" },
	{ value: 11, label: "November" }, { value: 12, label: "Desember" },
];

// ─── Leave type & status meta ─────────────────────────────────────────────────
const LEAVE_TYPE_META = {
	izin: { label: "Izin", cls: "bg-blue-50 text-blue-700 border-blue-200" },
	sakit: { label: "Sakit", cls: "bg-rose-50 text-rose-700 border-rose-200" },
	cuti: { label: "Cuti", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const DURATION_TYPE_META = {
	full_day: "Seharian",
	half_day_morning: "½ Hari Pagi",
	half_day_afternoon: "½ Hari Siang",
};

const STATUS_META = {
	pengajuan: { label: "Pengajuan", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: HiOutlineCalendarDays },
	disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: HiOutlineCheckCircle },
	ditolak: { label: "Ditolak", cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: HiOutlineNoSymbol },
};

// ─── Small components ─────────────────────────────────────────────────────────
function LeaveTypeBadge({ type }) {
	const meta = LEAVE_TYPE_META[type] ?? { label: type, cls: "bg-slate-50 text-slate-600 border-slate-200" };
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", meta.cls)}>
			{meta.label}
		</span>
	);
}

function StatusBadge({ status }) {
	const meta = STATUS_META[status] ?? { label: status, cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: null };
	const { label, cls, Icon: BadgeIcon } = meta;
	return (
		<span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap", cls)}>
			{BadgeIcon && <BadgeIcon className="h-3.5 w-3.5 shrink-0" />}
			{label}
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

function SkeletonRow({ cols = 8 }) {
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

// ─── Photo viewer modal ───────────────────────────────────────────────────────
function PhotoViewerModal({ item, onClose }) {
	if (!item) return null;
	return (
		<div
			className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
				<button
					type="button"
					onClick={onClose}
					className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition hover:bg-white hover:text-slate-800"
					aria-label="Tutup foto"
				>
					<HiOutlineXMark className="h-5 w-5" />
				</button>
				<img src={item.url} alt={item.label} className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl object-contain shadow-2xl" />
			</div>
		</div>
	);
}

// ─── Approve / reject modal ───────────────────────────────────────────────────
function ActionModal({ mode, item, onClose, onConfirm, busy }) {
	const [note, setNote] = useState("");

	if (!item || !mode) return null;

	const isReject = mode === "reject";

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<h2 className="text-base font-bold text-slate-800">
							{isReject ? "Tolak Pengajuan" : "Setujui Pengajuan"}
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							{item.employee_name} — <strong>{LEAVE_TYPE_META[item.leave_type]?.label ?? item.leave_type}</strong>
						</p>
						<p className="text-xs text-slate-400">
							{formatDateOnly(item.start_date)}
							{item.end_date !== item.start_date ? ` s/d ${formatDateOnly(item.end_date)}` : ""}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
					>
						<HiOutlineXMark className="h-4 w-4" />
					</button>
				</div>

				{isReject && (
					<div className="mb-5">
						<label className="mb-1.5 block text-xs font-semibold text-slate-500">
							Catatan Penolakan <span className="font-normal text-slate-400">(opsional)</span>
						</label>
						<textarea
							rows={3}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="Tuliskan alasan penolakan..."
							className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 resize-none"
							maxLength={1000}
						/>
					</div>
				)}

				{!isReject && (
					<p className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
						Pengajuan ini akan ditandai sebagai <strong>disetujui</strong>. Yakin ingin melanjutkan?
					</p>
				)}

				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						disabled={busy}
						className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
					>
						Batal
					</button>
					<button
						type="button"
						disabled={busy}
						onClick={() => onConfirm(note)}
						className={cn(
							"rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60",
							isReject
								? "bg-rose-600 hover:bg-rose-700"
								: "bg-emerald-600 hover:bg-emerald-700",
						)}
					>
						{busy ? "Memproses..." : isReject ? "Tolak" : "Setujui"}
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Detail drawer / card ─────────────────────────────────────────────────────
function LeaveDetailModal({ item, onClose, onApprove, onReject }) {
	if (!item) return null;

	return (
		<div
			className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-start justify-between gap-3 bg-slate-50 border-b border-slate-100 px-6 py-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Detail Pengajuan #{item.id}</p>
						<h2 className="mt-1 text-lg font-bold text-slate-800">{item.employee_name}</h2>
						<p className="text-xs text-slate-400">{item.jabatan}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white"
					>
						<HiOutlineXMark className="h-4 w-4" />
					</button>
				</div>

				{/* Body */}
				<div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
					<div className="grid grid-cols-2 gap-3">
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tipe</p>
							<div className="mt-1.5"><LeaveTypeBadge type={item.leave_type} /></div>
						</div>
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Durasi</p>
							<p className="mt-1.5 text-sm font-semibold text-slate-700">
								{DURATION_TYPE_META[item.duration_type] ?? item.duration_type}
							</p>
						</div>
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Mulai</p>
							<p className="mt-1 text-sm font-semibold text-slate-700">{formatDateOnly(item.start_date)}</p>
						</div>
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Selesai</p>
							<p className="mt-1 text-sm font-semibold text-slate-700">{formatDateOnly(item.end_date)}</p>
						</div>
					</div>

					<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Alasan</p>
						<p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap">{item.reason || "-"}</p>
					</div>

					<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
						<div className="mt-1.5"><StatusBadge status={item.status} /></div>
					</div>

					{item.status === "ditolak" && item.rejection_note && (
						<div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Catatan Penolakan</p>
							<p className="mt-1.5 text-sm text-rose-700 whitespace-pre-wrap">{item.rejection_note}</p>
						</div>
					)}

					{item.approved_by && (
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
							<span className="font-semibold text-slate-600">Diproses oleh:</span> {item.approved_by}
							{item.approved_at && ` · ${formatDateTime(item.approved_at)}`}
						</div>
					)}

					{item.doctor_note_url && (
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
							<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Surat Keterangan Dokter</p>
							<a
								href={item.doctor_note_url}
								target="_blank"
								rel="noreferrer"
								className="group inline-flex overflow-hidden rounded-xl border border-slate-200"
							>
								<img
									src={item.doctor_note_url}
									alt="Surat Dokter"
									loading="lazy"
									className="max-h-48 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
									onError={(e) => {
										e.currentTarget.style.display = "none";
										e.currentTarget.nextSibling.style.display = "flex";
									}}
								/>
								<span
									className="hidden items-center gap-2 px-4 py-3 text-sm text-blue-600 hover:underline"
								>
									<HiOutlineDocumentText className="h-5 w-5" />
									Buka lampiran dokter
								</span>
							</a>
						</div>
					)}

					<p className="text-[11px] text-slate-400">
						Diajukan: {formatDateTime(item.created_at)}
					</p>
				</div>

				{/* Footer actions */}
				{item.status === "pengajuan" && (
					<div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
						<button
							type="button"
							onClick={() => onReject(item)}
							className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
						>
							<HiOutlineNoSymbol className="h-4 w-4" />
							Tolak
						</button>
						<button
							type="button"
							onClick={() => onApprove(item)}
							className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
						>
							<HiOutlineCheckCircle className="h-4 w-4" />
							Setujui
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

// ─── Mobile card ──────────────────────────────────────────────────────────────
function MobileLeaveCard({ row, onDetail }) {
	return (
		<div
			className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 cursor-pointer hover:border-blue-200 hover:shadow-md transition"
			onClick={() => onDetail(row)}
		>
			<div className="flex items-start justify-between gap-2">
				<div>
					<p className="text-sm font-bold text-slate-800">{row.employee_name}</p>
					<p className="text-xs text-slate-400">{row.jabatan}</p>
				</div>
				<StatusBadge status={row.status} />
			</div>

			<div className="flex flex-wrap gap-2">
				<LeaveTypeBadge type={row.leave_type} />
				<span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
					{DURATION_TYPE_META[row.duration_type] ?? row.duration_type}
				</span>
				{row.doctor_note_url && (
					<span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs text-rose-600">
						<HiOutlineDocumentText className="h-3.5 w-3.5" />
						Lampiran
					</span>
				)}
			</div>

			<div className="text-xs text-slate-500">
				<span className="font-semibold text-slate-600">{formatDateOnly(row.start_date)}</span>
				{row.end_date !== row.start_date && (
					<> – <span className="font-semibold text-slate-600">{formatDateOnly(row.end_date)}</span></>
				)}
			</div>

			<p className="text-xs text-slate-500 line-clamp-2">{row.reason || "-"}</p>
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PerizinanIKM() {
	const location = useLocation();
	const defaultCutoff = useMemo(() => getDefaultCutoff(), []);
	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, i) => base - 3 + i);
	}, []);

	// If navigated from absensi stat card, pick up pre-set filters from location.state
	const initLeaveType = location.state?.leaveType ?? "";
	const initCutoff = useMemo(() => {
		if (location.state?.startDate) {
			// derive cutoff month/year from the startDate passed
			const d = new Date(location.state.startDate);
			if (!Number.isNaN(d.getTime())) {
				// cutoff label month = end_date month (26 prev → 25 curr)
				const endDate = new Date(location.state.endDate || location.state.startDate);
				return { cutoffMonth: endDate.getMonth() + 1, cutoffYear: endDate.getFullYear() };
			}
		}
		return { cutoffMonth: defaultCutoff.cutoffMonth, cutoffYear: defaultCutoff.cutoffYear };
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const [records, setRecords] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [statusCounts, setStatusCounts] = useState({ pengajuan: 0, disetujui: 0, ditolak: 0 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [filterStatus, setFilterStatus] = useState("pengajuan");
	const [filterLeaveType, setFilterLeaveType] = useState(initLeaveType);

	// Cutoff period selector
	const [cutoffMonth, setCutoffMonth] = useState(initCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(initCutoff.cutoffYear);
	const cutoffRange = useMemo(() => getCutoffRange(cutoffMonth, cutoffYear), [cutoffMonth, cutoffYear]);
	const filterStartDate = cutoffRange.startDate;
	const filterEndDate = cutoffRange.endDate;

	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");

	const [sort, setSort] = useState({ col: "created_at", dir: "desc" });
	const [detailItem, setDetailItem] = useState(null);
	const [actionModal, setActionModal] = useState({ mode: null, item: null });
	const [actionBusy, setActionBusy] = useState(false);
	const [photoViewer, setPhotoViewer] = useState(null);
	const [toast, setToast] = useState(null);

	const fetchInFlight = useRef(false);

	// Show toast helper
	const showToast = useCallback((message, type = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3500);
	}, []);

	const fetchLeaves = useCallback(
		async ({ silent = false } = {}) => {
			if (fetchInFlight.current) return;
			fetchInFlight.current = true;
			if (!silent) { setLoading(true); setError(""); }

			try {
				const qs = new URLSearchParams();
				qs.set("page", String(pagination.page));
				qs.set("limit", String(pagination.limit));
				if (filterStatus) qs.set("status", filterStatus);
				if (filterLeaveType) qs.set("leaveType", filterLeaveType);
				if (filterStartDate) qs.set("startDate", filterStartDate);
				if (filterEndDate) qs.set("endDate", filterEndDate);
				if (search) qs.set("search", search);

				const data = await api(`/ikm/leaves?${qs.toString()}`);
				setRecords(data.records ?? []);
				setPagination((prev) => ({
					...prev,
					total: data.pagination?.total ?? 0,
					totalPages: data.pagination?.totalPages ?? 1,
				}));
				setStatusCounts(data.statusCounts ?? { pengajuan: 0, disetujui: 0, ditolak: 0 });
			} catch (err) {
				if (!silent) setError(err.message || "Gagal mengambil data perizinan");
			} finally {
				fetchInFlight.current = false;
				if (!silent) setLoading(false);
			}
		},
		[pagination.page, pagination.limit, filterStatus, filterLeaveType, filterStartDate, filterEndDate, search]
	);

	useEffect(() => {
		document.title = "Cuti & Perizinan IKM | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		fetchLeaves();
	}, [fetchLeaves]);

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

	// Sorting on client side (records already fetched)
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

	const handleApprove = async (_note) => {
		if (!actionModal.item) return;
		setActionBusy(true);
		try {
			await api(`/ikm/leaves/${actionModal.item.id}/approve`, {
				method: "PUT",
				body: JSON.stringify({ approved_by: getCurrentUserDisplayName() }),
			});
			showToast("Pengajuan berhasil disetujui");
			setActionModal({ mode: null, item: null });
			setDetailItem(null);
			fetchLeaves({ silent: true });
		} catch (err) {
			showToast(err.message || "Gagal menyetujui", "error");
		} finally {
			setActionBusy(false);
		}
	};

	const handleReject = async (note) => {
		if (!actionModal.item) return;
		setActionBusy(true);
		try {
			await api(`/ikm/leaves/${actionModal.item.id}/reject`, {
				method: "PUT",
				body: JSON.stringify({
					rejection_note: note,
					approved_by: getCurrentUserDisplayName(),
				}),
			});
			showToast("Pengajuan berhasil ditolak");
			setActionModal({ mode: null, item: null });
			setDetailItem(null);
			fetchLeaves({ silent: true });
		} catch (err) {
			showToast(err.message || "Gagal menolak", "error");
		} finally {
			setActionBusy(false);
		}
	};

	const openApprove = (item) => {
		setDetailItem(null);
		setActionModal({ mode: "approve", item });
	};

	const openReject = (item) => {
		setDetailItem(null);
		setActionModal({ mode: "reject", item });
	};

	const pages = generatePages(pagination.page, pagination.totalPages);
	const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
	const to = Math.min(pagination.page * pagination.limit, pagination.total);

	return (
		<>
			{/* Toast */}
			{toast && (
				<div
					className={cn(
						"fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
						toast.type === "error"
							? "border-rose-200 bg-rose-50 text-rose-700"
							: "border-emerald-200 bg-emerald-50 text-emerald-700",
					)}
				>
					{toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
					{toast.message}
				</div>
			)}

			<PhotoViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
			<LeaveDetailModal
				item={detailItem}
				onClose={() => setDetailItem(null)}
				onApprove={openApprove}
				onReject={openReject}
			/>
			<ActionModal
				mode={actionModal.mode}
				item={actionModal.item}
				onClose={() => setActionModal({ mode: null, item: null })}
				onConfirm={actionModal.mode === "approve" ? handleApprove : handleReject}
				busy={actionBusy}
			/>

			<main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
				<div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

					{/* ── Header ─────────────────────────────────────────────────── */}
					<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-700 p-5 shadow-sm sm:p-6">
						<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
						<div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-violet-300/10 blur-3xl" />

						<div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="max-w-2xl">
								<h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Cuti &amp; Perizinan IKM</h1>
								<p className="mt-2 text-sm text-white/80">
									Kelola dan pantau pengajuan izin, sakit, dan cuti karyawan.
								</p>
							</div>

							{/* Summary pills */}
							<div className="relative flex flex-wrap gap-2 sm:mt-2">
								{[
									{ key: "pengajuan", label: "Menunggu", color: "bg-amber-400/20 text-amber-100 border-amber-400/30" },
									{ key: "disetujui", label: "Disetujui", color: "bg-emerald-400/20 text-emerald-100 border-emerald-400/30" },
									{ key: "ditolak", label: "Ditolak", color: "bg-rose-400/20 text-rose-100 border-rose-400/30" },
								].map(({ key, label, color }) => (
									<button
										key={key}
										type="button"
										onClick={() => {
											setFilterStatus(key);
											setPagination((p) => ({ ...p, page: 1 }));
										}}
										className={cn(
											"inline-flex flex-col items-center rounded-2xl border px-4 py-2 text-center transition hover:opacity-80",
											color,
										)}
									>
										<span className="text-xl font-bold">{statusCounts[key] ?? 0}</span>
										<span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
									</button>
								))}
							</div>
						</div>
					</section>

					{/* ── Error ────────────────────────────────────────────────────── */}
					{error && (
						<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
							<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
							{error}
						</div>
					)}

					{/* ── Filters ───────────────────────────────────────────────────── */}
					<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
						<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
							<HiOutlineFunnel className="h-4 w-4 text-slate-400" />
							Filter
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{/* Status filter */}
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
									<option value="pengajuan">Pengajuan</option>
									<option value="disetujui">Disetujui</option>
									<option value="ditolak">Ditolak</option>
								</select>
							</label>

							{/* Type filter */}
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Tipe Izin</span>
								<select
									value={filterLeaveType}
									onChange={(e) => {
										setFilterLeaveType(e.target.value);
										setPagination((p) => ({ ...p, page: 1 }));
									}}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									<option value="">Semua Tipe</option>
									<option value="izin">Izin</option>
									<option value="sakit">Sakit</option>
									<option value="cuti">Cuti</option>
								</select>
							</label>

							{/* Cutoff month */}
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

							{/* Cutoff year */}
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

						{/* Active range display */}
						<div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
							<HiOutlineCalendarDays className="h-4 w-4 text-violet-500 shrink-0" />
							<span>
								Periode: <strong className="text-slate-800">{formatDateOnly(filterStartDate)}</strong>
								{" "}&ndash;{" "}
								<strong className="text-slate-800">{formatDateOnly(filterEndDate)}</strong>
							</span>
						</div>

						{/* Search + reset */}
						<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
							<form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-xs">
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
								<button
									type="submit"
									className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
								>
									Cari
								</button>
							</form>

							<button
								type="button"
								onClick={() => {
									setFilterStatus("pengajuan");
									setFilterLeaveType("");
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

					{/* ── Table (desktop) / Cards (mobile) ─────────────────────────── */}
					<section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
						<div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<HiOutlineClipboardDocumentList className="h-5 w-5 text-violet-500" />
								<h2 className="text-base font-bold text-slate-800">Daftar Pengajuan</h2>
							</div>
							<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
								{pagination.total.toLocaleString("id-ID")} data
							</span>
						</div>

						{/* Desktop table */}
						<div className="hidden overflow-x-auto md:block">
							<table className="w-full border-collapse text-sm">
								<thead className="bg-slate-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">No</th>
										<SortTh col="employee_name" label="Karyawan" sort={sort} onSort={handleSort} />
										<SortTh col="leave_type" label="Tipe" sort={sort} onSort={handleSort} />
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Durasi</th>
										<SortTh col="start_date" label="Mulai" sort={sort} onSort={handleSort} />
										<SortTh col="end_date" label="Selesai" sort={sort} onSort={handleSort} />
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Alasan</th>
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Lampiran</th>
										<SortTh col="status" label="Status" sort={sort} onSort={handleSort} />
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{loading
										? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={10} />)
										: sortedRecords.length === 0
											? (
												<tr>
													<td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
														Tidak ada data pengajuan
													</td>
												</tr>
											)
											: sortedRecords.map((row, idx) => (
												<tr
													key={row.id}
													className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer"
													onClick={() => setDetailItem(row)}
												>
													<td className="px-4 py-3 text-xs text-slate-400">{from + idx}</td>
													<td className="px-4 py-3">
														<p className="font-semibold text-slate-800 whitespace-nowrap">{row.employee_name}</p>
														<p className="text-xs text-slate-400">{row.jabatan}</p>
													</td>
													<td className="px-4 py-3"><LeaveTypeBadge type={row.leave_type} /></td>
													<td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
														{DURATION_TYPE_META[row.duration_type] ?? row.duration_type}
													</td>
													<td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDateOnly(row.start_date)}</td>
													<td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDateOnly(row.end_date)}</td>
													<td className="px-4 py-3 max-w-[200px]">
														<p className="truncate text-xs text-slate-600">{row.reason || "-"}</p>
													</td>
													<td className="px-4 py-3">
														{row.doctor_note_url ? (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	setPhotoViewer({ url: row.doctor_note_url, label: "Surat Dokter" });
																}}
																className="group relative inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:border-blue-300"
																title="Lihat surat dokter"
															>
																<img
																	src={row.doctor_note_url}
																	alt="surat dokter"
																	loading="lazy"
																	className="h-10 w-10 object-cover transition-transform group-hover:scale-[1.04]"
																/>
															</button>
														) : (
															<span className="text-xs text-slate-300">—</span>
														)}
													</td>
													<td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={row.status} /></td>
													<td className="px-4 py-3 whitespace-nowrap">
														{row.status === "pengajuan" ? (
															<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
																<button
																	type="button"
																	onClick={() => openApprove(row)}
																	className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
																>
																	<HiOutlineCheckCircle className="h-3.5 w-3.5" />
																	Setujui
																</button>
																<button
																	type="button"
																	onClick={() => openReject(row)}
																	className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
																>
																	<HiOutlineNoSymbol className="h-3.5 w-3.5" />
																	Tolak
																</button>
															</div>
														) : (
															<span className="text-xs text-slate-400">
																{row.approved_by ? `oleh ${row.approved_by}` : "—"}
															</span>
														)}
													</td>
												</tr>
											))}
								</tbody>
							</table>
						</div>

						{/* Mobile cards */}
						<div className="md:hidden p-4 space-y-3">
							{loading
								? Array.from({ length: 6 }).map((_, i) => (
									<div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 h-28" />
								))
								: sortedRecords.length === 0
									? <p className="py-10 text-center text-sm text-slate-400">Tidak ada data pengajuan</p>
									: sortedRecords.map((row) => (
										<MobileLeaveCard key={row.id} row={row} onDetail={setDetailItem} />
									))}
						</div>

						{/* Pagination */}
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
									className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
									{"<<"}
								</button>
								<button type="button" onClick={() => handlePage(pagination.page - 1)} disabled={pagination.page <= 1 || loading}
									className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
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
													? "border-violet-500 bg-violet-600 text-white shadow-sm"
													: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
											)}>
											{p}
										</button>
									),
								)}

								<button type="button" onClick={() => handlePage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || loading}
									className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
									<HiOutlineChevronRight className="h-3.5 w-3.5" />
								</button>
								<button type="button" onClick={() => handlePage(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages || loading}
									className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
									{">>"}
								</button>
							</div>
						</div>
					</section>
				</div>
			</main>
		</>
	);
}
