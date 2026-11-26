import { useEffect, useMemo, useState } from "react";
import { api } from "../../../../../lib/api";
import { cardCls } from "../helpers";
import { Spinner } from "../ui";
import { PAL, computeRapor } from "./dashboardCompute";
import { useDashboardFilters } from "./useDashboardFilters";
import { EmptyRow, FilterBar, GridRow, InfoNote, KpiCard, KpiGrid, Pill, SelectField, Stars, TableCard } from "./dashboardUi";

const LIST_TEMPLATE = "minmax(150px,1.2fr) minmax(110px,.8fr) minmax(130px,1fr) minmax(200px,1.7fr) minmax(200px,1.7fr) minmax(150px,1fr)";
const TRAINING_TEMPLATE = "minmax(170px,3fr) minmax(80px,1fr) minmax(80px,1fr) minmax(80px,1fr) minmax(80px,1fr) minmax(90px,1fr) minmax(150px,1.4fr)";
const OJT_TEMPLATE = "minmax(170px,3fr) minmax(100px,1fr) minmax(80px,1fr) minmax(80px,1fr) minmax(100px,1fr)";
const MENTOR_TEMPLATE = "minmax(170px,3fr) minmax(110px,1fr) minmax(170px,1fr)";

function PositionChips({ items, emptyText }) {
  if (!items.length) return <span className="text-slate-400">{emptyText}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((p) => (
        <span key={p.name} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
          {p.name}
          <span className="text-amber-500">{p.on}</span>
        </span>
      ))}
    </div>
  );
}

function ScoreLine({ on, off, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <Stars on={on} off={off} color={color} />
      <span className="font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function HighlightList({ title, items, empty }) {
  return (
    <div className={cardCls}>
      <p className="mb-2 text-xs font-bold text-slate-800">{title}</p>
      {items.map((i) => (
        <div key={`${i.name}-${i.type}`} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs last:border-0">
          <span className="text-slate-700">
            {i.name} <span className="text-slate-400">· {i.type}</span>
          </span>
          <ScoreLine on={i.on} off={i.off} value={i.v} color={i.col} />
        </div>
      ))}
      {empty && <span className="text-xs text-slate-400">Tidak ada.</span>}
    </div>
  );
}

function SikapList({ title, items, empty }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-slate-800">{title}</p>
      {items.map((i) => (
        <div key={i.name} className="flex items-center justify-between gap-3 py-1 text-xs text-slate-600">
          <span>{i.name}</span>
          <span className="font-bold tabular-nums text-slate-800">{i.v}</span>
        </div>
      ))}
      {empty && <span className="text-xs text-slate-400">Tidak ada.</span>}
    </div>
  );
}

