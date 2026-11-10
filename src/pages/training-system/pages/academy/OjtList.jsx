import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineClipboardDocumentCheck,
  HiOutlineMinus,
  HiOutlinePlus,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { OJT_PHASE, cn, fmt, fmtDate, ghostBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

export function PhaseBadge({ phase }) {
  const meta = OJT_PHASE[phase];
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap", meta.cls)}>{meta.label}</span>;
}

// Naik, Turun, dan Tetap memakai ikon dan teks, bukan hanya warna.
const PROGRESS = {
  NAIK: { label: "Naik", Icon: HiOutlineArrowTrendingUp, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  TURUN: { label: "Turun", Icon: HiOutlineArrowTrendingDown, cls: "border-rose-200 bg-rose-50 text-rose-700" },
  TETAP: { label: "Tetap", Icon: HiOutlineMinus, cls: "border-slate-200 bg-slate-100 text-slate-600" },
};

/** progress: NAIK, TURUN, TETAP, atau null kalau hari terakhir belum dinilai. */
export function ProgressBadge({ progress }) {
  const meta = PROGRESS[progress];
  if (!meta) return <span className="text-xs text-slate-400">Belum ada</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap", meta.cls)}>
      <meta.Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export default function OjtList() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/academy/ojt")
      .then((res) => setRows(res.data))
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <PageShell
      icon={HiOutlineClipboardDocumentCheck}
      title="OJT"
      subtitle="Karyawan yang sedang atau sudah on job training, beserta nilai dan kemajuannya"
      toast={toast}
      action={
        <button
          type="button"
          onClick={() => navigate("/training-management-system/academy/ojt/new")}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-amber-50"
        >
          <HiOutlinePlus className="h-4 w-4" /> Mulai OJT
        </button>
      }
    >
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4 text-center">Periode</th>
                <th className="px-6 py-4 text-center">Penilaian</th>
                <th className="px-6 py-4 text-center">Nilai OJT</th>
                <th className="px-6 py-4 text-center">Kemajuan</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-xs text-slate-400">
                    Belum ada OJT
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <span className="block font-bold text-slate-800">{row.full_name}</span>
                      <span className="text-xs text-slate-400">{row.training_name}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {fmtDate(row.start_date)} - {fmtDate(row.end_date)}
                      <span className="block text-xs text-slate-400">{row.days} hari</span>
                    </td>
                    <td className="px-6 py-4 text-center">{row.scored_days} dari 2</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800">{fmt(row.average)}</td>
                    <td className="px-6 py-4 text-center">
                      <ProgressBadge progress={row.progress} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PhaseBadge phase={row.phase} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/training-management-system/academy/ojt/${row.id}`)}
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
