import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { HiOutlineClipboardDocumentCheck } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, fmtDate, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

const MIN_DAYS = 2;
const MAX_DAYS = 60;
const BASE = "/training-management-system/academy/ojt";

/** Tanggal selesai dari tanggal mulai dan jumlah hari, dihitung UTC supaya tidak bergeser. */
const endDate = (start, days) => {
  if (!start || !days) return "";
  const [y, m, d] = start.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + Number(days) - 1)).toISOString().slice(0, 10);
};

function CheckList({ title, hint, items, selected, onToggle, disabled, search }) {
  const [query, setQuery] = useState("");
  const shown = search ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())) : items;
  return (
    <div className={cardCls}>
      <h2 className="text-sm font-bold text-slate-800">
        {title} <span className="font-normal text-slate-400">({selected.size} dipilih)</span>
      </h2>
      {hint && <p className="mb-3 text-xs text-slate-400">{hint}</p>}
      {search && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama"
          aria-label={`Cari ${title}`}
          className={`${inputCls} mb-3`}
        />
      )}
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {shown.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Tidak ada pilihan</p>}
        {shown.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              disabled={disabled}
              onChange={() => onToggle(item.id)}
              className="h-4 w-4 accent-amber-600"
            />
            <span className="min-w-0">
              {item.label}
              {item.note && <span className="block text-xs text-slate-400">{item.note}</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function OjtBatchForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [batch, setBatch] = useState(null);
  const [options, setOptions] = useState(null);
  const [trainingBatchId, setTrainingBatchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState("7");
  const [employees, setEmployees] = useState(new Set());
  const [observers, setObservers] = useState(new Set());
  const [jenis, setJenis] = useState(null);
  const [saving, setSaving] = useState(false);

  const criterionId = editing ? batch?.criterion_id : Number(params.get("criterion_id"));

  useEffect(() => {
    const load = async () => {
      const detail = editing ? (await api(`/academy/ojt-batches/${id}`)).data : null;
      const resolvedCriterionId = detail ? detail.criterion_id : Number(params.get("criterion_id"));
      const [opts, type] = await Promise.all([
        api("/academy/ojt-batches/options"),
        api(`/academy/ojt/criteria/${resolvedCriterionId}`),
      ]);
      setOptions(opts);
      setJenis(type.data);
      if (!detail) return;
      setBatch(detail);
      setTrainingBatchId(detail.training_batch_id ? String(detail.training_batch_id) : "");
      setStartDate(detail.start_date);
      setDays(String(detail.days));
      setEmployees(new Set(detail.participants.map((p) => p.employee_id)));
      setObservers(new Set(detail.observers.map((o) => o.employee_id)));
    };
    load().catch((err) => showToast(err.message, "error"));
    // Dijalankan sekali saat halaman dibuka atau id berganti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const perPersonObservers = batch?.observer_scope === "PERSON";

  const toggle = (setter) => (value) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const valid =
    criterionId &&
    startDate &&
    Number(days) >= MIN_DAYS &&
    Number(days) <= MAX_DAYS &&
    employees.size > 0 &&
    (perPersonObservers || observers.size > 0);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        criterion_id: Number(criterionId),
        training_batch_id: trainingBatchId ? Number(trainingBatchId) : null,
        start_date: startDate,
        days: Number(days),
        employee_ids: [...employees],
        observer_ids: perPersonObservers ? [] : [...observers],
      };
      const res = await api(editing ? `/academy/ojt-batches/${id}` : "/academy/ojt-batches", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      navigate(`${BASE}/batch/${editing ? id : res.id}`);
    } catch (err) {
      showToast(err.message, "error");
      setSaving(false);
    }
  };

  return (
    <PageShell
      icon={HiOutlineClipboardDocumentCheck}
      title={editing ? `Kelola Batch OJT ${batch ? batch.batch_no : ""}` : "Buat Batch OJT"}
      subtitle={jenis ? `${jenis.master_name} · ${jenis.name}` : "Periode, peserta, dan pemantau untuk seluruh peserta batch"}
      toast={toast}
    >
      {!options || !jenis || (editing && !batch) ? (
        <Spinner />
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className={`${cardCls} grid gap-4 md:grid-cols-4`}>
            <div className="md:col-span-4">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Jenis OJT</span>
              <p className="text-sm font-bold text-slate-800">
                {jenis.master_name} · {jenis.name}
                <span className="font-normal text-slate-400"> · {jenis.subskill_count} sub-skill dinilai 1 sampai 4</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Semua sub-skill aktif jenis ini dibawa ke batch saat dibuat. Sub-skill yang ditambah kemudian tidak masuk ke batch ini.
              </p>
            </div>
            <div className="md:col-span-4">
              <label htmlFor="ojt-training-batch" className="mb-1.5 block text-xs font-bold text-slate-600">
                Terikat batch training (opsional)
              </label>
              <select id="ojt-training-batch" value={trainingBatchId} onChange={(e) => setTrainingBatchId(e.target.value)} className={inputCls}>
                <option value="">Tidak terikat training</option>
                {options.training_batches.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">Peserta OJT tidak dibatasi pada peserta batch training yang dipilih.</p>
            </div>
            <div>
              <label htmlFor="ojt-start" className="mb-1.5 block text-xs font-bold text-slate-600">
                Tanggal mulai
              </label>
              <input id="ojt-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="ojt-days" className="mb-1.5 block text-xs font-bold text-slate-600">
                Jumlah hari ({MIN_DAYS} sampai {MAX_DAYS})
              </label>
              <input
                id="ojt-days"
                type="number"
                min={MIN_DAYS}
                max={MAX_DAYS}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Tanggal selesai</span>
              <p className="py-2.5 text-sm font-bold text-slate-800">{fmtDate(endDate(startDate, days))}</p>
            </div>
          </div>

          <CheckList
            title="Peserta"
            hint="Semua karyawan Waschen aktif bisa dipilih. Peserta yang sudah punya nilai atau foto tidak bisa dikeluarkan."
            search
            items={options.employees.map((e) => ({ id: e.employee_id, label: e.full_name, note: e.position_name }))}
            selected={employees}
            onToggle={toggle(setEmployees)}
          />

          {perPersonObservers ? (
            <div className={cardCls}>
              <h2 className="text-sm font-bold text-slate-800">Pemantau</h2>
              <p className="text-xs text-slate-400">
                Batch ini memakai pemantau per peserta (data lama), jadi pemantau tidak diubah di sini dan peserta baru tidak bisa ditambahkan.
              </p>
            </div>
          ) : (
            <CheckList
              title="Pemantau"
              hint="Berlaku untuk semua peserta batch. Satu pemantau sudah cukup. Hanya hari pertama dan hari terakhir yang dinilai."
              search
              items={options.employees.map((e) => ({ id: e.employee_id, label: e.full_name, note: e.position_name }))}
              selected={observers}
              onToggle={toggle(setObservers)}
            />
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate(editing ? `${BASE}/batch/${id}` : `${BASE}/type/${criterionId}`)} className={ghostBtnCls}>
              Batal
            </button>
            <button type="submit" disabled={!valid || saving} className={primaryBtnCls}>
              {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Buat Batch OJT"}
            </button>
          </div>
        </form>
      )}
    </PageShell>
  );
}
