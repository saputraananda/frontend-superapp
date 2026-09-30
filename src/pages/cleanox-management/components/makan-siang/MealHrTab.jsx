import { useCallback, useEffect, useMemo, useState } from "react";
import {
	HiOutlineAdjustmentsHorizontal,
	HiOutlineArrowDownTray,
	HiOutlineBanknotes,
	HiOutlineClock,
	HiOutlineExclamationTriangle,
	HiOutlineSun,
	HiOutlineBriefcase,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { exportMakanSiangRekapExcel } from "../../utils/exportMakanSiangCleanoxExcel";
import { StatCard } from "./MealUi";
import {
	capitalEachWord,
	formatDate,
	formatRp,
	getCutoffRange,
	getDefaultCutoffSelection,
	PERIOD_MONTHS,
	toDateInput,
} from "./mealUtils";

export default function MealHrTab({ refreshKey }) {
	const todayStr = useMemo(() => toDateInput(new Date()), []);
	const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date(), 26), []);

	const [periodMode, setPeriodMode] = useState("cutoff");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
	const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);

	const [rows, setRows] = useState([]);
	const [grandTotal, setGrandTotal] = useState(0);
	const [days, setDays] = useState(0);
	const [rates, setRates] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
	}, []);

	const activePeriod = useMemo(() => {
		if (periodMode === "today") return { startDate: todayStr, endDate: todayStr };
		if (periodMode === "custom") {
			return {
				startDate: customStartDate || todayStr,
				endDate: customEndDate || customStartDate || todayStr,
			};
		}
		return getCutoffRange(cutoffMonth, cutoffYear, 26);
	}, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear]);

	const activePeriodLabel = useMemo(() => {
		if (periodMode === "today") return `Hari ini (${formatDate(todayStr)})`;
		if (periodMode === "custom") {
			return `Custom ${formatDate(activePeriod.startDate)} - ${formatDate(activePeriod.endDate)}`;
		}
		const monthLabel = PERIOD_MONTHS.find((m) => m.value === cutoffMonth)?.label || `Bulan ${cutoffMonth}`;
		return `Cutoff ${monthLabel} ${cutoffYear} (${formatDate(activePeriod.startDate)} - ${formatDate(activePeriod.endDate)})`;
	}, [periodMode, todayStr, activePeriod.startDate, activePeriod.endDate, cutoffMonth, cutoffYear]);

	const { startDate, endDate } = activePeriod;

	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (!startDate || !endDate) return;
			if (endDate < startDate) {
				setError("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai");
				setRows([]);
				setGrandTotal(0);
				setDays(0);
				setLoading(false);
				return;
			}
			try {
				setLoading(true);
				setError("");
				const qs = new URLSearchParams({ startDate, endDate });
				const data = await api(`/cleanox/meal/rekap?${qs.toString()}`);
				if (cancelled) return;
				setRows(data?.rows || []);
				setGrandTotal(Number(data?.grand_total) || 0);
				setDays(Number(data?.days) || 0);
				setRates(data?.rates || null);
			} catch (err) {
				if (!cancelled) {
					setRows([]);
					setGrandTotal(0);
					setDays(0);
					setError(err?.message || "Gagal memuat rekap uang makan");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [startDate, endDate, refreshKey]);

	const totalHalf = rows.reduce((sum, r) => sum + (Number(r.half_days) || 0), 0);
	const totalFull = rows.reduce((sum, r) => sum + (Number(r.full_days) || 0), 0);

	const resetPeriodFilters = () => {
		const resetCutoff = getDefaultCutoffSelection(new Date(), 26);
		setPeriodMode("cutoff");
		setCutoffMonth(resetCutoff.cutoffMonth);
		setCutoffYear(resetCutoff.cutoffYear);
		setCustomStartDate(resetCutoff.startDate);
		setCustomEndDate(resetCutoff.endDate);
	};

	const handleExportRekap = useCallback(() => {
		try {
			exportMakanSiangRekapExcel({ rows, periodLabel: activePeriodLabel, activePeriod, grandTotal });
		} catch (err) {
			setError(err?.message || "Gagal export rekap Excel");
		}
	}, [rows, activePeriodLabel, activePeriod, grandTotal]);

	return (
		<div className="space-y-4">
			{error ? (
				<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
					<p>{error}</p>
				</div>
			) : null}

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

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
				</div>

				{periodMode === "cutoff" && (
					<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
							<select
								value={cutoffMonth}
								onChange={(e) => setCutoffMonth(Number(e.target.value))}
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
								onChange={(e) => setCutoffYear(Number(e.target.value))}
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
					</div>
				)}

				<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
					Periode aktif: <strong>{formatDate(activePeriod.startDate)}</strong> sampai{" "}
					<strong>{formatDate(activePeriod.endDate)}</strong>
					{days > 0 ? <span className="text-slate-500"> · {days} hari kalender</span> : null}
				</div>
			</section>

			<section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
				<StatCard title="Grand Total" value={formatRp(grandTotal)} subtitle="Total uang makan semua karyawan" tone="emerald" Icon={HiOutlineBanknotes} />
				<StatCard title="Hari Periode" value={days} subtitle="Hari kalender dalam periode" tone="blue" Icon={HiOutlineClock} />
				<StatCard title="Total Half" value={totalHalf} subtitle="Hari half day diplot" tone="amber" Icon={HiOutlineSun} />
				<StatCard title="Total Full" value={totalFull} subtitle="Hari full day diplot" tone="blue" Icon={HiOutlineBriefcase} />
			</section>

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-base font-bold text-slate-800">Ringkasan Keuangan Per Karyawan</h2>
						<p className="mt-0.5 text-xs text-slate-500">
							{rates
								? `Kantor ${formatRp(rates.office)}/hari (hari tanpa plot, bukan libur/cuti), Half ${formatRp(rates.half_day)}, Full ${formatRp(rates.full_day)}.`
								: "Rekap nominal uang makan per karyawan pada periode aktif."}
						</p>
					</div>
					<button
						type="button"
						onClick={handleExportRekap}
						disabled={loading || rows.length === 0}
						className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
					>
						<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
						Download Rekap Excel
					</button>
				</div>

				<div className="overflow-x-auto pb-1">
					<table className="min-w-[1080px] w-full table-fixed text-sm">
						<thead className="border-b border-slate-100 bg-slate-50">
							<tr>
								<th className="w-[20%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Karyawan</th>
								<th className="w-[10%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">NIK</th>
								<th className="w-[16%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Jabatan</th>
								<th className="w-[8%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Kantor</th>
								<th className="w-[8%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Libur</th>
								<th className="w-[9%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Cuti/Izin</th>
								<th className="w-[7%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Half</th>
								<th className="w-[7%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Full</th>
								<th className="w-[15%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{rows.length === 0 ? (
								<tr>
									<td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
										{loading ? "Memuat ringkasan keuangan..." : "Belum ada data rekap untuk periode ini."}
									</td>
								</tr>
							) : (
								rows.map((row) => (
									<tr key={row.employee_id} className="hover:bg-slate-50/80 transition-colors">
										<td className="px-4 py-3 text-sm font-semibold text-slate-800">
											{capitalEachWord(row.full_name || row.employee_name)}
										</td>
										<td className="px-4 py-3 text-center text-sm text-slate-600">{row.employee_code || "-"}</td>
										<td className="px-4 py-3 text-sm text-slate-600">{row.jabatan || "-"}</td>
										<td className="px-4 py-3 text-center text-sm text-slate-600">{row.office_days}</td>
										<td className="px-4 py-3 text-center text-sm text-slate-500">{row.off_days ?? 0}</td>
										<td className="px-4 py-3 text-center text-sm text-slate-500">{row.leave_days ?? 0}</td>
										<td className="px-4 py-3 text-center text-sm font-semibold text-amber-700">{row.half_days}</td>
										<td className="px-4 py-3 text-center text-sm font-semibold text-blue-700">{row.full_days}</td>
										<td className="px-4 py-3 text-center text-sm font-bold text-[#1b3459]">{formatRp(row.total_amount)}</td>
									</tr>
								))
							)}
						</tbody>
						{rows.length > 0 && (
							<tfoot className="border-t border-slate-200 bg-slate-50">
								<tr>
									<td colSpan={8} className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
										Grand Total
									</td>
									<td className="px-4 py-3 text-center text-sm font-bold text-emerald-700">{formatRp(grandTotal)}</td>
								</tr>
							</tfoot>
						)}
					</table>
				</div>
			</section>
		</div>
	);
}
