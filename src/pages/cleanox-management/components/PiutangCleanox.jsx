import { useEffect, useMemo, useReducer, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
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

function buildWhatsAppUrl(phone) {
	const digits = String(phone ?? "").replace(/\D/g, "");
	if (digits.length < 8) return null;
	if (digits.startsWith("62")) return `https://wa.me/${digits}`;
	if (digits.startsWith("0")) return `https://wa.me/62${digits.slice(1)}`;
	if (digits.startsWith("8")) return `https://wa.me/62${digits}`;
	return `https://wa.me/${digits}`;
}

function reducer(state, action) {
	switch (action.type) {
		case "loading":
			return { ...state, data: null, loading: true, error: null, page: 1, search: "", statusFilter: "all" };
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
	});
	const { data, loading, error, page, search, statusFilter } = state;
	const PAGE_SIZE = 10;

	useEffect(() => {
		document.title = "Piutang Cleanox | Alora Group Indonesia";
	}, []);

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

	const filteredPiutang = useMemo(() => {
		const raw = data?.piutang ?? [];
		const q = search.trim().toLowerCase();
		return raw.filter((r) => {
			const matchStatus = statusFilter === "all" || r.status === statusFilter;
			const matchSearch =
				!q ||
				r.customer_nama?.toLowerCase().includes(q) ||
				r.no_nota?.toLowerCase().includes(q) ||
				r.outlet?.toLowerCase().includes(q);
			return matchStatus && matchSearch;
		});
	}, [data, search, statusFilter]);

	const totalPages = Math.max(1, Math.ceil(filteredPiutang.length / PAGE_SIZE));
	const pagedRows = filteredPiutang.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
			<div className="px-4 sm:px-6">
				<h1 className="text-2xl font-bold tracking-tight text-[#1b3459] sm:text-3xl">
					Dashboard Piutang
				</h1>
				<p className="mt-1 text-sm text-slate-500">Cleanox — receivables POS belum lunas</p>
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
							<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="shrink-0 text-sm font-bold text-slate-700">
									Daftar Customer Piutang
									<span className="ml-2 text-xs font-normal text-slate-400">
										({filteredPiutang.length} data)
									</span>
								</p>
								<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
									<input
										type="text"
										placeholder="Cari customer / nota / layanan…"
										value={search}
										onChange={(e) => dispatch({ type: "set_search", payload: e.target.value })}
										className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 sm:w-52"
									/>
									<select
										value={statusFilter}
										onChange={(e) => dispatch({ type: "set_status", payload: e.target.value })}
										className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
									>
										<option value="all">Semua Status</option>
										<option value="Belum Jatuh Tempo">Belum Jatuh Tempo</option>
										<option value="Jatuh Tempo">Jatuh Tempo</option>
										<option value="Terlambat">Terlambat</option>
									</select>
									<button
										type="button"
										onClick={handleExport}
										disabled={exporting || !data}
										className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
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
											<th className="pb-3">Status</th>
										</tr>
									</thead>
									<tbody>
										{pagedRows.length === 0 ? (
											<tr>
												<td colSpan={8} className="py-8 text-center text-slate-400">
													Tidak ada data
												</td>
											</tr>
										) : (
											pagedRows.map((row, i) => {
												const whatsappUrl = buildWhatsAppUrl(row.customer_telepon);
												return (
													<tr
														key={`${row.no_nota}-${i}`}
														className="border-b border-slate-50 transition hover:bg-slate-50/40"
													>
														<td className="py-3 pr-3 font-semibold text-slate-800">
															{row.customer_nama}
														</td>
														<td className="py-3 pr-3 text-xs">
															{row.customer_telepon ? (
																whatsappUrl ? (
																	<a
																		href={whatsappUrl}
																		target="_blank"
																		rel="noreferrer"
																		className="font-mono text-emerald-700 hover:underline"
																	>
																		{row.customer_telepon}
																	</a>
																) : (
																	<span className="font-mono text-slate-600">
																		{row.customer_telepon}
																	</span>
																)
															) : (
																"-"
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
														<td className="py-3">
															<span
																className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLOR[row.status] ?? ""}`}
															>
																{row.status}
															</span>
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
		</div>
	);
}
