import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
	HiOutlineArrowsUpDown,
	HiOutlineCalendarDays,
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineChevronUp,
	HiOutlineClock,
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
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
	"Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
].map((label, i) => ({ value: i + 1, label }));

const REQUEST_TYPE_META = {
	lembur: { label: "Lembur", cls: "bg-violet-50 text-violet-700 border-violet-200" },
	replace_off: { label: "RO", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const COMP_META = {
	ganti_hari: "Ganti hari libur",
	kompensasi_tunai: "Kompensasi tunai",
};

const STATUS_META = {
	Pending_Supervisor: { label: "Menunggu Supervisor", cls: "bg-amber-50 text-amber-700 border-amber-200" },
	Pending_HRD: { label: "Menunggu HRD", cls: "bg-blue-50 text-blue-700 border-blue-200" },
	Rejected_Supervisor: { label: "Ditolak Supervisor", cls: "bg-rose-50 text-rose-700 border-rose-200" },
	Rejected_HRD: { label: "Ditolak HRD", cls: "bg-rose-50 text-rose-700 border-rose-200" },
	disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function TypeBadge({ type }) {
	const meta = REQUEST_TYPE_META[type] ?? { label: type, cls: "bg-slate-50 text-slate-600 border-slate-200" };
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
							{item.employee_name} — <strong>{REQUEST_TYPE_META[item.request_type]?.label ?? item.request_type}</strong>
						</p>
						<p className="text-xs text-slate-400">
							{formatDateOnly(item.work_date)} · {item.start_time}–{item.end_time}
						</p>
						{item.description ? (
							<p className="mt-2 text-xs text-slate-600 line-clamp-3">{item.description}</p>
						) : null}
						{Array.isArray(item.todo_items) && item.todo_items.length > 0 ? (
							<ul className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
								{item.todo_items.map((t, idx) => (
									<li key={`${idx}-${t}`} className="text-xs text-slate-600">· {t}</li>
								))}
							</ul>
						) : null}
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
							? "Pengajuan akan disetujui final (tidak diteruskan ke HRD)."
							: "Pengajuan akan disetujui final."}
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

export default function LemburRoAlora() {
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
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const cutoffRange = useMemo(() => getCutoffRange(cutoffMonth, cutoffYear), [cutoffMonth, cutoffYear]);

	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sort, setSort] = useState({ col: "created_at", dir: "desc" });

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
				if (filterStatus) qs.set("status", filterStatus);
				qs.set("requestType", "lembur");
				if (search) qs.set("search", search);

				const data = await api(`/alora/lembur-ro?${qs.toString()}`);
				setRecords(data.records ?? []);
				setPagination((prev) => ({
					...prev,
					total: data.pagination?.total ?? 0,
					totalPages: data.pagination?.totalPages ?? 1,
				}));
				setStatusCounts(data.statusCounts ?? {});
			} catch (err) {
				if (!silent) setError(err.message || "Gagal mengambil data lembur Alora");
				setRecords([]);
			} finally {
				fetchInFlight.current = false;
				if (!silent) setLoading(false);
			}
		},
		[pagination.page, pagination.limit, cutoffRange.startDate, cutoffRange.endDate, filterStatus, search],
	);

	useEffect(() => {
		document.title = "Lembur Alora | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		fetchRecords();
	}, [fetchRecords]);

	const handleSort = (col) =>
		setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));

	const handlePage = (p) =>
		setPagination((prev) => ({ ...prev, page: Math.max(1, Math.min(p, prev.totalPages)) }));

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
			if (role === "Supervisor" && mode === "approve") path = `/alora/lembur-ro/${item.id}/supervisor-approve`;
			if (role === "Supervisor" && mode === "reject") path = `/alora/lembur-ro/${item.id}/supervisor-reject`;
			if (role === "HRD" && mode === "approve") path = `/alora/lembur-ro/${item.id}/hrd-approve`;
			if (role === "HRD" && mode === "reject") path = `/alora/lembur-ro/${item.id}/hrd-reject`;

			await api(path, {
				method: "PUT",
				body: JSON.stringify(mode === "reject" ? { reason: note } : {}),
			});
			showToast(mode === "reject" ? "Pengajuan ditolak" : "Pengajuan disetujui");
			setActionState(null);
			await fetchRecords({ silent: true });
		} catch (err) {
			showToast(err.message || "Gagal memproses pengajuan", "error");
		} finally {
			setBusy(false);
		}
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
					<div className="mb-1 inline-flex items-center gap-2 text-violet-600">
						<HiOutlineClock className="h-5 w-5" />
						<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
					</div>
					<h1 className="text-xl font-black text-slate-800">Lembur Alora</h1>
					<p className="mt-1 text-sm text-slate-500">
						Staff: SPV approve final. Supervisor+: langsung antrian HRD. Cutoff 26–25.
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

			<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
				<strong>Legacy:</strong> Pengajuan form lama — fitur baru via absensi sesi di{" "}
				<Link to="/master-karyawan/attendance-sessions" className="font-semibold underline">
					Sesi Lembur &amp; RO
				</Link>
				.
			</div>

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
						<span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Cutoff</span>
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
					<HiOutlineCalendarDays className="h-4 w-4 text-violet-500 shrink-0" />
					Periode: <strong className="text-slate-800">{formatDateOnly(cutoffRange.startDate)}</strong>
					{" "}&ndash;{" "}
					<strong className="text-slate-800">{formatDateOnly(cutoffRange.endDate)}</strong>
				</div>
				<form onSubmit={handleSearchSubmit} className="mt-3 flex max-w-xs gap-2">
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
			</section>

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="hidden overflow-x-auto md:block">
					<table className="w-full border-collapse text-sm">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">No</th>
								<SortTh col="employee_name" label="Karyawan" sort={sort} onSort={handleSort} />
								<SortTh col="request_type" label="Jenis" sort={sort} onSort={handleSort} />
								<SortTh col="work_date" label="Tanggal" sort={sort} onSort={handleSort} />
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Jam</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Durasi</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tipe RO</th>
								<SortTh col="status" label="Status" sort={sort} onSort={handleSort} />
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Memuat...</td></tr>
							) : sortedRecords.length === 0 ? (
								<tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Tidak ada data</td></tr>
							) : sortedRecords.map((row, idx) => (
								<tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
									<td className="px-4 py-3 text-xs text-slate-400">{from + idx}</td>
									<td className="px-4 py-3">
										<p className="font-semibold text-slate-800">{row.employee_name}</p>
										<p className="text-xs text-slate-400">{row.jabatan}</p>
									</td>
									<td className="px-4 py-3"><TypeBadge type={row.request_type} /></td>
									<td className="px-4 py-3 text-xs text-slate-600">{formatDateOnly(row.work_date)}</td>
									<td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.start_time}–{row.end_time}</td>
									<td className="px-4 py-3 text-xs text-slate-600">{row.duration_hours} jam</td>
									<td className="px-4 py-3 text-xs text-slate-600">
										{row.request_type === "replace_off" ? (COMP_META[row.compensation_type] || "—") : "—"}
									</td>
									<td className="px-4 py-3"><StatusBadge status={row.status} /></td>
									<td className="px-4 py-3">
										<RowActions
											row={row}
											canSpv={canSpvActOn(row)}
											canHrd={canHrdActOn(row)}
											onSpvApprove={(r) => setActionState({ item: r, mode: "approve", role: "Supervisor" })}
											onSpvReject={(r) => setActionState({ item: r, mode: "reject", role: "Supervisor" })}
											onHrdApprove={(r) => setActionState({ item: r, mode: "approve", role: "HRD" })}
											onHrdReject={(r) => setActionState({ item: r, mode: "reject", role: "HRD" })}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
					<span className="text-sm text-slate-500">
						{pagination.total > 0 ? `${from}-${to} dari ${pagination.total}` : "Tidak ada data"}
					</span>
					<div className="flex items-center gap-1">
						<button type="button" disabled={pagination.page <= 1} onClick={() => handlePage(pagination.page - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40">
							<HiOutlineChevronLeft className="h-4 w-4" />
						</button>
						{pages.map((p, i) => (
							typeof p === "number" ? (
								<button
									key={i}
									type="button"
									onClick={() => handlePage(p)}
									className={cn(
										"min-w-[2rem] rounded-lg border px-2 py-1 text-xs font-semibold",
										p === pagination.page ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600",
									)}
								>
									{p}
								</button>
							) : (
								<span key={i} className="px-1 text-slate-400">…</span>
							)
						))}
						<button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => handlePage(pagination.page + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40">
							<HiOutlineChevronRight className="h-4 w-4" />
						</button>
					</div>
				</div>
			</section>

			<ActionModal
				mode={actionState?.mode}
				role={actionState?.role}
				item={actionState?.item}
				onClose={() => setActionState(null)}
				onConfirm={runAction}
				busy={busy}
			/>
		</div>
	);
}
