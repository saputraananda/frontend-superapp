import React, { useReducer, useEffect } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { Card } from "../components/ui";
import { fmtIDR } from "../utils/utils";
import { api } from "../../../lib/api";

const TIER_STYLES = {
  Diamond: { bg: "bg-cyan-100",   text: "text-cyan-700",   chart: "#06B6D4" },
  Gold:    { bg: "bg-amber-100",  text: "text-amber-700",  chart: "#F59E0B" },
  Member:  { bg: "bg-slate-100",  text: "text-slate-600",  chart: "#94A3B8" },
};

function fetchReducer(state, action) {
  switch (action.type) {
    case "loading": return { data: null, loading: true, error: null };
    case "success": return { data: action.payload, loading: false, error: null };
    case "error":   return { data: null, loading: false, error: action.payload };
    default:        return state;
  }
}

export default function MembershipSection({ filters }) {
  const [{ data, loading, error }, dispatch] = useReducer(
    fetchReducer,
    { data: null, loading: true, error: null }
  );

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "loading" });
    const p = new URLSearchParams();
    if (filters?.outlet && filters.outlet !== "all") p.set("outlet", filters.outlet);
    api(`/sales/membership${p.toString() ? `?${p}` : ""}`)
      .then(res => { if (!cancelled) dispatch({ type: "success", payload: res }); })
      .catch(err => { if (!cancelled) dispatch({ type: "error",   payload: err.message }); });
    return () => { cancelled = true; };
  }, [filters?.outlet]);

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="h-80 rounded-2xl bg-slate-200" />
    </div>
  );

  if (error) return (
    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-rose-600 text-sm">
      Gagal memuat data membership: {error}
    </div>
  );

  const members = data?.members ?? [];
  const summary = data?.summary ?? { total: 0, diamond: 0, gold: 0, member: 0 };

  const donutData = [
    { name: "Diamond", value: summary.diamond, color: TIER_STYLES.Diamond.chart },
    { name: "Gold",    value: summary.gold,    color: TIER_STYLES.Gold.chart    },
    { name: "Member",  value: summary.member,  color: TIER_STYLES.Member.chart  },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Member", value: summary.total,   icon: "⭐", tone: "from-amber-400 to-yellow-500" },
          { label: "Diamond",      value: summary.diamond, icon: "💎", tone: "from-cyan-400 to-cyan-600"    },
          { label: "Gold",         value: summary.gold,    icon: "🥇", tone: "from-amber-400 to-orange-400" },
          { label: "Member",       value: summary.member,  icon: "👤", tone: "from-slate-400 to-slate-500"  },
        ].map(k => (
          <Card key={k.label} className="p-4 sm:p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${k.tone} flex items-center justify-center shadow text-xl shrink-0`}>
              {k.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 leading-tight">{k.label}</p>
              <p className="text-2xl font-extrabold text-slate-800">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Donut */}
        <Card className="col-span-12 lg:col-span-4 p-6 flex flex-col items-center">
          <p className="text-sm font-bold text-slate-700 mb-4 self-start">Distribusi Tier</p>
          {donutData.length > 0 ? (
            <>
              <PieChart width={180} height={180}>
                <Pie data={donutData} cx={90} cy={90} innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
              <div className="flex flex-col gap-2 mt-4 w-full">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-600 font-medium">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{d.value} member</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm mt-8">Tidak ada data</p>
          )}
        </Card>

        {/* Member Table */}
        <Card className="col-span-12 lg:col-span-8 p-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Daftar Member</p>

          {/* Mobile */}
          <div className="flex flex-col gap-3 lg:hidden">
            {members.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Tidak ada data</p>
            ) : members.map((m, i) => {
              const ts = TIER_STYLES[m.tier] ?? TIER_STYLES.Bronze;
              return (
                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm">{m.nama}</span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${ts.bg} ${ts.text}`}>{m.tier}</span>
                  </div>
                  <p className="text-xs text-slate-500">{m.outlet}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <p className="text-slate-400">Saldo</p>
                      <p className="font-semibold text-slate-700">Rp {fmtIDR(Number(m.saldo))}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total Top-up</p>
                      <p className="font-semibold text-slate-700">Rp {fmtIDR(Number(m.total_topup))}</p>
                    </div>
                  </div>
                  <a href={`https://${m.nomor_telpon}`} target="_blank" rel="noopener noreferrer"
                    className="inline-block text-xs font-medium text-emerald-600 hover:underline">
                    💬 Chat WA
                  </a>
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                  {["Nama", "Outlet", "Tier", "Saldo", "Total Top-up", "Kontak"].map(h => (
                    <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">Tidak ada data</td></tr>
                ) : members.map((m, i) => {
                  const ts = TIER_STYLES[m.tier] ?? TIER_STYLES.Bronze;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                      <td className="py-3 pr-4 font-semibold text-slate-800">{m.nama}</td>
                      <td className="py-3 pr-4 text-slate-600">{m.outlet}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${ts.bg} ${ts.text}`}>{m.tier}</span>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">Rp {fmtIDR(Number(m.saldo))}</td>
                      <td className="py-3 pr-4 text-slate-600">Rp {fmtIDR(Number(m.total_topup))}</td>
                      <td className="py-3">
                        <a href={`https://${m.nomor_telpon}`} target="_blank" rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline text-xs font-medium">
                          💬 Chat WA
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}