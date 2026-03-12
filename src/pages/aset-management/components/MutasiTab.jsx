// frontend/src/pages/aset-management/components/MutasiTab.jsx
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { inputCls, toTitleCase } from "./constants";
import { Field } from "./UIComponents";
import { HiOutlinePlus, HiOutlineArrowsRightLeft } from "react-icons/hi2";

export default function MutasiTab({ asetId, aset, employees, showToast, onRefresh }) {
    const [data, setData] = useState([]);
    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        tipe: "pindah_lokasi", lokasi_lama: "", lokasi_baru: "",
        pic_lama_id: "", pic_baru_id: "", alasan: "",
        tanggal_mutasi: new Date().toISOString().split("T")[0],
    });

    const load = async () => {
        try {
            const d = await api(`/aset/${asetId}/mutasi`);
            setData(d.mutasi || []);
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); }, [asetId]);

    useEffect(() => {
        if (formOpen && aset) {
            setForm(prev => ({
                ...prev,
                lokasi_lama: aset.lokasi_nama || "",
                pic_lama_id: aset.pic_employee_id ? String(aset.pic_employee_id) : "",
            }));
        }
    }, [formOpen, aset]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const isPindahLokasi = form.tipe === "pindah_lokasi" || form.tipe === "pindah_lokasi_pic";
            const isGantiPic = form.tipe === "ganti_pic" || form.tipe === "pindah_lokasi_pic";

            await api(`/aset/${asetId}/mutasi`, {
                method: "POST",
                body: JSON.stringify({
                    tipe: form.tipe,
                    alasan: form.alasan,
                    tanggal_mutasi: form.tanggal_mutasi,
                    lokasi_lama: isPindahLokasi ? (form.lokasi_lama || aset?.lokasi_nama || null) : null,
                    lokasi_baru: isPindahLokasi ? form.lokasi_baru || null : null,
                    pic_lama_id: isGantiPic ? (form.pic_lama_id || aset?.pic_employee_id || null) : null,
                    pic_baru_id: isGantiPic ? form.pic_baru_id || null : null,
                }),
            });
            showToast("success", "Mutasi berhasil dicatat");
            setFormOpen(false);
            setForm({
                tipe: "pindah_lokasi",
                lokasi_lama: aset?.lokasi_nama || "",     
                lokasi_baru: "",
                pic_lama_id: aset?.pic_employee_id ? String(aset.pic_employee_id) : "", 
                pic_baru_id: "", alasan: "",
                tanggal_mutasi: new Date().toISOString().split("T")[0],
            });
            load();
            onRefresh?.(); 
        } catch (err) {
            showToast("error", err.message);
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <HiOutlineArrowsRightLeft className="h-4 w-4" /> Riwayat Mutasi ({data.length})
                </h4>
                <button onClick={() => setFormOpen(!formOpen)} className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition">
                    <HiOutlinePlus className="h-3.5 w-3.5" /> Tambah Mutasi
                </button>
            </div>

            {formOpen && (
                <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Tipe Mutasi" required>
                            <select className={inputCls} value={form.tipe} onChange={(e) => setForm(p => ({ ...p, tipe: e.target.value }))}>
                                <option value="pindah_lokasi">Pindah Lokasi</option>
                                <option value="ganti_pic">Ganti PIC</option>
                                <option value="pindah_lokasi_pic">Pindah Lokasi & PIC</option>
                            </select>
                        </Field>
                        <Field label="Tanggal Mutasi" required>
                            <input type="date" className={inputCls} value={form.tanggal_mutasi} onChange={(e) => setForm(p => ({ ...p, tanggal_mutasi: e.target.value }))} />
                        </Field>
                    </div>
                    {(form.tipe === "pindah_lokasi" || form.tipe === "pindah_lokasi_pic") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Lokasi Lama">
                                <input className={inputCls} value={form.lokasi_lama}
                                    onChange={(e) => setForm(p => ({ ...p, lokasi_lama: e.target.value }))}
                                    placeholder="Auto dari data aset" />
                            </Field>
                            <Field label="Lokasi Baru" required>
                                <input className={inputCls} value={form.lokasi_baru} onChange={(e) => setForm(p => ({ ...p, lokasi_baru: e.target.value }))} placeholder="Lokasi tujuan" />
                            </Field>
                        </div>
                    )}
                    {(form.tipe === "ganti_pic" || form.tipe === "pindah_lokasi_pic") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="PIC Lama">
                                <select className={inputCls} value={form.pic_lama_id}
                                    onChange={(e) => setForm(p => ({ ...p, pic_lama_id: e.target.value }))}>
                                    <option value="">— PIC Lama —</option>
                                    {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{toTitleCase(e.full_name)}</option>)}
                                </select>
                            </Field>
                            <Field label="PIC Baru" required>
                                <select className={inputCls} value={form.pic_baru_id} onChange={(e) => setForm(p => ({ ...p, pic_baru_id: e.target.value }))}>
                                    <option value="">— Pilih PIC Baru —</option>
                                    {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{toTitleCase(e.full_name)}</option>)}
                                </select>
                            </Field>
                        </div>
                    )}
                    <Field label="Alasan">
                        <textarea className={inputCls} value={form.alasan} onChange={(e) => setForm(p => ({ ...p, alasan: e.target.value }))} rows={2} placeholder="Alasan mutasi..." />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">Batal</button>
                        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                            {saving ? "Menyimpan..." : "Simpan Mutasi"}
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
                                    {m.tipe === "pindah_lokasi" ? "Pindah Lokasi" : m.tipe === "ganti_pic" ? "Ganti PIC" : "Pindah Lokasi & PIC"}
                                </span>
                                <span className="text-[10px] text-slate-400">{new Date(m.tanggal_mutasi).toLocaleDateString("id-ID")}</span>
                            </div>
                            {m.lokasi_lama && (m.tipe === "pindah_lokasi" || m.tipe === "pindah_lokasi_pic") && (
                                <p className="text-[11px] text-slate-500">Lokasi: {m.lokasi_lama} → {m.lokasi_baru}</p>
                            )}
                            {m.pic_lama_name && (m.tipe === "ganti_pic" || m.tipe === "pindah_lokasi_pic") && (
                                <p className="text-[11px] text-slate-500">PIC: {toTitleCase(m.pic_lama_name)} → {toTitleCase(m.pic_baru_name)}</p>
                            )}
                            {m.alasan && <p className="text-[11px] text-slate-400 mt-1">{m.alasan}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">Oleh: {toTitleCase(m.created_by_name)}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat mutasi.</p>
            )}
        </div>
    );
}