import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { api, apiUpload } from "../../../lib/api";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function formatDateOnly(value) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

const MODE_META = {
	wfa: { label: "WFA", cls: "bg-violet-50 text-violet-700 border-violet-200" },
	wod: { label: "WOD", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const STATUS_META = {
	Pending_Supervisor: { label: "Menunggu Supervisor", cls: "bg-amber-50 text-amber-700 border-amber-200" },
	Rejected_Supervisor: { label: "Ditolak Supervisor", cls: "bg-rose-50 text-rose-700 border-rose-200" },
	disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function AttendanceApprovalAlora() {
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [toast, setToast] = useState(null);
	const [filterStatus, setFilterStatus] = useState("Pending_Supervisor");
	const [filterMode, setFilterMode] = useState("");
	const [actionItem, setActionItem] = useState(null);
	const [rejectReason, setRejectReason] = useState("");
	const [bodFile, setBodFile] = useState(null);
	const [acting, setActing] = useState(false);

	const fetchList = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const qs = new URLSearchParams({ status: filterStatus, limit: "100" });
			if (filterMode) qs.set("mode", filterMode);
			const data = await api(`/alora/attendance/pending-approvals?${qs.toString()}`);
			setRecords(data.records || []);
		} catch (err) {
			setError(err.message || "Gagal memuat approval absensi");
			setRecords([]);
		} finally {
			setLoading(false);
		}
	}, [filterStatus, filterMode]);

	useEffect(() => {
		document.title = "Approval Absensi WFA/WOD | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const pendingCount = useMemo(
		() => records.filter((r) => r.approval_status === "Pending_Supervisor").length,
		[records],
	);

	const runApprove = async (item) => {
		setActing(true);
		try {
			if (bodFile) {
				const fd = new FormData();
				fd.append("bod_file", bodFile);
				await apiUpload(`/alora/attendance/${item.id}/bod-attachment`, {
					method: "POST",
					body: fd,
				});
			}
			await api(`/alora/attendance/${item.id}/approve-supervisor`, { method: "POST" });
			setToast({ type: "success", message: "Absensi disetujui" });
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
			await api(`/alora/attendance/${actionItem.id}/reject-supervisor`, {
				method: "POST",
				body: JSON.stringify({ reason: rejectReason }),
			});
			setToast({ type: "success", message: "Absensi ditolak" });
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

			<div>
				<div className="mb-1 inline-flex items-center gap-2 text-blue-600">
					<HiOutlineClock className="h-5 w-5" />
					<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
				</div>
				<h1 className="text-xl font-black text-slate-800">Approval Absensi WFA/WOD</h1>
				<p className="mt-1 text-sm text-slate-500">
					Persetujuan supervisor setelah clock out · Bukti izin BOD wajib sebelum approve
				</p>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
					{error}
				</div>
			)}

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
						<option value="Pending_Supervisor">Menunggu Supervisor</option>
						<option value="disetujui">Disetujui</option>
						<option value="Rejected_Supervisor">Ditolak</option>
					</select>
					<select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
						<option value="">Semua mode</option>
						<option value="wfa">WFA</option>
						<option value="wod">WOD</option>
					</select>
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<HiOutlineCheckCircle className="h-4 w-4 text-amber-500" />
						{filterStatus === "Pending_Supervisor" ? `${pendingCount} menunggu` : `${records.length} record`}
					</div>
				</div>
			</section>

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Karyawan</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tanggal</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Mode</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Lokasi</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Durasi</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Alasan</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Memuat...</td></tr>
							) : records.length === 0 ? (
								<tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Tidak ada data</td></tr>
							) : records.map((row) => {
								const modeMeta = MODE_META[row.attendance_mode] || { label: row.mode_label || row.attendance_mode, cls: "bg-slate-50 text-slate-600 border-slate-200" };
								const statusMeta = STATUS_META[row.approval_status] || { label: row.approval_status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
								const duration = row.duration_hours != null ? `${Number(row.duration_hours).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jam` : "-";
								return (
									<tr key={row.id} className="border-t border-slate-100 align-top">
										<td className="px-4 py-3">
											<p className="font-semibold text-slate-800">{row.employee_name}</p>
											<p className="text-xs text-slate-400">{row.jabatan} · {row.department_name}</p>
										</td>
										<td className="px-4 py-3 text-xs whitespace-nowrap">
											<p>{formatDateOnly(row.attendance_date)}</p>
											<p className="text-slate-400">{formatDateTime(row.clock_in)} – {formatDateTime(row.clock_out)}</p>
										</td>
										<td className="px-4 py-3">
											<span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", modeMeta.cls)}>
												{row.mode_label || modeMeta.label}
											</span>
										</td>
										<td className="px-4 py-3 text-xs">{row.location_label || "-"}</td>
										<td className="px-4 py-3 text-xs">{duration}</td>
										<td className="px-4 py-3 text-xs max-w-[200px]">
											<p className="line-clamp-3">{row.mode_reason || "-"}</p>
										</td>
										<td className="px-4 py-3">
											<span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", statusMeta.cls)}>
												{statusMeta.label}
											</span>
										</td>
										<td className="px-4 py-3">
											{row.approval_status === "Pending_Supervisor" && (
												<div className="flex gap-2">
													<button
														type="button"
														onClick={() => { setActionItem({ ...row, mode: "approve" }); setBodFile(null); }}
														className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white"
													>
														Setujui
													</button>
													<button
														type="button"
														onClick={() => { setActionItem({ ...row, mode: "reject" }); setRejectReason(""); }}
														className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white"
													>
														Tolak
													</button>
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
						<h3 className="font-bold text-slate-800">Setujui absensi {actionItem.employee_name}?</h3>
						<p className="mt-1 text-xs text-slate-500">
							{actionItem.mode_label} · {formatDateOnly(actionItem.attendance_date)}
						</p>
						<div className="mt-3">
							<label className="text-xs font-semibold text-slate-600">Bukti izin BOD (wajib)</label>
							<input type="file" accept="image/*,.pdf" onChange={(e) => setBodFile(e.target.files?.[0] || null)} className="mt-1 w-full text-sm" />
						</div>
						<div className="mt-4 flex gap-2">
							<button type="button" onClick={() => setActionItem(null)} className="flex-1 rounded-xl border py-2 text-sm font-semibold">Batal</button>
							<button
								type="button"
								disabled={acting || !bodFile}
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
						<h3 className="font-bold text-slate-800">Tolak absensi</h3>
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
