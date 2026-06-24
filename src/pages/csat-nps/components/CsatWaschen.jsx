import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import {
  HiOutlineStar, HiOutlineChartBar, HiOutlineChatBubbleLeftRight,
  HiOutlineFaceSmile, HiOutlineFaceFrown, HiOutlineMinus,
  HiOutlineArrowTrendingUp, HiOutlineClipboardDocumentList,
  HiOutlineClock, HiOutlineArrowPath, HiOutlineSparkles,
  HiOutlineXMark, HiOutlineFunnel, HiOutlinePencilSquare,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const ALL_LAYANAN_WASCHEN = ["Satuan", "Kiloan"];

const CSAT_LABELS = {
  1: { label: "Sangat Tidak Puas", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  2: { label: "Tidak Puas", color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  3: { label: "Netral", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  4: { label: "Puas", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  5: { label: "Sangat Puas", color: "bg-green-500", text: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
};

const NPS_COLORS = {
  Promoter: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", bar: "bg-emerald-500" },
  Passive: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", bar: "bg-amber-500" },
  Detractor: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", bar: "bg-red-500" },
};

function StatCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 sm:p-5", accent.border, accent.bg,
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent.iconBg)}>
          <Icon className={cn("h-4 w-4", accent.iconText)} />
        </div>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">{value}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function Stars({ score, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <HiOutlineStar key={i} className={cn("h-3.5 w-3.5", i < score ? "text-amber-400 fill-amber-400" : "text-slate-300")} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Layanan Editor for Waschen
// ─────────────────────────────────────────────
function LayananEditorWaschen({ row, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [layanan, setLayanan] = useState(row.layanan || "");
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    try {
      await api(`/csat-nps/waschen/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ layanan }),
      });
      setIsEditing(false);
      onSaved();
    } catch (e) {
      setErrorMsg("Gagal menyimpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowConfirmDelete(true);
  };

  const executeDelete = async () => {
    setDeleting(true);
    setErrorMsg("");
    try {
      await api(`/csat-nps/waschen/${row.id}`, { method: "DELETE" });
      onSaved();
    } catch (e) {
      setErrorMsg("Gagal menghapus: " + e.message);
      setShowConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setLayanan(row.layanan || "");
    setIsEditing(false);
    setErrorMsg("");
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Stars score={row.csat_score} />
        <span className="text-xs font-semibold text-slate-600">{row.csat_label}</span>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
          NPS_COLORS[row.nps_category]?.bg, NPS_COLORS[row.nps_category]?.text
        )}>{row.nps_category}</span>
        <span className="text-xs font-bold text-slate-700 ml-auto">NPS: {row.nps_score}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
        {row.no_nota && <span>No. Nota: <strong className="text-slate-700">{row.no_nota}</strong></span>}
        <span>{row.created_at}</span>
      </div>

      {/* Layanan editor */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Layanan</label>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              title="Edit Layanan"
            >
              <HiOutlinePencilSquare className="h-4 w-4" />
            </button>
          )}
        </div>

        {!isEditing ? (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between min-h-[40px]">
            {row.layanan ? (
              <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium border border-violet-100">
                {row.layanan}
              </span>
            ) : (
              <span className="text-xs text-slate-400 italic">Belum ada layanan dipilih</span>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={layanan}
              onChange={(e) => setLayanan(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
            >
              {!row.layanan && <option value="">— Pilih —</option>}
              {ALL_LAYANAN_WASCHEN.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={saving || showConfirmDelete}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-50"
            >
              {saving ? "..." : "Simpan"}
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={deleting || showConfirmDelete}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition disabled:opacity-50 whitespace-nowrap"
            >
              Hapus Penilaian
            </button>
            {row.layanan && (
              <button
                onClick={handleCancel}
                disabled={showConfirmDelete}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Batal
              </button>
            )}
          </div>
        )}
      </div>

      {showConfirmDelete && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs space-y-2.5 animate-fadeIn">
          <p className="font-semibold text-red-800">Apakah Anda yakin ingin menghapus penilaian ini secara keseluruhan?</p>
          <div className="flex gap-2">
            <button
              onClick={executeDelete}
              disabled={deleting}
              className="px-3 py-1.5 font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 shadow-sm"
            >
              {deleting ? "..." : "Ya, Hapus Penilaian"}
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              disabled={deleting}
              className="px-3 py-1.5 font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition shadow-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 bg-red-50 border border-red-150 rounded-xl p-3 text-xs text-red-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-red-500 font-bold hover:text-red-700 px-1 text-base">×</button>
        </div>
      )}

      {row.feedback_tags && (
        <div className="flex flex-wrap gap-1 mb-2">
          {row.feedback_tags.split(",").map((t, i) => (
            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-semibold">{t.trim()}</span>
          ))}
        </div>
      )}
      {row.feedback_text && (
        <p className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3">{row.feedback_text}</p>
      )}
    </div>
  );
}

export default function CsatWaschen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /* ── Modal state ── */
  const [modal, setModal] = useState({ open: false, title: "", loading: false, data: [], pagination: {} });
  const [modalFilters, setModalFilters] = useState({});

  /* ── Detail table state ── */
  const [detail, setDetail] = useState({ data: [], pagination: { page: 1, totalPages: 1, total: 0 }, loading: false });
  const [filters, setFilters] = useState({ search: "", nps_category: "", csat_score: "", startDate: "", endDate: "" });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api("/csat-nps/stats/waschen");
      setData(res.data || null);
    } catch (e) {
      setErr(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  /* ── Fetch detail rows ── */
  const fetchDetail = useCallback(async (page = 1, f = filters) => {
    setDetail(p => ({ ...p, loading: true }));
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (f.search) params.set("search", f.search);
      if (f.nps_category) params.set("nps_category", f.nps_category);
      if (f.csat_score) params.set("csat_score", f.csat_score);
      if (f.startDate) params.set("startDate", f.startDate);
      if (f.endDate) params.set("endDate", f.endDate);
      const res = await api(`/csat-nps/waschen?${params}`);
      setDetail({ data: res.data || [], pagination: res.pagination || {}, loading: false });
    } catch {
      setDetail(p => ({ ...p, loading: false }));
    }
  }, [filters]);

  useEffect(() => { fetchDetail(1, filters); /* eslint-disable-next-line */ }, []);

  /* ── Fetch modal data ── */
  const fetchModal = useCallback(async (flt = {}, page = 1) => {
    setModal(p => ({ ...p, loading: true }));
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      Object.entries(flt).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api(`/csat-nps/waschen?${params}`);
      setModal(p => ({ ...p, data: res.data || [], pagination: res.pagination || {}, loading: false }));
    } catch {
      setModal(p => ({ ...p, loading: false }));
    }
  }, []);

  const openModal = (title, flt = {}) => {
    setModal({ open: true, title, loading: true, data: [], pagination: {} });
    setModalFilters(flt);
    fetchModal(flt);
  };
  const closeModal = () => setModal(p => ({ ...p, open: false }));

  /* ── Detail helpers ── */
  const applyFilters = () => fetchDetail(1, filters);
  const resetFilters = () => {
    const f = { search: "", nps_category: "", csat_score: "", startDate: "", endDate: "" };
    setFilters(f);
    fetchDetail(1, f);
  };

  const handleSearchKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyFilters(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">{err}</p>
          <button onClick={fetchStats} className="text-sm text-blue-600 hover:underline">Coba lagi</button>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};
  const total = s.total_responses || 0;
  const maxCsat = Math.max(...(data?.csat_distribution || []).map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── Header ── */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 p-5 shadow-sm sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-purple-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                <HiOutlineSparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">Waschen Laundry</h1>
                <p className="text-sm text-white/70">Customer Satisfaction (CSAT) & Net Promoter Score (NPS)</p>
              </div>
            </div>
            <button onClick={fetchStats}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0">
              <HiOutlineArrowPath className="h-4 w-4" /> Refresh
            </button>
          </div>
        </section>

        {/* ── Stat Cards ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={HiOutlineClipboardDocumentList}
            label="Total Respon"
            value={total}
            sub="Survey terkumpul"
            onClick={() => openModal("Semua Respon")}
            accent={{ border: "border-slate-200", bg: "bg-white", iconBg: "bg-blue-100", iconText: "text-blue-600" }}
          />
          <StatCard
            icon={HiOutlineStar}
            label="Rata-rata CSAT"
            value={Number(s.avg_csat || 0).toFixed(1)}
            sub={<span className="flex items-center gap-1"><Stars score={Math.round(s.avg_csat || 0)} /> <span>dari 5</span></span>}
            onClick={() => openModal("Rata-rata CSAT")}
            accent={{ border: "border-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-100", iconText: "text-amber-600" }}
          />
          <StatCard
            icon={HiOutlineArrowTrendingUp}
            label="NPS Score"
            value={s.nps_score ?? 0}
            sub={`Skala -100 s/d +100`}
            onClick={() => openModal("NPS Score")}
            accent={{ border: "border-emerald-200", bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconText: "text-emerald-600" }}
          />
          <StatCard
            icon={HiOutlineFaceSmile}
            label="Promoters"
            value={total > 0 ? `${Math.round((s.promoters / total) * 100)}%` : "0%"}
            sub={`${s.promoters || 0} dari ${total} responden`}
            onClick={() => openModal("Promoters", { nps_category: "Promoter" })}
            accent={{ border: "border-green-200", bg: "bg-green-50", iconBg: "bg-green-100", iconText: "text-green-600" }}
          />
        </section>

        {/* ── CSAT Distribution + NPS Breakdown ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CSAT Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineChartBar className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">Distribusi Skor CSAT</h2>
            </div>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map(score => {
                const dist = (data?.csat_distribution || []).find(d => d.csat_score === score);
                const count = dist?.count || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const cfg = CSAT_LABELS[score];
                return (
                  <div key={score}
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1 -mx-2 transition"
                    onClick={() => openModal(`CSAT ${score} — ${cfg.label}`, { csat_score: String(score) })}
                  >
                    <div className="flex items-center gap-1.5 w-28 shrink-0">
                      <HiOutlineStar className={cn("h-4 w-4", score >= 4 ? "text-green-500 fill-green-500" : score === 3 ? "text-amber-500 fill-amber-500" : "text-red-500 fill-red-500")} />
                      <span className="text-xs font-semibold text-slate-700">{score}</span>
                      <span className="text-[10px] text-slate-400 truncate">{cfg.label}</span>
                    </div>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-5 rounded-full transition-all duration-700", cfg.color)}
                        style={{ width: `${maxCsat > 0 ? (count / maxCsat) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="w-14 text-right shrink-0">
                      <span className="text-xs font-bold text-slate-700">{count}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NPS Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineFaceSmile className="h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-800">NPS Breakdown</h2>
            </div>
            <div className="space-y-4">
              {["Promoter", "Passive", "Detractor"].map(cat => {
                const count = cat === "Promoter" ? s.promoters : cat === "Passive" ? s.passives : s.detractors;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors = NPS_COLORS[cat];
                const Icon = cat === "Promoter" ? HiOutlineFaceSmile : cat === "Detractor" ? HiOutlineFaceFrown : HiOutlineMinus;
                return (
                  <div key={cat}
                    className={cn("rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all duration-200", colors.border, colors.bg)}
                    onClick={() => openModal(cat, { nps_category: cat })}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", colors.text)} />
                        <span className={cn("text-xs font-bold", colors.text)}>{cat}</span>
                        <span className="text-[10px] text-slate-400">
                          {cat === "Promoter" ? "(9-10)" : cat === "Passive" ? "(7-8)" : "(0-6)"}
                        </span>
                      </div>
                      <span className={cn("text-sm font-extrabold", colors.text)}>{count}</span>
                    </div>
                    <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                      <div className={cn("h-2 rounded-full transition-all duration-700", colors.bar)} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{pct}% dari total respon</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Top Feedback Tags + Recent Feedback ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Tags */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-800">Topik Feedback</h2>
            </div>
            {data?.top_tags?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.top_tags.map((t, i) => (
                  <span key={i}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer hover:shadow-sm transition",
                      i < 3 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200"
                    )}
                    onClick={() => openModal(`Tag: ${t.tag}`, { search: t.tag })}
                  >
                    {t.tag}
                    <span className="text-[10px] font-bold opacity-60">×{t.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada feedback tag</p>
            )}
          </div>

          {/* Recent Feedback */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-violet-500" />
              <h2 className="text-sm font-bold text-slate-800">Feedback Terbaru</h2>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {data?.recent_feedback?.length > 0 ? data.recent_feedback.map((fb) => (
                <div key={fb.id}
                  className="border-b border-slate-100 pb-3 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-2 -mx-2 transition"
                  onClick={() => openModal(`Feedback: ${fb.no_nota || "#" + fb.id}`, { search: fb.no_nota || "" })}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Stars score={fb.csat_score} />
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      NPS_COLORS[fb.nps_category]?.bg, NPS_COLORS[fb.nps_category]?.text
                    )}>{fb.nps_category}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{fb.no_nota || ""}</span>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-2">{fb.feedback_text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{fb.created_at}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic">Belum ada feedback teks</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Monthly Trend ── */}
        {data?.monthly_trend?.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineArrowTrendingUp className="h-5 w-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-800">Tren Bulanan (12 Bulan Terakhir)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-500">Bulan</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500">Respon</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500">Avg CSAT</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500">Avg NPS</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500">Promoter</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-500">Detractor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly_trend.map((m) => (
                    <tr key={m.month} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-700">{m.month}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">{m.responses}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineStar className="h-3 w-3 text-amber-400 fill-amber-400" />
                          {m.avg_csat}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-indigo-600">{m.avg_nps}</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-semibold">{m.promoters}</td>
                      <td className="py-2 px-3 text-center text-red-600 font-semibold">{m.detractors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Recent Responses ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineClock className="h-5 w-5 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">Respon Terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">No. Nota</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Layanan</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">CSAT</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Label</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">NPS</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">Kategori</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Tags</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_responses || []).map((r) => (
                  <tr key={r.id}
                    className="border-b border-slate-100 hover:bg-violet-50 cursor-pointer transition"
                    onClick={() => openModal(`Detail: ${r.no_nota || "#" + r.id}`, { search: r.no_nota || "" })}
                  >
                    <td className="py-2 px-3 font-medium text-slate-700">{r.no_nota || "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{r.layanan || "—"}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center gap-0.5">
                        <HiOutlineStar className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="font-bold">{r.csat_score}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{r.csat_label}</td>
                    <td className="py-2 px-3 text-center font-bold">{r.nps_score}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        NPS_COLORS[r.nps_category]?.bg, NPS_COLORS[r.nps_category]?.text
                      )}>{r.nps_category}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 max-w-[150px] truncate">{r.feedback_tags || "—"}</td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Detail Table with Filters & Pagination ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineFunnel className="h-5 w-5 text-violet-500" />
            <h2 className="text-sm font-bold text-slate-800">Detail Data Respon</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <input type="text" placeholder="Cari nota / feedback..." value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              onKeyDown={handleSearchKey}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none w-48" />
            <select value={filters.nps_category} onChange={e => setFilters(p => ({ ...p, nps_category: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none">
              <option value="">Semua Kategori</option>
              <option value="Promoter">Promoter</option>
              <option value="Passive">Passive</option>
              <option value="Detractor">Detractor</option>
            </select>
            <select value={filters.csat_score} onChange={e => setFilters(p => ({ ...p, csat_score: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none">
              <option value="">Semua CSAT</option>
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} — {CSAT_LABELS[n].label}</option>)}
            </select>
            <input type="date" value={filters.startDate} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none" />
            <input type="date" value={filters.endDate} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none" />
            <button onClick={applyFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition">Filter</button>
            <button onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">Reset</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">No. Nota</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Layanan</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">CSAT</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Label</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">NPS</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">Kategori</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Tags</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Feedback</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {detail.loading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">Loading...</td></tr>
                ) : detail.data.length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">Tidak ada data</td></tr>
                ) : detail.data.map((r) => (
                  <tr key={r.id}
                    className="border-b border-slate-100 hover:bg-violet-50 cursor-pointer transition"
                    onClick={() => openModal(`Detail: ${r.no_nota || "#" + r.id}`, { search: r.no_nota || "" })}
                  >
                    <td className="py-2 px-3 font-medium text-slate-700">{r.no_nota || "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{r.layanan || "—"}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center gap-0.5">
                        <HiOutlineStar className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="font-bold">{r.csat_score}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{r.csat_label}</td>
                    <td className="py-2 px-3 text-center font-bold">{r.nps_score}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        NPS_COLORS[r.nps_category]?.bg, NPS_COLORS[r.nps_category]?.text
                      )}>{r.nps_category}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 max-w-[120px] truncate">{r.feedback_tags || "—"}</td>
                    <td className="py-2 px-3 text-slate-500 max-w-[150px] truncate">{r.feedback_text || "—"}</td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Halaman {detail.pagination.page} dari {detail.pagination.totalPages} ({detail.pagination.total} data)
              </span>
              <div className="flex gap-1">
                <button disabled={detail.pagination.page <= 1}
                  onClick={() => fetchDetail(detail.pagination.page - 1, filters)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
                {Array.from({ length: Math.min(5, detail.pagination.totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(detail.pagination.page - 2 + i, detail.pagination.totalPages - 4 + i));
                  return p;
                }).filter((v, i, a) => a.indexOf(v) === i).map(p => (
                  <button key={p}
                    onClick={() => fetchDetail(p, filters)}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg border transition",
                      p === detail.pagination.page
                        ? "bg-violet-600 text-white border-violet-600"
                        : "border-slate-200 hover:bg-slate-50"
                    )}>{p}</button>
                ))}
                <button disabled={detail.pagination.page >= detail.pagination.totalPages}
                  onClick={() => fetchDetail(detail.pagination.page + 1, filters)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Modal Detail ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">{modal.title}</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
                <HiOutlineXMark className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {modal.loading ? (
                <div className="flex items-center justify-center h-32">
                  <HiOutlineArrowPath className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
              ) : modal.data.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Tidak ada data</p>
              ) : (
                <div className="space-y-3">
                  {modal.data.map(r => (
                    <LayananEditorWaschen
                      key={r.id}
                      row={r}
                      onSaved={() => { closeModal(); fetchStats(); fetchDetail(1); }}
                    />
                  ))}
                </div>
              )}
            </div>
            {modal.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Halaman {modal.pagination.page} dari {modal.pagination.totalPages}
                </span>
                <div className="flex gap-1">
                  <button disabled={modal.pagination.page <= 1}
                    onClick={() => fetchModal(modalFilters, modal.pagination.page - 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
                  <button disabled={modal.pagination.page >= modal.pagination.totalPages}
                    onClick={() => fetchModal(modalFilters, modal.pagination.page + 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
