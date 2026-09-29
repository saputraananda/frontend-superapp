import { useCallback, useEffect, useMemo, useState } from "react";
import {
	HiOutlineBanknotes,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineExclamationTriangle,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api, apiUpload, BASE_URL } from "../../../lib/api";

const LIMIT_OPTIONS = [20, 50, 100];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MONTH_NAMES = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
];

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

function formatMonthLabel(value) {
	const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
	if (!match) return "—";
	const monthIndex = Number(match[2]) - 1;
	return `${MONTH_NAMES[monthIndex] || match[2]} ${match[1]}`;
}

function formatDateTime(value) {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleString("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function PayslipAlora() {
	const now = new Date();
	const currentYear = now.getFullYear();

	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [items, setItems] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [modalEmployee, setModalEmployee] = useState(null);
	const [payslips, setPayslips] = useState([]);
	const [payslipsLoading, setPayslipsLoading] = useState(false);
	const [modalError, setModalError] = useState("");
	const [modalMessage, setModalMessage] = useState("");
	const [uploadMonth, setUploadMonth] = useState(now.getMonth() + 1);
	const [uploadYear, setUploadYear] = useState(currentYear);
	const [uploadFile, setUploadFile] = useState(null);
	const [fileInputKey, setFileInputKey] = useState(0);
	const [saving, setSaving] = useState(false);
	const [busyPayslipId, setBusyPayslipId] = useState(null);
	const [editingSlip, setEditingSlip] = useState(null);

	const editingYear = editingSlip ? Number(String(editingSlip.payslip_month).slice(0, 4)) : null;
	const yearOptions = [
		...new Set([
			currentYear - 2,
			currentYear - 1,
			currentYear,
			currentYear + 1,
			...(Number.isInteger(editingYear) ? [editingYear] : []),
		]),
	].sort((a, b) => a - b);

	useEffect(() => {
		document.title = "Slip Gaji | Alora Group Indonesia";
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
			const response = await api(`/alora/payslips?${qs.toString()}`);
			setItems(Array.isArray(response.items) ? response.items : []);
			setPagination((prev) => ({
				...prev,
				total: response.pagination?.total ?? 0,
				totalPages: response.pagination?.totalPages ?? 1,
				page: response.pagination?.page ?? prev.page,
				limit: response.pagination?.limit ?? prev.limit,
			}));
		} catch (err) {
			setError(err.message || "Gagal memuat daftar karyawan");
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [pagination.page, pagination.limit, search]);

	useEffect(() => {
		load();
	}, [load]);

	const loadPayslips = useCallback(async (employeeId) => {
		setPayslipsLoading(true);
		try {
			const response = await api(`/alora/payslips/${employeeId}`);
			setPayslips(Array.isArray(response.items) ? response.items : []);
		} catch (err) {
			setModalError(err.message || "Gagal memuat slip gaji");
			setPayslips([]);
		} finally {
			setPayslipsLoading(false);
		}
	}, []);

	const pages = useMemo(
		() => generatePages(pagination.page, pagination.totalPages),
		[pagination.page, pagination.totalPages]
	);
	const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
	const to = Math.min(pagination.page * pagination.limit, pagination.total);

	const selectedMonthKey = `${uploadYear}-${String(uploadMonth).padStart(2, "0")}`;
	const selectedMonthExists = payslips.some(
		(slip) => slip.payslip_month === selectedMonthKey && slip.id !== editingSlip?.id
	);

	const resetUploadForm = () => {
		setUploadMonth(now.getMonth() + 1);
		setUploadYear(currentYear);
		setUploadFile(null);
		setFileInputKey((k) => k + 1);
		setEditingSlip(null);
	};

	const openModal = (employee) => {
		setModalEmployee(employee);
		setModalError("");
		setModalMessage("");
		resetUploadForm();
		setPayslips([]);
		loadPayslips(employee.employee_id);
	};

	const closeModal = () => {
		if (saving) return;
		setModalEmployee(null);
		setPayslips([]);
		setUploadFile(null);
		setEditingSlip(null);
		setModalError("");
		setModalMessage("");
	};

	const startEdit = (slip) => {
		const match = /^(\d{4})-(\d{2})$/.exec(String(slip.payslip_month || ""));
		setEditingSlip(slip);
		if (match) {
			setUploadYear(Number(match[1]));
			setUploadMonth(Number(match[2]));
		}
		setUploadFile(null);
		setFileInputKey((k) => k + 1);
		setModalError("");
		setModalMessage("");
	};

	const handleFileChange = (e) => {
		const file = e.target.files?.[0] || null;
		setModalError("");
		setModalMessage("");
		if (!file) {
			setUploadFile(null);
			return;
		}
		if (!file.name.toLowerCase().endsWith(".pdf")) {
			setModalError("File harus berformat PDF");
			setUploadFile(null);
			setFileInputKey((k) => k + 1);
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			setModalError("Ukuran file maksimal 10 MB");
			setUploadFile(null);
			setFileInputKey((k) => k + 1);
			return;
		}
		setUploadFile(file);
	};

	const handleUpload = async (e) => {
		e.preventDefault();
		if (!modalEmployee) return;

		if (editingSlip) {
			if (!uploadFile && selectedMonthKey === editingSlip.payslip_month) {
				setModalError("Tidak ada perubahan");
				return;
			}
			const body = new FormData();
			if (uploadFile) body.append("file", uploadFile);
			body.append("month", String(uploadMonth));
			body.append("year", String(uploadYear));

			setSaving(true);
			setModalError("");
			setModalMessage("");
			try {
				const response = await apiUpload(
					`/alora/payslips/${modalEmployee.employee_id}/${editingSlip.id}`,
					{ method: "PUT", body }
				);
				setModalMessage(`Slip gaji diperbarui (${formatMonthLabel(response.payslip_month)})`);
				resetUploadForm();
				await Promise.all([loadPayslips(modalEmployee.employee_id), load()]);
			} catch (err) {
				setModalError(err.message || "Gagal memperbarui slip gaji");
			} finally {
				setSaving(false);
			}
			return;
		}

		if (!uploadFile) {
			setModalError("Pilih file PDF terlebih dahulu");
			return;
		}
		const body = new FormData();
		body.append("file", uploadFile);
		body.append("month", String(uploadMonth));
		body.append("year", String(uploadYear));

		setSaving(true);
		setModalError("");
		setModalMessage("");
		try {
			const response = await apiUpload(`/alora/payslips/${modalEmployee.employee_id}`, {
				method: "POST",
				body,
			});
			setModalMessage(`${response.message || "Slip gaji tersimpan"} (${formatMonthLabel(response.payslip_month)})`);
			setUploadFile(null);
			setFileInputKey((k) => k + 1);
			await Promise.all([loadPayslips(modalEmployee.employee_id), load()]);
		} catch (err) {
			setModalError(err.message || "Gagal mengupload slip gaji");
		} finally {
			setSaving(false);
		}
	};

	const handleView = async (slip) => {
		if (!modalEmployee) return;
		setBusyPayslipId(slip.id);
		setModalError("");
		try {
			const res = await fetch(
				`${BASE_URL}/alora/payslips/${modalEmployee.employee_id}/${slip.id}/view`,
				{ credentials: "include" }
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Gagal membuka slip gaji");
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			window.open(url, "_blank", "noopener");
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch (err) {
			setModalError(err.message || "Gagal membuka slip gaji");
		} finally {
			setBusyPayslipId(null);
		}
	};

	const handleDelete = async (slip) => {
		if (!modalEmployee) return;
		if (!window.confirm(`Hapus slip ${formatMonthLabel(slip.payslip_month)}?`)) return;
		setBusyPayslipId(slip.id);
		setModalError("");
		setModalMessage("");
		try {
			await api(`/alora/payslips/${modalEmployee.employee_id}/${slip.id}`, { method: "DELETE" });
			if (editingSlip?.id === slip.id) resetUploadForm();
			await Promise.all([loadPayslips(modalEmployee.employee_id), load()]);
		} catch (err) {
			setModalError(err.message || "Gagal menghapus slip gaji");
		} finally {
			setBusyPayslipId(null);
		}
	};

	const handlePage = (page) => {
		if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
		setPagination((prev) => ({ ...prev, page }));
	};

	const handleLimitChange = (limit) => {
		setPagination((prev) => ({ ...prev, limit, page: 1 }));
	};

	return (
		<div className="space-y-5 p-4 sm:p-6">
			<div>
				<div className="mb-1 inline-flex items-center gap-2 text-emerald-600">
					<HiOutlineBanknotes className="h-5 w-5" />
					<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
				</div>
				<h1 className="text-xl font-black text-slate-800">Slip Gaji Karyawan</h1>
				<p className="mt-1 text-sm text-slate-500">
					Karyawan aktif. Klik nama untuk upload slip gaji PDF per bulan.
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
									Jumlah Slip
								</th>
								<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
									Slip Terakhir
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{loading ? (
								<tr>
									<td colSpan={6} className="px-4 py-10 text-center text-slate-400">
										Memuat…
									</td>
								</tr>
							) : items.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-10 text-center text-slate-400">
										Tidak ada karyawan aktif.
									</td>
								</tr>
							) : (
								items.map((row) => (
									<tr
										key={row.employee_id}
										onClick={() => openModal(row)}
										className="cursor-pointer hover:bg-slate-50/60"
									>
										<td className="px-4 py-3 font-semibold text-slate-800">{row.full_name}</td>
										<td className="px-4 py-3 text-slate-600">{row.employee_code || "—"}</td>
										<td className="px-4 py-3 text-slate-600">{row.department_name || "—"}</td>
										<td className="px-4 py-3 text-center font-semibold text-slate-700">
											{row.payslip_count}
										</td>
										<td className="px-4 py-3 text-center text-slate-600">
											{row.latest_payslip_month ? formatMonthLabel(row.latest_payslip_month) : "—"}
										</td>
										<td className="px-4 py-3">
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													openModal(row);
												}}
												className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
											>
												Kelola
											</button>
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

			{modalEmployee ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
						<div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
							<div>
								<h3 className="text-base font-bold text-slate-800">Slip Gaji</h3>
								<p className="mt-0.5 text-sm text-slate-500">
									{modalEmployee.full_name} ({modalEmployee.employee_code || modalEmployee.employee_id})
								</p>
							</div>
							<button type="button" onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
								<HiOutlineXMark className="h-5 w-5" />
							</button>
						</div>

						<div className="space-y-5 overflow-y-auto p-5">
							{modalError && (
								<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
									<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
									{modalError}
								</div>
							)}
							{modalMessage && (
								<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
									{modalMessage}
								</div>
							)}

							<form onSubmit={handleUpload} className="space-y-3">
								{editingSlip && (
									<div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
										<p className="text-sm font-semibold text-amber-800">
											Edit slip {formatMonthLabel(editingSlip.payslip_month)}
										</p>
										<button
											type="button"
											onClick={resetUploadForm}
											disabled={saving}
											className="text-xs font-semibold text-amber-700 underline disabled:opacity-60"
										>
											Batal edit
										</button>
									</div>
								)}
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">Bulan</label>
										<select
											value={uploadMonth}
											onChange={(e) => setUploadMonth(Number(e.target.value))}
											className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
										>
											{MONTH_NAMES.map((name, idx) => (
												<option key={name} value={idx + 1}>
													{name}
												</option>
											))}
										</select>
									</div>
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">Tahun</label>
										<select
											value={uploadYear}
											onChange={(e) => setUploadYear(Number(e.target.value))}
											className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
										>
											{yearOptions.map((y) => (
												<option key={y} value={y}>
													{y}
												</option>
											))}
										</select>
									</div>
								</div>
								<div>
									<label className="block text-xs font-semibold text-slate-500 mb-1">
										{editingSlip ? "File PDF baru (opsional, maks 10 MB)" : "File PDF (maks 10 MB)"}
									</label>
									<input
										key={fileInputKey}
										type="file"
										accept="application/pdf"
										onChange={handleFileChange}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
									/>
								</div>
								{selectedMonthExists && (
									<p className="text-xs text-amber-700">
										{editingSlip
											? `Slip ${formatMonthLabel(selectedMonthKey)} sudah ada. Pilih bulan lain atau hapus slip tersebut dulu.`
											: `Slip ${formatMonthLabel(selectedMonthKey)} sudah ada. Upload akan mengganti file lama.`}
									</p>
								)}
								{editingSlip ? (
									<button
										type="submit"
										disabled={saving || selectedMonthExists}
										className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
									>
										{saving ? "Menyimpan…" : "Simpan Perubahan"}
									</button>
								) : (
									<button
										type="submit"
										disabled={saving || !uploadFile}
										className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
									>
										{saving ? "Mengupload…" : "Upload"}
									</button>
								)}
							</form>

							<div>
								<h4 className="mb-2 text-sm font-bold text-slate-700">Slip yang sudah diupload</h4>
								{payslipsLoading ? (
									<p className="text-sm text-slate-400">Memuat…</p>
								) : payslips.length === 0 ? (
									<p className="text-sm text-slate-400">Belum ada slip gaji.</p>
								) : (
									<ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
										{payslips.map((slip) => (
											<li
												key={slip.id}
												className={cn(
													"flex items-center justify-between gap-3 px-3 py-2.5",
													editingSlip?.id === slip.id && "bg-amber-50/50"
												)}
											>
												<div className="min-w-0">
													<p className="text-sm font-semibold text-slate-800">
														{formatMonthLabel(slip.payslip_month)}
													</p>
													<p className="truncate text-xs text-slate-500">{slip.file_name}</p>
													<p className="text-[11px] text-slate-400">
														Diupload {formatDateTime(slip.updated_at || slip.created_at)}
													</p>
												</div>
												<div className="flex shrink-0 gap-1.5">
													<button
														type="button"
														onClick={() => handleView(slip)}
														disabled={busyPayslipId === slip.id}
														className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 disabled:opacity-40"
													>
														Lihat
													</button>
													<button
														type="button"
														onClick={() => startEdit(slip)}
														disabled={busyPayslipId === slip.id || saving}
														className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 disabled:opacity-40"
													>
														Edit
													</button>
													<button
														type="button"
														onClick={() => handleDelete(slip)}
														disabled={busyPayslipId === slip.id}
														className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 disabled:opacity-40"
													>
														Hapus
													</button>
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
