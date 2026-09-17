import { useEffect, useState } from "react";
import { HiOutlineSun, HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";

function cn(...c) { return c.filter(Boolean).join(" "); }

const EMPTY = { policy_id: null, outlet_id: "", role_id: "", max_days_per_month: 4, min_notice_days: 1, allow_past_date_request: 0, is_active: 1, notes: "" };

export default function DayOffPolicy() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (m, t = "success") => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api("/waschen/day-off-policies");
      setRows(res.data || []);
    } catch (err) { showToast(err.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setModalOpen(true); };
  const openEdit = (row) => {
    setForm({
      ...row,
      outlet_id: row.outlet_id ?? "",
      role_id: row.role_id ?? "",
      allow_past_date_request: Number(row.allow_past_date_request),
      is_active: Number(row.is_active),
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        outlet_id: form.outlet_id || null,
        role_id: form.role_id || null,
        max_days_per_month: Number(form.max_days_per_month),
        min_notice_days: Number(form.min_notice_days),
      };
      if (form.policy_id) {
        await api(`/waschen/day-off-policies/${form.policy_id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Rules libur diperbarui");
      } else {
        await api("/waschen/day-off-policies", { method: "POST", body: JSON.stringify(payload) });
        showToast("Rules libur ditambahkan");
      }
      setModalOpen(false);
      load();
    } catch (err) { showToast(err.message, "error"); } finally { setSubmitting(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Hapus rules libur ini?")) return;
    try {
      await api(`/waschen/day-off-policies/${id}`, { method: "DELETE" });
      showToast("Dihapus");
      load();
    } catch (err) { showToast(err.message, "error"); }
  };

  return (
    <div className="space-y-5 pb-10">
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Rules Libur</h1>
          <p className="mt-2 text-sm text-white/75">Kebijakan kuota jadwal libur karyawan (mst_day_off_policy)</p>
        </div>
      </PageHero>

      <div className="flex justify-end">
        <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[#5f1340] px-4 py-2 text-sm font-bold text-white"><HiOutlinePlus className="h-4 w-4" /> Tambah Rules</button>
      </div>

      <div className="rounded-2xl border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr>
            <th className="px-4 py-3 text-left">Outlet</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-center">Max/Bulan</th><th className="px-4 py-3 text-center">Min H-x</th><th className="px-4 py-3 text-center">Lampau</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Aksi</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat...</td></tr>
              : rows.map((r) => (
                <tr key={r.policy_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{r.outlet_id ?? "Global"}</td>
                  <td className="px-4 py-3">{r.role_id ?? "Semua"}</td>
                  <td className="px-4 py-3 text-center font-bold">{r.max_days_per_month}</td>
                  <td className="px-4 py-3 text-center">{r.min_notice_days}</td>
                  <td className="px-4 py-3 text-center">{Number(r.allow_past_date_request) ? "Ya" : "Tidak"}</td>
                  <td className="px-4 py-3"><span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", Number(r.is_active) ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500")}>{Number(r.is_active) ? "Aktif" : "Nonaktif"}</span></td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button type="button" onClick={() => openEdit(r)} className="rounded border p-1.5"><HiOutlinePencilSquare className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(r.policy_id)} className="rounded border p-1.5 text-red-600"><HiOutlineTrash className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3">
            <div className="flex justify-between items-center"><h3 className="font-bold">{form.policy_id ? "Edit" : "Tambah"} Rules Libur</h3><button type="button" onClick={() => setModalOpen(false)}><HiOutlineXMark className="h-5 w-5" /></button></div>
            <label className="block text-xs font-semibold text-slate-500">Max hari libur / bulan<input type="number" min={1} max={31} value={form.max_days_per_month} onChange={(e) => setForm({ ...form, max_days_per_month: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
            <label className="block text-xs font-semibold text-slate-500">Minimal notice (H-x)<input type="number" min={0} max={30} value={form.min_notice_days} onChange={(e) => setForm({ ...form, min_notice_days: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Number(form.allow_past_date_request) === 1} onChange={(e) => setForm({ ...form, allow_past_date_request: e.target.checked ? 1 : 0 })} /> Izinkan permintaan tanggal lampau</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Number(form.is_active) === 1} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} /> Aktif</label>
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Catatan" className="w-full rounded-lg border p-2 text-sm" />
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#5f1340] py-2.5 text-sm font-bold text-white">Simpan</button>
          </form>
        </div>
      )}
      {toast && <div className={cn("fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg", toast.type === "error" ? "bg-red-600" : "bg-emerald-600")}>{toast.message}</div>}
    </div>
  );
}
