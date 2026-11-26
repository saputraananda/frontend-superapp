import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineXCircle,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { PhotoViewerModal } from "../HRIS/hrisShared";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}

export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** pending | approved | rejected (delete_approval_status 0/NULL | 1 | 2) */
export function deleteState(row) {
  const s = Number(row?.deleteApprovalStatus);
  if (s === 1) return "approved";
  if (s === 2) return "rejected";
  return "pending";
}

// Tag keputusan yang ditempel backend ke delete_reason:
//   [APPROVED|REJECTED by NIK — Nama @ ISO] Catatan: ...
const DECISION_TAG = /\[(APPROVED|REJECTED) by (.+?) — (.+?) @ ([^\]]+)\](?: Catatan: ([^\n]*))?/g;

/** Pisahkan alasan kasir dari jejak keputusan; keputusan terakhir = yang berlaku. */
export function parseDeleteReason(raw) {
  const text = String(raw || "");
  const decisions = [...text.matchAll(DECISION_TAG)].map((m) => ({
    kind: m[1] === "APPROVED" ? "approved" : "rejected",
    by: m[3],
    at: m[4],
    notes: (m[5] || "").trim(),
  }));
  const reason = text.replace(DECISION_TAG, "").replace(/\n{2,}/g, "\n").trim();
  return { reason, decision: decisions[decisions.length - 1] || null };
}

const STATE_META = {
  pending: { label: "Menunggu", Icon: HiOutlineClock, cls: "border-amber-200 bg-amber-50 text-amber-700" },
  approved: { label: "Disetujui", Icon: HiOutlineCheckCircle, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejected: { label: "Ditolak", Icon: HiOutlineXCircle, cls: "border-slate-300 bg-slate-100 text-slate-600" },
};

export function DeleteStatusBadge({ row, className }) {
  const meta = STATE_META[deleteState(row)];
  const Icon = meta.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold", meta.cls, className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

const PAY_META = {
  Lunas: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DP: "border-sky-200 bg-sky-50 text-sky-700",
  Outstanding: "border-rose-200 bg-rose-50 text-rose-700",
};

export function PayStatusBadge({ status }) {
  const s = status === "Belum Lunas" || !status ? "Outstanding" : status;
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", PAY_META[s] || "border-slate-200 bg-slate-50 text-slate-600")}>
      {s === "Outstanding" ? "Belum Bayar" : s}
    </span>
  );
}

const isImageUrl = (url) => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(String(url || ""));

/** Thumbnail lampiran pengajuan; klik = buka modal (bukan tab baru). */
export function AttachmentButton({ url, compact = false }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  if (!url) return <span className="text-[10px] text-slate-400">Tanpa lampiran</span>;
  const showImg = isImageUrl(url) && !broken;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 transition hover:border-rose-300 hover:bg-rose-50/40",
          compact ? "" : "pr-2.5"
        )}
        title="Lihat lampiran pengajuan"
      >
        {showImg ? (
          <img src={url} alt="Lampiran" loading="lazy" onError={() => setBroken(true)} className="h-9 w-9 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600">
            <HiOutlineDocumentText className="h-4 w-4" />
          </span>
        )}
        {!compact && <span className="text-[10px] font-semibold text-rose-700 group-hover:underline">Lihat Lampiran</span>}
      </button>
      <PhotoViewerModal open={open} url={url} label="Lampiran pengajuan hapus" onClose={() => setOpen(false)} />
    </>
  );
}

/** Ringkas keputusan (oleh, kapan, catatan) di bawah badge status. */
export function DecisionInfo({ decision, className }) {
  if (!decision) return null;
  return (
    <div className={cn("text-[10px] leading-snug text-slate-500", className)}>
      <p>
        oleh <span className="font-semibold text-slate-700">{decision.by}</span>
      </p>
      <p className="text-slate-400">{fmtDateTime(decision.at)}</p>
      {decision.notes && <p className="mt-0.5 italic text-slate-600">&ldquo;{decision.notes}&rdquo;</p>}
    </div>
  );
}

/**
 * Modal Setujui / Tolak pengajuan hapus, dengan catatan opsional.
 * `target` = { row, mode: "approve" | "reject" } atau null.
 */
