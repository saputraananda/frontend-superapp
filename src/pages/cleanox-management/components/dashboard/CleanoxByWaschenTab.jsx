import React, { useState, useMemo } from "react";
import {
	ResponsiveContainer,
	AreaChart,
	Area,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	Legend,
} from "recharts";
import { fmtIDR } from "../../utils/dashboardFilters";

function Card({ className = "", children }) {
	return (
		<div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
			{children}
		</div>
	);
}

function CustomTooltip({ active, payload, label }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
			{label && <p className="mb-1 font-semibold text-slate-700">{label}</p>}
			{payload.map((p, i) => (
				<p key={i} style={{ color: p.color || p.fill }} className="font-medium">
					{p.name}: {typeof p.value === "number" ? `Rp ${fmtIDR(p.value)}` : p.value}
				</p>
			))}
		</div>
	);
}

export default function CleanoxByWaschenTab({ data, loading, error }) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, "all"];

	const kpi = data?.kpi ?? {};
	const perOutlet = useMemo(() => data?.per_outlet ?? [], [data?.per_outlet]);
	const perPembuat = useMemo(() => data?.per_pembuat ?? [], [data?.per_pembuat]);
	const trend = useMemo(() => data?.trend ?? [], [data?.trend]);
	const allDetail = useMemo(() => data?.detail ?? [], [data?.detail]);
	const meta = data?.meta ?? {};

	const outletChartData = useMemo(() => {
		return perOutlet.map((d) => ({
			name: (d.outlet || "").split(" ").pop(),
			Total: Number(d.total_omzet) || 0,
			"Jatah 70%": Math.round((Number(d.total_omzet) || 0) * 0.7),
			"Jatah 30%": Math.round((Number(d.total_omzet) || 0) * 0.3),
		}));
	}, [perOutlet]);

	const totalItems = allDetail.length;
	const effectivePageSize = pageSize === "all" ? totalItems || 1 : pageSize;
	const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));

	const paginatedDetail = useMemo(() => {
		if (pageSize === "all") return allDetail;
		const start = (page - 1) * pageSize;
		return allDetail.slice(start, start + pageSize);
	}, [allDetail, page, pageSize]);

	if (loading) {
		return (
			<div className="space-y-5 animate-pulse">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className="h-24 rounded-2xl bg-slate-200" />
					))}
				</div>
				<div className="grid grid-cols-12 gap-5">
					<div className="col-span-12 h-60 rounded-2xl bg-slate-200 lg:col-span-5" />
					<div className="col-span-12 h-60 rounded-2xl bg-slate-200 lg:col-span-7" />
				</div>
				<div className="h-72 rounded-2xl bg-slate-200" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
				Gagal memuat data Cleanox by Waschen: {error}
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{/* Header badge */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h2 className="text-base font-bold text-slate-800">Cleanox by Waschen Laundry</h2>
					<p className="text-xs text-slate-500">
						Data transaksi Cleanox dan Karpet yang diinput melalui outlet Waschen Laundry
					</p>
				</div>
				<span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
					🧮 Bagi hasil: <span className="font-bold">70% Cleanox</span> · <span className="font-bold">30% Waschen</span>
				</span>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4">
				{[
					{
						label: "Jatah Cleanox (70%)",
						value: `Rp ${fmtIDR(kpi.jatah_70 || 0)}`,
						icon: "🧺",
						tone: "from-amber-400 to-orange-500",
						highlight: true,
					},
					{
						label: "Total Tagihan Bruto",
						value: `Rp ${fmtIDR(kpi.total_omzet || 0)}`,
						icon: "📄",
						tone: "from-slate-400 to-slate-500",
					},
					{
						label: "Jatah Waschen (30%)",
						value: `Rp ${fmtIDR(kpi.jatah_30 || 0)}`,
						icon: "💜",
						tone: "from-violet-400 to-purple-600",
					},
					{
						label: "Total Nota",
						value: (kpi.total_nota || 0).toLocaleString("id-ID"),
						icon: "📋",
						tone: "from-sky-400 to-blue-500",
					},
					{
						label: "Rata-rata / Nota",
						value: `Rp ${fmtIDR(Math.round(kpi.avg_per_nota || 0))}`,
						icon: "📊",
						tone: "from-emerald-400 to-teal-500",
					},
				].map((k) => (
					<div
						key={k.label}
						className={`flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
							k.highlight ? "border-amber-200 bg-amber-50/20 ring-1 ring-amber-100" : "border-slate-200/80"
						}`}
					>
						<div
							className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow ${k.tone}`}
						>
							{k.icon}
						</div>
						<div>
							<p className="text-xs leading-tight text-slate-500">{k.label}</p>
							<p className={`text-base font-extrabold ${k.highlight ? "text-amber-700" : "text-slate-800"}`}>
								{k.value}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* Trend & Per Outlet Chart */}
			<div className="grid grid-cols-12 gap-5">
				{/* Trend Harian */}
				<Card className="col-span-12 lg:col-span-5">
					<p className="mb-1 text-sm font-bold text-slate-700">Tren Harian Cleanox by Waschen</p>
					<p className="mb-4 text-xs text-slate-400">
						{meta.dateStart && `${meta.dateStart} s.d ${meta.asOfDate || meta.dateEnd}`}
					</p>
					<div className="h-52">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={trend}>
								<defs>
									<linearGradient id="cleanoxGradWaschen" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
										<stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
								<XAxis
									dataKey="day"
									tick={{ fontSize: 10 }}
									axisLine={false}
									tickLine={false}
									label={{ value: "Tanggal", position: "insideBottom", offset: -2, fontSize: 10 }}
								/>
								<YAxis
									tick={{ fontSize: 11 }}
									axisLine={false}
									tickLine={false}
									width={48}
									tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
								/>
								<Tooltip content={<CustomTooltip />} formatter={(v) => [`Rp ${fmtIDR(v)}`, "Omzet"]} />
								<Area
									type="monotone"
									dataKey="total"
									name="Omzet Bruto"
									stroke="#F59E0B"
									strokeWidth={2.5}
									fill="url(#cleanoxGradWaschen)"
									dot={trend.length <= 31 ? { r: 3, fill: "#F59E0B" } : false}
									activeDot={{ r: 5 }}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</Card>

				{/* Per Outlet Bar */}
				<Card className="col-span-12 lg:col-span-7">
					<p className="mb-4 text-sm font-bold text-slate-700">Omzet Cleanox per Outlet Waschen</p>
					<div className="h-52">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={outletChartData} barSize={18}>
								<CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
								<XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
								<YAxis
									tick={{ fontSize: 11 }}
									axisLine={false}
									tickLine={false}
									width={48}
									tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}jt`}
								/>
								<Tooltip content={<CustomTooltip />} />
								<Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
								<Bar dataKey="Jatah 70%" stackId="a" fill="#F59E0B" name="Jatah Cleanox (70%)" />
								<Bar
									dataKey="Jatah 30%"
									stackId="a"
									fill="#8B5CF6"
									radius={[6, 6, 0, 0]}
									name="Jatah Waschen (30%)"
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>
			</div>

			{/* Ringkasan per Outlet Table */}
			<Card>
				<p className="mb-4 text-sm font-bold text-slate-700">Ringkasan per Outlet</p>
				<div className="hidden overflow-x-auto md:block">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
								{["Outlet", "Total Nota", "Total Omzet", "Jatah Cleanox (70%)", "Jatah Waschen (30%)"].map((h) => (
									<th key={h} className="pb-3 pr-4 whitespace-nowrap">
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{perOutlet.map((row) => (
								<tr key={row.outlet} className="border-b border-slate-50 transition hover:bg-slate-50/40">
									<td className="py-3 pr-4 font-semibold text-slate-800">{row.outlet}</td>
									<td className="py-3 pr-4 text-slate-600">{Number(row.total_nota).toLocaleString("id-ID")}</td>
									<td className="py-3 pr-4 font-bold text-slate-800">Rp {fmtIDR(Number(row.total_omzet))}</td>
									<td className="py-3 pr-4 font-semibold text-amber-600">
										Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.7))}
									</td>
									<td className="py-3 pr-4 font-semibold text-violet-600">
										Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.3))}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Mobile cards for Outlet */}
				<div className="flex flex-col gap-3 md:hidden">
					{perOutlet.map((row) => (
						<div key={row.outlet} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
							<p className="text-sm font-semibold text-slate-800">{row.outlet}</p>
							<div className="grid grid-cols-2 gap-y-1.5 text-xs">
								<div>
									<span className="text-slate-400">Total Nota: </span>
									<span className="font-bold text-slate-700">{Number(row.total_nota)}</span>
								</div>
								<div>
									<span className="text-slate-400">Total Omzet: </span>
									<span className="font-bold text-slate-700">Rp {fmtIDR(Number(row.total_omzet))}</span>
								</div>
								<div>
									<span className="text-slate-400">Jatah 70%: </span>
									<span className="font-bold text-amber-600">
										Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.7))}
									</span>
								</div>
								<div>
									<span className="text-slate-400">Jatah 30%: </span>
									<span className="font-bold text-violet-600">
										Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.3))}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</Card>

			{/* Klasifikasi per Pembuat Nota */}
			<Card>
				<p className="mb-1 text-sm font-bold text-slate-700">Klasifikasi per Pembuat Nota</p>
				<p className="mb-4 text-xs text-slate-400">
					Pantau siapa saja yang menawarkan layanan Cleanox / Karpet ke konsumen di outlet Waschen
				</p>

				{/* Desktop */}
				<div className="hidden overflow-x-auto md:block">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
								{["#", "Pembuat Nota", "Total Nota", "Total Tagihan Bruto", "Jatah Cleanox (70%)", "Jatah Waschen (30%)"].map(
									(h) => (
										<th key={h} className="pb-3 pr-4 whitespace-nowrap">
											{h}
										</th>
									),
								)}
							</tr>
						</thead>
						<tbody>
							{perPembuat.map((row, i) => (
								<tr key={i} className="border-b border-slate-50 transition hover:bg-slate-50/40">
									<td className="py-3 pr-3">
										<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
											{i + 1}
										</span>
									</td>
									<td className="py-3 pr-4 font-semibold text-slate-800">{row.pembuat_nota}</td>
									<td className="py-3 pr-4 text-center font-bold text-sky-600">
										{Number(row.total_nota).toLocaleString("id-ID")}
									</td>
									<td className="py-3 pr-4 text-slate-600">Rp {fmtIDR(Number(row.total_omzet))}</td>
									<td className="py-3 pr-4 font-semibold text-amber-600">
										Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.7))}
									</td>
									<td className="py-3 pr-4 font-semibold text-violet-600">
										Rp {fmtIDR(Math.round(Number(row.jatah_waschen)))}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Mobile */}
				<div className="flex flex-col gap-3 md:hidden">
					{perPembuat.map((row, i) => (
						<div key={i} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
							<div className="flex items-center gap-2">
								<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
									{i + 1}
								</span>
								<span className="text-sm font-semibold text-slate-800">{row.pembuat_nota}</span>
							</div>
							<div className="grid grid-cols-2 gap-y-1.5 text-xs">
								<div>
									<span className="text-slate-400">Total Nota: </span>
									<span className="font-bold text-sky-600">{Number(row.total_nota)}</span>
								</div>
								<div>
									<span className="text-slate-400">Total Tagihan: </span>
									<span className="font-bold text-slate-700">Rp {fmtIDR(Number(row.total_omzet))}</span>
								</div>
								<div>
									<span className="text-slate-400">Jatah Cleanox (70%): </span>
									<span className="font-bold text-amber-600">
										Rp {fmtIDR(Math.round(Number(row.total_omzet) * 0.7))}
									</span>
								</div>
								<div>
									<span className="text-slate-400">Jatah Waschen (30%): </span>
									<span className="font-bold text-violet-600">
										Rp {fmtIDR(Math.round(Number(row.jatah_waschen)))}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</Card>

			{/* Detail Transaksi Cleanox */}
			<Card>
				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-bold text-slate-700">Detail Transaksi Cleanox by Waschen</p>
						<p className="mt-0.5 text-xs text-slate-400">
							{totalItems} nota &nbsp;·&nbsp; {pageSize === "all" ? "Semua ditampilkan" : `Hal. ${page} dari ${totalPages}`}
						</p>
					</div>

					{/* Page size + Pagination */}
					<div className="flex flex-wrap items-center gap-2">
						<select
							value={pageSize}
							onChange={(e) => {
								setPageSize(e.target.value === "all" ? "all" : Number(e.target.value));
								setPage(1);
							}}
							className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
						>
							{PAGE_SIZE_OPTIONS.map((opt) => (
								<option key={opt} value={opt}>
									{opt === "all" ? "Semua" : `${opt} / hal`}
								</option>
							))}
						</select>
						<div className="flex flex-wrap items-center gap-1">
							<button
								onClick={() => setPage(1)}
								disabled={page === 1 || pageSize === "all"}
								className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
							>
								«
							</button>
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1 || pageSize === "all"}
								className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
							>
								‹
							</button>
							{Array.from({ length: totalPages }, (_, i) => i + 1)
								.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
								.reduce((acc, p, idx, arr) => {
									if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
									acc.push(p);
									return acc;
								}, [])
								.map((p, i) =>
									p === "..." ? (
										<span key={`e-${i}`} className="px-1 text-xs text-slate-400">
											…
										</span>
									) : (
										<button
											key={p}
											onClick={() => setPage(p)}
											className={`h-7 min-w-[28px] rounded-lg border text-xs font-bold transition ${
												page === p
													? "border-amber-500 bg-amber-500 text-white shadow-sm"
													: "border-slate-200 text-slate-600 hover:bg-slate-50"
											}`}
										>
											{p}
										</button>
									),
								)}
							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages || pageSize === "all"}
								className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
							>
								›
							</button>
							<button
								onClick={() => setPage(totalPages)}
								disabled={page === totalPages || pageSize === "all"}
								className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
							>
								»
							</button>
						</div>
					</div>
				</div>

				{/* Desktop Table */}
				<div className="hidden overflow-x-auto md:block">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
								{[
									"#",
									"Outlet",
									"No. Nota",
									"Customer",
									"Pembuat Nota",
									"Tgl Terima",
									"Tgl Selesai",
									"Waktu Bayar",
									"Nominal Bruto",
									"Jatah 70%",
									"Item",
								].map((h) => (
									<th key={h} className="pb-3 pr-4 whitespace-nowrap">
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{paginatedDetail.map((d, i) => {
								const globalIdx = pageSize === "all" ? i + 1 : (page - 1) * pageSize + i + 1;
								const nom = Number(d.nominal_bayar) || 0;
								return (
									<tr key={i} className="border-b border-slate-50 transition hover:bg-slate-50/40">
										<td className="py-3 pr-3 text-xs text-slate-400">{globalIdx}</td>
										<td className="py-3 pr-4 text-slate-700">{d.outlet}</td>
										<td className="py-3 pr-4 font-mono text-xs text-slate-500">{d.no_nota}</td>
										<td className="max-w-[140px] truncate py-3 pr-4 font-semibold text-slate-800">
											{d.customer_nama || "-"}
										</td>
										<td className="py-3 pr-4 text-xs text-slate-600">{d.pembuat_nota || "-"}</td>
										<td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-500">
											{d.tgl_terima ? new Date(d.tgl_terima).toLocaleDateString("id-ID") : "-"}
										</td>
										<td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-500">
											{d.tgl_selesai ? new Date(d.tgl_selesai).toLocaleDateString("id-ID") : "-"}
										</td>
										<td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-500">
											{d.waktu_pembayaran
												? new Date(d.waktu_pembayaran).toLocaleString("id-ID", {
														dateStyle: "short",
														timeStyle: "short",
													})
												: "-"}
										</td>
										<td className="whitespace-nowrap py-3 pr-4 font-bold text-slate-700">
											Rp {fmtIDR(nom)}
										</td>
										<td className="whitespace-nowrap py-3 pr-4 font-bold text-amber-600">
											Rp {fmtIDR(Math.round(nom * 0.7))}
										</td>
										<td
											className="max-w-[180px] truncate py-3 pr-4 text-xs text-slate-500"
											title={d.daftar_item || ""}
										>
											{d.daftar_item || "-"}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Mobile cards */}
				<div className="flex flex-col gap-3 md:hidden">
					{paginatedDetail.map((d, i) => (
						<div key={i} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
							<div className="flex items-center justify-between">
								<span className="truncate text-sm font-semibold text-slate-800">
									{d.customer_nama || "-"}
								</span>
								<span className="ml-2 shrink-0 text-sm font-bold text-amber-600">
									Rp {fmtIDR(Math.round(Number(d.nominal_bayar) * 0.7))}
								</span>
							</div>
							<div className="grid grid-cols-2 gap-y-1 text-xs">
								<div>
									<span className="text-slate-400">No. Nota: </span>
									<span className="font-mono text-slate-600">{d.no_nota}</span>
								</div>
								<div>
									<span className="text-slate-400">Outlet: </span>
									<span className="text-slate-700">{d.outlet}</span>
								</div>
								<div>
									<span className="text-slate-400">Bruto: </span>
									<span className="font-semibold text-slate-700">
										Rp {fmtIDR(Number(d.nominal_bayar))}
									</span>
								</div>
								<div>
									<span className="text-slate-400">Pembuat: </span>
									<span className="text-slate-700">{d.pembuat_nota || "-"}</span>
								</div>
								<div className="col-span-2">
									<span className="text-slate-400">Item: </span>
									<span className="text-slate-600">{d.daftar_item || "-"}</span>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Bottom info */}
				<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
					<span>
						{pageSize === "all"
							? `1–${totalItems}`
							: `${Math.min((page - 1) * pageSize + 1, totalItems)}–${Math.min(page * pageSize, totalItems)}`}{" "}
						dari {totalItems} nota
					</span>
					<span>{pageSize === "all" ? "Semua" : `${pageSize} per halaman`}</span>
				</div>
			</Card>
		</div>
	);
}
