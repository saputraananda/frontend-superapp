import { cn, SERVICE_MODE_OPTIONS } from "../../utils/dashboardFilters";

const FILTER_TYPES = [
	{ value: "month", label: "Bulan" },
	{ value: "range", label: "Rentang" },
	{ value: "year", label: "Tahun" },
];

const inputCls =
	"rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-100 transition";

export default function CleanoxDashboardFilterBar({
	serviceMode,
	setServiceMode,
	filterType,
	setFilterType,
	month,
	setMonth,
	year,
	setYear,
	startDate,
	setStartDate,
	endDate,
	setEndDate,
}) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-5 sm:py-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-2">
						<label className="whitespace-nowrap text-xs font-semibold text-slate-500">Layanan</label>
						<select
							value={serviceMode || "all"}
							onChange={(e) => setServiceMode(e.target.value)}
							className={inputCls}
						>
							{SERVICE_MODE_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div className="hidden h-5 w-px bg-slate-200 sm:block" />
					<div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-1">
						{FILTER_TYPES.map((ft) => (
							<button
								key={ft.value}
								type="button"
								onClick={() => setFilterType(ft.value)}
								className={cn(
									"rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3",
									filterType === ft.value
										? "bg-white text-fuchsia-600 shadow-sm"
										: "text-slate-500 hover:text-slate-700",
								)}
							>
								{ft.label}
							</button>
						))}
					</div>
				</div>

				{filterType === "month" && (
					<div className="flex flex-wrap items-center gap-2">
						<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls} />
						{month ? (
							<span className="text-[11px] font-medium text-slate-400">
								Cutoff: tgl 26 s/d 25
							</span>
						) : null}
					</div>
				)}
				{filterType === "year" && (
					<select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
						{["2024", "2025", "2026"].map((y) => (
							<option key={y} value={y}>
								{y}
							</option>
						))}
					</select>
				)}
				{filterType === "range" && (
					<div className="flex flex-wrap items-center gap-2">
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className={inputCls}
						/>
						<span className="text-xs font-semibold text-slate-400">s/d</span>
						<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
					</div>
				)}
			</div>
		</div>
	);
}
