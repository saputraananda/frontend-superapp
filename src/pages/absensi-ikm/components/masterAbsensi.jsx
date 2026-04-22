import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlineCheckCircle,
	HiOutlineClock,
	HiOutlineCog6Tooth,
	HiOutlineExclamationTriangle,
	HiOutlineMoon,
	HiOutlinePencilSquare,
	HiOutlinePlus,
	HiOutlineSun,
	HiOutlineTrash,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

// ─── Utilities ─────────────────────────────────────────────────────────────

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function formatTime(value) {
	if (!value) return "-";
	// HH:MM:SS → HH:MM
	return String(value).slice(0, 5);
}

// ─── Shared UI ─────────────────────────────────────────────────────────────

function Toast({ toast }) {
	if (!toast) return null;
	return (
		<div
			className={cn(
				"fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
				toast.type === "error"
					? "border-rose-200 bg-rose-50 text-rose-700"
					: "border-emerald-200 bg-emerald-50 text-emerald-700",
			)}
		>
			{toast.type === "error" ? (
				<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
			) : (
				<HiOutlineCheckCircle className="h-4 w-4 shrink-0" />
			)}
			{toast.message}
		</div>
	);
}

function SkeletonTable({ cols = 7 }) {
	return (
		<tbody>
			{Array.from({ length: 4 }).map((_, i) => (
				<tr key={i} className="border-t border-slate-100 animate-pulse">
					{Array.from({ length: cols }).map((__, j) => (
						<td key={j} className="px-4 py-4">
							<div className={cn("h-3.5 rounded-md bg-slate-200", j === 0 ? "w-6" : j === 1 ? "w-28" : "w-14")} />
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}

function OvernightBadge({ isOvernight }) {
	if (isOvernight) {
		return (
			<span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
				<HiOutlineMoon className="h-3 w-3" />
				Overnight
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
			<HiOutlineSun className="h-3 w-3" />
			Normal
		</span>
	);
}

// ─── Shift Form Modal ───────────────────────────────────────────────────────

const EMPTY_FORM = {
	shift_name: "",
	check_in_start: "",
	check_in_end: "",
	check_out_start: "",
	check_out_end: "",
	is_overnight: false,
};

function ShiftFormModal({ mode, item, tableLabel, onClose, onSave, busy }) {
	const initialForm = useMemo(
		() =>
			item
				? {
						shift_name: item.shift_name ?? "",
						check_in_start: formatTime(item.check_in_start),
						check_in_end: formatTime(item.check_in_end),
						check_out_start: formatTime(item.check_out_start),
						check_out_end: formatTime(item.check_out_end),
						is_overnight: Boolean(item.is_overnight),
				  }
				: EMPTY_FORM,
		[item],
	);
	const [form, setForm] = useState(initialForm);

	// Sync when modal opens with a new item
	const prevItemIdRef = useRef(null);
	const currentId = item?.id ?? null;
	if (prevItemIdRef.current !== currentId) {
		prevItemIdRef.current = currentId;
		if (form !== initialForm) setForm(initialForm);
	}

	if (!mode) return null;

	const isEdit = mode === "edit";
	const title = isEdit ? `Edit Shift ${tableLabel}` : `Tambah Shift ${tableLabel}`;

	const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

	const handleSubmit = (e) => {
		e.preventDefault();
		onSave(form);
	};

	const labelClass = "block text-xs font-semibold text-slate-500 mb-1";
	const inputClass =
		"w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
							<HiOutlineCog6Tooth className="h-5 w-5" />
						</div>
						<h2 className="text-base font-bold text-slate-800">{title}</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
						aria-label="Tutup"
					>
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
					<div>
						<label className={labelClass}>Nama Shift <span className="text-rose-500">*</span></label>
						<input
							type="text"
							required
							maxLength={50}
							className={inputClass}
							placeholder="Contoh: Pagi, Siang, Sore..."
							value={form.shift_name}
							onChange={(e) => handleChange("shift_name", e.target.value)}
							disabled={busy}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className={labelClass}>Check-in Mulai <span className="text-rose-500">*</span></label>
							<input
								type="time"
								required
								className={inputClass}
								value={form.check_in_start}
								onChange={(e) => handleChange("check_in_start", e.target.value)}
								disabled={busy}
							/>
						</div>
						<div>
							<label className={labelClass}>Check-in Sampai <span className="text-rose-500">*</span></label>
							<input
								type="time"
								required
								className={inputClass}
								value={form.check_in_end}
								onChange={(e) => handleChange("check_in_end", e.target.value)}
								disabled={busy}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className={labelClass}>Check-out Mulai <span className="text-rose-500">*</span></label>
							<input
								type="time"
								required
								className={inputClass}
								value={form.check_out_start}
								onChange={(e) => handleChange("check_out_start", e.target.value)}
								disabled={busy}
							/>
						</div>
						<div>
							<label className={labelClass}>Check-out Sampai <span className="text-rose-500">*</span></label>
							<input
								type="time"
								required
								className={inputClass}
								value={form.check_out_end}
								onChange={(e) => handleChange("check_out_end", e.target.value)}
								disabled={busy}
							/>
						</div>
					</div>

					<label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100 transition">
						<input
							type="checkbox"
							className="h-4 w-4 rounded accent-blue-600"
							checked={form.is_overnight}
							onChange={(e) => handleChange("is_overnight", e.target.checked)}
							disabled={busy}
						/>
						<div>
							<p className="text-sm font-semibold text-slate-700">Melewati Tengah Malam (Overnight)</p>
							<p className="text-xs text-slate-500">Centang jika checkout melewati pukul 00:00</p>
						</div>
					</label>

					<div className="flex justify-end gap-2 pt-1">
						<button
							type="button"
							onClick={onClose}
							disabled={busy}
							className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={busy}
							className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
						>
							{busy && <HiOutlineClock className="h-4 w-4 animate-spin" />}
							{isEdit ? "Simpan Perubahan" : "Tambah Shift"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── Delete Confirm Modal ────────────────────────────────────────────────────

function DeleteConfirmModal({ item, tableLabel, onClose, onConfirm, busy }) {
	if (!item) return null;
	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
					<HiOutlineTrash className="h-6 w-6" />
				</div>
				<h3 className="text-base font-bold text-slate-800">Hapus Shift?</h3>
				<p className="mt-1 text-sm text-slate-500">
					Shift <span className="font-semibold text-slate-700">{item.shift_name}</span> dari tabel{" "}
					<span className="font-semibold text-slate-700">{tableLabel}</span> akan dihapus permanen.
				</p>
				<div className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						disabled={busy}
						className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={busy}
						className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-2"
					>
						{busy && <HiOutlineClock className="h-4 w-4 animate-spin" />}
						Hapus
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Shift Table Section ────────────────────────────────────────────────────

function ShiftTableSection({ title, description, endpoint, color = "blue" }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [formModal, setFormModal] = useState({ mode: null, item: null });
	const [deleteModal, setDeleteModal] = useState(null);
	const [busy, setBusy] = useState(false);
	const [toast, setToast] = useState(null);

	const showToast = useCallback((message, type = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3500);
	}, []);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			setError("");
			const data = await api(endpoint);
			setRows(data.data ?? []);
		} catch (err) {
			setError(err.message || "Gagal mengambil data");
		} finally {
			setLoading(false);
		}
	}, [endpoint]);

	useEffect(() => { fetchData(); }, [fetchData]);

	const handleSave = async (form) => {
		setBusy(true);
		try {
			if (formModal.mode === "edit") {
				await api(`${endpoint}/${formModal.item.id}`, {
					method: "PUT",
					body: JSON.stringify(form),
				});
				showToast("Shift berhasil diperbarui");
			} else {
				await api(endpoint, {
					method: "POST",
					body: JSON.stringify(form),
				});
				showToast("Shift berhasil ditambahkan");
			}
			setFormModal({ mode: null, item: null });
			fetchData();
		} catch (err) {
			showToast(err.message || "Gagal menyimpan", "error");
		} finally {
			setBusy(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteModal) return;
		setBusy(true);
		try {
			await api(`${endpoint}/${deleteModal.id}`, { method: "DELETE" });
			showToast("Shift berhasil dihapus");
			setDeleteModal(null);
			fetchData();
		} catch (err) {
			showToast(err.message || "Gagal menghapus", "error");
		} finally {
			setBusy(false);
		}
	};

	const colorMap = {
		blue: {
			header: "bg-gradient-to-br from-blue-900 to-cyan-700",
			badge: "bg-blue-50 text-blue-700 border-blue-200",
			btn: "bg-blue-600 hover:bg-blue-700",
			dot: "bg-blue-500",
		},
		violet: {
			header: "bg-gradient-to-br from-violet-900 to-indigo-700",
			badge: "bg-violet-50 text-violet-700 border-violet-200",
			btn: "bg-violet-600 hover:bg-violet-700",
			dot: "bg-violet-500",
		},
	};
	const c = colorMap[color] ?? colorMap.blue;

	return (
		<>
			<Toast toast={toast} />

			<ShiftFormModal
				mode={formModal.mode}
				item={formModal.item}
				tableLabel={title}
				onClose={() => setFormModal({ mode: null, item: null })}
				onSave={handleSave}
				busy={busy}
			/>

			<DeleteConfirmModal
				item={deleteModal}
				tableLabel={title}
				onClose={() => setDeleteModal(null)}
				onConfirm={handleDelete}
				busy={busy}
			/>

			<section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
				{/* Section header */}
				<div className={cn("relative overflow-hidden p-5 sm:p-6", c.header)}>
					<div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
					<div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider mb-2", c.badge)}>
								<span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", c.dot)} />
								{rows.length} shift terdaftar
							</span>
							<h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
							<p className="text-sm text-white/70">{description}</p>
						</div>
						<button
							type="button"
							onClick={() => setFormModal({ mode: "add", item: null })}
							className={cn(
								"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition shrink-0",
								c.btn,
							)}
						>
							<HiOutlinePlus className="h-4 w-4" />
							Tambah Shift
						</button>
					</div>
				</div>

				{/* Error */}
				{error && (
					<div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
						{error}
						<button
							type="button"
							onClick={fetchData}
							className="ml-auto text-xs font-semibold underline hover:no-underline"
						>
							Coba lagi
						</button>
					</div>
				)}

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-slate-50 border-b border-slate-100">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">#</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nama Shift</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Check-in Mulai</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Check-in Sampai</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Check-out Mulai</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Check-out Sampai</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Overnight</th>
								<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
							</tr>
						</thead>
						{loading ? (
							<SkeletonTable cols={8} />
						) : rows.length === 0 ? (
							<tbody>
								<tr>
									<td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
										Belum ada data shift. Klik <span className="font-semibold">Tambah Shift</span> untuk mulai.
									</td>
								</tr>
							</tbody>
						) : (
							<tbody className="divide-y divide-slate-100">
								{rows.map((row, idx) => (
									<tr key={row.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-4 py-3.5 text-xs font-medium text-slate-400 tabular-nums">{idx + 1}</td>
										<td className="px-4 py-3.5 font-semibold text-slate-800">{row.shift_name}</td>
										<td className="px-4 py-3.5 tabular-nums text-slate-600">
											<span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-700">
												{formatTime(row.check_in_start)}
											</span>
										</td>
										<td className="px-4 py-3.5 tabular-nums text-slate-600">
											<span className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-mono font-semibold text-sky-700">
												{formatTime(row.check_in_end)}
											</span>
										</td>
										<td className="px-4 py-3.5 tabular-nums text-slate-600">
											<span className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-mono font-semibold text-orange-700">
												{formatTime(row.check_out_start)}
											</span>
										</td>
										<td className="px-4 py-3.5 tabular-nums text-slate-600">
											<span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-mono font-semibold text-rose-700">
												{formatTime(row.check_out_end)}
											</span>
										</td>
										<td className="px-4 py-3.5">
											<OvernightBadge isOvernight={row.is_overnight} />
										</td>
										<td className="px-4 py-3.5 text-right">
											<div className="inline-flex items-center gap-1.5">
												<button
													type="button"
													onClick={() => setFormModal({ mode: "edit", item: row })}
													className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
													title="Edit shift"
												>
													<HiOutlinePencilSquare className="h-3.5 w-3.5" />
													Edit
												</button>
												<button
													type="button"
													onClick={() => setDeleteModal(row)}
													className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 transition"
													title="Hapus shift"
												>
													<HiOutlineTrash className="h-3.5 w-3.5" />
													Hapus
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						)}
					</table>
				</div>
			</section>
		</>
	);
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MasterAbsensi() {
	useEffect(() => {
		document.title = "Master Absensi IKM | Alora Group Indonesia";
	}, []);

	return (
		<main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
			<div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-8">

				{/* ── Page Header ──────────────────────────────────────────── */}
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 p-5 shadow-sm sm:p-6">
					<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
					<div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-slate-400/10 blur-3xl" />
					<div className="relative">
						<div className="flex items-center gap-3 mb-4">
							<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
								<HiOutlineCog6Tooth className="h-5 w-5 text-white" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-white sm:text-2xl">Master Absensi IKM</h1>
								<p className="text-sm text-white/70">Kelola data shift karyawan Normal dan Valet</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
								Shift Normal
							</div>
							<div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
								<span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
								Shift Valet
							</div>
						</div>
					</div>
				</section>

				{/* ── Shift Normal Table ───────────────────────────────────── */}
				<ShiftTableSection
					title="Karyawan Shift Normal"
					description="Data shift untuk karyawan reguler"
					endpoint="/ikm/master-absensi/shifts-normal"
					color="blue"
				/>

				{/* ── Shift Valet Table ────────────────────────────────────── */}
				<ShiftTableSection
					title="Karyawan Valet"
					description="Data shift untuk karyawan valet"
					endpoint="/ikm/master-absensi/shifts-valet"
					color="violet"
				/>
			</div>
		</main>
	);
}
