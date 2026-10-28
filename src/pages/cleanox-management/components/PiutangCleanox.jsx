import { useEffect, useMemo, useReducer, useState } from "react";
import { createPortal } from "react-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
	HiOutlineChatBubbleLeftRight,
	HiOutlineCheck,
	HiOutlineXMark,
	HiCheckCircle,
	HiArrowUturnLeft,
	HiOutlineClock,
	HiOutlineDocumentDuplicate,
	HiOutlinePaperAirplane,
	HiOutlineInformationCircle,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import CleanoxDashboardFilterBar from "./dashboard/CleanoxDashboardFilterBar";
import {
	buildPiutangParams,
	fmtIDR,
	getDefaultDashboardFilters,
} from "../utils/dashboardFilters";
import { exportPiutangCleanoxExcel } from "../utils/exportPiutangCleanoxExcel";

function Card({ className = "", children }) {
	return (
		<div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
			{children}
		</div>
	);
}

function getGreetingTime() {
	const hour = new Date().getHours();
	if (hour < 11) return "pagi";
	if (hour < 15) return "siang";
	if (hour < 18) return "sore";
	return "malam";
}

function formatDateIndo(dateStr) {
	if (!dateStr) return "-";
	try {
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
		return d.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	} catch {
		return String(dateStr).slice(0, 10);
	}
}

function formatDateTimeIndo(dateStr) {
	if (!dateStr) return "-";
	try {
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return String(dateStr).slice(0, 16);
		return d.toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return String(dateStr).slice(0, 16);
	}
}

function buildWhatsAppUrl(phone, message = "", forceDirectWaMe = false) {
	if (!phone) return null;
	let digits = String(phone).replace(/\D/g, "");
	if (!digits) return null;
	if (digits.startsWith("620")) digits = "62" + digits.slice(3);
	else if (digits.startsWith("0")) digits = "62" + digits.slice(1);
	else if (digits.startsWith("8")) digits = "62" + digits;

	const encoded = encodeURIComponent((message || "").trim());
	const queryStr = encoded ? `?text=${encoded}` : "";

	if (forceDirectWaMe) {
		return `https://wa.me/${digits}${queryStr}`;
	}

	const isMobile =
		typeof navigator !== "undefined" &&
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

	if (isMobile) {
		return `https://wa.me/${digits}${queryStr}`;
	}
	return `https://web.whatsapp.com/send?phone=${digits}${encoded ? `&text=${encoded}` : ""}`;
}

function generatePiutangWaMessage(row) {
	if (!row) return "";
	const timeGreeting = getGreetingTime();
	const rawName = (row.customer_nama || "").trim();
	const cleanName = rawName.replace(/^(kakak|kak|ibu|bapak|pak)\s+/i, "").trim();
	const nameStr = cleanName || rawName;
	const greeting = nameStr ? `Halo, selamat ${timeGreeting} Kak ${nameStr} 😊` : `Halo, selamat ${timeGreeting} Kak 😊`;
	const tglLayanan = formatDateIndo(row.tgl_terima || row.tanggal);
	const nominal = fmtIDR(Number(row.piutang || 0));

	return (
`${greeting}

Untuk layanan Cleanox pada tanggal ${tglLayanan}, pengerjaannya sudah selesai semua ya, Kak. Minox izin mengingatkan terkait pembayaran nota layanan berikut:

💰 Total tagihan: Rp${nominal}

Pembayaran dapat dilakukan melalui QRIS atau transfer bank berikut:

💳 BSI
No. Rekening: 7373361342
a.n. PT CLEANOX ALORA INDONESIA

Mohon bantuannya untuk melakukan pembayaran dan mengirimkan bukti transfernya kepada Minox ya, Kak.

Terima kasih banyak atas kepercayaan Kakak menggunakan layanan Cleanox! 🙏😊`
	);
}

