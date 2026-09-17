import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { api, apiUpload } from "../../../lib/api";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function formatDateOnly(value) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function getDefaultCutoff(now = new Date()) {
	let cutoffMonth = now.getMonth() + 1;
	let cutoffYear = now.getFullYear();
	if (now.getDate() > 25) {
		cutoffMonth += 1;
		if (cutoffMonth > 12) {
			cutoffMonth = 1;
			cutoffYear += 1;
		}
	}
	const start = new Date(cutoffYear, cutoffMonth - 2, 26);
	const end = new Date(cutoffYear, cutoffMonth - 1, 25);
	const pad = (n) => String(n).padStart(2, "0");
	return {
		cutoffMonth,
		cutoffYear,
		startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
		endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
	};
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

const TYPE_META = {
	lembur: { label: "Lembur", cls: "bg-violet-50 text-violet-700 border-violet-200" },
	earned_replace_off: { label: "Earned RO", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

export default function AttendanceSessionsAlora() {
	const defaults = getDefaultCutoff();
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [toast, setToast] = useState(null);
	const [filterStatus, setFilterStatus] = useState("Pending_Supervisor");
	const [filterType, setFilterType] = useState("");
	const [cutoffMonth, setCutoffMonth] = useState(defaults.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaults.cutoffYear);
	const [actionItem, setActionItem] = useState(null);
	const [rejectReason, setRejectReason] = useState("");
	const [bodFile, setBodFile] = useState(null);
	const [acting, setActing] = useState(false);

	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
	}, []);

	const cutoffRange = useMemo(() => {
		const start = new Date(cutoffYear, cutoffMonth - 2, 26);
		const end = new Date(cutoffYear, cutoffMonth - 1, 25);
		const pad = (n) => String(n).padStart(2, "0");
		return {
			startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
			endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
		};
	}, [cutoffMonth, cutoffYear]);

	const fetchList = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const qs = new URLSearchParams({
				startDate: cutoffRange.startDate,
				endDate: cutoffRange.endDate,
				status: filterStatus,
				limit: "100",
			});
			if (filterType) qs.set("sessionType", filterType);
			const data = await api(`/alora/attendance-sessions?${qs.toString()}`);
			setRecords(data.records || []);
		} catch (err) {
			setError(err.message || "Gagal memuat sesi");
			setRecords([]);
		} finally {
			setLoading(false);
		}
	}, [cutoffRange, filterStatus, filterType]);

	useEffect(() => {
		document.title = "Sesi Lembur & RO | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const runApprove = async (item) => {
		setActing(true);
		try {
			if (item.session_type === "earned_replace_off" && bodFile) {
				const fd = new FormData();
				fd.append("bod_proof", bodFile);
				await apiUpload(`/alora/attendance-sessions/${item.id}/bod-attachment`, {
					method: "POST",
					body: fd,
				});
			}
			await api(`/alora/attendance-sessions/${item.id}/supervisor-approve`, { method: "PUT" });
			setToast({ type: "success", message: "Sesi disetujui" });
			setActionItem(null);
			setBodFile(null);
			fetchList();
		} catch (err) {
			setToast({ type: "error", message: err.message || "Gagal menyetujui" });
		} finally {
			setActing(false);
		}
	};

	const runReject = async () => {
		if (!rejectReason.trim()) return;
		setActing(true);
		try {
			await api(`/alora/attendance-sessions/${actionItem.id}/supervisor-reject`, {
				method: "PUT",
				body: JSON.stringify({ reason: rejectReason }),
			});
			setToast({ type: "success", message: "Sesi ditolak" });
			setActionItem(null);
			setRejectReason("");
			fetchList();
		} catch (err) {
			setToast({ type: "error", message: err.message || "Gagal menolak" });
		} finally {
			setActing(false);
		}
	};

	return (
		<div className="space-y-5 p-4 sm:p-6">
			{toast && (
				<div className={cn(
					"rounded-xl border px-4 py-3 text-sm font-semibold",
					toast.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
				)}>
					{toast.message}
				</div>
			)}

			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<div className="mb-1 inline-flex items-center gap-2 text-violet-600">
						<HiOutlineClock className="h-5 w-5" />
						<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
					</div>
					<h1 className="text-xl font-black text-slate-800">Sesi Lembur &amp; Earned RO</h1>
					<p className="mt-1 text-sm text-slate-500">
						Clock session dari mobile · Earned RO wajib bukti BOD saat approve
					</p>
				</div>
				<Link to="/master-karyawan/lembur-ro-legacy" className="text-sm font-semibold text-slate-500 underline">
					Pengajuan Lembur
				</Link>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<HiOutlineExclamationTriangle className="h-4 w-4" />
					{error}
				</div>
			)}

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
					<select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
						<option value="Pending_Supervisor">Menunggu Supervisor</option>
						<option value="disetujui">Disetujui</option>
						<option value="Rejected_Supervisor">Ditolak</option>
					</select>
					<select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
						<option value="">Semua jenis</option>
						<option value="lembur">Lembur</option>
						<option value="earned_replace_off">Earned RO</option>
					</select>
					<select value={cutoffMonth} onChange={(e) => setCutoffMonth(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
						{PERIOD_MONTHS.map((m) => (
							<option key={m.value} value={m.value}>{m.label}</option>
						))}
					</select>
					<select value={cutoffYear} onChange={(e) => setCutoffYear(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
						{yearOptions.map((y) => (
							<option key={y} value={y}>{y}</option>
						))}
					</select>
					<div className="text-xs text-slate-500 self-center">
						{formatDateOnly(cutoffRange.startDate)} – {formatDateOnly(cutoffRange.endDate)}
					</div>
				</div>
			</section>

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Karyawan</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Jenis</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tanggal</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Jam</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Durasi</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Memuat...</td></tr>
							) : records.length === 0 ? (
								<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Tidak ada data</td></tr>
							) : records.map((row) => {
								const meta = TYPE_META[row.session_type] || { label: row.session_type, cls: "bg-slate-50 text-slate-600 border-slate-200" };
								return (
									<tr key={row.id} className="border-t border-slate-100">
										<td className="px-4 py-3">
											<p className="font-semibold text-slate-800">{row.employee_name}</p>
											<p className="text-xs text-slate-400">{row.department_name}</p>
										</td>
										<td className="px-4 py-3">
											<span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", meta.cls)}>{meta.label}</span>
										</td>
										<td className="px-4 py-3 text-xs">{formatDateOnly(row.work_date)}</td>
										<td className="px-4 py-3 text-xs whitespace-nowrap">{row.start_time}–{row.end_time}</td>
										<td className="px-4 py-3 text-xs">{row.duration_hours} jam</td>
										<td className="px-4 py-3 text-xs">{row.status}</td>
										<td className="px-4 py-3">
											{row.status === "Pending_Supervisor" && (
												<div className="flex gap-2">
													<button type="button" onClick={() => { setActionItem({ ...row, mode: "approve" }); setBodFile(null); }} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Setujui</button>
													<button type="button" onClick={() => { setActionItem({ ...row, mode: "reject" }); setRejectReason(""); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white">Tolak</button>
												</div>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</section>

			{actionItem?.mode === "approve" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
						<h3 className="font-bold text-slate-800">Setujui sesi {actionItem.employee_name}?</h3>
						{actionItem.session_type === "earned_replace_off" && (
							<div className="mt-3">
								<label className="text-xs font-semibold text-slate-600">Bukti izin BOD (wajib)</label>
								<input type="file" accept="image/*,.pdf" onChange={(e) => setBodFile(e.target.files?.[0] || null)} className="mt-1 w-full text-sm" />
							</div>
						)}
						<div className="mt-4 flex gap-2">
							<button type="button" onClick={() => setActionItem(null)} className="flex-1 rounded-xl border py-2 text-sm font-semibold">Batal</button>
							<button
								type="button"
								disabled={acting || (actionItem.session_type === "earned_replace_off" && !bodFile)}
								onClick={() => runApprove(actionItem)}
								className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
							>
								{acting ? "..." : "Setujui"}
							</button>
						</div>
					</div>
				</div>
			)}

			{actionItem?.mode === "reject" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
						<h3 className="font-bold text-slate-800">Tolak sesi</h3>
						<textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="mt-3 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Alasan penolakan" />
						<div className="mt-4 flex gap-2">
							<button type="button" onClick={() => setActionItem(null)} className="flex-1 rounded-xl border py-2 text-sm font-semibold">Batal</button>
							<button type="button" disabled={acting || !rejectReason.trim()} onClick={runReject} className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-semibold text-white disabled:opacity-50">Tolak</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