export default function RaporTab({ showToast }) {
  const f = useDashboardFilters();
  const [list, setList] = useState(null);
  // Rapor karyawan terpilih; `id` menunjukkan karyawan mana yang sudah dimuat.
  const [loaded, setLoaded] = useState({ id: null, data: null });

  useEffect(() => {
    api("/academy/dashboard/rapor")
      .then((res) => setList(res.rows))
      .catch((err) => {
        showToast(err.message, "error");
        setList([]);
      });
  }, [showToast]);

  const curId = useMemo(() => (list ? computeRapor(f.st, list, null).cur?.id ?? null : null), [f.st, list]);

  useEffect(() => {
    if (curId === null) return undefined;
    let live = true;
    api(`/academy/dashboard/rapor/${curId}`)
      .then((res) => live && setLoaded({ id: curId, data: res.data }))
      .catch((err) => {
        if (!live) return;
        showToast(err.message, "error");
        setLoaded({ id: curId, data: null });
      });
    return () => {
      live = false;
    };
  }, [curId, showToast]);

  const detail = loaded.id === curId ? loaded.data : null;
  const v = useMemo(() => (list ? computeRapor(f.st, list, detail) : null), [f.st, list, detail]);
  if (!v) return <Spinner />;
  const detailLoading = curId !== null && loaded.id !== curId;

  return (
    <div className="space-y-6">
      <InfoNote>
        Rapor dihitung dari data training, OJT, dan skill matrix karyawan Waschen. Daftar berisi karyawan yang sudah punya data Academy. Posisi yang bisa adalah
        posisi skill matrix dengan 3 bintang ke atas, dan nilai sikap adalah rata-rata semua penilaian sikap (skill matrix dan mentor).
      </InfoNote>

      <FilterBar>
        <SelectField label="Posisi" value={f.st.pos} onChange={f.setPos} options={v.posOpts} />
        <SelectField label="Cabang" value={f.st.cab} onChange={f.setCab} options={v.cabOpts} />
        <SelectField label="Urutkan sikap" value={f.st.sortS} onChange={(sortS) => f.set({ sortS })} options={v.sortOpts} />
        <SelectField label="Bisa di posisi" value={f.st.can} onChange={(can) => f.set({ can })} options={v.canOpts} />
        <SelectField label="Belum bisa di posisi" value={f.st.cant} onChange={(cant) => f.set({ cant })} options={v.cantOpts} />
      </FilterBar>

      <KpiGrid>
        <KpiCard title="Karyawan" value={v.kEmp} sub={v.kEmpSub} />
        <KpiCard title="Rata-rata skill" value={v.kSkill} sub={v.kSkillSub} />
        <KpiCard title="Rata-rata sikap" value={v.kSikap} sub={v.kSikapSub} />
        <KpiCard title="Pernah jadi mentor" value={v.kMentor} sub={v.kMentorSub} />
      </KpiGrid>

      <TableCard
        title="Daftar karyawan"
        info="Klik karyawan untuk melihat rapotnya"
        template={LIST_TEMPLATE}
        minWidth={1100}
        headers={["Karyawan", "Cabang", "Posisi saat ini", "Posisi yang bisa", "Posisi yang belum bisa", "Sikap"]}
        footer={v.listInfo}
      >
        {v.rows.map((r) => (
          <GridRow key={r.id} template={LIST_TEMPLATE} background={r.bg} onClick={() => f.set({ sel: r.id })}>
            <span className="font-bold text-slate-800">{r.n}</span>
            <span>{r.cab}</span>
            <span>{r.pos}</span>
            <PositionChips items={r.can} emptyText="Belum ada" />
            <PositionChips items={r.cant} emptyText="Belum ada" />
            <ScoreLine on={r.siOn} off={r.siOff} value={r.siV} color={r.siCol} />
          </GridRow>
        ))}
        {v.empty && <EmptyRow>Belum ada karyawan dengan data Academy untuk pilihan ini.</EmptyRow>}
      </TableCard>

      {detailLoading && <Spinner />}
      {v.hasSel && (
        <section className="space-y-6">
          <div className={cardCls}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rapor karyawan</p>
            <p className="text-xl font-extrabold text-slate-800">{v.sel.n}</p>
            <p className="text-xs text-slate-500">
              Cabang: <b className="text-slate-800">{v.sel.cab}</b> <span className="px-1 text-slate-300">|</span> Posisi:{" "}
              <b className="text-slate-800">{v.sel.posAsli}</b>
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <HighlightList title={v.gapItemsTitle} items={v.gapItems} empty={v.gapItemsEmpty} />
            <HighlightList title={v.bestItemsTitle} items={v.bestItems} empty={v.bestItemsEmpty} />
          </div>

          <TableCard
            title="Riwayat Training"
            info="Program training yang telah diikuti beserta hasil penilaiannya"
            template={TRAINING_TEMPLATE}
            minWidth={820}
            headers={["Program", "Periode", "Pre-test", "Post-test", "Mentor", "Nilai Akhir", "Status"]}
          >
            {v.trRows.map((t, i) => (
              <GridRow key={`${t.name}-${i}`} template={TRAINING_TEMPLATE}>
                <span className="font-bold text-slate-800">{t.name}</span>
                <span>{t.bulan}</span>
                <span>{t.pre}</span>
                <span>{t.post}</span>
                <span>{t.m}</span>
                <span className="text-base font-bold tabular-nums text-slate-800">{t.akhir}</span>
                <Pill bg={t.hBg} fg={t.hFg}>
                  {t.hasil}
                </Pill>
              </GridRow>
            ))}
            {v.noTr && <EmptyRow>Belum ada hasil training.</EmptyRow>}
          </TableCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <TableCard
              title="Riwayat OJT"
              info="Program on-the-job training dan perkembangan nilainya"
              template={OJT_TEMPLATE}
              minWidth={560}
              headers={["Program", "Periode", "Nilai Awal", "Nilai Akhir", "Peningkatan"]}
            >
              {v.ojtRows.map((o, i) => (
                <GridRow key={`${o.name}-${i}`} template={OJT_TEMPLATE}>
                  <span className="font-bold text-slate-800">{o.name}</span>
                  <span>{o.tg}</span>
                  <span>{o.awal}</span>
                  <span>{o.akhir}</span>
                  <span className="font-bold" style={{ color: o.col }}>
                    {o.naik}
                  </span>
                </GridRow>
              ))}
              {v.noOjt && <EmptyRow>Belum pernah mengikuti OJT.</EmptyRow>}
            </TableCard>

            <TableCard
              title="Peran sebagai Mentor"
              info="Training yang pernah dibimbing dan penilaian dari peserta"
              template={MENTOR_TEMPLATE}
              minWidth={480}
              headers={["Program", "Jumlah Peserta", "Rating dari Peserta"]}
            >
              {v.mentorRows.map((m, i) => (
                <GridRow key={`${m.name}-${i}`} template={MENTOR_TEMPLATE}>
                  <span className="font-bold text-slate-800">{m.name}</span>
                  <span>{m.peserta}</span>
                  <ScoreLine on={m.on} off={m.off} value={m.v} color={PAL.ink} />
                </GridRow>
              ))}
              {v.noMentor && <EmptyRow>Belum pernah menjadi mentor.</EmptyRow>}
            </TableCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className={cardCls}>
              <h2 className="text-sm font-bold text-slate-800">Kompetensi per Posisi</h2>
              <p className="mb-3 text-xs text-slate-400">Tingkat kompetensi karyawan pada setiap posisi (skala 1–4)</p>
              {v.blocks.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 text-xs last:border-0">
                  <span className="flex flex-wrap items-center gap-2 font-bold text-slate-800">
                    {b.pos}
                    {b.additional && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Skill tambahan</span>}
                  </span>
                  <ScoreLine on={b.on} off={b.off} value={b.v} color={b.col} />
                </div>
              ))}
              {v.noBlocks && <span className="text-xs text-slate-400">Belum ada penilaian skill matrix.</span>}
            </section>

            <section className={cardCls}>
              <h2 className="text-sm font-bold text-slate-800">Penilaian Sikap</h2>
              <p className="mb-3 text-xs text-slate-400">Rata-rata penilaian sikap dari seluruh sumber penilaian</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-500">Nilai sikap</span>
                <ScoreLine on={v.sel.siOn} off={v.sel.siOff} value={v.sel.siV} color={v.sel.siCol} />
              </div>
              <p className="mb-3 mt-1 text-[11px] text-slate-400">rata-rata dari semua penilaian sikap (skill matrix dan mentor)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <SikapList title="Sikap yang sudah baik" items={v.sikapGood} empty={v.sikapGoodEmpty} />
                <SikapList title="Sikap yang belum baik" items={v.sikapBad} empty={v.sikapBadEmpty} />
              </div>
            </section>
          </div>
        </section>
      )}
    </div>
  );
}
