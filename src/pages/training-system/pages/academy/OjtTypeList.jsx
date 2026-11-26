import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineClipboardDocumentCheck, HiOutlinePencilSquare, HiOutlinePlus } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, cn, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner, StatusBadge } from "./ui";

const BASE = "/training-management-system/academy";

// Jenis OJT = baris di bawah master (misalnya Packing Kiloan). mode "master": kelola jenis. mode "batch": pilih jenis untuk melihat batch-nya.
export default function OjtTypeList({ mode = "master" }) {
  const { masterId } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const isBatch = mode === "batch";
  const [master, setMaster] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [masterName, setMasterName] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api("/academy/ojt-masters"), api(`/academy/ojt/criteria?master_id=${masterId}`)])
      .then(([masters, types]) => {
        const current = masters.data.find((m) => m.id === Number(masterId)) ?? null;
        setMaster(current);
        setMasterName(current?.name ?? "");
        setRows(types.data);
      })
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [masterId, version, showToast]);

  const send = async (path, method, body) => {
    try {
      await api(path, { method, body: body ? JSON.stringify(body) : undefined });
      setVersion((v) => v + 1);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const renameMaster = (e) => {
    e.preventDefault();
    send(`/academy/ojt-masters/${masterId}`, "PUT", { name: masterName, is_active: master.is_active });
  };

  const createType = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api("/academy/ojt/criteria", { method: "POST", body: JSON.stringify({ name, master_id: Number(masterId) }) });
      navigate(`${BASE}/ojt-master/jenis/${res.id}`);
    } catch (err) {
      showToast(err.message, "error");
      setSaving(false);
    }
  };

  const removeType = (row) => {
    if (window.confirm(`Hapus jenis ${row.name}?`)) send(`/academy/ojt/criteria/${row.id}`, "DELETE");
  };

  const removeMaster = async () => {
    if (!window.confirm(`Hapus master ${master.name}?`)) return;
    try {
      await api(`/academy/ojt-masters/${masterId}`, { method: "DELETE" });
      navigate(`${BASE}/ojt-master`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(`${BASE}/${isBatch ? "ojt" : "ojt-master"}`)}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-slate-50"
    >
      <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
    </button>
  );

  return (
    <PageShell
      icon={HiOutlineClipboardDocumentCheck}
      title={master?.name ?? (isBatch ? "OJT" : "Master OJT")}
      subtitle={isBatch ? "Pilih jenis OJT untuk melihat batch" : "Jenis OJT di dalam master ini"}
      action={backButton}
      toast={toast}
    >
      {!isBatch && master && (
        <>
          <form onSubmit={renameMaster} className={cn(cardCls, "flex flex-col gap-3 sm:flex-row")}>
            <input
              value={masterName}
              onChange={(e) => setMasterName(e.target.value)}
              maxLength={150}
              aria-label="Nama master"
              className={inputCls}
            />
            <button type="submit" disabled={!masterName.trim() || masterName.trim() === master.name} className={cn(primaryBtnCls, "shrink-0")}>
              Simpan Nama
            </button>
            {rows.length === 0 && (
              <button type="button" onClick={removeMaster} className={cn(ghostBtnCls, "shrink-0 text-rose-600")}>
                Hapus Master
              </button>
            )}
          </form>

          <form onSubmit={createType} className={cn(cardCls, "flex flex-col gap-3 sm:flex-row")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama jenis OJT baru, misalnya Packing Kiloan"
              aria-label="Nama jenis OJT baru"
              maxLength={200}
              className={inputCls}
            />
            <button type="submit" disabled={saving || !name.trim()} className={cn(primaryBtnCls, "shrink-0")}>
              <HiOutlinePlus className="h-4 w-4" /> Tambah Jenis
            </button>
          </form>
        </>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4 text-center">{isBatch ? "Batch" : "Sub-skill aktif"}</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-xs text-slate-400">
                    Belum ada jenis OJT
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const activeCount = row.subskills.filter((s) => s.is_active).length;
                  return (
                    <tr key={row.id} className="transition hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{row.name}</span>
                        {!isBatch && activeCount === 0 && <p className="mt-1 text-xs text-amber-600">Belum bisa dipakai untuk batch OJT</p>}
                      </td>
                      <td className="px-6 py-4 text-center">{isBatch ? row.batch_count : activeCount}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge active={row.is_active} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`${BASE}/${isBatch ? "ojt/type" : "ojt-master/jenis"}/${row.id}`)}
                            className={ghostBtnCls}
                          >
                            <HiOutlinePencilSquare className="h-4 w-4" /> {isBatch ? "Buka" : "Kelola"}
                          </button>
                          {!isBatch &&
                            (row.subskills.length === 0 && row.batch_count === 0 ? (
                              <button type="button" onClick={() => removeType(row)} className={cn(ghostBtnCls, "text-rose-600")}>
                                Hapus
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => send(`/academy/ojt/criteria/${row.id}`, "PUT", { is_active: !row.is_active })}
                                className={ghostBtnCls}
                              >
                                {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
