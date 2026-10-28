import { useEffect, useMemo, useReducer, useState } from "react";
import {
	ResponsiveContainer,
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	Legend,
} from "recharts";
import { HiOutlineArrowDownTray } from "react-icons/hi2";
import { api } from "../../../lib/api";
import CleanoxDashboardFilterBar from "./dashboard/CleanoxDashboardFilterBar";
import CleanoxByWaschenTab from "./dashboard/CleanoxByWaschenTab";
import { PhotoThumb, PaymentProofViewerModal } from "./PaymentProofViewer";
import {
	buildPendapatanParams,
	fmtIDR,
	getDefaultDashboardFilters,
} from "../utils/dashboardFilters";
import { exportRiwayatTransaksiCleanoxExcel } from "../utils/exportRiwayatTransaksiCleanoxExcel";
import { exportTotalPendapatanCleanoxExcel } from "../utils/exportTotalPendapatanCleanoxExcel";

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

/** Fill daily trend for full cutoff window (26→25), zeros for days without sales. */
function padDailyTrend(trend, dateStart, dateEnd) {
	if (!dateStart || !dateEnd) return trend || [];
	const byDate = new Map((trend || []).map((d) => [String(d.date).slice(0, 10), Number(d.sales) || 0]));
	const out = [];
	const cur = new Date(`${dateStart}T12:00:00`);
	const end = new Date(`${dateEnd}T12:00:00`);
	if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return trend || [];
	while (cur <= end) {
		const y = cur.getFullYear();
		const m = String(cur.getMonth() + 1).padStart(2, "0");
		const d = String(cur.getDate()).padStart(2, "0");
		const key = `${y}-${m}-${d}`;
		out.push({ date: key, sales: byDate.get(key) || 0 });
		cur.setDate(cur.getDate() + 1);
	}
	return out;
}

function formatChartDayTick(isoDate) {
	const parts = String(isoDate || "").split("-");
	if (parts.length < 3) return String(isoDate || "");
	const day = parseInt(parts[2], 10);
	const monthIdx = parseInt(parts[1], 10) - 1;
	const mon = MONTH_NAMES[monthIdx] || parts[1];
	return `${day} ${mon}`;
}

function buildWaschenParams(filters) {
	const p = new URLSearchParams();
	p.set("outlet", "all");
	p.set("pageSize", "10000");
	p.set("page", "1");
	if (filters.filterType === "month" && filters.month) {
		p.set("filterType", "month");
		p.set("month", filters.month);
		p.set("asOfDate", `${filters.month}-25`);
	} else if (filters.filterType === "year" && filters.year) {
		p.set("filterType", "year");
		p.set("year", filters.year);
	} else if (filters.filterType === "range" && filters.startDate && filters.endDate) {
		p.set("filterType", "range");
		p.set("startDate", filters.startDate);
		p.set("endDate", filters.endDate);
	}
	return p.toString();
}

