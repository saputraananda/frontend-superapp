import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineBookOpen,
  HiOutlineCalendarDays,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTag,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner, StatusBadge } from "./ui";

const BASE = "/training-management-system/academy";

// mode "training": kelola jenis di dalam master. mode "batch" dan "topic": pilih jenis untuk melihat batch atau mengelola topiknya.
export default function TrainingTypeList({ mode = "training" }) {
  const { masterId } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const isBatch = mode === "batch";
  const isTopic = mode === "topic";
  const readOnly = isBatch || isTopic;
  const section = { training: "trainings", batch: "batches", topic: "topics" }[mode];
  const [master, setMaster] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [masters, trainings] = await Promise.all([api("/academy/masters"), api(`/academy/trainings?master_id=${masterId}`)]);
      setMaster(masters.data.find((m) => m.id === Number(masterId)) ?? null);
      setRows(trainings.data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [masterId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api("/academy/trainings", { method: "POST", body: JSON.stringify({ name, master_id: Number(masterId) }) });
      navigate(`${BASE}/trainings/${res.id}`);
    } catch (err) {
      showToast(err.message, "error");
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await api(`/academy/trainings/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: row.name, is_active: !row.is_active }),
      });
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(`${BASE}/${section}`)}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-slate-50"
    >
      <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
    </button>
  );

  return (
    <PageShell
      icon={isBatch ? HiOutlineCalendarDays : isTopic ? HiOutlineTag : HiOutlineBookOpen}
      title={master?.name ?? (isBatch ? "Batch Training" : isTopic ? "Master Topik" : "Master Training")}
      subtitle={
        isBatch
          ? "Pilih jenis training untuk melihat batch"
          : isTopic
            ? "Pilih jenis training untuk mengelola topiknya"
            : "Jenis training di dalam master ini"
      }
      action={backButton}
      toast={toast}
    >
      {!readOnly && (
        <form onSubmit={create} className={`${cardCls} flex flex-col gap-3 sm:flex-row`}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama jenis training baru"
            aria-label="Nama jenis training baru"
            maxLength={150}
            className={inputCls}
          />
          <button type="submit" disabled={saving || !name.trim()} className={`${primaryBtnCls} shrink-0`}>
            <HiOutlinePlus className="h-4 w-4" /> Tambah Jenis
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4 text-center">{isBatch ? "Batch" : "Topik"}</th>
                {!readOnly && <th className="px-6 py-4 text-center">Versi</th>}
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
                    Belum ada jenis training
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-800">{row.name}</td>
                    <td className="px-6 py-4 text-center">{isBatch ? row.batch_count : row.topic_count}</td>
                    {!readOnly && <td className="px-6 py-4 text-center">{row.version_no}</td>}
                    <td className="px-6 py-4 text-center">
                      <StatusBadge active={row.is_active} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              isBatch
                                ? `${BASE}/batches/type/${row.id}`
                                : isTopic
                                  ? `${BASE}/topics/jenis/${row.id}`
                                  : `${BASE}/trainings/${row.id}`,
                            )
                          }
                          className={ghostBtnCls}
                        >
                          <HiOutlinePencilSquare className="h-4 w-4" /> {readOnly ? "Buka" : "Kelola"}
                        </button>
                        {!readOnly && (
                          <button type="button" onClick={() => toggleActive(row)} className={ghostBtnCls}>
                            {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        )}
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
