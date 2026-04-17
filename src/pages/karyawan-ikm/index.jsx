import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	HiOutlineUsers,
	HiOutlineIdentification,
	HiOutlineBriefcase,
	HiOutlinePhone,
	HiOutlineExclamationTriangle,
	HiOutlineMagnifyingGlass,
	HiOutlinePlus,
	HiOutlineUser,
	HiOutlineEnvelope,
	HiOutlineKey,
	HiOutlineXMark,
	HiOutlineArrowLeft,
	HiOutlineArrowPath,
	HiOutlineCheckCircle,
	HiOutlineEye,
	HiOutlineEyeSlash,
	HiOutlineInformationCircle,
	HiOutlineChevronLeft,
	HiOutlineChevronRight,
	HiOutlineChevronUp,
	HiOutlineChevronDown,
	HiOutlineArrowsUpDown,
	HiOutlineCalendarDays,
} from "react-icons/hi2";
import { api } from "../../lib/api";

// Helpers

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
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

function capitalEachWord(value) {
	if (!value) return "";
	return String(value)
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function generatePages(current, total) {
	if (total <= 1) return [];
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
	if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "...", current - 1, current, current + 1, "...", total];
}

function SortTh({ col, label, sortBy, sortDir, onSort, className = "" }) {
	const active = sortBy === col;
	return (
		<th
			className={cn(
				"px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100",
				active ? "text-blue-600 bg-blue-50/60" : "text-slate-500",
				className,
			)}
			onClick={() => onSort(col)}
		>
			<div className="flex items-center gap-1">
				{label}
				{active ? (
					sortDir === "asc"
						? <HiOutlineChevronUp className="h-3.5 w-3.5" />
						: <HiOutlineChevronDown className="h-3.5 w-3.5" />
				) : (
					<HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />
				)}
			</div>
		</th>
	);
}

function SkeletonRow() {
	return (
		<tr className="border-t border-slate-100 animate-pulse">
			{[32, 24, 40, 28, 48, 28, 36, 24, 20].map((w, i) => (
				<td key={i} className="px-4 py-4">
					<div className={`h-3.5 rounded-md bg-slate-200`} style={{ width: `${w * 3}px` }} />
				</td>
			))}
		</tr>
	);
}

function EmploymentBadge({ exitDate }) {
	const resigned = Boolean(exitDate);
	return (
		<span className={cn(
			"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
			resigned
				? "border-rose-200 bg-rose-50 text-rose-700"
				: "border-sky-200 bg-sky-50 text-sky-700",
		)}>
			{resigned ? "Resign" : "Aktif"}
		</span>
	);
}

function GenderBadge({ gender }) {
	if (!gender) return <span className="text-slate-300 text-xs">-</span>;
	return (
		<span className={cn(
			"inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase",
			gender === "L"
				? "border-blue-200 bg-blue-50 text-blue-700"
				: "border-pink-200 bg-pink-50 text-pink-700",
		)}>
			{gender === "L" ? "L" : "P"}
		</span>
	);
}

function PaginationBar({ page, totalPages, total, limit, onPage, onLimitChange, loading }) {
	const from = total === 0 ? 0 : (page - 1) * limit + 1;
	const to = Math.min(page * limit, total);
	const pages = generatePages(page, totalPages);

	return (
		<div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-wrap items-center gap-3 text-sm">
				<span className="text-slate-500">
					{total > 0 ? (
						<>
							Menampilkan{" "}
							<strong className="text-slate-700">{from}-{to}</strong>{" "}
							dari{" "}
							<strong className="text-slate-700">{total.toLocaleString("id-ID")}</strong>{" "}
							data
						</>
					) : "Tidak ada data"}
				</span>
				<label className="flex items-center gap-1.5 text-xs text-slate-400">
					Tampil:
					<select
						value={limit}
						onChange={(e) => onLimitChange(Number(e.target.value))}
						disabled={loading}
						className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-60"
					>
						<option value={10}>10</option>
						<option value={20}>20</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</label>
			</div>

			<div className="flex items-center gap-1">
				<button type="button" onClick={() => onPage(1)} disabled={page <= 1 || loading}
					className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" title="Halaman pertama">«
				</button>
				<button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1 || loading}
					className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
					<HiOutlineChevronLeft className="h-3.5 w-3.5" />
				</button>

				{pages.map((p, i) =>
					p === "..." ? (
						<span key={`el-${i}`} className="flex h-7 w-6 items-center justify-center text-xs text-slate-400">...</span>
					) : (
						<button key={p} type="button" onClick={() => onPage(p)} disabled={loading}
							className={cn(
								"flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed",
								p === page
									? "border-blue-500 bg-blue-600 text-white shadow-sm"
									: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
							)}>
							{p}
						</button>
					)
				)}

				<button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages || loading}
					className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
					<HiOutlineChevronRight className="h-3.5 w-3.5" />
				</button>
				<button type="button" onClick={() => onPage(totalPages)} disabled={page >= totalPages || loading}
					className="flex h-7 min-w-[28px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" title="Halaman terakhir">»
				</button>
			</div>
		</div>
	);
}