function CombinedTooltip({ active, payload, label }) {
	if (!active || !payload?.length) return null;
	const displayLabel = label && String(label).includes("-") ? formatDate(label) : label;
	return (
		<div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-xl">
			{displayLabel && <p className="mb-2 font-bold text-slate-800">{displayLabel}</p>}
			<div className="space-y-1">
				{payload.map((p, i) => (
					<div key={i} className="flex items-center justify-between gap-4">
						<span className="flex items-center gap-1.5 font-medium" style={{ color: p.color || p.stroke || p.fill }}>
							<span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.stroke || p.fill }} />
							{p.name}:
						</span>
						<span className="font-bold text-slate-800">
							{typeof p.value === "number" ? `Rp ${fmtIDR(p.value)}` : p.value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

export default function PendapatanCleanox() {
	const defaults = getDefaultDashboardFilters();
	const [activeTab, setActiveTab] = useState("total");
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

	// Cleanox Only State
	const [{ data, loading, error }, dispatch] = useReducer(fetchReducer, {
		data: null,
		loading: true,
		error: null,
	});
	const [lunasRows, setLunasRows] = useState([]);
	const [lunasLoading, setLunasLoading] = useState(true);
	const [photoViewer, setPhotoViewer] = useState(null);

	// Waschen State
	const [{ data: waschenData, loading: waschenLoading, error: waschenError }, dispatchWaschen] =
		useReducer(fetchReducer, {
			data: null,
			loading: true,
			error: null,
		});

	useEffect(() => {
		document.title = "Pendapatan Cleanox | Alora Group Indonesia";
	}, []);

	const outletsKey = filters.serviceMode || "all";

	// 1. Fetch Cleanox Only
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

	// 2. Fetch Cleanox Lunas Transactions
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
					split_payment: "1",
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.meta?.dateStart, data?.meta?.dateEnd, data?.meta?.asOfDate, filters.serviceMode]);

	// 3. Fetch Waschen Data
	useEffect(() => {
		let cancelled = false;
		dispatchWaschen({ type: "loading" });
		const qsWaschen = buildWaschenParams(filters);
		api(`/sales/cleanox-by-waschen?${qsWaschen}`)
			.then((res) => {
				if (!cancelled) dispatchWaschen({ type: "success", payload: res });
			})
			.catch((err) => {
				if (!cancelled) dispatchWaschen({ type: "error", payload: err.message });
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters.filterType, filters.month, filters.year, filters.startDate, filters.endDate]);

	const lunasTransactionCount = new Set(
		lunasRows.map((r) => `${r.source_system || "pos"}-${r.id ?? r.transaction_no}`),
	).size;
	const outlets = data?.outlets ?? [];
	const trend = data?.trend ?? [];
	const meta = data?.meta ?? {};
	const isYearFilter = filters.filterType === "year";

	// Cleanox Only Calculations
	const performaRow = outlets[0];
	const totalCapaianCleanox = Number(performaRow?.actual_sales ?? 0);
	const totalTarget = Number(performaRow?.target_bulanan ?? 0);
	const totalTargetKumulatif = Number(performaRow?.target_kumulatif_sales ?? 0);
	const totalGapCleanox = totalCapaianCleanox - totalTargetKumulatif;
	const achievementCleanox =
		totalTarget > 0 ? ((totalCapaianCleanox / totalTarget) * 100).toFixed(1) : "0.0";

	// Waschen Calculations
	const waschenGross = Number(waschenData?.kpi?.total_omzet ?? 0);
	const waschenReal70 = Number(waschenData?.kpi?.jatah_70 ?? Math.round(waschenGross * 0.7));
	const waschenNotaCount = Number(waschenData?.kpi?.total_nota ?? 0);

	// Total Combined Calculations
	const totalCombinedRevenue = totalCapaianCleanox + waschenReal70;
	const totalCombinedGap = totalCombinedRevenue - totalTargetKumulatif;
	const totalCombinedAchievement =
		totalTarget > 0 ? ((totalCombinedRevenue / totalTarget) * 100).toFixed(1) : "0.0";
	const totalCombinedNotaCount = lunasTransactionCount + waschenNotaCount;

	const lunasPeriodLabel = meta.dateStart
		? `${meta.dateStart} – ${meta.dateEnd || meta.asOfDate}`
		: "";
	const lunasPeriodLabelId = meta.dateStart
		? `${formatDate(meta.dateStart)} – ${formatDate(meta.dateEnd || meta.asOfDate)}`
		: "";

	// Cleanox Only Daily Trend
	const chartTrendDaily = padDailyTrend(
		trend,
		meta.dateStart,
		meta.asOfDate || meta.dateEnd,
	);
	const chartTrendCleanox = isYearFilter
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

	// Combined Trend Calculations
	const combinedChartTrend = useMemo(() => {
		const cleanoxMap = new Map(
			chartTrendDaily.map((d) => [String(d.date).slice(0, 10), Number(d.sales) || 0]),
		);
		const waschenTrend = waschenData?.trend || [];
		const waschen70Map = new Map(
			waschenTrend.map((d) => [
				String(d.date).slice(0, 10),
				Math.round((Number(d.total) || 0) * 0.7),
			]),
		);

		const allDates = new Set([...cleanoxMap.keys(), ...waschen70Map.keys()]);
		if (meta.dateStart && (meta.asOfDate || meta.dateEnd)) {
			const cur = new Date(`${meta.dateStart}T12:00:00`);
			const end = new Date(`${meta.asOfDate || meta.dateEnd}T12:00:00`);
			if (!Number.isNaN(cur.getTime()) && !Number.isNaN(end.getTime())) {
				while (cur <= end) {
					const y = cur.getFullYear();
					const m = String(cur.getMonth() + 1).padStart(2, "0");
					const d = String(cur.getDate()).padStart(2, "0");
					allDates.add(`${y}-${m}-${d}`);
					cur.setDate(cur.getDate() + 1);
				}
			}
		}

		const dailyRows = Array.from(allDates)
			.sort((a, b) => a.localeCompare(b))
			.map((date) => {
				const cSales = cleanoxMap.get(date) || 0;
				const wSales = waschen70Map.get(date) || 0;
				return {
					date,
					cleanox: cSales,
					waschen: wSales,
					total: cSales + wSales,
				};
			});

		if (isYearFilter) {
			const byMonth = dailyRows.reduce((acc, d) => {
				const m = String(d.date).slice(0, 7);
				if (!acc[m]) acc[m] = { month: m, cleanox: 0, waschen: 0, total: 0 };
				acc[m].cleanox += d.cleanox;
				acc[m].waschen += d.waschen;
				acc[m].total += d.total;
				return acc;
			}, {});
			return Object.values(byMonth)
				.sort((a, b) => a.month.localeCompare(b.month))
				.map((d) => ({
					label: MONTH_NAMES[parseInt(d.month.slice(5, 7), 10) - 1],
					cleanox: d.cleanox,
					waschen: d.waschen,
					total: d.total,
				}));
		}

		return dailyRows;
	}, [chartTrendDaily, waschenData?.trend, meta.dateStart, meta.asOfDate, meta.dateEnd, isYearFilter]);

	const TABS = [
		{
			id: "total",
			label: "Total Pendapatan",
			icon: "📊",
			badge: "Cleanox + Waschen (70%)",
		},
		{
			id: "cleanox_only",
			label: "Cleanox Only",
			icon: "🧼",
			badge: "POS & Smartlink",
		},
		{
			id: "cleanox_by_waschen",
			label: "Cleanox by Waschen",
			icon: "🧺",
			badge: "Bagi Hasil 70%",
		},
	];

	return (
		<div className="min-h-full space-y-5 bg-slate-50 py-6">
			{/* Page Header */}
			<div className="px-4 sm:px-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-[#1b3459] sm:text-3xl">
							Dashboard Pendapatan
						</h1>
						<p className="mt-1 text-sm text-slate-500">
							Monitoring performa omzet Cleanox: Gabungan Total, Cleanox Only, dan Cleanox by Waschen.
						</p>
					</div>

					{/* Export Excel Button for Total Tab */}
					{activeTab === "total" && (
						<button
							type="button"
							disabled={loading || waschenLoading || (lunasRows.length === 0 && (waschenData?.detail || []).length === 0)}
							onClick={() => {
								try {
									exportTotalPendapatanCleanoxExcel({
										cleanoxRecords: lunasRows,
										waschenRecords: waschenData?.detail || [],
										waschenKpi: waschenData?.kpi || {},
										periodLabel: lunasPeriodLabel,
										activePeriod: {
											startDate: meta.dateStart,
											endDate: meta.dateEnd || meta.asOfDate,
										},
										filePrefix: "Pendapatan_Total_Cleanox",
									});
								} catch (err) {
									alert("Gagal export: " + (err.message || "unknown"));
								}
							}}
							className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto sm:text-sm"
						>
							<HiOutlineArrowDownTray className="h-4 w-4" />
							<span>Export Excel Total (2 Sheet)</span>
						</button>
					)}
				</div>
			</div>

			{/* Filter Bar */}
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

			{/* Tab Navigation */}
			<div className="px-4 sm:px-6">
				<div className="flex flex-wrap gap-2 rounded-2xl bg-slate-200/60 p-1.5">
					{TABS.map((tab) => {
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:text-sm ${
									isActive
										? "bg-white text-[#1b3459] shadow-sm ring-1 ring-slate-200/80"
										: "text-slate-600 hover:bg-white/60 hover:text-slate-900"
								}`}
							>
								<span className="text-base">{tab.icon}</span>
								<span>{tab.label}</span>
								<span
									className={`hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block ${
										isActive
											? "bg-fuchsia-50 text-fuchsia-700 font-bold"
											: "bg-slate-200/70 text-slate-500"
									}`}
								>
									{tab.badge}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* TAB CONTENT */}
			<div className="space-y-5 px-4 sm:px-6">
				{/* ═════════════════════════════════════════════════════════════════════ */}
				{/* TAB 1: TOTAL PENDAPATAN (GABUNGAN CLEANOX ONLY + WASCHEN 70%)         */}
				{/* ═════════════════════════════════════════════════════════════════════ */}
				{activeTab === "total" && (
					<>
						{loading || waschenLoading ? (
							<div className="animate-pulse space-y-5">
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
									{[1, 2, 3, 4, 5].map((i) => (
										<div key={i} className="h-24 rounded-2xl bg-slate-200" />
									))}
								</div>
								<div className="h-72 rounded-2xl bg-slate-200" />
								<div className="h-64 rounded-2xl bg-slate-200" />
							</div>
						) : error || waschenError ? (
							<div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
								Gagal memuat data total: {error || waschenError}
							</div>
						) : (
							<>
								{/* 5 KPI Cards for Total */}
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4">
									{[
										{
											label: "Total Pendapatan Riil",
											value: `Rp ${fmtIDR(totalCombinedRevenue)}`,
											subtitle: `Cleanox: Rp ${fmtIDR(totalCapaianCleanox)} · Waschen (70%): Rp ${fmtIDR(waschenReal70)}`,
											icon: "💰",
											tone: "from-fuchsia-600 to-indigo-600",
											highlight: true,
										},
										{
											label: "Total Target Bulanan",
											value: `Rp ${fmtIDR(totalTarget)}`,
											subtitle: "Target Performa Cleanox",
											icon: "🎯",
											tone: "from-violet-500 to-purple-600",
										},
										{
											label: "Achievement Total",
											value: `${totalCombinedAchievement}%`,
											subtitle: `Target Kumulatif: Rp ${fmtIDR(Math.round(totalTargetKumulatif))}`,
											icon: "📈",
											tone: "from-sky-500 to-blue-600",
										},
										{
											label: "Gap s.d Hari Ini",
											value: `${totalCombinedGap >= 0 ? "+" : ""}Rp ${fmtIDR(Math.round(totalCombinedGap))}`,
											subtitle: totalCombinedGap >= 0 ? "Melampaui Target" : "Tertinggal Target",
											icon: totalCombinedGap >= 0 ? "✅" : "⚠️",
											tone:
												totalCombinedGap >= 0
													? "from-emerald-400 to-teal-500"
													: "from-rose-400 to-red-500",
										},
										{
											label: "Total Nota / Transaksi",
											value: `${totalCombinedNotaCount.toLocaleString("id-ID")}`,
											subtitle: `${lunasTransactionCount} Cleanox · ${waschenNotaCount} Waschen`,
											icon: "🧾",
											tone: "from-amber-400 to-orange-500",
										},
									].map((k) => (
										<Card
											key={k.label}
											className={`flex flex-col justify-between p-4 sm:p-5 ${
												k.highlight ? "ring-2 ring-fuchsia-400/50 bg-gradient-to-br from-white to-fuchsia-50/20" : ""
											}`}
										>
											<div className="flex items-center gap-3.5">
												<div
													className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow ${k.tone}`}
												>
													{k.icon}
												</div>
												<div className="min-w-0 flex-1">
													<p className="truncate text-xs font-semibold text-slate-500">{k.label}</p>
													<p className="text-base font-extrabold text-slate-800">{k.value}</p>
												</div>
											</div>
											{k.subtitle && (
												<div className="mt-2.5 border-t border-slate-100 pt-2">
													<p className="text-[11px] leading-tight text-slate-400">{k.subtitle}</p>
												</div>
											)}
										</Card>
									))}
								</div>

								{/* Ringkasan Entitas & Skema Bagi Hasil */}
								<Card className="p-4 sm:p-6">
									<div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<h3 className="text-sm font-bold text-slate-800">
												Rincian Kontribusi Pendapatan per Sumber
											</h3>
											<p className="text-xs text-slate-500">
												Perbandingan omzet bruto vs pendapatan riil yang masuk ke Cleanox
											</p>
										</div>
										<span className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 sm:self-auto">
											Periode: {lunasPeriodLabelId || "–"}
										</span>
									</div>

									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead>
												<tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
													<th className="pb-3 pr-4">Entitas Sumber</th>
													<th className="pb-3 pr-4">Sistem / Saluran</th>
													<th className="pb-3 pr-4">Skema Pembagian</th>
													<th className="pb-3 pr-4 text-right">Omzet Bruto (100%)</th>
													<th className="pb-3 pr-4 text-right">Pendapatan Riil Cleanox</th>
													<th className="pb-3 text-right">Kontribusi (%)</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-50">
												{/* Row 1: Cleanox Only */}
												<tr className="hover:bg-slate-50/50 transition">
													<td className="py-3 pr-4 font-semibold text-slate-800">
														<span className="inline-flex items-center gap-1.5">
															<span>🧼</span> Cleanox Only
														</span>
													</td>
													<td className="py-3 pr-4 text-xs text-slate-600">POS Cleanox + Smartlink</td>
													<td className="py-3 pr-4 text-xs">
														<span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
															100% Hak Cleanox
														</span>
													</td>
													<td className="py-3 pr-4 text-right font-medium text-slate-700">
														Rp {fmtIDR(totalCapaianCleanox)}
													</td>
													<td className="py-3 pr-4 text-right font-bold text-slate-900">
														Rp {fmtIDR(totalCapaianCleanox)}
													</td>
													<td className="py-3 text-right font-semibold text-fuchsia-600">
														{totalCombinedRevenue > 0
															? ((totalCapaianCleanox / totalCombinedRevenue) * 100).toFixed(1)
															: "0.0"}
														%
													</td>
												</tr>

												{/* Row 2: Cleanox by Waschen */}
												<tr className="hover:bg-slate-50/50 transition">
													<td className="py-3 pr-4 font-semibold text-slate-800">
														<span className="inline-flex items-center gap-1.5">
															<span>🧺</span> Cleanox by Waschen
														</span>
													</td>
													<td className="py-3 pr-4 text-xs text-slate-600">5 Outlet Waschen Laundry</td>
													<td className="py-3 pr-4 text-xs">
														<span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
															70% Cleanox · 30% Waschen
														</span>
													</td>
													<td className="py-3 pr-4 text-right font-medium text-slate-500 line-through">
														Rp {fmtIDR(waschenGross)}
													</td>
													<td className="py-3 pr-4 text-right font-bold text-amber-600">
														Rp {fmtIDR(waschenReal70)}
													</td>
													<td className="py-3 text-right font-semibold text-amber-600">
														{totalCombinedRevenue > 0
															? ((waschenReal70 / totalCombinedRevenue) * 100).toFixed(1)
															: "0.0"}
														%
													</td>
												</tr>
											</tbody>
											<tfoot>
												<tr className="border-t-2 border-slate-200 bg-slate-50/70 font-bold text-slate-800">
													<td className="py-3.5 pr-4" colSpan={3}>
														TOTAL PENDAPATAN GABUNGAN CLEANOX
													</td>
													<td className="py-3.5 pr-4 text-right text-xs text-slate-500">
														Rp {fmtIDR(totalCapaianCleanox + waschenGross)}
													</td>
													<td className="py-3.5 pr-4 text-right text-base font-extrabold text-[#1b3459]">
														Rp {fmtIDR(totalCombinedRevenue)}
													</td>
													<td className="py-3.5 text-right font-extrabold text-[#1b3459]">100.0%</td>
												</tr>
											</tfoot>
										</table>
									</div>
								</Card>

								{/* Combined Trend Area Chart */}
								<Card className="p-4 sm:p-6">
									<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p className="text-sm font-bold text-slate-700">
												{isYearFilter
													? "Tren Pendapatan Gabungan Bulanan"
													: "Tren Pendapatan Gabungan Harian"}
												{meta.dateStart && (
													<span className="ml-2 text-xs font-normal text-slate-400">
														(cutoff {formatDate(meta.dateStart)} s.d{" "}
														{formatDate(meta.asOfDate || meta.dateEnd)})
													</span>
												)}
											</p>
											<p className="mt-0.5 text-xs text-slate-500">
												Menampilkan kontribusi harian Cleanox Only dan Jatah 70% Cleanox by Waschen
											</p>
										</div>
									</div>

									<div className="h-64 sm:h-72">
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart data={combinedChartTrend}>
												<defs>
													<linearGradient id="gCombinedTotal" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
														<stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
													</linearGradient>
													<linearGradient id="gCombinedCleanox" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#EC4899" stopOpacity={0.25} />
														<stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
													</linearGradient>
													<linearGradient id="gCombinedWaschen" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
														<stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
													</linearGradient>
												</defs>
												<CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
												<XAxis
													dataKey={isYearFilter ? "label" : "date"}
													tick={{ fontSize: 10 }}
													axisLine={false}
													tickLine={false}
													interval="preserveStartEnd"
													minTickGap={28}
													tickFormatter={isYearFilter ? undefined : (v) => formatChartDayTick(v)}
												/>
												<YAxis
													tick={{ fontSize: 11 }}
													axisLine={false}
													tickLine={false}
													width={48}
													tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
												/>
												<Tooltip content={<CombinedTooltip />} />
												<Legend
													wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
													formatter={(value) => (
														<span className="text-slate-700 font-semibold">{value}</span>
													)}
												/>
												<Area
													type="monotone"
													dataKey="cleanox"
													name="Cleanox Only"
													stroke="#EC4899"
													strokeWidth={2}
													fill="url(#gCombinedCleanox)"
												/>
												<Area
													type="monotone"
													dataKey="waschen"
													name="Waschen (70%)"
													stroke="#F59E0B"
													strokeWidth={2}
													fill="url(#gCombinedWaschen)"
												/>
												<Area
													type="monotone"
													dataKey="total"
													name="Total Bersih"
													stroke="#4F46E5"
													strokeWidth={2.5}
													fill="url(#gCombinedTotal)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									</div>
								</Card>
							</>
						)}
					</>
				)}

				{/* ═════════════════════════════════════════════════════════════════════ */}
				{/* TAB 2: CLEANOX ONLY (POS + SMARTLINK CLEANOX)                         */}
				{/* ═════════════════════════════════════════════════════════════════════ */}
				{activeTab === "cleanox_only" && (
					<>
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
											label: "Total Pendapatan Cleanox",
											value: `Rp ${fmtIDR(totalCapaianCleanox)}`,
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
											label: "Achievement Cleanox",
											value: `${achievementCleanox}%`,
											icon: "📈",
											tone: "from-sky-500 to-blue-500",
										},
										{
											label: "Gap s.d Hari Ini",
											value: `${totalGapCleanox >= 0 ? "+" : ""}Rp ${fmtIDR(Math.round(totalGapCleanox))}`,
											icon: totalGapCleanox >= 0 ? "✅" : "⚠️",
											tone:
												totalGapCleanox >= 0
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
										{isYearFilter ? "Tren Pendapatan Bulanan (Cleanox Only)" : "Tren Pendapatan Harian (Cleanox Only)"}
										{meta.dateStart && (
											<span className="ml-2 text-xs font-normal text-slate-400">
												(cutoff {formatDate(meta.dateStart)} s.d{" "}
												{formatDate(meta.asOfDate || meta.dateEnd)})
											</span>
										)}
									</p>
									<div className="h-56 sm:h-64">
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart data={chartTrendCleanox}>
												<defs>
													<linearGradient id="gCleanoxSales" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
														<stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
													</linearGradient>
												</defs>
												<CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
												<XAxis
													dataKey={isYearFilter ? "label" : "date"}
													tick={{ fontSize: 10 }}
													axisLine={false}
													tickLine={false}
													interval="preserveStartEnd"
													minTickGap={28}
													tickFormatter={isYearFilter ? undefined : (v) => formatChartDayTick(v)}
												/>
												<YAxis
													tick={{ fontSize: 11 }}
													axisLine={false}
													tickLine={false}
													width={45}
													tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
												/>
												<Tooltip
													formatter={(v) => [`Rp ${fmtIDR(v)}`, "Pendapatan Cleanox"]}
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
													name="Cleanox Only"
													stroke="#EC4899"
													strokeWidth={2.5}
													fill="url(#gCleanoxSales)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									</div>
								</Card>

								<Card className="p-4 sm:p-6">
									<p className="mb-4 text-sm font-bold text-slate-700">Performa Cleanox vs Target</p>
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
															<p className={`font-bold ${isOver ? "text-emerald-600" : "text-rose-500"}`}>
																{isOver ? "+" : ""}Rp {fmtIDR(Math.round(gap))}
															</p>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</Card>

								{/* Rincian transaksi lunas + bukti */}
								<Card className="overflow-hidden">
									<div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
										<div>
											<h2 className="text-base font-bold text-slate-800">Rincian Transaksi Lunas (Cleanox Only)</h2>
											<p className="mt-0.5 text-xs text-slate-500">
												Smartlink &amp; POS lunas pada periode cutoff (26 s.d 25). Tanggal omzet = pelunasan
												POS jika ada, else tanggal layanan; Smartlink = tanggal layanan.
											</p>
											{lunasPeriodLabelId ? (
												<p className="mt-1 text-xs font-semibold text-[#1b3459]">
													Periode: {lunasPeriodLabelId}
												</p>
											) : null}
											<p className="mt-1 text-xs text-slate-400">
												{lunasLoading
													? "Memuat..."
													: `${lunasTransactionCount} transaksi${
															lunasRows.length !== lunasTransactionCount
																? ` (${lunasRows.length} baris)`
																: ""
														}`}
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
															endDate: meta.dateEnd || meta.asOfDate,
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
											Export Excel Cleanox Only
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
																key={`${row.source_system || "pos"}-${row.transaction_no}-${row.id ?? "x"}-${row.split_index ?? 0}`}
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
																	{row.split_total > 1 && (
																		<span className="ml-1.5 inline-flex rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
																			Split {row.split_index}/{row.split_total}
																		</span>
																	)}
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
							</>
						)}
					</>
				)}

				{/* ═════════════════════════════════════════════════════════════════════ */}
				{/* TAB 3: CLEANOX BY WASCHEN (70% HAK CLEANOX)                           */}
				{/* ═════════════════════════════════════════════════════════════════════ */}
				{activeTab === "cleanox_by_waschen" && (
					<CleanoxByWaschenTab data={waschenData} loading={waschenLoading} error={waschenError} />
				)}
			</div>

			<PaymentProofViewerModal item={photoViewer} onClose={() => setPhotoViewer(null)} />
		</div>
	);
}
