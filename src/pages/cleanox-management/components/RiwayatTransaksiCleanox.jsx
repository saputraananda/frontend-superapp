import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	HiOutlineAdjustmentsHorizontal,
	HiOutlineArrowDownTray,
	HiOutlineBanknotes,
	HiOutlineCheckCircle,
	HiOutlineClipboardDocumentList,
	HiOutlineExclamationTriangle,
	HiOutlineMagnifyingGlass,
	HiOutlinePhoto,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api, BASE_URL } from "../../../lib/api";
import { exportRiwayatTransaksiCleanoxExcel } from "../utils/exportRiwayatTransaksiCleanoxExcel";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function AuthenticatedImage({ path, alt, className, onClick, iconSize = "h-5 w-5", objectFit = "cover" }) {
	const [src, setSrc] = useState(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let objectUrl = null;
		let cancelled = false;

		(async () => {
			if (!path) {
				setSrc(null);
				setError(true);
				return;
			}
			try {
				setError(false);
				const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
				const res = await fetch(url, { credentials: "include" });
				if (!res.ok) throw new Error("Gagal memuat foto");
				const blob = await res.blob();
				objectUrl = URL.createObjectURL(blob);
				if (!cancelled) setSrc(objectUrl);
			} catch {
				if (!cancelled) {
					setSrc(null);
					setError(true);
				}
			}
		})();

		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [path]);

	const imgCls = objectFit === "contain" ? "h-full w-full object-contain" : "h-full w-full object-cover";

	if (error || !src) {
		return (
			<div className={cn("flex items-center justify-center bg-slate-100 text-slate-400", className)}>
				<HiOutlinePhoto className={cn("opacity-50", iconSize)} />
			</div>
		);
	}

	if (onClick) {
		return (
			<button type="button" onClick={onClick} className={cn("block overflow-hidden p-0", className)}>
				<img src={src} alt={alt} className={imgCls} />
			</button>
		);
	}

	return (
		<div className={cn("overflow-hidden", className)}>
			<img src={src} alt={alt} className={imgCls} />
		</div>
	);
}

function PhotoThumb({ path, label, onOpen, className = "h-10 w-10" }) {
	if (!path) {
		return <span className="text-xs text-slate-300">-</span>;
	}

	return (
		<button
			type="button"
			onClick={onOpen}
			title={`Lihat ${label}`}
			className="group relative overflow-visible rounded-lg"
		>
			<AuthenticatedImage
				path={path}
				alt={label}
				className={cn(
					"rounded-lg border border-slate-200 bg-slate-100 transition group-hover:border-blue-300 group-hover:scale-[1.04]",
					className,
				)}
				iconSize="h-4 w-4"
			/>
		</button>
	);
}

