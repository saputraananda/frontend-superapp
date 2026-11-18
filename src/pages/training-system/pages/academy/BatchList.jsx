import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineCalendarDays, HiOutlinePlus } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { SOURCE_LABEL, cn, fmtDatetime, ghostBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

function BatchStatus({ row }) {
  const [label, cls] =
    row.status === "CANCELLED"
      ? ["Dibatalkan", "border-slate-200 bg-slate-100 text-slate-500"]
      : row.started
        ? ["Berjalan", "border-indigo-200 bg-indigo-50 text-indigo-700"]
        : ["Terjadwal", "border-amber-200 bg-amber-50 text-amber-700"];
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap", cls)}>{label}</span>;
}

export default function BatchList() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/academy/batches")
      .then((res) => setRows(res.data))
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <PageShell
      icon={HiOutlineCalendarDays}
      title="Batch Training"
      subtitle="Jadwal, peserta, kehadiran, dan penilaian mentor"
      toast={toast}
      action={
        <button
          type="button"
          onClick={() => navigate("/training-management-system/academy/batches/new")}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-slate-50"
        >
          <HiOutlinePlus className="h-4 w-4" /> Buat Batch
        </button>
      }
    >
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Training</th>
                <th className="px-6 py-4 text-center">Mulai</th>
                <th className="px-6 py-4 text-center">Sumber</th>
                <th className="px-6 py-4 text-center">Peserta</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-slate-400">
                    Belum ada batch
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <span className="block font-bold text-slate-800">{row.training_name}</span>
                      <span className="text-xs text-slate-400">Versi {row.version_no}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">{fmtDatetime(row.start_at)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="block text-xs font-bold text-slate-600">{SOURCE_LABEL[row.source]}</span>
                      <span className="text-xs text-slate-400">{row.request_code ?? row.position_name ?? ""}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.participant_count}
                      <span className="block text-xs text-slate-400">{row.scored_count} sudah dinilai</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <BatchStatus row={row} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/training-management-system/academy/batches/${row.id}`)}
                        className={ghostBtnCls}
                      >
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
    </PageShell>
  );
}
