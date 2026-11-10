import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiOutlineClipboardDocumentCheck } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { RESULT_META, cardCls, fmtDate, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

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
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
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

export default function OjtForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [options, setOptions] = useState(null);
  const [ojt, setOjt] = useState(null);
  const [participantId, setParticipantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState("7");
  const [observers, setObservers] = useState(new Set());
  const [criteria, setCriteria] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api("/academy/ojt/options"), editing ? api(`/academy/ojt/${id}`) : null])
      .then(([opts, detail]) => {
        setOptions(opts);
        if (!detail) return;
        const data = detail.data;
        setOjt(data);
        setParticipantId(String(data.participant_id));
        setStartDate(data.start_date);
        setDays(String(data.days));
        setObservers(new Set(data.observers.map((o) => o.employee_id)));
        setCriteria(new Set(data.criteria.map((c) => c.id)));
      })
      .catch((err) => showToast(err.message, "error"));
  }, [id, editing, showToast]);

  const criteriaLocked = Boolean(ojt?.days_detail.some((d) => d.scored));

  const criteriaItems = useMemo(() => {
    if (!options) return [];
    const items = options.criteria.map((c) => ({ id: c.id, label: c.name }));
    // Kriteria OJT ini yang sekarang nonaktif tetap tampil supaya tidak hilang diam-diam.
    for (const c of ojt?.criteria ?? []) if (!items.some((i) => i.id === c.id)) items.push({ id: c.id, label: c.name });
    return items;
  }, [options, ojt]);

  const toggle = (setter) => (value) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const valid =
    (editing || participantId) && startDate && Number(days) >= 1 && Number(days) <= MAX_DAYS && observers.size > 0 && criteria.size > 0;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        participant_id: Number(participantId),
        start_date: startDate,
        days: Number(days),
        observer_ids: [...observers],
        criterion_ids: [...criteria],
      };
      const res = await api(editing ? `/academy/ojt/${id}` : "/academy/ojt", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      navigate(`${BASE}/${editing ? id : res.id}`);
    } catch (err) {
      showToast(err.message, "error");
      setSaving(false);
    }
  };

  return (
    <PageShell
      icon={HiOutlineClipboardDocumentCheck}
      title={editing ? "Ubah OJT" : "Mulai OJT"}
      subtitle="Periode, pemantau, dan kriteria penilaian harian"
      toast={toast}
    >
      {!options ? (
        <Spinner />
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className={`${cardCls} grid gap-4 md:grid-cols-3`}>
            <div className="md:col-span-3">
              <label htmlFor="ojt-participant" className="mb-1.5 block text-xs font-bold text-slate-600">
                Karyawan
              </label>
              {editing ? (
                <p className="text-sm font-bold text-slate-800">
                  {ojt?.full_name} <span className="font-normal text-slate-400">· {ojt?.training_name}</span>
                </p>
              ) : (
                <select id="ojt-participant" value={participantId} onChange={(e) => setParticipantId(e.target.value)} className={inputCls}>
                  <option value="">Pilih karyawan yang sudah selesai training</option>
                  {options.participants.map((p) => (
                    <option key={p.participant_id} value={p.participant_id}>
                      {p.full_name} · {p.training_name} · {RESULT_META[p.result_status]?.label ?? "Belum ada hasil"}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="ojt-start" className="mb-1.5 block text-xs font-bold text-slate-600">
                Tanggal mulai
              </label>
              <input id="ojt-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="ojt-days" className="mb-1.5 block text-xs font-bold text-slate-600">
                Jumlah hari (maksimal {MAX_DAYS})
              </label>
              <input
                id="ojt-days"
                type="number"
                min={1}
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

          <div className="grid gap-6 lg:grid-cols-2">
            <CheckList
              title="Pemantau"
              hint="Satu pemantau sudah cukup untuk menilai satu hari."
              search
              items={options.employees.map((e) => ({ id: e.employee_id, label: e.full_name, note: e.position_name }))}
              selected={observers}
              onToggle={toggle(setObservers)}
            />
            <CheckList
              title="Kriteria penilaian"
              hint={
                criteriaLocked
                  ? "Kriteria tidak bisa diubah karena sudah ada nilai."
                  : "Kriteria dibuat di menu Kriteria OJT. Tiap kriteria dinilai 1 sampai 4."
              }
              items={criteriaItems}
              selected={criteria}
              onToggle={toggle(setCriteria)}
              disabled={criteriaLocked}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate(editing ? `${BASE}/${id}` : BASE)} className={ghostBtnCls}>
              Batal
            </button>
            <button type="submit" disabled={!valid || saving} className={primaryBtnCls}>
              {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Mulai OJT"}
            </button>
          </div>
        </form>
      )}
    </PageShell>
  );
}
