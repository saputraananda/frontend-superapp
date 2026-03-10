import React from "react";
import { Card } from "./ui";
import { cn } from "../utils/utils";

const ROWS = [
  { a: "CAC WIB", b: "IDR 1,020", c: "Broad", d: "87%", tone: "bg-fuchsia-500" },
  { a: "CAC WPC", b: "IDR 21,700", c: "Broad", d: "15%", tone: "bg-violet-500" },
  { a: "CAC Shift", b: "IDR 24,220", c: "Broad", d: "85%", tone: "bg-amber-500" },
];

export default function ComplainSystemCard() {
  return (
    <Card className="col-span-12 lg:col-span-6">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-slate-800">Complain System</p>
          <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">Summary</span>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/60 px-4 py-4 ring-1 ring-white/70">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-violet-100 px-4 py-2">
              <span className="text-sm font-extrabold text-violet-700">IDR 3,230</span>
              <span className="ml-2 text-xs font-bold text-violet-500">35%</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-800">IDR 5,523,000</p>
              <p className="text-xs font-semibold text-slate-400">Total amount</p>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-white/70">
          <table className="w-full">
            <thead className="bg-white/70">
              <tr className="text-left text-xs font-bold text-slate-500">
                <th className="px-4 py-3">INSPECT</th>
                <th className="px-4 py-3">CUSTOMERS</th>
                <th className="px-4 py-3">PRESS</th>
                <th className="px-4 py-3">NOTES</th>
              </tr>
            </thead>
            <tbody className="bg-white/55">
              {ROWS.map((r, i) => (
                <tr key={i} className="border-t border-white/70 text-sm text-slate-700">
                  <td className="px-4 py-3 font-semibold">{r.a}</td>
                  <td className="px-4 py-3">{r.b}</td>
                  <td className="px-4 py-3">{r.c}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-lg px-3 py-1 text-xs font-bold text-white", r.tone)}>{r.d}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-400 p-4 text-white shadow-[0_18px_40px_rgba(236,72,153,0.18)]">
            <p className="text-xs font-semibold opacity-90">CAC WPC</p>
            <p className="mt-1 text-lg font-extrabold">25%</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white shadow-[0_18px_40px_rgba(245,158,11,0.18)]">
            <p className="text-xs font-semibold opacity-90">Target</p>
            <p className="mt-1 text-lg font-extrabold">22,200</p>
            <p className="text-xs font-semibold opacity-90">92%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}