// frontend/src/pages/aset-management/components/PenghapusanTab.jsx
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { cn, inputCls, PENGHAPUSAN_TIPE, toTitleCase } from "./constants";
import { Field } from "./UIComponents";
import { HiOutlinePlus, HiOutlineArchiveBoxXMark } from "react-icons/hi2";

export default function PenghapusanTab({ asetId, showToast, onAsetUpdated }) {
    const [data, setData] = useState([]);
    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        tipe: "disposal", alasan: "", tanggal_penghapusan: new Date().toISOString().split("T")[0], nilai_sisa: "",
    });

    const load = async () => {
        try {
            const d = await api(`/aset/${asetId}/penghapusan`);
            setData(d.penghapusan || []);
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); }, [asetId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.alasan.trim()) { showToast("error", "Alasan wajib diisi"); return; }
        setSaving(true);
        try {
            await api(`/aset/${asetId}/penghapusan`, { method: "POST", body: JSON.stringify(form) });
            showToast("success", "Penghapusan aset berhasil dicatat");
            setFormOpen(false);
            setForm({ tipe: "disposal", alasan: "", tanggal_penghapusan: new Date().toISOString().split("T")[0], nilai_sisa: "" });
            load();
            if (onAsetUpdated) onAsetUpdated();
        } catch (err) { showToast("error", err.message); } finally { setSaving(false); }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <HiOutlineArchiveBoxXMark className="h-4 w-4" /> Penghapusan / Disposal ({data.length})
                </h4>
                <button onClick={() => setFormOpen(!formOpen)} className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition">
                    <HiOutlinePlus className="h-3.5 w-3.5" /> Ajukan
                </button>
            </div>

            {formOpen && (
                <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Tipe" required>
                            <select className={inputCls} value={form.tipe} onChange={(e) => setForm(p => ({ ...p, tipe: e.target.value }))}>
                                {PENGHAPUSAN_TIPE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Tanggal" required>
                            <input type="date" className={inputCls} value={form.tanggal_penghapusan} onChange={(e) => setForm(p => ({ ...p, tanggal_penghapusan: e.target.value }))} />
                        </Field>
                    </div>
                    <Field label="Alasan" required>
                        <textarea className={inputCls} value={form.alasan} onChange={(e) => setForm(p => ({ ...p, alasan: e.target.value }))} rows={2} placeholder="Alasan penghapusan/disposal..." />
                    </Field>
                    <Field label="Nilai Sisa (Rp)">
                        <input type="number" className={inputCls} value={form.nilai_sisa} onChange={(e) => setForm(p => ({ ...p, nilai_sisa: e.target.value }))} placeholder="0" />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Batal</button>
                        <button type="submit" disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition">
                            {saving ? "Menyimpan..." : "Ajukan Penghapusan"}
                        </button>
                    </div>
                </form>
            )}

            {data.length > 0 ? (
                <div className="space-y-2">
                    {data.map(pg => (
                        <div key={pg.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-700">
                                    {PENGHAPUSAN_TIPE.find(t => t.value === pg.tipe)?.label || pg.tipe}
                                </span>
                                <span className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                    pg.status === "selesai" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    pg.status === "ditolak" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                    "bg-amber-50 text-amber-700 border-amber-200"
                                )}>
                                    {pg.status === "diajukan" ? "Diajukan" : pg.status === "disetujui" ? "Disetujui" : pg.status === "ditolak" ? "Ditolak" : "Selesai"}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-600">{pg.alasan}</p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                <span>{new Date(pg.tanggal_penghapusan).toLocaleDateString("id-ID")}</span>
                                {pg.nilai_sisa > 0 && <span>• Nilai sisa: Rp {Number(pg.nilai_sisa).toLocaleString("id-ID")}</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Oleh: {toTitleCase(pg.created_by_name)}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat penghapusan.</p>
            )}
        </div>
    );
}