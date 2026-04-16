import { useEffect, useMemo, useState } from "react";
import {
	HiOutlineCalendarDays,
	HiOutlineCheckCircle,
	HiOutlineClock,
	HiOutlineDocumentCheck,
	HiOutlineExclamationTriangle,
	HiOutlinePhoto,
	HiOutlineUserGroup,
} from "react-icons/hi2";
import HeaderLayout from "../../layouts/HeaderLayout";
import { api } from "../../lib/api";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
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

function toneClass(tone) {
	if (tone === "emerald") return "bg-emerald-50 border-emerald-100 text-emerald-700";
	if (tone === "amber") return "bg-amber-50 border-amber-100 text-amber-700";
	if (tone === "rose") return "bg-rose-50 border-rose-100 text-rose-700";
	return "bg-blue-50 border-blue-100 text-blue-700";
}

function StatCard({ title, value, subtitle, tone = "blue", Icon }) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
					<p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
					<p className="mt-1 text-xs text-slate-500">{subtitle}</p>
				</div>
				<div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", toneClass(tone))}>
					<Icon className="h-5 w-5" />
				</div>
			</div>
		</div>
	);
}

function statusBadgeClass(label) {
	if (label === "Lengkap") return "bg-emerald-50 text-emerald-700 border-emerald-200";
	if (label === "Belum check-out") return "bg-amber-50 text-amber-700 border-amber-200";
	if (label === "Belum check-in") return "bg-rose-50 text-rose-700 border-rose-200";
	return "bg-blue-50 text-blue-700 border-blue-200";
}

