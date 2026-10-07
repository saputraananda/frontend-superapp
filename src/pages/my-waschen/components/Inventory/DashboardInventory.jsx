import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  HiOutlineArchiveBox,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineArrowRight,
  HiOutlineBuildingStorefront,
  HiOutlineChartBarSquare,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineCube,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import { fmtEmployeeName } from "../../utils/hrisUtils";
import { exportInventoryData } from "./utils/exportInventoryData";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({ icon: Icon, label, value, sub, tone = "slate", onClick }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-800",
    rose: "border-rose-100 bg-rose-50/70 text-rose-900",
    amber: "border-amber-100 bg-amber-50/70 text-amber-900",
    brand: "border-[#5f1340]/15 bg-[#5f1340]/5 text-[#3d0728]",
  };
  const iconTone = {
    slate: "bg-slate-100 text-slate-600",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    brand: "bg-[#5f1340] text-white",
  };
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        "rounded-2xl border p-4 shadow-sm text-left w-full transition",
        tones[tone],
        clickable &&
          "cursor-pointer hover:shadow-md hover:border-[#5f1340]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5f1340]/30",
        !clickable && "cursor-default"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
          <p className="mt-1 text-xl font-bold truncate">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] opacity-70">{sub}</p>}
          {clickable && <p className="mt-1 text-[10px] font-semibold opacity-50">Klik untuk rincian</p>}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconTone[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </button>
  );
}

const MOVE_STYLE = {
  In: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Out: "bg-rose-50 text-rose-700 border-rose-200",
  Adjust: "bg-amber-50 text-amber-700 border-amber-200",
  Usage: "bg-slate-100 text-slate-700 border-slate-200",
};

const DETAIL_META = {
  outlets: { title: "Daftar Outlet", subtitle: "Semua cabang Waschen Laundry" },
  catalog: { title: "Katalog Item", subtitle: "Master item inventory aktif" },
  stock: { title: "Baris Stok", subtitle: "Stok aktif per outlet × item" },
  low: { title: "Di bawah Min", subtitle: "Qty ≤ min stock" },
  zero: { title: "Stok Kosong", subtitle: "Qty current ≤ 0" },
  moves: { title: "Gerakan 7 Hari", subtitle: "Log stok 7 hari terakhir" },
};

