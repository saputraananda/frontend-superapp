import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineChevronDown, HiOutlineClipboardDocumentCheck } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, cn, fmt, fmtDate, ghostBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";
import { PhaseBadge, ProgressBadge } from "./OjtList";

const DAY_LABEL = { FIRST: "Hari pertama", LAST: "Hari terakhir" };

const BASE = "/training-management-system/academy/ojt";

export default function OjtDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [ojt, setOjt] = useState(null);
  const [openDate, setOpenDate] = useState(null);

  useEffect(() => {
    api(`/academy/ojt/${id}`)
      .then((res) => setOjt(res.data))
      .catch((err) => showToast(err.message, "error"));
  }, [id, showToast]);

  return (
    <PageShell
      icon={HiOutlineClipboardDocumentCheck}
      title={ojt ? `OJT ${ojt.full_name}` : "OJT"}
      subtitle={ojt ? `${ojt.training_name} · ${fmtDate(ojt.start_date)} - ${fmtDate(ojt.end_date)}` : ""}
      toast={toast}
      action={
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(BASE)} className={ghostBtnCls}>
            Kembali
          </button>
          {ojt && (
            <button type="button" onClick={() => navigate(`${BASE}/${id}/edit`)} className={ghostBtnCls}>
              Ubah
            </button>
          )}
        </div>
      }
    >
      {!ojt ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Nilai OJT</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{fmt(ojt.average)}</p>
              <p className="text-xs text-slate-400">dari 4</p>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Penilaian</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {ojt.scored_days} <span className="text-sm font-medium text-slate-400">dari 2</span>
              </p>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Kemajuan</p>
              <div className="mt-2">
                <ProgressBadge progress={ojt.progress} />
              </div>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Status</p>
              <div className="mt-2">
                <PhaseBadge phase={ojt.phase} />
              </div>
            </div>
            <div className={cardCls}>
              <p className="text-xs font-bold text-slate-400">Pemantau</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{ojt.observers.map((o) => o.full_name).join(", ")}</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Penilaian</th>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4 text-center">Nilai</th>
                    <th className="px-6 py-4">Penilai</th>
                    <th className="px-6 py-4 text-center">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ojt.days_detail.map((day) => (
                    <Fragment key={day.date}>
                      <tr className="transition hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-800">{DAY_LABEL[day.kind]}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{fmtDate(day.date)}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">{day.scored ? fmt(day.average) : "Belum dinilai"}</td>
                        <td className="px-6 py-4">{day.assessor_name ?? "-"}</td>
                        <td className="px-6 py-4 text-center">
                          {day.scored && (
                            <button
                              type="button"
                              onClick={() => setOpenDate(openDate === day.date ? null : day.date)}
                              aria-expanded={openDate === day.date}
                              aria-label={`Rincian ${DAY_LABEL[day.kind]}`}
                              className={ghostBtnCls}
                            >
                              <HiOutlineChevronDown className={cn("h-4 w-4 transition", openDate === day.date && "rotate-180")} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {openDate === day.date && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="space-y-3">
                              {[...new Set(day.scores.map((s) => s.criterion_name))].map((criterionName) => (
                                <div key={criterionName}>
                                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{criterionName}</p>
                                  <div className="grid gap-2 md:grid-cols-2">
                                    {day.scores
                                      .filter((s) => s.criterion_name === criterionName)
                                      .map((s) => (
                                        <div key={s.subskill_id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                                          <span className="text-slate-700">{s.name}</span>
                                          <span className="font-bold text-slate-800">{s.score}</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={cardCls}>
            <h2 className="text-sm font-bold text-slate-800">Kemajuan per sub-skill</h2>
            {!ojt.progress ? (
              <p className="mt-2 text-xs text-slate-400">Belum ada. Muncul setelah hari pertama dan hari terakhir dinilai.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {ojt.criteria.map((criterion) => (
                  <div key={criterion.id}>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{criterion.name}</p>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {criterion.subskills.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="min-w-0 text-slate-700">{s.name}</span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span className="font-bold text-slate-800">
                              {s.first_score ?? "-"} → {s.last_score ?? "-"}
                            </span>
                            <ProgressBadge progress={s.progress} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
