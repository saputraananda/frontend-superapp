import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
  HiOutlineShoppingBag,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import {
  EVENT_TRANSACTIONS_PATH,
  cn,
  eventLabel,
  fmtDate,
  fmtIDR,
  fmtNum,
  useEventOutlets,
  useEventPeriod,
} from "./utils/eventUtils";

function StatCard({ icon: Icon, label, value, sub, tone = "from-[#5f1340] to-[#3d0728]" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-800 truncate">{value}</p>
          {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm min-w-0", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PaymentBadge({ status }) {
  const styles = {
    Lunas: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DP: "bg-amber-50 text-amber-700 border-amber-200",
    Outstanding: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", styles[status] || "bg-slate-100 text-slate-600 border-slate-200")}>
      {status || "—"}
    </span>
  );
}

function ChartTooltip({ active, payload, label, valueFormatter = fmtNum }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold text-slate-700">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {valueFormatter(p.value)}
        </p>
      ))}
    </div>
  );
}

function ProgressBar({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#5f1340]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-[10px] font-bold text-slate-500">{pct}%</span>
    </div>
  );
}

/** Dashboard Event B2B — ringkasan nota, pembayaran, dan progres produksi per cabang. */
export default function EventDashboard() {
  const navigate = useNavigate();
  const events = useEventOutlets();
  const period = useEventPeriod();
  const [eventOutletId, setEventOutletId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      const qs = new URLSearchParams();
      if (eventOutletId) qs.set("eventOutletId", eventOutletId);
      if (period.dateFrom) qs.set("dateFrom", period.dateFrom);
      if (period.dateTo) qs.set("dateTo", period.dateTo);
      const res = await api(`/waschen/event/dashboard?${qs}`);
      setData(res.data || null);
    } catch (err) {
      if (silent) return;
      setError(err.message || "Gagal memuat dashboard event");
      setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [eventOutletId, period.dateFrom, period.dateTo]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true));

  const summary = data?.summary || {};
  const totalItems = Number(summary.total_items) || 0;

  const trend = useMemo(
    () => (data?.salesTrend || []).map((row) => ({
      label: fmtDate(row.order_day),
      billed: Number(row.billed) || 0,
      order_count: Number(row.order_count) || 0,
    })),
    [data?.salesTrend],
  );

  const branches = useMemo(
    () => (data?.productionByBranch || []).map((row) => ({
      ...row,
      total_items: Number(row.total_items) || 0,
      done_items: Number(row.done_items) || 0,
    })),
    [data?.productionByBranch],
  );
  const branchChart = branches
    .filter((b) => b.outlet_id != null)
    .map((b) => ({ name: b.outlet_code, Selesai: b.done_items, Proses: b.total_items - b.done_items }));

  const workStatus = data?.workStatus || [];
  const paymentStatus = data?.paymentStatus || [];
  const revenueByEvent = data?.revenueByEvent || [];
  const revenueByService = data?.revenueByService || [];
  const topCustomers = data?.topCustomers || [];
  const recentTransactions = data?.recentTransactions || [];

  const openTxn = (id) => navigate(`/my-waschen/transactions/${id}`, { state: { from: EVENT_TRANSACTIONS_PATH } });

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[100rem] mx-auto overflow-x-hidden">
      <PageHero className="!flex-col !items-stretch !gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Dashboard Event B2B</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Nota, pembayaran, dan progres produksi item event di cabang
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_auto] gap-2 sm:gap-3">
            <select
              value={eventOutletId}
              onChange={(e) => setEventOutletId(e.target.value)}
              aria-label="Pilih event"
              className="w-full min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs text-white outline-none backdrop-blur-sm"
            >
              <option value="" className="text-slate-800">Semua Event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="text-slate-800">{eventLabel(ev)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md hover:bg-pink-50 disabled:opacity-60"
            >
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
          <CutoffPeriodFilter cutoff={period.cutoff} variant="hero" />
        </div>
      </PageHero>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={HiOutlineBanknotes} label="Revenue Masuk" value={fmtIDR(summary.total_revenue)} sub={`${fmtNum(summary.revenue_orders)} nota dibayar`} />
            <StatCard icon={HiOutlineClipboardDocumentList} label="Nota Event" value={fmtNum(summary.total_orders)} sub={`Tagihan ${fmtIDR(summary.total_billed)}`} tone="from-violet-600 to-purple-700" />
            <StatCard icon={HiOutlineExclamationTriangle} label="Piutang" value={fmtIDR(summary.outstanding_amount)} sub={`${fmtNum(summary.outstanding_orders)} nota belum lunas`} tone="from-rose-600 to-red-700" />
            <StatCard icon={HiOutlineUserGroup} label="Customer" value={fmtNum(summary.total_customers)} sub={`Rata-rata ${fmtIDR(summary.avg_order_value)} / nota`} tone="from-sky-600 to-blue-700" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={HiOutlineShoppingBag} label="Item Produksi" value={fmtNum(totalItems)} sub={`${fmtNum(summary.done_items)} siap diambil / selesai`} tone="from-emerald-600 to-teal-700" />
            <StatCard icon={HiOutlineBuildingStorefront} label="Belum Dibagi" value={fmtNum(summary.unassigned_items)} sub="Item belum punya cabang produksi" tone="from-amber-600 to-orange-700" />
            <StatCard icon={HiOutlineExclamationTriangle} label="Item Hold" value={fmtNum(summary.hold_items)} sub="Menunggu konfirmasi temuan" tone="from-fuchsia-600 to-pink-700" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard title="Nota Harian" subtitle="Berdasarkan tanggal nota dibuat" className="xl:col-span-7">
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip valueFormatter={(v) => (v > 999 ? fmtIDR(v) : fmtNum(v))} />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="billed" name="Tagihan" fill="#5f1340" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" dataKey="order_count" name="Nota" fill="#c45c8a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Produksi per Cabang" subtitle="Item event yang dikerjakan tiap cabang" className="xl:col-span-5">
              <div className="h-56 sm:h-72">
                {branchChart.length === 0 ? (
                  <p className="py-16 text-center text-xs text-slate-400">Belum ada item yang dibagi ke cabang</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar dataKey="Selesai" stackId="a" fill="#10b981" />
                      <Bar dataKey="Proses" stackId="a" fill="#5f1340" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <ChartCard title="Progres Cabang" subtitle="Item selesai dibanding total item">
              <div className="space-y-3">
                {branches.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada item event</p>
                ) : branches.map((b) => (
                  <div key={b.outlet_id ?? "none"}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-semibold", b.outlet_id == null ? "text-amber-700" : "text-slate-700")}>{b.outlet_name}</span>
                      <span className="text-slate-500">{fmtNum(b.done_items)}/{fmtNum(b.total_items)} item</span>
                    </div>
                    <ProgressBar value={b.done_items} total={b.total_items} />
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Status Item" subtitle="Posisi item produksi saat ini">
              <div className="space-y-2">
                {workStatus.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada item</p>
                ) : workStatus.map((row) => (
                  <div key={row.status} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <span className="text-xs font-semibold text-slate-700">{row.status || "—"}</span>
                    <span className="text-xs font-bold text-[#5f1340]">{fmtNum(row.item_count)} item</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Status Pembayaran" subtitle="Lunas, DP, dan outstanding">
              <div className="space-y-2">
                {paymentStatus.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi</p>
                ) : paymentStatus.map((row) => (
                  <div key={row.payment_status} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <PaymentBadge status={row.payment_status} />
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{fmtIDR(row.amount)}</p>
                      <p className="text-[10px] text-slate-400">{fmtNum(row.order_count)} nota</p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard title="Layanan Event Terlaris" subtitle="Berdasarkan nilai tagihan" className="xl:col-span-7">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Layanan</th>
                      <th className="py-2 pr-3 text-right">Qty</th>
                      <th className="py-2 text-right">Tagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revenueByService.length === 0 ? (
                      <tr><td colSpan={3} className="py-6 text-center text-slate-400">Belum ada data layanan</td></tr>
                    ) : revenueByService.map((row) => (
                      <tr key={row.service_id}>
                        <td className="py-2.5 pr-3 font-semibold text-slate-800">{row.service_name}</td>
                        <td className="py-2.5 pr-3 text-right font-mono">{fmtNum(row.qty)}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-700">{fmtIDR(row.billed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard title="Per Event" subtitle="Tagihan & pembayaran tiap outlet event" className="xl:col-span-5">
              <div className="space-y-2">
                {revenueByEvent.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi event</p>
                ) : revenueByEvent.map((row) => (
                  <div key={row.outlet_id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{row.outlet_name}</p>
                      <p className="text-xs font-bold text-[#5f1340] shrink-0">{fmtIDR(row.billed)}</p>
                    </div>
                    <p className="text-[10px] text-slate-500">{fmtNum(row.order_count)} nota · dibayar {fmtIDR(row.paid)}</p>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard title="Top Customer Event" subtitle="Customer dengan tagihan terbesar" className="xl:col-span-5">
              <div className="space-y-2">
                {topCustomers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada customer</p>
                ) : topCustomers.map((c, idx) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5f1340]/10 text-[11px] font-bold text-[#5f1340]">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.customer_code} · {fmtNum(c.order_count)} nota</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-700">{fmtIDR(c.billed)}</p>
                      {Number(c.outstanding) > 0 && <p className="text-[10px] font-semibold text-rose-600">Piutang {fmtIDR(c.outstanding)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Transaksi Terbaru" subtitle="Klik untuk membuka detail nota" className="xl:col-span-7">
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {recentTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi</p>
                ) : recentTransactions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTxn(t.id)}
                    className="w-full text-left rounded-xl border border-slate-100 px-3 py-2.5 hover:border-[#5f1340]/30 hover:bg-[#5f1340]/[0.03] transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{t.order_no}</p>
                        <p className="text-[10px] text-slate-500 truncate">{t.customer_name} · {t.outlet_name} · {fmtDate(t.order_date)}</p>
                      </div>
                      <p className="text-xs font-bold text-emerald-700 shrink-0">{fmtIDR(t.grand_total)}</p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <PaymentBadge status={t.payment_status} />
                      <span className="text-[10px] text-slate-400">{fmtNum(t.item_count)} item · progres {Math.round(Number(t.work_status) || 0)}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