function MobileCard({ item, idx, startItem, onDetail }) {
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate text-sm font-bold text-slate-800">
						{capitalEachWord(item.full_name) || "-"}
					</p>
					<p className="mt-0.5 text-xs text-slate-400">
						#{startItem + idx} -{" "}
						<span className="font-medium text-slate-500">{item.employee_code || "Tanpa kode"}</span>
					</p>
				</div>
				<button
					type="button"
					onClick={() => onDetail(item.employee_id)}
					className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
				>
					Detail
				</button>
			</div>

			<div className="flex flex-wrap gap-1.5">
				<EmploymentBadge exitDate={item.exit_date} />
				<GenderBadge gender={item.gender} />
			</div>

			<div className="grid grid-cols-1 gap-1.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
				{item.username && (
					<div className="flex items-center gap-2">
						<HiOutlineIdentification className="h-3.5 w-3.5 shrink-0 text-slate-400" />
						<span>{item.username}</span>
					</div>
				)}
				{item.email && (
					<div className="flex items-center gap-2 min-w-0">
						<HiOutlineEnvelope className="h-3.5 w-3.5 shrink-0 text-slate-400" />
						<span className="truncate">{item.email}</span>
					</div>
				)}
				{item.phone_number && (
					<div className="flex items-center gap-2">
						<HiOutlinePhone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
						<span>{item.phone_number}</span>
					</div>
				)}
				{(item.job_level_name || item.position_name) && (
					<div className="flex items-center gap-2">
						<HiOutlineBriefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" />
						<span>{[item.job_level_name, item.position_name].filter(Boolean).join(" - ")}</span>
					</div>
				)}
			</div>

			{item.join_date && (
				<div className="flex items-center gap-1.5 text-xs text-slate-400">
					<HiOutlineCalendarDays className="h-3.5 w-3.5" />
					Bergabung: <strong className="text-slate-600 ml-0.5">{formatDate(item.join_date)}</strong>
				</div>
			)}
		</div>
	);
}

// Main page

