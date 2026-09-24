import { useEffect, useMemo, useReducer, useState } from "react";
import {
	ResponsiveContainer,
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
} from "recharts";
import { HiOutlineArrowDownTray } from "react-icons/hi2";
import { api } from "../../../lib/api";
import CleanoxDashboardFilterBar from "./dashboard/CleanoxDashboardFilterBar";
import { PhotoThumb, PaymentProofViewerModal } from "./PaymentProofViewer";
import {
	buildPendapatanParams,
	fmtIDR,
	getDefaultDashboardFilters,
} from "../utils/dashboardFilters";
import { exportRiwayatTransaksiCleanoxExcel } from "../utils/exportRiwayatTransaksiCleanoxExcel";

function Card({ className = "", children }) {
	return (
		<div
			className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
		>
			{children}
		</div>
	);
}

function fetchReducer(state, action) {
	switch (action.type) {
		case "success":
			return { data: action.payload, loading: false, error: null };
		case "error":
			return { data: null, loading: false, error: action.payload };
		case "loading":
			return { ...state, loading: true, error: null };
		default:
			return state;
	}
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
		maximumFractionDigits: 0,
	}).format(Number(value) || 0);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function PendapatanCleanox() {
	const defaults = getDefaultDashboardFilters();
	const [serviceMode, setServiceMode] = useState(defaults.serviceMode);
	const [filterType, setFilterType] = useState(defaults.filterType);
	const [month, setMonth] = useState(defaults.month);
	const [year, setYear] = useState(defaults.year);
	const [startDate, setStartDate] = useState(defaults.startDate);
	const [endDate, setEndDate] = useState(defaults.endDate);

	const filters = useMemo(
		() => ({ serviceMode, filterType, month, year, startDate, endDate }),
		[serviceMode, filterType, month, year, startDate, endDate],
	);

	const [{ data, loading, error }, dispatch] = useReducer(fetchReducer, {
		data: null,
		loading: true,
		error: null,
	});
	const [lunasRows, setLunasRows] = useState([]);
	const [lunasLoading, setLunasLoading] = useState(true);
	const [photoViewer, setPhotoViewer] = useState(null);

	useEffect(() => {
		document.title = "Pendapatan Cleanox | Alora Group Indonesia";
	}, []);

	const outletsKey = filters.serviceMode || "all";

	useEffect(() => {
		let cancelled = false;
		dispatch({ type: "loading" });
		const qs = buildPendapatanParams(filters);
		api(`/cleanox/pendapatan${qs ? `?${qs}` : ""}`)
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

	useEffect(() => {
		const meta = data?.meta;
		if (!meta?.dateStart) {
			setLunasRows([]);
			setLunasLoading(false);
			return undefined;
		}
		let cancelled = false;
		(async () => {
			try {
				setLunasLoading(true);
				const end = meta.asOfDate || meta.dateEnd;
				const qs = new URLSearchParams({
					startDate: meta.dateStart,
					endDate: end,
					payment_status: "lunas",
					service_mode: filters.serviceMode || "all",
					date_by: "omzet",
					source: "unified",
				});
				const response = await api(`/cleanox/riwayat-transaksi?${qs.toString()}`);
				if (!cancelled) setLunasRows(response.data || []);
			} catch {
				if (!cancelled) setLunasRows([]);
			} finally {
				if (!cancelled) setLunasLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [data?.meta?.dateStart, data?.meta?.dateEnd, data?.meta?.asOfDate, filters.serviceMode]);

	const outlets = data?.outlets ?? [];
	const trend = data?.trend ?? [];
	const meta = data?.meta ?? {};
	const isYearFilter = filters.filterType === "year";

	const chartTrendDaily = trend;
	const chartTrend = isYearFilter
		? Object.values(
				chartTrendDaily.reduce((acc, d) => {
					const m = String(d.date).slice(0, 7);
					if (!acc[m]) acc[m] = { month: m, sales: 0 };
					acc[m].sales += Number(d.sales) || 0;
					return acc;
				}, {}),
			)
				.sort((a, b) => a.month.localeCompare(b.month))
				.map((d) => ({
					label: MONTH_NAMES[parseInt(d.month.slice(5, 7), 10) - 1],
					sales: d.sales,
				}))
		: chartTrendDaily;

	// KPI: single performa row (label = layanan filter)
	const performaRow = outlets[0];
	const totalCapaian = Number(performaRow?.actual_sales ?? 0);
	const totalTarget = Number(performaRow?.target_bulanan ?? 0);
	const totalTargetKumulatif = Number(performaRow?.target_kumulatif_sales ?? 0);
	const totalGap = totalCapaian - totalTargetKumulatif;
	const achievement = totalTarget > 0 ? ((totalCapaian / totalTarget) * 100).toFixed(1) : "0.0";

	const lunasPeriodLabel = meta.dateStart
		? `${meta.dateStart} – ${meta.asOfDate || meta.dateEnd}`
		: "";

	return (
		<div className="min-h-full space-y-5 bg-slate-50 py-6">
			<div className="px-4 sm:px-6">
				<h1 className="text-2xl font-bold tracking-tight text-[#1b3459] sm:text-3xl">
					Dashboard Pendapatan
				</h1>
				<p className="mt-1 text-sm text-slate-500">
					Omzet lunas POS + Smartlink (unified) vs target. Lihat semua transaksi / input history:
					Cleanox Only.
				</p>
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
						<div className="h-72 rounded-2xl bg-slate-200" />
						<div className="h-64 rounded-2xl bg-slate-200" />
					</div>
				) : error ? (
					<div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
						Gagal memuat data pendapatan: {error}
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
							{[
								{
									label: "Total Pendapatan",
									value: `Rp ${fmtIDR(totalCapaian)}`,
									icon: "💰",
									tone: "from-fuchsia-500 to-pink-500",
								},
								{
									label: "Total Target Bulanan",
									value: `Rp ${fmtIDR(totalTarget)}`,
									icon: "🎯",
									tone: "from-violet-500 to-purple-500",
								},
								{
									label: "Achievement",
									value: `${achievement}%`,
									icon: "📈",
									tone: "from-sky-500 to-blue-500",
								},
								{
									label: "Gap s.d Hari Ini",
									value: `${totalGap >= 0 ? "+" : ""}Rp ${fmtIDR(Math.round(totalGap))}`,
									icon: totalGap >= 0 ? "✅" : "⚠️",
									tone:
										totalGap >= 0
											? "from-emerald-400 to-teal-500"
											: "from-rose-400 to-red-500",
								},
							].map((k) => (
								<Card key={k.label} className="flex items-center gap-4 p-4 sm:p-5">
									<div
										className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow ${k.tone}`}
									>
										{k.icon}
									</div>
									<div>
										<p className="text-xs leading-tight text-slate-500">{k.label}</p>
										<p className="text-base font-extrabold text-slate-800">{k.value}</p>
									</div>
								</Card>
							))}
						</div>

						<Card className="p-4 sm:p-6">
							<p className="mb-4 text-sm font-bold text-slate-700">
								{isYearFilter ? "Tren Pendapatan Bulanan" : "Tren Pendapatan Harian"}
								{meta.dateStart && (
									<span className="ml-2 text-xs font-normal text-slate-400">
										({meta.dateStart} s.d {meta.asOfDate})
									</span>
								)}
							</p>
							<div className="h-56 sm:h-64">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={chartTrend}>
										<defs>
											<linearGradient id="gCleanoxSales" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
												<stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
										<XAxis
											dataKey={isYearFilter ? "label" : "date"}
											tick={{ fontSize: 11 }}
											axisLine={false}
											tickLine={false}
											tickFormatter={
												isYearFilter
													? undefined
													: (v) => String(parseInt(String(v)?.split("-")[2] || v, 10))
											}
										/>
										<YAxis
											tick={{ fontSize: 11 }}
											axisLine={false}
											tickLine={false}
											width={45}
											tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
										/>
										<Tooltip
											formatter={(v) => [`Rp ${fmtIDR(v)}`, "Pendapatan"]}
											labelFormatter={
												isYearFilter
													? undefined
													: (label) => {
															if (!label) return "";
															const parts = String(label).split("-");
															if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
															return label;
														}
											}
										/>
										<Area
											type="monotone"
											dataKey="sales"
											stroke="#EC4899"
											strokeWidth={2.5}
											fill="url(#gCleanoxSales)"
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</Card>

						<Card className="p-4 sm:p-6">
							<p className="mb-4 text-sm font-bold text-slate-700">Performa Cleanox</p>

							<div className="hidden overflow-x-auto md:block">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
											<th className="pb-3 pr-4">Entitas</th>
											<th className="pb-3 pr-4">Target Bulanan</th>
											<th className="pb-3 pr-4">Target s.d Hari Ini</th>
											<th className="pb-3 pr-4">Capaian s.d Hari Ini</th>
											<th className="pb-3 pr-4">Gap</th>
											<th className="pb-3">Status</th>
										</tr>
									</thead>
									<tbody>
										{outlets.map((row) => {
											const adjustedActual = Number(row.actual_sales) || 0;
											const targetBulanan = Number(row.target_bulanan) || 0;
											const capaianPersen =
												targetBulanan > 0 ? (adjustedActual / targetBulanan) * 100 : 0;
											const gap = adjustedActual - Number(row.target_kumulatif_sales);
											const isOver = gap >= 0;
											return (
												<tr
													key={row.outlet}
													className="border-b border-slate-50 transition hover:bg-slate-50/40"
												>
													<td className="py-3 pr-4 font-semibold text-slate-800">{row.outlet}</td>
													<td className="py-3 pr-4 text-slate-600">
														Rp {fmtIDR(Number(row.target_bulanan))}
													</td>
													<td className="py-3 pr-4 text-slate-600">
														Rp {fmtIDR(Math.round(Number(row.target_kumulatif_sales)))}
													</td>
													<td className="py-3 pr-4 font-semibold text-slate-800">
														Rp {fmtIDR(adjustedActual)}
														<span className="ml-1 text-xs font-normal text-slate-400">
															({capaianPersen.toFixed(1)}%)
														</span>
													</td>
													<td
														className={`py-3 pr-4 font-bold ${isOver ? "text-emerald-600" : "text-rose-500"}`}
													>
														{isOver ? "+" : ""}Rp {fmtIDR(Math.round(gap))}
													</td>
													<td className="py-3">
														<span
															className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
																isOver
																	? "bg-emerald-100 text-emerald-700"
																	: "bg-rose-100 text-rose-600"
															}`}
														>
															{isOver ? "Over Target" : "Tertinggal"}
														</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							<div className="flex flex-col gap-3 md:hidden">
								{outlets.map((row) => {
									const adjustedActual = Number(row.actual_sales) || 0;
									const targetBulanan = Number(row.target_bulanan) || 0;
									const capaianPersen =
										targetBulanan > 0 ? (adjustedActual / targetBulanan) * 100 : 0;
									const gap = adjustedActual - Number(row.target_kumulatif_sales);
									const isOver = gap >= 0;
									return (
										<div
											key={row.outlet}
											className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4"
										>
											<div className="flex items-center justify-between">
												<span className="text-sm font-semibold text-slate-800">{row.outlet}</span>
												<span
													className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
														isOver
															? "bg-emerald-100 text-emerald-700"
															: "bg-rose-100 text-rose-600"
													}`}
												>
													{isOver ? "Over Target" : "Tertinggal"}
												</span>
											</div>
											<div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
												<div>
													<p className="font-medium text-slate-400">Target Bulanan</p>
													<p className="font-semibold text-slate-700">
														Rp {fmtIDR(Number(row.target_bulanan))}
													</p>
												</div>
												<div>
													<p className="font-medium text-slate-400">Target s.d Hari Ini</p>
													<p className="font-semibold text-slate-700">
														Rp {fmtIDR(Math.round(Number(row.target_kumulatif_sales)))}
													</p>
												</div>
												<div>
													<p className="font-medium text-slate-400">Capaian</p>
													<p className="font-bold text-slate-800">
														Rp {fmtIDR(adjustedActual)} ({capaianPersen.toFixed(1)}%)
													</p>
												</div>
												<div>
													<p className="font-medium text-slate-400">Gap</p>
													<p
														className={`font-bold ${isOver ? "text-emerald-600" : "text-rose-500"}`}
													>
														{isOver ? "+" : ""}Rp {fmtIDR(Math.round(gap))}
													</p>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</Card>
					</>
				)}

				{/* Rincian transaksi lunas + bukti */}
				<Card className="overflow-hidden">
					<div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
						<div>
							<h2 className="text-base font-bold text-slate-800">Rincian Transaksi Lunas</h2>
							<p className="mt-0.5 text-xs text-slate-500">
								Smartlink &amp; POS lunas pada periode aktif (tanggal omzet = pelunasan POS jika ada,
								else tanggal layanan; Smartlink = tanggal layanan).
							</p>
							<p className="mt-1 text-xs text-slate-400">
								{lunasLoading ? "Memuat..." : `${lunasRows.length} transaksi`}
							</p>
						</div>
						<button
							type="button"
							disabled={lunasLoading || lunasRows.length === 0}
							onClick={() => {
								try {
									exportRiwayatTransaksiCleanoxExcel({
										records: lunasRows,
										periodLabel: lunasPeriodLabel,
										activePeriod: {
											startDate: meta.dateStart,
											endDate: meta.asOfDate || meta.dateEnd,
										},
										title: "Pendapatan Cleanox — Transaksi Lunas",
										filePrefix: "Pendapatan_Cleanox_Lunas",
										sheetName: "Lunas",
										dateField: "omzet_date",
										dateHeader: "TGL OMZET",
										includeRekonsiliasi: true,
									});
								} catch (err) {
									alert("Gagal export: " + (err.message || "unknown"));
								}
							}}
							className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
							Export Excel
						</button>
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
										Sumber
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Tgl Omzet
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
								{lunasLoading ? (
									<tr>
										<td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
											Memuat transaksi lunas...
										</td>
									</tr>
								) : lunasRows.length === 0 ? (
									<tr>
										<td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
											Tidak ada transaksi lunas pada periode ini.
										</td>
									</tr>
								) : (
									lunasRows.map((row) => {
										const sourceLabel = row.is_history_entry
											? "History"
											: row.source_system === "smartlink"
												? "Smartlink"
												: "POS";
										const omzetDisplay =
											row.omzet_date || row.payment_settled_date || row.service_date;
										return (
										<tr
											key={`${row.source_system || "pos"}-${row.transaction_no}-${row.id ?? "x"}`}
											className="hover:bg-slate-50"
										>
											<td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1b3459]">
												{row.transaction_no}
											</td>
											<td className="px-4 py-3">
												<div className="font-medium text-slate-800">{row.customer_name}</div>
												<div className="text-xs text-slate-400">{row.customer_phone || "-"}</div>
											</td>
											<td className="whitespace-nowrap px-4 py-3">
												<span
													className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
														sourceLabel === "Smartlink"
															? "bg-violet-50 text-violet-700"
															: sourceLabel === "History"
																? "bg-amber-50 text-amber-700"
																: "bg-sky-50 text-sky-700"
													}`}
												>
													{sourceLabel}
												</span>
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-slate-600">
												{formatDate(omzetDisplay)}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-slate-600">
												{row.kategori || "-"}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.status}</td>
											<td className="whitespace-nowrap px-4 py-3">
												<span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
													Lunas
												</span>
											</td>
											<td className="px-4 py-3">
												<div className="flex flex-wrap gap-1.5">
													{(row.payment_proofs || []).length === 0 ? (
														<span className="text-xs text-slate-300">—</span>
													) : (
														(row.payment_proofs || []).map((p, idx) => (
															<PhotoThumb
																key={p.id || idx}
																path={p.url}
																label={`Bukti ${idx + 1}`}
																onOpen={() =>
																	setPhotoViewer({
																		url: p.url,
																		label: `${row.transaction_no} · bukti ${idx + 1}`,
																	})
																}
															/>
														))
													)}
												</div>
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-800">
												{formatCurrency(row.final_amount)}
											</td>
										</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</Card>
			</div>

			<PaymentProofViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
		</div>
	);
}
