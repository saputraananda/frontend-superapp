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
	HiOutlinePencilSquare,
	HiOutlinePlus,
	HiOutlinePhoto,
	HiOutlineXMark,
	HiOutlineClipboardDocumentList,
	HiOutlineArrowDownTray,
	HiOutlinePrinter,
} from "react-icons/hi2";
import { BASE_URL, api } from "../../../lib/api";
import { exportAbsensiExcel } from "../utils/exportAbsensiExcel";

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
				<p className="mt-2 text-[11px] font-semibold text-slate-400 group-hover:text-slate-500">Lihat detail →</p>
			)}
		</Tag>
	);
}

const ROLE_STYLE = {
	management: { cls: "bg-purple-50 text-purple-700 border-purple-200", label: "Management" },
	deputi: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Deputi" },
	leader: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Leader" },
	staff: { cls: "bg-slate-50 text-slate-600 border-slate-200", label: "Staff" },
};

function RoleBadge({ role }) {
	const key = String(role || "staff").toLowerCase();
	const { cls, label } = ROLE_STYLE[key] ?? ROLE_STYLE.staff;
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls)}>
			{label}
		</span>
	);
}

function ShiftBadge({ type, isValet }) {
	const style = SHIFT_STYLE[type] ?? "bg-slate-50 text-slate-600 border-slate-200";
	const isValetTruthy = Boolean(isValet) || isValet === 1 || isValet === "1";
	const text = String(type || "").toUpperCase() + (isValetTruthy ? " (VALET)" : "");

	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", style)}>
			{text}
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

function MobileAttendanceCard({ row, onOpenPhoto, onEdit }) {
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
			<div className="flex justify-end pt-1">
				<button
					type="button"
					onClick={() => onEdit(row)}
					className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
				>
					<HiOutlinePencilSquare className="h-3.5 w-3.5" />
					Edit Jam
				</button>
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
			await api(`/ikm/absensi/shifts/${item.shift_record_id}`, {
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
							<ShiftBadge type={item.shift_type} isValet={item.is_valet} />
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

function AddAttendanceModal({ employeeOptions, onClose, onSaved }) {
	const todayVal = toDateInput(new Date());
	const [employeeId, setEmployeeId] = useState("");
	const [workDate, setWorkDate] = useState(todayVal);
	const [shiftType, setShiftType] = useState("pagi");
	const [isValet, setIsValet] = useState(false);
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
			await api("/ikm/absensi/shifts", {
				method: "POST",
				body: JSON.stringify({
					employee_id: Number(employeeId),
					work_date: workDate,
					shift_type: shiftType,
					is_valet: isValet,
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

	const SHIFT_LABELS = { pagi: "Pagi", siang: "Siang", sore: "Sore", lembur: "Lembur" };
	const SHIFT_COLORS = {
		pagi: "bg-sky-50 text-sky-700 border-sky-200",
		siang: "bg-amber-50 text-amber-700 border-amber-200",
		sore: "bg-orange-50 text-orange-700 border-orange-200",
		lembur: "bg-purple-50 text-purple-700 border-purple-200",
	};

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
							<HiOutlinePlus className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-slate-800">Tambah Absensi Manual</h3>
							<p className="text-[11px] text-slate-400">Input absensi darurat oleh admin</p>
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
						<span className="mb-1.5 block text-xs font-semibold text-slate-500">Pilih Karyawan</span>
						<div className="relative" ref={empDropRef}>
							<button
								type="button"
								onClick={() => setEmpDropOpen((v) => !v)}
								className={cn(
									"flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition outline-none",
									selectedEmp
										? "border-blue-300 bg-blue-50/40 text-slate-800 ring-2 ring-blue-500/15"
										: "border-slate-200 bg-white text-slate-400 hover:border-slate-300",
								)}
							>
								{selectedEmp ? (
									<span className="flex items-center gap-2 min-w-0">
										<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
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
																	? "bg-blue-50 text-blue-700"
																	: "text-slate-700 hover:bg-slate-50",
															)}
														>
															<span className={cn(
																"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
																isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
															)}>
																{String(emp.employee_name || "?")[0].toUpperCase()}
															</span>
															<span className="min-w-0">
																<span className="block truncate font-semibold">{emp.employee_name}</span>
																<span className="block text-[11px] text-slate-400">{emp.employee_code || `ID ${emp.employee_id}`}</span>
															</span>
															{isSelected && <HiOutlineCheckCircle className="ml-auto h-4 w-4 shrink-0 text-blue-500" />}
														</button>
													</li>
												);
											})
										)}
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

					{/* Shift pills + valet */}
					<div>
						<span className="mb-1.5 block text-xs font-semibold text-slate-500">Shift</span>
						<div className="flex flex-wrap gap-2">
							{Object.entries(SHIFT_LABELS).map(([val, label]) => (
								<button
									key={val}
									type="button"
									onClick={() => setShiftType(val)}
									className={cn(
										"rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition",
										shiftType === val
											? SHIFT_COLORS[val]
											: "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100",
									)}
								>
									{label}
								</button>
							))}
							<button
								type="button"
								onClick={() => setIsValet((v) => !v)}
								className={cn(
									"rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition",
									isValet
										? "border-indigo-200 bg-indigo-50 text-indigo-700"
										: "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100",
								)}
							>
								{isValet ? "✓ Valet" : "Valet"}
							</button>
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
							className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
						>
							{saving ? "Menyimpan..." : "Tambah Absensi"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── Employee Resume Detail Modal ────────────────────────────────────────────
const LIBUR_PER_CUTOFF = 4;

function fmtMin(minutes) {
	if (!minutes || minutes <= 0) return "0j 0m";
	const h = Math.floor(minutes / 60);
	const m = Math.round(minutes % 60);
	return `${h}j ${m}m`;
}

function KetBadge({ value }) {
	const style =
		value === "Normal + Valet"
			? "bg-emerald-100 text-emerald-700 border-emerald-200"
			: value === "Valet"
				? "bg-rose-100 text-rose-700 border-rose-200"
				: "bg-sky-100 text-sky-700 border-sky-200";
	return (
		<span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
			{value}
		</span>
	);
}

function StatPill({ label, value, tone = "slate" }) {
	const tones = {
		slate: "bg-slate-50 border-slate-200 text-slate-700",
		sky: "bg-sky-50 border-sky-200 text-sky-700",
		indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
		amber: "bg-amber-50 border-amber-200 text-amber-700",
		rose: "bg-rose-50 border-rose-200 text-rose-700",
		emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
		violet: "bg-violet-50 border-violet-200 text-violet-700",
	};
	return (
		<div className={`flex flex-col items-center rounded-xl border px-3 py-2.5 ${tones[tone] ?? tones.slate}`}>
			<span className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</span>
			<span className="mt-0.5 text-base font-bold leading-tight">{value}</span>
		</div>
	);
}

function EmployeeResumeModal({ emp, activePeriod, activePeriodLabel, leaveResumeMap, onClose }) {
	const [empRecords, setEmpRecords] = useState([]);
	const [loading, setLoading] = useState(true);

	// Fetch ALL records for this employee in the active period (not paginated)
	useEffect(() => {
		let cancelled = false;
		const qs = new URLSearchParams();
		qs.set("startDate", activePeriod.startDate);
		qs.set("endDate", activePeriod.endDate);
		qs.set("employeeIds", String(emp.employee_id));
		qs.set("page", "1");
		qs.set("limit", "99999");
		api(`/ikm/absensi/shifts?${qs.toString()}`)
			.then((res) => {
				if (cancelled) return;
				const sorted = (res.records || []).sort((a, b) => {
					const da = new Date(a.work_date).getTime();
					const db = new Date(b.work_date).getTime();
					if (da !== db) return da - db;
					return (SHIFT_ORDER[a.shift_type] ?? 9) - (SHIFT_ORDER[b.shift_type] ?? 9);
				});
				setEmpRecords(sorted);
				setLoading(false);
			})
			.catch(() => { if (!cancelled) setLoading(false); });
		return () => { cancelled = true; };
	}, [emp.employee_id, activePeriod.startDate, activePeriod.endDate]);

	// Per-shift minutes (only pagi/siang/sore count toward jam kerja reguler; lembur is extra)
	const shiftMin = useMemo(() => {
		const acc = { pagi: 0, siang: 0, sore: 0, lembur: 0 };
		for (const r of empRecords) {
			if (!r.check_in_time || !r.check_out_time) continue;
			const diff = (new Date(r.check_out_time) - new Date(r.check_in_time)) / 60000;
			if (diff <= 0) continue;
			const shift = String(r.shift_type || "").toLowerCase();
			if (shift in acc) acc[shift] += diff;
		}
		return acc;
	}, [empRecords]);

	const regularMin = shiftMin.pagi + shiftMin.siang + shiftMin.sore;
	const grandMin = regularMin + shiftMin.lembur;

	// Kehadiran: distinct work_date with check_in
	const kehadiran = useMemo(() => {
		const dates = new Set();
		for (const r of empRecords) {
			if (r.check_in_time) {
				const dk = String(r.work_date || r.check_in_time || "").slice(0, 10);
				if (dk) dates.add(dk);
			}
		}
		return dates.size;
	}, [empRecords]);

	// Period stats
	const totalPeriodDays = useMemo(() => {
		if (!activePeriod?.startDate || !activePeriod?.endDate) return 0;
		const s = new Date(activePeriod.startDate);
		const e = new Date(activePeriod.endDate);
		return Math.round((e - s) / 86400000) + 1;
	}, [activePeriod]);

	const totalHariKerja = Math.max(0, totalPeriodDays - LIBUR_PER_CUTOFF);
	const jamKerjaWajibMin = totalHariKerja * 8 * 60;
	const lemburHarian = Math.max(0, kehadiran - totalHariKerja);
	const jamLemburMin = Math.max(0, regularMin - jamKerjaWajibMin);

	// Keterangan
	const hasValet = empRecords.some((r) => r.is_valet === 1 || r.is_valet === "1" || r.is_valet === true);
	const hasNormal = empRecords.some((r) => !r.is_valet || r.is_valet === 0 || r.is_valet === "0" || r.is_valet === false);
	const keterangan = hasValet && hasNormal ? "Normal + Valet" : hasValet ? "Valet" : "Normal";

	// Leave data
	const leaveData = leaveResumeMap.get(Number(emp.employee_id)) || {};
	const pSakit = Number(leaveData.pengajuan_sakit || 0);
	const pIzin = Number(leaveData.pengajuan_izin || 0);
	const pCuti = Number(leaveData.pengajuan_cuti || 0);
	const lSakit = Number(leaveData.laporan_sakit || 0);
	const lIzin = Number(leaveData.laporan_izin || 0);
	const lAlfa = Number(leaveData.laporan_alfa || 0);
	const lTelat = Number(leaveData.laporan_telat || 0);

	// Escape key + body scroll lock
	useEffect(() => {
		const onKey = (e) => { if (e.key === "Escape") onClose(); };
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	const initials = String(emp.employee_name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

	const handlePrint = () => {
		const printedAt = new Intl.DateTimeFormat("id-ID", {
			day: "2-digit", month: "long", year: "numeric",
			hour: "2-digit", minute: "2-digit",
		}).format(new Date());

		const shiftRows = empRecords.map((r) => {
			let dur = "–";
			if (r.check_in_time && r.check_out_time) {
				const d = (new Date(r.check_out_time) - new Date(r.check_in_time)) / 60000;
				if (d > 0) dur = fmtMin(d);
			}
			const isValet = r.is_valet === 1 || r.is_valet === "1" || r.is_valet === true;
			const shiftLabel = String(r.shift_type || "").charAt(0).toUpperCase() + String(r.shift_type || "").slice(1);
			const shiftColors = {
				pagi:   { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
				siang:  { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
				sore:   { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
				lembur: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
			};
			const sc = shiftColors[String(r.shift_type || "").toLowerCase()] || shiftColors.pagi;
			const inTime  = r.check_in_time  ? new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(r.check_in_time))  : "–";
			const outTime = r.check_out_time ? new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(r.check_out_time)) : "–";
			const workDate = r.work_date ? new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(String(r.work_date).slice(0,10))) : "–";
			const statusColors = {
				"Lengkap":          { bg:"#f0fdf4", color:"#15803d", border:"#bbf7d0" },
				"Belum check-in":   { bg:"#fff1f2", color:"#be123c", border:"#fecdd3" },
				"Belum check-out":  { bg:"#fffbeb", color:"#b45309", border:"#fde68a" },
				"Foto belum lengkap":{ bg:"#eff6ff", color:"#1d4ed8", border:"#bfdbfe" },
			};
			const ss = statusColors[r.status_label] || { bg:"#f8fafc", color:"#64748b", border:"#e2e8f0" };
			return `
				<tr>
					<td>${workDate}</td>
					<td><span style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600;">${shiftLabel}</span></td>
					<td style="text-align:center;">${isValet ? '<span style="color:#e11d48;font-weight:700;">✓</span>' : '<span style="color:#cbd5e1;">–</span>'}</td>
					<td>${inTime}</td>
					<td>${outTime}</td>
					<td style="text-align:right;font-weight:600;">${dur}</td>
					<td><span style="background:${ss.bg};color:${ss.color};border:1px solid ${ss.border};border-radius:4px;padding:1px 6px;font-size:11px;">${r.status_label || "–"}</span></td>
				</tr>`;
		}).join("");

		const ketColors = {
			"Normal":          { bg:"#eff6ff", color:"#1d4ed8", border:"#bfdbfe" },
			"Valet":           { bg:"#fff1f2", color:"#be123c", border:"#fecdd3" },
			"Normal + Valet":  { bg:"#f0fdf4", color:"#15803d", border:"#bbf7d0" },
		};
		const kc = ketColors[keterangan] || ketColors["Normal"];

		const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Laporan Absensi – ${emp.employee_name}</title>
<style>
  @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  /* ── Header ── */
  .header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:12px; background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#0e7490 100%); margin-bottom:14px; }
  .header-left { display:flex; align-items:center; gap:12px; }
  .avatar { width:46px;height:46px;border-radius:10px;background:#fff;border:2px solid rgba(255,255,255,0.3);object-fit:contain;padding:4px;flex-shrink:0; }
  .company-name { font-size:9px; font-weight:600; color:rgba(255,255,255,0.65); letter-spacing:0.06em; text-transform:uppercase; margin-bottom:2px; }
  .doc-title { font-size:15px; font-weight:700; color:#fff; }
  .doc-subtitle { font-size:10px; color:rgba(255,255,255,0.65); margin-top:2px; }
  .header-right { text-align:right; }
  .header-right .label { font-size:9px; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:0.05em; }
  .header-right .value { font-size:11px; font-weight:600; color:#fff; }
  /* ── Employee Info Block ── */
  .emp-block { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; }
  .info-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; }
  .info-card .lbl { font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px; }
  .info-card .val { font-size:12px; font-weight:700; color:#1e293b; }
  .badge { display:inline-block; border-radius:999px; padding:2px 10px; font-size:10px; font-weight:700; border:1px solid; }
  /* ── Section Title ── */
  .sec { font-size:9px; font-weight:700; color:#1e40af; text-transform:uppercase; letter-spacing:0.07em; margin:12px 0 6px; border-left:3px solid #1e40af; padding-left:7px; }
  /* ── Stats Grid ── */
  .stats-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:4px; }
  .stat-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:7px 6px; text-align:center; }
  .stat-card .s-lbl { font-size:8.5px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px; }
  .stat-card .s-val { font-size:13px; font-weight:700; color:#1e293b; }
  /* ── Shift Grid ── */
  .shift-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
  .shift-card { border-radius:8px; padding:7px 6px; text-align:center; border:1px solid; }
  .shift-card .s-lbl { font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px; }
  .shift-card .s-val { font-size:13px; font-weight:700; }
  /* ── Leave Grid ── */
  .leave-section { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px; }
  .leave-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; }
  .leave-box .lbl { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; }
  .leave-inner { display:grid; gap:5px; }
  .leave-inner.cols-3 { grid-template-columns:repeat(3,1fr); }
  .leave-inner.cols-4 { grid-template-columns:repeat(4,1fr); }
  .leave-item { text-align:center; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:5px 4px; }
  .leave-item .l-lbl { font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px; }
  .leave-item .l-val { font-size:14px; font-weight:700; }
  /* ── Table ── */
  .tbl-wrap { margin-top:4px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  thead tr { background:linear-gradient(90deg,#1e3a8a,#0e7490); color:#fff; }
  thead th { padding:7px 8px; text-align:left; font-size:9.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; white-space:nowrap; }
  thead th:last-child { border-radius:0 6px 6px 0; }
  thead th:first-child { border-radius:6px 0 0 6px; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody tr:hover { background:#eff6ff; }
  tbody td { padding:6px 8px; border-bottom:1px solid #f1f5f9; color:#334155; vertical-align:middle; }
  /* ── Footer ── */
  .footer { margin-top:20px; padding-top:10px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:flex-end; }
  .footer .note { font-size:9px; color:#94a3b8; }
  .sig-block { text-align:center; }
  .sig-block .sig-title { font-size:9px; color:#64748b; margin-bottom:36px; }
  .sig-block .sig-line { border-top:1px solid #334155; width:140px; margin:0 auto; padding-top:4px; font-size:10px; font-weight:600; color:#334155; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none; }
  }
</style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <img class="avatar" src="${window.location.origin}/ikm.png" alt="IKM Logo" />
      <div>
        <div class="company-name">PT Intersolusi Karya Mandiri</div>
        <div class="doc-title">Laporan Rekap Absensi Karyawan</div>
        <div class="doc-subtitle">${activePeriodLabel}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="label">Dicetak pada</div>
      <div class="value">${printedAt}</div>
    </div>
  </div>

  <!-- EMPLOYEE INFO -->
  <div class="emp-block">
    <div class="info-card">
      <div class="lbl">Nama Karyawan</div>
      <div class="val">${emp.employee_name || "–"}</div>
    </div>
    <div class="info-card">
      <div class="lbl">NIK / Kode Karyawan</div>
      <div class="val">${emp.employee_code || "–"}</div>
    </div>
    <div class="info-card">
      <div class="lbl">Jabatan</div>
      <div class="val">${emp.jabatan || "–"} &nbsp;
        <span class="badge" style="background:${kc.bg};color:${kc.color};border-color:${kc.border};">${keterangan}</span>
      </div>
    </div>
  </div>

  <!-- RINGKASAN PERIODE -->
  <div class="sec">Ringkasan Periode</div>
  <div class="stats-grid">
    <div class="stat-card"><div class="s-lbl">Total Hari Kerja</div><div class="s-val">${totalHariKerja}</div></div>
    <div class="stat-card" style="background:#f0f9ff;border-color:#bae6fd;"><div class="s-lbl" style="color:#0369a1;">Total Kehadiran</div><div class="s-val" style="color:#0369a1;">${kehadiran}</div></div>
    <div class="stat-card" style="background:#fffbeb;border-color:#fde68a;"><div class="s-lbl" style="color:#b45309;">Lembur Harian</div><div class="s-val" style="color:#b45309;">${lemburHarian}</div></div>
    <div class="stat-card" style="background:#eef2ff;border-color:#c7d2fe;"><div class="s-lbl" style="color:#4338ca;">Jam Kerja Wajib</div><div class="s-val" style="color:#4338ca;">${fmtMin(jamKerjaWajibMin)}</div></div>
    <div class="stat-card" style="background:#f5f3ff;border-color:#ddd6fe;"><div class="s-lbl" style="color:#6d28d9;">Jam Lembur</div><div class="s-val" style="color:#6d28d9;">${fmtMin(jamLemburMin)}</div></div>
  </div>

  <!-- JAM KERJA PER SHIFT -->
  <div class="sec">Jam Kerja Per Shift</div>
  <div class="shift-grid">
    <div class="shift-card" style="background:#eff6ff;border-color:#bfdbfe;"><div class="s-lbl" style="color:#1d4ed8;">Pagi</div><div class="s-val" style="color:#1d4ed8;">${fmtMin(shiftMin.pagi)}</div></div>
    <div class="shift-card" style="background:#fffbeb;border-color:#fde68a;"><div class="s-lbl" style="color:#b45309;">Siang</div><div class="s-val" style="color:#b45309;">${fmtMin(shiftMin.siang)}</div></div>
    <div class="shift-card" style="background:#fff7ed;border-color:#fed7aa;"><div class="s-lbl" style="color:#c2410c;">Sore</div><div class="s-val" style="color:#c2410c;">${fmtMin(shiftMin.sore)}</div></div>
    <div class="shift-card" style="background:#f5f3ff;border-color:#ddd6fe;"><div class="s-lbl" style="color:#6d28d9;">Lembur</div><div class="s-val" style="color:#6d28d9;">${fmtMin(shiftMin.lembur)}</div></div>
    <div class="shift-card" style="background:#f1f5f9;border-color:#cbd5e1;"><div class="s-lbl" style="color:#475569;">Grand Total</div><div class="s-val" style="color:#1e293b;">${fmtMin(grandMin)}</div></div>
  </div>

  <!-- IZIN & CUTI -->
  <div class="sec">Izin &amp; Cuti</div>
  <div class="leave-section">
    <div class="leave-box">
      <div class="lbl">Pengajuan Karyawan</div>
      <div class="leave-inner cols-3">
        <div class="leave-item"><div class="l-lbl" style="color:#be123c;">Sakit</div><div class="l-val" style="color:#be123c;">${pSakit}</div></div>
        <div class="leave-item"><div class="l-lbl" style="color:#b45309;">Izin</div><div class="l-val" style="color:#b45309;">${pIzin}</div></div>
        <div class="leave-item"><div class="l-lbl" style="color:#15803d;">Cuti</div><div class="l-val" style="color:#15803d;">${pCuti}</div></div>
      </div>
    </div>
    <div class="leave-box">
      <div class="lbl">Laporan Leader</div>
      <div class="leave-inner cols-4">
        <div class="leave-item"><div class="l-lbl" style="color:#be123c;">Sakit</div><div class="l-val" style="color:#be123c;">${lSakit}</div></div>
        <div class="leave-item"><div class="l-lbl" style="color:#b45309;">Izin</div><div class="l-val" style="color:#b45309;">${lIzin}</div></div>
        <div class="leave-item"><div class="l-lbl" style="color:#475569;">Alfa</div><div class="l-val" style="color:#475569;">${lAlfa}</div></div>
        <div class="leave-item"><div class="l-lbl" style="color:#c2410c;">Telat</div><div class="l-val" style="color:#c2410c;">${lTelat}</div></div>
      </div>
    </div>
  </div>

  <!-- RIWAYAT ABSENSI -->
  <div class="sec">Riwayat Absensi (${empRecords.length} record)</div>
  <div class="tbl-wrap">
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Shift</th>
          <th style="text-align:center;">Valet</th>
          <th>Absen In</th>
          <th>Absen Out</th>
          <th style="text-align:right;">Durasi</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${shiftRows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:16px;">Tidak ada data absensi pada periode ini.</td></tr>'}</tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="note">
      Dokumen ini digenerate secara otomatis oleh sistem Alora App.<br/>
      Periode: ${activePeriod.startDate} s/d ${activePeriod.endDate} &nbsp;·&nbsp; Total record: ${empRecords.length}
    </div>
    <div class="sig-block">
      <div class="sig-title">Mengetahui,</div>
      <div class="sig-line">Prila Aprilia Agustina</div>
      <div style="font-size:9px;color:#64748b;margin-top:2px;">Supervisor Human Resources & Quality Control</div>
    </div>
  </div>

  <script>window.onload = function(){ window.print(); };` + `</script>
</body>
</html>`;

		const win = window.open("", "_blank", "width=900,height=700");
		if (!win) { alert("Popup diblokir. Izinkan popup untuk halaman ini."); return; }
		win.document.write(html);
		win.document.close();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-6 backdrop-blur-sm"
			onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
				{/* Header */}
				<div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-950 via-blue-900 to-cyan-700 px-6 py-5 rounded-t-2xl">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white">
						{initials}
					</div>
					<div className="min-w-0 flex-1">
						<h2 className="text-lg font-bold text-white leading-tight">{emp.employee_name}</h2>
						<div className="mt-1 flex flex-wrap items-center gap-2">
							<span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/90">{emp.employee_code || "–"}</span>
							{emp.jabatan && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/90">{emp.jabatan}</span>}
							<KetBadge value={keterangan} />
						</div>
						<p className="mt-1.5 text-xs text-white/70">{activePeriodLabel}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
					>
						<HiOutlineXMark className="h-4 w-4" />
					</button>
				</div>

				<div className="space-y-5 p-6">
					{loading ? (
						<div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
							<svg className="h-5 w-5 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
							</svg>
							Mengambil data...
						</div>
					) : (
						<>
					<div>
						<p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Ringkasan Periode</p>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
							<StatPill label="Total Hari Kerja" value={totalHariKerja} tone="slate" />
							<StatPill label="Total Kehadiran" value={kehadiran} tone="sky" />
							<StatPill label="Lembur Harian" value={lemburHarian} tone="amber" />
							<StatPill label="Jam Kerja Wajib" value={fmtMin(jamKerjaWajibMin)} tone="indigo" />
							<StatPill label="Jam Lembur" value={fmtMin(jamLemburMin)} tone="violet" />
						</div>
					</div>

					{/* === Jam Kerja Per Shift === */}
					<div>
						<p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Jam Kerja Per Shift</p>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
							<div className="flex flex-col items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">Pagi</span>
								<span className="mt-0.5 text-base font-bold text-sky-700">{fmtMin(shiftMin.pagi)}</span>
							</div>
							<div className="flex flex-col items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Siang</span>
								<span className="mt-0.5 text-base font-bold text-amber-700">{fmtMin(shiftMin.siang)}</span>
							</div>
							<div className="flex flex-col items-center rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Sore</span>
								<span className="mt-0.5 text-base font-bold text-orange-700">{fmtMin(shiftMin.sore)}</span>
							</div>
							<div className="flex flex-col items-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Lembur</span>
								<span className="mt-0.5 text-base font-bold text-violet-700">{fmtMin(shiftMin.lembur)}</span>
							</div>
							<div className="flex flex-col items-center rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Grand Total</span>
								<span className="mt-0.5 text-base font-bold text-slate-800">{fmtMin(grandMin)}</span>
							</div>
						</div>
					</div>

					{/* === Izin & Cuti === */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{/* Pengajuan */}
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Pengajuan</p>
							<div className="grid grid-cols-3 gap-2">
								<div className="flex flex-col items-center rounded-lg border border-rose-200 bg-white px-2 py-2">
									<span className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">Sakit</span>
									<span className="mt-0.5 text-lg font-bold text-rose-700">{pSakit}</span>
								</div>
								<div className="flex flex-col items-center rounded-lg border border-amber-200 bg-white px-2 py-2">
									<span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Izin</span>
									<span className="mt-0.5 text-lg font-bold text-amber-700">{pIzin}</span>
								</div>
								<div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-white px-2 py-2">
									<span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Cuti</span>
									<span className="mt-0.5 text-lg font-bold text-emerald-700">{pCuti}</span>
								</div>
							</div>
						</div>
						{/* Laporan Leader */}
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Laporan Leader</p>
							<div className="grid grid-cols-4 gap-2">
								<div className="flex flex-col items-center rounded-lg border border-rose-200 bg-white px-2 py-2">
									<span className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">Sakit</span>
									<span className="mt-0.5 text-lg font-bold text-rose-700">{lSakit}</span>
								</div>
								<div className="flex flex-col items-center rounded-lg border border-amber-200 bg-white px-2 py-2">
									<span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Izin</span>
									<span className="mt-0.5 text-lg font-bold text-amber-700">{lIzin}</span>
								</div>
								<div className="flex flex-col items-center rounded-lg border border-slate-300 bg-white px-2 py-2">
									<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Alfa</span>
									<span className="mt-0.5 text-lg font-bold text-slate-700">{lAlfa}</span>
								</div>
								<div className="flex flex-col items-center rounded-lg border border-orange-200 bg-white px-2 py-2">
									<span className="text-[10px] font-semibold uppercase tracking-wide text-orange-500">Telat</span>
									<span className="mt-0.5 text-lg font-bold text-orange-700">{lTelat}</span>
								</div>
							</div>
						</div>
					</div>
					</>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 rounded-b-2xl">
					<button
						type="button"
						onClick={handlePrint}
						disabled={loading}
						className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						<HiOutlinePrinter className="h-4 w-4" />
						Cetak / Unduh PDF
					</button>
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
					>
						Tutup
					</button>
				</div>
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
	const [leaveSummary, setLeaveSummary] = useState({ izin: 0, sakit: 0, cuti: 0 });
	const [employeeSummary, setEmployeeSummary] = useState([]);
	const [employeeSummaryPage, setEmployeeSummaryPage] = useState(1);
	const [employeeSummaryLimit, setEmployeeSummaryLimit] = useState("5");
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [photoViewer, setPhotoViewer] = useState(null);
	const [editModal, setEditModal] = useState(null);
	const [addModal, setAddModal] = useState(false);
	const [employeeResumeModal, setEmployeeResumeModal] = useState(null);
	const [leaveResumeMap, setLeaveResumeMap] = useState(new Map());
	const [statusFilter, setStatusFilter] = useState("");
	const [sort, setSort] = useState({ col: "check_in_time", dir: "desc" });

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

				const [response, leaveRes] = await Promise.all([
					api(`/ikm/absensi/shifts?${qs.toString()}`),
					api(`/ikm/absensi/employee-leave-resume?startDate=${activePeriod.startDate}&endDate=${activePeriod.endDate}`),
				]);
				setSummary(response.summary ?? null);
				setLeaveSummary(response.summary?.leaveSummary ?? { izin: 0, sakit: 0, cuti: 0 });
				setEmployeeSummary(response.employeeSummary ?? []);
				setRecords(response.records ?? []);
				setEmployeeOptions(Array.isArray(response.employeeOptions) ? response.employeeOptions : []);
				setPagination((prev) => ({
					...prev,
					total: response.pagination?.total ?? 0,
					totalPages: response.pagination?.totalPages ?? 1,
				}));
				const newLeaveMap = new Map();
				for (const item of (leaveRes.data || [])) newLeaveMap.set(Number(item.employee_id), item);
				setLeaveResumeMap(newLeaveMap);
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

<section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
					<StatCard
						title="Total Absen"
						value={summary?.totalRecords ?? 0}
						subtitle="Total record absensi pada periode aktif"
						tone="blue"
						Icon={HiOutlineDocumentCheck}
					/>
					<StatCard
						title="Total Sakit"
						value={leaveSummary.sakit}
						subtitle="Pengajuan izin sakit pada periode ini"
						tone="rose"
						Icon={HiOutlineExclamationTriangle}
						onClick={() => navigate("/perizinan-ikm", { state: { leaveType: "sakit", startDate: activePeriod.startDate, endDate: activePeriod.endDate } })}
					/>
					<StatCard
						title="Total Izin"
						value={leaveSummary.izin}
						subtitle="Pengajuan izin kepentingan pada periode ini"
						tone="amber"
						Icon={HiOutlineCalendarDays}
						onClick={() => navigate("/perizinan-ikm", { state: { leaveType: "izin", startDate: activePeriod.startDate, endDate: activePeriod.endDate } })}
					/>
					<StatCard
						title="Total Cuti"
						value={leaveSummary.cuti}
						subtitle="Pengajuan cuti tahunan pada periode ini"
						tone="emerald"
						Icon={HiOutlineClipboardDocumentList}
						onClick={() => navigate("/perizinan-ikm", { state: { leaveType: "cuti", startDate: activePeriod.startDate, endDate: activePeriod.endDate } })}
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
											<tr
												key={row.employee_id}
												className="cursor-pointer hover:bg-sky-50 transition-colors"
												onClick={() => setEmployeeResumeModal(row)}
											>
												<td className="px-4 py-3">
													<div className="flex items-center gap-1.5">
														<div className="text-sm font-semibold text-slate-800">{row.employee_name}</div>
														<HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
													</div>
													<div className="text-xs text-slate-400">{row.employee_code || "-"}</div>
												</td>
												<td className="px-4 py-3 text-center"><RoleBadge role={row.jabatan} /></td>
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
							<span className="text-slate-400">Klik baris karyawan untuk melihat rincian lengkap.</span>
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
											qs.set("limit", "99999"); // Download semua data
											if (filters.shiftType) qs.set("shiftType", filters.shiftType);
											if (selectedEmployeeIds.length > 0) qs.set("employeeIds", selectedEmployeeIds.join(","));
											if (filters.onlyIncomplete) qs.set("onlyIncomplete", "1");

											// Fetch attendance records + leave/late resume in parallel
											const [response, leaveRes] = await Promise.all([
												api(`/ikm/absensi/shifts?${qs.toString()}`),
												api(`/ikm/absensi/employee-leave-resume?startDate=${activePeriod.startDate}&endDate=${activePeriod.endDate}`),
											]);

											let allRecords = response.records || [];
											if (statusFilter) {
												allRecords = allRecords.filter((r) => r.status_label === statusFilter);
											}

											// Build a Map<employee_id, leaveData> for quick lookup in export
											const leaveResumeMap = new Map();
											for (const item of (leaveRes.data || [])) {
												leaveResumeMap.set(Number(item.employee_id), item);
											}

											const selectedNames = selectedEmployeeIds
												.map((id) => {
													const opt = employeeOptions.find((o) => Number(o.employee_id) === id);
													return opt?.employee_name || `ID ${id}`;
												});

											exportAbsensiExcel({
												records: allRecords,
												periodLabel: activePeriodLabel,
												activePeriod,
												filters: {
													shiftType: filters.shiftType,
													onlyIncomplete: filters.onlyIncomplete,
													selectedEmployeeNames: selectedNames,
													statusFilter,
												},
												summary: response.summary,
												leaveResumeMap,
											});
										} catch (err) {
											console.error("Gagal mendownload excel:", err);
											alert("Gagal mengunduh data excel: " + err.message);
										}
									}}
									className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
									Download Excel
								</button>
								<button
									type="button"
									onClick={() => setAddModal(true)}
									className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
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
										<SortTh col="shift_type" label="Shift" sort={sort} onSort={handleSort} />
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
														<ShiftBadge type={row.shift_type} isValet={row.is_valet} />
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
													<td className="whitespace-nowrap px-4 py-3">
														<button
															type="button"
															onClick={() => setEditModal(row)}
															className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
															title="Edit jam absensi"
														>
															<HiOutlinePencilSquare className="h-3.5 w-3.5" />
															Edit
														</button>
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
										<MobileAttendanceCard key={row.shift_record_id} row={row} onOpenPhoto={(url, label) => setPhotoViewer({ url, label })} onEdit={(r) => setEditModal(r)} />
									))}
								</div>
							)}
						</div>

						<PaginationBar pagination={pagination} onPage={handlePage} onLimitChange={handleLimitChange} loading={loading} />
					</section>
				</div>
			</main>

			<PhotoViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
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
			<AddAttendanceModal
				employeeOptions={employeeOptions}
				onClose={() => setAddModal(false)}
				onSaved={() => {
					setAddModal(false);
					fetchAbsensi({ silent: true });
				}}
			/>
		)}
		{employeeResumeModal && (
			<EmployeeResumeModal
				emp={employeeResumeModal}
				activePeriod={activePeriod}
				activePeriodLabel={activePeriodLabel}
				leaveResumeMap={leaveResumeMap}
				onClose={() => setEmployeeResumeModal(null)}
			/>
		)}
		</>
	);
}