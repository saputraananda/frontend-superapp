import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../lib/api";
import { Spinner } from "../ui";
import { computeSkillGap } from "./dashboardCompute";
import { useDashboardFilters } from "./useDashboardFilters";
import { BarTrack, EmptyRow, FilterBar, GridRow, InfoNote, KpiCard, KpiGrid, Pill, SelectField, TableCard } from "./dashboardUi";

const TEMPLATE = "36px minmax(240px,3fr) 120px minmax(140px,1.6fr) minmax(150px,2fr) 84px";

export default function SkillGapTab({ showToast }) {
  const f = useDashboardFilters();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api("/academy/dashboard/skill-gap")
      .then((res) => setItems(res.items))
      .catch((err) => {
        showToast(err.message, "error");
        setItems([]);
      });
  }, [showToast]);

  const v = useMemo(() => (items ? computeSkillGap(f.st, items) : null), [f.st, items]);
  if (!v) return <Spinner />;

  return (
    <div className="space-y-6">
      <InfoNote>
        Urutan mengikuti nilai rata-rata terendah dari Training (indikator mentor), OJT (nilai terakhir tiap sub-skill), dan Skill Matrix (penilaian terbaru), skala 1–4.
      </InfoNote>
      <FilterBar>
        <SelectField label="Jenis / posisi" value={f.st.pos} onChange={f.setPos} options={v.posOpts} />
        <SelectField label="Sumber" value={f.st.source} onChange={f.setSource} options={v.srcOpts} />
      </FilterBar>

      <KpiGrid>
        <KpiCard title="Prioritas tinggi" value={v.kHigh} sub={v.kHighSub} />
        <KpiCard title="Dari training" value={v.kTr} sub={v.kSub} />
        <KpiCard title="Dari OJT" value={v.kOj} sub={v.kSub} />
        <KpiCard title="Dari skill matrix" value={v.kSm} sub={v.kSub} />
        <KpiCard title="Posisi terdampak" value={v.kPos} sub={v.kPosSub} />
      </KpiGrid>

      <TableCard
        title="Daftar skill gap"
        info={v.listInfo}
        template={TEMPLATE}
        minWidth={900}
        headers={["#", "Indikator", "Sumber", "Jenis / posisi", "Nilai (1–4)", "Prioritas"]}
        footer="Prioritas: Tinggi di bawah 2, Sedang 2 sampai di bawah 3, Rendah 3 ke atas. Nilai di bawah 3 dihitung sebagai gap."
      >
        {v.rows.map((r) => (
          <GridRow key={r.no} template={TEMPLATE}>
            <span className="font-bold text-slate-400">{r.no}</span>
            <span className="font-bold text-slate-800">{r.topic}</span>
            <Pill bg={r.srcBg} fg={r.srcFg}>
              {r.src}
            </Pill>
            <span>{r.pos}</span>
            <div className="flex items-center gap-2.5">
              <BarTrack percent={r.w} color={r.col} />
              <span className="font-bold tabular-nums text-slate-800">{r.v}</span>
            </div>
            <Pill bg={r.priBg} fg={r.priFg}>
              {r.pri}
            </Pill>
          </GridRow>
        ))}
        {v.empty && <EmptyRow />}
      </TableCard>
    </div>
  );
}