function reducer(state, action) {
	switch (action.type) {
		case "loading":
			return {
				...state,
				data: null,
				loading: true,
				error: null,
				page: 1,
				search: "",
				statusFilter: "all",
				reminderFilter: "all",
			};
		case "success":
			return { ...state, data: action.payload, loading: false, error: null };
		case "error":
			return { ...state, data: null, loading: false, error: action.payload };
		case "set_page":
			return { ...state, page: action.payload };
		case "set_search":
			return { ...state, search: action.payload, page: 1 };
		case "set_status":
			return { ...state, statusFilter: action.payload, page: 1 };
		case "set_reminder_filter":
			return { ...state, reminderFilter: action.payload, page: 1 };
		case "update_row_remind":
			return {
				...state,
				data: {
					...state.data,
					piutang: (state.data?.piutang || []).map((r) =>
						r.no_nota === action.payload.no_nota
							? {
									...r,
									is_reminded: action.payload.is_reminded,
									reminded_at: action.payload.reminded_at,
									reminded_by: action.payload.reminded_by,
									reminder_count: action.payload.reminder_count,
								}
							: r
					),
				},
			};
		default:
			return state;
	}
}

const STATUS_COLOR = {
	"Belum Jatuh Tempo": "bg-sky-100 text-sky-700",
	"Jatuh Tempo": "bg-amber-100 text-amber-700",
	Terlambat: "bg-rose-100 text-rose-600",
};

