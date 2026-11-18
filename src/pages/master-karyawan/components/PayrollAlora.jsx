import { useCallback, useEffect, useMemo, useState } from "react";
import {
	HiOutlineArrowDownTray,
	HiOutlineBanknotes,
	HiOutlineCalendarDays,
	HiOutlineCheckCircle,
	HiOutlineClock,
	HiOutlineExclamationTriangle,
	HiOutlineInformationCircle,
	HiOutlineMagnifyingGlass,
	HiOutlineUserGroup,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { exportPayrollBiruExcel } from "../utils/exportPayrollBiruExcel";

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
		startDate: toDateInput(start),
		endDate: toDateInput(end),
	};
}

const MONTH_NAMES = [
	"Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function PayrollAlora() {
	const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date(), 26), []);
	const [selectedYear, setSelectedYear] = useState(defaultCutoff.cutoffYear);
	const [selectedMonth, setSelectedMonth] = useState(defaultCutoff.cutoffMonth);
	const [startDate, setStartDate] = useState(defaultCutoff.startDate);
	const [endDate, setEndDate] = useState(defaultCutoff.endDate);

	const [departments, setDepartments] = useState([]);
	const [selectedDepartment, setSelectedDepartment] = useState("");
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [payrollData, setPayrollData] = useState([]);
	const [periodInfo, setPeriodInfo] = useState({});
	const [summaryInfo, setSummaryInfo] = useState({});

	// Modal detail breakdown
	const [selectedEmpDetail, setSelectedEmpDetail] = useState(null);

	// Debounce search
	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedSearch(search);
		}, 400);
		return () => clearTimeout(t);
	}, [search]);

	// Fetch departments
	useEffect(() => {
		let isMounted = true;
		const loadDepartments = async () => {
			try {
				const res = await api("/master-department").catch(() => null);
				const list = Array.isArray(res) ? res : (res?.data || []);
				if (isMounted && list.length > 0) setDepartments(list);
			} catch (err) {
				console.warn("Gagal memuat departemen:", err);
			}
		};
		loadDepartments();
		return () => {
			isMounted = false;
		};
	}, []);

	// Handle cutoff month/year change
	const handlePeriodChange = (month, year) => {
		setSelectedMonth(month);
		setSelectedYear(year);
		const start = new Date(year, month - 2, 26);
		const end = new Date(year, month - 1, 25);
		setStartDate(toDateInput(start));
		setEndDate(toDateInput(end));
	};

	// Generate 12 months cutoff dropdown options
	const cutoffOptions = useMemo(() => {
		const opts = [];
		const now = new Date();
		for (let i = -6; i <= 3; i++) {
			let m = now.getMonth() + 1 + i;
			let y = now.getFullYear();
			while (m < 1) {
				m += 12;
				y -= 1;
			}
			while (m > 12) {
				m -= 12;
				y += 1;
			}
			const label = `${MONTH_NAMES[m - 1]} ${y}`;
			opts.push({ month: m, year: y, label });
		}
		return opts;
	}, []);

	// Fetch Payroll Rekap Data
	const fetchPayrollRekap = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({
				startDate,
				endDate,
			});
			if (selectedDepartment) {
				params.append("departmentId", selectedDepartment);
			}
			if (debouncedSearch) {
				params.append("search", debouncedSearch);
			}

			const res = await api(`/alora/payroll/rekap?${params.toString()}`);
			const data = res || {};
			setPayrollData(data.data || []);
			setPeriodInfo(data.period || {});
			setSummaryInfo(data.summary || {});

			// Jika list department belum ada, ambil unik dari data
			if (Array.isArray(data.data)) {
				setDepartments((prev) => {
					if (prev.length > 0) return prev;
					const deptMap = new Map();
					data.data.forEach((row) => {
						if (row.department_name && !deptMap.has(row.department_name)) {
							deptMap.set(row.department_name, {
								department_id: row.department_name,
								department_name: row.department_name,
							});
						}
					});
					return Array.from(deptMap.values());
				});
			}
		} catch (err) {
			console.error("Gagal mengambil data rekap payroll:", err);
			setError(err.message || "Gagal memuat data rekap payroll");
		} finally {
			setLoading(false);
		}
	}, [startDate, endDate, selectedDepartment, debouncedSearch]);

	useEffect(() => {
		fetchPayrollRekap();
	}, [fetchPayrollRekap]);

	// Export Excel handler
	const handleExportExcel = () => {
		if (payrollData.length === 0) return;
		const periodLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
		exportPayrollBiruExcel({
			payrollData,
			period: periodInfo,
			summary: summaryInfo,
			periodLabel,
		});
	};

	return (
		<div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8 py-6 pb-16">
			{/* Page Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center justify-center rounded-lg bg-blue-100 p-2 text-blue-800">
							<HiOutlineBanknotes className="h-6 w-6" />
						</span>
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-slate-900">
								Rekap Payroll Alora
							</h1>
							<p className="text-sm text-slate-500">
								Kalkulasi absensi, lembur, dan potongan payroll sesuai template Master Gaji
							</p>
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2.5">
					<button
						type="button"
						onClick={handleExportExcel}
						disabled={loading || payrollData.length === 0}
						className={cn(
							"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all",
							loading || payrollData.length === 0
								? "cursor-not-allowed bg-slate-200 text-slate-400"
								: "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-500/20"
						)}
					>
						<HiOutlineArrowDownTray className="h-4 w-4" />
						<span>Export Rekap Payroll (Kolom Biru)</span>
					</button>
				</div>
			</div>

			{/* Filter Bar */}
			<div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
					{/* Cutoff Period Dropdown */}
					<div>
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
							Periode Cutoff
						</label>
						<div className="relative">
							<select
								value={`${selectedMonth}-${selectedYear}`}
								onChange={(e) => {
									const [m, y] = e.target.value.split("-").map(Number);
									handlePeriodChange(m, y);
								}}
								className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
							>
								{cutoffOptions.map((opt) => (
									<option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
										{opt.label} (26 {MONTH_NAMES[(opt.month + 10) % 12].slice(0, 3)} - 25 {MONTH_NAMES[opt.month - 1].slice(0, 3)})
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
								<HiOutlineCalendarDays className="h-4 w-4" />
							</div>
						</div>
					</div>

					{/* Custom Range Info */}
					<div>
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
							Rentang Tanggal
						</label>
						<div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700">
							<span className="font-semibold text-blue-900">{formatDateOnly(startDate)}</span>
							<span className="text-slate-400">s/d</span>
							<span className="font-semibold text-blue-900">{formatDateOnly(endDate)}</span>
							<span className="ml-auto rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
								{periodInfo.totalWorkingDays || 25} Hari Kerja
							</span>
						</div>
					</div>

					{/* Department Filter */}
					<div>
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
							Departemen
						</label>
						<select
							value={selectedDepartment}
							onChange={(e) => setSelectedDepartment(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
						>
							<option value="">Semua Departemen</option>
							{departments.map((d) => (
								<option key={d.department_id || d.id} value={d.department_id || d.id}>
									{d.department_name || d.name}
								</option>
							))}
						</select>
					</div>

					{/* Search Employee */}
					<div>
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
							Cari Karyawan
						</label>
						<div className="relative">
							<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Cari NIK / nama..."
								className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
							/>
						</div>
					</div>
				</div>
			</div>

			{/* KPI Summary Cards */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{/* Total Karyawan */}
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 text-slate-500 mb-1">
						<HiOutlineUserGroup className="h-4 w-4" />
						<span className="text-xs font-medium">Total Karyawan</span>
					</div>
					<div className="text-xl font-bold text-slate-900">
						{summaryInfo.totalEmployees || 0} <span className="text-xs font-normal text-slate-500">Orang</span>
					</div>
				</div>

				{/* Total Kehadiran */}
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 text-emerald-600 mb-1">
						<HiOutlineCheckCircle className="h-4 w-4" />
						<span className="text-xs font-medium">Total Kehadiran</span>
					</div>
					<div className="text-xl font-bold text-emerald-700">
						{summaryInfo.totalKehadiran || 0} <span className="text-xs font-normal text-slate-500">Hari</span>
					</div>
				</div>

				{/* Total Lembur */}
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 text-violet-600 mb-1">
						<HiOutlineClock className="h-4 w-4" />
						<span className="text-xs font-medium">Lembur Bersih</span>
					</div>
					<div className="text-xl font-bold text-violet-700">
						{summaryInfo.totalLemburHours || 0} <span className="text-xs font-normal text-slate-500">Jam</span>
					</div>
				</div>

				{/* Pot per Jam (Blue) */}
				<div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
					<div className="flex items-center gap-2 text-blue-800 mb-1">
						<span className="h-2 w-2 rounded-full bg-blue-600" />
						<span className="text-xs font-bold">Pot per Jam</span>
					</div>
					<div className="text-xl font-bold text-blue-900">
						{summaryInfo.totalPotPerJam || 0} <span className="text-xs font-normal text-slate-600">Jam</span>
					</div>
				</div>

				{/* Konsumsi Telat (Blue) */}
				<div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
					<div className="flex items-center gap-2 text-blue-800 mb-1">
						<span className="h-2 w-2 rounded-full bg-blue-600" />
						<span className="text-xs font-bold">Konsumsi Telat</span>
					</div>
					<div className="text-xl font-bold text-blue-900">
						{summaryInfo.totalKonsumsiTelatCount || 0} <span className="text-xs font-normal text-slate-600">Kali</span>
					</div>
				</div>

				{/* Konsumsi/Transport Unpaid (Blue) */}
				<div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
					<div className="flex items-center gap-2 text-blue-800 mb-1">
						<span className="h-2 w-2 rounded-full bg-blue-600" />
						<span className="text-xs font-bold">Kons/Trans Unpaid</span>
					</div>
					<div className="text-xl font-bold text-blue-900">
						{summaryInfo.totalKonsumsiUnpaidDays || 0} <span className="text-xs font-normal text-slate-600">Hari</span>
					</div>
				</div>
			</div>

			{/* Table Content */}
			<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
				<div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4">
					<div>
						<h2 className="text-base font-bold text-slate-900">
							Rincian Rekapitulasi Payroll
						</h2>
						<p className="text-xs text-slate-500">
							Kolom berlatar biru muda menunjukkan kolom potongan yang diexport ke Master Gaji
						</p>
					</div>
					<div className="text-xs text-slate-500">
						Total: <span className="font-bold text-slate-800">{payrollData.length}</span> Karyawan
					</div>
				</div>

				{loading ? (
					<div className="flex flex-col items-center justify-center py-20 text-slate-400">
						<div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
						<p className="text-sm">Menghitung dan memproses rekapitulasi payroll...</p>
					</div>
				) : error ? (
					<div className="m-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
						<HiOutlineExclamationTriangle className="h-5 w-5 shrink-0" />
						<span>{error}</span>
					</div>
				) : payrollData.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 text-slate-400">
						<HiOutlineUserGroup className="h-10 w-10 text-slate-300 mb-2" />
						<p className="text-sm font-medium text-slate-600">Tidak ada data payroll ditemukan</p>
						<p className="text-xs text-slate-400">Silakan sesuaikan filter pencarian atau cutoff</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse text-xs">
							<thead>
								{/* Header Grup */}
								<tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
									<th colSpan={5} className="px-4 py-2.5 border-r border-slate-200">
										IDENTITAS KARYAWAN
									</th>
									<th colSpan={4} className="px-4 py-2.5 text-center border-r border-slate-200 bg-slate-100/60">
										KEHADIRAN & LEMBUR
									</th>
									<th colSpan={4} className="px-4 py-2.5 text-center bg-[#CFE2F3]/40 text-blue-900 border-r border-slate-200 font-bold">
										KOLOM POTONGAN MASTER GAJI (EXPORT BIRU)
									</th>
									<th className="px-4 py-2.5 text-center">
										AKSI
									</th>
								</tr>
								{/* Header Kolom */}
								<tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-700">
									<th className="px-3 py-3 w-10 text-center">No</th>
									<th className="px-3 py-3 w-24">NIK</th>
									<th className="px-4 py-3 min-w-[200px]">Nama Karyawan</th>
									<th className="px-3 py-3 min-w-[140px]">Departemen</th>
									<th className="px-3 py-3 min-w-[150px] border-r border-slate-200">Jabatan</th>

									{/* Regular Columns */}
									<th className="px-3 py-3 text-center w-20">Kehadiran</th>
									<th className="px-3 py-3 text-center w-16">OFF</th>
									<th className="px-3 py-3 text-center w-24">Lembur Reguler</th>
									<th className="px-3 py-3 text-center w-24 border-r border-slate-200">Unpaid Leave</th>

									{/* Blue Columns */}
									<th className="px-3 py-3 text-center w-24 bg-[#CFE2F3]/60 text-blue-950 font-extrabold">
										Pot per Jam
									</th>
									<th className="px-3 py-3 text-center w-24 bg-[#CFE2F3]/60 text-blue-950 font-extrabold">
										Konsumsi (Telat)
									</th>
									<th className="px-3 py-3 text-center w-28 bg-[#CFE2F3]/60 text-blue-950 font-extrabold">
										Konsumsi (Unpaid)
									</th>
									<th className="px-3 py-3 text-center w-28 bg-[#CFE2F3]/60 text-blue-950 font-extrabold border-r border-slate-200">
										Transport (Unpaid)
									</th>

									<th className="px-3 py-3 text-center w-20">Detail</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 text-slate-700">
								{payrollData.map((row, idx) => {
									const isAlt = idx % 2 === 1;
									return (
										<tr
											key={row.employee_id}
											className={cn(
												"transition hover:bg-slate-50/80",
												isAlt ? "bg-slate-50/30" : "bg-white"
											)}
										>
											<td className="px-3 py-2.5 text-center font-medium text-slate-500">
												{idx + 1}
											</td>
											<td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
												{row.employee_code || "-"}
											</td>
											<td className="px-4 py-2.5 font-semibold text-slate-900">
												{row.employee_name}
											</td>
											<td className="px-3 py-2.5 text-slate-600">
												{row.department_name || "-"}
											</td>
											<td className="px-3 py-2.5 text-slate-600 border-r border-slate-200">
												{row.jabatan || "-"}
											</td>

											{/* Regular Metric Cells */}
											<td className="px-3 py-2.5 text-center font-bold text-emerald-700">
												{row.kehadiran}
											</td>
											<td className="px-3 py-2.5 text-center font-medium text-slate-600">
												{row.off}
											</td>
											<td className="px-3 py-2.5 text-center font-bold text-violet-700">
												{row.lembur_reguler > 0 ? `${row.lembur_reguler}j` : "-"}
											</td>
											<td className="px-3 py-2.5 text-center font-medium text-slate-500 border-r border-slate-200">
												{row.unpaid_leave > 0 ? (
													<span className="font-semibold text-rose-600">{row.unpaid_leave}</span>
												) : (
													"0"
												)}
											</td>

											{/* BLUE COLUMNS */}
											<td className="px-3 py-2.5 text-center bg-[#CFE2F3]/25 font-bold text-blue-900">
												{row.pot_per_jam > 0 ? (
													<span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-rose-700 font-bold">
														{row.pot_per_jam} jam
													</span>
												) : (
													<span className="text-slate-400">0</span>
												)}
											</td>
											<td className="px-3 py-2.5 text-center bg-[#CFE2F3]/25 font-bold text-blue-900">
												{row.konsumsi_telat > 0 ? (
													<span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 font-bold">
														{row.konsumsi_telat} kali
													</span>
												) : (
													<span className="text-slate-400">0</span>
												)}
											</td>
											<td className="px-3 py-2.5 text-center bg-[#CFE2F3]/25 font-bold text-blue-900">
												{row.konsumsi_unpaid > 0 ? (
													<span className="inline-block rounded-md bg-sky-100 px-2 py-0.5 text-sky-800 font-bold">
														{row.konsumsi_unpaid} hari
													</span>
												) : (
													<span className="text-slate-400">0</span>
												)}
											</td>
											<td className="px-3 py-2.5 text-center bg-[#CFE2F3]/25 font-bold text-blue-900 border-r border-slate-200">
												{row.transportasi_unpaid > 0 ? (
													<span className="inline-block rounded-md bg-sky-100 px-2 py-0.5 text-sky-800 font-bold">
														{row.transportasi_unpaid} hari
													</span>
												) : (
													<span className="text-slate-400">0</span>
												)}
											</td>

											{/* Action Breakdown */}
											<td className="px-3 py-2.5 text-center">
												<button
													type="button"
													onClick={() => setSelectedEmpDetail(row)}
													className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
												>
													<HiOutlineInformationCircle className="h-3.5 w-3.5 text-blue-600" />
													<span>Rincian</span>
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Modal Detail Breakdown */}
			{selectedEmpDetail && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
					<div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
						<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
							<div>
								<h3 className="text-base font-bold text-slate-900">
									Rincian Kehadiran & Potongan
								</h3>
								<p className="text-xs text-slate-500">
									{selectedEmpDetail.employee_code} • {selectedEmpDetail.employee_name}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setSelectedEmpDetail(null)}
								className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
							>
								<HiOutlineXMark className="h-5 w-5" />
							</button>
						</div>

						<div className="p-6 space-y-4 text-xs">
							{/* Paid Days Breakdown */}
							<div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
								<div className="font-bold text-emerald-900 mb-2 flex items-center justify-between">
									<span>Komponen Kehadiran (Paid Days)</span>
									<span className="text-sm">{selectedEmpDetail.kehadiran} Hari</span>
								</div>
								<div className="grid grid-cols-2 gap-2 text-emerald-800">
									<div>• Hadir Harian (WFO): <span className="font-semibold">{selectedEmpDetail.breakdown?.hadir_harian || 0}</span></div>
									<div>• WFA / WFH: <span className="font-semibold">{selectedEmpDetail.breakdown?.wfa || 0}</span></div>
									<div>• Sakit SKD: <span className="font-semibold">{selectedEmpDetail.breakdown?.sakit_skd || 0}</span></div>
									<div>• Replace OFF (RO): <span className="font-semibold">{selectedEmpDetail.breakdown?.ro || 0}</span></div>
									<div>• Cuti Tahunan: <span className="font-semibold">{selectedEmpDetail.breakdown?.cuti || 0}</span></div>
									<div>• Izin Pakai Lembur: <span className="font-semibold">{selectedEmpDetail.breakdown?.izin_seharian_lembur || 0}</span></div>
									<div>• Izin Half-Day: <span className="font-semibold">{selectedEmpDetail.breakdown?.izin_half_day || 0}</span></div>
								</div>
							</div>

							{/* OFF Breakdown */}
							<div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
								<div className="font-bold text-slate-900 mb-2 flex items-center justify-between">
									<span>Komponen OFF / Tidak Hadir</span>
									<span className="text-sm">{selectedEmpDetail.off} Hari</span>
								</div>
								<div className="grid grid-cols-2 gap-2 text-slate-700">
									<div>• WOD: <span className="font-semibold">{selectedEmpDetail.breakdown?.wod || 0}</span></div>
									<div>• Sakit non-SKD: <span className="font-semibold">{selectedEmpDetail.breakdown?.sakit_non_skd || 0}</span></div>
									<div>• Izin Seharian Unpaid: <span className="font-semibold">{selectedEmpDetail.breakdown?.izin_seharian_unpaid || 0}</span></div>
								</div>
							</div>

							{/* Blue Columns Info */}
							<div className="rounded-xl border border-blue-200 bg-[#CFE2F3]/30 p-3.5 text-blue-950">
								<div className="font-bold mb-2">Nilai Kolom Biru (Master Gaji)</div>
								<div className="grid grid-cols-2 gap-2">
									<div>• Pot per Jam: <span className="font-bold text-rose-700">{selectedEmpDetail.pot_per_jam} jam</span></div>
									<div>• Konsumsi Telat: <span className="font-bold text-amber-800">{selectedEmpDetail.konsumsi_telat} kali</span></div>
									<div>• Konsumsi Unpaid: <span className="font-bold">{selectedEmpDetail.konsumsi_unpaid} hari</span></div>
									<div>• Transport Unpaid: <span className="font-bold">{selectedEmpDetail.transportasi_unpaid} hari</span></div>
								</div>
							</div>
						</div>

						<div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
							<button
								type="button"
								onClick={() => setSelectedEmpDetail(null)}
								className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
							>
								Tutup
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

