import { useEffect, useState } from "react";
import {
	HiOutlineClock,
	HiOutlineExclamationTriangle,
	HiOutlineCheckCircle,
	HiOutlineXMark,
	HiOutlineShieldCheck,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

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

export default function CompensateLateAttendanceModal({ item, onClose, onSaved }) {
	const [info, setInfo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [source, setSource] = useState("replace_off");
	const [note, setNote] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	useEffect(() => {
		if (!item?.attendance_id) return;
		let mounted = true;
		setLoading(true);
		setError("");

		api(`/alora/attendance/${item.attendance_id}/compensation-info`)
			.then((res) => {
				if (!mounted) return;
				const data = res?.data || res;
				setInfo(data);
				// Default selection based on sufficient balance
				if (data.can_compensate_replace_off) {
					setSource("replace_off");
				} else if (data.can_compensate_overtime) {
					setSource("overtime");
				} else {
					setSource("replace_off");
				}
			})
			.catch((err) => {
				if (!mounted) return;
				setError(err.message || "Gagal memuat informasi kompensasi keterlambatan");
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, [item?.attendance_id]);

	if (!item) return null;

	const hoursNeeded = info?.hours_needed ?? (item.late_minutes ? Math.round((Number(item.late_minutes) / 60) * 100) / 100 : 0);
	const canCompensate = source === "replace_off" ? info?.can_compensate_replace_off : info?.can_compensate_overtime;

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!source) {
			setError("Pilih salah satu sumber saldo kompensasi");
			return;
		}

		if (!canCompensate) {
			setError(`Saldo ${source === "replace_off" ? "RO" : "Lembur"} tidak mencukupi untuk menutup keterlambatan ini`);
			return;
		}

		try {
			setSubmitting(true);
			await api(`/alora/attendance/${item.attendance_id}/compensate-late`, {
				method: "POST",
				body: JSON.stringify({
					source,
					note: note.trim() || undefined,
				}),
			});
			onSaved();
		} catch (err) {
			setError(err.message || "Gagal memproses kompensasi keterlambatan");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
							<HiOutlineShieldCheck className="h-6 w-6" />
						</div>
						<div>
							<h3 className="text-base font-bold text-slate-800">Tutup Keterlambatan</h3>
							<p className="mt-0.5 text-xs text-slate-400">Kompensasi telat menggunakan saldo RO atau Lembur</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
					>
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="px-5 py-4 space-y-4">
						{/* Profil info */}
						<div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs space-y-1">
							<div className="flex items-center justify-between">
								<p className="font-bold text-slate-700 text-sm">{item.employee_name}</p>
								<span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
									{item.employee_code || `ID ${item.employee_id}`}
								</span>
							</div>
							<p className="text-slate-500">
								Tanggal Absensi: <span className="font-semibold text-slate-700">{formatDateOnly(item.work_date)}</span>
							</p>
							{item.check_in_time && (
								<p className="text-slate-500">
									Jam Masuk: <span className="font-semibold text-slate-700">{String(item.check_in_time).slice(11, 16)}</span>
								</p>
							)}
						</div>

						{/* Durasi keterlambatan & ekstraksi jam */}
						<div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5">
							<div className="flex items-center justify-between text-xs">
								<span className="text-amber-800 font-medium">Durasi Keterlambatan:</span>
								<span className="font-bold text-amber-900 text-sm">
									{item.late_minutes != null ? `${item.late_minutes} menit` : "-"}
								</span>
							</div>
							<div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
								<span className="text-amber-800 font-medium">Saldo yang Dibutuhkan:</span>
								<span className="font-extrabold text-amber-900 text-base">
									{hoursNeeded} jam
								</span>
							</div>
							<p className="mt-1 text-[11px] text-amber-700/80">
								*Dihitung proporsional: {item.late_minutes || 0} menit / 60 = {hoursNeeded} jam
							</p>
						</div>

						{/* Pilihan Sumber Saldo */}
						<div className="space-y-2">
							<label className="text-xs font-bold text-slate-700">Pilih Sumber Saldo:</label>

							{loading ? (
								<div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
									<HiOutlineClock className="h-4 w-4 animate-spin text-slate-500" />
									Memeriksa saldo karyawan...
								</div>
							) : (
								<div className="space-y-2">
									{/* Radio RO */}
									<label
										className={`relative flex items-center justify-between rounded-xl border p-3 cursor-pointer transition ${
											source === "replace_off"
												? "border-sky-500 bg-sky-50/50 ring-1 ring-sky-500"
												: "border-slate-200 hover:border-slate-300 bg-white"
										} ${!info?.can_compensate_replace_off ? "opacity-60 bg-slate-50 cursor-not-allowed" : ""}`}
									>
										<div className="flex items-center gap-3">
											<input
												type="radio"
												name="source"
												value="replace_off"
												checked={source === "replace_off"}
												disabled={!info?.can_compensate_replace_off}
												onChange={(e) => setSource(e.target.value)}
												className="h-4 w-4 text-sky-600 focus:ring-sky-500"
											/>
											<div>
												<p className="text-xs font-bold text-slate-800">Saldo RO (Replace Off)</p>
												<p className="text-[11px] text-slate-500">
													Tersedia:{" "}
													<span className="font-semibold text-sky-700">
														{info?.usable_replace_off_hours ?? 0} jam
													</span>
												</p>
											</div>
										</div>
										<div>
											{info?.can_compensate_replace_off ? (
												<span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
													<HiOutlineCheckCircle className="h-3 w-3" /> Cukup
												</span>
											) : (
												<span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
													Kurang
												</span>
											)}
										</div>
									</label>

									{/* Radio Lembur */}
									<label
										className={`relative flex items-center justify-between rounded-xl border p-3 cursor-pointer transition ${
											source === "overtime"
												? "border-purple-500 bg-purple-50/50 ring-1 ring-purple-500"
												: "border-slate-200 hover:border-slate-300 bg-white"
										} ${!info?.can_compensate_overtime ? "opacity-60 bg-slate-50 cursor-not-allowed" : ""}`}
									>
										<div className="flex items-center gap-3">
											<input
												type="radio"
												name="source"
												value="overtime"
												checked={source === "overtime"}
												disabled={!info?.can_compensate_overtime}
												onChange={(e) => setSource(e.target.value)}
												className="h-4 w-4 text-purple-600 focus:ring-purple-500"
											/>
											<div>
												<p className="text-xs font-bold text-slate-800">Saldo Lembur</p>
												<p className="text-[11px] text-slate-500">
													Tersedia:{" "}
													<span className="font-semibold text-purple-700">
														{info?.usable_overtime_hours ?? 0} jam
													</span>
												</p>
											</div>
										</div>
										<div>
											{info?.can_compensate_overtime ? (
												<span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
													<HiOutlineCheckCircle className="h-3 w-3" /> Cukup
												</span>
											) : (
												<span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
													Kurang
												</span>
											)}
										</div>
									</label>
								</div>
							)}
						</div>

						{/* Catatan opsional */}
						<div>
							<label className="text-xs font-medium text-slate-600">Catatan HR (Opsional):</label>
							<input
								type="text"
								value={note}
								onChange={(e) => setNote(e.target.value)}
								placeholder="Alasan penutupan keterlambatan..."
								className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
							/>
						</div>

						{/* Error message */}
						{error && (
							<div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs text-rose-700">
								<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0 mt-0.5" />
								<span>{error}</span>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
						<button
							type="button"
							onClick={onClose}
							disabled={submitting}
							className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={loading || submitting || !canCompensate}
							className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
						>
							{submitting ? "Memproses..." : "Potong Saldo & Tutup Telat"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
