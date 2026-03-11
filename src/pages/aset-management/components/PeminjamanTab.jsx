// frontend/src/pages/aset-management/components/PeminjamanTab.jsx
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { cn, inputCls, PEMINJAMAN_STATUS, toTitleCase } from "./constants";
import { Field } from "./UIComponents";
import { HiOutlinePlus, HiOutlineHandRaised } from "react-icons/hi2";

export default function PeminjamanTab({ asetId, employees, showToast }) {
    const [data, setData] = useState([]);
    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        peminjam_employee_id: "", tanggal_pinjam: new Date().toISOString().split("T")[0],
        tanggal_kembali_rencana: "", tujuan: "", catatan: "",
    });

    const load = async () => {
        try {
            const d = await api(`/aset/${asetId}/peminjaman`);
            setData(d.peminjaman || []);
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); }, [asetId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.peminjam_employee_id) { showToast("error", "Peminjam wajib dipilih"); return; }
        setSaving(true);
        try {
            await api(`/aset/${asetId}/peminjaman`, { method: "POST", body: JSON.stringify(form) });
            showToast("success", "Peminjaman berhasil dicatat");
            setFormOpen(false);
            setForm({ peminjam_employee_id: "", tanggal_pinjam: new Date().toISOString().split("T")[0], tanggal_kembali_rencana: "", tujuan: "", catatan: "" });
            load();
        } catch (err) { showToast("error", err.message); } finally { setSaving(false); }
    };

    const handleReturn = async (pj) => {
        try {
            await api(`/aset/peminjaman/${pj.id}`, {
                method: "PUT",
                body: JSON.stringify({ tanggal_kembali_aktual: new Date().toISOString().split("T")[0], status: "dikembalikan", catatan: pj.catatan }),
            });
            showToast("success", "Aset dikembalikan");
            load();
        } catch (err) { showToast("error", err.message); }
    };

    const statusColor = {
        dipinjam: "bg-blue-50 text-blue-700 border-blue-200",
        dikembalikan: "bg-emerald-50 text-emerald-700 border-emerald-200",
        terlambat: "bg-amber-50 text-amber-700 border-amber-200",
        hilang: "bg-rose-50 text-rose-700 border-rose-200",
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <HiOutlineHandRaised className="h-4 w-4" /> Peminjaman ({data.length})
                </h4>
                <button onClick={() => setFormOpen(!formOpen)} className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition">
                    <HiOutlinePlus className="h-3.5 w-3.5" /> Pinjamkan
                </button>
            </div>

            {formOpen && (
                <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Peminjam" required>
                            <select className={inputCls} value={form.peminjam_employee_id} onChange={(e) => setForm(p => ({ ...p, peminjam_employee_id: e.target.value }))}>
                                <option value="">— Pilih Peminjam —</option>
                                {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{toTitleCase(e.full_name)}{e.position_name ? ` · ${toTitleCase(e.position_name)}` : ""}</option>)}
                            </select>
                        </Field>
                        <Field label="Tanggal Pinjam" required>
                            <input type="date" className={inputCls} value={form.tanggal_pinjam} onChange={(e) => setForm(p => ({ ...p, tanggal_pinjam: e.target.value }))} />
                        </Field>
                    </div>
                    <Field label="Rencana Tanggal Kembali">
                        <input type="date" className={inputCls} value={form.tanggal_kembali_rencana} onChange={(e) => setForm(p => ({ ...p, tanggal_kembali_rencana: e.target.value }))} />
                    </Field>
                    <Field label="Tujuan Peminjaman">
                        <textarea className={inputCls} value={form.tujuan} onChange={(e) => setForm(p => ({ ...p, tujuan: e.target.value }))} rows={2} placeholder="Tujuan peminjaman..." />
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
                    {data.map(pj => (
                        <div key={pj.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-700">{toTitleCase(pj.peminjam_name)}</span>
                                <div className="flex items-center gap-2">
                                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", statusColor[pj.status])}>
                                        {PEMINJAMAN_STATUS.find(s => s.value === pj.status)?.label || pj.status}
                                    </span>
                                    {pj.status === "dipinjam" && (
                                        <button onClick={() => handleReturn(pj)} className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                                            Kembalikan
                                        </button>
                                    )}
                                </div>
                            </div>
                            {pj.tujuan && <p className="text-[11px] text-slate-500">{pj.tujuan}</p>}
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                <span>Pinjam: {new Date(pj.tanggal_pinjam).toLocaleDateString("id-ID")}</span>
                                {pj.tanggal_kembali_rencana && <span>• Target: {new Date(pj.tanggal_kembali_rencana).toLocaleDateString("id-ID")}</span>}
                                {pj.tanggal_kembali_aktual && <span>• Kembali: {new Date(pj.tanggal_kembali_aktual).toLocaleDateString("id-ID")}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat peminjaman.</p>
            )}
        </div>
    );
}