export default function AbsensiIKM({ user, onLogout }) {
	const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

	const [filters, setFilters] = useState({
		startDate: today,
		endDate: today,
		shiftType: "",
		employeeId: "",
		onlyIncomplete: false,
	});
	const [appliedFilters, setAppliedFilters] = useState({
		startDate: today,
		endDate: today,
		shiftType: "",
		employeeId: "",
		onlyIncomplete: false,
	});
	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [summary, setSummary] = useState(null);
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		document.title = "Absensi IKM | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		const fetchAbsensi = async () => {
			try {
				setLoading(true);
				setError("");

				const qs = new URLSearchParams();
				qs.set("startDate", appliedFilters.startDate);
				qs.set("endDate", appliedFilters.endDate);
				qs.set("page", String(pagination.page));
				qs.set("limit", String(pagination.limit));
				if (appliedFilters.shiftType) qs.set("shiftType", appliedFilters.shiftType);
				if (appliedFilters.employeeId) qs.set("employeeId", appliedFilters.employeeId);
				if (appliedFilters.onlyIncomplete) qs.set("onlyIncomplete", "1");

				const response = await api(`/ikm/absensi/shifts?${qs.toString()}`);
				setSummary(response.summary || null);
				setRecords(response.records || []);
				setPagination((prev) => ({
					...prev,
					total: response.pagination?.total || 0,
					totalPages: response.pagination?.totalPages || 1,
				}));
			} catch (err) {
				setError(err.message || "Gagal mengambil data absensi IKM");
				setSummary(null);
				setRecords([]);
			} finally {
				setLoading(false);
			}
		};

		fetchAbsensi();
	}, [appliedFilters, pagination.page, pagination.limit]);

	const jobTitle =
		user?.employee?.job_level_name || user?.employee?.position || user?.role || "Employee";

	const applyFilters = () => {
		if (filters.endDate < filters.startDate) {
			setError("Tanggal akhir tidak boleh lebih kecil dari tanggal awal");
			return;
		}
		setPagination((prev) => ({ ...prev, page: 1 }));
		setAppliedFilters({ ...filters });
	};

	const resetFilters = () => {
		const reset = {
			startDate: today,
			endDate: today,
			shiftType: "",
			employeeId: "",
			onlyIncomplete: false,
		};
		setFilters(reset);
		setAppliedFilters(reset);
		setPagination((prev) => ({ ...prev, page: 1 }));
		setError("");
	};

	return (
		<HeaderLayout user={user} jobTitle={jobTitle} onLogout={onLogout}>
			<div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">
				<section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
								<HiOutlineCalendarDays className="h-4 w-4" />
								Dashboard Pemantauan Absensi IKM
							</div>
							<h1 className="mt-3 text-xl font-bold text-slate-800 sm:text-2xl">Absensi Shift Karyawan IKM</h1>
							<p className="mt-1 text-sm text-slate-500">
								Sumber data: tr_attendance_shift_ikm (pagi, siang, sore, lembur opsional).
							</p>
						</div>
						<div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
							Total record: <span className="font-semibold text-slate-800">{pagination.total}</span>
						</div>
					</div>
				</section>

				<section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
							<input
								type="date"
								value={filters.startDate}
								onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
							/>
						</label>

						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
							<input
								type="date"
								value={filters.endDate}
								onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
							/>
						</label>

						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Shift</span>
							<select
								value={filters.shiftType}
								onChange={(e) => setFilters((prev) => ({ ...prev, shiftType: e.target.value }))}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
							>
								<option value="">Semua Shift</option>
								<option value="pagi">Pagi</option>
								<option value="siang">Siang</option>
								<option value="sore">Sore</option>
								<option value="lembur">Lembur</option>
							</select>
						</label>

						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Employee ID</span>
							<input
								type="number"
								min="1"
								value={filters.employeeId}
								onChange={(e) => setFilters((prev) => ({ ...prev, employeeId: e.target.value }))}
								placeholder="contoh: 31"
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
							/>
						</label>

						<label className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
							<input
								type="checkbox"
								checked={filters.onlyIncomplete}
								onChange={(e) => setFilters((prev) => ({ ...prev, onlyIncomplete: e.target.checked }))}
								className="h-4 w-4"
							/>
							Hanya data belum lengkap
						</label>

						<div className="flex items-end gap-2">
							<button
								type="button"
								onClick={applyFilters}
								className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
							>
								Terapkan
							</button>
							<button
								type="button"
								onClick={resetFilters}
								className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
							>
								Reset
							</button>
						</div>
					</div>
					{error && (
						<div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
							{error}
						</div>
					)}
				</section>

				<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
					<StatCard
						title="Karyawan"
						value={summary?.totalEmployees ?? 0}
						subtitle="Employee unik pada range"
						tone="blue"
						Icon={HiOutlineUserGroup}
					/>
					<StatCard
						title="Check-in Lengkap"
						value={summary?.totalCheckIn ?? 0}
						subtitle="Record dengan check-in"
						tone="emerald"
						Icon={HiOutlineCheckCircle}
					/>
					<StatCard
						title="Pending Check-out"
						value={summary?.pendingCheckOut ?? 0}
						subtitle="Masih belum check-out"
						tone="amber"
						Icon={HiOutlineClock}
					/>
					<StatCard
						title="Foto Lengkap"
						value={summary?.totalPhotoComplete ?? 0}
						subtitle="Check-in + check-out foto"
						tone="blue"
						Icon={HiOutlinePhoto}
					/>
					<StatCard
						title="Shift Wajib Complete"
						value={`${summary?.mandatoryCompletionRate ?? 0}%`}
						subtitle={`${summary?.completedMandatorySlots ?? 0}/${summary?.availableMandatorySlots ?? 0} slot`}
						tone={(summary?.missingMandatorySlots ?? 0) > 0 ? "rose" : "emerald"}
						Icon={HiOutlineDocumentCheck}
					/>
				</section>

				<section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
					<div className="border-b border-slate-100 px-5 py-4">
						<h2 className="text-base font-bold text-slate-800">Detail Absensi Shift</h2>
						<p className="mt-0.5 text-xs text-slate-500">
							Sekali shift wajib check-in, check-out, serta foto bukti real-time dengan timestamp.
						</p>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-50 text-slate-500">
								<tr>
									<th className="px-4 py-3 text-left font-semibold">Tanggal</th>
									<th className="px-4 py-3 text-left font-semibold">Employee</th>
									<th className="px-4 py-3 text-left font-semibold">Shift</th>
									<th className="px-4 py-3 text-left font-semibold">Check-in</th>
									<th className="px-4 py-3 text-left font-semibold">Foto In</th>
									<th className="px-4 py-3 text-left font-semibold">Check-out</th>
									<th className="px-4 py-3 text-left font-semibold">Foto Out</th>
									<th className="px-4 py-3 text-left font-semibold">Koordinat</th>
									<th className="px-4 py-3 text-left font-semibold">Status</th>
								</tr>
							</thead>
							<tbody>
								{!loading && records.length === 0 && (
									<tr>
										<td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
											Data absensi tidak ditemukan pada filter saat ini.
										</td>
									</tr>
								)}

								{records.map((row) => (
									<tr key={row.shift_record_id} className="border-t border-slate-100 align-top">
										<td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDateOnly(row.work_date)}</td>
										<td className="whitespace-nowrap px-4 py-3 text-slate-700">
											<div className="font-semibold">ID {row.employee_id}</div>
											<div className="text-xs text-slate-500">User {row.user_id}</div>
										</td>
										<td className="whitespace-nowrap px-4 py-3">
											<span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
												{row.shift_type}
											</span>
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDateTime(row.check_in_time)}</td>
										<td className="whitespace-nowrap px-4 py-3">
											{row.check_in_photo_url ? (
												<a
													href={row.check_in_photo_url}
													target="_blank"
													rel="noreferrer"
													className="text-xs font-semibold text-blue-600 hover:underline"
												>
													Lihat Foto In
												</a>
											) : (
												<span className="text-xs text-slate-400">-</span>
											)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDateTime(row.check_out_time)}</td>
										<td className="whitespace-nowrap px-4 py-3">
											{row.check_out_photo_url ? (
												<a
													href={row.check_out_photo_url}
													target="_blank"
													rel="noreferrer"
													className="text-xs font-semibold text-blue-600 hover:underline"
												>
													Lihat Foto Out
												</a>
											) : (
												<span className="text-xs text-slate-400">-</span>
											)}
										</td>
										<td className="px-4 py-3 text-xs text-slate-600">
											<div>IN: {row.check_in_lat ?? "-"}, {row.check_in_lng ?? "-"}</div>
											<div>OUT: {row.check_out_lat ?? "-"}, {row.check_out_lng ?? "-"}</div>
										</td>
										<td className="whitespace-nowrap px-4 py-3">
											<span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusBadgeClass(row.status_label))}>
												{row.status_label}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
						<p className="text-slate-500">
							Halaman {pagination.page} dari {pagination.totalPages}
						</p>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
								disabled={pagination.page <= 1 || loading}
								className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Sebelumnya
							</button>
							<button
								type="button"
								onClick={() =>
									setPagination((prev) => ({
										...prev,
										page: Math.min(prev.page + 1, prev.totalPages || 1),
									}))
								}
								disabled={pagination.page >= pagination.totalPages || loading}
								className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Berikutnya
							</button>
						</div>
					</div>
				</section>

				{loading && (
					<div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
						Memuat data absensi IKM...
					</div>
				)}

				{summary && (summary.missingMandatorySlots > 0 || summary.pendingCheckOut > 0) && (
					<div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
						<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<p>
							Masih ada {summary.missingMandatorySlots} slot shift wajib yang belum lengkap dan {summary.pendingCheckOut} record belum check-out.
						</p>
					</div>
				)}
			</div>
		</HeaderLayout>
	);
}
