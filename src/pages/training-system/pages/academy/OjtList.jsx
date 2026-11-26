import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineClipboardDocumentCheck,
  HiOutlineMinus,
  HiOutlinePlus,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { OJT_PHASE, cn, fmtDate, ghostBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

const BASE = "/training-management-system/academy";

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

const buttonCls =
  "inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-amber-50";

// Daftar batch OJT satu jenis: Batch 1, 2, 3 dengan tanggal pelaksanaan dan jumlah peserta.
export default function OjtList() {
  const { typeId } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [type, setType] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    Promise.all([api(`/academy/ojt/criteria/${typeId}`), api(`/academy/ojt-batches?criterion_id=${typeId}`)])
      .then(([detail, batches]) => {
        setType(detail.data);
        setRows(batches.data);
      })
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [typeId, version, showToast]);

  const send = async (path, method, body) => {
    try {
      await api(path, { method, body: body ? JSON.stringify(body) : undefined });
      setVersion((v) => v + 1);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const remove = (row) => {
    if (window.confirm(`Hapus Batch ${row.batch_no}?`)) send(`/academy/ojt-batches/${row.id}`, "DELETE");
  };

  return (
    <PageShell
      icon={HiOutlineClipboardDocumentCheck}
      title={type ? `${type.master_name} · ${type.name}` : "OJT"}
      subtitle="Batch OJT: tanggal pelaksanaan, peserta, pemantau, dan penilaian harian"
      toast={toast}
      action={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(type ? `${BASE}/ojt/master/${type.master_id}` : `${BASE}/ojt`)} className={buttonCls}>
            <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <button type="button" onClick={() => navigate(`${BASE}/ojt/batch/new?criterion_id=${typeId}`)} className={buttonCls}>
            <HiOutlinePlus className="h-4 w-4" /> Buat Batch OJT
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
                <th className="px-6 py-4 text-center">Penilaian</th>
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
                    Belum ada batch OJT
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className={cn("transition hover:bg-slate-50/50", !row.is_active && "opacity-60")}>
                    <td className="px-6 py-4">
                      <span className="block font-bold text-slate-800">Batch {row.batch_no}</span>
                      <span className="text-xs text-slate-400">{row.training_batch_label ?? "Tidak terikat training"}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {fmtDate(row.start_date)} - {fmtDate(row.end_date)}
                      <span className="block text-xs text-slate-400">{row.days} hari</span>
                    </td>
                    <td className="px-6 py-4 text-center">{row.participant_count}</td>
                    <td className="px-6 py-4 text-center">
                      {row.scored_count} dari {row.total_count}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.is_active ? (
                        <PhaseBadge phase={row.phase} />
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => navigate(`${BASE}/ojt/batch/${row.id}`)} className={ghostBtnCls}>
                          Detail
                        </button>
                        {row.is_active && (
                          <button type="button" onClick={() => navigate(`${BASE}/ojt/batch/${row.id}/edit`)} className={ghostBtnCls}>
                            Kelola
                          </button>
                        )}
                        {row.participant_count === 0 ? (
                          <button type="button" onClick={() => remove(row)} className={cn(ghostBtnCls, "text-rose-600")}>
                            Hapus
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => send(`/academy/ojt-batches/${row.id}/active`, "PUT", { is_active: !row.is_active })}
                            className={ghostBtnCls}
                          >
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
