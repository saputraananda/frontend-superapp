import { useEffect, useRef, useState } from "react";
import {
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineExclamationTriangle,
	HiOutlineFunnel,
	HiOutlineMagnifyingGlass,
	HiOutlinePencilSquare,
	HiOutlineSquares2X2,
	HiOutlineTrash,
	HiOutlineXCircle,
	HiOutlineXMark,
} from "react-icons/hi2";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { api } from "../../../lib/api";

function cn(...c) {
	return c.filter(Boolean).join(" ");
}

const inputCls = cn(
	"w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
	"outline-none transition-all placeholder:text-slate-300",
	"focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400",
	"hover:border-slate-300",
	"disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
);

const ALL_ROLES = [
	"bod",
	"spv_hr",
	"spv_bdsm",
	"spv_finance",
	"spv_ikm",
	"manager_ikm",
	"finance",
	"hr",
	"bdsm",
	"staff_ikm",
	"admin",
	"employee",
	"unauthorized",
];

const formatRole = (role) =>
	role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const ROLE_BADGE = {
	bod: "bg-violet-100 text-violet-700 border-violet-200",
	finance: "bg-emerald-100 text-emerald-700 border-emerald-200",
	spv_hr: "bg-blue-100 text-blue-700 border-blue-200",
	hr: "bg-cyan-100 text-cyan-700 border-cyan-200",
	spv_bdsm: "bg-indigo-100 text-indigo-700 border-indigo-200",
	spv_finance: "bg-green-100 text-green-700 border-green-200",
	spv_ikm: "bg-amber-100 text-amber-700 border-amber-200",
	manager_ikm: "bg-yellow-100 text-yellow-700 border-yellow-200",
	bdsm: "bg-blue-100 text-blue-700 border-blue-200",
	staff_ikm: "bg-orange-100 text-orange-700 border-orange-200",
	admin: "bg-rose-100 text-rose-700 border-rose-200",
	employee: "bg-slate-100 text-slate-600 border-slate-200",
	unauthorized: "bg-amber-100 text-amber-700 border-amber-200",
};

function Field({ label, required, hint, error, children }) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<label className="text-xs font-semibold text-slate-600">
					{label}
					{required && <span className="ml-0.5 text-rose-500">*</span>}
				</label>
				{hint && <span className="text-xs text-slate-400">{hint}</span>}
			</div>
			{children}
			{error && <p className="text-xs text-rose-500">{error}</p>}
		</div>
	);
}

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
			{toast.msg}
		</div>
	);
}

const EMPTY_FORM = {
	name: "",
	description: "",
	href: "",
	authorization: [],
	is_active: true,
	sort_order: 0,
};

