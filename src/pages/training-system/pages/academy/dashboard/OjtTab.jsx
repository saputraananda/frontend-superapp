import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../lib/api";
import { Spinner } from "../ui";
import { LEVEL_LEGEND, computeOjt, monthParam } from "./dashboardCompute";
import { useDashboardFilters } from "./useDashboardFilters";
import { EmptyRow, FilterBar, GridRow, KpiCard, MonthChips, SelectField, TableCard } from "./dashboardUi";

const CAB_TEMPLATE = "minmax(160px,2fr) 90px 90px 90px 90px";
const EMP_TEMPLATE = "40px minmax(110px,1fr) minmax(130px,1.2fr) minmax(140px,1.2fr) 110px 70px 70px 100px";

export default function OjtTab({ showToast, periods }) {
  const f = useDashboardFilters(periods);
  const [loaded, setLoaded] = useState({ month: null, rows: null });
  const month = monthParam(f.st);
  const rows = loaded.month === month ? loaded.rows : null;

  useEffect(() => {
    let live = true;
    api(`/academy/dashboard/ojt?month=${month}`)
      .then((res) => live && setLoaded({ month, rows: res.rows }))
      .catch((err) => {
        if (!live) return;
        showToast(err.message, "error");
        setLoaded({ month, rows: [] });
      });
    return () => {
      live = false;
    };
  }, [month, showToast]);

  const v = useMemo(() => (rows ? computeOjt(f.st, rows) : null), [f.st, rows]);
  if (!v) return <Spinner />;

  return (
    <div className="space-y-6">
      <MonthChips periods={periods} filters={f} />
      <FilterBar>
        <SelectField label="Bagian" value={f.st.pos} onChange={f.setPos} options={v.posOpts} />
        <SelectField label="Jenis OJT" value={f.st.training} onChange={f.setTraining} options={v.ojtOpts} />
      </FilterBar>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Peserta OJT" hint="Karyawan yang menjalani OJT bulan ini" value={v.kN} />
        <KpiCard title="Penilaian awal" hint="Karyawan yang sudah punya penilaian awal OJT" value={v.kAwalDone} sub={v.kAwalSub} />
        <KpiCard title="Penilaian akhir" hint="Karyawan yang sudah punya penilaian akhir OJT" value={v.kAkhirDone} sub={v.kAkhirSub} />
        <KpiCard title="Rata-rata awal" hint="Rata-rata nilai indikator di hari pertama OJT" value={v.kAwal} sub={v.kAwalLvl} legend={LEVEL_LEGEND} />
        <KpiCard title="Rata-rata akhir" hint="Rata-rata nilai indikator di hari terakhir OJT" value={v.kAkhir} sub={v.kAkhirLvl} legend={LEVEL_LEGEND} />
      </div>

      <TableCard
        title="Ringkasan per cabang"
        info="Rata-rata nilai OJT, skala 1–4"
        template={CAB_TEMPLATE}
        minWidth={560}
        headers={["Cabang", "Peserta", "Awal", "Akhir", "Naik"]}
      >
        {v.cabRows.map((r) => (
          <GridRow key={r.cab} template={CAB_TEMPLATE}>
            <span className="font-bold text-slate-800">{r.cab}</span>
            <span>{r.n}</span>
            <span>{r.awal}</span>
            <span>{r.akhir}</span>
            <span className="font-bold" style={{ color: r.col }}>
              {r.naik}
            </span>
          </GridRow>
        ))}
        {v.empty && <EmptyRow />}
      </TableCard>

      <TableCard
        title="Peserta OJT terbaik"
        info="Diurutkan dari nilai akhir tertinggi, skala 1–4"
        template={EMP_TEMPLATE}
        minWidth={900}
        headers={["#", "Karyawan", "Cabang", "Posisi", "Tanggal OJT", "Awal", "Akhir", "Kenaikan"]}
      >
        {v.emps.map((e) => (
          <GridRow key={e.no} template={EMP_TEMPLATE}>
            <span className="font-bold text-slate-400">{e.no}</span>
            <span className="font-bold text-slate-800">{e.n}</span>
            <span>{e.cab}</span>
            <span>{e.pos}</span>
            <span>{e.tg}</span>
            <span>{e.awal}</span>
            <span className="text-base font-bold text-slate-800">{e.akhir}</span>
            <span className="font-bold" style={{ color: e.col }}>
              {e.naik}
            </span>
          </GridRow>
        ))}
        {v.empty && <EmptyRow />}
      </TableCard>
    </div>
  );
}
