import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  HiOutlineBolt,
  HiOutlineTicket,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlinePrinter,
  HiOutlineUser,
  HiOutlineBuildingStorefront,
  HiOutlineChevronDown,
  HiOutlineClipboardDocument,
  HiOutlineTruck,
  HiOutlineQrCode,
  HiOutlineKey,
  HiOutlinePhone,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineBanknotes,
  HiOutlinePhoto,
  HiOutlineSparkles,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineArrowsPointingOut,
  HiOutlineArrowsPointingIn,
} from "react-icons/hi2";
import { api, waschenPosUploadUrl, waschenUploadUrl } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import ThermalNota, { mapTxnToThermalReceipt } from "./ThermalNota";
import ChangeFulfillmentModal from "./ChangeFulfillmentModal";
import { PhotoViewerModal } from "../HRIS/hrisShared";
import { fmtEmployeeName } from "../../utils/hrisUtils";
import { getNotaPricing } from "../../utils/notaPricing";

/* ───────────────────────── helpers ───────────────────────── */

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtRelative(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const diffMin = Math.round((d.getTime() - Date.now()) / 60000);
  const abs = Math.abs(diffMin);
  const unit = abs < 60 ? [diffMin, "minute"] : abs < 1440 ? [Math.round(diffMin / 60), "hour"] : [Math.round(diffMin / 1440), "day"];
  return new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" }).format(unit[0], unit[1]);
}

function fmtQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function hasText(v) {
  return v != null && String(v).trim() !== "" && String(v).trim() !== "-";
}

const ITEM_STATUSES = [
  "Antrean",
  "Pencucian",
  "Penyetrikaan",
  "Pengemasan",
  "Siap Diambil",
  "Siap Diantar",
  "Sedang Diantar",
  "Selesai",
  "Dibatalkan",
];

/** Tahapan yang ditampilkan di stepper; status item dipetakan ke salah satunya. */
const FLOW_STEPS = [
  { key: "Antrean", label: "Antrean", match: ["Antrean"] },
  { key: "Pencucian", label: "Cuci", match: ["Pencucian"] },
  { key: "Penyetrikaan", label: "Setrika", match: ["Penyetrikaan"] },
  { key: "Pengemasan", label: "Kemas", match: ["Pengemasan"] },
  { key: "Siap", label: "Siap", match: ["Siap Diambil", "Siap Diantar", "Sedang Diantar"] },
  { key: "Selesai", label: "Selesai", match: ["Selesai"] },
];

/** Persentase work_status nota → indeks tahap (sama dengan band tab riwayat). */
function stepIndexFromPercent(p) {
  const n = Number(p) || 0;
  if (n <= 17.5) return 0;
  if (n <= 37.5) return 1;
  if (n <= 62.5) return 2;
  if (n <= 82.5) return 3;
  if (n < 92.5) return 4;
  return 5;
}

