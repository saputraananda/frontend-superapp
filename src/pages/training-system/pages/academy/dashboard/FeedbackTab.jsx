import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../lib/api";
import { Spinner } from "../ui";
import { SATISFACTION_LEGEND, computeFeedback, monthParam } from "./dashboardCompute";
import { useDashboardFilters } from "./useDashboardFilters";
import { BarTrack, EmptyRow, FilterBar, GridRow, KpiCard, KpiGrid, MonthChips, Pill, SelectField, TableCard } from "./dashboardUi";

const ASPECT_TEMPLATE = "minmax(260px,3fr) minmax(160px,1.6fr) 60px 130px";
const TRAINING_TEMPLATE = "minmax(220px,2.2fr) 80px 90px minmax(220px,2.2fr) 110px 140px";
const SARAN_TEMPLATE = "minmax(200px,1.5fr) minmax(300px,4fr)";

export default function FeedbackTab({ showToast, periods }) {
  const f = useDashboardFilters(periods);
  const [loaded, setLoaded] = useState({ month: null, data: null });
  const month = monthParam(f.st);
  const data = loaded.month === month ? loaded.data : null;

  useEffect(() => {
    let live = true;
    api(`/academy/dashboard/feedback?month=${month}`)
      .then((res) => live && setLoaded({ month, data: res }))
      .catch((err) => {
        if (!live) return;
        showToast(err.message, "error");
        setLoaded({ month, data: { participants: [], scale: [], open: [] } });
      });
    return () => {
      live = false;
    };
  }, [month, showToast]);

  const v = useMemo(() => (data ? computeFeedback(f.st, data) : null), [f.st, data]);
  if (!v) return <Spinner />;

  return (
    <div className="space-y-6">
      <MonthChips periods={periods} filters={f} />
      <FilterBar>
        <SelectField label="Jenis training" value={f.st.training} onChange={f.setTraining} options={v.trOpts} />
      </FilterBar>

      <KpiGrid>
        <KpiCard title="Responden" hint="Peserta yang mengisi feedback" value={v.kResp} sub={v.kRespSub} />
        <KpiCard
          title="Kepuasan rata-rata"
          hint="Kepuasan peserta terhadap training"
          value={v.kFb}
          sub={v.kFbSub}
          legend={SATISFACTION_LEGEND}
        />
      </KpiGrid>

      <TableCard
        title="Aspek yang perlu diperbaiki"
        info="Dari nilai feedback peserta, diurutkan dari yang terendah, skala 1–4"
        template={ASPECT_TEMPLATE}
        minWidth={800}
        headers={["Aspek", "Nilai", "Skor", "Status"]}
      >
        {v.aspRows.map((r) => (
          <GridRow key={r.name} template={ASPECT_TEMPLATE}>
            <span className="font-bold text-slate-800">{r.name}</span>
            <BarTrack percent={r.w} color={r.col} />
            <span className="font-bold tabular-nums" style={{ color: r.col }}>
              {r.v}
            </span>
            <Pill bg={r.sBg} fg={r.sFg}>
              {r.status}
            </Pill>
          </GridRow>
        ))}
        {v.empty && <EmptyRow />}
      </TableCard>

      <TableCard
        title="Training yang perlu diperbaiki"
        info="Diurutkan dari kepuasan terendah"
        template={TRAINING_TEMPLATE}
        minWidth={900}
        headers={["Training", "Responden", "Kepuasan", "Aspek terlemah", "Jumlah saran", "Status"]}
      >
        {v.trRows.map((r) => (
          <GridRow key={r.name} template={TRAINING_TEMPLATE}>
            <span className="font-bold text-slate-800">{r.name}</span>
            <span>{r.n}</span>
            <span className="font-bold tabular-nums" style={{ color: r.col }}>
              {r.v}
            </span>
            <span>{r.weak}</span>
            <span>{r.saran}</span>
            <Pill bg={r.sBg} fg={r.sFg}>
              {r.status}
            </Pill>
          </GridRow>
        ))}
        {v.empty && <EmptyRow />}
      </TableCard>

      <TableCard
        title="Saran dari peserta"
        info="20 saran terbaru. Nama peserta tidak ditampilkan."
        template={SARAN_TEMPLATE}
        minWidth={600}
        headers={["Jenis training", "Saran"]}
      >
        {v.saranRows.map((r, i) => (
          <GridRow key={i} template={SARAN_TEMPLATE}>
            <span className="font-bold text-slate-800">{r.jenis}</span>
            <span className="text-slate-500">{r.text}</span>
          </GridRow>
        ))}
        {v.noSaran && <EmptyRow>Belum ada saran tertulis.</EmptyRow>}
      </TableCard>
    </div>
  );
}
