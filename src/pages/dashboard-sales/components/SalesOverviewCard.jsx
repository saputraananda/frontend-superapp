import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, SoftButton, Tab, TinyLegendDot, StatRow, TooltipCard} from "./ui";
import { fmtIDR, fmtUSD } from "../utils/utils";

export default function SalesOverviewCard({ salesData, rangeTab, setRangeTab }) {
  return (
    <Card className="col-span-12 lg:col-span-8">
      <div className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:w-[280px]">
            <p className="text-xs font-semibold text-slate-500">Sales Overview</p>
            <p className="mt-1 text-[11px] text-slate-400">Campaigns and ads performance</p>
            <div className="mt-5">
              <p className="text-3xl font-extrabold text-slate-900">{fmtUSD(3468.96)}</p>
              <p className="mt-1 text-sm text-slate-500">Current Month Earnings</p>
            </div>
            <div className="mt-5">
              <p className="text-2xl font-extrabold text-slate-900">82</p>
              <p className="mt-1 text-sm text-slate-500">Current Month Sales</p>
            </div>
            <div className="mt-5">
              <SoftButton>Last Month Summary</SoftButton>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                {["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].map((t) => (
                  <Tab key={t} active={rangeTab === t} onClick={() => setRangeTab(t)}>{t}</Tab>
                ))}
              </div>
              <div className="hidden items-center gap-5 md:flex">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TinyLegendDot colorClass="bg-violet-500" /> Orders
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TinyLegendDot colorClass="bg-fuchsia-500" /> Sales
                </div>
              </div>
            </div>

            <div className="mt-4 h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EC4899" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.35)" />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<TooltipCard />} />
                  <Area type="monotone" dataKey="orders" name="Orders" stroke="#A855F7" strokeWidth={2} fill="url(#gOrders)" />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke="#EC4899" strokeWidth={2} fill="url(#gSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatRow icon="🎯" tone="pink" label="Monthly Target" value={`IDR ${fmtIDR(500000)}`} />
          <StatRow icon="📊" tone="purple" label="Target Sales" value={fmtUSD(1097.53)} />
          <StatRow icon="💰" tone="blue" label="Seat on Stocks" value={`IDR ${fmtIDR(220000)}`} />
          <StatRow icon="📈" tone="orange" label="Sales Today" value={`IDR ${fmtIDR(900000)}`} />
        </div>
      </div>
    </Card>
  );
}