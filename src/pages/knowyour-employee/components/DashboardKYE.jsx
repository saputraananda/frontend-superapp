import { useState, useEffect } from "react";
import {
  HiOutlineChartBarSquare,
  HiOutlineExclamationTriangle,
  HiOutlineArrowTrendingUp,
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineLightBulb,
  HiOutlineSun,
  HiOutlineFaceSmile,
  HiOutlineCloud,
  HiOutlineFaceFrown,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function cn(...c) {
  return c.filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────
// Dummy Data
// ─────────────────────────────────────────────
const BURNOUT_DATA = [
  { rank: 1, name: "Diana Putri", dept: "Customer Service", score: 78, level: "Tinggi" },
  { rank: 2, name: "Rizky Ananda", dept: "Operasional", score: 74, level: "Tinggi" },
  { rank: 3, name: "Kenza Aulia", dept: "Sales", score: 71, level: "Tinggi" },
  { rank: 4, name: "Fajar Ramadhan", dept: "Logistik", score: 69, level: "Tinggi" },
  { rank: 5, name: "Ayu Lestari", dept: "Keuangan", score: 65, level: "Tinggi" },
  { rank: 6, name: "Muhammad Iqbal", dept: "IT", score: 63, level: "Tinggi" },
  { rank: 7, name: "Putri Amelia", dept: "Marketing", score: 61, level: "Tinggi" },
  { rank: 8, name: "Andi Pratama", dept: "Gudang", score: 59, level: "Warning" },
  { rank: 9, name: "Siti Nurhaliza", dept: "SDM", score: 58, level: "Warning" },
  { rank: 10, name: "Rahmat Hidayat", dept: "Operasional", score: 57, level: "Warning" },
];

const MOTIVASI_DATA = [
  { label: "Rekan kerja yang baik", pct: 78, color: "bg-blue-500" },
  { label: "Gaji & benefit", pct: 62, color: "bg-emerald-500" },
  { label: "Kesempatan berkembang", pct: 58, color: "bg-amber-500" },
  { label: "Atasan yang suportif", pct: 55, color: "bg-violet-500" },
  { label: "Lingkungan kerja nyaman", pct: 48, color: "bg-cyan-500" },
  { label: "Stabilitas perusahaan", pct: 40, color: "bg-indigo-400" },
  { label: "Lokasi dekat rumah", pct: 25, color: "bg-slate-400" },
  { label: "Fleksibilitas kerja", pct: 22, color: "bg-pink-400" },
  { label: "Budaya perusahaan", pct: 18, color: "bg-orange-400" },
  { label: "Lainnya", pct: 5, color: "bg-slate-300" },
];

const RESIGN_DATA = [
  { label: "Gaji & benefit lebih baik", pct: 68, color: "bg-rose-500" },
  { label: "Tidak ada jenjang karir", pct: 52, color: "bg-orange-500" },
  { label: "Beban kerja terlalu tinggi", pct: 41, color: "bg-amber-500" },
  { label: "Kurang apresiasi", pct: 37, color: "bg-emerald-500" },
  { label: "Konflik dengan atasan", pct: 23, color: "bg-blue-500" },
  { label: "Faktor keluarga", pct: 21, color: "bg-violet-500" },
  { label: "Ingin pengalaman baru", pct: 19, color: "bg-purple-400" },
  { label: "Lokasi kerja terlalu jauh", pct: 15, color: "bg-pink-400" },
  { label: "Konflik dengan rekan kerja", pct: 12, color: "bg-indigo-400" },
  { label: "Kondisi kesehatan", pct: 8, color: "bg-teal-400" },
  { label: "Lainnya", pct: 4, color: "bg-slate-300" },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function BarRow({ label, pct, color, delay = 0 }) {
  return (
    <div className="flex items-center gap-3">
      <p
        className="w-44 shrink-0 text-xs text-slate-600 leading-tight truncate"
        title={label}
      >
        {label}
      </p>
      <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-4 rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%`, transitionDelay: `${delay}ms` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-bold text-slate-600">
        {pct}%
      </span>
    </div>
  );
}

function BurnoutBadge({ level }) {
  const styles = {
    Tinggi: "bg-rose-50 text-rose-700 border-rose-200",
    Warning: "bg-amber-50 text-amber-700 border-amber-200",
    Rendah: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold",
        styles[level] ?? styles.Rendah
      )}
    >
      {level}
    </span>
  );
}

function ScoreBar({ score }) {
  const color =
    score >= 70 ? "bg-rose-500" : score >= 50 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-1.5 rounded-full", color)}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700">{score}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconBg, children, footer }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
          Dummy
        </span>
      </div>
      <div className="flex-1 p-5">{children}</div>
      {footer && (
        <div className="border-t border-slate-100 px-5 py-3">{footer}</div>
      )}
    </div>
  );
}

function QuickStat({ label, value, color }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn("text-sm font-bold", color)}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Mood Leaderboard Metadata
// ─────────────────────────────────────────────
const MOOD_LEADERBOARD_META = {
  lagi_bersinar: {
    title: "Lagi Bersinar",
    icon: HiOutlineSparkles,
    emoji: "✨",
    iconBg: "bg-amber-50 border-amber-200 text-amber-600",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Karyawan paling sering berenergi penuh",
  },
  santai_positif: {
    title: "Santai Positif",
    icon: HiOutlineSun,
    emoji: "😊",
    iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Karyawan paling sering tenang & produktif",
  },
  mode_standar: {
    title: "Mode Standar",
    icon: HiOutlineFaceSmile,
    emoji: "🙂",
    iconBg: "bg-sky-50 border-sky-200 text-sky-600",
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200",
    desc: "Karyawan paling sering merasa biasa saja",
  },
  agak_mendung: {
    title: "Agak Mendung",
    icon: HiOutlineCloud,
    emoji: "😐",
    iconBg: "bg-slate-50 border-slate-200 text-slate-500",
    badgeCls: "bg-slate-100 text-slate-650 text-slate-600 border-slate-200",
    desc: "Karyawan paling sering merasa lesu",
  },
  cuaca_hati_kurang_baik: {
    title: "Cuaca Hati Kurang Baik",
    icon: HiOutlineFaceFrown,
    emoji: "😟",
    iconBg: "bg-rose-50 border-rose-200 text-rose-600",
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Karyawan paling sering butuh support ekstra",
  },
};

// ─────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────
export default function DashboardKYE() {
  const [showAll, setShowAll] = useState(false);
  const [frequentMoods, setFrequentMoods] = useState(null);
  const [loadingMoods, setLoadingMoods] = useState(true);
  const [burnoutSummary, setBurnoutSummary] = useState({ high: 0, warning: 0, low: 0, total: 0 });
  const [burnoutTop10, setBurnoutTop10] = useState([]);
  const [loadingBurnout, setLoadingBurnout] = useState(true);

  useEffect(() => {
    const fetchFrequentMoods = async () => {
      try {
        const res = await api("/know-your-employee/mood/most-frequent");
        if (res?.success) {
          setFrequentMoods(res.data);
        }
      } catch (err) {
        console.error("Gagal mengambil data mood terakumulasi:", err);
      } finally {
        setLoadingMoods(false);
      }
    };
    fetchFrequentMoods();
  }, []);

  useEffect(() => {
    const fetchBurnoutStats = async () => {
      try {
        const res = await api("/analysis-burnout/dashboard-stats");
        if (res?.success) {
          setBurnoutSummary(res.data.summary);
          setBurnoutTop10(res.data.top10);
        }
      } catch (err) {
        console.error("Gagal mengambil data burnout stats:", err);
      } finally {
        setLoadingBurnout(false);
      }
    };
    fetchBurnoutStats();
  }, []);

  const displayed = showAll ? burnoutTop10 : burnoutTop10.slice(0, 10);

  return (
    <main className="min-h-screen bg-violet-50 py-6 sm:py-8">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── Page Header ── */}
        <section className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-slate-950 via-violet-700 to-purple-500 p-5 shadow-sm sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-purple-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                <HiOutlineChartBarSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard KYE</h1>
                <p className="text-sm text-white/70">
                  Burnout Risk · Motivasi · Potensi Resign —{" "}
                  <span className="font-semibold text-amber-300">Dummy Data</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5">
              <HiOutlineSparkles className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-semibold text-white/80">Periode: Juni 2026</span>
            </div>
          </div>
        </section>

        {/* ── Quick Stats ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Partisipan Burnout", value: loadingBurnout ? "..." : burnoutSummary.total, cls: "bg-violet-100 text-violet-600" },
            { label: "Burnout Tinggi", value: loadingBurnout ? "..." : burnoutSummary.high, cls: "bg-rose-100   text-rose-600" },
            { label: "Burnout Warning", value: loadingBurnout ? "..." : burnoutSummary.warning, cls: "bg-amber-100  text-amber-600" },
            { label: "Risiko Resign", value: "18%", cls: "bg-purple-100 text-purple-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className={cn("mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg", s.cls)}>
                <HiOutlineExclamationTriangle className="h-4 w-4" />
              </div>
              <p className={cn("text-2xl font-bold", s.cls.split(" ")[1])}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </section>

        {/* ── Three Charts ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Chart 1 — Burnout Risk */}
          <SectionCard
            title="Burnout Risk – Top 10 Karyawan"
            icon={HiOutlineExclamationTriangle}
            iconBg="bg-rose-100 text-rose-600"
            footer={
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition"
              >
                {showAll ? "Tampilkan lebih sedikit" : "Lihat Semua"}
                <HiOutlineArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="pb-2 pr-2">No</th>
                    <th className="pb-2 pr-2">Nama Karyawan</th>
                    <th className="pb-2 pr-2">Score</th>
                    <th className="pb-2">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingBurnout ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="h-4 w-4 animate-spin rounded-full border border-violet-600 border-t-transparent" />
                          <span>Memuat data burnout...</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayed.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        Belum ada data survei.
                      </td>
                    </tr>
                  ) : (
                    displayed.map((row) => (
                      <tr
                        key={row.rank}
                        className="hover:bg-violet-50/40 transition-colors"
                      >
                        <td className="py-2 pr-2 text-slate-400 font-medium">{row.rank}</td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">
                              {row.name ? row.name.charAt(0) : "?"}
                            </div>
                            <span className="font-semibold text-slate-700 truncate max-w-[90px]" title={row.name}>
                              {row.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-2">
                          <ScoreBar score={row.score} />
                        </td>
                        <td className="py-2">
                          <BurnoutBadge level={row.level} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-2">
              <QuickStat label="Tinggi (≥70)" value={loadingBurnout ? "..." : `${burnoutSummary.high} karyawan`} color="text-rose-600" />
              <QuickStat label="Warning (40–69)" value={loadingBurnout ? "..." : `${burnoutSummary.warning} karyawan`} color="text-amber-600" />
              <QuickStat label="Rendah (<40)" value={loadingBurnout ? "..." : `${burnoutSummary.low} karyawan`} color="text-emerald-600" />
            </div>
          </SectionCard>

          {/* Chart 2 — Motivasi Utama */}
          <SectionCard
            title="Motivasi Utama Karyawan"
            icon={HiOutlineLightBulb}
            iconBg="bg-amber-100 text-amber-600"
          >
            <div className="space-y-3">
              {MOTIVASI_DATA.map((row, i) => (
                <BarRow
                  key={row.label}
                  label={row.label}
                  pct={row.pct}
                  color={row.color}
                  delay={i * 60}
                />
              ))}
            </div>
            <p className="mt-4 text-[10px] text-slate-400 text-center">
              * Survei internal Q2 2026 — n=145 responden
            </p>
          </SectionCard>

          {/* Chart 3 — Potensi Resign */}
          <SectionCard
            title="Faktor Utama Potensi Resign"
            icon={HiOutlineArrowTrendingUp}
            iconBg="bg-rose-100 text-rose-600"
          >
            <div className="space-y-3">
              {RESIGN_DATA.map((row, i) => (
                <BarRow
                  key={row.label}
                  label={row.label}
                  pct={row.pct}
                  color={row.color}
                  delay={i * 60}
                />
              ))}
            </div>
            <p className="mt-4 text-[10px] text-slate-400 text-center">
              * Exit interview & survei potensi resign Q2 2026
            </p>
          </SectionCard>
        </div>

        {/* ── Akumulasi Suasana Hati Terbanyak (All-Time) ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
              <HiOutlineSparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Akumulasi Suasana Hati Terbanyak</h2>
              <p className="text-xs text-slate-400">
                Peringkat karyawan yang paling sering melaporkan suasana hati tertentu (Akumulasi Nilai Selama Ini)
              </p>
            </div>
          </div>

          {loadingMoods ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-slate-200 bg-white shadow-sm gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
              <p className="text-xs text-slate-400">Memuat data akumulasi suasana hati...</p>
            </div>
          ) : !frequentMoods ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-slate-200 bg-white shadow-sm text-center">
              <p className="text-xs text-slate-400 italic">Gagal memuat data atau belum ada data mood yang tercatat.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {Object.entries(MOOD_LEADERBOARD_META).map(([key, meta]) => {
                const list = frequentMoods[key] || [];
                const Icon = meta.icon;

                return (
                  <div
                    key={key}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    {/* Mood Header */}
                    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5 bg-slate-50/50">
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border shrink-0", meta.iconBg)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-800 leading-tight">
                          {meta.title} {meta.emoji}
                        </h3>
                        <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5" title={meta.desc}>
                          {meta.desc}
                        </p>
                      </div>
                    </div>

                    {/* Mood Leaderboard List */}
                    <div className="flex-1 p-4 space-y-3">
                      {list.length === 0 ? (
                        <div className="flex items-center justify-center h-24 text-center">
                          <p className="text-[11px] text-slate-400 italic">Belum ada data</p>
                        </div>
                      ) : (
                        list.map((emp, index) => {
                          // Styling medal/rank colors for top 3
                          const rankColors = [
                            "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-400/20",
                            "bg-slate-300 text-slate-700 shadow-slate-300/20",
                            "bg-amber-700 text-white shadow-amber-700/20"
                          ];
                          const defaultRankColor = "bg-slate-100 text-slate-500";
                          const rankCls = rankColors[index] || defaultRankColor;

                          return (
                            <div key={emp.employee_id} className="flex items-center gap-2 text-xs">
                              {/* Rank Circle */}
                              <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold shadow-sm", rankCls)}>
                                {index + 1}
                              </div>

                              {/* Employee Profile and Name */}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-700 truncate" title={emp.full_name}>
                                  {emp.full_name}
                                </p>
                                <p className="text-[9px] text-slate-400 truncate">
                                  {emp.position_name || emp.department_name || "Staff"}
                                </p>
                              </div>

                              {/* Occurrence Count Badge */}
                              <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0 shadow-inner", meta.badgeCls)}>
                                {emp.total_count}x
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Insight Box ── */}
        <section className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <HiOutlineSparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">💡 Insight Otomatis</h3>
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                <li>
                  <span className="font-semibold text-rose-600">7 karyawan</span> memiliki Burnout
                  Score tinggi (≥60) — prioritaskan sesi 1-on-1 dengan HR minggu ini.
                </li>
                <li>
                  Motivasi utama adalah{" "}
                  <span className="font-semibold">rekan kerja yang baik (78%)</span> — jaga budaya
                  tim tetap positif dan kolaboratif.
                </li>
                <li>
                  Faktor resign terbesar:{" "}
                  <span className="font-semibold text-rose-600">gaji & benefit (68%)</span> —
                  review kompensasi Q3 perlu diprioritaskan.
                </li>
                <li>
                  Departemen{" "}
                  <span className="font-semibold">Customer Service &amp; Operasional</span>{" "}
                  memiliki konsentrasi burnout tertinggi.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <p className="text-center text-[11px] text-slate-400 pb-2">
          ⚠️ Data di halaman ini adalah{" "}
          <strong>dummy data</strong> untuk keperluan desain &amp; presentasi.
          Akan diganti dengan data real setelah integrasi selesai.
        </p>

      </div>
    </main>
  );
}