function PaymentProofViewerModal({ item, onClose }) {
	const [scale, setScale] = useState(1);
	const wheelRef = useRef(null);

	useEffect(() => {
		setScale(1);
	}, [item?.url]);

	useEffect(() => {
		if (!item) return undefined;
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [item, onClose]);

	useEffect(() => {
		if (!item) return undefined;
		const el = wheelRef.current;
		if (!el) return undefined;
		const onWheel = (e) => {
			e.preventDefault();
			e.stopPropagation();
			const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
			setScale((prev) => clamp(Number((prev * factor).toFixed(3)), 0.5, 4));
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [item]);

	if (!item || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="relative inline-flex max-h-[90vh] max-w-[94vw] flex-col items-center"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition hover:bg-white hover:text-slate-800"
					aria-label="Tutup preview foto"
				>
					<HiOutlineXMark className="h-5 w-5" />
				</button>
				<p className="mb-2 max-w-full truncate rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
					{item.label || "Bukti pembayaran"} · scroll untuk zoom ({Math.round(scale * 100)}%)
				</p>
				<div
					ref={wheelRef}
					className="flex max-h-[84vh] max-w-[94vw] items-center justify-center overflow-auto"
				>
					<div
						style={{
							transform: `scale(${scale})`,
							transformOrigin: "center center",
							transition: "transform 60ms linear",
						}}
					>
						<AuthenticatedImage
							path={item.url}
							alt={item.label}
							className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl bg-slate-900"
							iconSize="h-10 w-10"
							objectFit="contain"
						/>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}

function toDateInput(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
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

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
}

function formatCurrency(value) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(Number(value || 0));
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

const STATUS_OPTIONS = [
	{ value: "", label: "Semua (kecuali Cancelled)" },
	{ value: "Scheduled", label: "Scheduled" },
	{ value: "Assigned", label: "Assigned" },
	{ value: "In_Progress", label: "In Progress" },
	{ value: "Completed", label: "Completed" },
	{ value: "Cancelled", label: "Cancelled" },
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
				<div
					className={cn(
						"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
						toneClass(tone),
					)}
				>
					{Icon ? <Icon className="h-5 w-5" /> : null}
				</div>
			</div>
		</div>
	);
}

export default function RiwayatTransaksiCleanox() {
	const defaultCutoff = getDefaultCutoffSelection();
	const [periodMode, setPeriodMode] = useState("cutoff");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
	const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
	const [records, setRecords] = useState([]);
	const [summary, setSummary] = useState(null);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState("");
	const [photoViewer, setPhotoViewer] = useState(null);

	const activePeriod = useMemo(() => {
		if (periodMode === "today") {
			const today = toDateInput(new Date());
			return { startDate: today, endDate: today };
		}
		if (periodMode === "custom") {
			return { startDate: customStartDate, endDate: customEndDate };
		}
		const startDay = 26;
		const endDay = 25;
		const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
		const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
		return { startDate: toDateInput(start), endDate: toDateInput(end) };
	}, [periodMode, cutoffMonth, cutoffYear, customStartDate, customEndDate]);

	const activePeriodLabel = useMemo(() => {
		if (periodMode === "today") return `Hari ini · ${formatDate(activePeriod.startDate)}`;
		if (periodMode === "custom") {
			return `Custom · ${formatDate(activePeriod.startDate)} – ${formatDate(activePeriod.endDate)}`;
		}
		const monthLabel = PERIOD_MONTHS.find((m) => m.value === cutoffMonth)?.label || cutoffMonth;
		return `Cutoff ${monthLabel} ${cutoffYear} · ${formatDate(activePeriod.startDate)} – ${formatDate(activePeriod.endDate)}`;
	}, [periodMode, activePeriod, cutoffMonth, cutoffYear]);

	useEffect(() => {
		document.title = "Riwayat Transaksi POS | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const { startDate, endDate } = activePeriod;
			if (!startDate || !endDate) return;
			if (endDate < startDate) {
				setFetchError("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai");
				setRecords([]);
				setSummary(null);
				setLoading(false);
				return;
			}
			try {
				setLoading(true);
				setFetchError("");
				const qs = new URLSearchParams({ startDate, endDate });
				if (search.trim()) qs.set("search", search.trim());
				if (statusFilter) qs.set("status", statusFilter);
				if (paymentStatusFilter) qs.set("payment_status", paymentStatusFilter);
				const response = await api(`/cleanox/riwayat-transaksi?${qs.toString()}`);
				if (!cancelled) {
					setRecords(response.data || []);
					setSummary(response.summary ?? null);
				}
			} catch (err) {
				if (!cancelled) {
					setRecords([]);
					setSummary(null);
					setFetchError(err.message || "Gagal memuat riwayat transaksi");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [activePeriod.startDate, activePeriod.endDate, search, statusFilter, paymentStatusFilter]);

	const resetPeriodFilters = () => {
		const resetCutoff = getDefaultCutoffSelection(new Date(), 26);
		setPeriodMode("cutoff");
		setCutoffMonth(resetCutoff.cutoffMonth);
		setCutoffYear(resetCutoff.cutoffYear);
		setCustomStartDate(resetCutoff.startDate);
		setCustomEndDate(resetCutoff.endDate);
		setSearch("");
		setStatusFilter("");
		setPaymentStatusFilter("");
	};

	const yearOptions = useMemo(() => {
		const y = new Date().getFullYear();
		return [y - 1, y, y + 1];
	}, []);

	return (
		<div className="min-h-full bg-slate-50 py-6">
			{fetchError && (
				<div className="mx-auto mb-4 max-w-screen-2xl px-4 sm:px-6 lg:px-8">
					<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<p>{fetchError}</p>
					</div>
				</div>
			)}

			<div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
					<div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
					<div className="relative p-5 sm:p-6 lg:p-8">
						<h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
							Riwayat Transaksi POS
						</h1>
						<p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
							Transaksi POS Cleanox per periode cutoff — export Daily Report (style SuperApp).
						</p>
						<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
							{activePeriodLabel}
						</div>
					</div>
				</section>

				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
					<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
								<HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
							</div>
							<div>
								<h2 className="text-base font-bold text-slate-800">Filter Periode</h2>
								<p className="text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
							</div>
						</div>
						<button
							type="button"
							onClick={resetPeriodFilters}
							className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						>
							Reset
						</button>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
							<select
								value={periodMode}
								onChange={(e) => setPeriodMode(e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="cutoff">Periode Cutoff</option>
								<option value="today">Hari Ini</option>
								<option value="custom">Custom Tanggal</option>
							</select>
						</label>

						{periodMode === "cutoff" && (
							<>
								<label className="text-sm text-slate-600">
									<span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Cutoff</span>
									<select
										value={cutoffMonth}
										onChange={(e) => setCutoffMonth(Number(e.target.value))}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									>
										{PERIOD_MONTHS.map((m) => (
											<option key={m.value} value={m.value}>
												{m.label}
											</option>
										))}
									</select>
								</label>
								<label className="text-sm text-slate-600">
									<span className="mb-1 block text-xs font-semibold text-slate-500">Tahun Cutoff</span>
									<select
										value={cutoffYear}
										onChange={(e) => setCutoffYear(Number(e.target.value))}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									>
										{yearOptions.map((y) => (
											<option key={y} value={y}>
												{y}
											</option>
										))}
									</select>
								</label>
							</>
						)}

						{periodMode === "custom" && (
							<>
								<label className="text-sm text-slate-600">
									<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
									<input
										type="date"
										value={customStartDate}
										onChange={(e) => setCustomStartDate(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									/>
								</label>
								<label className="text-sm text-slate-600">
									<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
									<input
										type="date"
										value={customEndDate}
										onChange={(e) => setCustomEndDate(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									/>
								</label>
							</>
						)}

						<label className="text-sm text-slate-600 sm:col-span-2">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Cari</span>
							<div className="relative">
								<HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="No nota, nama, atau WA"
									className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>
						</label>

						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								{STATUS_OPTIONS.map((o) => (
									<option key={o.value || "all"} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
						</label>

						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Pembayaran</span>
							<select
								value={paymentStatusFilter}
								onChange={(e) => setPaymentStatusFilter(e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="">Semua</option>
								<option value="lunas">Lunas</option>
								<option value="belum_lunas">Belum lunas</option>
							</select>
						</label>
					</div>

					<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
						Periode aktif: <strong>{formatDate(activePeriod.startDate)}</strong> sampai{" "}
						<strong>{formatDate(activePeriod.endDate)}</strong>
					</div>
				</section>

				<section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
					<StatCard
						title="Total Transaksi"
						value={summary?.total_transactions ?? 0}
						subtitle="POS dalam periode aktif"
						tone="blue"
						Icon={HiOutlineClipboardDocumentList}
					/>
					<StatCard
						title="Total Nominal"
						value={formatCurrency(summary?.total_amount ?? 0)}
						subtitle="Jumlah final amount (non-pending)"
						tone="amber"
						Icon={HiOutlineBanknotes}
					/>
					<StatCard
						title="Lunas"
						value={summary?.lunas_count ?? 0}
						subtitle="Status pembayaran lunas"
						tone="emerald"
						Icon={HiOutlineCheckCircle}
					/>
					<StatCard
						title="Belum Lunas"
						value={summary?.belum_lunas_count ?? 0}
						subtitle="Status pembayaran belum lunas"
						tone="rose"
						Icon={HiOutlineExclamationTriangle}
					/>
				</section>

				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
						<div>
							<h2 className="text-base font-bold text-slate-800">Daftar Transaksi POS</h2>
							<p className="mt-0.5 text-xs text-slate-500">
								Data dari POS saja (tanpa Smartlink). NO NOTA = transaction_no.
							</p>
							<p className="mt-1 text-xs text-slate-400">
								{loading ? "Memuat..." : `${records.length} transaksi ditampilkan`}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{(search || statusFilter || paymentStatusFilter) && (
								<button
									type="button"
									onClick={() => {
										setSearch("");
										setStatusFilter("");
										setPaymentStatusFilter("");
									}}
									className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
								>
									<HiOutlineXMark className="h-3.5 w-3.5" />
									Bersihkan filter
								</button>
							)}
							<button
								type="button"
								disabled={loading || records.length === 0}
								onClick={() => {
									try {
										exportRiwayatTransaksiCleanoxExcel({
											records,
											periodLabel: activePeriodLabel,
											activePeriod,
										});
									} catch (err) {
										console.error("Gagal mendownload excel:", err);
										alert("Gagal mengunduh data excel: " + (err.message || "unknown error"));
									}
								}}
								className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
								Download Excel
							</button>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="border-b border-slate-100 bg-slate-50">
								<tr>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										No Nota
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Customer
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Tgl Layanan
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Kategori
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Status
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Pembayaran
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Bukti
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
										Nominal
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading ? (
									<tr>
										<td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
											Memuat riwayat transaksi...
										</td>
									</tr>
								) : records.length === 0 ? (
									<tr>
										<td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
											Belum ada transaksi POS pada periode/filter ini.
										</td>
									</tr>
								) : (
									records.map((row) => (
										<tr key={row.id} className="hover:bg-slate-50">
											<td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1b3459]">
												{row.transaction_no}
											</td>
											<td className="px-4 py-3">
												<div className="font-medium text-slate-800">{row.customer_name}</div>
												<div className="text-xs text-slate-400">{row.customer_phone || "-"}</div>
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-slate-600">
												{formatDate(row.service_date)}
											</td>
											<td className="whitespace-nowrap px-4 py-3">
												<span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
													{row.kategori || "-"}
												</span>
											</td>
											<td className="whitespace-nowrap px-4 py-3">
												<span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
													{row.status}
												</span>
											</td>
											<td className="whitespace-nowrap px-4 py-3">
												<span
													className={cn(
														"inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
														row.payment_status === "lunas"
															? "border-emerald-200 bg-emerald-50 text-emerald-700"
															: "border-amber-200 bg-amber-50 text-amber-700",
													)}
												>
													{row.payment_status === "lunas" ? "Lunas" : "Belum lunas"}
												</span>
											</td>
											<td className="px-4 py-3">
												{(row.payment_proofs || []).length === 0 ? (
													<span className="text-xs text-slate-300">-</span>
												) : (
													<div className="flex max-w-[220px] flex-wrap gap-1.5">
														{(row.payment_proofs || []).map((proof, idx) => (
															<PhotoThumb
																key={proof.id || proof.url || idx}
																path={proof.url}
																label={`Bukti ${idx + 1}`}
																onOpen={() =>
																	setPhotoViewer({
																		url: proof.url,
																		label: `Bukti #${idx + 1} · ${row.transaction_no}`,
																	})
																}
															/>
														))}
													</div>
												)}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
												{row.pricing_pending ? "Pending harga" : formatCurrency(row.final_amount)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>

			<PaymentProofViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
		</div>
	);
}