export function DeleteDecisionModal({ target, onClose, onDone }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!target) return undefined;
    setNotes("");
    setError("");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [target]);

  if (!target) return null;
  const { row, mode } = target;
  const approve = mode === "approve";
  const paid = Number(row.paidAmount) || 0;
  const { reason } = parseDeleteReason(row.deleteReason);

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api(`/waschen/transactions/${row.id}/${approve ? "approve-delete" : "reject-delete"}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: notes.trim() }),
      });
      onDone?.(res.message || (approve ? "Pengajuan hapus disetujui" : "Pengajuan hapus ditolak"));
    } catch (err) {
      setError(err.message || "Gagal menyimpan keputusan");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={saving ? undefined : onClose}>
      <div
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("flex items-start justify-between gap-3 px-5 py-4 text-white", approve ? "bg-gradient-to-r from-rose-700 to-[#5f1340]" : "bg-gradient-to-r from-slate-700 to-slate-900")}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Pengajuan Hapus Nota</p>
            <h3 className="mt-0.5 text-base font-bold">{approve ? "Setujui hapus nota?" : "Tolak pengajuan hapus?"}</h3>
            <p className="mt-0.5 font-mono text-xs text-white/80">{row.orderNo}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-full bg-white/10 p-1.5 hover:bg-white/20">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pelanggan</p>
              <p className="truncate font-semibold text-slate-800">{row.customerName || "—"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Outlet</p>
              <p className="truncate font-semibold text-slate-800">{row.branch || row.outletName || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tagihan</p>
              <p className="font-bold text-slate-800">{fmtIDR(row.grandTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status Bayar</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <PayStatusBadge status={row.paymentStatus} />
                {paid > 0 && <span className="text-[10px] font-semibold text-slate-500">dibayar {fmtIDR(paid)}</span>}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Alasan kasir</p>
              <p className="whitespace-pre-line text-slate-700">{reason || "—"}</p>
            </div>
          </div>

          {approve && paid > 0 && (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
              <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Nota ini sudah dibayar <b>{fmtIDR(paid)}</b>. Pastikan uangnya memang dikembalikan — cek tab <b>Request Refund &amp; Deposit</b>.
              </p>
            </div>
          )}
          {!approve && (
            <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
              <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Nota kembali aktif dan ikut dihitung revenue lagi. Refund otomatis dari pengajuan hapus ini (jika ada) ikut ditolak.</p>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              {approve ? "Alasan / catatan persetujuan" : "Alasan penolakan"} <span className="font-normal text-slate-400">(opsional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder={approve ? "Mis. sudah dicek, nota dobel" : "Mis. lampiran tidak sesuai, nota sudah dikerjakan"}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#5f1340] focus:ring-1 focus:ring-[#5f1340]/30"
            />
            <span className="mt-0.5 block text-right text-[10px] text-slate-400">{notes.length}/300</span>
          </label>

          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60",
              approve ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-800 hover:bg-slate-900"
            )}
          >
            {saving ? "Menyimpan..." : approve ? "Setujui Hapus" : "Tolak Pengajuan"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Panel "Pengajuan Hapus Nota" di halaman detail: alasan, lampiran, status bayar, keputusan,
 * dan tombol Setujui/Tolak bila masih menunggu. Tidak tampil untuk nota tanpa pengajuan.
 */
export function DeleteRequestPanel({ order, onChanged }) {
  const [target, setTarget] = useState(null);
  const [message, setMessage] = useState("");
  if (!order || (!order.isDeleteRequested && Number(order.deleteApprovalStatus) !== 2)) return null;
  const state = deleteState(order);
  const { reason, decision } = parseDeleteReason(order.deleteReason);
  const tone = {
    pending: "border-amber-200 bg-amber-50/60",
    approved: "border-rose-200 bg-rose-50/50",
    rejected: "border-slate-200 bg-slate-50",
  }[state];
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tone)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-800">Pengajuan Hapus Nota</p>
            <DeleteStatusBadge row={order} />
            <span className="text-[11px] text-slate-500">diajukan {fmtDateTime(order.deleteRequestedAt)}</span>
          </div>
          <div className="flex items-start gap-3">
            <AttachmentButton url={order.deleteAttachmentUrl} />
            <div className="min-w-0 flex-1 text-xs">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Alasan kasir</p>
              <p className="whitespace-pre-line break-words text-slate-700">{reason || "—"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span>Status bayar:</span>
            <PayStatusBadge status={order.paymentStatus} />
            {Number(order.paidAmount) > 0 && <span>dibayar {fmtIDR(order.paidAmount)} dari {fmtIDR(order.grandTotal)}</span>}
          </div>
          {decision && (
            <p className="text-[11px] text-slate-600">
              {decision.kind === "approved" ? "Disetujui" : "Ditolak"} oleh <b>{decision.by}</b> · {fmtDateTime(decision.at)}
              {decision.notes && <span className="italic"> — &ldquo;{decision.notes}&rdquo;</span>}
            </p>
          )}
          {message && <p className="text-[11px] font-semibold text-emerald-700">{message}</p>}
        </div>
        {state === "pending" && (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setTarget({ row: order, mode: "reject" })} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:flex-none">
              Tolak
            </button>
            <button type="button" onClick={() => setTarget({ row: order, mode: "approve" })} className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 sm:flex-none">
              Setujui Hapus
            </button>
          </div>
        )}
      </div>
      <DeleteDecisionModal
        target={target}
        onClose={() => setTarget(null)}
        onDone={(msg) => {
          setTarget(null);
          setMessage(msg);
          onChanged?.();
        }}
      />
    </div>
  );
}
