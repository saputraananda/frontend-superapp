import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowUpTray,
  HiOutlineBookOpen,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";
import { api, apiUpload, assetUrl } from "../../../../lib/api";
import { cardCls, cn, ghostBtnCls, iconBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

const QUESTION_TYPES = [
  ["SINGLE", "Pilihan ganda"],
  ["MULTI", "Checkbox"],
  ["ESSAY", "Essay"],
];

const newOption = (is_correct = false) => ({ option_text: "", is_correct });
const blankQuestion = (phase, topicId) => ({
  phase,
  topic_id: topicId,
  type: "SINGLE",
  question_text: "",
  answer_guide: "",
  keywords: "",
  options: [newOption(true), newOption()],
});

function SectionTitle({ title, hint }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function TopicSelect({ value, onChange, topics, label }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className={inputCls}>
      {topics
        .filter((t) => t.is_active || t.id === value)
        .map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
    </select>
  );
}

function QuestionCard({ number, question, topics, onChange, onRemove }) {
  const patch = (fields) => onChange({ ...question, ...fields });
  const patchOption = (index, fields) =>
    patch({ options: question.options.map((o, i) => (i === index ? { ...o, ...fields } : o)) });
  const isMulti = question.type === "MULTI";
  const isEssay = question.type === "ESSAY";
  // Pilihan ganda: tepat satu kunci. Checkbox: tiap opsi bisa dicentang sendiri.
  const setCorrect = (index) =>
    patch({
      options: question.options.map((o, i) =>
        isMulti ? (i === index ? { ...o, is_correct: !o.is_correct } : o) : { ...o, is_correct: i === index },
      ),
    });
  const removeOption = (index) => {
    const options = question.options.filter((_, i) => i !== index);
    if (!options.some((o) => o.is_correct) && options.length) options[0] = { ...options[0], is_correct: true };
    patch({ options });
  };
  const changeType = (type) => {
    if (type === "ESSAY") return patch({ type, options: [] });
    const options = question.options.length ? question.options : [newOption(true), newOption()];
    // Pindah ke pilihan ganda: sisakan satu kunci saja.
    const firstCorrect = options.findIndex((o) => o.is_correct);
    patch({
      type,
      options: type === "SINGLE" ? options.map((o, i) => ({ ...o, is_correct: i === Math.max(firstCorrect, 0) })) : options,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500">Soal {number}</span>
        <button type="button" onClick={onRemove} aria-label={`Hapus soal ${number}`} className={iconBtnCls}>
          <HiOutlineTrash className="h-4 w-4" />
        </button>
      </div>
      <TopicSelect
        value={question.topic_id}
        onChange={(topic_id) => patch({ topic_id })}
        topics={topics}
        label={`Topik soal ${number}`}
      />
      <select value={question.type} onChange={(e) => changeType(e.target.value)} aria-label={`Tipe soal ${number}`} className={inputCls}>
        {QUESTION_TYPES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        rows={2}
        value={question.question_text}
        onChange={(e) => patch({ question_text: e.target.value })}
        placeholder="Tulis soal"
        aria-label={`Teks soal ${number}`}
        className={inputCls}
      />
      {isEssay ? (
        <>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Panduan jawaban (hanya dilihat penilai)
            <textarea
              rows={3}
              value={question.answer_guide ?? ""}
              onChange={(e) => patch({ answer_guide: e.target.value })}
              placeholder="Poin yang diharapkan ada di jawaban peserta"
              className={cn(inputCls, "mt-1.5 normal-case tracking-normal")}
            />
          </label>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Kata kunci (satu per baris, hanya dilihat penilai)
            <textarea
              rows={3}
              value={question.keywords ?? ""}
              onChange={(e) => patch({ keywords: e.target.value })}
              placeholder={"Contoh:\nsabun\nair bersih"}
              className={cn(inputCls, "mt-1.5 normal-case tracking-normal")}
            />
            <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-slate-400">
              Dipakai untuk menghitung persentase kecocokan. Penilai tetap memilih nilai sendiri.
            </span>
          </label>
        </>
      ) : (
        <>
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={`correct-${question._key}`}
                  checked={option.is_correct}
                  onChange={() => setCorrect(index)}
                  aria-label={`Jadikan opsi ${index + 1} kunci jawaban`}
                  className="h-4 w-4 shrink-0 accent-amber-600"
                />
                <input
                  value={option.option_text}
                  onChange={(e) => patchOption(index, { option_text: e.target.value })}
                  placeholder={`Opsi ${index + 1}`}
                  aria-label={`Opsi ${index + 1} soal ${number}`}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={question.options.length <= 2}
                  aria-label={`Hapus opsi ${index + 1}`}
                  className={cn(iconBtnCls, "disabled:opacity-30")}
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              {isMulti
                ? "Centang semua opsi yang benar. Peserta harus memilih persis sama."
                : "Bulatan yang terpilih adalah kunci jawaban"}
            </span>
            <button type="button" onClick={() => patch({ options: [...question.options, newOption()] })} className={ghostBtnCls}>
              <HiOutlinePlus className="h-3.5 w-3.5" /> Opsi
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TrainingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const nextKey = useRef(1);
  const withKey = useCallback((row) => ({ ...row, _key: nextKey.current++ }), []);

  const [training, setTraining] = useState(null);
  const [content, setContent] = useState(null);
  const [phase, setPhase] = useState("PRE");
  const [topicName, setTopicName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadDetail = useCallback(async () => {
    const res = await api(`/academy/trainings/${id}`);
    setTraining(res.data);
    return res.data;
  }, [id]);

  const loadAll = useCallback(async () => {
    try {
      const data = await loadDetail();
      setContent({
        pass_score: Number(data.version.pass_score),
        pass_with_fix_score: Number(data.version.pass_with_fix_score),
        practice_weight: Number(data.version.practice_weight),
        attitude_weight: Number(data.version.attitude_weight),
        questions: data.questions.map(withKey),
        feedback_questions: data.feedback_questions.map(withKey),
        indicators: data.indicators.map(withKey),
      });
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [loadDetail, withKey, showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeTopics = training?.topics.filter((t) => t.is_active) ?? [];
  const firstTopicId = activeTopics[0]?.id;

  const patchRow = (list, key, fields) =>
    setContent((prev) => ({
      ...prev,
      [list]: prev[list].map((row) => (row._key === key ? { ...row, ...fields } : row)),
    }));
  const replaceRow = (list, row) => patchRow(list, row._key, row);
  const addRow = (list, row) => setContent((prev) => ({ ...prev, [list]: [...prev[list], withKey(row)] }));
  const removeRow = (list, key) =>
    setContent((prev) => ({ ...prev, [list]: prev[list].filter((row) => row._key !== key) }));

  const addTopic = async (e) => {
    e.preventDefault();
    try {
      await api(`/academy/trainings/${id}/topics`, { method: "POST", body: JSON.stringify({ name: topicName }) });
      setTopicName("");
      await loadDetail();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const toggleTopic = async (topic) => {
    try {
      await api(`/academy/topics/${topic.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: topic.name, is_active: !topic.is_active }),
      });
      await loadDetail();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api(`/academy/trainings/${id}/content`, { method: "PUT", body: JSON.stringify(content) });
      showToast(res.message);
      await loadDetail();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await apiUpload(`/academy/trainings/${id}/materials`, { method: "POST", body: form });
      await loadDetail();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const removeMaterial = async (materialId) => {
    try {
      await api(`/academy/materials/${materialId}`, { method: "DELETE" });
      await loadDetail();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={() => navigate("/training-management-system/academy/trainings")}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-slate-50"
    >
      <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
    </button>
  );

  if (!training || !content) {
    return (
      <PageShell icon={HiOutlineBookOpen} title="Master Training" subtitle="Memuat data" action={backButton} toast={toast}>
        <Spinner />
      </PageShell>
    );
  }

  const phaseQuestions = content.questions.filter((q) => q.phase === phase);

  return (
    <PageShell
      icon={HiOutlineBookOpen}
      title={training.name}
      subtitle={`Versi ${training.version.version_no}`}
      action={backButton}
      toast={toast}
    >
      {training.version.in_use && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          Versi ini sudah dipakai batch. Perubahan akan tersimpan sebagai versi baru, batch lama tetap memakai versi lamanya.
        </p>
      )}

      <section className={cardCls}>
        <SectionTitle title="Topik" hint="Soal dan penilaian mentor peserta mengikuti topik yang di-assign" />
        <form onSubmit={addTopic} className="mb-3 flex gap-2">
          <input
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Nama topik baru"
            aria-label="Nama topik baru"
            className={inputCls}
          />
          <button type="submit" disabled={!topicName.trim()} className={`${primaryBtnCls} shrink-0`}>
            <HiOutlinePlus className="h-4 w-4" /> Tambah
          </button>
        </form>
        <ul className="flex flex-wrap gap-2">
          {training.topics.map((topic) => (
            <li key={topic.id}>
              <button
                type="button"
                onClick={() => toggleTopic(topic)}
                title={topic.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold transition",
                  topic.is_active
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-slate-100 text-slate-400 line-through",
                )}
              >
                {topic.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={cardCls}>
        <SectionTitle title="Standar Kelulusan" hint="Nilai akhir minimal untuk tiap status" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-500">
            Lulus
            <input
              type="number"
              min="0"
              max="100"
              value={content.pass_score}
              onChange={(e) => setContent((prev) => ({ ...prev, pass_score: e.target.value }))}
              className={cn(inputCls, "mt-1.5")}
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Lulus dengan perbaikan
            <input
              type="number"
              min="0"
              max="100"
              value={content.pass_with_fix_score}
              onChange={(e) => setContent((prev) => ({ ...prev, pass_with_fix_score: e.target.value }))}
              className={cn(inputCls, "mt-1.5")}
            />
          </label>
        </div>
      </section>

      <section className={cardCls}>
        <SectionTitle title="Bobot Nilai Mentor" hint="Praktik dan Sikap berjumlah 100%" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-500">
            Praktik (%)
            <input
              type="number"
              min="0"
              max="100"
              value={content.practice_weight}
              onChange={(e) => {
                const practice = e.target.value === "" ? "" : Math.min(100, Math.max(0, Math.round(Number(e.target.value))));
                setContent((prev) => ({ ...prev, practice_weight: practice, attitude_weight: practice === "" ? "" : 100 - practice }));
              }}
              className={cn(inputCls, "mt-1.5")}
            />
          </label>
          <div className="text-xs font-bold text-slate-500">
            Sikap (%)
            <p className={cn(inputCls, "mt-1.5 bg-slate-50")}>{content.attitude_weight === "" ? "-" : content.attitude_weight}</p>
          </div>
        </div>
      </section>

      <section className={cardCls}>
        <SectionTitle title="Soal" hint="Pilihan ganda, checkbox, atau essay. Essay dinilai HR setelah peserta mengirim" />
        {!firstTopicId ? (
          <p className="text-xs text-slate-400">Tambahkan topik dulu sebelum menulis soal</p>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              {[
                ["PRE", "Pre-test"],
                ["POST", "Post-test"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPhase(value)}
                  aria-pressed={phase === value}
                  className={cn(ghostBtnCls, phase === value && "border-amber-500 bg-amber-50 text-amber-800")}
                >
                  {label} ({content.questions.filter((q) => q.phase === value).length})
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {phaseQuestions.map((question, index) => (
                <QuestionCard
                  key={question._key}
                  number={index + 1}
                  question={question}
                  topics={training.topics}
                  onChange={(row) => replaceRow("questions", row)}
                  onRemove={() => removeRow("questions", question._key)}
                />
              ))}
              <button
                type="button"
                onClick={() => addRow("questions", blankQuestion(phase, firstTopicId))}
                className={ghostBtnCls}
              >
                <HiOutlinePlus className="h-4 w-4" /> Tambah Soal
              </button>
            </div>
          </>
        )}
      </section>

      <section className={cardCls}>
        <SectionTitle title="Feedback Karyawan" hint="Diisi peserta setelah post-test" />
        <div className="space-y-2">
          {content.feedback_questions.map((row) => (
            <div key={row._key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={row.type}
                onChange={(e) => patchRow("feedback_questions", row._key, { type: e.target.value })}
                aria-label="Tipe pertanyaan"
                className={cn(inputCls, "sm:w-44 sm:shrink-0")}
              >
                <option value="SCALE">Nilai 1 sampai 4</option>
                <option value="OPEN">Pertanyaan terbuka</option>
              </select>
              <input
                value={row.question_text}
                onChange={(e) => patchRow("feedback_questions", row._key, { question_text: e.target.value })}
                placeholder="Tulis pertanyaan"
                aria-label="Teks pertanyaan feedback"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => removeRow("feedback_questions", row._key)}
                aria-label="Hapus pertanyaan"
                className={cn(iconBtnCls, "self-end sm:self-auto")}
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addRow("feedback_questions", { type: "SCALE", question_text: "" })}
            className={ghostBtnCls}
          >
            <HiOutlinePlus className="h-4 w-4" /> Tambah Pertanyaan
          </button>
        </div>
      </section>

      <section className={cardCls}>
        <SectionTitle
          title="Penilaian Mentor"
          hint={`Skala 1 sampai 4. Bobot Praktik ${content.practice_weight}% dan Sikap ${content.attitude_weight}%. Indikator Sikap berlaku untuk semua peserta`}
        />
        {!firstTopicId ? (
          <p className="text-xs text-slate-400">Tambahkan topik dulu sebelum menulis indikator</p>
        ) : (
          <div className="space-y-2">
            {content.indicators.map((row) => (
              <div key={row._key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={row.category}
                  onChange={(e) =>
                    patchRow("indicators", row._key, {
                      category: e.target.value,
                      topic_id: e.target.value === "SIKAP" ? null : (row.topic_id ?? firstTopicId),
                    })
                  }
                  aria-label="Kategori indikator"
                  className={cn(inputCls, "sm:w-32 sm:shrink-0")}
                >
                  <option value="PRAKTIK">Praktik</option>
                  <option value="SIKAP">Sikap</option>
                </select>
                <div className="sm:w-48 sm:shrink-0">
                  {row.category === "SIKAP" ? (
                    <p className={cn(inputCls, "bg-slate-50 text-slate-400")}>Semua topik</p>
                  ) : (
                    <TopicSelect
                      value={row.topic_id ?? firstTopicId}
                      onChange={(topic_id) => patchRow("indicators", row._key, { topic_id })}
                      topics={training.topics}
                      label="Topik indikator"
                    />
                  )}
                </div>
                <input
                  value={row.indicator_text}
                  onChange={(e) => patchRow("indicators", row._key, { indicator_text: e.target.value })}
                  placeholder="Tulis indikator"
                  aria-label="Teks indikator"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => removeRow("indicators", row._key)}
                  aria-label="Hapus indikator"
                  className={cn(iconBtnCls, "self-end sm:self-auto")}
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addRow("indicators", { category: "PRAKTIK", topic_id: firstTopicId, indicator_text: "" })}
              className={ghostBtnCls}
            >
              <HiOutlinePlus className="h-4 w-4" /> Tambah Indikator
            </button>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className={primaryBtnCls}>
          {saving ? "Menyimpan..." : "Simpan Isi Training"}
        </button>
      </div>

      <section className={cardCls}>
        <SectionTitle title="Materi Training" hint="PDF atau gambar, maksimal 10 MB. Tersimpan langsung saat diunggah" />
        <ul className="mb-3 space-y-2">
          {training.materials.map((material) => (
            <li key={material.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <a
                href={assetUrl(material.file_path)}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 text-xs font-semibold text-amber-700 hover:underline"
              >
                <HiOutlineDocumentText className="h-4 w-4 shrink-0" />
                <span className="truncate">{material.file_name}</span>
              </a>
              <button
                type="button"
                onClick={() => removeMaterial(material.id)}
                aria-label={`Hapus ${material.file_name}`}
                className={iconBtnCls}
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <label className={cn(ghostBtnCls, "cursor-pointer", uploading && "opacity-50")}>
          <HiOutlineArrowUpTray className="h-4 w-4" />
          {uploading ? "Mengunggah..." : "Unggah Materi"}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={uploadFile}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </section>
    </PageShell>
  );
}