function statusTone(status) {
  const map = {
    Antrean: "bg-slate-100 text-slate-700 border-slate-200",
    Pencucian: "bg-sky-50 text-sky-700 border-sky-200",
    Penyetrikaan: "bg-violet-50 text-violet-700 border-violet-200",
    Pengemasan: "bg-amber-50 text-amber-800 border-amber-200",
    "Siap Diambil": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Siap Diantar": "bg-teal-50 text-teal-700 border-teal-200",
    "Sedang Diantar": "bg-orange-50 text-orange-700 border-orange-200",
    Selesai: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Dibatalkan: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return map[status] || "bg-slate-100 text-slate-600 border-slate-200";
}

function PaymentTone({ status, onDark = false }) {
  const ps = status || "Outstanding";
  const base = "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold";
  if (ps === "Lunas") {
    return (
      <span className={cn(base, onDark ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
        <HiOutlineCheckCircle className="h-3.5 w-3.5" />
        Lunas
      </span>
    );
  }
  if (ps === "DP") {
    return <span className={cn(base, onDark ? "border-amber-300/40 bg-amber-400/20 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-800")}>DP</span>;
  }
  return (
    <span className={cn(base, onDark ? "border-rose-300/40 bg-rose-400/20 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-700")}>
      <HiOutlineExclamationTriangle className="h-3.5 w-3.5" />
      Outstanding
    </span>
  );
}

function fulfillmentLabel(v) {
  if (v === "Delivery_Kurir") return "Diantar Kurir";
  if (v === "Ambil_Di_Outlet") return "Ambil di Outlet";
  return v || "—";
}

const STAGE_LABELS = {
  frontliner: "Frontliner",
  washing: "Pencucian",
  ironing: "Penyetrikaan",
  packing: "Pengemasan",
  delivery: "Pengiriman",
  handover: "Serah Terima",
};

const PHOTO_TYPE_LABELS = { qc: "QC", temuan: "Temuan", hasil: "Bukti Antar" };

function uniqueWorkers(workers = []) {
  const seen = new Set();
  return workers.filter((w) => {
    const key = `${w.stage}-${w.employee_id || w.employee_name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(w.employee_name);
  });
}

function initials(name) {
  return String(fmtEmployeeName(name) || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/* ───────────────────────── small UI pieces ───────────────────────── */

function Card({ title, icon: Icon, action, children, className = "", bodyClassName = "p-4" }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-[13px] font-bold text-slate-800">
            {Icon && <Icon className="h-4 w-4 text-[#5f1340]" />}
            {title}
          </h3>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-0.5 text-[13px] text-slate-800">{children}</div>
      </div>
    </div>
  );
}

function Chip({ children, className = "", title }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600", className)}>
      {children}
    </span>
  );
}

function CopyButton({ text, label, onCopied, className = "", children }) {
  const [done, setDone] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setDone(true);
      onCopied?.(label);
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };
  return (
    <button type="button" onClick={copy} title={`Salin ${label}`} className={className}>
      {children}
      {done ? <HiOutlineCheckCircle className="h-3.5 w-3.5" /> : <HiOutlineClipboardDocument className="h-3.5 w-3.5 opacity-70" />}
    </button>
  );
}

/* ───────────────────────── production stepper ───────────────────────── */

function FlowStepper({ items, workStatus, activeFilter, onFilter, cancelled }) {
  const counts = FLOW_STEPS.map((s) => items.filter((i) => s.match.includes(i.item_work_status)).length);
  const current = stepIndexFromPercent(workStatus);
  const pct = Math.max(0, Math.min(100, Number(workStatus) || 0));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-slate-800">Progres pengerjaan</p>
          <p className="text-[11px] text-slate-500">Klik tahap untuk menyaring item</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full transition-all", cancelled ? "bg-rose-400" : "bg-[#5f1340]")} style={{ width: `${pct}%` }} />
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums", cancelled ? "bg-rose-50 text-rose-700" : "bg-[#5f1340]/10 text-[#5f1340]")}>
            {cancelled ? "Dibatalkan" : `${Math.round(pct)}%`}
          </span>
        </div>
      </div>

      <ol className="grid grid-cols-6 gap-1.5">
        {FLOW_STEPS.map((s, i) => {
          const done = !cancelled && i < current;
          const now = !cancelled && i === current;
          const active = activeFilter === s.key;
          return (
            <li key={s.key} className="min-w-0">
              <button
                type="button"
                onClick={() => onFilter(active ? null : s.key)}
                disabled={counts[i] === 0 && !active}
                className={cn(
                  "group w-full rounded-xl border px-1.5 py-2 text-center transition",
                  active
                    ? "border-[#5f1340] bg-[#5f1340] text-white shadow-md shadow-[#5f1340]/20"
                    : now
                      ? "border-[#5f1340]/40 bg-[#5f1340]/[0.06] text-[#5f1340] hover:bg-[#5f1340]/10"
                      : done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-slate-200 bg-slate-50 text-slate-400",
                  counts[i] === 0 && !active ? "cursor-default" : "cursor-pointer",
                )}
              >
                <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide truncate">
                  {done && <HiOutlineCheckCircle className="h-3.5 w-3.5 shrink-0" />}
                  {s.label}
                </span>
                <span className="mt-0.5 block text-base font-black tabular-nums leading-tight">{counts[i]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────────────────────── item detail pieces ───────────────────────── */

function ProgressPhotos({ photos, onView }) {
  if (!photos?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {photos.map((ph) => {
        const url = ph.photo_url || waschenUploadUrl(ph.photo_path);
        if (!url) return null;
        const label = PHOTO_TYPE_LABELS[ph.photo_type] || ph.photo_type || "Foto";
        return (
          <button
            key={ph.id}
            type="button"
            onClick={() => onView?.({ url, label })}
            className="relative h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:ring-2 hover:ring-[#5f1340]/40"
          >
            <img src={url} alt={label} loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[8px] font-bold text-white">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Ceklis jenis pakaian kiloan oleh Tim Setrika / Tim Packing: ✓ sesuai, ✗ tidak sesuai (jumlah ditemukan) */
function KgCheckList({ checks }) {
  if (!checks?.length) return null;
  const wrong = checks.filter((c) => !c.is_match);
  return (
    <details className="group mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white" open={wrong.length > 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
        <span>Ceklis jenis pakaian</span>
        <span className="flex items-center gap-1.5 tabular-nums">
          <span className="text-emerald-600">{checks.length - wrong.length} ✓</span>
          {wrong.length > 0 && <span className="text-red-600">{wrong.length} ✗</span>}
          <HiOutlineChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {checks.map((c, i) => (
          <div key={i} className={cn("flex items-center justify-between gap-2 px-2.5 py-1 text-[11px]", !c.is_match && "bg-red-50")}>
            <span className={cn("flex items-center gap-1.5", c.is_match ? "text-slate-700" : "font-semibold text-red-800")}>
              <span className={cn("font-black", c.is_match ? "text-emerald-600" : "text-red-600")}>{c.is_match ? "✓" : "✗"}</span>
              {c.item_name}
            </span>
            <span className={cn("tabular-nums font-bold", c.is_match ? "text-slate-600" : "text-red-700")}>
              {c.is_match ? `${c.expected_qty} pcs` : `ditemukan ${c.actual_qty} dari ${c.expected_qty} pcs`}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function ItemProgressTimeline({ workers, onViewPhoto }) {
  if (!workers?.length) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-400">
        <HiOutlineClock className="h-4 w-4" />
        Belum ada tahap produksi yang dikerjakan
      </div>
    );
  }
  return (
    <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4 ml-2">
      {workers.map((w, idx) => {
        const isLast = idx === workers.length - 1;
        return (
          <li key={w.id || idx} className="relative">
            <span
              className={cn(
                "absolute -left-[23px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white",
                isLast ? "border-[#5f1340]" : "border-emerald-400",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", isLast ? "bg-[#5f1340]" : "bg-emerald-400")} />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-bold text-slate-800">{w.stage_label || STAGE_LABELS[w.stage] || w.stage}</span>
              {w.employee_name && <span className="text-xs text-slate-600">· {fmtEmployeeName(w.employee_name)}</span>}
              {w.source === "smartlink" && (
                <Chip className="border-slate-200 bg-slate-50 text-slate-500" title="Riwayat dari sistem lama Smartlink">
                  Smartlink
                </Chip>
              )}
              {w.source === "smartlink" && w.qty != null && (
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {fmtQty(w.qty)} {String(w.unit || "").toLowerCase()}
                </span>
              )}
              {w.status === "skipped" && (
                <Chip className="border-amber-200 bg-amber-50 text-amber-800" title="Tahap ini dilewati — item langsung di-QC tahap berikutnya">
                  Dilewati
                </Chip>
              )}
              {w.qc_status && w.status !== "skipped" && (
                <Chip className={w.qc_status === "aman" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}>
                  QC {w.qc_status}
                  {w.qc_decision ? ` · ${w.qc_decision}` : ""}
                </Chip>
              )}
              <span className="ml-auto text-[10px] text-slate-400 tabular-nums">{fmtDate(w.completed_at)}</span>
            </div>
            {hasText(w.notes) && <p className="mt-0.5 whitespace-pre-line text-[11px] text-slate-500">{w.notes}</p>}
            <KgCheckList checks={w.kg_checks} />
            <ProgressPhotos photos={w.photos} onView={onViewPhoto} />
          </li>
        );
      })}
    </ol>
  );
}

// Nama tahap kiloan sama dengan Waschen Mobile
const KILOAN_STAGE_LABELS = { frontliner: "Frontliner", washing: "Tim Cuci", ironing: "Tim Setrika", packing: "Tim Packing" };

/** Pemantauan kiloan: jumlah per plastik tiap tahap + rincian jenis pakaian per plastik */
function KiloanBagMonitor({ bagHistory = [], kgItems = [] }) {
  if (!bagHistory.length && !kgItems.length) return null;
  const bagNos = [...new Set([...bagHistory.flatMap((h) => h.bags.map((b) => Number(b.bag_no))), ...kgItems.map((k) => Number(k.bag_no))])].sort((a, b) => a - b);
  const qtyOf = (h, no) => h.bags.find((b) => Number(b.bag_no) === no)?.qty_pcs;
  const stageTotal = (h) => h.bags.reduce((s, b) => s + Number(b.qty_pcs || 0), 0);
  const fl = bagHistory.find((h) => h.stage === "frontliner");

  return (
    <div className="space-y-2">
      {bagHistory.length > 0 && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Riwayat quantity</p>
      )}
      {bagHistory.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="px-2.5 py-1.5 text-left font-bold">Tahap</th>
                {bagNos.map((no) => (
                  <th key={no} className="px-2 py-1.5 text-center font-bold">P{no}</th>
                ))}
                <th className="px-2 py-1.5 text-center font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bagHistory.map((h) => (
                <tr key={h.stage}>
                  <td className="px-2.5 py-1.5">
                    <p className="font-semibold text-slate-800">{KILOAN_STAGE_LABELS[h.stage] || h.stage_label}</p>
                    <p className="text-[10px] text-slate-400">{fmtEmployeeName(h.employee_name)} · {fmtDate(h.completed_at)}</p>
                  </td>
                  {/* Sama dengan Waschen Mobile: hanya Frontliner yang menghitung per plastik, tahap lain total saja */}
                  {bagNos.map((no) => (
                    <td key={no} className="px-2 py-1.5 text-center font-bold tabular-nums text-slate-800">
                      {h.stage === "frontliner" ? (qtyOf(h, no) ?? "—") : "—"}
                    </td>
                  ))}
                  {(() => {
                    const total = stageTotal(h);
                    const mismatch = fl && h !== fl && total !== stageTotal(fl);
                    return (
                      <td className={cn("px-2 py-1.5 text-center font-bold tabular-nums", mismatch ? "text-amber-600" : "text-[#5f1340]")} title={mismatch ? `Beda dengan Frontliner (${stageTotal(fl)})` : undefined}>
                        {total}
                      </td>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kgItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-500">
            Jenis pakaian
            {kgItems[0]?.source_label
              ? ` — dirinci ${KILOAN_STAGE_LABELS[kgItems[0].source_stage] || kgItems[0].source_label}${kgItems[0].source_employee_name ? ` (${fmtEmployeeName(kgItems[0].source_employee_name)})` : ""}`
              : ""}
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {bagNos
              .filter((no) => kgItems.some((k) => Number(k.bag_no) === no))
              .map((no) => {
                const rows = kgItems.filter((k) => Number(k.bag_no) === no);
                return (
                  <details key={no} className="group overflow-hidden rounded-lg border border-[#5f1340]/20 bg-[#5f1340]/5">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-1.5 text-xs font-bold text-[#5f1340]">
                      <span>Plastik {no}</span>
                      <span className="flex items-center gap-1.5">
                        {rows.reduce((s, k) => s + Number(k.qty_pcs || 0), 0)} pcs
                        <HiOutlineChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </span>
                    </summary>
                    <div className="divide-y divide-slate-100 border-t border-[#5f1340]/10 bg-white">
                      {rows.map((k, i) => (
                        <div key={i} className="flex justify-between px-3 py-1 text-xs">
                          <span className="text-slate-700">{k.item_name}</span>
                          <span className="font-bold tabular-nums text-slate-800">{k.qty_pcs} pcs</span>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, index, saving, onStatusChange, open, onToggle, onViewPhoto }) {
  // Foto kondisi item (bisa >1) diunggah frontliner lewat POS → dilayani pos.mywaschen.com; fallback foto tunggal lama
  const photos = (Array.isArray(item.photos) && item.photos.length ? item.photos : item.photo_url ? [{ photo_url: item.photo_url }] : [])
    .map((p) => waschenPosUploadUrl(p.photo_url))
    .filter(Boolean);
  const methodCode = item.laundry_method_code || (Number(item.laundry_method_id) === 2 ? "DC" : "WC");
  const methodName = item.laundry_method_name || (Number(item.laundry_method_id) === 2 ? "Dry Clean" : "Wet Clean");
  const workers = uniqueWorkers(item.workers);
  const attrs = [
    ["Merk", item.brand],
    ["Warna", item.color],
    ["Bahan", item.material],
    ["Ukuran", item.size],
  ].filter(([, v]) => hasText(v));
  const photoCount = (item.workers || []).reduce((s, w) => s + (w.photos?.length || 0), 0) + photos.length;

  return (
    <li className={cn("rounded-xl border bg-white transition-shadow", open ? "border-[#5f1340]/30 shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-sm")}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", open ? "bg-[#5f1340] text-white" : "bg-[#5f1340]/10 text-[#5f1340]")}>
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[13px] font-bold text-slate-800">{item.service_name || "Layanan"}</p>
              {item.service_code && <span className="shrink-0 font-mono text-[10px] font-semibold text-[#5f1340]/70">{item.service_code}</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 tabular-nums">
                {fmtQty(item.qty)} {item.unit || ""}
              </span>
              <span>·</span>
              <span className="font-semibold tabular-nums text-slate-700">{fmtIDR(item.subtotal)}</span>
              <span className={cn("rounded px-1 text-[9px] font-black", methodCode === "DC" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700")}>{methodCode}</span>
              {Number(item.has_finding) === 1 && <Chip className="border-amber-200 bg-amber-50 text-amber-800">Temuan</Chip>}
              {Number(item.is_on_hold) === 1 && <Chip className="border-rose-200 bg-rose-50 text-rose-700">Hold</Chip>}
              {photoCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-slate-400">
                  <HiOutlinePhoto className="h-3 w-3" />
                  {photoCount}
                </span>
              )}
            </div>
          </div>

          {workers.length > 0 && (
            <div className="hidden md:flex -space-x-1.5" title={workers.map((w) => `${w.stage_label || STAGE_LABELS[w.stage]}: ${fmtEmployeeName(w.employee_name)}`).join("\n")}>
              {workers.slice(0, 4).map((w) => (
                <span key={`${w.stage}-${w.employee_id || w.employee_name}`} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-700">
                  {initials(w.employee_name)}
                </span>
              ))}
              {workers.length > 4 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-bold text-slate-500">+{workers.length - 4}</span>
              )}
            </div>
          )}
          <HiOutlineChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180 text-[#5f1340]")} />
        </button>

        {Number(item.is_production) !== 0 ? (
          <div className="relative shrink-0">
            <select
              value={item.item_work_status}
              disabled={saving}
              onChange={(e) => onStatusChange(item.id, e.target.value)}
              className={cn(
                "appearance-none rounded-lg border py-1.5 pl-2.5 pr-7 text-[11px] font-bold outline-none transition focus:ring-2 focus:ring-[#5f1340]/30 disabled:opacity-60 cursor-pointer",
                statusTone(item.item_work_status),
              )}
              title="Ubah status item"
            >
              {ITEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {saving ? (
              <HiOutlineArrowPath className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin" />
            ) : (
              <HiOutlineChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" />
            )}
          </div>
        ) : (
          <span className={cn("shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold", statusTone(item.item_work_status))}>{item.item_work_status}</span>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-3 py-3 sm:px-4">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Foto item {photos.length > 0 && <span className="tabular-nums">· {photos.length}</span>}
            </p>
            {photos.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onViewPhoto({ url, label: `${item.service_name || "Foto item"} (${i + 1}/${photos.length})` })}
                    className="shrink-0"
                  >
                    <img src={url} alt={`${item.service_name || "Item"} ${i + 1}`} className="h-20 w-20 rounded-xl border border-slate-200 bg-slate-100 object-cover transition hover:ring-2 hover:ring-[#5f1340]/40" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-400">Belum ada foto item</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Chip>{methodName}</Chip>
                <Chip>{fulfillmentLabel(item.fulfillment_type)}</Chip>
                <Chip>{fmtIDR(item.unit_price)} / {item.unit || "unit"}</Chip>
                {Number(item.requires_ironing) === 0 && <Chip>Tanpa setrika</Chip>}
                {attrs.map(([k, v]) => (
                  <Chip key={k}>
                    <span className="text-slate-400">{k}</span> {v}
                  </Chip>
                ))}
              </div>
              {hasText(item.condition_notes) && (
                <p className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                  <span className="font-bold">Kondisi:</span> {item.condition_notes}
                </p>
              )}
              {hasText(item.finding_note) && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                  <span className="font-bold">Temuan:</span> {item.finding_note}
                </p>
              )}
            </div>
          </div>

          <KiloanBagMonitor bagHistory={item.bag_history} kgItems={item.kg_items} />

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Alur pengerjaan</p>
            <ItemProgressTimeline workers={item.workers} onViewPhoto={onViewPhoto} />
          </div>
        </div>
      )}
    </li>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function DetailTransaction() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Dibuka dari menu lain (mis. Drop Point) -> kembali ke halaman asal
  const location = useLocation();
  const backTo = location.state?.from || "/my-waschen/transactions";
  // Dibuka dari dalam aplikasi -> kembali via history agar filter/halaman/scroll asal dipulihkan
  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate(backTo));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingItem, setSavingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [thermalReceipt, setThermalReceipt] = useState(null);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [stepFilter, setStepFilter] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(null);
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message, key: Date.now() });
  };
  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      if (!silent) setError("");
      try {
        const res = await api(`/waschen/transactions/${id}`);
        setData(res.data || null);
      } catch (err) {
        if (silent) return;
        setError(err.message || "Gagal memuat detail");
        setData(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true));

  const updateItemStatus = async (itemId, status) => {
    setSavingItem(itemId);
    try {
      await api(`/waschen/transactions/${id}/items/${itemId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast("success", `Status item diubah ke ${status}`);
      await load(true);
    } catch (err) {
      showToast("error", err.message || "Gagal update status");
    } finally {
      setSavingItem(null);
    }
  };

  const order = data?.order;
  const items = useMemo(() => data?.items || [], [data]);
  const paymentLogs = data?.paymentLogs || [];
  const remaining = Math.max(0, (order?.grandTotal || 0) - (order?.paidAmount || 0));
  const paidPct = order?.grandTotal ? Math.min(100, Math.round(((order.paidAmount || 0) / order.grandTotal) * 100)) : 0;
  const cancelled = Number(order?.workStatus) <= 0 && order != null;
  const pricing = getNotaPricing(order);

  const visibleItems = useMemo(() => {
    if (!stepFilter) return items;
    const step = FLOW_STEPS.find((s) => s.key === stepFilter);
    return items.filter((i) => step?.match.includes(i.item_work_status));
  }, [items, stepFilter]);

  const allOpen = visibleItems.length > 0 && visibleItems.every((i) => openIds.has(i.id));
  const toggleItem = (itemId) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  const toggleAll = () => setOpenIds(allOpen ? new Set() : new Set(visibleItems.map((i) => i.id)));

  const printNota = () => data && setThermalReceipt(mapTxnToThermalReceipt(data));
  const waNumber = order?.customerPhone ? String(order.customerPhone).replace(/\D/g, "").replace(/^0/, "62") : "";
  const estRel = fmtRelative(order?.estimatedFinishedAt);
  const isLate = order?.estimatedFinishedAt && !order?.actualFinishedAt && new Date(order.estimatedFinishedAt) < new Date() && !cancelled;

  return (
    <div className="mx-auto max-w-[100rem] space-y-4 p-3 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-[#5f1340]"
      >
        <HiOutlineArrowLeft className="h-4 w-4" />
        Kembali ke Riwayat
      </button>

      {/* ── Hero ── */}
      <PageHero className="!p-4 sm:!p-5 md:!p-6 !items-stretch sm:!items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-bold tracking-tight text-white sm:text-2xl">{order?.orderNo || id}</h1>
            {order && (
              <CopyButton
                text={order.orderNo}
                label="nomor nota"
                onCopied={() => showToast("success", "Nomor nota disalin")}
                className="inline-flex items-center rounded-lg bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
              />
            )}
            {order?.accessCode && (
              <CopyButton
                text={order.accessCode}
                label="PIN"
                onCopied={() => showToast("success", "PIN nota disalin")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-white/20"
              >
                <HiOutlineKey className="h-3.5 w-3.5" />
                PIN <span className="font-mono text-xs tracking-[0.25em]">{order.accessCode}</span>
              </CopyButton>
            )}
          </div>
          {order && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-white/80">
              <span className="inline-flex items-center gap-1">
                <HiOutlineUser className="h-3.5 w-3.5" />
                {order.customerName || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <HiOutlineBuildingStorefront className="h-3.5 w-3.5" />
                {order.branch || order.outletName || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <HiOutlineCalendarDays className="h-3.5 w-3.5" />
                {fmtDate(order.orderDate)}
              </span>
              <PaymentTone status={order.paymentStatus} onDark />
              {pricing.isExpress && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-400/25 px-2.5 py-0.5 text-[11px] font-bold text-amber-100">
                  <HiOutlineBolt className="h-3.5 w-3.5" />
                  Express
                </span>
              )}
              {pricing.hasPromo && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-100">
                  <HiOutlineTicket className="h-3.5 w-3.5" />
                  {pricing.promoName}
                </span>
              )}
              {order.isDelivery && (
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/40 bg-orange-400/20 px-2.5 py-0.5 text-[11px] font-bold text-orange-100">
                  <HiOutlineTruck className="h-3.5 w-3.5" />
                  Diantar
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={printNota}
            disabled={!data}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#5f1340] shadow-md transition hover:bg-white/90 disabled:opacity-50"
          >
            <HiOutlinePrinter className="h-4 w-4" />
            Cetak Nota
          </button>
          <button
            type="button"
            onClick={() => load()}
            title="Muat ulang"
            className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 p-2.5 text-white transition hover:bg-white/20"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </PageHero>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading && !data ? (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3 lg:order-2">
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
          </div>
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200 lg:order-1" />
        </div>
      ) : order ? (
        /* Desktop: rincian nota di kiri, item di kanan; HP: item tetap di atas */
        <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* ── Kolom utama (item) ── */}
          <div className="min-w-0 space-y-4 lg:order-2">
            <FlowStepper items={items} workStatus={order.workStatus} activeFilter={stepFilter} onFilter={setStepFilter} cancelled={cancelled} />

            <Card
              title={
                <span className="flex items-center gap-2">
                  Item
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 tabular-nums">
                    {stepFilter ? `${visibleItems.length}/${items.length}` : items.length}
                  </span>
                  {stepFilter && (
                    <button
                      type="button"
                      onClick={() => setStepFilter(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#5f1340]/20 bg-[#5f1340]/5 px-2 py-0.5 text-[10px] font-bold text-[#5f1340] hover:bg-[#5f1340]/10"
                    >
                      {FLOW_STEPS.find((s) => s.key === stepFilter)?.label}
                      <HiOutlineXMark className="h-3 w-3" />
                    </button>
                  )}
                </span>
              }
              icon={HiOutlineSparkles}
              action={
                visibleItems.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-[#5f1340]"
                  >
                    {allOpen ? <HiOutlineArrowsPointingIn className="h-3.5 w-3.5" /> : <HiOutlineArrowsPointingOut className="h-3.5 w-3.5" />}
                    {allOpen ? "Tutup semua" : "Buka semua"}
                  </button>
                )
              }
              bodyClassName="p-3"
            >
              {visibleItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">{items.length === 0 ? "Tidak ada item pada nota ini" : "Tidak ada item di tahap ini"}</p>
              ) : (
                <ul className="space-y-2">
                  {visibleItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      index={items.indexOf(item)}
                      saving={savingItem === item.id}
                      onStatusChange={updateItemStatus}
                      open={openIds.has(item.id)}
                      onToggle={() => toggleItem(item.id)}
                      onViewPhoto={setPhotoViewer}
                    />
                  ))}
                </ul>
              )}
              {items.length > 0 && (
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 px-1 pt-3 text-xs">
                  <span className="text-slate-500">
                    {[order.orderCategory, hasText(order.totalWeightKg) && Number(order.totalWeightKg) > 0 ? `${fmtQty(order.totalWeightKg)} kg` : null, Number(order.totalPcs) > 0 ? `${fmtQty(order.totalPcs)} pcs` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums">{fmtIDR(order.grandTotal)}</span>
                </div>
              )}
            </Card>
          </div>

          {/* ── Sidebar (rincian nota) ── */}
          <aside className="space-y-4 lg:order-1 lg:sticky lg:top-4">
            {/* QR */}
            <Card bodyClassName="p-0">
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-bold text-slate-800 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <HiOutlineQrCode className="h-4 w-4 text-[#5f1340]" />
                  QR nota
                </span>
                <HiOutlineChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", showQr && "rotate-180")} />
              </button>
              {showQr && (
                <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-4 py-4">
                  <QRCodeSVG
                    value={`${window.location.origin}/my-waschen/transactions/${encodeURIComponent(order.orderNo || id)}`}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                  <p className="text-[10px] text-slate-400">Pindai untuk membuka nota ini</p>
                </div>
              )}
            </Card>
            {/* Pembayaran */}
            <Card bodyClassName="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total tagihan</p>
                  <p className="mt-0.5 text-2xl font-black tracking-tight text-slate-900 tabular-nums">{fmtIDR(order.grandTotal)}</p>
                  {pricing.hasPromo && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      <span className="line-through tabular-nums">{fmtIDR(pricing.original)}</span>
                      <span className="ml-1.5 font-bold text-emerald-700">hemat {fmtIDR(pricing.discount)}</span>
                    </p>
                  )}
                </div>
                <PaymentTone status={order.paymentStatus} />
              </div>
              {pricing.showBreakdown && (
                <div className="mt-3 space-y-1 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-xs">
                  {pricing.hasSurcharge && (
                    <>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Subtotal layanan</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{fmtIDR(pricing.subtotal)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <HiOutlineBolt className="h-3.5 w-3.5" />
                          Biaya express
                        </span>
                        <span className="font-semibold text-amber-700 tabular-nums">+{fmtIDR(pricing.surcharge)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Harga normal</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{fmtIDR(pricing.original)}</span>
                  </div>
                  {pricing.hasPromo && (
                    <div className="flex justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-1 text-emerald-700">
                        <HiOutlineTicket className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate" title={pricing.promoName}>Promo {pricing.promoName}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-emerald-700 tabular-nums">−{fmtIDR(pricing.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t border-dashed border-slate-200 pt-1.5">
                    <span className="font-bold text-slate-700">Total bayar</span>
                    <span className="font-black text-[#5f1340] tabular-nums">{fmtIDR(pricing.grand)}</span>
                  </div>
                </div>
              )}
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full transition-all", paidPct >= 100 ? "bg-emerald-500" : "bg-amber-400")} style={{ width: `${paidPct}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-emerald-50 px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-emerald-700/80">Dibayar</p>
                  <p className="font-bold text-emerald-800 tabular-nums">{fmtIDR(order.paidAmount)}</p>
                </div>
                <div className={cn("rounded-lg px-2.5 py-2", remaining > 0 ? "bg-rose-50" : "bg-slate-50")}>
                  <p className={cn("text-[10px] font-semibold", remaining > 0 ? "text-rose-700/80" : "text-slate-400")}>Sisa</p>
                  <p className={cn("font-bold tabular-nums", remaining > 0 ? "text-rose-700" : "text-slate-500")}>{fmtIDR(remaining)}</p>
                </div>
              </div>
              {(hasText(order.paymentMethod) || Number(order.changeAmount) > 0) && (
                <div className="mt-3 space-y-1 border-t border-dashed border-slate-200 pt-3 text-xs">
                  {hasText(order.paymentMethod) && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Metode</span>
                      <span className="text-right font-semibold text-slate-800">{order.paymentMethod}</span>
                    </div>
                  )}
                  {Number(order.changeAmount) > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Kembalian</span>
                      <span className="font-semibold text-slate-800 tabular-nums">{fmtIDR(order.changeAmount)}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Info nota */}
            <Card title="Info nota" icon={HiOutlineUser} bodyClassName="px-4 py-3 divide-y divide-slate-100">
              <InfoRow icon={HiOutlineUser} label="Pelanggan">
                <p className="font-bold break-words">{order.customerName || "—"}</p>
                {order.customerPhone && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500 tabular-nums">{order.customerPhone}</span>
                    <a
                      href={`https://wa.me/${waNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <HiOutlineChatBubbleLeftEllipsis className="h-3 w-3" />
                      WA
                    </a>
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200"
                    >
                      <HiOutlinePhone className="h-3 w-3" />
                      Telepon
                    </a>
                  </div>
                )}
                {hasText(order.customerAddress) && <p className="mt-1 text-[11px] text-slate-500 break-words">{order.customerAddress}</p>}
              </InfoRow>

              <InfoRow icon={HiOutlineSparkles} label="Layanan">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  {[order.orderCategory, order.speedName].filter(Boolean).join(" · ") || "—"}
                  {pricing.isExpress && (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      <HiOutlineBolt className="h-3 w-3" />
                      Express
                    </span>
                  )}
                </p>
                {order.parfumeName && <p className="text-xs text-slate-500">Aroma {order.parfumeName}</p>}
              </InfoRow>

              <InfoRow icon={HiOutlineClock} label="Estimasi selesai">
                {order.actualFinishedAt ? (
                  <p className="font-semibold text-emerald-700">Selesai {fmtDate(order.actualFinishedAt)}</p>
                ) : (
                  <>
                    <p className={cn("font-semibold", isLate && "text-rose-700")}>{fmtDate(order.estimatedFinishedAt)}</p>
                    {estRel && <p className={cn("text-xs", isLate ? "font-semibold text-rose-600" : "text-slate-500")}>{isLate ? `Terlambat · ${estRel}` : estRel}</p>}
                  </>
                )}
              </InfoRow>

              <InfoRow icon={HiOutlineTruck} label="Pengambilan">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{order.isDelivery ? "Diantar kurir" : "Ambil di outlet"}</span>
                  <button
                    type="button"
                    onClick={() => setFulfillmentOpen(true)}
                    className="rounded-md border border-[#5f1340]/25 bg-[#5f1340]/5 px-2 py-0.5 text-[10px] font-bold text-[#5f1340] transition hover:bg-[#5f1340]/10"
                  >
                    Ubah
                  </button>
                </div>
                {order.isDelivery && (hasText(order.deliveryAddress) || hasText(order.deliveryNotes)) && (
                  <div className="mt-1.5 rounded-lg border border-orange-100 bg-orange-50/70 px-2.5 py-1.5 text-[11px]">
                    {hasText(order.deliveryAddress) && <p className="font-semibold text-orange-950 break-words">{order.deliveryAddress}</p>}
                    {hasText(order.deliveryNotes) && <p className="text-orange-800/80 break-words">Catatan: {order.deliveryNotes}</p>}
                  </div>
                )}
              </InfoRow>

              <InfoRow icon={HiOutlineUser} label="Kasir">
                <p className="font-semibold">{fmtEmployeeName(order.cashierName) || "—"}</p>
                {(order.settledByName || order.settledByEmployeeId) && (
                  <p className="text-xs text-slate-500">
                    Dilunasi {fmtEmployeeName(order.settledByName || `Karyawan #${order.settledByEmployeeId}`)}
                    {order.settledAt ? ` · ${fmtDate(order.settledAt)}` : ""}
                  </p>
                )}
              </InfoRow>

              {hasText(order.specialNotes) && (
                <InfoRow icon={HiOutlineChatBubbleLeftEllipsis} label="Catatan">
                  <p className="text-xs text-slate-700 break-words">{order.specialNotes}</p>
                </InfoRow>
              )}
            </Card>

            {/* Riwayat pembayaran */}
            <Card title="Riwayat pembayaran" icon={HiOutlineBanknotes} bodyClassName="px-4 py-3">
              {paymentLogs.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">Belum ada log pembayaran</p>
              ) : (
                <ol className="relative ml-1.5 space-y-3 border-l-2 border-slate-100 pl-4">
                  {paymentLogs.map((log) => {
                    const isPay = Number(log.amount) > 0;
                    return (
                      <li key={log.id || `${log.log_type}-${log.created_at}`} className="relative">
                        <span className={cn("absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white", isPay ? "bg-emerald-500" : "bg-amber-400")} />
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800">{log.log_type || "Bayar"}</p>
                          <p className={cn("text-xs font-bold tabular-nums", isPay ? "text-emerald-700" : "text-slate-400")}>{fmtIDR(log.amount)}</p>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {[log.payment_method, log.cashier_name ? fmtEmployeeName(log.cashier_name) : null].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <p className="text-[10px] text-slate-400">{fmtDate(log.created_at)}</p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>

          </aside>
        </div>
      ) : null}

      {/* Toast melayang */}
      {toast && (
        <div
          key={toast.key}
          className={cn(
            "fixed bottom-5 right-5 z-[130] flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-xl",
            toast.type === "error" ? "bg-rose-600 text-white" : "bg-slate-900 text-white",
          )}
          role="status"
        >
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4 text-emerald-400" />}
          {toast.message}
        </div>
      )}

      <ThermalNota createdOrderReceipt={thermalReceipt} onClose={() => setThermalReceipt(null)} outletId={order?.outletId} />

      <ChangeFulfillmentModal
        open={fulfillmentOpen}
        onClose={() => setFulfillmentOpen(false)}
        order={order}
        items={items}
        onSuccess={() => load()}
        showToast={showToast}
      />

      <PhotoViewerModal open={Boolean(photoViewer?.url)} url={photoViewer?.url} label={photoViewer?.label} onClose={() => setPhotoViewer(null)} />
    </div>
  );
}
