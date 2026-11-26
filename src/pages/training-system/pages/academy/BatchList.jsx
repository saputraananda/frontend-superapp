import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineCalendarDays, HiOutlinePlus } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cn, fmtDatetime, ghostBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

const BASE = "/training-management-system/academy";

function BatchStatus({ row }) {
  const [label, cls] =
    row.status === "CANCELLED"
      ? ["Dibatalkan", "border-slate-200 bg-slate-100 text-slate-500"]
      : row.started
        ? ["Berjalan", "border-indigo-200 bg-indigo-50 text-indigo-700"]
        : ["Terjadwal", "border-amber-200 bg-amber-50 text-amber-700"];
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap", cls)}>{label}</span>;
}

// Daftar batch satu jenis training: Batch 1, 2, 3 dengan tanggal pelaksanaan dan jumlah peserta.
export default function BatchList() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [training, setTraining] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api(`/academy/trainings/${trainingId}`), api(`/academy/batches?training_id=${trainingId}`)])
      .then(([detail, batches]) => {
        setTraining(detail.data);
        setRows(batches.data);
      })
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [trainingId, showToast]);

  const buttonCls =
    "inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-slate-50";

  return (
    <PageShell
      icon={HiOutlineCalendarDays}
      title={training ? `${training.master_name} · ${training.name}` : "Batch Training"}
      subtitle="Jadwal, peserta, kehadiran, dan penilaian mentor"
      toast={toast}
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(training ? `${BASE}/batches/master/${training.master_id}` : `${BASE}/batches`)}
            className={buttonCls}
          >
            <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <button type="button" onClick={() => navigate(`${BASE}/batches/new?training_id=${trainingId}`)} className={buttonCls}>
            <HiOutlinePlus className="h-4 w-4" /> Buat Batch
          </button>
        </div>
      }
    >
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Batch</th>
                <th className="px-6 py-4 text-center">Tanggal pelaksanaan</th>
                <th className="px-6 py-4 text-center">Peserta</th>
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
                    Belum ada batch
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <span className="block font-bold text-slate-800">Batch {row.batch_no}</span>
                      <span className="text-xs text-slate-400">Versi {row.version_no}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">{fmtDatetime(row.start_at)}</td>
                    <td className="px-6 py-4 text-center">
                      {row.participant_count}
                      <span className="block text-xs text-slate-400">{row.scored_count} sudah dinilai</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <BatchStatus row={row} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => navigate(`${BASE}/batches/${row.id}`)} className={ghostBtnCls}>
                          Detail
                        </button>
                        {row.status !== "CANCELLED" && !row.started && (
                          <button type="button" onClick={() => navigate(`${BASE}/batches/${row.id}/edit`)} className={ghostBtnCls}>
                            Kelola
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