export default function KaryawanIKM() {
	const navigate = useNavigate();

	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	// Server-side filter state
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState("full_name");
	const [sortDir, setSortDir] = useState("asc");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [refreshKey, setRefreshKey] = useState(0);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const searchContainerRef = useRef(null);

	// Add modal state
	const [openAddModal, setOpenAddModal] = useState(false);
	const [savingAdd, setSavingAdd] = useState(false);
	const [emailTouched, setEmailTouched] = useState(false);
	const [usernameTouched, setUsernameTouched] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [addForm, setAddForm] = useState({
		full_name: "",
		employee_code: "",
		username: "",
		password: "",
		email: "",
	});

	const autoUsernameFromName = (name) => {
		const firstName =
			String(name || "")
				.trim()
				.split(/\s+/)[0]
				?.toLowerCase()
				.replace(/[^a-z0-9]/g, "") || "karyawan";
		return `${firstName}alora`;
	};

	const autoEmailFromName = (name) => {
		const token =
			String(name || "")
				.trim()
				.split(/\s+/)[0]
				?.toLowerCase()
				.replace(/[^a-z0-9]/g, "") || "karyawan";
		return `${token}@ikmalora.com`;
	};

	useEffect(() => {
		document.title = "Data Karyawan IKM | Alora Group Indonesia";
	}, []);

	// Close suggestion dropdown on outside click
	useEffect(() => {
		if (!showSuggestions) return;
		function handleClick(e) {
			if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
				setShowSuggestions(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [showSuggestions]);

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(searchInput.trim());
			setPage(1);
		}, 350);
		return () => clearTimeout(timer);
	}, [searchInput]);

	// Lock body scroll when modal open
	useEffect(() => {
		if (!openAddModal) return;
		const prevBody = document.body.style.overflow;
		const prevHtml = document.documentElement.style.overflow;
		document.body.style.overflow = "hidden";
		document.documentElement.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prevBody;
			document.documentElement.style.overflow = prevHtml;
		};
	}, [openAddModal]);

	// Fetch employees
	useEffect(() => {
		const fetchEmployees = async () => {
			try {
				setLoading(true);
				setError("");

				const qs = new URLSearchParams();
				qs.set("page", String(page));
				qs.set("limit", String(limit));
				qs.set("sortBy", sortBy);
				qs.set("sortDir", sortDir);
				if (search) qs.set("search", search);

				const response = await api(`/ikm/employees?${qs.toString()}`);
				setRows(response.data || []);
				setTotal(response.pagination?.total || 0);
				setTotalPages(response.pagination?.totalPages || 1);
			} catch (err) {
				setError(err.message || "Gagal memuat data karyawan IKM");
				setRows([]);
			} finally {
				setLoading(false);
			}
		};

		fetchEmployees();
	}, [page, limit, search, sortBy, sortDir, refreshKey]);

	// Derived
	const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
	const activeEmployees = useMemo(() => rows.filter((r) => !r.exit_date).length, [rows]);
	const resignedEmployees = useMemo(() => rows.filter((r) => Boolean(r.exit_date)).length, [rows]);
	const hasActiveSearch = Boolean(search);

	// Handlers
	const handleSort = (col) => {
		if (sortBy === col) {
			setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(col);
			setSortDir("asc");
		}
		setPage(1);
	};

	const handlePage = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

	const handleLimitChange = (newLimit) => {
		setLimit(newLimit);
		setPage(1);
	};

	const resetFilters = () => {
		setSearchInput("");
		setSearch("");
		setSortBy("full_name");
		setSortDir("asc");
		setPage(1);
	};

	const openAdd = () => {
		setError("");
		setOpenAddModal(true);
		setEmailTouched(false);
		setUsernameTouched(false);
		setShowPassword(false);
		setAddForm({ full_name: "", employee_code: "", username: "", password: "", email: "" });
	};

	const closeAdd = () => {
		if (savingAdd) return;
		setOpenAddModal(false);
	};

	const onChangeFullName = (value) => {
		setAddForm((prev) => ({
			...prev,
			full_name: capitalEachWord(value),
			username: usernameTouched ? prev.username : autoUsernameFromName(value),
			email: emailTouched ? prev.email : autoEmailFromName(value),
		}));
	};

	const submitAdd = async (e) => {
		e.preventDefault();
		if (!addForm.full_name.trim()) return setError("Nama wajib diisi");
		if (!addForm.username.trim()) return setError("Username wajib diisi");
		if (!addForm.password.trim()) return setError("Password wajib diisi");
		if (addForm.password.trim().length < 6) return setError("Password minimal 6 karakter");
		if (!addForm.email.trim()) return setError("Email wajib diisi");
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) return setError("Format email tidak valid");

		try {
			setSavingAdd(true);
			setError("");
			await api("/ikm/employees/register", {
				method: "POST",
				body: JSON.stringify({
					full_name: addForm.full_name.trim(),
					employee_code: addForm.employee_code.trim().toUpperCase() || null,
					name: addForm.full_name.trim(),
					username: addForm.username.trim(),
					password: addForm.password,
					email: addForm.email.trim().toLowerCase(),
				}),
			});
			setSuccess("Karyawan baru berhasil ditambahkan.");
			setOpenAddModal(false);
			setPage(1);
			setRefreshKey((k) => k + 1);
			setTimeout(() => setSuccess(""), 2500);
		} catch (err) {
			setError(err.message || "Gagal menambahkan karyawan");
		} finally {
			setSavingAdd(false);
		}
	};

	// Render
	return (
		<>
			<main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
			<div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">

				{/* Hero header */}
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 shadow-sm">
					<div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
					<div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-cyan-300/10 blur-3xl" />

					<div className="relative p-5 sm:p-6 lg:p-8">
						<div className="max-w-3xl">
								<button
									type="button"
									onClick={() => navigate("/portal")}
									className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
								>
									<HiOutlineArrowLeft className="h-4 w-4" />
									Kembali
								</button>

								<h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
									Master Data Karyawan IKM
								</h1>
								<p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
									Kelola data karyawan dengan tampilan yang lebih informatif, filter yang lebih jelas,
									dan aksi cepat untuk membuka detail atau menambahkan akun baru.
								</p>

								<div className="mt-5 flex flex-wrap gap-2">
									<span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
										Total: {total.toLocaleString("id-ID")} data
									</span>
									<span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
										Halaman {page} / {totalPages}
									</span>
								</div>
							</div>
					</div>
				</section>

				{/* Notifications */}
				{success && (
					<div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
						<HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
						<p>{success}</p>
					</div>
				)}
				{error && !openAddModal && (
					<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<p>{error}</p>
					</div>
				)}

				{/* Search bar */}
				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
								<HiOutlineMagnifyingGlass className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-bold text-slate-800">Pencarian Karyawan</p>
								<p className="text-xs text-slate-500">Cari semua kata kunci (nama, username, email, kode, jabatan)</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={() => setRefreshKey((k) => k + 1)}
								className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
							>
								<HiOutlineArrowPath className="h-3.5 w-3.5" />
								Refresh
							</button>
							{hasActiveSearch && (
								<button
									type="button"
									onClick={resetFilters}
									className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
								>
									<HiOutlineXMark className="h-3.5 w-3.5" />
									Bersihkan
								</button>
							)}
							<button
								type="button"
								onClick={openAdd}
								className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
							>
								<HiOutlinePlus className="h-3.5 w-3.5" />
								Tambah Karyawan
							</button>
						</div>
					</div>

					<div className="mt-4">
						<div className="relative" ref={searchContainerRef}>
							<div className="relative">
								<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									value={searchInput}
									onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
									onFocus={() => setShowSuggestions(true)}
									placeholder="Ketik nama karyawan untuk melihat saran..."
									className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
								/>
								{searchInput && (
									<button
										type="button"
										onClick={() => { setSearchInput(""); setShowSuggestions(false); }}
										className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
									>
										<HiOutlineXMark className="h-3.5 w-3.5" />
									</button>
								)}
							</div>

							{/* Autocomplete suggestions dropdown */}
							{showSuggestions && searchInput && rows.length > 0 && (
								<div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
									<div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
										{rows.length} saran ditemukan
									</div>
									{rows.slice(0, 10).map((emp) => (
										<button
											key={emp.employee_id}
											type="button"
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => {
												setSearchInput(emp.full_name || emp.employee_code || "");
												setShowSuggestions(false);
											}}
											className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50"
										>
											<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
												<HiOutlineUser className="h-4 w-4" />
											</div>
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-slate-800">{emp.full_name || "-"}</p>
												<p className="text-xs text-slate-400">
													{[emp.employee_code, emp.job_level_name, emp.position_name].filter(Boolean).join(" · ")}
												</p>
											</div>
											{emp.exit_date ? (
												<span className="ml-auto shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">Resign</span>
											) : (
												<span className="ml-auto shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600">Aktif</span>
											)}
										</button>
									))}
									{rows.length > 10 && (
										<div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-400">
											+{rows.length - 10} lainnya — lihat di tabel di bawah
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</section>

				{/* Employee table */}
				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

					<div className="border-b border-slate-100 px-5 py-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h2 className="text-base font-bold text-slate-800">Daftar Karyawan</h2>
								<p className="mt-0.5 text-xs text-slate-500">
									Tabel interaktif: klik header untuk sortir, gunakan pencarian global untuk menemukan data lebih cepat.
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-1.5 text-[11px]">
								<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-600">
									Aktif: {activeEmployees}
								</span>
								<span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
									Resign: {resignedEmployees}
								</span>
							</div>
						</div>
					</div>

					{/* Desktop table (lg+) */}
					<div className="hidden lg:block overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="border-b border-slate-100 bg-slate-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap w-10">
										No
									</th>
									<SortTh col="employee_code" label="Kode"         sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
									<SortTh col="full_name"     label="Nama"          sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
									<SortTh col="username"      label="Username"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
									<SortTh col="join_date"     label="Bergabung"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
										Telepon
									</th>
									<SortTh col="jabatan"       label="Jabatan"       sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
										Status
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
										Aksi
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading &&
									Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
								}

								{!loading && rows.length === 0 && (
									<tr>
										<td colSpan={9} className="px-4 py-14 text-center">
											<div className="flex flex-col items-center gap-2 text-slate-400">
												<HiOutlineUsers className="h-9 w-9 opacity-40" />
												<p className="text-sm">
													{hasActiveSearch
														? "Tidak ada karyawan yang cocok dengan filter saat ini."
														: "Belum ada data karyawan."}
												</p>
												{hasActiveSearch && (
													<button type="button" onClick={resetFilters} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
														Reset Filter
													</button>
												)}
											</div>
										</td>
									</tr>
								)}

								{!loading && rows.map((item, idx) => (
									<tr
										key={item.employee_id}
										className="align-top transition-colors hover:bg-blue-50/30"
									>
										<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400 font-medium">
											{startItem + idx}
										</td>
										<td className="whitespace-nowrap px-4 py-3">
											{item.employee_code ? (
												<span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-semibold text-slate-600">
													{item.employee_code}
												</span>
											) : (
												<span className="text-slate-300 text-xs">-</span>
											)}
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
													{(item.full_name || "?")[0].toUpperCase()}
												</div>
												<div>
													<p className="text-xs font-bold text-slate-800 whitespace-nowrap">
														{capitalEachWord(item.full_name) || "-"}
													</p>
													{item.email && (
														<p className="text-[11px] text-slate-400 whitespace-nowrap">{item.email}</p>
													)}
												</div>
											</div>
										</td>
										<td className="whitespace-nowrap px-4 py-3">
											{item.username ? (
												<span className="text-xs font-medium text-slate-700">{item.username}</span>
											) : (
												<span className="text-xs italic text-slate-300">-</span>
											)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
											{item.join_date ? (
												<span className="flex items-center gap-1">
													<HiOutlineCalendarDays className="h-3.5 w-3.5 text-slate-300" />
													{formatDate(item.join_date)}
												</span>
											) : (
												<span className="text-slate-300">-</span>
											)}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
											{item.phone_number || <span className="text-slate-300">-</span>}
										</td>
										<td className="whitespace-nowrap px-4 py-3">
											{(item.job_level_name || item.position_name) ? (
												<span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
													<HiOutlineBriefcase className="h-3 w-3 text-slate-400" />
													{[item.job_level_name, item.position_name].filter(Boolean).join(" - ")}
												</span>
											) : (
												<span className="text-slate-300 text-xs">-</span>
											)}
										</td>
										<td className="whitespace-nowrap px-4 py-3">
											<div className="flex flex-col gap-1">
												<EmploymentBadge exitDate={item.exit_date} />
											</div>
										</td>
										<td className="whitespace-nowrap px-4 py-3">
											<button
												type="button"
												onClick={() => navigate(`/karyawan-ikm/${item.employee_id}`, { state: { backTo: "/karyawan-ikm" } })}
												className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
											>
												<HiOutlineEye className="h-3.5 w-3.5" />
												Detail
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Mobile cards (<lg) */}
					<div className="lg:hidden">
						{loading ? (
							<div className="space-y-3 p-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
										<div className="flex justify-between">
											<div className="h-4 w-36 rounded-md bg-slate-200" />
											<div className="h-4 w-20 rounded-md bg-slate-200" />
										</div>
										<div className="flex gap-2">
											<div className="h-5 w-20 rounded-full bg-slate-200" />
											<div className="h-5 w-14 rounded-full bg-slate-200" />
										</div>
										<div className="h-16 rounded-lg bg-slate-200" />
									</div>
								))}
							</div>
						) : rows.length === 0 ? (
							<div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-400">
								<HiOutlineUsers className="h-8 w-8 opacity-40" />
								<p>
									{hasActiveSearch ? "Tidak ada data yang cocok." : "Belum ada data karyawan."}
								</p>
								{hasActiveSearch && (
									<button type="button" onClick={resetFilters} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
										Reset Filter
									</button>
								)}
							</div>
						) : (
							<div className="grid gap-3 p-4 sm:grid-cols-2">
								{rows.map((item, idx) => (
									<MobileCard
										key={item.employee_id}
										item={item}
										idx={idx}
										startItem={startItem}
										onDetail={(id) => navigate(`/karyawan-ikm/${id}`, { state: { backTo: "/karyawan-ikm" } })}
									/>
								))}
							</div>
						)}
					</div>

					{/* Pagination */}
					<PaginationBar
						page={page}
						totalPages={totalPages}
						total={total}
						limit={limit}
						onPage={handlePage}
						onLimitChange={handleLimitChange}
						loading={loading}
					/>
				</section>
			</div>
				</main>

			{/* Add employee modal */}
			{openAddModal && (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-6 sm:items-center sm:p-6">
					<div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={closeAdd} />
					<div className="relative z-10 my-2 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:my-4">
						<div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
							<div className="flex items-start justify-between gap-4">
								<div>
									<div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
										<HiOutlinePlus className="h-4 w-4" />
										Tambah Karyawan
									</div>
									<h3 className="mt-3 text-lg font-bold text-slate-800">Buat akun karyawan baru</h3>
									<p className="mt-1 text-sm text-slate-500">
										Setelah tersimpan, profil lengkap bisa dilanjutkan dari halaman detail.
									</p>
								</div>
								<button type="button" onClick={closeAdd} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
									<HiOutlineXMark className="h-5 w-5" />
								</button>
							</div>
						</div>

						<form onSubmit={submitAdd} className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto px-5 py-5 sm:max-h-[calc(100vh-12rem)]">
							{error && (
								<div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
									<HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
									{error}
								</div>
							)}

							<div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
								<div className="flex items-start gap-2">
									<HiOutlineInformationCircle className="mt-0.5 h-5 w-5 shrink-0" />
									<p>Username dan email akan otomatis terisi dari nama, tapi tetap bisa diedit manual.</p>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<label className="block sm:col-span-2">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Nama Lengkap</span>
									<div className="relative">
										<HiOutlineUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											value={addForm.full_name}
											onChange={(e) => onChangeFullName(e.target.value)}
											placeholder="Masukkan nama lengkap"
											className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
										/>
									</div>
								</label>

								<label className="block">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Kode Karyawan (Opsional)</span>
									<div className="relative">
										<HiOutlineIdentification className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											value={addForm.employee_code}
											onChange={(e) => setAddForm((prev) => ({ ...prev, employee_code: e.target.value.toUpperCase() }))}
											placeholder="Contoh: IKM2024033"
											className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
										/>
									</div>
								</label>

								<label className="block">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Username</span>
									<div className="relative">
										<HiOutlineIdentification className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											value={addForm.username}
											onChange={(e) => { setUsernameTouched(true); setAddForm((prev) => ({ ...prev, username: e.target.value })); }}
											placeholder="Username login"
											className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
										/>
									</div>
								</label>

								<label className="block sm:col-span-2">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email</span>
									<div className="relative">
										<HiOutlineEnvelope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											value={addForm.email}
											onChange={(e) => { setEmailTouched(true); setAddForm((prev) => ({ ...prev, email: e.target.value })); }}
											placeholder="contoh@ikmalora.com"
											className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
										/>
									</div>
								</label>

								<label className="block sm:col-span-2">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Password</span>
									<div className="relative">
										<HiOutlineKey className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											type={showPassword ? "text" : "password"}
											value={addForm.password}
											onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
											placeholder="Minimal 6 karakter"
											className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((p) => !p)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
										>
											{showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
										</button>
									</div>
								</label>
							</div>

							<div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
								<p>Preview kode: <span className="font-semibold text-slate-700">{addForm.employee_code || "-"}</span></p>
								<p>Preview username: <span className="font-semibold text-slate-700">{addForm.username || "-"}</span></p>
								<p>Preview email: <span className="font-semibold text-slate-700">{addForm.email || "-"}</span></p>
							</div>

							<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
								<button type="button" onClick={closeAdd} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
									Batal
								</button>
								<button type="submit" disabled={savingAdd} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
									{savingAdd ? "Menyimpan..." : "Simpan Karyawan"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	);
}
