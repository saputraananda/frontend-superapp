import { useEffect, useState } from "react";
import { HiOutlineExclamationTriangle, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
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

export default function DeleteManualAttendanceAloraModal({ item, onClose, onSaved }) {
	const [deleting, setDeleting] = useState(false);
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

	if (!item) return null;

	const handleConfirm = async () => {
		setError("");
		try {
			setDeleting(true);
			await api(`/alora/attendance/${item.attendance_id}/manual`, {
				method: "DELETE",
			});
			onSaved();
		} catch (err) {
			setError(err.message || "Gagal menghapus data absensi");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
							<HiOutlineTrash className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-base font-bold text-slate-800">Hapus Record Absensi</h3>
							<p className="mt-0.5 text-xs text-slate-400">Pastikan record yang dipilih sudah benar</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={deleting}
						className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-60 transition"
					>
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>

				<div className="px-5 py-4 space-y-3">
					<div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs space-y-1">
						<p className="font-bold text-slate-700">{item.employee_name || "-"}</p>
						<p className="text-slate-400">{item.employee_code || `ID ${item.employee_id}`}</p>
						<div className="flex flex-wrap items-center gap-2 mt-1">
							<span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
								ALORA
							</span>
							<span className="text-slate-500">{formatDateOnly(item.work_date)}</span>
						</div>
						<div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
							<div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
								<p className="font-semibold text-slate-400 uppercase tracking-wider">Absen In</p>
								<p className="mt-0.5 text-slate-700">{formatDateTime(item.check_in_time)}</p>
							</div>
							<div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
								<p className="font-semibold text-slate-400 uppercase tracking-wider">Absen Out</p>
								<p className="mt-0.5 text-slate-700">{formatDateTime(item.check_out_time)}</p>
							</div>
						</div>
					</div>

					<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
						<p className="font-bold">Peringatan</p>
						<p className="mt-0.5">Aksi ini akan menghapus record secara permanen dari sistem absensi.</p>
					</div>

					{error && (
						<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
							<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							<span>{error}</span>
						</div>
					)}
				</div>

				<div className="flex gap-2 px-5 pb-5 pt-1">
					<button
						type="button"
						onClick={onClose}
						disabled={deleting}
						className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={deleting}
						className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition"
					>
						{deleting ? "Menghapus..." : "Hapus Absensi"}
					</button>
				</div>
			</div>
		</div>
	);
}
