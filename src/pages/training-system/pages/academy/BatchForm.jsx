import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineCalendarDays, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, cn, ghostBtnCls, iconBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

const toLocalInput = (value) => (value ? String(value).slice(0, 16).replace(" ", "T") : "");

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {label}
      {children}
    </label>
  );
}

export default function BatchForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({
    training_id: "",
    source: params.get("request_id") ? "REQUEST" : params.get("sm_position_id") ? "SKILL_MATRIX" : "ROUTINE",
    request_id: params.get("request_id") ?? "",
    sm_position_id: params.get("sm_position_id") ?? "",
    start_at: "",
  });
  const [mentors, setMentors] = useState([]);
  const [selected, setSelected] = useState(new Map());
  const [defaultTopics, setDefaultTopics] = useState([]);
  const [outletFilter, setOutletFilter] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const opts = await api("/academy/batch-options");
      setOptions(opts);

      if (isEdit) {
        const { data } = await api(`/academy/batches/${id}`);
        setForm({
          training_id: data.training_id,
          source: data.source,
          request_id: data.request_id ?? "",
          sm_position_id: data.sm_position_id ?? "",
          start_at: toLocalInput(data.start_at),
        });
        setMentors(data.mentors.map(({ employee_id, vendor_name }) => (employee_id ? { employee_id } : { vendor_name })));
        setSelected(new Map(data.participants.map((p) => [p.employee_id, p.topics.map((t) => t.id)])));
        return;
      }

      const preset = params.get("employee_ids");
      if (preset) setSelected(new Map(preset.split(",").map((e) => [Number(e), []])));
      const requestId = params.get("request_id");
      if (requestId) await applyRequest(requestId);
    };
    load().catch((err) => showToast(err.message, "error"));
    // Hanya dijalankan sekali saat halaman dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const training = options?.trainings.find((t) => t.id === Number(form.training_id));
  const readyTopics = useMemo(() => training?.topics.filter((t) => t.ready) ?? [], [training]);
  const outletName = useMemo(() => new Map(options?.outlets.map((o) => [o.id, o.name]) ?? []), [options]);
  const employeeById = useMemo(() => new Map(options?.employees.map((e) => [e.employee_id, e]) ?? []), [options]);

  const applyRequest = async (requestId) => {
    const res = await api(`/academy/requests/${requestId}/prefill`);
    setSelected(new Map(res.employee_ids.map((employeeId) => [employeeId, []])));
    setMentors(res.mentors);
    if (res.request.scheduled_date) setForm((prev) => ({ ...prev, start_at: `${res.request.scheduled_date.slice(0, 10)}T08:00` }));
    setNotice(
      res.skipped_count
        ? `${res.skipped_count} peserta dari pengajuan tidak dimasukkan karena sudah keluar atau bukan karyawan Waschen.`
        : "",
    );
  };

  const changeTraining = (trainingId) => {
    const next = options.trainings.find((t) => t.id === Number(trainingId));
    const ready = next?.topics.filter((t) => t.ready).map((t) => t.id) ?? [];
    setForm((prev) => ({ ...prev, training_id: trainingId }));
    setDefaultTopics(ready);
    setSelected((prev) => new Map([...prev.keys()].map((employeeId) => [employeeId, ready])));
  };

  const toggleEmployee = (employeeId) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.set(employeeId, defaultTopics);
      return next;
    });

  const toggleTopic = (employeeId, topicId) =>
    setSelected((prev) => {
      const next = new Map(prev);
      const topics = next.get(employeeId);
      next.set(employeeId, topics.includes(topicId) ? topics.filter((t) => t !== topicId) : [...topics, topicId]);
      return next;
    });

  const toggleDefaultTopic = (topicId) => {
    const nextDefault = defaultTopics.includes(topicId) ? defaultTopics.filter((t) => t !== topicId) : [...defaultTopics, topicId];
    setDefaultTopics(nextDefault);
    setSelected((prev) => new Map([...prev.keys()].map((employeeId) => [employeeId, nextDefault])));
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        training_id: Number(form.training_id),
        mentors,
        participants: [...selected].map(([employee_id, topic_ids]) => ({ employee_id, topic_ids })),
      };
      const res = await api(isEdit ? `/academy/batches/${id}` : "/academy/batches", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      navigate(`/training-management-system/academy/batches/${isEdit ? id : res.id}`);
    } catch (err) {
      showToast(err.message, "error");
      setSaving(false);
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(isEdit ? `/training-management-system/academy/batches/${id}` : "/training-management-system/academy/batches")}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-700 shadow-lg shadow-amber-500/20 transition hover:bg-slate-50"
    >
      <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
    </button>
  );

  if (!options) {
    return (
      <PageShell icon={HiOutlineCalendarDays} title="Batch Training" subtitle="Memuat data" action={backButton} toast={toast}>
        <Spinner />
      </PageShell>
    );
  }

  const keyword = search.trim().toLowerCase();
  const candidates = options.employees.filter(
    (e) => (!outletFilter || e.outlet_id === Number(outletFilter)) && (!keyword || e.full_name.toLowerCase().includes(keyword)),
  );

  return (
    <PageShell
      icon={HiOutlineCalendarDays}
      title={isEdit ? "Ubah Batch" : "Buat Batch"}
      subtitle="Peserta langsung melihat training ini di Waschen Mobile. Pre-test terbuka saat waktu mulai tiba"
      action={backButton}
      toast={toast}
    >
      <section className={`${cardCls} grid gap-4 md:grid-cols-2`}>
        <Field label="Training">
          <select value={form.training_id} onChange={(e) => changeTraining(e.target.value)} disabled={isEdit} className={inputCls}>
            <option value="">Pilih training</option>
            {options.trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Waktu mulai">
          <input
            type="datetime-local"
            value={form.start_at}
            onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Sumber">
          <select
            value={form.source}
            onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
            disabled={isEdit}
            className={inputCls}
          >
            <option value="ROUTINE">Rutin</option>
            <option value="REQUEST">Dari pengajuan</option>
            <option value="SKILL_MATRIX">Dari skill matrix</option>
          </select>
        </Field>
        {form.source === "REQUEST" && (
          <Field label="Pengajuan terjadwal">
            <select
              value={form.request_id}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, request_id: e.target.value }));
                if (e.target.value) applyRequest(e.target.value).catch((err) => showToast(err.message, "error"));
              }}
              disabled={isEdit}
              className={inputCls}
            >
              <option value="">Pilih pengajuan</option>
              {options.requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.training_code} · {r.topic}
                </option>
              ))}
            </select>
          </Field>
        )}
        {form.source === "SKILL_MATRIX" && (
          <Field label="Posisi skill matrix">
            <select
              value={form.sm_position_id}
              onChange={(e) => setForm((prev) => ({ ...prev, sm_position_id: e.target.value }))}
              disabled={isEdit}
              className={inputCls}
            >
              <option value="">Pilih posisi</option>
              {options.positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </section>

      {notice && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{notice}</p>}

      {training && (
        <section className={cardCls}>
          <h2 className="text-sm font-bold text-slate-800">Topik</h2>
          <p className="mb-3 text-xs text-slate-400">
            Topik yang dipilih di sini diterapkan ke semua peserta. Topik per peserta bisa diubah di daftar peserta.
          </p>
          <div className="flex flex-wrap gap-2">
            {training.topics
              .filter((t) => t.is_active)
              .map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  disabled={!topic.ready}
                  onClick={() => toggleDefaultTopic(topic.id)}
                  aria-pressed={defaultTopics.includes(topic.id)}
                  title={topic.ready ? undefined : "Soal pre atau post belum lengkap"}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                    defaultTopics.includes(topic.id)
                      ? "border-amber-500 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-500",
                  )}
                >
                  {topic.name}
                  {!topic.ready && " (belum lengkap)"}
                </button>
              ))}
          </div>
        </section>
      )}

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-bold text-slate-800">Mentor</h2>
        <div className="space-y-2">
          {mentors.map((mentor, index) => (
            <div key={index} className="flex items-center gap-2">
              {"vendor_name" in mentor ? (
                <input
                  value={mentor.vendor_name}
                  onChange={(e) => setMentors((prev) => prev.map((m, i) => (i === index ? { vendor_name: e.target.value } : m)))}
                  placeholder="Nama vendor"
                  aria-label="Nama vendor"
                  className={inputCls}
                />
              ) : (
                <select
                  value={mentor.employee_id}
                  onChange={(e) =>
                    setMentors((prev) => prev.map((m, i) => (i === index ? { employee_id: Number(e.target.value) } : m)))
                  }
                  aria-label="Mentor internal"
                  className={inputCls}
                >
                  <option value="">Pilih karyawan</option>
                  {options.mentorOptions.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.full_name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setMentors((prev) => prev.filter((_, i) => i !== index))}
                aria-label="Hapus mentor"
                className={iconBtnCls}
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMentors((prev) => [...prev, { employee_id: "" }])} className={ghostBtnCls}>
              <HiOutlinePlus className="h-4 w-4" /> Mentor internal
            </button>
            <button type="button" onClick={() => setMentors((prev) => [...prev, { vendor_name: "" }])} className={ghostBtnCls}>
              <HiOutlinePlus className="h-4 w-4" /> Vendor
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-bold text-slate-800">Pilih Peserta</h2>
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)} aria-label="Filter cabang" className={inputCls}>
              <option value="">Semua cabang</option>
              {options.outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama"
              aria-label="Cari nama karyawan"
              className={inputCls}
            />
          </div>
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {candidates.map((e) => (
              <li key={e.employee_id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.has(e.employee_id)}
                    onChange={() => toggleEmployee(e.employee_id)}
                    className="h-4 w-4 accent-amber-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-700">{e.full_name}</span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {outletName.get(e.outlet_id) ?? "Tanpa cabang"} · {e.role ?? e.position_name ?? "-"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-bold text-slate-800">Peserta Terpilih ({selected.size})</h2>
          <ul className="max-h-[30rem] space-y-2 overflow-y-auto">
            {[...selected].map(([employeeId, topicIds]) => (
              <li key={employeeId} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-slate-700">
                    {employeeById.get(employeeId)?.full_name ?? `Karyawan #${employeeId} (tidak aktif)`}
                  </span>
                  <button type="button" onClick={() => toggleEmployee(employeeId)} aria-label="Keluarkan peserta" className={iconBtnCls}>
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {readyTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleTopic(employeeId, topic.id)}
                      aria-pressed={topicIds.includes(topic.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition",
                        topicIds.includes(topic.id) ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-400",
                      )}
                    >
                      {topic.name}
                    </button>
                  ))}
                  {!readyTopics.length && <span className="text-[11px] text-slate-400">Pilih training dulu</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className={primaryBtnCls}>
          {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Batch"}
        </button>
      </div>
    </PageShell>
  );
}
