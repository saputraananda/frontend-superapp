import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlineCalendarDays,
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineExclamationTriangle,
	HiOutlineMagnifyingGlass,
	HiOutlinePlus,
	HiOutlineTrash,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function getCurrentUserDisplayName() {
	try {
		const raw = localStorage.getItem("user");
		if (!raw) return "";
		const parsed = JSON.parse(raw);
		const userData = parsed?.user ?? parsed;
		return String(
			userData?.employee?.full_name || userData?.name || userData?.username || ""
		)
			.trim()
			.slice(0, 255);
	} catch {
		return "";
	}
}

function formatDateOnly(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function toDateInput(date) {
	const d = new Date(date);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getCutoffRange(cutoffMonth, cutoffYear) {
	const start = new Date(cutoffYear, cutoffMonth - 2, 26);
	const end = new Date(cutoffYear, cutoffMonth - 1, 25);
	return { startDate: toDateInput(start), endDate: toDateInput(end) };
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
	return { cutoffMonth, cutoffYear, ...getCutoffRange(cutoffMonth, cutoffYear) };
}

const PERIOD_MONTHS = [
	{ value: 1, label: "Januari" }, { value: 2, label: "Februari" },
	{ value: 3, label: "Maret" }, { value: 4, label: "April" },
	{ value: 5, label: "Mei" }, { value: 6, label: "Juni" },
	{ value: 7, label: "Juli" }, { value: 8, label: "Agustus" },
	{ value: 9, label: "September" }, { value: 10, label: "Oktober" },
	{ value: 11, label: "November" }, { value: 12, label: "Desember" },
];

function generatePages(current, total) {
	if (total <= 1) return [1];
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
	if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "...", current - 1, current, current + 1, "...", total];
}

function AddLiburModal({ employeeOptions, onClose, onSaved }) {
	const todayVal = toDateInput(new Date());
	const [employeeId, setEmployeeId] = useState("");
	const [startDate, setStartDate] = useState(todayVal);
	const [endDate, setEndDate] = useState("");
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [empSearch, setEmpSearch] = useState("");
	const [empDropOpen, setEmpDropOpen] = useState(false);
	const empDropRef = useRef(null);

	const filteredEmps = useMemo(() => {
		const kw = empSearch.trim().toLowerCase();
		if (!kw) return employeeOptions;
		return employeeOptions.filter(
			(e) =>
				String(e.employee_name || "").toLowerCase().includes(kw) ||
				String(e.employee_code || "").toLowerCase().includes(kw) ||
				String(e.employee_id || "").includes(kw),
		);
	}, [employeeOptions, empSearch]);

	const selectedEmp = useMemo(
		() => employeeOptions.find((e) => String(e.employee_id) === String(employeeId)) || null,
		[employeeOptions, employeeId],
	);

	useEffect(() => {
		if (!empDropOpen) return undefined;
		const onDown = (e) => {
			if (empDropRef.current && !empDropRef.current.contains(e.target)) setEmpDropOpen(false);
		};
		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, [empDropOpen]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		if (!employeeId) {
			setError("Pilih karyawan terlebih dahulu");
			return;
		}
		if (!startDate) {
			setError("Tanggal mulai wajib diisi");
			return;
		}
		if (endDate && endDate < startDate) {
			setError("Tanggal selesai tidak boleh sebelum tanggal mulai");
			return;
		}

		try {
			setSaving(true);
			await api("/cleanox/off-days", {
				method: "POST",
				body: JSON.stringify({
					worker_id: Number(employeeId),
					start_date: startDate,
					end_date: endDate || startDate,
					note: note.trim() || null,
					created_by_name: getCurrentUserDisplayName(),
				}),
			});
			onSaved();
		} catch (err) {
			const conflictDates = err?.data?.conflict_dates;
			if (Array.isArray(conflictDates) && conflictDates.length > 0) {
				setError(`${err.message || "Gagal"} (${conflictDates.join(", ")})`);
			} else {
				setError(err.message || "Gagal menambahkan libur");
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<div>
						<h3 className="text-base font-bold text-slate-800">Tambah Libur Karyawan</h3>
						<p className="text-xs text-slate-400">Plot hari off — karyawan tidak perlu absensi</p>
					</div>
					<button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
						<HiOutlineXMark className="h-4 w-4" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
					<div ref={empDropRef} className="relative">
						<label className="mb-1 block text-xs font-semibold text-slate-500">Karyawan</label>
						<button
							type="button"
							onClick={() => setEmpDropOpen((v) => !v)}
							className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm"
						>
							<span className={selectedEmp ? "text-slate-800" : "text-slate-400"}>
								{selectedEmp
									? `${selectedEmp.employee_name}${selectedEmp.employee_code ? ` (${selectedEmp.employee_code})` : ""}`
									: "Pilih karyawan..."}
							</span>
							<HiOutlineChevronDown className="h-4 w-4 text-slate-400" />
						</button>
						{empDropOpen && (
							<div className="absolute z-20 mt-1 max-h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
								<div className="border-b border-slate-100 p-2">
									<input
										type="text"
										value={empSearch}
										onChange={(e) => setEmpSearch(e.target.value)}
										placeholder="Cari nama / kode..."
										className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
									/>
								</div>
								<div className="max-h-40 overflow-y-auto">
									{filteredEmps.length === 0 ? (
										<p className="px-3 py-4 text-center text-xs text-slate-400">Tidak ada karyawan</p>
									) : (
										filteredEmps.map((emp) => (
											<button
												key={emp.employee_id}
												type="button"
												onClick={() => {
													setEmployeeId(String(emp.employee_id));
													setEmpDropOpen(false);
													setEmpSearch("");
												}}
												className="block w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50"
											>
												<span className="font-semibold text-slate-800">{emp.employee_name}</span>
												{emp.employee_code && (
													<span className="ml-1 text-xs text-slate-400">({emp.employee_code})</span>
												)}
											</button>
										))
									)}
								</div>
							</div>
						)}
					</div>

					<div className="grid grid-cols-2 gap-3">
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
								required
							/>
						</label>
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Selesai</span>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								min={startDate}
								className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
							/>
							<span className="mt-1 block text-[10px] text-slate-400">Kosongkan jika libur 1 hari</span>
						</label>
					</div>

					<label className="block text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Catatan (opsional)</span>
						<textarea
							rows={2}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							maxLength={500}
							placeholder="Contoh: Libur mingguan"
							className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
						/>
					</label>

					{error && (
						<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
							<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							{error}
						</div>
					)}

					<div className="flex justify-end gap-2 pb-1">
						<button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
							Batal
						</button>
						<button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b3459] px-5 py-2 text-sm font-semibold text-white hover:bg-[#163049] disabled:opacity-60">
							<HiOutlinePlus className="h-4 w-4" />
							{saving ? "Menyimpan..." : "Simpan Libur"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function ConfirmDeleteModal({ item, onClose, onConfirm, busy }) {
	if (!item) return null;
	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<h3 className="text-base font-bold text-slate-800">Hapus Libur?</h3>
				<p className="mt-2 text-sm text-slate-500">
					<b>{item.employee_name}</b> — {formatDateOnly(item.off_date)}
				</p>
				<div className="mt-5 flex justify-end gap-2">
					<button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
						Batal
					</button>
					<button type="button" onClick={onConfirm} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
						<HiOutlineTrash className="h-4 w-4" />
						{busy ? "Menghapus..." : "Hapus"}
					</button>
				</div>
			</div>
		</div>
	);
}

export default function LiburKaryawanCleanox() {
	const defaultCutoff = useMemo(() => getDefaultCutoff(), []);
	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, i) => base - 3 + i);
	}, []);

	const [records, setRecords] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, limit: 50 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const cutoffRange = useMemo(() => getCutoffRange(cutoffMonth, cutoffYear), [cutoffMonth, cutoffYear]);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [employeeOptions, setEmployeeOptions] = useState([]);
	const [addOpen, setAddOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [toast, setToast] = useState(null);
	const fetchInFlight = useRef(false);

	const showToast = useCallback((message, type = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3500);
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const response = await api("/cleanox/attendance/employees");
				if (!cancelled) {
					const options = (response.data || []).map((row) => ({
						employee_id: Number(row.employee_id),
						employee_code: row.employee_code || null,
						employee_name: row.full_name || `ID ${row.employee_id}`,
					}));
					setEmployeeOptions(options);
				}
			} catch {
				if (!cancelled) setEmployeeOptions([]);
			}
		})();
		return () => { cancelled = true; };
	}, []);

	const fetchOffDays = useCallback(async () => {
		if (fetchInFlight.current) return;
		fetchInFlight.current = true;
		setLoading(true);
		setError("");
		try {
			const qs = new URLSearchParams();
			qs.set("page", String(pagination.page));
			qs.set("limit", String(pagination.limit));
			qs.set("startDate", cutoffRange.startDate);
			qs.set("endDate", cutoffRange.endDate);
			if (search) qs.set("search", search);

			const data = await api(`/cleanox/off-days?${qs.toString()}`);
			setRecords(data.records ?? []);
			setPagination((prev) => ({
				...prev,
				total: data.pagination?.total ?? 0,
				totalPages: data.pagination?.totalPages ?? 1,
			}));
		} catch (err) {
			setError(err.message || "Gagal mengambil data libur");
		} finally {
			fetchInFlight.current = false;
			setLoading(false);
		}
	}, [pagination.page, pagination.limit, cutoffRange.startDate, cutoffRange.endDate, search]);

	useEffect(() => {
		fetchOffDays();
	}, [fetchOffDays]);

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setDeleteBusy(true);
		try {
			await api(`/cleanox/off-days/${deleteTarget.id}`, { method: "DELETE" });
			showToast("Libur berhasil dihapus");
			setDeleteTarget(null);
			fetchOffDays();
		} catch (err) {
			showToast(err.message || "Gagal menghapus", "error");
		} finally {
			setDeleteBusy(false);
		}
	};

	const pages = generatePages(pagination.page, pagination.totalPages);
	const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
	const to = Math.min(pagination.page * pagination.limit, pagination.total);

	return (
		<>
			{toast && (
				<div
					className={cn(
						"fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl",
						toast.type === "error"
							? "border-rose-200 bg-rose-50 text-rose-700"
							: "border-emerald-200 bg-emerald-50 text-emerald-700",
					)}
				>
					{toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
					{toast.message}
				</div>
			)}

			{addOpen && (
				<AddLiburModal
					employeeOptions={employeeOptions}
					onClose={() => setAddOpen(false)}
					onSaved={() => {
						setAddOpen(false);
						showToast("Libur karyawan berhasil dicatat");
						fetchOffDays();
					}}
				/>
			)}

			<ConfirmDeleteModal
				item={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={handleDelete}
				busy={deleteBusy}
			/>

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-base font-bold text-slate-800">Libur Karyawan</h2>
						<p className="text-xs text-slate-500">Hari off yang diplot admin — karyawan tidak perlu absensi di mobile.</p>
					</div>
					<button
						type="button"
						onClick={() => setAddOpen(true)}
						className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1b3459] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163049]"
					>
						<HiOutlinePlus className="h-4 w-4" />
						Tambah Libur
					</button>
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Cutoff</span>
						<select
							value={cutoffMonth}
							onChange={(e) => {
								setCutoffMonth(Number(e.target.value));
								setPagination((p) => ({ ...p, page: 1 }));
							}}
							className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
						>
							{PERIOD_MONTHS.map((m) => (
								<option key={m.value} value={m.value}>{m.label}</option>
							))}
						</select>
					</label>
					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
						<select
							value={cutoffYear}
							onChange={(e) => {
								setCutoffYear(Number(e.target.value));
								setPagination((p) => ({ ...p, page: 1 }));
							}}
							className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>{y}</option>
							))}
						</select>
					</label>
					<form
						className="flex gap-2 self-end"
						onSubmit={(e) => {
							e.preventDefault();
							setSearch(searchInput.trim());
							setPagination((p) => ({ ...p, page: 1 }));
						}}
					>
						<div className="relative flex-1">
							<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Cari karyawan..."
								className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none"
							/>
						</div>
						<button type="submit" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
							Cari
						</button>
					</form>
				</div>

				<div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
					<HiOutlineCalendarDays className="h-4 w-4 text-[#97bd3f]" />
					Periode: <strong>{formatDateOnly(cutoffRange.startDate)}</strong> – <strong>{formatDateOnly(cutoffRange.endDate)}</strong>
				</div>

				{error && (
					<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
				)}

				<div className="overflow-x-auto rounded-xl border border-slate-100">
					<table className="w-full border-collapse text-sm">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">No</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Karyawan</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tanggal Libur</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Catatan</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Dibuat Oleh</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Memuat...</td></tr>
							) : records.length === 0 ? (
								<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Belum ada data libur</td></tr>
							) : (
								records.map((row, idx) => (
									<tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
										<td className="px-4 py-3 text-xs text-slate-400">{from + idx}</td>
										<td className="px-4 py-3">
											<p className="font-semibold text-slate-800">{row.employee_name}</p>
											<p className="text-xs text-slate-400">{row.jabatan}</p>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-slate-700">{formatDateOnly(row.off_date)}</td>
										<td className="px-4 py-3">
											<span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-600">
												Off
											</span>
										</td>
										<td className="max-w-[200px] px-4 py-3">
											<p className="truncate text-xs text-slate-600">{row.note || "—"}</p>
										</td>
										<td className="px-4 py-3 text-xs text-slate-500">{row.created_by_name || "—"}</td>
										<td className="px-4 py-3">
											<button
												type="button"
												onClick={() => setDeleteTarget(row)}
												className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
											>
												<HiOutlineTrash className="h-3.5 w-3.5" />
												Hapus
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
					<span className="text-slate-500">
						{pagination.total > 0 ? (
							<>Menampilkan <strong>{from}-{to}</strong> dari <strong>{pagination.total}</strong> data</>
						) : "Tidak ada data"}
					</span>
					<div className="flex items-center gap-1">
						<button type="button" disabled={pagination.page <= 1 || loading} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40">
							<HiOutlineChevronLeft className="h-3.5 w-3.5" />
						</button>
						{pages.map((p, i) =>
							p === "..." ? (
								<span key={`el-${i}`} className="px-1 text-xs text-slate-400">...</span>
							) : (
								<button key={p} type="button" disabled={loading} onClick={() => setPagination((prev) => ({ ...prev, page: p }))} className={cn("flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs font-semibold", p === pagination.page ? "border-[#1b3459] bg-[#1b3459] text-white" : "border-slate-200 text-slate-600")}>
									{p}
								</button>
							),
						)}
						<button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40">
							<HiOutlineChevronRight className="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
			</section>
		</>
	);
}