export default function MasterMenu() {
	const [apps, setApps] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
	const statusDropdownRef = useRef(null);

	const [modalOpen, setModalOpen] = useState(false);
	const [editTarget, setEditTarget] = useState(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);

	const [toast, setToast] = useState(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);

	// ── Click outside ─────────────────────────────────────────────────────
	useEffect(() => {
		const handler = (e) => {
			if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
				setStatusDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	useEffect(() => {
		document.title = "Master Menu | Alora Group Indonesia";
	}, []);

	// ── Fetch ──────────────────────────────────────────────────────────────
	const fetchApps = async () => {
		setLoading(true);
		try {
			const res = await api("/menus");
			setApps(res.apps || []);
		} catch {
			showToast("error", "Gagal memuat data menu");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchApps(); }, []);

	// ── Toast ──────────────────────────────────────────────────────────────
	const showToast = (type, msg) => {
		setToast({ type, msg });
		setTimeout(() => setToast(null), 3500);
	};

	// ── Modal ──────────────────────────────────────────────────────────────
	const openAdd = () => {
		setEditTarget(null);
		setForm(EMPTY_FORM);
		setErrors({});
		setModalOpen(true);
	};

	const openEdit = (app) => {
		setEditTarget(app);
		setForm({
			name: app.name,
			description: app.description || "",
			href: app.href,
			authorization: Array.isArray(app.authorization) ? [...app.authorization] : [],
			is_active: Boolean(app.is_active),
			sort_order: app.sort_order ?? 0,
		});
		setErrors({});
		setModalOpen(true);
	};

	const closeModal = () => { setModalOpen(false); setEditTarget(null); };

	// ── Toggle role ────────────────────────────────────────────────────────
	const toggleRole = (role) => {
		setForm((prev) => ({
			...prev,
			authorization: prev.authorization.includes(role)
				? prev.authorization.filter((r) => r !== role)
				: [...prev.authorization, role],
		}));
	};

	// ── Validate ───────────────────────────────────────────────────────────
	const validate = () => {
		const e = {};
		if (!form.name.trim()) e.name = "Nama menu wajib diisi";
		if (!form.href.trim()) e.href = "Path wajib diisi";
		if (form.authorization.length === 0) e.authorization = "Minimal pilih 1 role";
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	// ── Submit ─────────────────────────────────────────────────────────────
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setSaving(true);
		try {
			if (editTarget) {
				await api(`/menus/${editTarget.id}`, { method: "PUT", body: JSON.stringify(form) });
				showToast("success", "Menu berhasil diperbarui");
			} else {
				await api("/menus", { method: "POST", body: JSON.stringify(form) });
				showToast("success", "Menu berhasil ditambahkan");
			}
			closeModal();
			fetchApps();
		} catch (err) {
			showToast("error", err?.message || "Terjadi kesalahan");
		} finally {
			setSaving(false);
		}
	};

	// ── Delete ─────────────────────────────────────────────────────────────
	const handleDeleteClick = (app) => {
		setDeleteTarget(app);
		setConfirmOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!deleteTarget) return;
		try {
			await api(`/menus/${deleteTarget.id}`, { method: "DELETE" });
			showToast("success", "Menu berhasil dihapus");
			fetchApps();
		} catch (err) {
			showToast("error", err?.message || "Gagal menghapus menu");
		} finally {
			setConfirmOpen(false);
			setDeleteTarget(null);
		}
	};

	// ── Filter ─────────────────────────────────────────────────────────────
	const filtered = apps.filter((a) => {
		const matchSearch = [a.name, a.description, a.href]
			.join(" ").toLowerCase()
			.includes(search.toLowerCase());
		const matchStatus =
			filterStatus === "active" ? a.is_active :
				filterStatus === "inactive" ? !a.is_active : true;
		return matchSearch && matchStatus;
	});

	// ── Skeleton ───────────────────────────────────────────────────────────
	const SkeletonRows = () => (
		<>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i} className="border-t border-slate-100 animate-pulse">
					{[4, 20, 32, 20, 40, 8, 10, 16].map((w, j) => (
						<td key={j} className="px-5 py-4">
							<div className={cn("h-3.5 rounded-md bg-slate-100", `w-${w}`)} />
						</td>
					))}
				</tr>
			))}
		</>
	);

	return (
		<div className="p-6 pb-14">
			<Toast toast={toast} />

			<ConfirmDialog
				open={confirmOpen}
				title="Hapus Menu"
				message={`Yakin ingin menghapus menu "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
				onConfirm={handleDeleteConfirm}
				onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
			/>

			{/* ── Page Header ── */}
			<div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-violet-600 shadow-sm">
						<HiOutlineSquares2X2 className="h-5 w-5 text-white" />
					</div>
					<div>
						<h1 className="text-base font-bold text-slate-800 leading-tight">Master Menu</h1>
						<p className="text-xs text-slate-400 mt-0.5">
							{apps.length} menu terdaftar di sistem
						</p>
					</div>
				</div>
				<button
					onClick={openAdd}
					className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition active:scale-95"
				>
					<HiOutlineSquares2X2 className="h-4 w-4" />
					Tambah Menu
				</button>
			</div>

			{/* ── Search + Filter ── */}
			<div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
				<div className="relative flex-1 max-w-sm">
					<HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nama, deskripsi, path..."
						className={cn(inputCls, "pl-10")}
					/>
				</div>

				<div className="relative" ref={statusDropdownRef}>
					<button
						type="button"
						onClick={() => setStatusDropdownOpen((p) => !p)}
						className={cn(
							"flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition shadow-sm",
							filterStatus === "active" && "bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-offset-1 ring-emerald-400/30",
							filterStatus === "inactive" && "bg-rose-50 border-rose-200 text-rose-700 ring-2 ring-offset-1 ring-rose-400/30",
							!filterStatus && "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
						)}
					>
						<HiOutlineFunnel className="h-4 w-4 shrink-0" />
						<span>
							{filterStatus === "active" ? "Aktif" :
								filterStatus === "inactive" ? "Nonaktif" : "Filter Status"}
						</span>
						{filterStatus && (
							<span
								role="button"
								tabIndex={0}
								onClick={(e) => { e.stopPropagation(); setFilterStatus(""); }}
								onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), setFilterStatus(""))}
								className="ml-1 flex items-center justify-center h-4 w-4 rounded-full bg-black/10 hover:bg-black/20 transition"
							>
								<HiOutlineXMark className="h-3 w-3" />
							</span>
						)}
						<HiOutlineChevronDown className={cn(
							"h-4 w-4 shrink-0 transition-transform duration-200",
							statusDropdownOpen && "rotate-180",
						)} />
					</button>

					{statusDropdownOpen && (
						<div className="absolute left-0 top-full mt-2 z-50 w-40 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
							{[
								{ value: "", label: "Semua", dot: "bg-slate-300" },
								{ value: "active", label: "Aktif", dot: "bg-emerald-400" },
								{ value: "inactive", label: "Nonaktif", dot: "bg-rose-400" },
							].map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() => { setFilterStatus(opt.value); setStatusDropdownOpen(false); }}
									className={cn(
										"w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition",
										filterStatus === opt.value ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50",
									)}
								>
									<span className={cn("h-2 w-2 rounded-full shrink-0", opt.dot)} />
									{opt.label}
									{filterStatus === opt.value && (
										<svg className="ml-auto h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
											<path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
										</svg>
									)}
								</button>
							))}
						</div>
					)}
				</div>

				<p className="text-sm text-slate-500 shrink-0 sm:ml-auto">
					Menampilkan{" "}
					<span className="font-semibold text-slate-700">{filtered.length}</span> dari{" "}
					<span className="font-semibold text-slate-700">{apps.length}</span> menu
				</p>
			</div>

			{/* ── Table ── */}
			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				{filtered.length === 0 && !loading ? (
					<div className="flex flex-col items-center justify-center py-20 gap-2">
						<HiOutlineSquares2X2 className="h-10 w-10 text-slate-300" />
						<p className="text-sm text-slate-400">Tidak ada menu ditemukan</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-100 bg-slate-50/80">
									{["No", "Nama", "Deskripsi", "Path", "Authorization", "Order", "Status", "Aksi"].map((h, i) => (
										<th
											key={h}
											className={cn(
												"px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider",
												i === 7 ? "text-right" : "text-left",
											)}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading ? (
									<SkeletonRows />
								) : (
									filtered.map((a, i) => (
										<tr key={a.id} className="hover:bg-slate-50/60 transition">
											<td className="px-5 py-4 text-slate-400 text-xs">{i + 1}</td>
											<td className="px-5 py-4 font-semibold text-slate-800 whitespace-nowrap">{a.name}</td>
											<td className="px-5 py-4 text-slate-500 max-w-[180px] truncate">
												{a.description || <span className="italic text-slate-300">—</span>}
											</td>
											<td className="px-5 py-4">
												<code className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{a.href}</code>
											</td>
											<td className="px-5 py-4">
												<div className="flex flex-wrap gap-1 max-w-[220px]">
													{(Array.isArray(a.authorization) ? a.authorization : []).map((r) => (
														<span
															key={r}
															className={cn(
																"inline-block rounded-full border px-2 py-0.5 text-xs font-semibold",
																ROLE_BADGE[r] || ROLE_BADGE.unauthorized,
															)}
														>
															{formatRole(r)}
														</span>
													))}
												</div>
											</td>
											<td className="px-5 py-4 text-slate-500 text-center text-xs">{a.sort_order}</td>
											<td className="px-5 py-4">
												{a.is_active ? (
													<span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
														<HiOutlineCheckCircle className="h-4 w-4" /> Aktif
													</span>
												) : (
													<span className="flex items-center gap-1 text-xs font-semibold text-rose-500">
														<HiOutlineXCircle className="h-4 w-4" /> Nonaktif
													</span>
												)}
											</td>
											<td className="px-5 py-4">
												<div className="flex items-center justify-end gap-2">
													<button
														onClick={() => openEdit(a)}
														className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-100 transition"
													>
														<HiOutlinePencilSquare className="h-3.5 w-3.5" />
														Edit
													</button>
													<button
														onClick={() => handleDeleteClick(a)}
														className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
													>
														<HiOutlineTrash className="h-3.5 w-3.5" />
														Hapus
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* ── Modal Form ── */}
			{modalOpen && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
					<div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">

						<div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
							<div className="flex items-center gap-2">
								<div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-50">
									<HiOutlineSquares2X2 className="h-4 w-4 text-violet-600" />
								</div>
								<h2 className="text-base font-bold text-slate-800">
									{editTarget ? "Edit Menu" : "Tambah Menu Baru"}
								</h2>
							</div>
							<button
								onClick={closeModal}
								className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
							>
								<HiOutlineXMark className="h-4 w-4" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
							<Field label="Nama Menu" required error={errors.name}>
								<input
									className={inputCls}
									placeholder="Project Management"
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
								/>
							</Field>

							<Field label="Deskripsi" error={errors.description}>
								<input
									className={inputCls}
									placeholder="Deskripsi singkat menu (opsional)"
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
								/>
							</Field>

							<Field label="Path (href)" required hint="contoh: /projectmanagement" error={errors.href}>
								<input
									className={inputCls}
									placeholder="/nama-halaman"
									value={form.href}
									onChange={(e) => setForm({ ...form, href: e.target.value })}
								/>
							</Field>

							<Field
								label="Authorization"
								required
								hint={`${form.authorization.length} dipilih`}
								error={errors.authorization}
							>
								<div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex flex-wrap gap-2">
									{ALL_ROLES.map((r) => {
										const active = form.authorization.includes(r);
										return (
											<button
												key={r}
												type="button"
												onClick={() => toggleRole(r)}
												className={cn(
													"rounded-full border px-3 py-1 text-xs font-semibold transition",
													active
														? cn(ROLE_BADGE[r], "ring-2 ring-offset-1 ring-violet-400/40")
														: "bg-white border-slate-200 text-slate-400 hover:border-slate-300",
												)}
											>
												{active && <span className="mr-1">✓</span>}
											{formatRole(r)}
											</button>
										);
									})}
								</div>
							</Field>

							<div className="grid grid-cols-2 gap-4">
								<Field label="Sort Order" error={errors.sort_order}>
									<input
										type="number"
										className={inputCls}
										value={form.sort_order}
										onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
										min={0}
									/>
								</Field>

								<Field label="Status">
									<div className="flex items-center gap-3 h-[42px]">
										<button
											type="button"
											onClick={() => setForm({ ...form, is_active: !form.is_active })}
											className={cn(
												"relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
												form.is_active ? "bg-emerald-500" : "bg-slate-200",
											)}
										>
											<span className={cn(
												"inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
												form.is_active ? "translate-x-5" : "translate-x-0",
											)} />
										</button>
										<span className={cn(
											"text-sm font-semibold",
											form.is_active ? "text-emerald-600" : "text-slate-400",
										)}>
											{form.is_active ? "Aktif" : "Nonaktif"}
										</span>
									</div>
								</Field>
							</div>

							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={closeModal}
									className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={saving}
									className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition"
								>
									{saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Menu"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
