import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlineAdjustmentsHorizontal,
	HiOutlineArrowDownTray,
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
	HiOutlinePencilSquare,
	HiOutlinePhoto,
	HiOutlinePlus,
	HiOutlineTrash,
	HiOutlineUser,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { exportManagementAbsensiExcel } from "../utils/exportManajemenAbsensiExcel";

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
		cutoffStartDay: startDay,
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

function StatCard({ title, value, subtitle, tone = "blue", Icon, onClick }) {
	const Tag = onClick ? "button" : "div";
	return (
		<Tag
			type={onClick ? "button" : undefined}
			onClick={onClick}
			className={cn(
				"rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm text-left w-full",
				onClick && "cursor-pointer transition hover:shadow-md hover:border-slate-300 active:scale-[0.99]",
			)}
		>
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
			{onClick && (
				<p className="mt-2 text-[11px] font-semibold text-slate-400">Lihat detail →</p>
			)}
		</Tag>
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
					<HiOutlineChevronUp className="h-3.5 w-3.5 opacity-30" />
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

function toDateTimeLocalInput(value) {
	if (!value) return "";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditAttendanceModal({ item, onClose, onSaved }) {
	const [checkIn, setCheckIn] = useState(toDateTimeLocalInput(item?.check_in_time));
	const [checkOut, setCheckOut] = useState(toDateTimeLocalInput(item?.check_out_time));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (checkIn && checkOut && checkOut <= checkIn) {
			setError("Jam keluar harus lebih besar dari jam masuk");
			return;
		}

		try {
			setSaving(true);
			await api(`/ikm/absensi-manajemen/management/${item.mgmt_record_id}`, {
				method: "PUT",
				body: JSON.stringify({
					check_in_time: checkIn || null,
					check_out_time: checkOut || null,
				}),
			});
			onSaved();
		} catch (err) {
			setError(err.message || "Gagal menyimpan perubahan");
		} finally {
			setSaving(false);
		}
	};

	useEffect(() => {
		const onKey = (e) => { if (e.key === "Escape") onClose(); };
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	if (!item) return null;

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<div>
						<h3 className="text-base font-bold text-slate-800">Edit Jam Absensi</h3>
						<p className="mt-0.5 text-xs text-slate-400">Ubah jam absen in/out untuk record ini</p>
					</div>
					<button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>

				<div className="px-5 py-4 space-y-3">
					<div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs space-y-1">
						<p className="font-bold text-slate-700">{item.employee_name}</p>
						<p className="text-slate-400">{item.employee_code || "-"}</p>
						<div className="flex items-center gap-2 mt-1">
							<span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">MANAJEMEN</span>
							<span className="text-slate-500">{formatDateOnly(item.work_date)}</span>
						</div>
					</div>

					{error && (
						<div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
					)}
				</div>

				<form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
					<label className="block text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Jam Absen In</span>
						<input
							type="datetime-local"
							value={checkIn}
							onChange={(e) => setCheckIn(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
						/>
					</label>
					<label className="block text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Jam Absen Out</span>
						<input
							type="datetime-local"
							value={checkOut}
							onChange={(e) => setCheckOut(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
						/>
					</label>
					<div className="flex gap-2 pt-1">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={saving}
							className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
						>
							{saving ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function DeleteAttendanceModal({ item, onClose, onConfirm, deleting, error }) {
	useEffect(() => {
		const onKey = (e) => { if (e.key === "Escape") onClose(); };
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	if (!item) return null;

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
							<HiOutlineTrash className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-base font-bold text-slate-800">Hapus Record Absensi</h3>
							<p className="mt-0.5 text-xs text-slate-400">Pastikan record yang dipilih sudah benar</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={deleting}
						className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-60"
						aria-label="Tutup modal"
					>
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>

				<div className="px-5 py-4 space-y-3">
					<div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs space-y-1">
						<p className="font-bold text-slate-700">{item.employee_name || "-"}</p>
						<p className="text-slate-400">{item.employee_code || "-"}</p>
						<div className="flex flex-wrap items-center gap-2 mt-1">
							<span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">MANAJEMEN</span>
							<span className="text-slate-500">{formatDateOnly(item.work_date)}</span>
						</div>
						<div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
							<div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
								<p className="font-semibold text-slate-400 uppercase tracking-wider">Absen In</p>
								<p className="mt-0.5 text-slate-700">{formatDateTime(item.check_in_time)}</p>
							</div>
							<div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
								<p className="font-semibold text-slate-400 uppercase tracking-wider">Absen Out</p>
								<p className="mt-0.5 text-slate-700">{formatDateTime(item.check_out_time)}</p>
							</div>
						</div>
					</div>

					<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
						<p className="font-bold">Peringatan</p>
						<p className="mt-0.5">Aksi ini akan menghapus record secara permanen dan tidak bisa dibatalkan.</p>
					</div>

					{error && (
						<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
							<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							{error}
						</div>
					)}
				</div>

				<div className="flex gap-2 px-5 pb-5 pt-1">
					<button
						type="button"
						onClick={onClose}
						disabled={deleting}
						className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={deleting}
						className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
					>
						{deleting ? "Menghapus..." : "Hapus"}
					</button>
				</div>
			</div>
		</div>
	);
}

function AddManagementAbsensiModal({ employeeOptions, onClose, onSaved }) {
	const todayVal = toDateInput(new Date());
	const [employeeId, setEmployeeId] = useState("");
	const [workDate, setWorkDate] = useState(todayVal);
	const [checkIn, setCheckIn] = useState("");
	const [checkOut, setCheckOut] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [empSearch, setEmpSearch] = useState("");
	const [empDropOpen, setEmpDropOpen] = useState(false);
	const empDropRef = useRef(null);

	const filteredEmps = useMemo(() => {
		const kw = empSearch.trim().toLowerCase();
		if (!kw) return employeeOptions;
		return employeeOptions.filter((e) =>
			String(e.employee_name || "").toLowerCase().includes(kw) ||
			String(e.employee_code || "").toLowerCase().includes(kw) ||
			String(e.employee_id || "").includes(kw)
		);
	}, [employeeOptions, empSearch]);

	const selectedEmp = useMemo(
		() => employeeOptions.find((e) => String(e.employee_id) === String(employeeId)) || null,
		[employeeOptions, employeeId]
	);

	useEffect(() => {
		if (!empDropOpen) return;
		const onDown = (e) => {
			if (empDropRef.current && !empDropRef.current.contains(e.target)) setEmpDropOpen(false);
		};
		window.addEventListener("mousedown", onDown);
		window.addEventListener("touchstart", onDown);
		return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("touchstart", onDown); };
	}, [empDropOpen]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!employeeId) { setError("Pilih karyawan terlebih dahulu"); return; }
		if (!workDate) { setError("Tanggal kerja wajib diisi"); return; }
		if (checkIn && checkOut && checkOut <= checkIn) {
			setError("Jam keluar harus lebih besar dari jam masuk");
			return;
		}

		try {
			setSaving(true);
			await api("/ikm/absensi-manajemen/management", {
				method: "POST",
				body: JSON.stringify({
					employee_id: Number(employeeId),
					work_date: workDate,
					check_in_time: checkIn || null,
					check_out_time: checkOut || null,
				}),
			});
			onSaved();
		} catch (err) {
			setError(err.message || "Gagal menambahkan absensi");
		} finally {
			setSaving(false);
		}
	};

	useEffect(() => {
		const onKey = (e) => { if (e.key === "Escape") onClose(); };
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
							<HiOutlinePlus className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-slate-800">Tambah Absensi Manajemen</h3>
							<p className="text-[11px] text-slate-400">Input absensi manajemen manual oleh admin</p>
						</div>
					</div>
					<button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5 space-y-4">
					{error && (
						<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
							<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							{error}
						</div>
					)}

					{/* Employee picker */}
					<div>
						<span className="mb-1.5 block text-xs font-semibold text-slate-500">Pilih Karyawan Manajemen</span>
						<div className="relative" ref={empDropRef}>
							<button
								type="button"
								onClick={() => setEmpDropOpen((v) => !v)}
								className={cn(
									"flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition outline-none",
									selectedEmp
										? "border-purple-300 bg-purple-50/40 text-slate-800 ring-2 ring-purple-500/15"
										: "border-slate-200 bg-white text-slate-400 hover:border-slate-300",
								)}
							>
								{selectedEmp ? (
									<span className="flex items-center gap-2 min-w-0">
										<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
											{String(selectedEmp.employee_name || "?")[0].toUpperCase()}
										</span>
										<span className="min-w-0">
											<span className="flex items-baseline gap-1.5 min-w-0">
												<span className="truncate text-sm font-semibold text-slate-800">{selectedEmp.employee_name}</span>
												<span className="shrink-0 text-[11px] text-slate-400">{selectedEmp.employee_code || `ID ${selectedEmp.employee_id}`}</span>
											</span>
										</span>
									</span>
								) : (
									<span className="flex items-center gap-2 text-slate-400 text-sm">
										<HiOutlineMagnifyingGlass className="h-4 w-4" />
										Cari & pilih karyawan...
									</span>
								)}
								<HiOutlineChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", empDropOpen && "rotate-180")} />
							</button>

							{empDropOpen && (
								<div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
									<div className="border-b border-slate-100 p-2">
										<div className="relative">
											<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
											<input
												autoFocus
												type="text"
												value={empSearch}
												onChange={(e) => setEmpSearch(e.target.value)}
												placeholder="Ketik nama, kode NIK, atau ID..."
												className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
											/>
										</div>
									</div>
									<ul className="max-h-52 overflow-y-auto py-1">
										{filteredEmps.length === 0 ? (
											<li className="px-4 py-6 text-center text-xs text-slate-400">Karyawan tidak ditemukan</li>
										) : (
											filteredEmps.map((emp) => {
												const isSelected = String(emp.employee_id) === String(employeeId);
												return (
													<li key={emp.employee_id}>
														<button
															type="button"
															onClick={() => { setEmployeeId(String(emp.employee_id)); setEmpDropOpen(false); setEmpSearch(""); }}
															className={cn(
																"flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition",
																isSelected
																	? "bg-purple-50 text-purple-700"
																	: "text-slate-700 hover:bg-slate-50",
															)}
														>
															<span className={cn(
																"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
																isSelected ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"
															)}>
																{String(emp.employee_name || "?")[0].toUpperCase()}
															</span>
															<span className="min-w-0">
																<span className="block truncate font-semibold">{emp.employee_name}</span>
																<span className="block text-[11px] text-slate-400">{emp.employee_code || `ID ${emp.employee_id}`}</span>
															</span>
															{isSelected && <HiOutlineCheckCircle className="ml-auto h-4 w-4 shrink-0 text-purple-500" />}
														</button>
													</li>
												);
											})
										)
										}
									</ul>
								</div>
							)}
						</div>
					</div>


					{/* Work date */}
					<div>
						<span className="mb-1.5 block text-xs font-semibold text-slate-500">Tanggal Kerja</span>
						<input
							type="date"
							value={workDate}
							onChange={(e) => setWorkDate(e.target.value)}
							required
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
						/>
					</div>

					{/* Info box */}
					<div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-700">
						<div className="flex items-start gap-2">
							<HiOutlineUser className="mt-0.5 h-4 w-4 shrink-0" />
							<p>Absensi manajemen tidak menggunakan shift. Cukup isi tanggal dan jam absen in/out.</p>
						</div>
					</div>

					{/* Time inputs */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<span className="mb-1.5 block text-xs font-semibold text-slate-500">
								Jam Absen In <span className="font-normal text-slate-400">(opsional)</span>
							</span>
							<input
								type="datetime-local"
								value={checkIn}
								onChange={(e) => setCheckIn(e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
							/>
						</div>
						<div>
							<span className="mb-1.5 block text-xs font-semibold text-slate-500">
								Jam Absen Out <span className="font-normal text-slate-400">(opsional)</span>
							</span>
							<input
								type="datetime-local"
								value={checkOut}
								onChange={(e) => setCheckOut(e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
							/>
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-2 pt-1">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={saving}
							className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
						>
							{saving ? "Menyimpan..." : "Tambah Absensi"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default function AbsensiManajemenIKM() {
	const todayStr = useMemo(() => toDateInput(new Date()), []);
	const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date(), 26), []);
	const cutoffStartDay = 26;

	const [periodMode, setPeriodMode] = useState("cutoff");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
	const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);

	const [filters, setFilters] = useState({ onlyIncomplete: false });
	const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
	const [employeeOptions, setEmployeeOptions] = useState([]);
	const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
	const [employeeOptionSearch, setEmployeeOptionSearch] = useState("");
	const employeeDropdownRef = useRef(null);
	const fetchInFlightRef = useRef(false);

	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [summary, setSummary] = useState(null);
	const [employeeSummary, setEmployeeSummary] = useState([]);
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [photoViewer, setPhotoViewer] = useState(null);
	const [editModal, setEditModal] = useState(null);
	const [deletingId, setDeletingId] = useState(null);
	const [deleteModal, setDeleteModal] = useState(null);
	const [deleteError, setDeleteError] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [sort, setSort] = useState({ col: "check_in_time", dir: "desc" });
	const [addModal, setAddModal] = useState(false);

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
		document.title = "Dashboard Absen Manajemen IKM | Alora Group Indonesia";
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
				if (selectedEmployeeIds.length > 0) qs.set("employeeIds", selectedEmployeeIds.join(","));
				if (filters.onlyIncomplete) qs.set("onlyIncomplete", "1");
				if (statusFilter) qs.set("status", statusFilter);

				const response = await api(`/ikm/absensi-manajemen/management?${qs.toString()}`);

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
					setError(err.message || "Gagal mengambil data absensi manajemen");
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
			filters.onlyIncomplete,
			selectedEmployeeIds,
			statusFilter,
			pagination.page,
			pagination.limit,
		],
	);

	useEffect(() => {
		fetchAbsensi();
	}, [fetchAbsensi]);

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

	const openDeleteModal = useCallback((row) => {
		if (!row?.mgmt_record_id) return;
		setDeleteError("");
		setDeleteModal(row);
	}, []);

	const confirmDelete = useCallback(
		async () => {
			const row = deleteModal;
			const id = row?.mgmt_record_id;
			if (!id) return;

			try {
				setDeleteError("");
				setDeletingId(id);
				await api(`/ikm/absensi-manajemen/management/${id}`, { method: "DELETE" });
				setDeleteModal(null);
				await fetchAbsensi({ silent: true });
			} catch (err) {
				console.error("Gagal menghapus record:", err);
				setDeleteError(err.message || "Gagal menghapus record");
			} finally {
				setDeletingId(null);
			}
		},
		[deleteModal, fetchAbsensi],
	);

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
			if (["work_date", "check_in_time", "check_out_time"].includes(sort.col)) {
				const ta = a[sort.col] ? new Date(a[sort.col]).getTime() : 0;
				const tb = b[sort.col] ? new Date(b[sort.col]).getTime() : 0;
				return (ta - tb) * dir;
			}
			return String(a[sort.col] ?? "").localeCompare(String(b[sort.col] ?? "")) * dir;
		});
	}, [records, statusFilter, sort]);

	const statusOptions = useMemo(() => [...new Set(records.map((r) => r.status_label).filter(Boolean))], [records]);
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

	const resetFilters = () => {
		const resetCutoff = getDefaultCutoffSelection(new Date(), 26);
		setPeriodMode("cutoff");
		setCutoffMonth(resetCutoff.cutoffMonth);
		setCutoffYear(resetCutoff.cutoffYear);
		setCustomStartDate(resetCutoff.startDate);
		setCustomEndDate(resetCutoff.endDate);
		setFilters({ onlyIncomplete: false });
		setSelectedEmployeeIds([]);
		setEmployeeOptionSearch("");
		setEmployeeDropdownOpen(false);
		setPagination((prev) => ({ ...prev, page: 1 }));
		setStatusFilter("");
		setSort({ col: "check_in_time", dir: "desc" });
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

	return (
		<main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
			<div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">
				{/* Header */}
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-700 p-5 shadow-sm sm:p-6">
					<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
					<div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-purple-300/10 blur-3xl" />
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="relative max-w-3xl">
							<h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Dashboard Absen Manajemen</h1>
							<p className="mt-2 text-sm text-white/80 sm:text-base">
								Pantau absensi karyawan manajemen per periode cutoff.
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

				{/* Filter Section */}
				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
					<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
								<HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
							</div>
							<div>
								<h2 className="text-base font-bold text-slate-800">Filter Periode & Data</h2>
								<p className="text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
							</div>
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

						{/* Employee filter */}
						<div className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Cari Manajemen</span>
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
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
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

				{/* Stats */}
				<section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
					<StatCard
						title="Total Record"
						value={summary?.totalRecords ?? 0}
						subtitle="Total record absensi pada periode aktif"
						tone="blue"
						Icon={HiOutlineDocumentCheck}
					/>
					<StatCard
						title="Lengkap"
						value={summary?.completeCount ?? 0}
						subtitle="Record dengan check-in & check-out"
						tone="emerald"
						Icon={HiOutlineCheckCircle}
					/>
					<StatCard
						title="Belum Lengkap"
						value={summary?.incompleteCount ?? 0}
						subtitle="Record yang belum check-in/out"
						tone="rose"
						Icon={HiOutlineExclamationTriangle}
					/>
					<StatCard
						title="Sudah Check-In"
						value={summary?.checkedInCount ?? 0}
						subtitle="Total karyawan sudah absen masuk"
						tone="amber"
						Icon={HiOutlineClock}
					/>
				</section>

				{/* Employee Summary */}
				{employeeSummary.length > 0 && (
					<section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
						<div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-base font-bold text-slate-800">Ringkasan Per Karyawan</h2>
								<p className="mt-0.5 text-xs text-slate-500">Ringkasan performa kehadiran pada periode aktif.</p>
							</div>
						</div>

						<div className="overflow-x-auto pb-1">
							<table className="min-w-[900px] w-full table-fixed text-sm">
								<thead className="border-b border-slate-100 bg-slate-50">
									<tr>
										<th className="w-[25%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Karyawan</th>
										<th className="w-[15%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">NIK</th>
										<th className="w-[25%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Jabatan</th>
										<th className="w-[12%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Total Record</th>
										<th className="w-[11%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Lengkap</th>
										<th className="w-[12%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Belum Lengkap</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{employeeSummary.map((row) => (
										<tr key={row.employee_id} className="hover:bg-purple-50/30 transition-colors">
											<td className="px-4 py-3">
												<div className="text-sm font-semibold text-slate-800">{row.employee_name}</div>
											</td>
											<td className="px-4 py-3 text-center text-sm text-slate-600">{row.employee_code || "-"}</td>
											<td className="px-4 py-3 text-sm text-slate-600">{row.jabatan || "-"}</td>
											<td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{row.record_count}</td>
											<td className="px-4 py-3 text-center text-sm font-semibold text-emerald-700">{row.complete_count}</td>
											<td className="px-4 py-3 text-center text-sm font-semibold text-rose-700">{row.incomplete_count}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				)}

				{/* Detail Table */}
				<section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
					<div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-base font-bold text-slate-800">Detail Riwayat Absensi Manajemen</h2>
							<p className="mt-0.5 text-xs text-slate-500">
								Lihat detail tanggal masuk, jam absen in/absen out, bukti foto, dan status kelengkapan.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
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
							<button
								type="button"
								onClick={async () => {
									try {
										const qs = new URLSearchParams();
										qs.set("startDate", activePeriod.startDate);
										qs.set("endDate", activePeriod.endDate);
										qs.set("page", "1");
										qs.set("limit", "99999");
										if (selectedEmployeeIds.length > 0) qs.set("employeeIds", selectedEmployeeIds.join(","));
										if (filters.onlyIncomplete) qs.set("onlyIncomplete", "1");
										if (statusFilter) qs.set("status", statusFilter);

										const [response, leaveRes] = await Promise.all([
											api(`/ikm/absensi-manajemen/management?${qs.toString()}`),
											api(`/ikm/absensi/employee-leave-resume?startDate=${activePeriod.startDate}&endDate=${activePeriod.endDate}`),
										]);
										let allRecords = response.records || [];

										const leaveResumeMap = new Map();
										for (const item of (leaveRes?.data || [])) {
											leaveResumeMap.set(Number(item.employee_id), item);
										}

										const selectedNames = selectedEmployeeIds
											.map((id) => {
												const opt = employeeOptions.find((o) => Number(o.employee_id) === id);
												return opt?.employee_name || `ID ${id}`;
											});

										exportManagementAbsensiExcel({
											records: allRecords,
											periodLabel: activePeriodLabel,
											activePeriod,
											filters: {
												onlyIncomplete: filters.onlyIncomplete,
												selectedEmployeeNames: selectedNames,
												statusFilter,
											},
											leaveResumeMap,
										});
									} catch (err) {
										console.error("Gagal mendownload excel:", err);
										alert("Gagal mengunduh data excel: " + err.message);
									}
								}}
								className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
							>
								<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
								Download Excel
							</button>
							<button
								type="button"
								onClick={() => setAddModal(true)}
								className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
							>
								<HiOutlinePlus className="h-3.5 w-3.5" />
								Tambah Absensi
							</button>
						</div>
					</div>

					<div className="hidden md:block overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-50 border-b border-slate-100">
								<tr>
									<SortTh col="work_date" label="Tanggal" sort={sort} onSort={handleSort} />
									<SortTh col="employee_name" label="Karyawan" sort={sort} onSort={handleSort} />
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Jabatan</th>
									<SortTh col="check_in_time" label="Absen In" sort={sort} onSort={handleSort} />
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Foto In</th>
									<SortTh col="check_out_time" label="Absen Out" sort={sort} onSort={handleSort} />
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Foto Out</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Durasi</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Koordinat</th>
									<SortTh col="status_label" label="Status" sort={sort} onSort={handleSort} />
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Aksi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={11} />)}

								{!loading && displayedRecords.length === 0 && (
									<tr>
										<td colSpan={11} className="px-4 py-14 text-center">
											<div className="flex flex-col items-center gap-2 text-slate-400">
												<HiOutlineDocumentCheck className="h-9 w-9 opacity-40" />
												<p className="text-sm">Data absensi manajemen tidak ditemukan pada filter aktif.</p>
											</div>
										</td>
									</tr>
								)}

								{!loading &&
									displayedRecords.map((row) => {
										const duration = calcDuration(row.check_in_time, row.check_out_time);
										return (
											<tr key={row.mgmt_record_id} className="align-top transition-colors hover:bg-purple-50/30">
												<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDateOnly(row.work_date)}</td>
												<td className="whitespace-nowrap px-4 py-3">
													<div className="text-xs font-bold text-slate-800">{row.employee_name}</div>
													<div className="text-[11px] text-slate-400">{row.employee_code || "-"}</div>
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{row.jabatan || "-"}</td>
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
												<td className="whitespace-nowrap px-4 py-3">
													<div className="flex items-center gap-2">
														<button
															type="button"
															onClick={() => setEditModal(row)}
															className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
															title="Edit jam absensi"
														>
															<HiOutlinePencilSquare className="h-3.5 w-3.5" />
															Edit
														</button>
														<button
															type="button"
															onClick={() => openDeleteModal(row)}
															disabled={deletingId === row.mgmt_record_id}
															className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
															title="Hapus record absensi"
														>
															<HiOutlineTrash className="h-3.5 w-3.5" />
															{deletingId === row.mgmt_record_id ? "Menghapus..." : "Delete"}
														</button>
													</div>
												</td>
											</tr>
										);
									})}
							</tbody>
						</table>
					</div>

					<PaginationBar pagination={pagination} onPage={handlePage} onLimitChange={handleLimitChange} loading={loading} />
				</section>
			</div>

			<PhotoViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
			<DeleteAttendanceModal
				item={deleteModal}
				onClose={() => {
					if (deletingId) return;
					setDeleteModal(null);
					setDeleteError("");
				}}
				onConfirm={confirmDelete}
				deleting={Boolean(deletingId && deleteModal && deletingId === deleteModal.mgmt_record_id)}
				error={deleteError}
			/>
			{editModal && (
				<EditAttendanceModal
					item={editModal}
					onClose={() => setEditModal(null)}
					onSaved={() => {
						setEditModal(null);
						fetchAbsensi({ silent: true });
					}}
				/>
			)}
			{addModal && (
				<AddManagementAbsensiModal
					employeeOptions={employeeOptions}
					onClose={() => setAddModal(false)}
					onSaved={() => {
						setAddModal(false);
						fetchAbsensi({ silent: true });
					}}
				/>
			)}
		</main>
	);
}