export default function PiutangCleanox() {
	const defaults = getDefaultDashboardFilters();
	const [serviceMode, setServiceMode] = useState(defaults.serviceMode);
	const [filterType, setFilterType] = useState(defaults.filterType);
	const [month, setMonth] = useState(defaults.month);
	const [year, setYear] = useState(defaults.year);
	const [startDate, setStartDate] = useState(defaults.startDate);
	const [endDate, setEndDate] = useState(defaults.endDate);
	const [exporting, setExporting] = useState(false);

	// Reminder Modal & Toast State
	const [waModalOpen, setWaModalOpen] = useState(false);
	const [waTargetItem, setWaTargetItem] = useState(null);
	const [customWaMessage, setCustomWaMessage] = useState("");
	const [copied, setCopied] = useState(false);
	const [toastMessage, setToastMessage] = useState(null);

	const filters = useMemo(
		() => ({ serviceMode, filterType, month, year, startDate, endDate }),
		[serviceMode, filterType, month, year, startDate, endDate],
	);

	const [state, dispatch] = useReducer(reducer, {
		data: null,
		loading: true,
		error: null,
		page: 1,
		search: "",
		statusFilter: "all",
		reminderFilter: "all",
	});
	const { data, loading, error, page, search, statusFilter, reminderFilter } = state;
	const PAGE_SIZE = 10;

	useEffect(() => {
		document.title = "Piutang Cleanox | Alora Group Indonesia";
	}, []);

	const showToast = (msg) => {
		setToastMessage(msg);
		setTimeout(() => {
			setToastMessage((prev) => (prev === msg ? null : prev));
		}, 4000);
	};

	const outletsKey = filters.serviceMode || "all";

	useEffect(() => {
		let cancelled = false;
		dispatch({ type: "loading" });
		const qs = buildPiutangParams(filters);
		api(`/cleanox/piutang-dashboard${qs ? `?${qs}` : ""}`)
			.then((res) => {
				if (!cancelled) dispatch({ type: "success", payload: res });
			})
			.catch((err) => {
				if (!cancelled) dispatch({ type: "error", payload: err.message });
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [outletsKey, filters.filterType, filters.month, filters.year, filters.startDate, filters.endDate]);

	const rawPiutang = useMemo(() => data?.piutang ?? [], [data?.piutang]);

	const reminderStats = useMemo(() => {
		let reminded = 0;
		let unreminded = 0;
		for (const r of rawPiutang) {
			if (r.is_reminded) reminded += 1;
			else unreminded += 1;
		}
		return { total: rawPiutang.length, reminded, unreminded };
	}, [rawPiutang]);

	const filteredPiutang = useMemo(() => {
		const q = search.trim().toLowerCase();
		return rawPiutang.filter((r) => {
			const matchStatus = statusFilter === "all" || r.status === statusFilter;
			const matchReminder =
				reminderFilter === "all" ||
				(reminderFilter === "reminded" && r.is_reminded) ||
				(reminderFilter === "unreminded" && !r.is_reminded);
			const matchSearch =
				!q ||
				r.customer_nama?.toLowerCase().includes(q) ||
				r.no_nota?.toLowerCase().includes(q) ||
				r.outlet?.toLowerCase().includes(q);
			return matchStatus && matchReminder && matchSearch;
		});
	}, [rawPiutang, search, statusFilter, reminderFilter]);

	const totalPages = Math.max(1, Math.ceil(filteredPiutang.length / PAGE_SIZE));
	const pagedRows = filteredPiutang.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const handleOpenWaModal = (item) => {
		setWaTargetItem(item);
		setCustomWaMessage(generatePiutangWaMessage(item));
		setCopied(false);
		setWaModalOpen(true);
	};

	const handleCopyMessage = () => {
		if (!customWaMessage) return;
		navigator.clipboard.writeText(customWaMessage);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSendWa = async (forceWaMe = false) => {
		if (!waTargetItem) return;
		const phone = waTargetItem.customer_telepon;
		const url = buildWhatsAppUrl(phone, customWaMessage, forceWaMe);
		if (url) {
			window.open(url, "_blank", "noopener,noreferrer");
		}

		const nowISO = new Date().toISOString();

		try {
			await api("/cleanox/piutang-dashboard/remind", {
				method: "POST",
				body: JSON.stringify({
					no_nota: waTargetItem.no_nota,
					customer_phone: waTargetItem.customer_telepon,
					customer_name: waTargetItem.customer_nama,
					channel: "WhatsApp",
					notes: "Terkirim via Piutang Cleanox WhatsApp",
				}),
			});

			dispatch({
				type: "update_row_remind",
				payload: {
					no_nota: waTargetItem.no_nota,
					is_reminded: true,
					reminded_at: nowISO,
					reminded_by: "CS Cleanox",
					reminder_count: (waTargetItem.reminder_count || 0) + 1,
				},
			});

			showToast(`✅ WhatsApp terbuka & nota ${waTargetItem.no_nota} (${waTargetItem.customer_nama}) ditandai "Sudah Di-reminder"!`);
		} catch (err) {
			console.error("Gagal mencatat log reminder:", err);
			showToast("⚠️ WhatsApp terbuka, tapi pencatatan reminder gagal: " + err.message);
		}

		setWaModalOpen(false);
	};

	const handleManualToggleRemind = async (item) => {
		if (!item) return;
		const isCurrentlyReminded = item.is_reminded;

		try {
			if (isCurrentlyReminded) {
				await api("/cleanox/piutang-dashboard/unremind", {
					method: "POST",
					body: JSON.stringify({
						no_nota: item.no_nota,
					}),
				});

				dispatch({
					type: "update_row_remind",
					payload: {
						no_nota: item.no_nota,
						is_reminded: false,
						reminded_at: null,
						reminded_by: null,
						reminder_count: 0,
					},
				});

				showToast(`Status reminder nota ${item.no_nota} berhasil direset ke Belum Di-reminder.`);
			} else {
				const nowISO = new Date().toISOString();
				await api("/cleanox/piutang-dashboard/remind", {
					method: "POST",
					body: JSON.stringify({
						no_nota: item.no_nota,
						customer_phone: item.customer_telepon,
						customer_name: item.customer_nama,
						channel: "WhatsApp",
						notes: "Ditandai manual dari dashboard",
					}),
				});

				dispatch({
					type: "update_row_remind",
					payload: {
						no_nota: item.no_nota,
						is_reminded: true,
						reminded_at: nowISO,
						reminded_by: "CS Cleanox",
						reminder_count: (item.reminder_count || 0) + 1,
					},
				});

				showToast(`Nota ${item.no_nota} (${item.customer_nama}) berhasil ditandai Sudah Di-reminder.`);
			}
		} catch (err) {
			console.error("Error toggle reminder:", err);
			showToast("⚠️ Gagal mengubah status reminder: " + err.message);
		}
	};

	async function handleExport() {
		if (exporting || !data) return;
		setExporting(true);
		try {
			exportPiutangCleanoxExcel({
				rows: filteredPiutang,
				meta: data?.meta ?? {},
				filters,
				searchKeyword: search,
				statusFilter,
			});
		} finally {
			setExporting(false);
		}
	}

	const summary = data?.summary ?? { total: 0, jatuh_tempo: 0, terlambat: 0 };
	const perOutlet = data?.per_outlet ?? [];
	const meta = data?.meta ?? {};
	const chartData = perOutlet.map((o) => ({
		name: o.outlet,
		jumlah: o.total,
	}));

	return (
		<div className="min-h-full space-y-5 bg-slate-50 py-6">
			{/* Toast Notification */}
			{toastMessage && (
				<div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900/90 px-4 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-md transition-all">
					<HiOutlineInformationCircle className="h-5 w-5 text-emerald-400 shrink-0" />
					<span>{toastMessage}</span>
				</div>
			)}

			<div className="px-4 sm:px-6">
				<h1 className="text-2xl font-bold tracking-tight text-[#1b3459] sm:text-3xl">
					Dashboard Piutang
				</h1>
				<p className="mt-1 text-sm text-slate-500">Cleanox — receivables POS belum lunas & reminder pembayaran WhatsApp</p>
			</div>

			<div className="px-4 sm:px-6">
				<CleanoxDashboardFilterBar
					serviceMode={serviceMode}
					setServiceMode={setServiceMode}
					filterType={filterType}
					setFilterType={setFilterType}
					month={month}
					setMonth={setMonth}
					year={year}
					setYear={setYear}
					startDate={startDate}
					setStartDate={setStartDate}
					endDate={endDate}
					setEndDate={setEndDate}
				/>
			</div>

			<div className="space-y-5 px-4 sm:px-6">
				{loading ? (
					<div className="animate-pulse space-y-5">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="h-24 rounded-2xl bg-slate-200" />
							))}
						</div>
						<div className="h-56 rounded-2xl bg-slate-200" />
						<div className="h-96 rounded-2xl bg-slate-200" />
					</div>
				) : error ? (
					<div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
						Gagal memuat data piutang: {error}
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
							{[
								{
									label: "Total Piutang",
									value: `Rp ${fmtIDR(summary.total)}`,
									icon: "💳",
									tone: "from-fuchsia-500 to-pink-500",
								},
								{
									label: "Belum Jatuh Tempo",
									value: `Rp ${fmtIDR(summary.total - summary.jatuh_tempo - summary.terlambat)}`,
									icon: "🕐",
									tone: "from-sky-400 to-blue-500",
								},
								{
									label: "Jatuh Tempo",
									value: `Rp ${fmtIDR(summary.jatuh_tempo)}`,
									icon: "⏰",
									tone: "from-amber-400 to-orange-500",
								},
								{
									label: "Terlambat",
									value: `Rp ${fmtIDR(summary.terlambat)}`,
									icon: "🔴",
									tone: "from-rose-400 to-red-500",
								},
							].map((k) => (
								<Card key={k.label} className="flex items-center gap-4 p-4 sm:p-5">
									<div
										className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow ${k.tone}`}
									>
										{k.icon}
									</div>
									<div>
										<p className="text-xs text-slate-500">{k.label}</p>
										<p className="text-base font-extrabold text-slate-800">{k.value}</p>
									</div>
								</Card>
							))}
						</div>

						<Card className="p-4 sm:p-6">
							<p className="mb-4 text-sm font-bold text-slate-700">
								Piutang per Layanan
								{meta.dateStart && (
									<span className="ml-2 text-xs font-normal text-slate-400">
										({meta.dateStart} s.d {meta.dateEnd})
									</span>
								)}
							</p>
							<div className="h-48 sm:h-56">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={chartData} barSize={28}>
										<CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
										<XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
										<YAxis
											tick={{ fontSize: 11 }}
											axisLine={false}
											tickLine={false}
											tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
											width={38}
										/>
										<Tooltip formatter={(v) => [`Rp ${fmtIDR(v)}`, "Piutang"]} />
										<Bar dataKey="jumlah" fill="#A855F7" radius={[6, 6, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</Card>

						<Card className="p-4 sm:p-6">
							<p className="mb-4 text-sm font-bold text-slate-700">Detail Piutang per Layanan</p>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
											<th className="pb-3 pr-4">#</th>
											<th className="pb-3 pr-4">Layanan</th>
											<th className="pb-3">Total Piutang</th>
										</tr>
									</thead>
									<tbody>
										{perOutlet.length === 0 ? (
											<tr>
												<td colSpan={3} className="py-8 text-center text-slate-400">
													Tidak ada data
												</td>
											</tr>
										) : (
											perOutlet.map((row, i) => (
												<tr
													key={row.outlet}
													className="border-b border-slate-50 transition hover:bg-slate-50/40"
												>
													<td className="py-3 pr-4 font-semibold text-slate-400">{i + 1}</td>
													<td className="py-3 pr-4 font-semibold text-slate-800">{row.outlet}</td>
													<td className="py-3 font-semibold text-slate-800">
														Rp {fmtIDR(row.total)}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</Card>

						<Card className="p-4 sm:p-6">
							<div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<div className="flex items-center gap-2">
										<p className="text-sm font-bold text-slate-800">
											Daftar Customer Piutang
										</p>
										<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
											{filteredPiutang.length} data
										</span>
									</div>
									<div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
										<span className="inline-flex items-center gap-1 font-medium text-emerald-700">
											<span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
											{reminderStats.reminded} Sudah Di-reminder
										</span>
										<span>•</span>
										<span className="inline-flex items-center gap-1 font-medium text-slate-500">
											<span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
											{reminderStats.unreminded} Belum Di-reminder
										</span>
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<input
										type="text"
										placeholder="Cari customer / nota / layanan…"
										value={search}
										onChange={(e) => dispatch({ type: "set_search", payload: e.target.value })}
										className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 sm:w-48"
									/>
									<select
										value={statusFilter}
										onChange={(e) => dispatch({ type: "set_status", payload: e.target.value })}
										className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
									>
										<option value="all">Semua Jatuh Tempo</option>
										<option value="Belum Jatuh Tempo">Belum Jatuh Tempo</option>
										<option value="Jatuh Tempo">Jatuh Tempo</option>
										<option value="Terlambat">Terlambat</option>
									</select>
									<select
										value={reminderFilter}
										onChange={(e) => dispatch({ type: "set_reminder_filter", payload: e.target.value })}
										className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-300"
									>
										<option value="all">Semua Status Reminder</option>
										<option value="unreminded">Belum Di-reminder ({reminderStats.unreminded})</option>
										<option value="reminded">Sudah Di-reminder ({reminderStats.reminded})</option>
									</select>
									<button
										type="button"
										onClick={handleExport}
										disabled={exporting || !data}
										className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{exporting ? "Exporting…" : "Export Excel"}
									</button>
								</div>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
											<th className="pb-3 pr-3">Customer</th>
											<th className="pb-3 pr-3">Telepon</th>
											<th className="pb-3 pr-3">No Nota</th>
											<th className="pb-3 pr-3">Tgl Terima</th>
											<th className="pb-3 pr-3">Jatuh Tempo</th>
											<th className="pb-3 pr-3">Aging</th>
											<th className="pb-3 pr-3">Jumlah</th>
											<th className="pb-3 pr-3">Status</th>
											<th className="pb-3 pr-3">Status Reminder</th>
											<th className="pb-3 text-right">Aksi</th>
										</tr>
									</thead>
									<tbody>
										{pagedRows.length === 0 ? (
											<tr>
												<td colSpan={10} className="py-8 text-center text-slate-400">
													Tidak ada data yang sesuai dengan filter
												</td>
											</tr>
										) : (
											pagedRows.map((row, i) => {
												return (
													<tr
														key={`${row.no_nota}-${i}`}
														className={`border-b border-slate-50 transition hover:bg-slate-50/50 ${
															row.is_reminded ? "bg-emerald-50/20" : ""
														}`}
													>
														<td className="py-3 pr-3 font-semibold text-slate-800">
															{row.customer_nama}
														</td>
														<td className="py-3 pr-3 text-xs">
															{row.customer_telepon ? (
																<span className="font-mono text-slate-600">
																	{row.customer_telepon}
																</span>
															) : (
																<span className="text-slate-400">-</span>
															)}
														</td>
														<td className="py-3 pr-3 font-mono text-xs text-slate-600">
															{row.no_nota}
														</td>
														<td className="py-3 pr-3 text-slate-600">{row.tgl_terima}</td>
														<td className="py-3 pr-3 text-slate-600">{row.tgl_selesai}</td>
														<td className="py-3 pr-3 text-slate-600">
															{row.aging === 0 ? "0" : `${row.aging} hari`}
														</td>
														<td className="py-3 pr-3 font-semibold text-slate-800">
															Rp {fmtIDR(Number(row.piutang))}
														</td>
														<td className="py-3 pr-3">
															<span
																className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLOR[row.status] ?? "bg-slate-100 text-slate-600"}`}
															>
																{row.status}
															</span>
														</td>
														<td className="py-3 pr-3">
															{row.is_reminded ? (
																<div className="inline-flex flex-col">
																	<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
																		<HiCheckCircle className="h-3.5 w-3.5 text-emerald-600" />
																		Sudah Di-reminder
																	</span>
																	{row.reminded_at && (
																		<span className="mt-0.5 text-[10px] text-slate-400">
																			{formatDateTimeIndo(row.reminded_at)} ({row.reminder_count || 1}x)
																		</span>
																	)}
																</div>
															) : (
																<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
																	<HiOutlineClock className="h-3.5 w-3.5 text-slate-400" />
																	Belum Di-reminder
																</span>
															)}
														</td>
														<td className="py-3 text-right">
															<div className="inline-flex items-center justify-end gap-1.5">
																<button
																	type="button"
																	onClick={() => handleOpenWaModal(row)}
																	className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-xs transition ${
																		row.is_reminded
																			? "bg-slate-100 text-slate-700 hover:bg-slate-200"
																			: "bg-emerald-600 text-white hover:bg-emerald-700"
																	}`}
																	title="Kirim pesan pengingat pembayaran ke WhatsApp"
																>
																	<HiOutlineChatBubbleLeftRight className="h-4 w-4" />
																	<span>{row.is_reminded ? "Kirim Ulang" : "Reminder"}</span>
																</button>

																<button
																	type="button"
																	onClick={() => handleManualToggleRemind(row)}
																	className={`rounded-lg p-1.5 text-xs transition ${
																		row.is_reminded
																			? "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
																			: "text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
																	}`}
																	title={
																		row.is_reminded
																			? "Reset status reminder kembali ke belum dikirim"
																			: "Tandai manual sudah diingatkan"
																	}
																>
																	{row.is_reminded ? (
																		<HiArrowUturnLeft className="h-4 w-4" />
																	) : (
																		<HiOutlineCheck className="h-4 w-4" />
																	)}
																</button>
															</div>
														</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>

							{totalPages > 1 && (
								<div className="mt-4 flex items-center justify-between text-xs text-slate-500">
									<span>
										Halaman {page} / {totalPages}
									</span>
									<div className="flex gap-2">
										<button
											type="button"
											disabled={page <= 1}
											onClick={() => dispatch({ type: "set_page", payload: page - 1 })}
											className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
										>
											Prev
										</button>
										<button
											type="button"
											disabled={page >= totalPages}
											onClick={() => dispatch({ type: "set_page", payload: page + 1 })}
											className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
										>
											Next
										</button>
									</div>
								</div>
							)}
						</Card>
					</>
				)}
			</div>

			{/* Modal Preview & Kirim WhatsApp (Mirroring Aging Layanan) */}
			{waModalOpen &&
				waTargetItem &&
				createPortal(
					<div
						className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
						onClick={(e) => {
							if (e.target === e.currentTarget) setWaModalOpen(false);
						}}
					>
						<div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
							{/* Header */}
							<div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
								<div className="flex items-center gap-2.5">
									<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
										<HiOutlineChatBubbleLeftRight className="h-5 w-5" />
									</div>
									<div>
										<h3 className="text-sm font-bold text-slate-800">
											Reminder Pembayaran Piutang Cleanox
										</h3>
										<p className="text-xs text-slate-500">
											Kirim pesan pengingat tagihan nota via WhatsApp
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setWaModalOpen(false)}
									className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
								>
									<HiOutlineXMark className="h-5 w-5" />
								</button>
							</div>

							{/* Target Summary */}
							<div className="border-b border-slate-100 bg-slate-50/40 px-5 py-3 text-xs">
								<div className="grid grid-cols-2 gap-2 text-slate-600">
									<div>
										<span className="text-slate-400">Customer: </span>
										<span className="font-semibold text-slate-800">{waTargetItem.customer_nama}</span>
									</div>
									<div>
										<span className="text-slate-400">Telepon: </span>
										<span className="font-mono font-medium text-emerald-700">
											{waTargetItem.customer_telepon || "-"}
										</span>
									</div>
									<div>
										<span className="text-slate-400">No. Nota: </span>
										<span className="font-mono font-semibold text-slate-800">
											{waTargetItem.no_nota}
										</span>
									</div>
									<div>
										<span className="text-slate-400">Total Tagihan: </span>
										<span className="font-bold text-rose-600">
											Rp {fmtIDR(Number(waTargetItem.piutang))}
										</span>
									</div>
								</div>
							</div>

							{/* Message Body Preview & Edit */}
							<div className="p-5 space-y-3">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-slate-700">
										Draft Pesan WhatsApp
									</label>
									<button
										type="button"
										onClick={handleCopyMessage}
										className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
									>
										<HiOutlineDocumentDuplicate className="h-3.5 w-3.5" />
										<span>{copied ? "Tersalin!" : "Salin Pesan"}</span>
									</button>
								</div>
								<textarea
									rows={9}
									value={customWaMessage}
									onChange={(e) => setCustomWaMessage(e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-800 shadow-inner focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
								/>
								<p className="text-[11px] text-slate-400">
									💡 Pesan otomatis disesuaikan dengan template resmi Cleanox dan informasi rekening transfer BSI. Anda dapat mengedit teks sebelum mengirim.
								</p>
							</div>

							{/* Actions Footer */}
							<div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
								<button
									type="button"
									onClick={() => setWaModalOpen(false)}
									className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
								>
									Batal
								</button>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => handleSendWa(true)}
										className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
										title="Buka link wa.me langsung (khusus bila WhatsApp Web di browser mengalami kendala)"
									>
										Direct wa.me (HP)
									</button>
									<button
										type="button"
										onClick={() => handleSendWa(false)}
										className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
									>
										<HiOutlinePaperAirplane className="h-4 w-4" />
										<span>Buka WhatsApp & Catat</span>
									</button>
								</div>
							</div>
						</div>
					</div>,
					document.body
				)}
		</div>
	);
}