export default function DashboardInventory() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [detailKey, setDetailKey] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [detailFilter, setDetailFilter] = useState("");
  const hasLoadedRef = useRef(false);

  const load = useCallback(
    async (opts = {}) => {
      const silent = opts?.silent === true || hasLoadedRef.current;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams();
        if (search) q.set("search", search);
        if (lowOnly) q.set("lowOnly", "1");
        const res = await api(`/waschen/inventory/dashboard?${q}`);
        setData(res.data || null);
        hasLoadedRef.current = true;
      } catch (err) {
        setError(err.message || "Gagal memuat dashboard inventory");
        if (!silent) setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, lowOnly]
  );

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load({ silent: true }));

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!detailKey) return undefined;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setDetailKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      window.removeEventListener("keydown", onKey);
    };
  }, [detailKey]);

  const openDetail = (key) => {
    setDetailFilter("");
    setDetailKey(key);
  };

  const overview = data?.overview;
  const outlets = useMemo(() => data?.outlets || [], [data?.outlets]);
  const catalog = useMemo(() => data?.catalog || [], [data?.catalog]);
  const stockRows = useMemo(() => data?.stockRows || [], [data?.stockRows]);
  const lowStock = useMemo(() => data?.lowStock || [], [data?.lowStock]);
  const zeroStock = useMemo(() => data?.zeroStock || [], [data?.zeroStock]);
  const movements7d = useMemo(() => data?.movements7d || [], [data?.movements7d]);
  const matrix = data?.matrix || { outlets: [], items: [] };
  const recentLogs = data?.recentLogs || [];

  const downloadExcel = async () => {
    setExporting(true);
    setError("");
    try {
      await exportInventoryData({ outlets, catalog, stockRows });
    } catch (err) {
      setError(err.message || "Gagal mengunduh Excel");
    } finally {
      setExporting(false);
    }
  };

  const worstOutlet = useMemo(() => {
    if (!outlets.length) return null;
    return [...outlets].sort((a, b) => b.low_stock_count - a.low_stock_count)[0];
  }, [outlets]);

  const detailRows = useMemo(() => {
    const q = detailFilter.trim().toLowerCase();
    const match = (...vals) => !q || vals.some((v) => String(v || "").toLowerCase().includes(q));

    if (detailKey === "outlets") {
      return outlets.filter((o) => match(o.outlet_code, o.name, o.full_name));
    }
    if (detailKey === "catalog") {
      return catalog.filter((r) => match(r.code, r.name, r.unit));
    }
    if (detailKey === "stock") {
      return stockRows.filter((r) => match(r.outlet_code, r.outlet_name, r.item_code, r.item_name));
    }
    if (detailKey === "low") {
      return lowStock.filter((r) => match(r.outlet_code, r.outlet_name, r.item_code, r.item_name));
    }
    if (detailKey === "zero") {
      return zeroStock.filter((r) => match(r.outlet_code, r.outlet_name, r.item_code, r.item_name));
    }
    if (detailKey === "moves") {
      return movements7d.filter((r) =>
        match(r.outlet_code, r.item_code, r.item_name, r.movement_type, r.employee_name)
      );
    }
    return [];
  }, [detailKey, detailFilter, outlets, catalog, stockRows, lowStock, zeroStock, movements7d]);

  const detailMeta = detailKey ? DETAIL_META[detailKey] : null;

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 max-w-[100rem] mx-auto">
      <PageHero>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Dashboard Inventory</h1>
          <p className="mt-1 text-sm text-white/75">
            Resume stok terkini semua outlet — pantau cepat sebelum masuk rincian manajemen
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/my-waschen/inventory"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
          >
            Manajemen Inventory
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={downloadExcel}
            disabled={exporting || !data}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#5f1340] hover:bg-white/90 disabled:opacity-50"
          >
            <HiOutlineArrowDownTray className="h-4 w-4" />
            {exporting ? "Mengunduh..." : "Download"}
          </button>
          <button
            type="button"
            onClick={() => load({ silent: true })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", (loading || refreshing) && "animate-spin")} />
            Refresh
          </button>
        </div>
      </PageHero>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          icon={HiOutlineBuildingStorefront}
          label="Outlet"
          value={loading && !data ? "…" : overview?.outletCount ?? 0}
          tone="brand"
          onClick={() => openDetail("outlets")}
        />
        <StatCard
          icon={HiOutlineCube}
          label="Katalog Item"
          value={loading && !data ? "…" : overview?.catalogItems ?? 0}
          onClick={() => openDetail("catalog")}
        />
        <StatCard
          icon={HiOutlineArchiveBox}
          label="Baris Stok"
          value={loading && !data ? "…" : overview?.stockRows ?? 0}
          onClick={() => openDetail("stock")}
        />
        <StatCard
          icon={HiOutlineExclamationTriangle}
          label="Di bawah Min"
          value={loading && !data ? "…" : overview?.lowStockCount ?? 0}
          sub={worstOutlet?.low_stock_count ? `Terbanyak: ${worstOutlet.outlet_code}` : undefined}
          tone="rose"
          onClick={() => openDetail("low")}
        />
        <StatCard
          icon={HiOutlineChartBarSquare}
          label="Stok Kosong"
          value={loading && !data ? "…" : overview?.zeroStockCount ?? 0}
          tone="amber"
          onClick={() => openDetail("zero")}
        />
        <StatCard
          icon={HiOutlineClock}
          label="Gerakan 7 Hari"
          value={loading && !data ? "…" : overview?.movements7d ?? 0}
          onClick={() => openDetail("moves")}
        />
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Ringkasan per Outlet</h2>
            <p className="text-xs text-slate-500">Klik outlet untuk buka manajemen stok cabang tersebut</p>
          </div>
        </div>
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3", refreshing && "opacity-70")}>
          {loading &&
            !data &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-100 bg-slate-100" />
            ))}
          {(!loading || data) &&
            outlets.map((o) => {
              const hasLow = Number(o.low_stock_count) > 0;
              return (
                <Link
                  key={o.outlet_id}
                  to={`/my-waschen/inventory?outletId=${o.outlet_id}`}
                  className={cn(
                    "group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md hover:border-[#5f1340]/30",
                    hasLow ? "border-rose-200" : "border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f1340]">{o.outlet_code}</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-800 truncate">{o.name}</p>
                    </div>
                    <HiOutlineArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#5f1340] transition" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-slate-400">Item</p>
                      <p className="text-sm font-bold text-slate-800">{o.total_items}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-rose-400">Min</p>
                      <p className={cn("text-sm font-bold", hasLow ? "text-rose-700" : "text-slate-800")}>
                        {o.low_stock_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-amber-500">Kosong</p>
                      <p className="text-sm font-bold text-slate-800">{o.zero_stock_count}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-slate-400">Gerakan terakhir: {fmtDate(o.last_movement_at)}</p>
                </Link>
              );
            })}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari item / outlet…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10"
          />
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
            className="rounded border-slate-300 text-[#5f1340] focus:ring-[#5f1340]"
          />
          Matriks: hanya item low stock
        </label>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Peringatan Stok Menipis</h2>
            <p className="text-xs text-slate-500">Semua outlet · qty ≤ min stock</p>
          </div>
          <button
            type="button"
            onClick={() => openDetail("low")}
            className="rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
          >
            {lowStock.length} item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Outlet</th>
                <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-4 py-2.5 text-right font-semibold">Min</th>
                <th className="px-4 py-2.5 text-right font-semibold">Kurang</th>
                <th className="px-4 py-2.5 text-right font-semibold" />
              </tr>
            </thead>
            <tbody className={cn(refreshing && "opacity-70")}>
              {loading && !data && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Memuat…
                  </td>
                </tr>
              )}
              {(!loading || data) && lowStock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Tidak ada stok di bawah minimum
                    {overview?.lowStockCount === 0 ? " — atau min stock belum di-set." : "."}
                  </td>
                </tr>
              )}
              {(!loading || data) &&
                lowStock.slice(0, 15).map((row) => (
                  <tr key={`${row.stock_id}`} className="border-t border-slate-100 hover:bg-rose-50/40">
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-[#5f1340]">{row.outlet_code}</span>
                      <span className="ml-1.5 text-xs text-slate-500">{row.outlet_name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{row.item_name}</p>
                      <p className="text-[11px] text-slate-400">{row.unit || "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-rose-700">{fmtQty(row.qty_current)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmtQty(row.min_stock)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-600">{fmtQty(row.shortage)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        to={`/my-waschen/inventory?outletId=${row.outlet_id}`}
                        className="text-[11px] font-bold text-[#5f1340] hover:underline"
                      >
                        Kelola
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {lowStock.length > 15 && (
          <div className="border-t border-slate-100 px-4 py-2.5 text-center">
            <button
              type="button"
              onClick={() => openDetail("low")}
              className="text-xs font-semibold text-[#5f1340] hover:underline"
            >
              Lihat semua {lowStock.length} item
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">Matriks Stok Lintas Outlet</h2>
          <p className="text-xs text-slate-500">
            Satu layar untuk bandingkan qty tiap item di semua cabang
            {matrix.items?.length ? ` · menampilkan ${matrix.items.length} item` : ""}
          </p>
        </div>
        <div className="overflow-auto max-h-[28rem]">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 shadow-sm">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 px-4 py-2.5 text-left font-semibold min-w-[200px]">Item</th>
                {(matrix.outlets || []).map((o) => (
                  <th key={o.id} className="px-3 py-2.5 text-center font-semibold whitespace-nowrap min-w-[88px]">
                    <span className="text-[#5f1340]">{o.outlet_code}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn(refreshing && "opacity-70")}>
              {loading && !data && (
                <tr>
                  <td colSpan={(matrix.outlets?.length || 0) + 1} className="px-4 py-8 text-center text-xs text-slate-400">
                    Memuat matriks…
                  </td>
                </tr>
              )}
              {(!loading || data) && (!matrix.items || matrix.items.length === 0) && (
                <tr>
                  <td colSpan={(matrix.outlets?.length || 0) + 1} className="px-4 py-8 text-center text-xs text-slate-400">
                    Tidak ada item untuk ditampilkan
                  </td>
                </tr>
              )}
              {(!loading || data) &&
                (matrix.items || []).map((it) => (
                  <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="sticky left-0 z-[1] bg-white px-4 py-2 border-r border-slate-100">
                      <p className="font-semibold text-slate-800 leading-tight">{it.name}</p>
                      <p className="text-[10px] text-slate-400">{it.unit || "—"}</p>
                    </td>
                    {(matrix.outlets || []).map((o) => {
                      const cell = it.byOutlet?.[o.id];
                      if (!cell) {
                        return (
                          <td key={o.id} className="px-3 py-2 text-center text-[11px] text-slate-300">
                            —
                          </td>
                        );
                      }
                      return (
                        <td
                          key={o.id}
                          className={cn(
                            "px-3 py-2 text-center font-semibold tabular-nums",
                            cell.is_low
                              ? "bg-rose-50 text-rose-700"
                              : cell.qty <= 0
                                ? "bg-amber-50/80 text-amber-800"
                                : "text-slate-700"
                          )}
                          title={`Min ${fmtQty(cell.min)} · Par ${fmtQty(cell.par)}`}
                        >
                          {fmtQty(cell.qty)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">Gerakan Stok Terbaru</h2>
          <p className="text-xs text-slate-500">25 entri terakhir lintas outlet</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Waktu</th>
                <th className="px-4 py-2.5 text-left font-semibold">Outlet</th>
                <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                <th className="px-4 py-2.5 text-left font-semibold">Tipe</th>
                <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-4 py-2.5 text-left font-semibold">Oleh</th>
              </tr>
            </thead>
            <tbody className={cn(refreshing && "opacity-70")}>
              {loading && !data && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Memuat…
                  </td>
                </tr>
              )}
              {(!loading || data) && recentLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Belum ada gerakan stok
                  </td>
                </tr>
              )}
              {(!loading || data) &&
                recentLogs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    <td className="px-4 py-2.5 font-bold text-[#5f1340] text-xs">{log.outlet_code}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800 text-xs">{log.item_name}</p>
                      <p className="text-[10px] text-slate-400">{log.unit || ""}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          MOVE_STYLE[log.movement_type] || MOVE_STYLE.Adjust
                        )}
                      >
                        {log.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {fmtQty(log.qty_before)} → {fmtQty(log.qty_after)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{fmtEmployeeName(log.employee_name)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {detailKey &&
        detailMeta &&
        createPortal(
          <div
            data-modal-root
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <div
              className="flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">{detailMeta.title}</h3>
                  <p className="text-xs text-slate-500">
                    {detailMeta.subtitle} · {detailRows.length} baris
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailKey(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>

              <div className="shrink-0 border-b border-slate-100 px-5 py-3">
                <div className="relative">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={detailFilter}
                    onChange={(e) => setDetailFilter(e.target.value)}
                    placeholder="Filter di modal…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    {detailKey === "outlets" && (
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Kode</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Nama</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Item</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Min</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Kosong</th>
                        <th className="px-4 py-2.5 text-right font-semibold" />
                      </tr>
                    )}
                    {detailKey === "catalog" && (
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Nama</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Satuan</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Baris Stok</th>
                      </tr>
                    )}
                    {(detailKey === "stock" || detailKey === "zero") && (
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Outlet</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Min</th>
                        <th className="px-4 py-2.5 text-right font-semibold" />
                      </tr>
                    )}
                    {detailKey === "low" && (
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Outlet</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Min</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Kurang</th>
                        <th className="px-4 py-2.5 text-right font-semibold" />
                      </tr>
                    )}
                    {detailKey === "moves" && (
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Waktu</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Outlet</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Tipe</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Oleh</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {detailRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">
                          Tidak ada data
                        </td>
                      </tr>
                    )}

                    {detailKey === "outlets" &&
                      detailRows.map((o) => (
                        <tr key={o.outlet_id} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 font-bold text-[#5f1340]">{o.outlet_code}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{o.name}</td>
                          <td className="px-4 py-2.5 text-right">{o.total_items}</td>
                          <td className="px-4 py-2.5 text-right text-rose-700 font-semibold">{o.low_stock_count}</td>
                          <td className="px-4 py-2.5 text-right">{o.zero_stock_count}</td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              to={`/my-waschen/inventory?outletId=${o.outlet_id}`}
                              className="text-[11px] font-bold text-[#5f1340] hover:underline"
                              onClick={() => setDetailKey(null)}
                            >
                              Kelola
                            </Link>
                          </td>
                        </tr>
                      ))}

                    {detailKey === "catalog" &&
                      detailRows.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{r.name}</td>
                          <td className="px-4 py-2.5 text-slate-600">{r.unit || "—"}</td>
                          <td className="px-4 py-2.5 text-right">{r.stock_rows}</td>
                        </tr>
                      ))}

                    {(detailKey === "stock" || detailKey === "zero") &&
                      detailRows.map((r) => (
                        <tr key={r.stock_id} className="border-t border-slate-100">
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-[#5f1340]">{r.outlet_code}</span>
                            <span className="ml-1.5 text-xs text-slate-500">{r.outlet_name}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-slate-800">{r.item_name}</p>
                            <p className="text-[11px] text-slate-400">{r.unit || "—"}</p>
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2.5 text-right font-bold",
                              Number(r.qty_current) <= 0 ? "text-amber-700" : "text-slate-800"
                            )}
                          >
                            {fmtQty(r.qty_current)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{fmtQty(r.min_stock)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              to={`/my-waschen/inventory?outletId=${r.outlet_id}`}
                              className="text-[11px] font-bold text-[#5f1340] hover:underline"
                              onClick={() => setDetailKey(null)}
                            >
                              Kelola
                            </Link>
                          </td>
                        </tr>
                      ))}

                    {detailKey === "low" &&
                      detailRows.map((r) => (
                        <tr key={r.stock_id} className="border-t border-slate-100 hover:bg-rose-50/40">
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-[#5f1340]">{r.outlet_code}</span>
                            <span className="ml-1.5 text-xs text-slate-500">{r.outlet_name}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-slate-800">{r.item_name}</p>
                            <p className="text-[11px] text-slate-400">{r.unit || "—"}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-rose-700">{fmtQty(r.qty_current)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{fmtQty(r.min_stock)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-rose-600">{fmtQty(r.shortage)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              to={`/my-waschen/inventory?outletId=${r.outlet_id}`}
                              className="text-[11px] font-bold text-[#5f1340] hover:underline"
                              onClick={() => setDetailKey(null)}
                            >
                              Kelola
                            </Link>
                          </td>
                        </tr>
                      ))}

                    {detailKey === "moves" &&
                      detailRows.map((log) => (
                        <tr key={log.id} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                          <td className="px-4 py-2.5 font-bold text-[#5f1340] text-xs">{log.outlet_code}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-slate-800 text-xs">{log.item_name}</p>
                            <p className="text-[10px] text-slate-400">{log.unit || ""}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                MOVE_STYLE[log.movement_type] || MOVE_STYLE.Adjust
                              )}
                            >
                              {log.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-xs">
                            {fmtQty(log.qty_before)} → {fmtQty(log.qty_after)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{fmtEmployeeName(log.employee_name)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex shrink-0 justify-end border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setDetailKey(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
