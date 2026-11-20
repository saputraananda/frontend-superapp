import { useMemo, useState } from "react";
import { BULAN_SHORT, fmtRupiah, periodLabel } from "./targetUtils";

/**
 * Grafik aktual vs target per bulan tagihan (satu sumbu Rupiah).
 *   - Aktual  : batang  (#b4326e)
 *   - Target  : garis + titik (#2a78d6); titik berongga = target otomatis (ikut bulan sebelumnya)
 * Warna divalidasi (dataviz validate_palette: lightness, chroma, CVD, kontras — semua PASS).
 * Bulan berjalan: batang lebih pudar + label "s/d <tanggal>" karena data belum lengkap.
 */
const C_ACTUAL = "#b4326e";
const C_TARGET = "#2a78d6";

const W = 640;
const H = 230;
const PAD = { top: 16, right: 12, bottom: 28, left: 46 };

function niceMax(v) {
  if (!v) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}
const fmtJt = (n) => {
  const jt = n / 1e6;
  return jt >= 1000 ? `${(jt / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M` : `${jt.toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;
};

export default function TargetActualChart({ data = [], hasActual = true, asOf }) {
  const [hover, setHover] = useState(null);

  const { yMax, ticks } = useMemo(() => {
    const max = Math.max(0, ...data.map((d) => Math.max(Number(d.target) || 0, Number(d.actual) || 0)));
    const top = niceMax(max * 1.08);
    return { yMax: top, ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => f * top) };
  }, [data]);

  if (!data.length) return null;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / data.length;
  const barW = Math.max(6, Math.min(26, band * 0.5));
  const x = (i) => PAD.left + band * i + band / 2;
  const y = (v) => PAD.top + innerH - (Math.max(0, v) / yMax) * innerH;

  const targetPts = data.map((d, i) => (d.target != null ? [x(i), y(d.target)] : null));
  const linePath = targetPts.reduce((acc, p, i) => {
    if (!p) return acc;
    const prev = targetPts[i - 1];
    return acc + `${prev ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)} `;
  }, "");

  const h = hover != null ? data[hover] : null;
  const pct = h && h.target ? Math.round(((Number(h.actual) || 0) / h.target) * 100) : null;
  const asOfLabel = asOf ? `${Number(asOf.slice(8, 10))} ${BULAN_SHORT[Number(asOf.slice(5, 7)) - 1]}` : "hari ini";

  return (
    <div className="relative">
      {/* Legenda */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
        {hasActual && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: C_ACTUAL }} />
            Aktual
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="1" y1="5" x2="21" y2="5" stroke={C_TARGET} strokeWidth="2" />
            <circle cx="11" cy="5" r="3.5" fill={C_TARGET} />
          </svg>
          Target
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-400">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="3.5" fill="#fff" stroke={C_TARGET} strokeWidth="2" />
          </svg>
          Target otomatis
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Grafik aktual vs target sales per bulan" onMouseLeave={() => setHover(null)}>
        {/* Grid & sumbu Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={t === 0 ? "" : "3 4"} />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
              {fmtJt(t)}
            </text>
          </g>
        ))}

        {/* Sorotan hover */}
        {hover != null && <rect x={PAD.left + band * hover} y={PAD.top} width={band} height={innerH} fill="#5f1340" opacity="0.05" rx="4" />}

        {/* Batang aktual */}
        {hasActual &&
          data.map((d, i) => {
            const v = Number(d.actual) || 0;
            if (v <= 0) return null;
            const top = y(v);
            const hgt = PAD.top + innerH - top;
            const r = Math.min(4, hgt / 2, barW / 2);
            const x0 = x(i) - barW / 2;
            return (
              <path
                key={`a${i}`}
                d={`M${x0},${PAD.top + innerH} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${PAD.top + innerH} Z`}
                fill={C_ACTUAL}
                opacity={d.is_current ? 0.45 : 1}
              />
            );
          })}

        {/* Garis target */}
        {linePath && <path d={linePath} fill="none" stroke={C_TARGET} strokeWidth="2" strokeLinejoin="round" />}
        {data.map((d, i) =>
          d.target != null ? (
            <circle key={`t${i}`} cx={x(i)} cy={y(d.target)} r="4" fill={d.target_is_auto ? "#ffffff" : C_TARGET} stroke={d.target_is_auto ? C_TARGET : "#ffffff"} strokeWidth="2" />
          ) : null,
        )}

        {/* Label bulan */}
        {data.map((d, i) => (
          <text key={`m${i}`} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill={d.is_current ? "#5f1340" : "#94a3b8"} fontWeight={d.is_current ? 700 : 400}>
            {BULAN_SHORT[d.bulan - 1]}
            {d.bulan === 1 || i === 0 ? ` ${String(d.tahun).slice(2)}` : ""}
          </text>
        ))}

        {/* Area hover (lebih lebar dari batang) */}
        {data.map((d, i) => (
          <rect key={`h${i}`} x={PAD.left + band * i} y={PAD.top} width={band} height={innerH + PAD.bottom} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={periodLabel(d.tahun, d.bulan)} />
        ))}
      </svg>

      {/* Tooltip */}
      {h && (
        <div
          className="pointer-events-none absolute top-8 z-10 w-52 rounded-xl border border-slate-200 bg-white p-3 text-[11px] shadow-lg"
          style={{ left: `clamp(0px, calc(${((PAD.left + band * hover + band / 2) / W) * 100}% - 104px), calc(100% - 208px))` }}
        >
          <p className="mb-1.5 font-bold text-slate-800">
            {periodLabel(h.tahun, h.bulan)}
            {h.is_current && <span className="ml-1 font-semibold text-[#5f1340]">· s/d {asOfLabel}</span>}
          </p>
          <div className="space-y-0.5">
            <div className="flex justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ background: C_TARGET }} />
                Target{h.target_is_auto ? " (otomatis)" : ""}
              </span>
              <span className="font-semibold tabular-nums text-slate-800">{h.target != null ? fmtRupiah(h.target) : "—"}</span>
            </div>
            {hasActual && (
              <div className="flex justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="h-2 w-2 rounded-sm" style={{ background: C_ACTUAL }} />
                  Aktual
                </span>
                <span className="font-semibold tabular-nums text-slate-800">{fmtRupiah(h.actual)}</span>
              </div>
            )}
            {hasActual && pct != null && (
              <div className="mt-1 flex justify-between gap-3 border-t border-slate-100 pt-1">
                <span className="text-slate-500">Pencapaian</span>
                <span className="font-bold tabular-nums text-slate-800">{pct}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
