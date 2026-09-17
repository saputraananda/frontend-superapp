import { useCallback, useEffect, useState } from "react";
import { HiOutlineClock, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { api } from "../../../lib/api";

function formatDateOnly(value) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function getDefaultCutoff(now = new Date()) {
	const start = new Date(now.getFullYear(), now.getMonth() - 1, 26);
	const end = new Date(now.getFullYear(), now.getMonth(), 25);
	const pad = (n) => String(n).padStart(2, "0");
	return {
		startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
		endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
	};
}

export default function PlannedLateAlora() {
	const defaults = getDefaultCutoff();
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [rejectItem, setRejectItem] = useState(null);
	const [rejectReason, setRejectReason] = useState("");
	const [acting, setActing] = useState(false);

	const fetchList = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const qs = new URLSearchParams({
				startDate: defaults.startDate,
				endDate: defaults.endDate,
				status: "Pending_Supervisor",
			});
			const data = await api(`/alora/planned-late?${qs.toString()}`);
			setRecords(data.records || []);
		} catch (err) {
			setError(err.message || "Gagal memuat data");
			setRecords([]);
		} finally {
			setLoading(false);
		}
	}, [defaults.endDate, defaults.startDate]);

	useEffect(() => {
		document.title = "Terlambat Rencana | Alora Group Indonesia";
		fetchList();
	}, [fetchList]);

	const approve = async (id) => {
		setActing(true);
		try {
			await api(`/alora/planned-late/${id}/supervisor-approve`, { method: "PUT" });
			fetchList();
		} catch (err) {
			setError(err.message || "Gagal menyetujui");
		} finally {
			setActing(false);
		}
	};

	const reject = async () => {
		if (!rejectItem || !rejectReason.trim()) return;
		setActing(true);
		try {
			await api(`/alora/planned-late/${rejectItem.id}/supervisor-reject`, {
				method: "PUT",
				body: JSON.stringify({ reason: rejectReason }),
			});
			setRejectItem(null);
			setRejectReason("");
			fetchList();
		} catch (err) {
			setError(err.message || "Gagal menolak");
		} finally {
			setActing(false);
		}
	};

	return (
		<div className="space-y-5 p-4 sm:p-6">
			<div>
				<div className="mb-1 inline-flex items-center gap-2 text-amber-600">
					<HiOutlineClock className="h-5 w-5" />
					<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
				</div>
				<h1 className="text-xl font-black text-slate-800">Terlambat (Rencana)</h1>
				<p className="mt-1 text-sm text-slate-500">Approval retroaktif setelah clock in terlambat</p>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<HiOutlineExclamationTriangle className="h-4 w-4" />
					{error}
				</div>
			)}

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<table className="w-full text-sm">
					<thead className="bg-slate-50">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Karyawan</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tanggal</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Masuk</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Menit</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Alasan</th>
							<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat...</td></tr>
						) : records.length === 0 ? (
							<tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Tidak ada pending</td></tr>
						) : records.map((row) => (
							<tr key={row.id} className="border-t border-slate-100">
								<td className="px-4 py-3 font-semibold">{row.employee_name}</td>
								<td className="px-4 py-3 text-xs">{formatDateOnly(row.attendance_date)}</td>
								<td className="px-4 py-3 text-xs">{row.clock_in_time}</td>
								<td className="px-4 py-3 text-xs">{row.late_minutes}</td>
								<td className="px-4 py-3 text-xs max-w-xs truncate">{row.late_reason}</td>
								<td className="px-4 py-3">
									<div className="flex gap-2">
										<button type="button" disabled={acting} onClick={() => approve(row.id)} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Setujui</button>
										<button type="button" onClick={() => setRejectItem(row)} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white">Tolak</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>

			{rejectItem && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
						<h3 className="font-bold">Tolak terlambat rencana</h3>
						<textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="mt-3 w-full rounded-xl border px-3 py-2 text-sm" />
						<div className="mt-4 flex gap-2">
							<button type="button" onClick={() => setRejectItem(null)} className="flex-1 rounded-xl border py-2 text-sm">Batal</button>
							<button type="button" disabled={acting || !rejectReason.trim()} onClick={reject} className="flex-1 rounded-xl bg-rose-600 py-2 text-sm text-white">Tolak</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
