// frontend/src/pages/aset-management/components/MaintenanceTab.jsx
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { cn, inputCls, MAINTENANCE_TIPE, MAINTENANCE_STATUS, toTitleCase } from "./constants";
import { Field } from "./UIComponents";
import { HiOutlinePlus, HiOutlineWrenchScrewdriver } from "react-icons/hi2";

export default function MaintenanceTab({ asetId, showToast }) {
    const [data, setData] = useState([]);
    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        tipe: "perbaikan", deskripsi: "", tanggal_mulai: new Date().toISOString().split("T")[0],
        tanggal_selesai: "", biaya: "", vendor: "", status: "dijadwalkan", catatan: "",
    });

    const load = async () => {
        try {
            const d = await api(`/aset/${asetId}/maintenance`);
            setData(d.maintenance || []);
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); }, [asetId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.deskripsi.trim()) { showToast("error", "Deskripsi wajib diisi"); return; }
        setSaving(true);
        try {
            await api(`/aset/${asetId}/maintenance`, { method: "POST", body: JSON.stringify(form) });
            showToast("success", "Maintenance berhasil dicatat");
            setFormOpen(false);
            setForm({ tipe: "perbaikan", deskripsi: "", tanggal_mulai: new Date().toISOString().split("T")[0], tanggal_selesai: "", biaya: "", vendor: "", status: "dijadwalkan", catatan: "" });
            load();
        } catch (err) { showToast("error", err.message); } finally { setSaving(false); }
    };

    const statusColor = {
        dijadwalkan: "bg-blue-50 text-blue-700 border-blue-200",
        dalam_proses: "bg-amber-50 text-amber-700 border-amber-200",
        selesai: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dibatalkan: "bg-slate-100 text-slate-500 border-slate-200",
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <HiOutlineWrenchScrewdriver className="h-4 w-4" /> Riwayat Maintenance ({data.length})
                </h4>
                <button onClick={() => setFormOpen(!formOpen)} className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition">
                    <HiOutlinePlus className="h-3.5 w-3.5" /> Tambah
                </button>
            </div>

            {formOpen && (
                <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Tipe" required>
                            <select className={inputCls} value={form.tipe} onChange={(e) => setForm(p => ({ ...p, tipe: e.target.value }))}>
                                {MAINTENANCE_TIPE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Status">
                            <select className={inputCls} value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}>
                                {MAINTENANCE_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Deskripsi" required>
                        <textarea className={inputCls} value={form.deskripsi} onChange={(e) => setForm(p => ({ ...p, deskripsi: e.target.value }))} rows={2} placeholder="Deskripsi pekerjaan..." />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Tanggal Mulai" required>
                            <input type="date" className={inputCls} value={form.tanggal_mulai} onChange={(e) => setForm(p => ({ ...p, tanggal_mulai: e.target.value }))} />
                        </Field>
                        <Field label="Tanggal Selesai">
                            <input type="date" className={inputCls} value={form.tanggal_selesai} onChange={(e) => setForm(p => ({ ...p, tanggal_selesai: e.target.value }))} />
                        </Field>
                        <Field label="Biaya (Rp)">
                            <input type="number" className={inputCls} value={form.biaya} onChange={(e) => setForm(p => ({ ...p, biaya: e.target.value }))} placeholder="0" />
                        </Field>
                    </div>
                    <Field label="Vendor / Pihak Ketiga">
                        <input className={inputCls} value={form.vendor} onChange={(e) => setForm(p => ({ ...p, vendor: e.target.value }))} placeholder="Nama vendor" />
                    </Field>
                    <Field label="Catatan">
                        <textarea className={inputCls} value={form.catatan} onChange={(e) => setForm(p => ({ ...p, catatan: e.target.value }))} rows={2} placeholder="Catatan tambahan..." />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Batal</button>
                        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                            {saving ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            )}

            {data.length > 0 ? (
                <div className="space-y-2">
                    {data.map(m => (
                        <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-700">
                                    {MAINTENANCE_TIPE.find(t => t.value === m.tipe)?.label || m.tipe}
                                </span>
                                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", statusColor[m.status])}>
                                    {MAINTENANCE_STATUS.find(s => s.value === m.status)?.label || m.status}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-600">{m.deskripsi}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                <span>{new Date(m.tanggal_mulai).toLocaleDateString("id-ID")}{m.tanggal_selesai ? ` — ${new Date(m.tanggal_selesai).toLocaleDateString("id-ID")}` : ""}</span>
                                {m.vendor && <span>• {m.vendor}</span>}
                                {m.biaya > 0 && <span>• Rp {Number(m.biaya).toLocaleString("id-ID")}</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Oleh: {toTitleCase(m.created_by_name)}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat maintenance.</p>
            )}
        </div>
    );
}