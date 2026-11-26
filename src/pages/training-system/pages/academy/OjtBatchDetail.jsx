import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineClipboardDocumentCheck } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, fmtDate, ghostBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";
import { PhaseBadge } from "./OjtList";

const BASE = "/training-management-system/academy/ojt";

export default function OjtBatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [batch, setBatch] = useState(null);

  useEffect(() => {
    api(`/academy/ojt-batches/${id}`)
      .then((res) => setBatch(res.data))
      .catch((err) => showToast(err.message, "error"));
  }, [id, showToast]);

  return (
    <PageShell
      icon={HiOutlineClipboardDocumentCheck}
      title={batch ? `${batch.master_name} · ${batch.type_name} · Batch ${batch.batch_no}` : "Batch OJT"}
      subtitle={batch ? `${fmtDate(batch.start_date)} - ${fmtDate(batch.end_date)} · ${batch.days} hari` : ""}
      toast={toast}
      action={
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(batch ? `${BASE}/type/${batch.criterion_id}` : BASE)} className={ghostBtnCls}>
            Kembali
          </button>
          {batch?.is_active && (
            <button type="button" onClick={() => navigate(`${BASE}/batch/${id}/edit`)} className={ghostBtnCls}>
              Kelola
            </button>
          )}
        </div>
      }
    >
      {!batch ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Status</p>
              <div className="mt-2">
                {batch.is_active ? (
                  <PhaseBadge phase={batch.phase} />
                ) : (
                  <span className="text-sm font-bold text-slate-500">Nonaktif</span>
                )}
              </div>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Batch training</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{batch.training_batch_label ?? "Tidak terikat training"}</p>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Pemantau</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {batch.observer_scope === "PERSON" ? "Per peserta (data lama)" : batch.observers.map((o) => o.full_name).join(", ") || "-"}
              </p>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Jenis OJT</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{batch.type_name}</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Peserta</th>
                    {batch.observer_scope === "PERSON" && <th className="px-6 py-4">Pemantau</th>}
                    <th className="px-6 py-4 text-center">Penilaian</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batch.participants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-xs text-slate-400">
                        Belum ada peserta
                      </td>
                    </tr>
                  ) : (
                    batch.participants.map((p) => (
                      <tr key={p.ojt_id} className="transition hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-800">{p.full_name}</td>
                        {batch.observer_scope === "PERSON" && <td className="px-6 py-4 text-xs">{p.observers.join(", ") || "-"}</td>}
                        <td className="px-6 py-4 text-center">
                          {p.scored_count} dari {p.total_count}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <PhaseBadge phase={p.phase} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button type="button" onClick={() => navigate(`${BASE}/${p.ojt_id}`)} className={ghostBtnCls}>
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}
