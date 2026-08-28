import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlineAdjustmentsHorizontal,
	HiOutlineArrowDownTray,
	HiOutlineBanknotes,
	HiOutlineBuildingStorefront,
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineClock,
	HiOutlineDocumentCheck,
	HiOutlineExclamationTriangle,
	HiOutlineMagnifyingGlass,
	HiOutlinePencil,
	HiOutlinePlus,
	HiOutlineTrash,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api, apiUpload, BASE_URL } from "../../../lib/api";
import {
	exportMakanSiangPengajuanExcel,
	exportMakanSiangRekapExcel,
} from "../utils/exportMakanSiangCleanoxExcel";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function toDateInput(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function getDefaultCutoffSelection(now = new Date(), cutoffStartDay = 26) {
	const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
	const endDay = startDay - 1;

	let cutoffMonth = now.getMonth() + 1;
	let cutoffYear = now.getFullYear();

	if (now.getDate() > endDay) {
		cutoffMonth += 1;
		if (cutoffMonth > 12) {
			cutoffMonth = 1;
			cutoffYear += 1;
		}
	}

	const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
	const end = new Date(cutoffYear, cutoffMonth - 1, endDay);

	return {
		cutoffMonth,
		cutoffYear,
		cutoffStartDay: startDay,
		startDate: toDateInput(start),
		endDate: toDateInput(end),
	};
}

function toneClass(tone) {
	if (tone === "emerald") return "bg-emerald-50 border-emerald-100 text-emerald-700";
	if (tone === "amber") return "bg-amber-50 border-amber-100 text-amber-700";
	if (tone === "rose") return "bg-rose-50 border-rose-100 text-rose-700";
	return "bg-blue-50 border-blue-100 text-blue-700";
}

function capitalEachWord(value) {
	if (!value) return "";
	return String(value)
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
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

function formatRp(n) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(Number(n) || 0);
}

function resolveAssetUrl(url) {
	if (!url) return null;
	if (/^https?:\/\//i.test(url)) return url;
	const base = (BASE_URL || "").replace(/\/$/, "");
	return `${base}${url.startsWith("/") ? url : `/${url}`}`;
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

const TYPE_LABEL = { half_day: "Half Day", full_day: "Full Day" };

function AddEditMealModal({ open, onClose, onSaved, editRecord, employees }) {
	const todayVal = useMemo(() => toDateInput(new Date()), []);
	const isEdit = Boolean(editRecord?.id);

	const [employeeId, setEmployeeId] = useState("");
	const [mealDate, setMealDate] = useState(todayVal);
	const [type, setType] = useState("half_day");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [empSearch, setEmpSearch] = useState("");
	const [empDropOpen, setEmpDropOpen] = useState(false);
	const empDropRef = useRef(null);

	useEffect(() => {
		if (!open) return;
		setError("");
		if (editRecord) {
			setEmployeeId(String(editRecord.worker_id || editRecord.employee_id || ""));
			setMealDate(editRecord.meal_date?.slice?.(0, 10) || editRecord.meal_date || todayVal);
			setType(editRecord.type || "half_day");
			setNotes(editRecord.notes || "");
		} else {
			setEmployeeId("");
			setMealDate(todayVal);
			setType("half_day");
			setNotes("");
		}
		setEmpSearch("");
		setEmpDropOpen(false);
	}, [open, editRecord, todayVal]);

	const filteredEmps = useMemo(() => {
		const kw = empSearch.trim().toLowerCase();
		if (!kw) return employees;
		return employees.filter(
			(e) =>
				String(e.employee_name || "").toLowerCase().includes(kw) ||
				String(e.employee_code || "").toLowerCase().includes(kw) ||
				String(e.employee_id || "").includes(kw),
		);
	}, [employees, empSearch]);

	const selectedEmp = useMemo(
		() => employees.find((e) => String(e.employee_id) === String(employeeId)) || null,
		[employees, employeeId],
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
		if (!isEdit && !employeeId) {
			setError("Pilih karyawan terlebih dahulu");
			return;
		}
		if (!mealDate) {
			setError("Tanggal makan wajib diisi");
			return;
		}

		try {
			setSaving(true);
			if (isEdit) {
				await api(`/cleanox/meal/${editRecord.id}`, {
					method: "PUT",
					body: JSON.stringify({
						meal_date: mealDate,
						type,
						notes: notes.trim() || null,
					}),
				});
			} else {
				await api("/cleanox/meal", {
					method: "POST",
					body: JSON.stringify({
						worker_id: Number(employeeId),
						meal_date: mealDate,
						type,
						notes: notes.trim() || null,
					}),
				});
			}
			onSaved();
		} catch (err) {
			setError(err?.message || "Gagal menyimpan pengajuan");
		} finally {
			setSaving(false);
		}
	};

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
			onClick={onClose}
			role="presentation"
		>
			<div
				className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
			>
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<div>
						<h3 className="text-base font-bold text-slate-800">
							{isEdit ? "Edit Pengajuan Makan Siang" : "Tambah Pengajuan Makan Siang"}
						</h3>
						<p className="text-xs text-slate-400">
							{isEdit ? "Ubah tanggal, tipe, atau catatan" : "Plot pengajuan half/full day karyawan"}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
					>
						<HiOutlineXMark className="h-4 w-4" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
					{!isEdit ? (
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
											onChange={(ev) => setEmpSearch(ev.target.value)}
											placeholder="Cari nama / kode..."
											className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
										/>
									</div>
									<ul className="max-h-44 overflow-y-auto py-1">
										{filteredEmps.length === 0 ? (
											<li className="px-3 py-2 text-xs text-slate-400">Tidak ditemukan</li>
										) : (
											filteredEmps.map((emp) => (
												<li key={emp.employee_id}>
													<button
														type="button"
														onClick={() => {
															setEmployeeId(String(emp.employee_id));
															setEmpDropOpen(false);
														}}
														className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
													>
														{emp.employee_name}
														{emp.employee_code ? (
															<span className="text-slate-400"> ({emp.employee_code})</span>
														) : null}
													</button>
												</li>
											))
										)}
									</ul>
								</div>
							)}
						</div>
					) : (
						<div>
							<label className="mb-1 block text-xs font-semibold text-slate-500">Karyawan</label>
							<p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
								{editRecord.full_name || editRecord.employee_name}
								{editRecord.employee_code ? (
									<span className="font-normal text-slate-400"> ({editRecord.employee_code})</span>
								) : null}
							</p>
						</div>
					)}

					<label className="block text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Makan</span>
						<input
							type="date"
							value={mealDate}
							max={todayVal}
							onChange={(ev) => setMealDate(ev.target.value)}
							className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							required
						/>
					</label>

					<label className="block text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Tipe</span>
						<select
							value={type}
							onChange={(ev) => setType(ev.target.value)}
							className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							<option value="half_day">Half Day (Rp 25.000)</option>
							<option value="full_day">Full Day (Rp 30.000)</option>
						</select>
					</label>

					<label className="block text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Catatan (opsional)</span>
						<textarea
							value={notes}
							onChange={(ev) => setNotes(ev.target.value)}
							rows={2}
							maxLength={1000}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</label>

					{error ? (
						<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
							<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							<p>{error}</p>
						</div>
					) : null}

					<div className="flex gap-2 pt-1">
						<button
							type="button"
							disabled={saving}
							onClick={onClose}
							className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-slate-600"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={saving}
							className="flex-1 rounded-xl bg-[#1b3459] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
						>
							{saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Pengajuan"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function ConfirmDeleteMealModal({ item, onClose, onDeleted }) {
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState("");

	const handleDelete = async () => {
		if (!item?.id) return;
		setError("");
		try {
			setDeleting(true);
			await api(`/cleanox/meal/${item.id}`, { method: "DELETE" });
			onDeleted();
		} catch (err) {
			setError(err?.message || "Gagal menghapus pengajuan");
		} finally {
			setDeleting(false);
		}
	};

	if (!item) return null;

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
			onClick={() => !deleting && onClose()}
			role="presentation"
		>
			<div
				className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
			>
				<h3 className="text-base font-bold text-slate-800">Hapus pengajuan?</h3>
				<p className="mt-2 text-sm text-slate-500">
					{capitalEachWord(item.full_name || item.employee_name)} · {formatDate(item.meal_date)} ·{" "}
					{TYPE_LABEL[item.type] || item.type}
				</p>
				{error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
				<div className="mt-4 flex gap-2">
					<button
						type="button"
						disabled={deleting}
						onClick={onClose}
						className="flex-1 rounded-xl border py-2.5 text-sm font-semibold"
					>
						Batal
					</button>
					<button
						type="button"
						disabled={deleting}
						onClick={handleDelete}
						className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
					>
						{deleting ? "Menghapus..." : "Hapus"}
					</button>
				</div>
			</div>
		</div>
	);
}

function StatCard({ title, value, subtitle, tone = "blue", Icon }) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm text-left w-full">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
					<p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
					<p className="mt-1 text-xs text-slate-500">{subtitle}</p>
				</div>
				<div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClass(tone))}>
					{Icon ? <Icon className="h-5 w-5" /> : null}
				</div>
			</div>
		</div>
	);
}

