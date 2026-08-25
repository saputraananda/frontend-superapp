import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	HiOutlineArrowsUpDown,
	HiOutlineCalendarDays,
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineChevronUp,
	HiOutlineClipboardDocumentList,
	HiOutlineExclamationTriangle,
	HiOutlineFunnel,
	HiOutlineMagnifyingGlass,
	HiOutlineNoSymbol,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

const HRD_POSITION_IDS = [1, 8, 17, 18, 19];

function getCurrentUserEmployee() {
	try {
		const raw = localStorage.getItem("user");
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed?.employee || parsed?.user?.employee || null;
	} catch {
		return null;
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
	return { cutoffMonth, cutoffYear, ...getCutoffRange(cutoffMonth, cutoffYear) };
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
	Pending_Supervisor: { label: "Menunggu Supervisor", cls: "bg-amber-50 text-amber-700 border-amber-200" },
	Pending_HRD: { label: "Menunggu HRD", cls: "bg-blue-50 text-blue-700 border-blue-200" },
	Rejected_Supervisor: { label: "Ditolak Supervisor", cls: "bg-rose-50 text-rose-700 border-rose-200" },
	Rejected_HRD: { label: "Ditolak HRD", cls: "bg-rose-50 text-rose-700 border-rose-200" },
	disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function LeaveTypeBadge({ type }) {
	const meta = LEAVE_TYPE_META[type] ?? { label: type, cls: "bg-slate-50 text-slate-600 border-slate-200" };
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", meta.cls)}>
			{meta.label}
		</span>
	);
}

function StatusBadge({ status }) {
	const meta = STATUS_META[status] ?? { label: status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap", meta.cls)}>
			{meta.label}
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

function SkeletonRow({ cols = 10 }) {
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

function ActionModal({ mode, role, item, onClose, onConfirm, busy }) {
	const [note, setNote] = useState("");
	if (!item || !mode) return null;
	const isReject = mode === "reject";

	return createPortal(
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<h2 className="text-base font-bold text-slate-800">
							{isReject ? `Tolak (${role})` : `Setujui (${role})`}
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							{item.employee_name} — <strong>{LEAVE_TYPE_META[item.leave_type]?.label ?? item.leave_type}</strong>
						</p>
						<p className="text-xs text-slate-400">
							{formatDateOnly(item.start_date)}
							{item.end_date !== item.start_date ? ` s/d ${formatDateOnly(item.end_date)}` : ""}
						</p>
					</div>
					<button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
						<HiOutlineXMark className="h-4 w-4" />
					</button>
				</div>

				{isReject ? (
					<div className="mb-5">
						<label className="mb-1.5 block text-xs font-semibold text-slate-500">
							Alasan Penolakan <span className="text-rose-500">*</span>
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
				) : (
					<p className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
						{role === "Supervisor"
							? "Pengajuan akan diteruskan ke HRD."
							: "Pengajuan akan disetujui final dan dapat mengunci absensi full-day."}
					</p>
				)}

				<div className="flex justify-end gap-2">
					<button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
						Batal
					</button>
					<button
						type="button"
						disabled={busy || (isReject && !note.trim())}
						onClick={() => onConfirm(note)}
						className={cn(
							"rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60",
							isReject ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700",
						)}
					>
						{busy ? "Memproses..." : isReject ? "Tolak" : "Setujui"}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

function LeaveDetailModal({ item, onClose, canSpvAct, canHrdAct, onSpvApprove, onSpvReject, onHrdApprove, onHrdReject }) {
	if (!item) return null;

	return createPortal(
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Detail Pengajuan #{item.id}</p>
						<h2 className="mt-1 text-lg font-bold text-slate-800">{item.employee_name}</h2>
						<p className="text-xs text-slate-400">{item.jabatan} · {item.department_name}</p>
					</div>
					<button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white">
						<HiOutlineXMark className="h-4 w-4" />
					</button>
				</div>

				<div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
					<div className="grid grid-cols-2 gap-3">
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tipe</p>
							<div className="mt-1.5"><LeaveTypeBadge type={item.leave_type} /></div>
						</div>
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Durasi</p>
							<p className="mt-1.5 text-sm font-semibold text-slate-700">{DURATION_TYPE_META[item.duration_type] ?? item.duration_type}</p>
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
						<p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{item.reason || "-"}</p>
					</div>

					<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
						<div className="mt-1.5"><StatusBadge status={item.status} /></div>
					</div>

					{(item.supervisor_rejection_reason || item.hrd_rejection_reason || item.rejection_note) && (
						<div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700 space-y-1">
							{item.supervisor_rejection_reason && <p><span className="font-semibold">SPV:</span> {item.supervisor_rejection_reason}</p>}
							{(item.hrd_rejection_reason || item.rejection_note) && (
								<p><span className="font-semibold">HRD:</span> {item.hrd_rejection_reason || item.rejection_note}</p>
							)}
						</div>
					)}

					{item.doctor_note_url && (
						<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
							<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Surat Dokter</p>
							<img
								src={item.doctor_note_url}
								alt="Surat dokter"
								className="max-h-56 w-auto max-w-full rounded-xl border border-slate-200 object-contain"
							/>
						</div>
					)}

					<p className="text-[11px] text-slate-400">Diajukan: {formatDateTime(item.created_at)}</p>
				</div>

				{item.status === "Pending_Supervisor" && canSpvAct && (
					<div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
						<button type="button" onClick={() => onSpvReject(item)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
							<HiOutlineNoSymbol className="h-4 w-4" /> Tolak SPV
						</button>
						<button type="button" onClick={() => onSpvApprove(item)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
							<HiOutlineCheckCircle className="h-4 w-4" /> Setujui SPV
						</button>
					</div>
				)}

				{item.status === "Pending_HRD" && canHrdAct && (
					<div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
						<button type="button" onClick={() => onHrdReject(item)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
							<HiOutlineNoSymbol className="h-4 w-4" /> Tolak HRD
						</button>
						<button type="button" onClick={() => onHrdApprove(item)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
							<HiOutlineCheckCircle className="h-4 w-4" /> Setujui HRD
						</button>
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
}

function RowActions({ row, canSpv, canHrd, onSpvApprove, onSpvReject, onHrdApprove, onHrdReject }) {
	if (canSpv) {
		return (
			<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
				<button type="button" onClick={() => onSpvApprove(row)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition">
					<HiOutlineCheckCircle className="h-3.5 w-3.5" /> Setujui
				</button>
				<button type="button" onClick={() => onSpvReject(row)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition">
					<HiOutlineNoSymbol className="h-3.5 w-3.5" /> Tolak
				</button>
			</div>
		);
	}
	if (canHrd) {
		return (
			<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
				<button type="button" onClick={() => onHrdApprove(row)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition">
					<HiOutlineCheckCircle className="h-3.5 w-3.5" /> Setujui
				</button>
				<button type="button" onClick={() => onHrdReject(row)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition">
					<HiOutlineNoSymbol className="h-3.5 w-3.5" /> Tolak
				</button>
			</div>
		);
	}
	if (row.status === "disetujui" && row.approved_by_name) {
		return <span className="text-xs text-slate-400">oleh {row.approved_by_name}</span>;
	}
	return <span className="text-xs text-slate-300">—</span>;
}

function MobileLeaveCard({ row, onDetail, canSpv, canHrd, onSpvApprove, onSpvReject, onHrdApprove, onHrdReject }) {
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
			<button type="button" className="w-full text-left space-y-3" onClick={() => onDetail(row)}>
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
				</div>
				<div className="text-xs text-slate-500">
					<span className="font-semibold text-slate-600">{formatDateOnly(row.start_date)}</span>
					{row.end_date !== row.start_date && (
						<> – <span className="font-semibold text-slate-600">{formatDateOnly(row.end_date)}</span></>
					)}
				</div>
				<p className="text-xs text-slate-500 line-clamp-2">{row.reason || "-"}</p>
				{row.doctor_note_url && (
					<img
						src={row.doctor_note_url}
						alt="Surat dokter"
						className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
						onClick={(e) => e.stopPropagation()}
					/>
				)}
			</button>
			{(canSpv || canHrd) && (
				<div className="pt-1 border-t border-slate-100">
					<RowActions
						row={row}
						canSpv={canSpv}
						canHrd={canHrd}
						onSpvApprove={onSpvApprove}
						onSpvReject={onSpvReject}
						onHrdApprove={onHrdApprove}
						onHrdReject={onHrdReject}
					/>
				</div>
			)}
		</div>
	);
}

export default function PerizinanAlora() {
	const employee = useMemo(() => getCurrentUserEmployee(), []);
	const isSpv = Number(employee?.job_level_id) <= 3;
	const isHR = HRD_POSITION_IDS.includes(Number(employee?.position_id));
	const defaultCutoff = useMemo(() => getDefaultCutoff(), []);
	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, i) => base - 3 + i);
	}, []);

	const [records, setRecords] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [statusCounts, setStatusCounts] = useState({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [filterStatus, setFilterStatus] = useState("Pending_Supervisor");
	const [filterLeaveType, setFilterLeaveType] = useState("");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const cutoffRange = useMemo(() => getCutoffRange(cutoffMonth, cutoffYear), [cutoffMonth, cutoffYear]);

	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sort, setSort] = useState({ col: "created_at", dir: "desc" });

	const [detailItem, setDetailItem] = useState(null);
	const [actionState, setActionState] = useState(null);
	const [busy, setBusy] = useState(false);
	const [toast, setToast] = useState(null);

	const fetchInFlight = useRef(false);

	const showToast = useCallback((message, type = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3500);
	}, []);

	const canSpvActOn = useCallback(
		(item) => isSpv && item?.status === "Pending_Supervisor" && Number(employee?.department_id) === Number(item?.department_id),
		[isSpv, employee?.department_id],
	);
	const canHrdActOn = useCallback(
		(item) => isHR && item?.status === "Pending_HRD",
		[isHR],
	);

	const fetchLeaves = useCallback(
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
				if (filterLeaveType) qs.set("leaveType", filterLeaveType);
				if (search) qs.set("search", search);

				const data = await api(`/alora/leaves?${qs.toString()}`);
				setRecords(data.records ?? []);
				setPagination((prev) => ({
					...prev,
					total: data.pagination?.total ?? 0,
					totalPages: data.pagination?.totalPages ?? 1,
				}));
				setStatusCounts(data.statusCounts ?? {});
			} catch (err) {
				if (!silent) setError(err.message || "Gagal mengambil data perizinan Alora");
				setRecords([]);
			} finally {
				fetchInFlight.current = false;
				if (!silent) setLoading(false);
			}
		},
		[pagination.page, pagination.limit, cutoffRange.startDate, cutoffRange.endDate, filterStatus, filterLeaveType, search],
	);

	useEffect(() => {
		document.title = "Cuti & Perizinan Alora | Alora Group Indonesia";
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

	const runAction = async (note) => {
		if (!actionState?.item) return;
		const { item, mode, role } = actionState;
		setBusy(true);
		try {
			let path = "";
			if (role === "Supervisor" && mode === "approve") path = `/alora/leaves/${item.id}/supervisor-approve`;
			if (role === "Supervisor" && mode === "reject") path = `/alora/leaves/${item.id}/supervisor-reject`;
			if (role === "HRD" && mode === "approve") path = `/alora/leaves/${item.id}/hrd-approve`;
			if (role === "HRD" && mode === "reject") path = `/alora/leaves/${item.id}/hrd-reject`;

			await api(path, {
				method: "PUT",
				body: JSON.stringify(mode === "reject" ? { reason: note } : {}),
			});
			showToast(mode === "reject" ? "Pengajuan ditolak" : "Pengajuan disetujui");
			setActionState(null);
			setDetailItem(null);
			await fetchLeaves({ silent: true });
		} catch (err) {
			showToast(err.message || "Gagal memproses pengajuan", "error");
		} finally {
			setBusy(false);
		}
	};

	const openSpvApprove = (item) => {
		setDetailItem(null);
		setActionState({ item, mode: "approve", role: "Supervisor" });
	};
	const openSpvReject = (item) => {
		setDetailItem(null);
		setActionState({ item, mode: "reject", role: "Supervisor" });
	};
	const openHrdApprove = (item) => {
		setDetailItem(null);
		setActionState({ item, mode: "approve", role: "HRD" });
	};
	const openHrdReject = (item) => {
		setDetailItem(null);
		setActionState({ item, mode: "reject", role: "HRD" });
	};

	const pages = generatePages(pagination.page, pagination.totalPages);
	const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
	const to = Math.min(pagination.page * pagination.limit, pagination.total);

	return (
		<div className="space-y-5 p-4 md:p-6">
			{toast && (
				<div
					className={cn(
						"fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl",
						toast.type === "error"
							? "border-rose-200 bg-rose-50 text-rose-700"
							: "border-emerald-200 bg-emerald-50 text-emerald-700",
					)}
				>
					{toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
					{toast.message}
				</div>
			)}

			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<div className="mb-1 inline-flex items-center gap-2 text-blue-600">
						<HiOutlineClipboardDocumentList className="h-5 w-5" />
						<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
					</div>
					<h1 className="text-xl font-black text-slate-800">Cuti & Perizinan Alora</h1>
					<p className="mt-1 text-sm text-slate-500">
						Approval pola training: Supervisor (dept sama) → HRD. Periode cutoff 26–25.
					</p>
				</div>
				<div className="flex flex-wrap gap-2 text-xs">
					{[
						{ key: "Pending_Supervisor", label: "SPV", color: "border-amber-200 bg-amber-50 text-amber-700" },
						{ key: "Pending_HRD", label: "HRD", color: "border-blue-200 bg-blue-50 text-blue-700" },
						{ key: "disetujui", label: "Disetujui", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
					].map(({ key, label, color }) => (
						<button
							key={key}
							type="button"
							onClick={() => {
								setFilterStatus(key);
								setPagination((p) => ({ ...p, page: 1 }));
							}}
							className={cn("rounded-full border px-3 py-1 font-semibold transition", color, filterStatus === key && "ring-2 ring-offset-1 ring-slate-300")}
						>
							{label}: {statusCounts[key] || 0}
						</button>
					))}
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
							setFilterStatus("Pending_Supervisor");
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

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
					<div className="flex items-center gap-2">
						<HiOutlineClipboardDocumentList className="h-5 w-5 text-blue-500" />
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
											className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/70"
											onClick={() => setDetailItem(row)}
										>
											<td className="px-4 py-3 text-xs text-slate-400">{from + idx}</td>
											<td className="px-4 py-3">
												<p className="whitespace-nowrap font-semibold text-slate-800">{row.employee_name}</p>
												<p className="text-xs text-slate-400">{row.jabatan}</p>
											</td>
											<td className="px-4 py-3"><LeaveTypeBadge type={row.leave_type} /></td>
											<td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
												{DURATION_TYPE_META[row.duration_type] ?? row.duration_type}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{formatDateOnly(row.start_date)}</td>
											<td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{formatDateOnly(row.end_date)}</td>
											<td className="max-w-[200px] px-4 py-3">
												<p className="truncate text-xs text-slate-600">{row.reason || "-"}</p>
											</td>
											<td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
												{row.doctor_note_url ? (
													<img
														src={row.doctor_note_url}
														alt="surat dokter"
														loading="lazy"
														className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
													/>
												) : (
													<span className="text-xs text-slate-300">—</span>
												)}
											</td>
											<td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status} /></td>
											<td className="whitespace-nowrap px-4 py-3">
												<RowActions
													row={row}
													canSpv={canSpvActOn(row)}
													canHrd={canHrdActOn(row)}
													onSpvApprove={openSpvApprove}
													onSpvReject={openSpvReject}
													onHrdApprove={openHrdApprove}
													onHrdReject={openHrdReject}
												/>
											</td>
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
								<MobileLeaveCard
									key={row.id}
									row={row}
									onDetail={setDetailItem}
									canSpv={canSpvActOn(row)}
									canHrd={canHrdActOn(row)}
									onSpvApprove={openSpvApprove}
									onSpvReject={openSpvReject}
									onHrdApprove={openHrdApprove}
									onHrdReject={openHrdReject}
								/>
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

			{detailItem && (
				<LeaveDetailModal
					item={detailItem}
					onClose={() => setDetailItem(null)}
					canSpvAct={canSpvActOn(detailItem)}
					canHrdAct={canHrdActOn(detailItem)}
					onSpvApprove={openSpvApprove}
					onSpvReject={openSpvReject}
					onHrdApprove={openHrdApprove}
					onHrdReject={openHrdReject}
				/>
			)}

			{actionState && (
				<ActionModal
					mode={actionState.mode}
					role={actionState.role}
					item={actionState.item}
					busy={busy}
					onClose={() => setActionState(null)}
					onConfirm={runAction}
				/>
			)}
		</div>
	);
}
