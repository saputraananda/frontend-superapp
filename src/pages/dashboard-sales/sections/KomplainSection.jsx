import React, { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Card } from "../components/ui";
import UnderDevelopmentDialog from "../../../components/UnderDevelopmentDialog";

const KOMPLAIN_DATA = [
  { id: "K001", tanggal: "2026-03-20", outlet: "Raffles Hills",   customer: "Budi S.",     kategori: "Kualitas Cuci",  deskripsi: "Pakaian masih kotor setelah dicuci",          status: "Pending" },
  { id: "K002", tanggal: "2026-03-21", outlet: "Citra Grand",     customer: "Ani W.",      kategori: "Keterlambatan",  deskripsi: "Order terlambat lebih dari 2 hari",           status: "Proses" },
  { id: "K003", tanggal: "2026-03-22", outlet: "Kota Wisata",     customer: "Rudi M.",     kategori: "Kerusakan",      deskripsi: "Pakaian rusak/sobek setelah laundry",         status: "Selesai" },
  { id: "K004", tanggal: "2026-03-23", outlet: "Canadian",        customer: "Siti R.",     kategori: "Kualitas Cuci",  deskripsi: "Noda tidak hilang sepenuhnya",                status: "Selesai" },
  { id: "K005", tanggal: "2026-03-24", outlet: "Legenda Wisata",  customer: "Hendra P.",   kategori: "Pelayanan",      deskripsi: "Staff tidak ramah kepada pelanggan",          status: "Pending" },
  { id: "K006", tanggal: "2026-03-25", outlet: "Raffles Hills",   customer: "Maya L.",     kategori: "Keterlambatan",  deskripsi: "Order lewat deadline yang dijanjikan",        status: "Proses" },
];

const KATEGORI_COUNT = ["Kualitas Cuci", "Keterlambatan", "Kerusakan", "Pelayanan"].map((k) => ({
  name: k,
  value: KOMPLAIN_DATA.filter((d) => d.kategori === k).length,
}));

const DONUT = [
  { name: "Pending", value: 2, color: "#F59E0B" },
  { name: "Proses",  value: 2, color: "#60A5FA" },
  { name: "Selesai", value: 2, color: "#34D399" },
];

const STATUS_COLOR = {
  Pending:  "bg-amber-100 text-amber-700",
  Proses:   "bg-blue-100 text-blue-700",
  Selesai:  "bg-emerald-100 text-emerald-700",
};

export default function KomplainSection({ _filters }) {
  const [showNotice, setShowNotice] = useState(true);

  return (
    <div className="space-y-5">
      <UnderDevelopmentDialog
        open={showNotice}
        title="Data Masih Dummy"
        message="Data pada halaman ini masih dummy dan sedang on progress..."
        closeLabel="Oke, Mengerti"
        onClose={() => setShowNotice(false)}
      />
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total Komplain", value: KOMPLAIN_DATA.length, icon: "⚠️", tone: "from-amber-400 to-orange-500" },
          { label: "Pending",        value: DONUT[0].value,        icon: "⏳", tone: "from-rose-400 to-red-500" },
          { label: "Selesai",        value: DONUT[2].value,        icon: "✅", tone: "from-emerald-400 to-teal-500" },
        ].map((k) => (
          <Card key={k.label} className="p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
            <div className={`h-9 w-9 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${k.tone} flex items-center justify-center shadow text-base sm:text-xl shrink-0`}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 leading-tight">{k.label}</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts — stacked on mobile, side-by-side on lg */}
      <div className="grid grid-cols-12 gap-5">
        {/* Bar chart */}
        <Card className="col-span-12 lg:col-span-8 p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Komplain per Kategori</p>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={KATEGORI_COUNT} barSize={28}>
                <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Jumlah" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status donut */}
        <Card className="col-span-12 lg:col-span-4 p-4 sm:p-6 flex flex-row lg:flex-col items-center gap-6 lg:gap-0 lg:justify-center">
          <div className="shrink-0">
            <p className="text-sm font-bold text-slate-700 mb-3 lg:mb-4">Status</p>
            <PieChart width={140} height={140}>
              <Pie data={DONUT} cx={70} cy={70} innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value">
                {DONUT.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="flex flex-col gap-2 lg:mt-3 w-full">
            {DONUT.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-slate-600 font-medium">{d.name}</span>
                </div>
                <span className="font-bold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detail Komplain — card list on mobile, table on md+ */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Detail Komplain</p>

        {/* Mobile: card list */}
        <div className="flex flex-col gap-3 md:hidden">
          {KOMPLAIN_DATA.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{row.id}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">{row.tanggal}</span>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[row.status]}`}>
                  {row.status}
                </span>
              </div>
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Outlet</p>
                  <p className="text-slate-700 font-semibold">{row.outlet}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Customer</p>
                  <p className="text-slate-700 font-semibold">{row.customer}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Kategori</p>
                  <p className="text-slate-700 font-semibold">{row.kategori}</p>
                </div>
              </div>
              {/* Deskripsi */}
              <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">{row.deskripsi}</p>
            </div>
          ))}
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                {["ID", "Tanggal", "Outlet", "Customer", "Kategori", "Deskripsi", "Status"].map((h) => (
                  <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KOMPLAIN_DATA.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                  <td className="py-3 pr-4 font-mono text-xs text-slate-400">{row.id}</td>
                  <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{row.tanggal}</td>
                  <td className="py-3 pr-4 font-medium text-slate-700">{row.outlet}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.customer}</td>
                  <td className="py-3 pr-4 text-slate-700 whitespace-nowrap">{row.kategori}</td>
                  <td className="py-3 pr-4 text-slate-500 max-w-xs truncate">{row.deskripsi}</td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}