function StatusBadge({ status }) {
	const s = String(status || "").toLowerCase();
	const cls =
		s === "menunggu_tf"
			? "bg-amber-50 text-amber-700 border-amber-200"
			: s === "selesai"
				? "bg-emerald-50 text-emerald-700 border-emerald-200"
				: "bg-slate-50 text-slate-600 border-slate-200";
	const label = s === "menunggu_tf" ? "Menunggu TF" : s === "selesai" ? "Selesai" : status || "-";
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls)}>
			{label}
		</span>
	);
}

export default function MakanSiangCleanox() {
	const todayStr = useMemo(() => toDateInput(new Date()), []);
	const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date(), 26), []);
	const cutoffStartDay = 26;

	const [periodMode, setPeriodMode] = useState("cutoff");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
	const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
	const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);

	const [records, setRecords] = useState([]);
	const [rekapRows, setRekapRows] = useState([]);
	const [summary, setSummary] = useState({ total: 0, menunggu_tf: 0, selesai: 0, total_amount: 0 });
	const [grandTotal, setGrandTotal] = useState(0);
	const [rekapDays, setRekapDays] = useState(0);

	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState("");
	const [refreshKey, setRefreshKey] = useState(0);

	const [filterType, setFilterType] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");

	const [detailItem, setDetailItem] = useState(null);
	const [completeItem, setCompleteItem] = useState(null);
	const [proofFile, setProofFile] = useState(null);
	const [processNote, setProcessNote] = useState("");
	const [completing, setCompleting] = useState(false);

	const [employees, setEmployees] = useState([]);
	const [addEditOpen, setAddEditOpen] = useState(false);
	const [editRecord, setEditRecord] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);

	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
	}, []);

	const activePeriod = useMemo(() => {
		if (periodMode === "today") {
			return { startDate: todayStr, endDate: todayStr };
		}
		if (periodMode === "custom") {
			return {
				startDate: customStartDate || todayStr,
				endDate: customEndDate || customStartDate || todayStr,
			};
		}
		const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
		const endDay = startDay - 1;
		const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
		const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
		return { startDate: toDateInput(start), endDate: toDateInput(end) };
	}, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear]);

	const activePeriodLabel = useMemo(() => {
		if (periodMode === "today") return `Hari ini (${formatDate(todayStr)})`;
		if (periodMode === "custom") {
			return `Custom ${formatDate(activePeriod.startDate)} - ${formatDate(activePeriod.endDate)}`;
		}
		const monthLabel = PERIOD_MONTHS.find((m) => m.value === cutoffMonth)?.label || `Bulan ${cutoffMonth}`;
		return `Cutoff ${monthLabel} ${cutoffYear} (${formatDate(activePeriod.startDate)} - ${formatDate(activePeriod.endDate)})`;
	}, [periodMode, todayStr, activePeriod.startDate, activePeriod.endDate, cutoffMonth, cutoffYear]);

	useEffect(() => {
		document.title = "Makan Siang Cleanox | Alora Group Indonesia";
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const data = await api("/cleanox/kasbon/employee-options");
				if (cancelled) return;
				setEmployees(
					(data?.data || []).map((row) => ({
						employee_id: row.employee_id,
						employee_code: row.employee_code,
						employee_name: row.full_name || row.employee_name || `ID ${row.employee_id}`,
					})),
				);
			} catch {
				if (!cancelled) setEmployees([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const { startDate, endDate } = activePeriod;
			if (!startDate || !endDate) return;
			if (endDate < startDate) {
				setFetchError("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai");
				setRecords([]);
				setRekapRows([]);
				setSummary({ total: 0, menunggu_tf: 0, selesai: 0, total_amount: 0 });
				setGrandTotal(0);
				setRekapDays(0);
				setLoading(false);
				return;
			}
			try {
				setLoading(true);
				setFetchError("");
				const qs = new URLSearchParams({ startDate, endDate });
				const listQs = new URLSearchParams({ startDate, endDate, page: "1", limit: "500" });

				const [rekapData, listData] = await Promise.all([
					api(`/cleanox/meal/rekap?${qs.toString()}`),
					api(`/cleanox/meal?${listQs.toString()}`),
				]);

				if (cancelled) return;
				setRekapRows(rekapData?.rows || []);
				setGrandTotal(Number(rekapData?.grand_total) || 0);
				setRekapDays(Number(rekapData?.days) || 0);
				setRecords(listData?.records || []);
				setSummary(
					listData?.summary || { total: 0, menunggu_tf: 0, selesai: 0, total_amount: 0 },
				);
			} catch (err) {
				if (!cancelled) {
					setRecords([]);
					setRekapRows([]);
					setSummary({ total: 0, menunggu_tf: 0, selesai: 0, total_amount: 0 });
					setGrandTotal(0);
					setRekapDays(0);
					setFetchError(err?.message || "Gagal memuat data makan siang");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [activePeriod.startDate, activePeriod.endDate, refreshKey]);

	const displayedRecords = useMemo(() => {
		let rows = records;
		if (filterType) rows = rows.filter((r) => r.type === filterType);
		if (filterStatus) rows = rows.filter((r) => r.status === filterStatus);
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			rows = rows.filter(
				(r) =>
					String(r.full_name || r.employee_name || "")
						.toLowerCase()
						.includes(q) ||
					String(r.employee_code || "")
						.toLowerCase()
						.includes(q),
			);
		}
		return rows;
	}, [records, filterType, filterStatus, search]);

	const resetPeriodFilters = () => {
		const resetCutoff = getDefaultCutoffSelection(new Date(), 26);
		setPeriodMode("cutoff");
		setCutoffMonth(resetCutoff.cutoffMonth);
		setCutoffYear(resetCutoff.cutoffYear);
		setCustomStartDate(resetCutoff.startDate);
		setCustomEndDate(resetCutoff.endDate);
		setFilterType("");
		setFilterStatus("");
		setSearch("");
		setSearchInput("");
	};

	const handleComplete = async () => {
		if (!completeItem?.id) return;
		if (!proofFile) {
			setFetchError("Bukti TF wajib diunggah");
			return;
		}
		setCompleting(true);
		setFetchError("");
		try {
			const fd = new FormData();
			fd.append("proof_doc", proofFile);
			if (processNote.trim()) fd.append("process_note", processNote.trim());
			await apiUpload(`/cleanox/meal/${completeItem.id}/complete`, {
				method: "PUT",
				body: fd,
			});
			setCompleteItem(null);
			setProofFile(null);
			setProcessNote("");
			setRefreshKey((k) => k + 1);
		} catch (err) {
			setFetchError(err?.message || "Gagal menyelesaikan pengajuan");
		} finally {
			setCompleting(false);
		}
	};

	const handleExportRekap = useCallback(() => {
		try {
			exportMakanSiangRekapExcel({
				rows: rekapRows,
				periodLabel: activePeriodLabel,
				activePeriod,
				grandTotal,
			});
		} catch (err) {
			setFetchError(err?.message || "Gagal export rekap Excel");
		}
	}, [rekapRows, activePeriodLabel, activePeriod, grandTotal]);

	const handleExportPengajuan = useCallback(() => {
		try {
			exportMakanSiangPengajuanExcel({
				records: displayedRecords,
				periodLabel: activePeriodLabel,
				activePeriod,
				typeFilter: filterType,
				statusFilter: filterStatus,
			});
		} catch (err) {
			setFetchError(err?.message || "Gagal export pengajuan Excel");
		}
	}, [displayedRecords, activePeriodLabel, activePeriod, filterType, filterStatus]);

	return (
		<div className="min-h-full bg-slate-50 py-6">
			{fetchError && (
				<div className="mx-auto mb-4 max-w-screen-2xl px-4 sm:px-6 lg:px-8">
					<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<p>{fetchError}</p>
					</div>
				</div>
			)}

			<div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
					<div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
					<div className="relative p-5 sm:p-6 lg:p-8">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Makan Siang Cleanox</h1>
								<p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
									Plot pengajuan, rekap keuangan uang makan per periode cutoff — kantor Rp 10.000/hari, half day Rp
									25.000, full day Rp 30.000.
								</p>
								<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
									{activePeriodLabel}
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									setEditRecord(null);
									setAddEditOpen(true);
									setFetchError("");
								}}
								className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#1b3459] shadow-sm transition hover:bg-white/90"
							>
								<HiOutlinePlus className="h-4 w-4" />
								Tambah Pengajuan
							</button>
						</div>
					</div>
				</section>

				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
					<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
								<HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
							</div>
							<div>
								<h2 className="text-base font-bold text-slate-800">Filter Periode</h2>
								<p className="text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
							</div>
						</div>
						<button
							type="button"
							onClick={resetPeriodFilters}
							className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						>
							Reset
						</button>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label className="text-sm text-slate-600">
							<span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
							<select
								value={periodMode}
								onChange={(e) => setPeriodMode(e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="cutoff">Periode Cutoff</option>
								<option value="today">Hari Ini</option>
								<option value="custom">Custom Tanggal</option>
							</select>
						</label>
					</div>

					{periodMode === "cutoff" && (
						<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
								<select
									value={cutoffMonth}
									onChange={(e) => setCutoffMonth(Number(e.target.value))}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									{PERIOD_MONTHS.map((month) => (
										<option key={month.value} value={month.value}>
											{month.label}
										</option>
									))}
								</select>
							</label>
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
								<select
									value={cutoffYear}
									onChange={(e) => setCutoffYear(Number(e.target.value))}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									{yearOptions.map((year) => (
										<option key={year} value={year}>
											{year}
										</option>
									))}
								</select>
							</label>
						</div>
					)}

					{periodMode === "custom" && (
						<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
								<input
									type="date"
									value={customStartDate}
									onChange={(e) => setCustomStartDate(e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</label>
							<label className="text-sm text-slate-600">
								<span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
								<input
									type="date"
									value={customEndDate}
									onChange={(e) => setCustomEndDate(e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</label>
						</div>
					)}

					<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
						Periode aktif: <strong>{formatDate(activePeriod.startDate)}</strong> sampai{" "}
						<strong>{formatDate(activePeriod.endDate)}</strong>
						{rekapDays > 0 ? (
							<span className="text-slate-500"> · {rekapDays} hari kalender (termasuk Minggu)</span>
						) : null}
					</div>
				</section>

				<section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
					<StatCard
						title="Grand Total"
						value={formatRp(grandTotal)}
						subtitle="Total uang makan semua karyawan"
						tone="emerald"
						Icon={HiOutlineBanknotes}
					/>
					<StatCard
						title="Hari Periode"
						value={rekapDays}
						subtitle="Hari kalender dalam periode"
						tone="blue"
						Icon={HiOutlineClock}
					/>
					<StatCard
						title="Pengajuan"
						value={summary.total}
						subtitle="Total pengajuan half/full day"
						tone="blue"
						Icon={HiOutlineDocumentCheck}
					/>
					<StatCard
						title="Menunggu TF"
						value={summary.menunggu_tf}
						subtitle="Perlu bukti transfer"
						tone="amber"
						Icon={HiOutlineBuildingStorefront}
					/>
					<StatCard
						title="Selesai"
						value={summary.selesai}
						subtitle="Sudah di-transfer"
						tone="emerald"
						Icon={HiOutlineCheckCircle}
					/>
				</section>

				<section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
					<div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-base font-bold text-slate-800">Ringkasan Keuangan Per Karyawan</h2>
							<p className="mt-0.5 text-xs text-slate-500">
								Rekap nominal uang makan per karyawan pada periode aktif.
							</p>
						</div>
						<button
							type="button"
							onClick={handleExportRekap}
							disabled={loading || rekapRows.length === 0}
							className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
						>
							<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
							Download Rekap Excel
						</button>
					</div>

					<div className="overflow-x-auto pb-1">
						<table className="min-w-[960px] w-full table-fixed text-sm">
							<thead className="border-b border-slate-100 bg-slate-50">
								<tr>
									<th className="w-[22%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Karyawan
									</th>
									<th className="w-[12%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
										NIK
									</th>
									<th className="w-[18%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Jabatan
									</th>
									<th className="w-[10%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
										Kantor
									</th>
									<th className="w-[8%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
										Half
									</th>
									<th className="w-[8%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
										Full
									</th>
									<th className="w-[14%] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
										Total
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{rekapRows.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
											{loading
												? "Memuat ringkasan keuangan..."
												: "Belum ada data rekap untuk periode ini."}
										</td>
									</tr>
								) : (
									rekapRows.map((row) => (
										<tr key={row.employee_id} className="hover:bg-slate-50/80 transition-colors">
											<td className="px-4 py-3">
												<div className="text-sm font-semibold text-slate-800">
													{capitalEachWord(row.full_name || row.employee_name)}
												</div>
											</td>
											<td className="px-4 py-3 text-center text-sm text-slate-600">{row.employee_code || "-"}</td>
											<td className="px-4 py-3 text-sm text-slate-600">{row.jabatan || "-"}</td>
											<td className="px-4 py-3 text-center text-sm text-slate-600">{row.office_days}</td>
											<td className="px-4 py-3 text-center text-sm text-amber-700 font-semibold">{row.half_days}</td>
											<td className="px-4 py-3 text-center text-sm text-blue-700 font-semibold">{row.full_days}</td>
											<td className="px-4 py-3 text-center text-sm font-bold text-[#1b3459]">
												{formatRp(row.total_amount)}
											</td>
										</tr>
									))
								)}
							</tbody>
							{rekapRows.length > 0 && (
								<tfoot className="border-t border-slate-200 bg-slate-50">
									<tr>
										<td colSpan={6} className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
											Grand Total
										</td>
										<td className="px-4 py-3 text-center text-sm font-bold text-emerald-700">{formatRp(grandTotal)}</td>
									</tr>
								</tfoot>
							)}
						</table>
					</div>
				</section>

				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
						<div>
							<h2 className="text-base font-bold text-slate-800">Detail Pengajuan Makan Siang</h2>
							<p className="mt-0.5 text-xs text-slate-500">
								Plot pengajuan half/full day karyawan — selesaikan dengan upload bukti TF.
							</p>
							<p className="mt-1 text-xs text-slate-400">
								{loading
									? "Memuat..."
									: `${displayedRecords.length} pengajuan ditampilkan${filterStatus ? ` · status: ${filterStatus}` : ""}`}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<div className="relative">
								<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
								<input
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") setSearch(searchInput.trim());
									}}
									placeholder="Cari nama..."
									className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
								/>
							</div>
							<select
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
								className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
							>
								<option value="">Semua Tipe</option>
								<option value="half_day">Half Day</option>
								<option value="full_day">Full Day</option>
							</select>
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
							>
								<option value="">Semua Status</option>
								<option value="menunggu_tf">Menunggu TF</option>
								<option value="selesai">Selesai</option>
							</select>
							{(filterType || filterStatus || search) && (
								<button
									type="button"
									onClick={() => {
										setFilterType("");
										setFilterStatus("");
										setSearch("");
										setSearchInput("");
									}}
									className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
								>
									<HiOutlineXMark className="h-3.5 w-3.5" />
									Bersihkan
								</button>
							)}
							<button
								type="button"
								onClick={handleExportPengajuan}
								disabled={loading || displayedRecords.length === 0}
								className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
							>
								<HiOutlineArrowDownTray className="h-3.5 w-3.5" />
								Download Excel
							</button>
						</div>
					</div>

					<div className="hidden md:block overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="border-b border-slate-100 bg-slate-50">
								<tr>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Tanggal
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Karyawan
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Tipe
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Nominal
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Status
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Aksi
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading ? (
									<tr>
										<td colSpan={6} className="px-4 py-10 text-center text-slate-400">
											Memuat pengajuan...
										</td>
									</tr>
								) : displayedRecords.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-4 py-10 text-center text-slate-400">
											Tidak ada pengajuan untuk filter ini.
										</td>
									</tr>
								) : (
									displayedRecords.map((row) => (
										<tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
											<td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(row.meal_date)}</td>
											<td className="px-4 py-3">
												<div className="font-semibold text-slate-800">{capitalEachWord(row.full_name)}</div>
												<div className="text-xs text-slate-400">{row.employee_code || "-"}</div>
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-slate-600">
												{TYPE_LABEL[row.type] || row.type}
											</td>
											<td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1b3459]">
												{formatRp(row.amount)}
											</td>
											<td className="whitespace-nowrap px-4 py-3">
												<StatusBadge status={row.status} />
											</td>
											<td className="whitespace-nowrap px-4 py-3">
												{row.status === "menunggu_tf" ? (
													<div className="flex flex-wrap items-center gap-1.5">
														<button
															type="button"
															onClick={() => {
																setEditRecord(row);
																setAddEditOpen(true);
																setFetchError("");
															}}
															className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
														>
															<HiOutlinePencil className="h-3.5 w-3.5" />
															Edit
														</button>
														<button
															type="button"
															onClick={() => {
																setCompleteItem(row);
																setProofFile(null);
																setProcessNote("");
																setFetchError("");
															}}
															className="rounded-lg bg-[#1b3459] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#152a4a]"
														>
															Selesai
														</button>
														<button
															type="button"
															onClick={() => setDeleteTarget(row)}
															className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
														>
															<HiOutlineTrash className="h-3.5 w-3.5" />
															Hapus
														</button>
													</div>
												) : (
													<button
														type="button"
														onClick={() => setDetailItem(row)}
														className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
													>
														Detail
													</button>
												)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>

			{detailItem ? (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
					onClick={() => setDetailItem(null)}
					role="presentation"
				>
					<div
						className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<h3 className="text-lg font-bold text-slate-900">{capitalEachWord(detailItem.full_name)}</h3>
								<p className="text-xs text-slate-400">{detailItem.employee_code || `ID ${detailItem.worker_id}`}</p>
							</div>
							<button type="button" onClick={() => setDetailItem(null)} className="rounded-lg border p-1.5" aria-label="Tutup">
								<HiOutlineXMark className="h-5 w-5" />
							</button>
						</div>
						<div className="mt-4 grid grid-cols-2 gap-3 text-sm">
							<div>
								<p className="text-[11px] font-semibold uppercase text-slate-400">Tanggal</p>
								<p className="font-semibold">{formatDate(detailItem.meal_date)}</p>
							</div>
							<div>
								<p className="text-[11px] font-semibold uppercase text-slate-400">Tipe</p>
								<p className="font-semibold">{TYPE_LABEL[detailItem.type] || detailItem.type}</p>
							</div>
							<div>
								<p className="text-[11px] font-semibold uppercase text-slate-400">Nominal</p>
								<p className="font-semibold text-[#1b3459]">{formatRp(detailItem.amount)}</p>
							</div>
							<div>
								<p className="text-[11px] font-semibold uppercase text-slate-400">Status</p>
								<div className="mt-1">
									<StatusBadge status={detailItem.status} />
								</div>
							</div>
						</div>
						{detailItem.notes ? (
							<p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
								{detailItem.notes}
							</p>
						) : null}
						{detailItem.proof_url ? (
							<a
								href={resolveAssetUrl(detailItem.proof_url)}
								target="_blank"
								rel="noreferrer"
								className="mt-3 inline-flex text-sm font-semibold text-[#1b3459] underline"
							>
								Lihat bukti TF
							</a>
						) : null}
						{detailItem.processed_at ? (
							<p className="mt-2 text-xs text-slate-400">
								Diproses {formatDateTime(detailItem.processed_at)} · {detailItem.processed_by_name || "-"}
							</p>
						) : null}
					</div>
				</div>
			) : null}

			{completeItem ? (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
					onClick={() => !completing && setCompleteItem(null)}
					role="presentation"
				>
					<div
						className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
					>
						<h3 className="text-lg font-bold text-slate-900">Selesaikan pengajuan</h3>
						<p className="text-sm text-slate-500">
							{capitalEachWord(completeItem.full_name)} · {formatDate(completeItem.meal_date)} ·{" "}
							{TYPE_LABEL[completeItem.type]} · {formatRp(completeItem.amount)}
						</p>
						<div>
							<label className="text-[11px] font-semibold uppercase text-slate-400">Bukti TF (wajib)</label>
							<input
								type="file"
								accept="image/*"
								onChange={(e) => setProofFile(e.target.files?.[0] || null)}
								className="mt-1 block w-full text-sm"
								disabled={completing}
							/>
						</div>
						<div>
							<label className="text-[11px] font-semibold uppercase text-slate-400">Catatan (opsional)</label>
							<textarea
								value={processNote}
								onChange={(e) => setProcessNote(e.target.value)}
								rows={2}
								className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
								disabled={completing}
							/>
						</div>
						<div className="flex gap-2 pt-1">
							<button
								type="button"
								disabled={completing}
								onClick={() => setCompleteItem(null)}
								className="flex-1 rounded-xl border py-2.5 text-sm font-semibold"
							>
								Batal
							</button>
							<button
								type="button"
								disabled={completing}
								onClick={handleComplete}
								className="flex-1 rounded-xl bg-[#1b3459] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
							>
								{completing ? "Menyimpan..." : "Tandai Selesai"}
							</button>
						</div>
					</div>
				</div>
			) : null}

			<AddEditMealModal
				open={addEditOpen}
				editRecord={editRecord}
				employees={employees}
				onClose={() => {
					setAddEditOpen(false);
					setEditRecord(null);
				}}
				onSaved={() => {
					setAddEditOpen(false);
					setEditRecord(null);
					setRefreshKey((k) => k + 1);
				}}
			/>

			<ConfirmDeleteMealModal
				item={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onDeleted={() => {
					setDeleteTarget(null);
					setRefreshKey((k) => k + 1);
				}}
			/>
		</div>
	);
}
