import { useCallback, useEffect, useMemo, useState } from "react";
import {
	HiOutlineCalendarDays,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineExclamationTriangle,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

const LIMIT_OPTIONS = [20, 50, 100];

function cn(...parts) {
	return parts.filter(Boolean).join(" ");
}

function generatePages(current, total) {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages = [1];
	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);
	if (start > 2) pages.push("...");
	for (let i = start; i <= end; i += 1) pages.push(i);
	if (end < total - 1) pages.push("...");
	pages.push(total);
	return pages;
}

function hoursLabel(value) {
	return `${Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jam`;
}

const MODAL_META = {
	annual: {
		title: "Set Saldo Cuti",
		unit: "hari",
		field: "days",
		currentKey: (row) => row.annual_leave?.balance_days,
	},
	overtime: {
		title: "Set Saldo Lembur",
		unit: "jam",
		field: "hours",
		currentKey: (row) => row.overtime_hours,
	},
	replace_off: {
		title: "Set Saldo RO",
		unit: "jam",
		field: "hours",
		currentKey: (row) => row.replace_off_hours,
	},
};

export default function AnnualLeaveAlora() {
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [items, setItems] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [modal, setModal] = useState(null);
	const [formValue, setFormValue] = useState("");
	const [formNote, setFormNote] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		document.title = "Saldo Karyawan | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(searchInput.trim());
			setPagination((prev) => ({ ...prev, page: 1 }));
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	const load = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const qs = new URLSearchParams({
				page: String(pagination.page),
				limit: String(pagination.limit),
			});
			if (search) qs.set("search", search);
			const response = await api(`/alora/employee-balances?${qs.toString()}`);
			setItems(Array.isArray(response.items) ? response.items : []);
			setPagination((prev) => ({
				...prev,
				total: response.pagination?.total ?? 0,
				totalPages: response.pagination?.totalPages ?? 1,
				page: response.pagination?.page ?? prev.page,
				limit: response.pagination?.limit ?? prev.limit,
			}));
		} catch (err) {
			setError(err.message || "Gagal memuat saldo karyawan");
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [pagination.page, pagination.limit, search]);

	useEffect(() => {
		load();
	}, [load]);

	const pages = useMemo(
		() => generatePages(pagination.page, pagination.totalPages),
		[pagination.page, pagination.totalPages]
	);
	const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
	const to = Math.min(pagination.page * pagination.limit, pagination.total);

	const openModal = (type, employee) => {
		const meta = MODAL_META[type];
		if (!meta) return;
		setError("");
		setModal({ type, employee });
		setFormValue(String(meta.currentKey(employee) ?? 0));
		setFormNote("");
	};

	const closeModal = () => {
		if (saving) return;
		setModal(null);
		setFormValue("");
		setFormNote("");
	};

	const handleSave = async (e) => {
		e.preventDefault();
		if (!modal) return;
		const note = formNote.trim();
		if (note.length < 3) {
			setError("Catatan wajib diisi minimal 3 karakter");
			return;
		}
		const value = Number(formValue);
		if (!Number.isFinite(value) || value < 0) {
			setError("Nilai tidak valid");
			return;
		}

		const { type, employee } = modal;
		const employeeId = employee.employee_id;
		let path = "";
		let body = { note };
		if (type === "annual") {
			path = `/alora/employee-balances/${employeeId}/annual-leave`;
			body.days = value;
		} else if (type === "overtime") {
			path = `/alora/employee-balances/${employeeId}/overtime`;
			body.hours = value;
		} else {
			path = `/alora/employee-balances/${employeeId}/replace-off`;
			body.hours = value;
		}

		setSaving(true);
		setError("");
		try {
			await api(path, { method: "PUT", body: JSON.stringify(body) });
			setModal(null);
			setFormValue("");
			setFormNote("");
			await load();
		} catch (err) {
			setError(err.message || "Gagal menyimpan saldo");
		} finally {
			setSaving(false);
		}
	};

	const handlePage = (page) => {
		if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
		setPagination((prev) => ({ ...prev, page }));
	};

	const handleLimitChange = (limit) => {
		setPagination((prev) => ({ ...prev, limit, page: 1 }));
	};

	const modalMeta = modal ? MODAL_META[modal.type] : null;

	return (
		<div className="space-y-5 p-4 sm:p-6">
			<div>
				<div className="mb-1 inline-flex items-center gap-2 text-emerald-600">
					<HiOutlineCalendarDays className="h-5 w-5" />
					<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
				</div>
				<h1 className="text-xl font-black text-slate-800">Saldo Cuti, Lembur & RO</h1>
				<p className="mt-1 text-sm text-slate-500">
					Daftar saldo karyawan. Set angka cuti, lembur, atau RO dari aksi per baris.
				</p>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
					{error}
				</div>
			)}

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
					Cari karyawan
				</label>
				<input
					type="text"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					placeholder="Nama, kode, atau ID karyawan…"
					className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
				/>
			</section>

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
					<h2 className="text-base font-bold text-slate-800">Daftar Karyawan</h2>
					<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
						{pagination.total.toLocaleString("id-ID")} data
					</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-sm">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
									Karyawan
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
									Kode
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
									Departemen
								</th>
								<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
									Saldo Cuti
								</th>
								<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
									Saldo Lembur
								</th>
								<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
									Saldo RO
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{loading ? (
								<tr>
									<td colSpan={7} className="px-4 py-10 text-center text-slate-400">
										Memuat…
									</td>
								</tr>
							) : items.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-10 text-center text-slate-400">
										Tidak ada karyawan.
									</td>
								</tr>
							) : (
								items.map((row) => (
									<tr key={row.employee_id} className="hover:bg-slate-50/60">
										<td className="px-4 py-3 font-semibold text-slate-800">{row.full_name}</td>
										<td className="px-4 py-3 text-slate-600">{row.employee_code || "—"}</td>
										<td className="px-4 py-3 text-slate-600">{row.department_name || "—"}</td>
										<td className="px-4 py-3 text-center font-semibold text-emerald-700">
											{row.annual_leave?.eligible
												? `${Number(row.annual_leave.balance_days || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })} hari`
												: "Belum berhak"}
										</td>
										<td className="px-4 py-3 text-center font-semibold text-violet-700">
											{hoursLabel(row.overtime_hours)}
										</td>
										<td className="px-4 py-3 text-center font-semibold text-sky-700">
											{hoursLabel(row.replace_off_hours)}
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap gap-1.5">
												<button
													type="button"
													disabled={!row.annual_leave?.eligible}
													onClick={() => openModal("annual", row)}
													className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 disabled:opacity-40"
												>
													Cuti
												</button>
												<button
													type="button"
													onClick={() => openModal("overtime", row)}
													className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700"
												>
													Lembur
												</button>
												<button
													type="button"
													onClick={() => openModal("replace_off", row)}
													className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700"
												>
													RO
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<span className="text-slate-500">
							{pagination.total > 0 ? (
								<>
									Menampilkan <strong className="text-slate-700">{from}-{to}</strong> dari{" "}
									<strong className="text-slate-700">{pagination.total.toLocaleString("id-ID")}</strong> data
								</>
							) : (
								"Tidak ada data"
							)}
						</span>
						<label className="flex items-center gap-1.5 text-xs text-slate-400">
							Tampil:
							<select
								value={pagination.limit}
								onChange={(e) => handleLimitChange(Number(e.target.value))}
								disabled={loading}
								className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 disabled:opacity-60"
							>
								{LIMIT_OPTIONS.map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						</label>
					</div>

					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => handlePage(1)}
							disabled={pagination.page <= 1 || loading}
							className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							{"<<"}
						</button>
						<button
							type="button"
							onClick={() => handlePage(pagination.page - 1)}
							disabled={pagination.page <= 1 || loading}
							className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							<HiOutlineChevronLeft className="h-3.5 w-3.5" />
						</button>
						{pages.map((p, i) =>
							p === "..." ? (
								<span key={`el-${i}`} className="flex h-7 w-6 items-center justify-center text-xs text-slate-400">
									...
								</span>
							) : (
								<button
									key={p}
									type="button"
									onClick={() => handlePage(p)}
									disabled={loading}
									className={cn(
										"flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed",
										p === pagination.page
											? "border-blue-500 bg-blue-600 text-white shadow-sm"
											: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
									)}
								>
									{p}
								</button>
							)
						)}
						<button
							type="button"
							onClick={() => handlePage(pagination.page + 1)}
							disabled={pagination.page >= pagination.totalPages || loading}
							className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							<HiOutlineChevronRight className="h-3.5 w-3.5" />
						</button>
						<button
							type="button"
							onClick={() => handlePage(pagination.totalPages)}
							disabled={pagination.page >= pagination.totalPages || loading}
							className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
						>
							{">>"}
						</button>
					</div>
				</div>
			</section>

			{modal && modalMeta ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
						<div className="mb-4 flex items-start justify-between gap-3">
							<div>
								<h3 className="text-base font-bold text-slate-800">{modalMeta.title}</h3>
								<p className="mt-0.5 text-sm text-slate-500">
									{modal.employee.full_name} ({modal.employee.employee_code || modal.employee.employee_id})
								</p>
							</div>
							<button type="button" onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
								<HiOutlineXMark className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleSave} className="space-y-3">
							<div>
								<label className="block text-xs font-semibold text-slate-500 mb-1">Nilai saat ini</label>
								<p className="text-sm font-bold text-slate-800">
									{Number(modalMeta.currentKey(modal.employee) || 0).toLocaleString("id-ID", {
										maximumFractionDigits: 2,
									})}{" "}
									{modalMeta.unit}
								</p>
							</div>
							<div>
								<label className="block text-xs font-semibold text-slate-500 mb-1">
									Set ke ({modalMeta.unit})
								</label>
								<input
									type="number"
									min="0"
									step={modal.type === "annual" ? "0.5" : "0.01"}
									value={formValue}
									onChange={(e) => setFormValue(e.target.value)}
									required
									className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-slate-500 mb-1">Catatan</label>
								<input
									type="text"
									value={formNote}
									onChange={(e) => setFormNote(e.target.value)}
									placeholder="Minimal 3 karakter"
									required
									className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
								/>
							</div>
							<div className="flex gap-2 pt-1">
								<button
									type="button"
									onClick={closeModal}
									disabled={saving}
									className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-60"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={saving}
									className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
								>
									{saving ? "Menyimpan…" : "Simpan"}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</div>
	);
}
