import { useEffect, useMemo, useRef, useState } from "react";
import {
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineClock,
	HiOutlineExclamationTriangle,
	HiOutlineMagnifyingGlass,
	HiOutlinePlus,
	HiOutlineUser,
	HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function toDateInput(date) {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return "";
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export default function AddManualAttendanceAloraModal({ onClose, onSaved }) {
	const [employees, setEmployees] = useState([]);
	const [loadingEmps, setLoadingEmps] = useState(true);
	const [empError, setEmpError] = useState("");

	const [employeeId, setEmployeeId] = useState("");
	const [workDate, setWorkDate] = useState(toDateInput(new Date()));
	const [checkInTime, setCheckInTime] = useState("");
	const [checkOutTime, setCheckOutTime] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const [empSearch, setEmpSearch] = useState("");
	const [empDropOpen, setEmpDropOpen] = useState(false);
	const empDropRef = useRef(null);

	// Load active Alora employees
	useEffect(() => {
		let isMounted = true;
		const fetchEmployees = async () => {
			try {
				setLoadingEmps(true);
				setEmpError("");
				const res = await api("/alora/attendance/active-employees");
				if (isMounted) {
					setEmployees(Array.isArray(res.employees) ? res.employees : []);
				}
			} catch (err) {
				if (isMounted) {
					setEmpError(err.message || "Gagal memuat daftar karyawan");
				}
			} finally {
				if (isMounted) setLoadingEmps(false);
			}
		};
		fetchEmployees();
		return () => {
			isMounted = false;
		};
	}, []);

	// Click outside to close dropdown
	useEffect(() => {
		if (!empDropOpen) return;
		const onDown = (e) => {
			if (empDropRef.current && !empDropRef.current.contains(e.target)) {
				setEmpDropOpen(false);
			}
		};
		window.addEventListener("mousedown", onDown);
		window.addEventListener("touchstart", onDown);
		return () => {
			window.removeEventListener("mousedown", onDown);
			window.removeEventListener("touchstart", onDown);
		};
	}, [empDropOpen]);

	// Escape key to close modal
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

	const filteredEmps = useMemo(() => {
		const kw = empSearch.trim().toLowerCase();
		if (!kw) return employees;
		return employees.filter(
			(e) =>
				String(e.full_name || "").toLowerCase().includes(kw) ||
				String(e.employee_code || "").toLowerCase().includes(kw) ||
				String(e.employee_id || "").includes(kw) ||
				String(e.department_name || "").toLowerCase().includes(kw) ||
				String(e.position_name || "").toLowerCase().includes(kw)
		);
	}, [employees, empSearch]);

	const selectedEmp = useMemo(
		() => employees.find((e) => String(e.employee_id) === String(employeeId)) || null,
		[employees, employeeId]
	);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!employeeId) {
			setError("Pilih karyawan terlebih dahulu");
			return;
		}
		if (!workDate) {
			setError("Tanggal kerja wajib diisi");
			return;
		}
		if (!checkInTime) {
			setError("Jam masuk wajib diisi");
			return;
		}
		if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
			setError("Jam keluar harus lebih besar dari jam masuk");
			return;
		}

		try {
			setSaving(true);
			await api("/alora/attendance/manual", {
				method: "POST",
				body: JSON.stringify({
					employee_id: Number(employeeId),
					work_date: workDate,
					check_in_time: checkInTime,
					check_out_time: checkOutTime || null,
				}),
			});
			onSaved();
		} catch (err) {
			setError(err.message || "Gagal menambahkan absensi manual");
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
				className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
							<HiOutlinePlus className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-slate-800">Tambah Absensi Karyawan Alora</h3>
							<p className="text-[11px] text-slate-400">Input kehadiran manual karyawan oleh divisi HR</p>
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

				{/* Body Form */}
				<form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5 space-y-4">
					{error && (
						<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
							<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					{empError && (
						<div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
							<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							<span>{empError}</span>
						</div>
					)}

					{/* Pilih Karyawan */}
					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600">
							Pilih Karyawan <span className="text-rose-500">*</span>
						</label>
						<div className="relative" ref={empDropRef}>
							<button
								type="button"
								onClick={() => setEmpDropOpen((v) => !v)}
								disabled={loadingEmps}
								className={cn(
									"flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition outline-none",
									selectedEmp
										? "border-purple-300 bg-purple-50/40 text-slate-800 ring-2 ring-purple-500/15"
										: "border-slate-200 bg-white text-slate-400 hover:border-slate-300",
									loadingEmps && "opacity-60 cursor-not-allowed"
								)}
							>
								{loadingEmps ? (
									<span className="text-xs text-slate-400">Memuat daftar karyawan...</span>
								) : selectedEmp ? (
									<span className="flex items-center gap-2.5 min-w-0">
										<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
											{String(selectedEmp.full_name || "?")[0].toUpperCase()}
										</span>
										<span className="min-w-0 text-left">
											<span className="flex items-baseline gap-1.5 min-w-0">
												<span className="truncate text-sm font-semibold text-slate-800">
													{selectedEmp.full_name}
												</span>
												<span className="shrink-0 text-[11px] text-slate-400">
													{selectedEmp.employee_code || `ID ${selectedEmp.employee_id}`}
												</span>
											</span>
											<span className="block truncate text-[11px] text-slate-500">
												{selectedEmp.department_name} · {selectedEmp.position_name}
											</span>
										</span>
									</span>
								) : (
									<span className="flex items-center gap-2 text-slate-400 text-sm">
										<HiOutlineMagnifyingGlass className="h-4 w-4" />
										Cari & pilih karyawan...
									</span>
								)}
								<HiOutlineChevronDown
									className={cn(
										"h-4 w-4 shrink-0 text-slate-400 transition-transform",
										empDropOpen && "rotate-180"
									)}
								/>
							</button>

							{empDropOpen && (
								<div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
									<div className="border-b border-slate-100 p-2">
										<div className="relative">
											<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
											<input
												autoFocus
												type="text"
												value={empSearch}
												onChange={(e) => setEmpSearch(e.target.value)}
												placeholder="Ketik nama, NIK, divisi, atau jabatan..."
												className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30"
											/>
										</div>
									</div>
									<ul className="max-h-56 overflow-y-auto py-1">
										{filteredEmps.length === 0 ? (
											<li className="px-4 py-6 text-center text-xs text-slate-400">
												Karyawan tidak ditemukan
											</li>
										) : (
											filteredEmps.map((emp) => {
												const isSelected = String(emp.employee_id) === String(employeeId);
												return (
													<li key={emp.employee_id}>
														<button
															type="button"
															onClick={() => {
																setEmployeeId(String(emp.employee_id));
																setEmpDropOpen(false);
																setEmpSearch("");
															}}
															className={cn(
																"flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition",
																isSelected
																	? "bg-purple-50 text-purple-700"
																	: "text-slate-700 hover:bg-slate-50"
															)}
														>
															<span
																className={cn(
																	"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
																	isSelected
																		? "bg-purple-100 text-purple-600"
																		: "bg-slate-100 text-slate-500"
																)}
															>
																{String(emp.full_name || "?")[0].toUpperCase()}
															</span>
															<span className="min-w-0 flex-1">
																<span className="block truncate font-semibold text-slate-800">
																	{emp.full_name}
																</span>
																<span className="block text-[11px] text-slate-400">
																	{emp.employee_code || `ID ${emp.employee_id}`} ·{" "}
																	{emp.department_name}
																</span>
															</span>
															{isSelected && (
																<HiOutlineCheckCircle className="ml-auto h-4 w-4 shrink-0 text-purple-600" />
															)}
														</button>
													</li>
												);
											})
										)}
									</ul>
								</div>
							)}
						</div>
					</div>

					{/* Tanggal Kerja */}
					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600">
							Tanggal Kerja <span className="text-rose-500">*</span>
						</label>
						<input
							type="date"
							value={workDate}
							onChange={(e) => setWorkDate(e.target.value)}
							required
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
						/>
					</div>

					{/* Input Jam Masuk & Keluar */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="mb-1.5 block text-xs font-semibold text-slate-600">
								Jam Masuk <span className="text-rose-500">*</span>
							</label>
							<div className="relative">
								<input
									type="time"
									value={checkInTime}
									onChange={(e) => setCheckInTime(e.target.value)}
									required
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
								/>
							</div>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-semibold text-slate-600">
								Jam Keluar <span className="text-[11px] font-normal text-slate-400">(opsional)</span>
							</label>
							<div className="relative">
								<input
									type="time"
									value={checkOutTime}
									onChange={(e) => setCheckOutTime(e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
								/>
							</div>
						</div>
					</div>

					{/* Info card */}
					<div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3 text-xs text-purple-700">
						<div className="flex items-start gap-2">
							<HiOutlineClock className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
							<p>
								Absensi yang ditambahkan secara manual akan tercatat pada sistem absensi Alora dengan status
								Hadir dan lokasi Input Manual HR.
							</p>
						</div>
					</div>

					{/* Tombol Aksi */}
					<div className="flex gap-2 pt-2">
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
							className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition disabled:opacity-60"
						>
							{saving ? "Menyimpan..." : "Simpan Absensi"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
