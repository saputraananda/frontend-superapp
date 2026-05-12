import { useEffect, useState } from "react";
import { HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineMapPin, HiOutlineMagnifyingGlass, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { api } from "../../../lib/api";

function cn(...c) { return c.filter(Boolean).join(" "); }
const inputCls = cn("w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800", "outline-none transition-all placeholder:text-slate-300", "focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400", "hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed");
function Field({ label, required, error, children }) { return (<div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</label>{children}{error && <p className="text-xs text-rose-500">{error}</p>}</div>); }
function Toast({ toast }) { if (!toast) return null; return (<div className={cn("fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl", toast.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}{toast.msg}</div>); }

const EMPTY = { name: "", full_name: "", lat: "", lon: "" };

export default function MasterOutlet() {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [editTarget, setEditTarget] = useState(null);
	const [form, setForm] = useState(EMPTY);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);

	useEffect(() => { document.title = "Master Outlet | Alora Group Indonesia"; }, []);

	const fetchItems = async () => { setLoading(true); try { const r = await api("/outlets"); setItems(r.outlets || []); } catch { showToast("error", "Gagal memuat data outlet"); } finally { setLoading(false); } };
	useEffect(() => { fetchItems(); }, []);

	const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };
	const openAdd = () => { setEditTarget(null); setForm(EMPTY); setErrors({}); setModalOpen(true); };
	const openEdit = (item) => { setEditTarget(item); setForm({ name: item.name, full_name: item.full_name, lat: item.lat ?? "", lon: item.lon ?? "" }); setErrors({}); setModalOpen(true); };
	const closeModal = () => { setModalOpen(false); setEditTarget(null); };
	const validate = () => {
		const e = {};
		if (!form.name?.trim()) e.name = "Nama outlet wajib diisi";
		if (!form.full_name?.trim()) e.full_name = "Nama lengkap wajib diisi";
		if (form.lat !== "" && isNaN(parseFloat(form.lat))) e.lat = "Latitude harus angka";
		if (form.lon !== "" && isNaN(parseFloat(form.lon))) e.lon = "Longitude harus angka";
		setErrors(e); return !Object.keys(e).length;
	};

	const handleSubmit = async (e) => {
		e.preventDefault(); if (!validate()) return; setSaving(true);
		const payload = { name: form.name, full_name: form.full_name, lat: form.lat !== "" ? parseFloat(form.lat) : null, lon: form.lon !== "" ? parseFloat(form.lon) : null };
		try {
			if (editTarget) { await api(`/outlets/${editTarget.id}`, { method: "PUT", body: JSON.stringify(payload) }); showToast("success", "Outlet berhasil diperbarui"); }
			else { await api("/outlets", { method: "POST", body: JSON.stringify(payload) }); showToast("success", "Outlet berhasil ditambahkan"); }
			closeModal(); fetchItems();
		} catch (err) { showToast("error", err?.message || "Terjadi kesalahan"); } finally { setSaving(false); }
	};

	const handleDeleteConfirm = async () => {
		if (!deleteTarget) return;
		try { await api(`/outlets/${deleteTarget.id}`, { method: "DELETE" }); showToast("success", "Outlet berhasil dihapus"); fetchItems(); }
		catch (err) { showToast("error", err?.message || "Gagal menghapus"); } finally { setConfirmOpen(false); setDeleteTarget(null); }
	};

	const filtered = items.filter((a) => (a.name + a.full_name).toLowerCase().includes(search.toLowerCase()));
	const SkeletonRows = () => (<>{Array.from({ length: 5 }).map((_, i) => (<tr key={i} className="border-t border-slate-100 animate-pulse">{[4, 24, 48, 16, 16, 20].map((w, j) => (<td key={j} className="px-5 py-4"><div className={`h-3.5 rounded-md bg-slate-100 w-${w}`} /></td>))}</tr>))}</>);

	return (
		<div className="p-6 pb-14">
			<Toast toast={toast} />
			<ConfirmDialog open={confirmOpen} title="Hapus Outlet" message={`Yakin ingin menghapus outlet "${deleteTarget?.name}"?`} onConfirm={handleDeleteConfirm} onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }} />

			<div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-violet-600 shadow-sm"><HiOutlineMapPin className="h-5 w-5 text-white" /></div>
					<div><h1 className="text-base font-bold text-slate-800 leading-tight">Master Outlet</h1><p className="text-xs text-slate-400 mt-0.5">{items.length} outlet terdaftar di sistem</p></div>
				</div>
				<button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition active:scale-95"><HiOutlineMapPin className="h-4 w-4" /> Tambah Outlet</button>
			</div>

			<div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
				<div className="relative flex-1 max-w-sm"><HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama outlet..." className={cn(inputCls, "pl-10")} /></div>
				<p className="text-sm text-slate-500 shrink-0 sm:ml-auto">Menampilkan <span className="font-semibold text-slate-700">{filtered.length}</span> dari <span className="font-semibold text-slate-700">{items.length}</span></p>
			</div>

			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				{filtered.length === 0 && !loading ? (<div className="flex flex-col items-center justify-center py-20 gap-2"><HiOutlineMapPin className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-400">Tidak ada outlet ditemukan</p></div>) : (
					<div className="overflow-x-auto"><table className="w-full text-sm">
						<thead><tr className="border-b border-slate-100 bg-slate-50/80">{["No", "Nama", "Nama Lengkap", "Lat", "Lon", "Aksi"].map((h, i) => (<th key={h} className={cn("px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider", i === 5 ? "text-right" : "text-left")}>{h}</th>))}</tr></thead>
						<tbody className="divide-y divide-slate-100">{loading ? <SkeletonRows /> : filtered.map((a, i) => (
							<tr key={a.id} className="hover:bg-slate-50/60 transition">
								<td className="px-5 py-4 text-slate-400 text-xs">{i + 1}</td>
								<td className="px-5 py-4 font-semibold text-slate-800">{a.name}</td>
								<td className="px-5 py-4 text-slate-600">{a.full_name}</td>
								<td className="px-5 py-4 text-slate-500 text-xs font-mono">{a.lat ?? <span className="text-slate-300">—</span>}</td>
								<td className="px-5 py-4 text-slate-500 text-xs font-mono">{a.lon ?? <span className="text-slate-300">—</span>}</td>
								<td className="px-5 py-4"><div className="flex items-center justify-end gap-2"><button onClick={() => openEdit(a)} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-100 transition"><HiOutlinePencilSquare className="h-3.5 w-3.5" /> Edit</button><button onClick={() => { setDeleteTarget(a); setConfirmOpen(true); }} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"><HiOutlineTrash className="h-3.5 w-3.5" /> Hapus</button></div></td>
							</tr>
						))}</tbody>
					</table></div>
				)}
			</div>

			{modalOpen && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
					<div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col">
						<div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
							<div className="flex items-center gap-2"><div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-50"><HiOutlineMapPin className="h-4 w-4 text-violet-600" /></div><h2 className="text-base font-bold text-slate-800">{editTarget ? "Edit Outlet" : "Tambah Outlet Baru"}</h2></div>
							<button onClick={closeModal} className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><HiOutlineXMark className="h-4 w-4" /></button>
						</div>
						<form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
							<Field label="Nama Outlet" required error={errors.name}><input className={inputCls} placeholder="SENEN" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
							<Field label="Nama Lengkap" required error={errors.full_name}><input className={inputCls} placeholder="RS Senen Jakarta Pusat" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
							<div className="grid grid-cols-2 gap-3">
								<Field label="Latitude" error={errors.lat}><input className={inputCls} type="number" step="any" placeholder="-6.123456" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></Field>
								<Field label="Longitude" error={errors.lon}><input className={inputCls} type="number" step="any" placeholder="106.123456" value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} /></Field>
							</div>
							<div className="flex gap-3 pt-2"><button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition">{saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Outlet"}</button></div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
