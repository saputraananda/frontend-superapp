import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineChartBar } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, cn, fmt, ghostBtnCls, inputCls, useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";

const STAR_LABEL = { 1: "Bintang 1", 2: "Bintang 2", 3: "Bintang 3", 4: "Bintang 4" };

function StatTile({ value, label, detail }) {
  return (
    <div className={cardCls}>
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
      {detail && <p className="text-[11px] text-slate-400">{detail}</p>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-3 text-sm font-bold text-slate-800">{children}</h2>;
}

function TrainingTab({ showToast }) {
  const [month, setMonth] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    api(`/academy/dashboard/training${month ? `?month=${month}` : ""}`)
      .then((res) => {
        setData(res);
        if (!month) setMonth(res.month);
      })
      .catch((err) => showToast(err.message, "error"));
  }, [month, showToast]);

  if (!data) return <Spinner />;
  const s = data.summary;
  const pct = (r) => (r.percent === null ? "-" : `${r.percent}%`);

  return (
    <div className="space-y-6">
      <div className={`${cardCls} flex flex-wrap items-center gap-3`}>
        <label htmlFor="dashboard-month" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Bulan
        </label>
        <input id="dashboard-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={cn(inputCls, "w-48")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile value={s.batch_count} label="Training bulan ini" />
        <StatTile value={s.participant_count} label="Peserta yang ikut" />
        <StatTile value={pct(s.attendance)} label="Kehadiran" detail={`${s.attendance.count} dari ${s.participant_count}`} />
        <StatTile value={pct(s.passed)} label="Kelulusan" detail={`${s.passed.count} dari ${s.participant_count}`} />
        <StatTile
          value={s.average_gain === null ? "-" : `${s.average_gain >= 0 ? "+" : ""}${s.average_gain}`}
          label="Kenaikan rata-rata"
          detail="Pre-test ke post-test"
        />
        <StatTile value={fmt(s.average_mentor)} label="Keberhasilan praktik" detail="Rata-rata nilai mentor, dari 4" />
        <StatTile value={fmt(s.average_feedback)} label="Kepuasan training" detail="Dari 4" />
      </div>

      <section className={cardCls}>
        <SectionTitle>Topik perlu perbaikan, beserta nama karyawan</SectionTitle>
        {data.weak_topics.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada topik yang perlu perbaikan bulan ini</p>
        ) : (
          <ul className="space-y-2">
            {data.weak_topics.map((t) => (
              <li key={t.topic_id} className="text-xs text-slate-600">
                <span className="font-bold text-slate-800">
                  {t.topic_name} ({t.names.length} orang)
                </span>{" "}
                <span className="text-slate-400">· {t.training_name}</span>
                <p>{t.names.join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-slate-400">Dari soal post-test yang salah dan indikator mentor dengan nilai di bawah 2,5.</p>
      </section>
    </div>
  );
}

function GapChart({ gap }) {
  if (!gap.indicators.length) return <p className="text-xs text-slate-400">Belum ada penilaian untuk posisi ini</p>;
  return (
    <div className="space-y-3">
      {gap.indicators.map((i) => (
        <div key={i.indicator_id} className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 text-xs">
          <span className="truncate font-semibold text-slate-600" title={i.name}>
            {i.name}
          </span>
          <div className="relative h-4" title={`${i.name}: ${fmt(i.average)} dari 4`}>
            <div
              className={cn("h-full rounded-r", i.gap ? "bg-rose-500" : "bg-slate-400")}
              style={{ width: `${(i.average / 4) * 100}%` }}
            />
            {/* Garis batas 3 dari skala 0–4. */}
            <div className="absolute inset-y-[-4px] w-0.5 bg-slate-800" style={{ left: "75%" }} aria-hidden="true" />
          </div>
          <span className={cn("font-bold", i.gap ? "text-rose-600" : "text-slate-700")}>
            {fmt(i.average)}
            {i.gap && " · gap"}
          </span>
        </div>
      ))}
      <p className="text-[11px] text-slate-400">Garis hitam = batas 3. Di bawah 3 = skill gap. Urut dari yang terendah.</p>
    </div>
  );
}

function SkillTab({ showToast }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ position_id: "", outlet_id: "", from: "", to: "" });
  const [data, setData] = useState(null);

  useEffect(() => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    api(`/academy/dashboard/skill?${query}`)
      .then(setData)
      .catch((err) => showToast(err.message, "error"));
  }, [filters, showToast]);

  if (!data) return <Spinner />;
  const setFilter = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className={`${cardCls} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
        <select value={filters.position_id} onChange={setFilter("position_id")} aria-label="Filter posisi" className={inputCls}>
          <option value="">Semua posisi</option>
          {data.positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={filters.outlet_id} onChange={setFilter("outlet_id")} aria-label="Filter cabang" className={inputCls}>
          <option value="">Semua cabang</option>
          {data.outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <input type="date" value={filters.from} onChange={setFilter("from")} aria-label="Periode dari" className={inputCls} />
        <input type="date" value={filters.to} onChange={setFilter("to")} aria-label="Periode sampai" className={inputCls} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={cardCls}>
          <SectionTitle>Rata-rata nilai per posisi</SectionTitle>
          {data.averages.length === 0 && <p className="text-xs text-slate-400">Belum ada penilaian</p>}
          {data.averages.map((a) => (
            <div key={a.position_id} className="flex items-center justify-between border-b border-slate-100 py-2 text-xs last:border-0">
              <span className="font-semibold text-slate-600">
                {a.name} <span className="text-slate-400">({a.count} orang)</span>
              </span>
              <span className="font-bold text-slate-800">{fmt(a.average)}</span>
            </div>
          ))}
        </section>

        <section className={cardCls}>
          <SectionTitle>Master (Bintang 4)</SectionTitle>
          {data.masters.length === 0 && <p className="text-xs text-slate-400">Belum ada</p>}
          {data.masters.map((m) => (
            <p key={m.position_id} className="mb-2 text-xs text-slate-600">
              <span className="font-bold text-slate-800">{m.name}:</span> {m.people.map((p) => p.full_name).join(", ")}
            </p>
          ))}
          <p className="mt-2 text-[11px] text-slate-400">Calon mentor internal.</p>
        </section>

        <section className={cardCls}>
          <SectionTitle>Butuh training (Bintang 1 dan 2)</SectionTitle>
          {data.needs_training.length === 0 && <p className="text-xs text-slate-400">Belum ada</p>}
          {data.needs_training.map((n) => (
            <div key={n.position_id} className="mb-3">
              <p className="text-xs text-slate-600">
                <span className="font-bold text-slate-800">{n.name}:</span>{" "}
                {n.people.map((p) => `${p.full_name} (${STAR_LABEL[p.star]})`).join(", ")}
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/training-management-system/academy/batches/new?sm_position_id=${n.position_id}&employee_ids=${n.people
                      .map((p) => p.employee_id)
                      .join(",")}`,
                  )
                }
                className={cn(ghostBtnCls, "mt-1.5")}
              >
                Buat batch training
              </button>
            </div>
          ))}
        </section>
      </div>

      <section className={cardCls}>
        <SectionTitle>Skill gap{data.gap.position_name ? ` · ${data.gap.position_name}` : ""}, rata-rata per indikator</SectionTitle>
        <GapChart gap={data.gap} />
      </section>
    </div>
  );
}

export default function AcademyDashboard() {
  const { toast, showToast } = useToast();
  const [tab, setTab] = useState("training");

  return (
    <PageShell icon={HiOutlineChartBar} title="Dashboard Academy" subtitle="Hasil training dan skill matrix karyawan Waschen" toast={toast}>
      <div className="flex gap-2" role="tablist">
        {[
          ["training", "Training"],
          ["skill", "Skill Matrix"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(ghostBtnCls, tab === value && "border-amber-500 bg-amber-50 text-amber-800")}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "training" ? <TrainingTab showToast={showToast} /> : <SkillTab showToast={showToast} />}
    </PageShell>
  );
}
