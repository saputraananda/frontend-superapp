import { useEffect, useRef, useState } from "react";
import { HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineExclamationTriangle, HiOutlineFunnel, HiOutlineIdentification, HiOutlineMagnifyingGlass, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineXCircle, HiOutlineXMark } from "react-icons/hi2";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { api } from "../../../lib/api";

function cn(...c) { return c.filter(Boolean).join(" "); }
const inputCls = cn("w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800", "outline-none transition-all placeholder:text-slate-300", "focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400", "hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed");
function Field({ label, required, error, children }) { return (<div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-600">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</label>{children}{error && <p className="text-xs text-rose-500">{error}</p>}</div>); }
function Toast({ toast }) { if (!toast) return null; return (<div className={cn("fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl", toast.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}{toast.msg}</div>); }

const EMPTY = { company_code: "", position_name: "", is_active: true };
const STATUS_OPTS = [{ value: "", label: "Semua", dot: "bg-slate-300" }, { value: "active", label: "Aktif", dot: "bg-emerald-400" }, { value: "inactive", label: "Nonaktif", dot: "bg-rose-400" }];

export default function MasterPosition() {
	const [items, setItems] = useState([]);
	const [companies, setCompanies] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [statusOpen, setStatusOpen] = useState(false);
	const statusRef = useRef(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [editTarget, setEditTarget] = useState(null);
	const [form, setForm] = useState(EMPTY);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);

	useEffect(() => { const h = (e) => { if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
	useEffect(() => { document.title = "Master Jabatan | Alora Group Indonesia"; }, []);

	const fetchItems = async () => { setLoading(true); try { const r = await api("/positions"); setItems(r.positions || []); } catch { showToast("error", "Gagal memuat data jabatan"); } finally { setLoading(false); } };
	const fetchCompanies = async () => { try { const r = await api("/companies"); setCompanies((r.companies || []).filter(c => c.is_active)); } catch { /* silently fail */ } };
	useEffect(() => { fetchItems(); fetchCompanies(); }, []);

	const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };
	const openAdd = () => { setEditTarget(null); setForm(EMPTY); setErrors({}); setModalOpen(true); };
	const openEdit = (item) => { setEditTarget(item); setForm({ company_code: item.company_code, position_name: item.position_name, is_active: Boolean(item.is_active) }); setErrors({}); setModalOpen(true); };
	const closeModal = () => { setModalOpen(false); setEditTarget(null); };
	const validate = () => {
		const e = {};
		if (!form.company_code) e.company_code = "Company wajib dipilih";
		if (!form.position_name?.trim()) e.position_name = "Nama jabatan wajib diisi";
		setErrors(e); return !Object.keys(e).length;
	};

	const handleSubmit = async (e) => {
		e.preventDefault(); if (!validate()) return; setSaving(true);
		try {
			if (editTarget) { await api(`/positions/${editTarget.position_id}`, { method: "PUT", body: JSON.stringify(form) }); showToast("success", "Jabatan berhasil diperbarui"); }
			else { await api("/positions", { method: "POST", body: JSON.stringify(form) }); showToast("success", "Jabatan berhasil ditambahkan"); }
			closeModal(); fetchItems();
		} catch (err) { showToast("error", err?.message || "Terjadi kesalahan"); } finally { setSaving(false); }
	};

	const handleDeleteConfirm = async () => {
		if (!deleteTarget) return;
		try { await api(`/positions/${deleteTarget.position_id}`, { method: "DELETE" }); showToast("success", "Jabatan berhasil dihapus"); fetchItems(); }
		catch (err) { showToast("error", err?.message || "Gagal menghapus"); } finally { setConfirmOpen(false); setDeleteTarget(null); }
	};

	const filtered = items.filter((a) => {
		const s = (a.position_name + (a.company_code || "")).toLowerCase().includes(search.toLowerCase());
		const st = filterStatus === "active" ? a.is_active : filterStatus === "inactive" ? !a.is_active : true;
		return s && st;
	});
	const SkeletonRows = () => (<>{Array.from({ length: 5 }).map((_, i) => (<tr key={i} className="border-t border-slate-100 animate-pulse">{[4, 20, 48, 14, 20].map((w, j) => (<td key={j} className="px-5 py-4"><div className={`h-3.5 rounded-md bg-slate-100 w-${w}`} /></td>))}</tr>))}</>);

	return (
		<div className="p-6 pb-14">
			<Toast toast={toast} />
			<ConfirmDialog open={confirmOpen} title="Hapus Jabatan" message={`Yakin ingin menghapus jabatan "${deleteTarget?.position_name}"?`} onConfirm={handleDeleteConfirm} onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }} />

			<div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-violet-600 shadow-sm"><HiOutlineIdentification className="h-5 w-5 text-white" /></div>
					<div><h1 className="text-base font-bold text-slate-800 leading-tight">Master Jabatan</h1><p className="text-xs text-slate-400 mt-0.5">{items.length} jabatan terdaftar di sistem</p></div>
				</div>
				<button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition active:scale-95"><HiOutlineIdentification className="h-4 w-4" /> Tambah Jabatan</button>
			</div>

			<div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
				<div className="relative flex-1 max-w-sm"><HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari jabatan..." className={cn(inputCls, "pl-10")} /></div>
				<div className="relative" ref={statusRef}>
					<button type="button" onClick={() => setStatusOpen(p => !p)} className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition shadow-sm", filterStatus === "active" && "bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-offset-1 ring-emerald-400/30", filterStatus === "inactive" && "bg-rose-50 border-rose-200 text-rose-700 ring-2 ring-offset-1 ring-rose-400/30", !filterStatus && "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
						<HiOutlineFunnel className="h-4 w-4 shrink-0" /><span>{filterStatus === "active" ? "Aktif" : filterStatus === "inactive" ? "Nonaktif" : "Filter Status"}</span>
						{filterStatus && (<span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setFilterStatus(""); }} onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), setFilterStatus(""))} className="ml-1 flex items-center justify-center h-4 w-4 rounded-full bg-black/10 hover:bg-black/20 transition"><HiOutlineXMark className="h-3 w-3" /></span>)}
						<HiOutlineChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", statusOpen && "rotate-180")} />
					</button>
					{statusOpen && (<div className="absolute left-0 top-full mt-2 z-50 w-40 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">{STATUS_OPTS.map((opt) => (<button key={opt.value} type="button" onClick={() => { setFilterStatus(opt.value); setStatusOpen(false); }} className={cn("w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition", filterStatus === opt.value ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50")}><span className={cn("h-2 w-2 rounded-full shrink-0", opt.dot)} />{opt.label}{filterStatus === opt.value && <svg className="ml-auto h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}</button>))}</div>)}
				</div>
				<p className="text-sm text-slate-500 shrink-0 sm:ml-auto">Menampilkan <span className="font-semibold text-slate-700">{filtered.length}</span> dari <span className="font-semibold text-slate-700">{items.length}</span></p>
			</div>

			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				{filtered.length === 0 && !loading ? (<div className="flex flex-col items-center justify-center py-20 gap-2"><HiOutlineIdentification className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-400">Tidak ada data ditemukan</p></div>) : (
					<div className="overflow-x-auto"><table className="w-full text-sm">
						<thead><tr className="border-b border-slate-100 bg-slate-50/80">{["No", "Kode Company", "Nama Jabatan", "Status", "Aksi"].map((h, i) => (<th key={h} className={cn("px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider", i === 4 ? "text-right" : "text-left")}>{h}</th>))}</tr></thead>
						<tbody className="divide-y divide-slate-100">{loading ? <SkeletonRows /> : filtered.map((a, i) => (
							<tr key={a.position_id} className="hover:bg-slate-50/60 transition">
								<td className="px-5 py-4 text-slate-400 text-xs">{i + 1}</td>
								<td className="px-5 py-4"><span className="inline-flex items-center rounded-md bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 border border-violet-200 tracking-wide">{a.company_code}</span></td>
								<td className="px-5 py-4 font-semibold text-slate-800">{a.position_name}</td>
								<td className="px-5 py-4">{a.is_active ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><HiOutlineCheckCircle className="h-4 w-4" /> Aktif</span> : <span className="flex items-center gap-1 text-xs font-semibold text-rose-500"><HiOutlineXCircle className="h-4 w-4" /> Nonaktif</span>}</td>
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
							<div className="flex items-center gap-2"><div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-50"><HiOutlineIdentification className="h-4 w-4 text-violet-600" /></div><h2 className="text-base font-bold text-slate-800">{editTarget ? "Edit Jabatan" : "Tambah Jabatan"}</h2></div>
							<button onClick={closeModal} className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><HiOutlineXMark className="h-4 w-4" /></button>
						</div>
						<form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
							<Field label="Company" required error={errors.company_code}>
								<select className={inputCls} value={form.company_code} onChange={(e) => setForm({ ...form, company_code: e.target.value })}>
									<option value="">-- Pilih Company --</option>
									{companies.map(c => <option key={c.company_id} value={c.company_code}>{c.company_code} — {c.company_name}</option>)}
								</select>
							</Field>
							<Field label="Nama Jabatan" required error={errors.position_name}><input className={inputCls} placeholder="Finance Manager / IT Staff" value={form.position_name} onChange={(e) => setForm({ ...form, position_name: e.target.value })} /></Field>
							<Field label="Status"><div className="flex items-center gap-3 h-[42px]"><button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })} className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors", form.is_active ? "bg-emerald-500" : "bg-slate-200")}><span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", form.is_active ? "translate-x-5" : "translate-x-0")} /></button><span className={cn("text-sm font-semibold", form.is_active ? "text-emerald-600" : "text-slate-400")}>{form.is_active ? "Aktif" : "Nonaktif"}</span></div></Field>
							<div className="flex gap-3 pt-2"><button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition">{saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah"}</button></div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
