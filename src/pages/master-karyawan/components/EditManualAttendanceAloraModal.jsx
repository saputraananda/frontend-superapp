import { useEffect, useState } from "react";
import { HiOutlineClock, HiOutlineExclamationTriangle, HiOutlinePencilSquare, HiOutlineXMark } from "react-icons/hi2";
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

function toDateTimeLocalInput(value) {
	if (!value) return "";
	if (typeof value === "string") {
		const s = value.trim();
		if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
			return s.slice(0, 16).replace(" ", "T");
		}
	}
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditManualAttendanceAloraModal({ item, onClose, onSaved }) {
	const [checkIn, setCheckIn] = useState(toDateTimeLocalInput(item?.check_in_time));
	const [checkOut, setCheckOut] = useState(toDateTimeLocalInput(item?.check_out_time));
	const [saving, setSaving] = useState(false);
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

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!checkIn) {
			setError("Jam absen in (masuk) wajib diisi");
			return;
		}

		if (checkIn && checkOut && checkOut <= checkIn) {
			setError("Jam keluar harus lebih besar dari jam masuk");
			return;
		}

		try {
			setSaving(true);
			await api(`/alora/attendance/${item.attendance_id}/manual`, {
				method: "PUT",
				body: JSON.stringify({
					check_in_time: checkIn || null,
					check_out_time: checkOut || null,
				}),
			});
			onSaved();
		} catch (err) {
			setError(err.message || "Gagal menyimpan perubahan absensi");
		} finally {
			setSaving(false);
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
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
							<HiOutlinePencilSquare className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-base font-bold text-slate-800">Edit Jam Absensi</h3>
							<p className="mt-0.5 text-xs text-slate-400">Ubah jam absen masuk/keluar untuk record ini</p>
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

				<div className="px-5 py-4 space-y-3">
					{/* Profil info */}
					<div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs space-y-1">
						<p className="font-bold text-slate-700">{item.employee_name}</p>
						<p className="text-slate-400">{item.employee_code || `ID ${item.employee_id}`}</p>
						<div className="flex items-center gap-2 mt-1">
							<span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
								ALORA
							</span>
							<span className="text-slate-500">{formatDateOnly(item.work_date)}</span>
						</div>
					</div>

					{error && (
						<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
							<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							<span>{error}</span>
						</div>
					)}
				</div>

				<form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
					<label className="block text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-600">
							Jam Absen In (Masuk) <span className="text-rose-500">*</span>
						</span>
						<input
							type="datetime-local"
							value={checkIn}
							onChange={(e) => setCheckIn(e.target.value)}
							required
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
						/>
					</label>

					<label className="block text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-600">
							Jam Absen Out (Keluar) <span className="text-[11px] font-normal text-slate-400">(opsional)</span>
						</span>
						<input
							type="datetime-local"
							value={checkOut}
							onChange={(e) => setCheckOut(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
						/>
					</label>

					<div className="flex gap-2 pt-1">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={saving}
							className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
						>
							{saving ? "Menyimpan..." : "Simpan Perubahan"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
