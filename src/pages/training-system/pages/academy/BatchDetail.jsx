import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineCalendarDays, HiOutlineXMark } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import {
  PARTICIPANT_STATUS,
  RESULT_META,
  SOURCE_LABEL,
  cardCls,
  cn,
  fmt,
  fmtDatetime,
  ghostBtnCls,
  primaryBtnCls,
  useToast,
} from "./helpers";
import { PageShell, Spinner } from "./ui";

const CATEGORY_LABEL = { PRAKTIK: "Praktik", SIKAP: "Sikap" };

function MentorModal({ participant, onClose, onSaved, showToast }) {
  const [form, setForm] = useState(null);
  const [scores, setScores] = useState(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/academy/participants/${participant.id}/mentor-scores`)
      .then((res) => {
        setForm(res);
        setScores(new Map(res.indicators.filter((i) => i.score).map((i) => [i.id, i.score])));
      })
      .catch((err) => showToast(err.message, "error"));
  }, [participant.id, showToast]);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/academy/participants/${participant.id}/mentor-scores`, {
        method: "PUT",
        body: JSON.stringify({ scores: [...scores].map(([indicator_id, score]) => ({ indicator_id, score })) }),
      });
      onSaved();
    } catch (err) {
      showToast(err.message, "error");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Penilaian mentor ${participant.full_name}`}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Penilaian Mentor</h2>
            <p className="text-xs text-slate-400">{participant.full_name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {!form ? (
          <Spinner />
        ) : (
          <div className="space-y-5">
            {["PRAKTIK", "SIKAP"].map((category) => (
              <div key={category}>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{CATEGORY_LABEL[category]}</h3>
                <ul className="space-y-3">
                  {form.indicators
                    .filter((i) => i.category === category)
                    .map((indicator) => (
                      <li key={indicator.id} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-xs font-semibold text-slate-700">{indicator.indicator_text}</p>
                        <p className="mb-2 text-[11px] text-slate-400">{indicator.topic_name}</p>
                        <div className="flex gap-2" role="radiogroup" aria-label={indicator.indicator_text}>
                          {[1, 2, 3, 4].map((value) => (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={scores.get(indicator.id) === value}
                              onClick={() => setScores((prev) => new Map(prev).set(indicator.id, value))}
                              className={cn(
                                "h-9 w-11 rounded-xl border text-sm font-bold transition",
                                scores.get(indicator.id) === value
                                  ? "border-amber-600 bg-amber-600 text-white"
                                  : "border-slate-300 text-slate-600 hover:bg-slate-50",
                              )}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}

            {form.feedback.length > 0 && (
              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Feedback peserta</h3>
                <ul className="space-y-2">
                  {form.feedback.map((f, index) => (
                    <li key={index} className="rounded-xl bg-slate-50 p-3 text-xs">
                      <p className="font-semibold text-slate-600">{f.question_text}</p>
                      <p className="text-slate-800">{f.type === "SCALE" ? `${f.score} dari 4` : f.answer_text || "-"}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={save} disabled={saving} className={primaryBtnCls}>
                {saving ? "Menyimpan..." : "Simpan Nilai"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function EssayModal({ participant, onClose, onSaved, showToast }) {
  const [essays, setEssays] = useState(null);
  const [grades, setGrades] = useState(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/academy/participants/${participant.id}/essays`)
      .then((res) => {
        setEssays(res.data);
        setGrades(new Map(res.data.filter((e) => e.is_correct !== null).map((e) => [e.id, e.is_correct])));
      })
      .catch((err) => showToast(err.message, "error"));
  }, [participant.id, showToast]);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/academy/participants/${participant.id}/essays`, {
        method: "PUT",
        body: JSON.stringify({ grades: [...grades].map(([answer_id, is_correct]) => ({ answer_id, is_correct })) }),
      });
      onSaved();
    } catch (err) {
      showToast(err.message, "error");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Nilai essay ${participant.full_name}`}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Nilai Essay</h2>
            <p className="text-xs text-slate-400">{participant.full_name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {!essays ? (
          <Spinner />
        ) : essays.length === 0 ? (
          <p className="text-xs text-slate-400">Peserta ini belum mengirim jawaban essay</p>
        ) : (
          <div className="space-y-4">
            {essays.map((essay) => (
              <div key={essay.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {essay.phase === "PRE" ? "Pre-test" : "Post-test"} · {essay.topic_name}
                </p>
                <p className="text-xs font-semibold text-slate-700">{essay.question_text}</p>
                <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800">
                  {essay.answer_text || <span className="text-slate-400">Tidak dijawab</span>}
                </p>
                {essay.keyword_match && (
                  <div className="space-y-1 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-[11px] text-sky-900">
                    <p>
                      <span className="font-bold">Kecocokan kata kunci: {essay.keyword_match.percent}%</span> (
                      {essay.keyword_match.matched.length} dari{" "}
                      {essay.keyword_match.matched.length + essay.keyword_match.missing.length}). Acuan nilai:{" "}
                      {essay.keyword_match.suggested}. Hanya bantuan, nilai dipilih penilai.
                    </p>
                    {essay.keyword_match.matched.length > 0 && <p>Muncul: {essay.keyword_match.matched.join(", ")}</p>}
                    {essay.keyword_match.missing.length > 0 && <p>Belum ada: {essay.keyword_match.missing.join(", ")}</p>}
                  </div>
                )}
                {essay.answer_guide && (
                  <p className="whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                    <span className="font-bold">Panduan penilai: </span>
                    {essay.answer_guide}
                  </p>
                )}
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Penilaian jawaban">
                  {[
                    [0, "Salah (0)", "border-rose-600 bg-rose-600 text-white"],
                    [1, "Benar, kurang lengkap (1)", "border-amber-500 bg-amber-500 text-white"],
                    [2, "Benar lengkap (2)", "border-emerald-600 bg-emerald-600 text-white"],
                  ].map(([value, label, activeCls]) => (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={grades.get(essay.id) === value}
                      onClick={() => setGrades((prev) => new Map(prev).set(essay.id, value))}
                      className={cn(
                        "rounded-xl border px-4 py-1.5 text-xs font-bold transition",
                        grades.get(essay.id) === value ? activeCls : "border-slate-300 text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">Nilai test keluar setelah semua essay dinilai</span>
              <button type="button" onClick={save} disabled={saving || grades.size === 0} className={primaryBtnCls}>
                {saving ? "Menyimpan..." : "Simpan Penilaian"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [batch, setBatch] = useState(null);
  const [mentorTarget, setMentorTarget] = useState(null);
  const [essayTarget, setEssayTarget] = useState(null);

  const load = useCallback(
    () =>
      api(`/academy/batches/${id}`)
        .then((res) => setBatch(res.data))
        .catch((err) => showToast(err.message, "error")),
    [id, showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const act = async (path, body, method = "POST") => {
    try {
      await api(path, { method, body: JSON.stringify(body ?? {}) });
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const cancel = () => {
    if (window.confirm("Batalkan batch ini? Peserta tidak akan bisa mengerjakan test.")) act(`/academy/batches/${id}/cancel`);
  };

  const closeParticipant = (p) => {
    if (window.confirm(`Tutup ${p.full_name}? Test yang belum dikerjakan diberi nilai 0.`)) act(`/academy/participants/${p.id}/close`);
  };

  const backButton = (
    <button
      type="button"
      onClick={() => navigate("/training-management-system/academy/batches")}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-slate-50"
    >
      <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
    </button>
  );

  if (!batch) {
    return (
      <PageShell icon={HiOutlineCalendarDays} title="Batch Training" subtitle="Memuat data" action={backButton} toast={toast}>
        <Spinner />
      </PageShell>
    );
  }

  const cancelled = batch.status === "CANCELLED";
  const editable = !cancelled && !batch.started;

  return (
    <PageShell
      icon={HiOutlineCalendarDays}
      title={batch.training_name}
      subtitle={`Versi ${batch.version_no} · Mulai ${fmtDatetime(batch.start_at)}`}
      action={backButton}
      toast={toast}
    >
      <section className={`${cardCls} flex flex-col gap-4 md:flex-row md:items-start md:justify-between`}>
        <dl className="grid flex-1 gap-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Sumber</dt>
            <dd className="font-semibold text-slate-700">
              {SOURCE_LABEL[batch.source]} {batch.request_code ?? batch.position_name ?? ""}
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Standar kelulusan</dt>
            <dd className="font-semibold text-slate-700">
              Lulus ≥ {fmt(batch.pass_score)}, perbaikan ≥ {fmt(batch.pass_with_fix_score)}
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Mentor</dt>
            <dd className="font-semibold text-slate-700">
              {batch.mentors.map((m) => m.full_name ?? m.vendor_name).join(", ") || "-"}
            </dd>
          </div>
        </dl>
        {cancelled ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Dibatalkan</span>
        ) : (
          editable && (
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate(`/training-management-system/academy/batches/${id}/edit`)} className={ghostBtnCls}>
                Ubah
              </button>
              <button type="button" onClick={cancel} className={cn(ghostBtnCls, "text-rose-600")}>
                Batalkan
              </button>
            </div>
          )
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-4">Peserta</th>
                <th className="px-4 py-4">Topik</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-center">Pre</th>
                <th className="px-4 py-4 text-center">Post</th>
                <th className="px-4 py-4 text-center">Mentor</th>
                <th className="px-4 py-4 text-center">Akhir</th>
                <th className="px-4 py-4 text-center">Hasil</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batch.participants.map((p) => {
                const absent = p.status === "ABSENT";
                const result = RESULT_META[p.result_status];
                return (
                  <tr key={p.id} className="transition hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="block font-bold text-slate-800">{p.full_name}</span>
                      <span className="text-xs text-slate-400">{p.outlet_name}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{p.topics.map((t) => t.name).join(", ")}</td>
                    <td className="px-4 py-3 text-center text-xs font-semibold whitespace-nowrap">{PARTICIPANT_STATUS[p.status]}</td>
                    <td className="px-4 py-3 text-center">{fmt(p.pre_score)}</td>
                    <td className="px-4 py-3 text-center">{fmt(p.post_score)}</td>
                    <td className="px-4 py-3 text-center">{fmt(p.mentor_score)}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{fmt(p.final_score)}</td>
                    <td className="px-4 py-3 text-center">
                      {result ? (
                        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap", result.cls)}>
                          {result.label}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!cancelled && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {!absent && (
                            <button type="button" onClick={() => setMentorTarget(p)} className={ghostBtnCls}>
                              Nilai mentor
                            </button>
                          )}
                          {p.essay_count > 0 && (
                            <button type="button" onClick={() => setEssayTarget(p)} className={ghostBtnCls}>
                              {p.essay_pending > 0 ? `Nilai essay (${p.essay_pending})` : "Lihat essay"}
                            </button>
                          )}
                          {(absent || p.status === "ASSIGNED") && (
                            <button
                              type="button"
                              onClick={() => act(`/academy/participants/${p.id}/attendance`, { absent: !absent }, "PUT")}
                              className={ghostBtnCls}
                            >
                              {absent ? "Tandai hadir" : "Tidak hadir"}
                            </button>
                          )}
                          {batch.started && ["ASSIGNED", "PRE_DONE"].includes(p.status) && (
                            <button type="button" onClick={() => closeParticipant(p)} className={ghostBtnCls}>
                              Tutup (nilai 0)
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {essayTarget && (
        <EssayModal
          participant={essayTarget}
          showToast={showToast}
          onClose={() => setEssayTarget(null)}
          onSaved={() => {
            setEssayTarget(null);
            showToast("Penilaian essay tersimpan");
            load();
          }}
        />
      )}

      {mentorTarget && (
        <MentorModal
          participant={mentorTarget}
          showToast={showToast}
          onClose={() => setMentorTarget(null)}
          onSaved={() => {
            setMentorTarget(null);
            showToast("Nilai mentor tersimpan");
            load();
          }}
        />
      )}
    </PageShell>
  );
}
