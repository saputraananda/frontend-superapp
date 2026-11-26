import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../lib/api";
import { Spinner } from "../ui";
import { LEVEL_LEGEND, PAL, SATISFACTION_LEGEND, computeTraining, monthParam } from "./dashboardCompute";
import { useDashboardFilters } from "./useDashboardFilters";
import {
  Chip,
  EmptyRow,
  FilterBar,
  GridRow,
  KpiCard,
  Legend,
  MonthChips,
  Pill,
  SelectField,
  TableCard,
} from "./dashboardUi";

const ROW_TEMPLATE = "minmax(200px,2fr) minmax(190px,2fr) 70px 64px 64px 80px minmax(190px,2fr) 84px 84px";
const TOP_TEMPLATE = "40px minmax(110px,1fr) minmax(130px,1.2fr) minmax(190px,2fr) minmax(140px,1.2fr) 60px 60px 70px 80px minmax(170px,1.4fr)";
const number = "text-base font-bold tabular-nums text-slate-800";

export default function TrainingTab({ showToast, periods }) {
  const f = useDashboardFilters(periods);
  // Master dan jenis training untuk pilihan filter, dan baris peserta bulan terpilih; angka dihitung dari baris itu.
  const [catalog, setCatalog] = useState(null);
  const [loaded, setLoaded] = useState({ month: null, rows: null });
  const month = monthParam(f.st);
  const rows = loaded.month === month ? loaded.rows : null;

  useEffect(() => {
    Promise.all([api("/academy/masters"), api("/academy/trainings")])
      .then(([masters, trainings]) => {
        setCatalog(
          masters.data
            .filter((m) => m.is_active)
            .map((m) => ({
              id: m.id,
              name: m.name,
              jenis: trainings.data.filter((t) => t.master_id === m.id && t.is_active).map((t) => ({ id: t.id, name: t.name })),
            })),
        );
      })
      .catch((err) => {
        showToast(err.message, "error");
        setCatalog([]);
      });
  }, [showToast]);

  useEffect(() => {
    let live = true;
    api(`/academy/dashboard/training?month=${month}`)
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

  const v = useMemo(() => (catalog && rows ? computeTraining(f.st, rows, catalog) : null), [f.st, catalog, rows]);
  if (!v) return <Spinner />;

  return (
    <div className="space-y-6">
      <MonthChips periods={periods} filters={f} />
      <FilterBar>
        <SelectField label="Master training" value={f.st.training} onChange={(training) => f.set({ training, pos: "all" })} options={v.trOpts} />
        <SelectField label="Jenis training" value={f.st.pos} onChange={(pos) => f.set({ pos })} options={v.posOpts} />
      </FilterBar>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Master training" hint="Master training yang berjalan di bulan ini" value={v.kTraining} />
          <KpiCard title="Jenis training" hint="Jenis training yang dilatih di bulan ini" value={v.kPos} />
          <KpiCard title="Peserta hadir" hint="Persentase peserta yang hadir dari yang terdaftar" value={v.kHadir} sub={v.kHadirSub} />
          <KpiCard title="Kenaikan nilai" hint="Selisih rata-rata dari pre-test ke post-test" value={v.kNaik} sub={v.kNaikSub} />
          <KpiCard title="Kelulusan" hint="Persentase peserta yang lulus (batas nilai lulus 80)" value={v.kLulus} sub={v.kLulusSub} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <KpiCard
            title="Feedback"
            hint="Kepuasan peserta terhadap training"
            value={v.kFb}
            sub={v.kFbSub}
            legend={SATISFACTION_LEGEND}
          />
          <KpiCard
            title="Mentor"
            hint="Penilaian praktik dan sikap peserta oleh mentor"
            value={v.kMt}
            sub={v.kMtSub}
            valueColor={v.kMtCol}
            legend={LEVEL_LEGEND}
          />
        </div>
      </div>

      <TableCard
        title="Per master training"
        info={v.listInfo}
        template={ROW_TEMPLATE}
        minWidth={1180}
        headers={["Master training", "Jenis training", "Hadir", "Pre", "Post", "Naik", "Kelulusan", "Feedback", "Mentor"]}
      >
        {v.rows.map((r) => (
          <GridRow key={r.name} template={ROW_TEMPLATE}>
            <span className="text-sm font-bold text-slate-800">{r.name}</span>
            <div className="flex flex-wrap gap-1.5">
              {r.pos.map((p) => (
                <Chip key={p}>{p}</Chip>
              ))}
            </div>
            <span className={number}>{r.hadir}</span>
            <span className={number}>{r.pre}</span>
            <span className={number}>{r.post}</span>
            <span className={number} style={{ color: r.naikColor }}>
              {r.naik}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div style={{ width: r.wL, background: PAL.ok }} />
                <div style={{ width: r.wP, background: PAL.warnBg }} />
                <div style={{ width: r.wT, background: PAL.bad }} />
              </div>
              <span className="text-[11px] text-slate-500">{r.lulusTxt}</span>
            </div>
            <span className={number}>{r.fb}</span>
            <span className={number} style={{ color: r.mentorColor }}>
              {r.mentor}
            </span>
          </GridRow>
        ))}
        {v.empty && <EmptyRow />}
      </TableCard>

      <TableCard
        title="Peserta terbaik"
        info={v.topInfo}
        template={TOP_TEMPLATE}
        minWidth={1100}
        headers={["#", "Peserta", "Cabang", "Master training", "Jenis training", "Pre", "Post", "Mentor", "Nilai akhir", "Hasil"]}
        footer="Diurutkan dari nilai akhir tertinggi (50% post-test + 50% nilai mentor). Hanya peserta hadir yang punya nilai lengkap."
      >
        {v.top.map((r) => (
          <GridRow key={r.no} template={TOP_TEMPLATE}>
            <span className="font-bold text-slate-400">{r.no}</span>
            <span className="font-bold text-slate-800">{r.n}</span>
            <span>{r.cab}</span>
            <span>{r.training}</span>
            <span>{r.pos}</span>
            <span>{r.pre}</span>
            <span>{r.post}</span>
            <span>{r.mentor}</span>
            <span className={number}>{r.akhir}</span>
            <Pill bg={r.hBg} fg={r.hFg}>
              {r.hasil}
            </Pill>
          </GridRow>
        ))}
        {v.topEmpty && <EmptyRow>Belum ada peserta bernilai untuk pilihan ini.</EmptyRow>}
      </TableCard>

      <Legend
        items={[
          [PAL.ok, "Lulus (80 ke atas)"],
          [PAL.warnBg, "Lulus dengan perbaikan (70–79)"],
          [PAL.bad, "Tidak lulus (di bawah 70)"],
        ]}
      />
    </div>
  );
}
