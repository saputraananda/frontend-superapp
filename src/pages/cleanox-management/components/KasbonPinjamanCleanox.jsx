import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlinePlus,
	HiOutlinePencilSquare,
	HiOutlineTrash,
	HiOutlineFunnel,
	HiOutlineXMark,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineChevronDown,
	HiOutlineChevronUp,
	HiOutlineArrowsUpDown,
	HiOutlineMagnifyingGlass,
	HiOutlineExclamationTriangle,
	HiOutlineCheckCircle,
	HiOutlineClock,
	HiOutlineInformationCircle,
	HiOutlinePaperClip,
	HiOutlineArrowDownTray,
	HiOutlinePhoto,
	HiOutlineBanknotes,
	HiOutlineClipboardDocumentCheck,
	HiOutlineCreditCard,
	HiOutlineUserGroup,
} from "react-icons/hi2";
import { api, apiUpload, BASE_URL } from "../../../lib/api";
import { exportKasbonCleanoxExcel } from "../utils/exportKasbonCleanoxExcel";

const API = "/cleanox/kasbon";

function cn(...c) {
	return c.filter(Boolean).join(" ");
}

function resolveAssetUrl(url) {
	if (!url) return null;
	if (/^https?:\/\//i.test(url)) return url;
	const base = (BASE_URL || "").replace(/\/$/, "");
	return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function fmtDate(v) {
	if (!v) return "-";
	const d = new Date(typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? `${v.slice(0, 10)}T00:00:00` : v);
	if (Number.isNaN(d.getTime())) return v;
	return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function fmtDateTime(v) {
	if (!v) return "-";
	const normalized =
		typeof v === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v) ? `${v.replace(" ", "T")}Z` : v;
	const d = new Date(normalized);
	if (Number.isNaN(d.getTime())) return v;
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(d);
}

function toTitleCase(str) {
	if (!str) return str;
	return String(str)
		.toLowerCase()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtRupiah(v) {
	if (v === null || v === undefined || v === "") return "-";
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(Number(v));
}

/** Parse API/DB DECIMAL (e.g. "200000.00") to digit string without stripping decimal point. */
function toRupiahDigits(value) {
	if (value === null || value === undefined || value === "") return "";
	const n = Math.round(Number(value));
	if (!Number.isFinite(n) || n < 0) return "";
	return String(n);
}

function todayISO() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateInput(date) {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return "";
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateOnly(v) {
	if (!v) return todayISO();
	return String(v).slice(0, 10);
}

const CUTOFF_START_DAY = 26;

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

function getDefaultCutoffSelection(now = new Date()) {
	const endDay = CUTOFF_START_DAY - 1;
	let cutoffMonth = now.getMonth() + 1;
	let cutoffYear = now.getFullYear();
	if (now.getDate() > endDay) {
		cutoffMonth += 1;
		if (cutoffMonth > 12) {
			cutoffMonth = 1;
			cutoffYear += 1;
		}
	}
	const start = new Date(cutoffYear, cutoffMonth - 2, CUTOFF_START_DAY);
	const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
	return { cutoffMonth, cutoffYear, startDate: toDateInput(start), endDate: toDateInput(end) };
}

function getCurrentUser() {
	try {
		const raw = localStorage.getItem("user");
		if (!raw) return { id: 0, name: "Admin" };
		const p = JSON.parse(raw);
		const u = p?.user ?? p;
		return {
			id: u?.employee?.employee_id || 0,
			name: u?.employee?.full_name || u?.name || "Admin",
		};
	} catch {
		return { id: 0, name: "Admin" };
	}
}

function generatePages(current, total) {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages = [1];
	if (current > 3) pages.push("...");
	for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
	if (current < total - 2) pages.push("...");
	pages.push(total);
	return pages;
}

const STATUS_META = {
	pengajuan: { label: "Pengajuan", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
	proses: { label: "Proses", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400" },
	disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
	ditolak: { label: "Ditolak", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-400" },
};

const TYPE_META = {
	kasbon: { label: "Kasbon", cls: "bg-sky-50 text-sky-800 border-sky-200" },
	pinjaman: { label: "Pinjaman", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
};

const PAYMENT_METHOD_LABEL = {
	tunai: "Tunai",
	potong_gaji: "Potong Gaji",
	transfer: "Transfer",
	lainnya: "Lainnya",
};

function Toast({ toast }) {
	if (!toast) return null;
	return (
		<div
			className={cn(
				"fixed bottom-5 right-5 z-[90] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl",
				toast.type === "error"
					? "border-rose-200 bg-rose-50 text-rose-700"
					: "border-emerald-200 bg-emerald-50 text-emerald-700"
			)}
		>
			{toast.type === "error" ? (
				<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
			) : (
				<HiOutlineCheckCircle className="h-4 w-4 shrink-0" />
			)}
			{toast.message}
		</div>
	);
}

function SortTh({ col, label, sort, onSort, className = "" }) {
	const active = sort.col === col;
	return (
		<th
			className={cn(
				"cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-slate-100",
				active ? "bg-slate-100 text-[#1b3459]" : "text-slate-500",
				className
			)}
			onClick={() => onSort(col)}
		>
			<div className="flex items-center gap-1">
				{label}
				{active ? (
					sort.dir === "asc" ? (
						<HiOutlineChevronUp className="h-3.5 w-3.5" />
					) : (
						<HiOutlineChevronDown className="h-3.5 w-3.5" />
					)
				) : (
					<HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />
				)}
			</div>
		</th>
	);
}

function SkeletonRow({ cols = 9 }) {
	return (
		<tr className="animate-pulse border-t border-slate-100">
			{Array.from({ length: cols }).map((_, i) => (
				<td key={i} className="px-4 py-4">
					<div className={cn("h-3.5 rounded-md bg-slate-200", i <= 1 ? "w-28" : i <= 3 ? "w-20" : "w-14")} />
				</td>
			))}
		</tr>
	);
}

function StatusBadge({ status }) {
	const m = STATUS_META[status] || {
		label: status,
		cls: "bg-slate-50 text-slate-600 border-slate-200",
		dot: "bg-slate-400",
	};
	return (
		<span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", m.cls)}>
			<span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
			{m.label}
		</span>
	);
}

function TypeBadge({ type }) {
	const m = TYPE_META[type] || { label: type, cls: "bg-slate-50 text-slate-600 border-slate-200" };
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", m.cls)}>
			{m.label}
		</span>
	);
}

function RupiahInput({ value, onChange, placeholder = "Contoh: 1.500.000", className = "" }) {
	const formatted = value ? Number(value).toLocaleString("id-ID") : "";
	const preview =
		value && Number(value) > 0
			? new Intl.NumberFormat("id-ID", {
					style: "currency",
					currency: "IDR",
					maximumFractionDigits: 0,
				}).format(Number(value))
			: null;

	return (
		<div>
			<div className="relative">
				<span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm font-medium text-slate-400">
					Rp
				</span>
				<input
					type="text"
					inputMode="numeric"
					value={formatted}
					onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
					placeholder={placeholder}
					className={cn(
						"w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300",
						className
					)}
				/>
			</div>
			{preview && <p className="mt-1 text-xs font-medium text-emerald-600">{preview}</p>}
		</div>
	);
}

function PhotoThumb({ url, label = "Bukti" }) {
	const [open, setOpen] = useState(false);
	const fullUrl = resolveAssetUrl(url);
	if (!fullUrl) return <span className="text-xs text-slate-300">-</span>;
	const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(fullUrl);
	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="group inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-[#1b3459] hover:shadow"
			>
				{isImage ? (
					<img src={fullUrl} alt={label} className="h-full w-full object-cover transition group-hover:opacity-80" />
				) : (
					<HiOutlinePaperClip className="h-4 w-4 text-slate-400 transition group-hover:text-[#1b3459]" />
				)}
			</button>
			{open && (
				<div
					className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
					onClick={() => setOpen(false)}
				>
					<div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md hover:bg-white"
						>
							<HiOutlineXMark className="h-5 w-5" />
						</button>
						{isImage ? (
							<img
								src={fullUrl}
								alt={label}
								className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl object-contain shadow-2xl"
							/>
						) : (
							<div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
								<HiOutlinePhoto className="mx-auto mb-3 h-12 w-12 text-slate-300" />
								<p className="mb-4 text-sm text-slate-600">{label}</p>
								<a
									href={fullUrl}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-2 rounded-xl bg-[#1b3459] px-4 py-2 text-sm font-semibold text-white hover:bg-[#152a4a]"
								>
									<HiOutlineArrowDownTray className="h-4 w-4" /> Buka Dokumen
								</a>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}

function ProgressTimeline({ row }) {
	const steps = [
		{
			key: "pengajuan",
			label: "Pengajuan",
			icon: HiOutlineClipboardDocumentCheck,
			done: true,
			date: row.created_at,
			by: row.employee_name,
			note: row.notes,
		},
		{
			key: "proses",
			label: "Diproses Admin",
			icon: HiOutlineClock,
			done: ["proses", "disetujui", "ditolak"].includes(row.status),
			date: row.process_at,
			by: row.process_by_name,
			note: row.process_note,
		},
		{
			key: "disetujui",
			label: row.status === "ditolak" ? "Ditolak" : "Disetujui",
			icon: row.status === "ditolak" ? HiOutlineExclamationTriangle : HiOutlineCheckCircle,
			done: ["disetujui", "ditolak"].includes(row.status),
			date: row.status === "ditolak" ? row.updated_at : row.approved_at,
			by: row.status === "ditolak" ? null : row.approved_by_name,
			note: row.status === "ditolak" ? row.rejection_note : row.approved_note,
			isReject: row.status === "ditolak",
		},
	];

	return (
		<div className="space-y-0">
			{steps.map((step, idx) => {
				const Icon = step.icon;
				const isLast = idx === steps.length - 1;
				return (
					<div key={step.key} className="flex gap-3">
						<div className="flex flex-col items-center">
							<div
								className={cn(
									"flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
									step.done
										? step.isReject
											? "border-rose-300 bg-rose-50 text-rose-600"
											: "border-emerald-300 bg-emerald-50 text-emerald-600"
										: "border-slate-200 bg-white text-slate-300"
								)}
							>
								<Icon className="h-4 w-4" />
							</div>
							{!isLast && (
								<div
									className={cn("my-1 w-0.5 flex-1", step.done ? "bg-emerald-200" : "bg-slate-100")}
									style={{ minHeight: "1.5rem" }}
								/>
							)}
						</div>
						<div className={cn("min-w-0 flex-1 pb-4", isLast && "pb-0")}>
							<p
								className={cn(
									"text-sm font-semibold",
									step.done ? (step.isReject ? "text-rose-700" : "text-slate-800") : "text-slate-400"
								)}
							>
								{step.label}
							</p>
							{step.done ? (
								<>
									{step.date && <p className="mt-0.5 text-xs text-slate-400">{fmtDateTime(step.date)}</p>}
									{step.by && (
										<p className="mt-0.5 text-xs text-slate-500">
											Oleh: <span className="font-medium">{toTitleCase(step.by)}</span>
										</p>
									)}
									{step.note && (
										<p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
											{step.note}
										</p>
									)}
									{step.key === "disetujui" && !step.isReject && row.amount_approved && (
										<p className="mt-1 text-sm font-bold text-emerald-700">{fmtRupiah(row.amount_approved)}</p>
									)}
								</>
							) : (
								<p className="mt-0.5 text-xs text-slate-300">Menunggu...</p>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function PaymentProgressBar({ totalPaid, amountApproved }) {
	const pct = amountApproved > 0 ? Math.min(100, (totalPaid / amountApproved) * 100) : 0;
	return (
		<div>
			<div className="mb-1 flex justify-between text-xs">
				<span className="text-slate-500">Terbayar</span>
				<span className="font-semibold text-slate-700">{pct.toFixed(0)}%</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
				<div
					className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-[#1b3459]")}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div className="mt-1 flex justify-between text-xs">
				<span className="font-medium text-emerald-600">{fmtRupiah(totalPaid)}</span>
				<span className="text-slate-400">dari {fmtRupiah(amountApproved)}</span>
			</div>
		</div>
	);
}

function ConfirmDeleteModal({ open, onClose, onConfirm, loading, title, desc }) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
			<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
				<div className="mb-4 flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
						<HiOutlineExclamationTriangle className="h-5 w-5 text-rose-600" />
					</div>
					<div>
						<p className="font-bold text-slate-800">{title}</p>
						<p className="text-sm text-slate-500">{desc}</p>
					</div>
				</div>
				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={loading}
						className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
					>
						{loading ? "Menghapus..." : "Hapus"}
					</button>
				</div>
			</div>
		</div>
	);
}

function EmployeeSelector({ employees, value, onChange, disabled }) {
	const [q, setQ] = useState("");
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const selected = employees.find((e) => e.employee_id === Number(value));
	const filtered = useMemo(() => {
		if (!q) return employees;
		const lq = q.toLowerCase();
		return employees.filter(
			(e) =>
				(e.full_name || "").toLowerCase().includes(lq) ||
				(e.employee_code || "").toLowerCase().includes(lq)
		);
	}, [employees, q]);

	useEffect(() => {
		const handler = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				disabled={disabled}
				onClick={() => setOpen((o) => !o)}
				className={cn(
					"flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
					disabled
						? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
						: "border-slate-200 bg-white hover:border-[#1b3459] focus:outline-none focus:ring-2 focus:ring-slate-300",
					open && "border-[#1b3459] ring-2 ring-slate-300"
				)}
			>
				<span className={selected ? "font-medium text-slate-800" : "text-slate-400"}>
					{selected
						? `${toTitleCase(selected.full_name)} (${selected.employee_code || selected.employee_id})`
						: "Pilih karyawan..."}
				</span>
				<HiOutlineChevronDown
					className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
				/>
			</button>
			{open && (
				<div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
					<div className="border-b border-slate-100 p-2">
						<div className="relative">
							<HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								placeholder="Cari karyawan..."
								value={q}
								onChange={(e) => setQ(e.target.value)}
								className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
								autoFocus
							/>
						</div>
					</div>
					<ul className="max-h-52 overflow-y-auto">
						{filtered.length === 0 && (
							<li className="px-3 py-6 text-center text-sm text-slate-400">Tidak ditemukan</li>
						)}
						{filtered.map((e) => (
							<li key={e.employee_id}>
								<button
									type="button"
									onClick={() => {
										onChange(e.employee_id, e.full_name);
										setOpen(false);
										setQ("");
									}}
									className={cn(
										"flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-slate-50",
										Number(value) === e.employee_id && "bg-slate-100 font-semibold text-[#1b3459]"
									)}
								>
									<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
										{(e.full_name || "?")[0]}
									</div>
									<div>
										<p className="font-medium leading-tight">{toTitleCase(e.full_name)}</p>
										{e.employee_code && <p className="text-xs text-slate-400">{e.employee_code}</p>}
									</div>
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

const EMPTY_FORM = {
	employee_id: "",
	type: "kasbon",
	submission_date: todayISO(),
	amount_requested: "",
	purpose: "",
	notes: "",
};

function FormModal({ open, onClose, onSaved, employees, editData }) {
	const [form, setForm] = useState(EMPTY_FORM);
	const [file, setFile] = useState(null);
	const [removeProof, setRemoveProof] = useState(false);
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState("");
	const fileRef = useRef(null);
	const isEdit = !!editData;

	useEffect(() => {
		if (!open) return;
		if (editData) {
			setForm({
				employee_id: editData.employee_id || "",
				type: editData.type || "kasbon",
				submission_date: toDateOnly(editData.submission_date),
				amount_requested: toRupiahDigits(editData.amount_requested),
				purpose: editData.purpose || "",
				notes: editData.notes || "",
			});
		} else {
			setForm({ ...EMPTY_FORM, submission_date: todayISO() });
		}
		setFile(null);
		setRemoveProof(false);
		setErr("");
	}, [open, editData]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!form.employee_id) {
			setErr("Pilih karyawan terlebih dahulu");
			return;
		}
		if (!form.submission_date) {
			setErr("Tanggal pengajuan wajib diisi");
			return;
		}
		if (!form.amount_requested || Number(form.amount_requested) <= 0) {
			setErr("Jumlah pengajuan harus lebih dari 0");
			return;
		}
		if (!form.purpose.trim()) {
			setErr("Keperluan wajib diisi");
			return;
		}

		setSaving(true);
		setErr("");
		try {
			const fd = new FormData();
			fd.append("employee_id", form.employee_id);
			fd.append("type", form.type);
			fd.append("submission_date", form.submission_date);
			fd.append("amount_requested", form.amount_requested);
			fd.append("purpose", form.purpose);
			fd.append("notes", form.notes || "");
			if (file) fd.append("proof_file", file);
			if (removeProof) fd.append("remove_proof", "true");

			if (isEdit) {
				await apiUpload(`${API}/${editData.id}`, { method: "PUT", body: fd });
			} else {
				await apiUpload(API, { method: "POST", body: fd });
			}
			onSaved();
			onClose();
		} catch (ex) {
			setErr(ex.message);
		} finally {
			setSaving(false);
		}
	};

	if (!open) return null;
	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
			<div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
					<div>
						<p className="font-bold text-slate-800">{isEdit ? "Edit Pengajuan" : "Tambah Pengajuan"}</p>
						<p className="text-xs text-slate-400">Kasbon & Pinjaman Cleanox</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
					>
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
					{err && (
						<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
							<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
							{err}
						</div>
					)}

					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600">
							Karyawan <span className="text-rose-500">*</span>
						</label>
						<EmployeeSelector
							employees={employees}
							value={form.employee_id}
							onChange={(id) => setForm((f) => ({ ...f, employee_id: id }))}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="mb-1.5 block text-xs font-semibold text-slate-600">
								Tipe <span className="text-rose-500">*</span>
							</label>
							<select
								value={form.type}
								onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
								className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
							>
								<option value="kasbon">Kasbon</option>
								<option value="pinjaman">Pinjaman (cicilan)</option>
							</select>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-semibold text-slate-600">
								Tanggal Pengajuan <span className="text-rose-500">*</span>
							</label>
							<input
								type="date"
								value={form.submission_date}
								onChange={(e) => setForm((f) => ({ ...f, submission_date: e.target.value }))}
								className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
						</div>
					</div>

					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600">
							Jumlah Pengajuan (Rp) <span className="text-rose-500">*</span>
						</label>
						<RupiahInput
							value={form.amount_requested}
							onChange={(raw) => setForm((f) => ({ ...f, amount_requested: raw }))}
						/>
					</div>

					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600">
							Keperluan / Tujuan <span className="text-rose-500">*</span>
						</label>
						<textarea
							rows={3}
							value={form.purpose}
							onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
							placeholder="Jelaskan keperluan pengajuan..."
							className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
						/>
					</div>

					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600">Catatan Tambahan</label>
						<textarea
							rows={2}
							value={form.notes}
							onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
							placeholder="Opsional..."
							className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
						/>
					</div>

					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600">
							Foto / Dokumen Bukti (Opsional)
						</label>
						{isEdit && editData?.proof_url && !removeProof && (
							<div className="mb-2 flex items-center gap-2">
								<PhotoThumb url={editData.proof_url} label="Bukti saat ini" />
								<span className="text-xs text-slate-500">Bukti saat ini</span>
								<button
									type="button"
									onClick={() => setRemoveProof(true)}
									className="text-xs text-rose-500 underline hover:text-rose-700"
								>
									Hapus
								</button>
							</div>
						)}
						<input
							ref={fileRef}
							type="file"
							accept=".jpg,.jpeg,.png,.webp,.pdf"
							className="hidden"
							onChange={(e) => {
								setFile(e.target.files[0] || null);
								setRemoveProof(false);
							}}
						/>
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-[#1b3459] hover:text-[#1b3459]"
						>
							<HiOutlinePaperClip className="h-4 w-4" />
							{file ? file.name : "Pilih file..."}
						</button>
					</div>
				</form>

				<div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={saving}
						className="rounded-xl bg-[#1b3459] px-5 py-2 text-sm font-semibold text-white hover:bg-[#152a4a] disabled:opacity-50"
					>
						{saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Pengajuan"}
					</button>
				</div>
			</div>
		</div>
	);
}

function StatusModal({ open, onClose, onSaved, row }) {
	const [targetStatus, setTargetStatus] = useState("");
	const [processNote, setProcessNote] = useState("");
	const [approvedNote, setApprovedNote] = useState("");
	const [rejectionNote, setRejectionNote] = useState("");
	const [amountApproved, setAmountApproved] = useState("");
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState("");

	useEffect(() => {
		if (open && row) {
			setTargetStatus("");
			setProcessNote(row.process_note || "");
			setApprovedNote(row.approved_note || "");
			setRejectionNote(row.rejection_note || "");
			setAmountApproved(toRupiahDigits(row.amount_approved ?? row.amount_requested));
			setErr("");
		}
	}, [open, row]);

	const availableStatuses = useMemo(() => {
		if (!row) return [];
		if (row.status === "pengajuan") return ["proses", "disetujui", "ditolak"];
		if (row.status === "proses") return ["disetujui", "ditolak"];
		return [];
	}, [row]);

	const handleSave = async () => {
		if (!targetStatus) {
			setErr("Pilih status baru");
			return;
		}
		if (targetStatus === "disetujui" && (!amountApproved || Number(amountApproved) <= 0)) {
			setErr("Jumlah yang disetujui wajib diisi");
			return;
		}
		setSaving(true);
		setErr("");
		try {
			const actor = getCurrentUser();
			await api(`${API}/${row.id}/status`, {
				method: "PUT",
				body: JSON.stringify({
					status: targetStatus,
					process_note: processNote || undefined,
					approved_note: approvedNote || undefined,
					rejection_note: rejectionNote || undefined,
					amount_approved: targetStatus === "disetujui" ? amountApproved : undefined,
					actor_id: actor.id,
					actor_name: actor.name,
				}),
			});
			onSaved();
			onClose();
		} catch (ex) {
			setErr(ex.message);
		} finally {
			setSaving(false);
		}
	};

	if (!open || !row) return null;
	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
					<div>
						<p className="font-bold text-slate-800">Update Status</p>
						<p className="text-xs text-slate-400">
							{toTitleCase(row.employee_name)} — {row.type === "pinjaman" ? "Pinjaman" : "Kasbon"}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
					>
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4 px-6 py-5">
					{err && (
						<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
							<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
							{err}
						</div>
					)}

					<div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
						<span className="text-xs text-slate-500">Status saat ini:</span>
						<StatusBadge status={row.status} />
						<span className="ml-auto text-xs text-slate-400">{fmtRupiah(row.amount_requested)}</span>
					</div>

					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600">
							Ubah ke Status <span className="text-rose-500">*</span>
						</label>
						<div className="flex flex-wrap gap-2">
							{availableStatuses.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => setTargetStatus(s)}
									className={cn(
										"flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition",
										targetStatus === s
											? s === "ditolak"
												? "border-rose-600 bg-rose-600 text-white"
												: s === "disetujui"
													? "border-emerald-600 bg-emerald-600 text-white"
													: "border-[#1b3459] bg-[#1b3459] text-white"
											: "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
									)}
								>
									<span className={cn("h-2 w-2 rounded-full", STATUS_META[s]?.dot)} />
									{STATUS_META[s]?.label || s}
								</button>
							))}
							{availableStatuses.length === 0 && (
								<p className="text-sm text-slate-400">Status ini sudah final</p>
							)}
						</div>
					</div>

					{targetStatus === "proses" && (
						<div>
							<label className="mb-1.5 block text-xs font-semibold text-slate-600">Catatan Proses</label>
							<textarea
								rows={2}
								value={processNote}
								onChange={(e) => setProcessNote(e.target.value)}
								placeholder="Catatan proses (opsional)..."
								className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
						</div>
					)}

					{targetStatus === "disetujui" && (
						<>
							<div>
								<label className="mb-1.5 block text-xs font-semibold text-slate-600">
									Jumlah Disetujui (Rp) <span className="text-rose-500">*</span>
								</label>
								<RupiahInput value={amountApproved} onChange={setAmountApproved} />
							</div>
							<div>
								<label className="mb-1.5 block text-xs font-semibold text-slate-600">
									Catatan Persetujuan
								</label>
								<textarea
									rows={2}
									value={approvedNote}
									onChange={(e) => setApprovedNote(e.target.value)}
									placeholder="Catatan persetujuan (opsional)..."
									className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
								/>
							</div>
						</>
					)}

					{targetStatus === "ditolak" && (
						<div>
							<label className="mb-1.5 block text-xs font-semibold text-slate-600">Alasan Penolakan</label>
							<textarea
								rows={2}
								value={rejectionNote}
								onChange={(e) => setRejectionNote(e.target.value)}
								placeholder="Alasan penolakan (opsional)..."
								className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={saving || availableStatuses.length === 0}
						className="rounded-xl bg-[#1b3459] px-5 py-2 text-sm font-semibold text-white hover:bg-[#152a4a] disabled:opacity-50"
					>
						{saving ? "Menyimpan..." : "Simpan Status"}
					</button>
				</div>
			</div>
		</div>
	);
}

function DetailModal({ open, onClose, rowId, onRefresh }) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [tab, setTab] = useState("tracking");
	const [payForm, setPayForm] = useState({
		payment_date: todayISO(),
		amount: "",
		payment_method: "potong_gaji",
		notes: "",
	});
	const [payErr, setPayErr] = useState("");
	const [paySaving, setPaySaving] = useState(false);
	const [deletePayId, setDeletePayId] = useState(null);
	const [deletingPay, setDeletingPay] = useState(false);

	const fetchDetail = useCallback(async () => {
		if (!rowId) return;
		setLoading(true);
		try {
			const res = await api(`${API}/${rowId}`);
			setData(res.data);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [rowId]);

	useEffect(() => {
		if (open && rowId) {
			setTab("tracking");
			setPayForm({ payment_date: todayISO(), amount: "", payment_method: "potong_gaji", notes: "" });
			setPayErr("");
			fetchDetail();
		}
	}, [open, rowId, fetchDetail]);

	const handleAddPayment = async () => {
		if (!payForm.payment_date || !payForm.amount || Number(payForm.amount) <= 0) {
			setPayErr("Tanggal dan jumlah wajib diisi");
			return;
		}
		setPaySaving(true);
		setPayErr("");
		try {
			await api(`${API}/${rowId}/payment`, {
				method: "POST",
				body: JSON.stringify(payForm),
			});
			setPayForm({ payment_date: todayISO(), amount: "", payment_method: "potong_gaji", notes: "" });
			await fetchDetail();
			onRefresh();
		} catch (ex) {
			setPayErr(ex.message);
		} finally {
			setPaySaving(false);
		}
	};

	const handleDeletePayment = async () => {
		if (!deletePayId) return;
		setDeletingPay(true);
		try {
			await api(`${API}/${rowId}/payment/${deletePayId}`, { method: "DELETE" });
			setDeletePayId(null);
			await fetchDetail();
			onRefresh();
		} catch (ex) {
			setPayErr(ex.message);
		} finally {
			setDeletingPay(false);
		}
	};

	if (!open) return null;
	return (
		<>
			<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
				<div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
					<div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
						<div>
							<p className="font-bold text-slate-800">
								{loading ? "Memuat..." : toTitleCase(data?.employee_name) || "Detail"}
							</p>
							{data && (
								<div className="mt-0.5 flex items-center gap-2">
									<TypeBadge type={data.type} />
									<StatusBadge status={data.status} />
								</div>
							)}
						</div>
						<button
							type="button"
							onClick={onClose}
							className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
						>
							<HiOutlineXMark className="h-5 w-5" />
						</button>
					</div>

					{loading && (
						<div className="flex flex-1 items-center justify-center p-8">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1b3459]" />
						</div>
					)}

					{!loading && data && (
						<>
							<div className="grid grid-cols-2 gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4">
								<div>
									<p className="text-xs text-slate-400">Tanggal Pengajuan</p>
									<p className="text-sm font-semibold text-slate-800">{fmtDate(data.submission_date)}</p>
								</div>
								<div>
									<p className="text-xs text-slate-400">Jumlah Diajukan</p>
									<p className="text-sm font-semibold text-slate-800">{fmtRupiah(data.amount_requested)}</p>
								</div>
								{data.amount_approved != null && (
									<div>
										<p className="text-xs text-slate-400">Jumlah Disetujui</p>
										<p className="text-sm font-bold text-emerald-700">{fmtRupiah(data.amount_approved)}</p>
									</div>
								)}
								{data.proof_url && (
									<div>
										<p className="text-xs text-slate-400">Bukti</p>
										<PhotoThumb url={data.proof_url} label="Bukti pengajuan" />
									</div>
								)}
							</div>

							<div className="px-6 pb-2 pt-4">
								<p className="mb-1 text-xs text-slate-400">Keperluan</p>
								<p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
									{data.purpose}
								</p>
							</div>

							<div className="flex gap-1 px-6 pb-2">
								{["tracking", ...(data.type === "pinjaman" && data.status === "disetujui" ? ["pembayaran"] : [])].map(
									(t) => (
										<button
											key={t}
											type="button"
											onClick={() => setTab(t)}
											className={cn(
												"rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition",
												tab === t ? "bg-[#1b3459] text-white" : "text-slate-500 hover:bg-slate-100"
											)}
										>
											{t === "tracking" ? "Tracking Status" : "Riwayat Pembayaran"}
										</button>
									)
								)}
							</div>

							<div className="flex-1 overflow-y-auto px-6 pb-6">
								{tab === "tracking" && (
									<div className="pt-2">
										<ProgressTimeline row={data} />
									</div>
								)}

								{tab === "pembayaran" && data.type === "pinjaman" && (
									<div className="space-y-4 pt-2">
										<PaymentProgressBar
											totalPaid={data.total_paid || 0}
											amountApproved={Number(data.amount_approved)}
										/>

										<div className="grid grid-cols-3 gap-2">
											{[
												{ label: "Disetujui", val: fmtRupiah(data.amount_approved), cls: "text-slate-700" },
												{ label: "Terbayar", val: fmtRupiah(data.total_paid), cls: "text-emerald-700" },
												{
													label: "Sisa",
													val: fmtRupiah(data.remaining),
													cls: data.remaining <= 0 ? "text-emerald-600" : "text-amber-700",
												},
											].map((s) => (
												<div
													key={s.label}
													className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center"
												>
													<p className="text-xs text-slate-400">{s.label}</p>
													<p className={cn("mt-0.5 text-sm font-bold", s.cls)}>{s.val}</p>
												</div>
											))}
										</div>

										{data.payments?.length > 0 ? (
											<div className="space-y-2">
												<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
													Riwayat Pembayaran
												</p>
												{data.payments.map((p) => (
													<div
														key={p.id}
														className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5"
													>
														<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
															<HiOutlineCreditCard className="h-4 w-4 text-emerald-600" />
														</div>
														<div className="min-w-0 flex-1">
															<p className="text-sm font-semibold text-slate-800">{fmtRupiah(p.amount)}</p>
															<p className="text-xs text-slate-400">
																{fmtDate(p.payment_date)} ·{" "}
																{PAYMENT_METHOD_LABEL[p.payment_method] || p.payment_method}
															</p>
															{p.notes && <p className="truncate text-xs text-slate-500">{p.notes}</p>}
														</div>
														{p.recorded_by_name && (
															<p className="shrink-0 text-xs text-slate-400">
																{toTitleCase(p.recorded_by_name)}
															</p>
														)}
														<button
															type="button"
															onClick={() => setDeletePayId(p.id)}
															className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
														>
															<HiOutlineTrash className="h-4 w-4" />
														</button>
													</div>
												))}
											</div>
										) : (
											<p className="py-2 text-center text-sm text-slate-400">Belum ada pembayaran tercatat</p>
										)}

										{(data.remaining === null || data.remaining > 0) && (
											<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
												<p className="text-xs font-semibold text-slate-600">Catat Pembayaran Baru</p>
												{payErr && <p className="text-xs font-medium text-rose-600">{payErr}</p>}
												<div className="grid grid-cols-2 gap-2">
													<div>
														<label className="mb-1 block text-xs text-slate-500">Tanggal</label>
														<input
															type="date"
															value={payForm.payment_date}
															onChange={(e) =>
																setPayForm((f) => ({ ...f, payment_date: e.target.value }))
															}
															className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
														/>
													</div>
													<div>
														<label className="mb-1 block text-xs text-slate-500">Jumlah (Rp)</label>
														<RupiahInput
															value={payForm.amount}
															onChange={(raw) => setPayForm((f) => ({ ...f, amount: raw }))}
															placeholder="Jumlah..."
															className="py-2"
														/>
													</div>
												</div>
												<div>
													<label className="mb-1 block text-xs text-slate-500">Metode</label>
													<select
														value={payForm.payment_method}
														onChange={(e) =>
															setPayForm((f) => ({ ...f, payment_method: e.target.value }))
														}
														className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
													>
														<option value="potong_gaji">Potong Gaji</option>
														<option value="tunai">Tunai</option>
														<option value="transfer">Transfer</option>
														<option value="lainnya">Lainnya</option>
													</select>
												</div>
												<div>
													<label className="mb-1 block text-xs text-slate-500">Catatan</label>
													<input
														type="text"
														value={payForm.notes}
														onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
														placeholder="Opsional..."
														className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
													/>
												</div>
												<button
													type="button"
													onClick={handleAddPayment}
													disabled={paySaving}
													className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
												>
													{paySaving ? "Menyimpan..." : "Catat Pembayaran"}
												</button>
											</div>
										)}
										{data.remaining !== null && data.remaining <= 0 && (
											<div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
												<HiOutlineCheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
												<p className="text-sm font-semibold text-emerald-700">Pinjaman telah lunas!</p>
											</div>
										)}
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>

			<ConfirmDeleteModal
				open={!!deletePayId}
				onClose={() => setDeletePayId(null)}
				onConfirm={handleDeletePayment}
				loading={deletingPay}
				title="Hapus Pembayaran"
				desc="Data pembayaran ini akan dihapus permanen."
			/>
		</>
	);
}

export default function KasbonPinjamanCleanox() {
	const [rows, setRows] = useState([]);
	const [backendStats, setBackendStats] = useState(null);
	const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
	const [employees, setEmployees] = useState([]);
	const [loading, setLoading] = useState(true);

	const [filterType, setFilterType] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(25);
	const [sort, setSort] = useState({ col: "submission_date", dir: "desc" });

	const todayStr = useMemo(() => toDateInput(new Date()), []);
	const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date()), []);
	const [periodMode, setPeriodMode] = useState("cutoff");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const [customStart, setCustomStart] = useState(defaultCutoff.startDate);
	const [customEnd, setCustomEnd] = useState(defaultCutoff.endDate);

	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, i) => base - 3 + i);
	}, []);

	const activePeriod = useMemo(() => {
		if (periodMode === "today") return { start: todayStr, end: todayStr };
		if (periodMode === "custom")
			return { start: customStart || todayStr, end: customEnd || customStart || todayStr };
		const start = new Date(cutoffYear, cutoffMonth - 2, CUTOFF_START_DAY);
		const end = new Date(cutoffYear, cutoffMonth - 1, CUTOFF_START_DAY - 1);
		return { start: toDateInput(start), end: toDateInput(end) };
	}, [periodMode, todayStr, customStart, customEnd, cutoffMonth, cutoffYear]);

	const filterStart = activePeriod.start;
	const filterEnd = activePeriod.end;

	const [formOpen, setFormOpen] = useState(false);
	const [editData, setEditData] = useState(null);
	const [statusModal, setStatusModal] = useState({ open: false, row: null });
	const [detailModal, setDetailModal] = useState({ open: false, rowId: null });
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleting, setDeleting] = useState(false);

	const [summary, setSummary] = useState([]);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [summaryPage, setSummaryPage] = useState(1);
	const [summaryLimit, setSummaryLimit] = useState("5");

	const [toast, setToast] = useState(null);
	const showToast = (message, type = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3500);
	};

	const [exporting, setExporting] = useState(false);

	useEffect(() => {
		document.title = "Kasbon & Pinjaman Cleanox | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		api(`${API}/employee-options`)
			.then((d) => setEmployees(d.data || []))
			.catch(() => setEmployees([]));
	}, []);

	useEffect(() => {
		const t = setTimeout(() => {
			setPage(1);
			setSummaryPage(1);
		}, 400);
		return () => clearTimeout(t);
	}, [search]);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ page, limit });
			if (filterType) params.set("type", filterType);
			if (filterStatus) params.set("status", filterStatus);
			if (filterStart) params.set("startDate", filterStart);
			if (filterEnd) params.set("endDate", filterEnd);
			if (search) params.set("search", search);

			const res = await api(`${API}?${params.toString()}`);
			setRows(res.data || []);
			setBackendStats(res.stats || null);
			setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
		} catch {
			setRows([]);
			setBackendStats(null);
		} finally {
			setLoading(false);
		}
	}, [page, filterType, filterStatus, filterStart, filterEnd, search, limit]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		setSummaryLoading(true);
		const params = new URLSearchParams();
		if (filterStart) params.set("startDate", filterStart);
		if (filterEnd) params.set("endDate", filterEnd);
		api(`${API}/employee-summary?${params}`)
			.then((d) => setSummary(d.data || []))
			.catch(() => setSummary([]))
			.finally(() => setSummaryLoading(false));
	}, [filterStart, filterEnd]);

	const sortedRows = useMemo(() => {
		const { col, dir } = sort;
		return [...rows].sort((a, b) => {
			let av = a[col] ?? "";
			let bv = b[col] ?? "";
			if (typeof av === "string") av = av.toLowerCase();
			if (typeof bv === "string") bv = bv.toLowerCase();
			if (av < bv) return dir === "asc" ? -1 : 1;
			if (av > bv) return dir === "asc" ? 1 : -1;
			return 0;
		});
	}, [rows, sort]);

	const handleSort = (col) => {
		setSort((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));
	};

	const resetFilter = () => {
		setFilterType("");
		setFilterStatus("");
		setPeriodMode("cutoff");
		setCutoffMonth(defaultCutoff.cutoffMonth);
		setCutoffYear(defaultCutoff.cutoffYear);
		setCustomStart(defaultCutoff.startDate);
		setCustomEnd(defaultCutoff.endDate);
		setSearch("");
		setPage(1);
		setLimit(25);
		setSummaryPage(1);
		setSummaryLimit("5");
	};

	const hasFilter = filterType || filterStatus || search || periodMode !== "cutoff";

	const handleExport = async () => {
		setExporting(true);
		try {
			const params = new URLSearchParams({ page: 1, limit: 9999 });
			if (filterType) params.set("type", filterType);
			if (filterStatus) params.set("status", filterStatus);
			if (filterStart) params.set("startDate", filterStart);
			if (filterEnd) params.set("endDate", filterEnd);
			if (search) params.set("search", search);

			const summaryParams = new URLSearchParams();
			if (filterStart) summaryParams.set("startDate", filterStart);
			if (filterEnd) summaryParams.set("endDate", filterEnd);

			const [listRes, summaryRes] = await Promise.all([
				api(`${API}?${params.toString()}`),
				api(`${API}/employee-summary?${summaryParams}`),
			]);

			exportKasbonCleanoxExcel({
				rows: listRes.data || [],
				summary: summaryRes.data || [],
				startDate: filterStart,
				endDate: filterEnd,
				filters: { type: filterType, status: filterStatus, search },
			});
		} catch (ex) {
			showToast(ex.message || "Gagal mengekspor Excel", "error");
		} finally {
			setExporting(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await api(`${API}/${deleteTarget.id}`, { method: "DELETE" });
			showToast("Data berhasil dihapus");
			setDeleteTarget(null);
			fetchData();
		} catch (ex) {
			showToast(ex.message, "error");
		} finally {
			setDeleting(false);
		}
	};

	const stats = useMemo(() => {
		if (backendStats) return backendStats;
		const totalKasbon = rows.filter((r) => r.type === "kasbon").length;
		const totalPinjaman = rows.filter((r) => r.type === "pinjaman").length;
		const pending = rows.filter((r) => ["pengajuan", "proses"].includes(r.status)).length;
		const approved = rows.filter((r) => r.status === "disetujui").length;
		const approvedAmount = rows
			.filter((r) => r.status === "disetujui")
			.reduce((sum, r) => sum + (Number(r.amount_approved) || 0), 0);
		return { totalKasbon, totalPinjaman, pending, approved, approvedAmount };
	}, [rows, backendStats]);

	const filteredSummary = useMemo(() => {
		const kw = search.trim().toLowerCase();
		if (!kw) return summary;
		return summary.filter((e) => (e.employee_name || "").toLowerCase().includes(kw));
	}, [summary, search]);

	const summaryPerPage = useMemo(() => {
		if (summaryLimit === "all") return Math.max(filteredSummary.length, 1);
		const n = Number(summaryLimit);
		return Number.isFinite(n) && n > 0 ? n : 5;
	}, [summaryLimit, filteredSummary.length]);

	const summaryTotalPages = useMemo(() => {
		if (filteredSummary.length === 0) return 1;
		if (summaryLimit === "all") return 1;
		return Math.max(1, Math.ceil(filteredSummary.length / summaryPerPage));
	}, [filteredSummary.length, summaryLimit, summaryPerPage]);

	const paginatedSummary = useMemo(() => {
		if (summaryLimit === "all") return filteredSummary;
		const start = (summaryPage - 1) * summaryPerPage;
		return filteredSummary.slice(start, start + summaryPerPage);
	}, [filteredSummary, summaryLimit, summaryPage, summaryPerPage]);

	useEffect(() => {
		setSummaryPage((p) => Math.max(1, Math.min(p, summaryTotalPages)));
	}, [summaryTotalPages]);

	const inputCls =
		"w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

	return (
		<>
			<Toast toast={toast} />

			<main className="min-h-screen bg-slate-50 py-6 sm:py-10">
				<div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
					<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
						<div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
						<div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:p-8">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
									<HiOutlineBanknotes className="h-5 w-5 text-white" />
								</div>
								<div>
									<h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
										Kasbon &amp; Pinjaman Cleanox
									</h1>
									<p className="mt-1 text-sm text-white/70">
										Approval kasbon dan pinjaman karyawan
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									setEditData(null);
									setFormOpen(true);
								}}
								className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-white/25"
							>
								<HiOutlinePlus className="h-4 w-4" /> Tambah Pengajuan
							</button>
						</div>
					</section>

					<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
						<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
							<HiOutlineFunnel className="h-4 w-4 text-slate-400" /> Filter
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
								<select
									value={periodMode}
									onChange={(e) => {
										setPeriodMode(e.target.value);
										setPage(1);
									}}
									className={inputCls}
								>
									<option value="cutoff">Periode Cutoff</option>
									<option value="today">Hari Ini</option>
									<option value="custom">Custom Tanggal</option>
								</select>
							</label>

							{periodMode === "cutoff" && (
								<label className="text-sm text-slate-600">
									<span className="mb-1 block text-xs font-semibold text-slate-500">
										Bulan Periode Cutoff
									</span>
									<select
										value={cutoffMonth}
										onChange={(e) => {
											setCutoffMonth(Number(e.target.value));
											setPage(1);
										}}
										className={inputCls}
									>
										{PERIOD_MONTHS.map((m) => (
											<option key={m.value} value={m.value}>
												{m.label}
											</option>
										))}
									</select>
								</label>
							)}
							{periodMode === "custom" && (
								<label className="text-sm text-slate-600">
									<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
									<input
										type="date"
										value={customStart}
										onChange={(e) => {
											setCustomStart(e.target.value);
											setPage(1);
										}}
										className={inputCls}
									/>
								</label>
							)}
							{periodMode === "today" && <div />}

							{periodMode === "cutoff" && (
								<label className="text-sm text-slate-600">
									<span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
									<select
										value={cutoffYear}
										onChange={(e) => {
											setCutoffYear(Number(e.target.value));
											setPage(1);
										}}
										className={inputCls}
									>
										{yearOptions.map((y) => (
											<option key={y} value={y}>
												{y}
											</option>
										))}
									</select>
								</label>
							)}
							{periodMode === "custom" && (
								<label className="text-sm text-slate-600">
									<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
									<input
										type="date"
										value={customEnd}
										onChange={(e) => {
											setCustomEnd(e.target.value);
											setPage(1);
										}}
										className={inputCls}
									/>
								</label>
							)}
							{periodMode === "today" && <div />}
						</div>

						<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Tipe</span>
								<select
									value={filterType}
									onChange={(e) => {
										setFilterType(e.target.value);
										setPage(1);
									}}
									className={inputCls}
								>
									<option value="">Semua Tipe</option>
									<option value="kasbon">Kasbon</option>
									<option value="pinjaman">Pinjaman</option>
								</select>
							</label>
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
								<select
									value={filterStatus}
									onChange={(e) => {
										setFilterStatus(e.target.value);
										setPage(1);
									}}
									className={inputCls}
								>
									<option value="">Semua Status</option>
									<option value="pengajuan">Pengajuan</option>
									<option value="proses">Proses</option>
									<option value="disetujui">Disetujui</option>
									<option value="ditolak">Ditolak</option>
								</select>
							</label>
							<div />
						</div>

						<div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-[#1b3459]">
							<span className="font-semibold">Periode aktif:</span>
							<span>
								{fmtDate(activePeriod.start)} — {fmtDate(activePeriod.end)}
							</span>
						</div>

						<div className="mt-3 flex flex-1 gap-2">
							<div className="relative flex-1">
								<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Cari karyawan, keperluan..."
									className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>
							{hasFilter && (
								<button
									type="button"
									onClick={resetFilter}
									className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
								>
									<HiOutlineXMark className="h-4 w-4" /> Reset
								</button>
							)}
							<div className="flex shrink-0 items-center gap-2">
								<span className="text-xs text-slate-500">Per halaman:</span>
								<select
									value={limit}
									onChange={(e) => {
										setLimit(Number(e.target.value));
										setPage(1);
									}}
									className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
								>
									{[25, 50, 100].map((n) => (
										<option key={n} value={n}>
											{n}
										</option>
									))}
									<option value={9999}>Semua</option>
								</select>
							</div>
						</div>
					</section>

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
						{[
							{ label: "Kasbon", value: stats.totalKasbon, icon: HiOutlineBanknotes, cls: "text-sky-700 bg-sky-50" },
							{
								label: "Pinjaman",
								value: stats.totalPinjaman,
								icon: HiOutlineCreditCard,
								cls: "text-cyan-600 bg-cyan-50",
							},
							{ label: "Menunggu", value: stats.pending, icon: HiOutlineClock, cls: "text-amber-600 bg-amber-50" },
							{
								label: "Disetujui",
								value: stats.approved,
								icon: HiOutlineCheckCircle,
								cls: "text-emerald-600 bg-emerald-50",
							},
							{
								label: "Jumlah Disetujui",
								value: fmtRupiah(stats.approvedAmount),
								icon: HiOutlineClipboardDocumentCheck,
								cls: "text-[#1b3459] bg-slate-100",
							},
						].map((s) => (
							<div
								key={s.label}
								className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
							>
								<div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", s.cls)}>
									<s.icon className="h-5 w-5" />
								</div>
								<div>
									<p className="text-xs text-slate-400">{s.label}</p>
									<p className="whitespace-nowrap text-xl font-bold text-slate-800">{s.value}</p>
								</div>
							</div>
						))}
					</div>

					<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
							<div className="flex items-center gap-2">
								<HiOutlineUserGroup className="h-5 w-5 text-[#1b3459]" />
								<h2 className="text-base font-bold text-slate-800">Ringkasan Per Karyawan</h2>
							</div>
							<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
								{filteredSummary.length.toLocaleString("id-ID")} karyawan
							</span>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								<thead className="bg-slate-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
											Karyawan
										</th>
										<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
											Kasbon
										</th>
										<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
											Pinjaman
										</th>
										<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
											Total
										</th>
										<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
											Sisa
										</th>
									</tr>
								</thead>
								<tbody>
									{summaryLoading &&
										Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
									{!summaryLoading && paginatedSummary.length === 0 && (
										<tr>
											<td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
												Tidak ada ringkasan di periode ini
											</td>
										</tr>
									)}
									{!summaryLoading &&
										paginatedSummary.map((emp) => (
											<tr key={emp.employee_id} className="border-t border-slate-100 hover:bg-slate-50">
												<td className="px-4 py-3 text-xs font-semibold text-slate-800">
													{toTitleCase(emp.employee_name)}
												</td>
												<td className="px-4 py-3 text-right text-xs text-slate-600">
													{fmtRupiah(emp.kasbon_total)}
													<span className="ml-1 text-slate-400">({emp.kasbon_count})</span>
												</td>
												<td className="px-4 py-3 text-right text-xs text-slate-600">
													{fmtRupiah(emp.pinjaman_total)}
													<span className="ml-1 text-slate-400">({emp.pinjaman_count})</span>
												</td>
												<td className="px-4 py-3 text-right text-xs font-bold text-slate-800">
													{fmtRupiah(emp.total_all)}
												</td>
												<td className="px-4 py-3 text-right text-xs font-semibold text-amber-700">
													{Number(emp.sisa) > 0 ? fmtRupiah(emp.sisa) : (
														<span className="text-emerald-600">Nihil</span>
													)}
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
						{!summaryLoading && filteredSummary.length > 0 && (
							<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
								<div className="flex items-center gap-2 text-xs text-slate-500">
									<span>Tampil</span>
									<select
										value={summaryLimit}
										onChange={(e) => {
											setSummaryLimit(e.target.value);
											setSummaryPage(1);
										}}
										className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
									>
										<option value="5">5</option>
										<option value="10">10</option>
										<option value="all">Semua</option>
									</select>
								</div>
								{summaryTotalPages > 1 && (
									<div className="flex items-center gap-1">
										<button
											type="button"
											disabled={summaryPage <= 1}
											onClick={() => setSummaryPage((p) => p - 1)}
											className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
										>
											<HiOutlineChevronLeft className="h-4 w-4" />
										</button>
										{generatePages(summaryPage, summaryTotalPages).map((p, i) =>
											p === "..." ? (
												<span key={`se-${i}`} className="select-none px-1 text-xs text-slate-400">
													…
												</span>
											) : (
												<button
													key={p}
													type="button"
													onClick={() => setSummaryPage(p)}
													className={cn(
														"inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition",
														p === summaryPage
															? "border-[#1b3459] bg-[#1b3459] text-white"
															: "border-slate-200 text-slate-600 hover:bg-slate-50"
													)}
												>
													{p}
												</button>
											)
										)}
										<button
											type="button"
											disabled={summaryPage >= summaryTotalPages}
											onClick={() => setSummaryPage((p) => p + 1)}
											className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
										>
											<HiOutlineChevronRight className="h-4 w-4" />
										</button>
									</div>
								)}
							</div>
						)}
					</section>

					<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
							<div className="flex items-center gap-2">
								<HiOutlineBanknotes className="h-5 w-5 text-[#1b3459]" />
								<h2 className="text-base font-bold text-slate-800">Daftar Kasbon &amp; Pinjaman</h2>
							</div>
							<div className="flex items-center gap-2">
								<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
									{(pagination.total || 0).toLocaleString("id-ID")} data
								</span>
								<button
									type="button"
									onClick={handleExport}
									disabled={exporting}
									className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#1b3459] transition hover:bg-slate-100 disabled:opacity-50"
								>
									{exporting ? (
										<div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1b3459]" />
									) : (
										<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
									)}
									{exporting ? "Memproses..." : "Export Excel"}
								</button>
							</div>
						</div>

						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								<thead className="bg-slate-50">
									<tr>
										<SortTh col="submission_date" label="Tanggal" sort={sort} onSort={handleSort} />
										<SortTh col="employee_name" label="Karyawan" sort={sort} onSort={handleSort} />
										<SortTh col="type" label="Tipe" sort={sort} onSort={handleSort} />
										<SortTh col="amount_requested" label="Jumlah Diajukan" sort={sort} onSort={handleSort} />
										<SortTh col="amount_approved" label="Disetujui" sort={sort} onSort={handleSort} />
										<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
											Cicilan
										</th>
										<SortTh col="status" label="Status" sort={sort} onSort={handleSort} />
										<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
											Bukti
										</th>
										<th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
											Aksi
										</th>
									</tr>
								</thead>
								<tbody>
									{loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={9} />)}
									{!loading && sortedRows.length === 0 && (
										<tr>
											<td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
												Belum ada data pengajuan
											</td>
										</tr>
									)}
									{!loading &&
										sortedRows.map((row) => (
											<tr
												key={row.id}
												className="border-t border-slate-100 transition-colors hover:bg-slate-50"
											>
												<td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
													{fmtDate(row.submission_date)}
												</td>
												<td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
													{toTitleCase(row.employee_name)}
												</td>
												<td className="px-4 py-3.5">
													<TypeBadge type={row.type} />
												</td>
												<td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-slate-700">
													{fmtRupiah(row.amount_requested)}
												</td>
												<td className="whitespace-nowrap px-4 py-3.5 text-xs font-bold text-emerald-700">
													{row.amount_approved ? (
														fmtRupiah(row.amount_approved)
													) : (
														<span className="font-normal text-slate-300">-</span>
													)}
												</td>
												<td className="px-4 py-3.5">
													{row.type === "pinjaman" && row.status === "disetujui" ? (
														(row.remaining ?? 1) <= 0 ? (
															<span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold tracking-wide text-emerald-700">
																LUNAS
															</span>
														) : (
															<div className="min-w-[120px]">
																<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
																	<div
																		className="h-full rounded-full bg-[#1b3459]"
																		style={{
																			width: `${Math.min(
																				100,
																				((row.total_paid || 0) / Number(row.amount_approved || 1)) * 100
																			)}%`,
																		}}
																	/>
																</div>
																<p className="mt-0.5 text-xs text-slate-400">
																	Sisa {fmtRupiah(row.remaining)}
																</p>
															</div>
														)
													) : (
														<span className="text-xs text-slate-300">-</span>
													)}
												</td>
												<td className="px-4 py-3.5">
													<StatusBadge status={row.status} />
												</td>
												<td className="px-4 py-3.5">
													<PhotoThumb url={row.proof_url} />
												</td>
												<td className="px-4 py-3.5 text-right">
													<div className="inline-flex items-center gap-1.5">
														<button
															type="button"
															onClick={() => setDetailModal({ open: true, rowId: row.id })}
															className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-[#1b3459] transition hover:bg-slate-100"
														>
															<HiOutlineInformationCircle className="h-3.5 w-3.5" /> Detail
														</button>
														{!["disetujui", "ditolak"].includes(row.status) && (
															<button
																type="button"
																onClick={() => setStatusModal({ open: true, row })}
																className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50/50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
															>
																<HiOutlineClipboardDocumentCheck className="h-3.5 w-3.5" /> Status
															</button>
														)}
														<button
															type="button"
															onClick={() => {
																setEditData(row);
																setFormOpen(true);
															}}
															className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#1b3459]"
															title="Edit"
														>
															<HiOutlinePencilSquare className="h-4 w-4" />
														</button>
														<button
															type="button"
															onClick={() => setDeleteTarget(row)}
															className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
															title="Hapus"
														>
															<HiOutlineTrash className="h-4 w-4" />
														</button>
													</div>
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>

						{!loading && pagination.totalPages > 1 && (
							<div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
								<p className="text-xs text-slate-500">
									Halaman {pagination.page} dari {pagination.totalPages}
								</p>
								<div className="flex items-center gap-1">
									<button
										type="button"
										disabled={page <= 1}
										onClick={() => setPage((p) => p - 1)}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
									>
										<HiOutlineChevronLeft className="h-4 w-4" />
									</button>
									{generatePages(page, pagination.totalPages).map((p, i) =>
										p === "..." ? (
											<span key={`pe-${i}`} className="select-none px-1 text-xs text-slate-400">
												…
											</span>
										) : (
											<button
												key={p}
												type="button"
												onClick={() => setPage(p)}
												className={cn(
													"inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition",
													p === page
														? "border-[#1b3459] bg-[#1b3459] text-white"
														: "border-slate-200 text-slate-600 hover:bg-slate-50"
												)}
											>
												{p}
											</button>
										)
									)}
									<button
										type="button"
										disabled={page >= pagination.totalPages}
										onClick={() => setPage((p) => p + 1)}
										className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
									>
										<HiOutlineChevronRight className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
					</section>
				</div>
			</main>

			<FormModal
				open={formOpen}
				onClose={() => {
					setFormOpen(false);
					setEditData(null);
				}}
				onSaved={() => {
					showToast(editData ? "Pengajuan berhasil diperbarui" : "Pengajuan berhasil dibuat");
					fetchData();
				}}
				employees={employees}
				editData={editData}
			/>

			<StatusModal
				open={statusModal.open}
				onClose={() => setStatusModal({ open: false, row: null })}
				onSaved={() => {
					showToast("Status berhasil diperbarui");
					fetchData();
				}}
				row={statusModal.row}
			/>

			<DetailModal
				open={detailModal.open}
				onClose={() => setDetailModal({ open: false, rowId: null })}
				rowId={detailModal.rowId}
				onRefresh={fetchData}
			/>

			<ConfirmDeleteModal
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={handleDelete}
				loading={deleting}
				title="Hapus Pengajuan"
				desc={`Hapus pengajuan ${deleteTarget?.employee_name || ""}?`}
			/>
		</>
	);
}
