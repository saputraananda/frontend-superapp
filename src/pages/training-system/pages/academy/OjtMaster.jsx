import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineClipboardDocumentCheck, HiOutlinePencilSquare, HiOutlinePlus } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, cn, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner, StatusBadge } from "./ui";

const BASE = "/training-management-system/academy";

// mode "master": kelola master OJT. mode "batch": pilih master untuk melihat batch OJT.
export default function OjtMaster({ mode = "master" }) {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const isBatch = mode === "batch";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/academy/ojt-masters");
      setRows(res.data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api("/academy/ojt-masters", { method: "POST", body: JSON.stringify({ name }) });
      navigate(`${BASE}/ojt-master/master/${res.id}`);
    } catch (err) {
      showToast(err.message, "error");
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await api(`/academy/ojt-masters/${row.id}`, { method: "PUT", body: JSON.stringify({ name: row.name, is_active: !row.is_active }) });
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Hapus master ${row.name}?`)) return;
    try {
      await api(`/academy/ojt-masters/${row.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <PageShell
      icon={HiOutlineClipboardDocumentCheck}
      title={isBatch ? "OJT" : "Master OJT"}
      subtitle={
        isBatch
          ? "Pilih master, lalu jenis OJT untuk melihat batch"
          : "Master berisi jenis OJT. Kriteria dan sub-skill penilaian ada di tiap jenis"
      }
      toast={toast}
    >
      {!isBatch && (
        <form onSubmit={create} className={cn(cardCls, "flex flex-col gap-3 sm:flex-row")}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama master OJT baru"
            aria-label="Nama master OJT baru"
            maxLength={150}
            className={inputCls}
          />
          <button type="submit" disabled={saving || !name.trim()} className={cn(primaryBtnCls, "shrink-0")}>
            <HiOutlinePlus className="h-4 w-4" /> Tambah Master
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Master</th>
                <th className="px-6 py-4 text-center">Jenis</th>
                <th className="px-6 py-4 text-center">Batch</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-xs text-slate-400">
                    Belum ada master OJT
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-800">{row.name}</td>
                    <td className="px-6 py-4 text-center">{row.type_count}</td>
                    <td className="px-6 py-4 text-center">{row.batch_count}</td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge active={row.is_active} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`${BASE}/${isBatch ? "ojt" : "ojt-master"}/master/${row.id}`)}
                          className={ghostBtnCls}
                        >
                          <HiOutlinePencilSquare className="h-4 w-4" /> {isBatch ? "Buka" : "Kelola"}
                        </button>
                        {!isBatch &&
                          (row.type_count === 0 ? (
                            <button type="button" onClick={() => remove(row)} className={cn(ghostBtnCls, "text-rose-600")}>
                              Hapus
                            </button>
                          ) : (
                            <button type="button" onClick={() => toggleActive(row)} className={ghostBtnCls}>
                              {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
