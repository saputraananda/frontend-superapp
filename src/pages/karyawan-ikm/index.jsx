import { useEffect, useMemo, useState } from "react";
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
	HiOutlineAdjustmentsHorizontal,
	HiOutlineCheckCircle,
	HiOutlineSparkles,
	HiOutlineEye,
	HiOutlineEyeSlash,
	HiOutlineInformationCircle,
} from "react-icons/hi2";
import HeaderLayout from "../../layouts/HeaderLayout";
import { api } from "../../lib/api";

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

function MetricCard({ icon: Icon, label, value, helper }) {
	return (
		<div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">{label}</p>
					<p className="mt-2 text-2xl font-bold text-white">{value}</p>
					<p className="mt-1 text-xs text-white/75">{helper}</p>
				</div>
				<div className="rounded-xl bg-white/15 p-2.5 text-white">
					<Icon className="h-5 w-5" />
				</div>
			</div>
		</div>
	);
}

export default function KaryawanIKM({ user, onLogout }) {
	const navigate = useNavigate();

	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState("full_name");
	const [sortDir, setSortDir] = useState("asc");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [refreshKey, setRefreshKey] = useState(0);

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

	const jobTitle =
		user?.employee?.job_level_name || user?.employee?.position || user?.role || "Employee";

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

	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(searchInput.trim());
			setPage(1);
		}, 350);
		return () => clearTimeout(timer);
	}, [searchInput]);

	useEffect(() => {
		if (!openAddModal) return;

		const previousBodyOverflow = document.body.style.overflow;
		const previousHtmlOverflow = document.documentElement.style.overflow;

		document.body.style.overflow = "hidden";
		document.documentElement.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousBodyOverflow;
			document.documentElement.style.overflow = previousHtmlOverflow;
		};
	}, [openAddModal]);

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

	const totalLabel = useMemo(() => `${total} data`, [total]);

	const visibleCount = rows.length;
	const accountCount = useMemo(
		() => rows.filter((item) => Boolean(item.username || item.email)).length,
		[rows]
	);
	const incompleteCount = useMemo(
		() =>
			rows.filter(
				(item) =>
					!item.employee_code ||
					!item.company_name ||
					(!item.job_level_name && !item.position_name)
			).length,
		[rows]
	);

	const activeFilters = useMemo(
		() => [search ? `Pencarian: "${search}"` : null].filter(Boolean),
		[search]
	);

	const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
	const endItem = Math.min(page * limit, total);

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

	const handleBack = () => {
		navigate("/portal");
	};

	const resetFilters = () => {
		setSearchInput("");
		setSearch("");
		setSortBy("full_name");
		setSortDir("asc");
		setPage(1);
	};

	const onChangeFullName = (value) => {
		setAddForm((prev) => ({
			...prev,
			full_name: capitalEachWord(value),
			username: usernameTouched ? prev.username : autoUsernameFromName(value),
			email: emailTouched ? prev.email : autoEmailFromName(value),
		}));
	};

	const handleSort = (column) => {
		if (sortBy === column) {
			setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(column);
			setSortDir("asc");
		}
		setPage(1);
	};

	const submitAdd = async (e) => {
		e.preventDefault();

		if (!addForm.full_name.trim()) return setError("Nama wajib diisi");
		if (!addForm.username.trim()) return setError("Username wajib diisi");
		if (!addForm.password.trim()) return setError("Password wajib diisi");
		if (addForm.password.trim().length < 6) return setError("Password minimal 6 karakter");
		if (!addForm.email.trim()) return setError("Email wajib diisi");

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(addForm.email.trim())) return setError("Format email tidak valid");

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

	return (
		<HeaderLayout user={user} jobTitle={jobTitle} onLogout={onLogout}>
			<div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 shadow-sm">
					<div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
					<div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-cyan-300/10 blur-3xl" />

					<div className="relative p-5 sm:p-6 lg:p-8">
						<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
							<div className="max-w-3xl">
								<button
									type="button"
									onClick={handleBack}
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
										Total: {totalLabel}
									</span>
									<span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
										Halaman {page} / {totalPages}
									</span>
									<span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
										Tampil {visibleCount} data
									</span>
								</div>
							</div>

							<div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-xl">
								<MetricCard
									icon={HiOutlineUsers}
									label="Total Data"
									value={total}
									helper="Jumlah seluruh data karyawan"
								/>
								<MetricCard
									icon={HiOutlineCheckCircle}
									label="Data Ditampilkan"
									value={visibleCount}
									helper="Jumlah baris di halaman aktif"
								/>
								<MetricCard
									icon={HiOutlineIdentification}
									label="Punya Akun"
									value={accountCount}
									helper="Username atau email sudah tersedia"
								/>
								<MetricCard
									icon={HiOutlineInformationCircle}
									label="Perlu Dilengkapi"
									value={incompleteCount}
									helper="Masih ada field penting yang kosong"
								/>
							</div>
						</div>
					</div>
				</section>

				{success && (
					<div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
						<HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
						<p>{success}</p>
					</div>
				)}

				{error && (
					<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<p>{error}</p>
					</div>
				)}

				<section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
								<HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
								Filter Utama
							</div>
							<h2 className="mt-3 text-lg font-bold text-slate-800">Temukan data lebih cepat</h2>
							<p className="mt-1 text-sm text-slate-500">
								Filter difokuskan ke pencarian agar proses cari data lebih cepat.
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={() => setRefreshKey((k) => k + 1)}
								className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
							>
								<HiOutlineArrowPath className="h-4 w-4" />
								Refresh
							</button>
							<button
								type="button"
								onClick={resetFilters}
								className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
							>
								Reset Filter
							</button>
							<button
								type="button"
								onClick={openAdd}
								className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
							>
								<HiOutlinePlus className="h-4 w-4" />
								Tambah Karyawan
							</button>
						</div>
					</div>

					<div className="mt-5">
						<label className="relative block">
							<HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
							<input
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Cari nama, username, email, kode..."
								className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
							/>
						</label>
					</div>

					{activeFilters.length > 0 && (
						<div className="mt-4 flex flex-wrap gap-2">
							{activeFilters.map((item) => (
								<span
									key={item}
									className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
								>
									{item}
								</span>
							))}
						</div>
					)}
				</section>

				<section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-100 px-5 py-4">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<h2 className="text-lg font-bold text-slate-800">Daftar Karyawan</h2>
								<p className="mt-1 text-sm text-slate-500">
									Menampilkan <span className="font-semibold text-slate-700">{startItem}</span>-
									<span className="font-semibold text-slate-700">{endItem}</span> dari{" "}
									<span className="font-semibold text-slate-700">{total}</span> data.
								</p>
							</div>

							<div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-600">
								Halaman <span className="font-semibold text-slate-800">{page}</span> dari{" "}
								<span className="font-semibold text-slate-800">{totalPages}</span>
							</div>
						</div>
					</div>

					<div className="lg:hidden">
						{loading && (
							<div className="p-4">
								<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
									Memuat data karyawan...
								</div>
							</div>
						)}

						{!loading && rows.length === 0 && (
							<div className="p-4">
								<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
									Tidak ada data yang cocok dengan filter saat ini.
								</div>
							</div>
						)}

						{!loading && rows.length > 0 && (
							<div className="grid gap-3 p-4">
								{rows.map((item, idx) => (
									<div
										key={item.employee_id}
										className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="text-base font-bold text-slate-800">{capitalEachWord(item.full_name) || "-"}</p>
												<p className="mt-1 text-xs text-slate-500">
													No. {startItem + idx} • {item.employee_code || "Tanpa kode"}
												</p>
											</div>
											<button
												type="button"
												onClick={() =>
													navigate(`/karyawan-ikm/${item.employee_id}`, {
														state: { backTo: "/karyawan-ikm" },
													})
												}
												className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
											>
												Detail
											</button>
										</div>

										<div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600">
											<div className="flex items-center gap-2">
												<HiOutlineIdentification className="h-4 w-4 text-slate-400" />
												<span>{item.username || "-"}</span>
											</div>
											<div className="flex items-center gap-2">
												<HiOutlineEnvelope className="h-4 w-4 text-slate-400" />
												<span>{item.email || "-"}</span>
											</div>
											<div className="flex items-center gap-2">
												<HiOutlinePhone className="h-4 w-4 text-slate-400" />
												<span>{item.phone_number || "-"}</span>
											</div>
											<div className="flex items-center gap-2">
												<HiOutlineBriefcase className="h-4 w-4 text-slate-400" />
												<span>
													{[item.job_level_name, item.position_name].filter(Boolean).join(" ") || "-"}
												</span>
											</div>
										</div>

										<div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
											Join Date: <span className="font-medium text-slate-700">{formatDate(item.join_date)}</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="hidden overflow-x-auto lg:block">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-50 text-slate-500">
								<tr>
									<th className="px-4 py-3 text-left font-semibold">No</th>
									<th className="px-4 py-3 text-left font-semibold">Kode</th>
									<th className="px-4 py-3 text-left font-semibold">
										<button
											type="button"
											onClick={() => handleSort("full_name")}
											className="inline-flex w-full items-center gap-2 text-left"
											title="Klik untuk urut Nama"
										>
											<span>Nama</span>
											<span
												className={`text-xs font-bold ${
													sortBy === "full_name" ? "text-blue-700" : "text-slate-400"
												}`}
											>
												{sortBy === "full_name" ? (sortDir === "asc" ? "^" : "v") : "^v"}
											</span>
										</button>
									</th>
									<th className="px-4 py-3 text-left font-semibold">Username</th>
									<th className="px-4 py-3 text-left font-semibold">Email</th>
									<th className="px-4 py-3 text-left font-semibold">No. Telepon</th>
									<th className="px-4 py-3 text-left font-semibold">
										<button
											type="button"
											onClick={() => handleSort("jabatan")}
											className="inline-flex w-full items-center gap-2 text-left"
											title="Klik untuk urut Jabatan"
										>
											<span>Jabatan</span>
											<span
												className={`text-xs font-bold ${
													sortBy === "jabatan" ? "text-blue-700" : "text-slate-400"
												}`}
											>
												{sortBy === "jabatan" ? (sortDir === "asc" ? "^" : "v") : "^v"}
											</span>
										</button>
									</th>
									<th className="px-4 py-3 text-left font-semibold">Join Date</th>
									<th className="px-4 py-3 text-left font-semibold">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{loading && (
									<tr>
										<td colSpan={9} className="px-4 py-10 text-center text-slate-500">
											Memuat data karyawan...
										</td>
									</tr>
								)}

								{!loading && rows.length === 0 && (
									<tr>
										<td colSpan={9} className="px-4 py-10 text-center text-slate-500">
											Tidak ada data yang cocok dengan filter saat ini.
										</td>
									</tr>
								)}

								{!loading &&
									rows.map((item, idx) => (
										<tr
											key={item.employee_id}
											className="border-t border-slate-100 transition hover:bg-slate-50/80"
										>
											<td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">
												{startItem + idx}
											</td>
											<td className="whitespace-nowrap px-4 py-4 text-slate-600">
												<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
													<HiOutlineIdentification className="h-4 w-4 text-slate-400" />
													{item.employee_code || "-"}
												</span>
											</td>
											<td className="px-4 py-4 text-slate-700">{capitalEachWord(item.full_name) || "-"}</td>
											<td className="whitespace-nowrap px-4 py-4 text-slate-600">
												{item.username || "-"}
											</td>
											<td className="whitespace-nowrap px-4 py-4 text-slate-600">
												{item.email || "-"}
											</td>
											<td className="whitespace-nowrap px-4 py-4 text-slate-600">
												{item.phone_number || "-"}
											</td>
											<td className="whitespace-nowrap px-4 py-4 text-slate-600">
												<span className="inline-flex items-center gap-1.5">
													<HiOutlineBriefcase className="h-4 w-4 text-slate-400" />
													{[item.job_level_name, item.position_name].filter(Boolean).join(" ") || "-"}
												</span>
											</td>
											<td className="whitespace-nowrap px-4 py-4 text-slate-600">
												{formatDate(item.join_date)}
											</td>
											<td className="whitespace-nowrap px-4 py-4">
												<button
													type="button"
													onClick={() =>
														navigate(`/karyawan-ikm/${item.employee_id}`, {
															state: { backTo: "/karyawan-ikm" },
														})
													}
													className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
												>
													Detail
												</button>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>

					<div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
						<div className="text-slate-500">
							Menampilkan <span className="font-semibold text-slate-700">{limit}</span> data per halaman
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<select
								value={limit}
								onChange={(e) => {
									setLimit(Number(e.target.value));
									setPage(1);
								}}
								className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
							>
								<option value={10}>10 / halaman</option>
								<option value={20}>20 / halaman</option>
								<option value={50}>50 / halaman</option>
							</select>

							<button
								type="button"
								onClick={() => setPage((p) => Math.max(p - 1, 1))}
								disabled={page <= 1 || loading}
								className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Sebelumnya
							</button>

							<button
								type="button"
								onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
								disabled={page >= totalPages || loading}
								className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Berikutnya
							</button>
						</div>
					</div>
				</section>
			</div>

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

								<button
									type="button"
									onClick={closeAdd}
									className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
								>
									<HiOutlineXMark className="h-5 w-5" />
								</button>
							</div>
						</div>

						<form onSubmit={submitAdd} className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto px-5 py-5 sm:max-h-[calc(100vh-12rem)]">
							<div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
								<div className="flex items-start gap-2">
									<HiOutlineInformationCircle className="mt-0.5 h-5 w-5 shrink-0" />
									<p>
										Username dan email akan otomatis terisi dari nama, tapi tetap bisa diedit manual.
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<label className="block sm:col-span-2">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
										Nama Lengkap
									</span>
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
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
										Kode Karyawan (Opsional)
									</span>
									<div className="relative">
										<HiOutlineIdentification className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											value={addForm.employee_code}
											onChange={(e) =>
												setAddForm((prev) => ({
													...prev,
													employee_code: e.target.value.toUpperCase(),
												}))
											}
											placeholder="Contoh: IKM2024033"
											className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
										/>
									</div>
								</label>

								<label className="block">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
										Username
									</span>
									<div className="relative">
										<HiOutlineIdentification className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											value={addForm.username}
											onChange={(e) => {
												setUsernameTouched(true);
												setAddForm((prev) => ({ ...prev, username: e.target.value }));
											}}
											placeholder="Username login"
											className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
										/>
									</div>
								</label>

								<label className="block sm:col-span-2">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
										Email
									</span>
									<div className="relative">
										<HiOutlineEnvelope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											value={addForm.email}
											onChange={(e) => {
												setEmailTouched(true);
												setAddForm((prev) => ({ ...prev, email: e.target.value }));
											}}
											placeholder="contoh@ikmalora.com"
											className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
										/>
									</div>
								</label>

								<label className="block sm:col-span-2">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
										Password
									</span>
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
											onClick={() => setShowPassword((prev) => !prev)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
										>
											{showPassword ? (
												<HiOutlineEyeSlash className="h-5 w-5" />
											) : (
												<HiOutlineEye className="h-5 w-5" />
											)}
										</button>
									</div>
								</label>
							</div>

							<div className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
								<p>
									Preview kode: <span className="font-semibold text-slate-700">{addForm.employee_code || "-"}</span>
								</p>
								<p>
									Preview username:{" "}
									<span className="font-semibold text-slate-700">{addForm.username || "-"}</span>
								</p>
								<p>
									Preview email:{" "}
									<span className="font-semibold text-slate-700">{addForm.email || "-"}</span>
								</p>
							</div>

							<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
								<button
									type="button"
									onClick={closeAdd}
									className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={savingAdd}
									className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
								>
									{savingAdd ? "Menyimpan..." : "Simpan Karyawan"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</HeaderLayout>
	);
}