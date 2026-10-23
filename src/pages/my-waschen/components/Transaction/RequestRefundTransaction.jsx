import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlinePaperClip,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api, apiUpload } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import { fmtEmployeeName } from "../../utils/hrisUtils";

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

const TYPE_STYLE = {
  Refund: "border-sky-200 bg-sky-50 text-sky-700",
  Deposit: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Tips: "border-amber-200 bg-amber-50 text-amber-700",
};

const TYPE_HINT = {
  Deposit: "Approve menambah saldo member pelanggan.",
  Tips: "Hanya dicatat, tanpa mutasi saldo.",
};

const STATUS_STYLE = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const STATUS_LABEL = { Pending: "Pending", Approved: "Disetujui", Rejected: "Ditolak" };

// "Transfer Bank (BCA 740… a/n NAMA)" → "Transfer Bank"; detail lengkap di tooltip
function shortMethod(raw) {
  const text = String(raw || "").trim();
  if (!text) return "-";
  const i = text.indexOf(" (");
  return i === -1 ? text : text.slice(0, i);
}

/** Bukti: gambar dibuka di modal (bukan tab baru), PDF tetap tab baru. */
function ProofLink({ url, title, className, children }) {
  const [open, setOpen] = useState(false);
  if (/\.pdf(\?|$)/i.test(String(url))) {
    return <a href={url} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="flex max-h-full w-full max-w-4xl flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex w-full items-center justify-between text-white">
              <p className="truncate text-sm font-bold">{title}</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-white/15 p-1.5 hover:bg-white/25">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            <img src={url} alt={title} className="max-h-[82vh] max-w-full rounded-2xl bg-white object-contain shadow-2xl" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/** Kotak bukti di modal detail: thumbnail gambar (klik → perbesar) atau tautan PDF. */
function ProofTile({ url, label, title }) {
  if (!url) return null;
  const isPdf = /\.pdf(\?|$)/i.test(String(url));
  return (
    <div className="min-w-0">
      <ProofLink
        url={url}
        title={title}
        className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-sky-400 cursor-pointer"
      >
        {isPdf ? (
          <span className="flex h-28 flex-col items-center justify-center gap-1 text-slate-500">
            <HiOutlinePaperClip className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Buka PDF</span>
          </span>
        ) : (
          <img src={url} alt={label} loading="lazy" className="h-28 w-full object-cover" />
        )}
      </ProofLink>
      <p className="mt-1 truncate text-[11px] font-semibold text-slate-600">{label}</p>
    </div>
  );
}

/** Pengajuan refund dari POS (tr_transaction_refund, Phase 13): approve / tolak. */
export default function RequestRefundTransaction({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Pending");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [approveRow, setApproveRow] = useState(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [approveFile, setApproveFile] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api("/waschen/transactions/refunds");
      setRows(res.data || []);
    } catch (err) {
      if (silent) return;
      showToast("error", err.message || "Gagal memuat request refund");
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true));

  const countBy = (status) => rows.filter((r) => r.status === status).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchQ =
        !q ||
        String(r.orderNo || "").toLowerCase().includes(q) ||
        String(r.customerName || "").toLowerCase().includes(q) ||
        String(r.reason || "").toLowerCase().includes(q);
      return matchQ && (filter === "Semua" || r.status === filter);
    });
  }, [rows, search, filter]);

  // Approver = karyawan yang sedang login (diambil backend dari session)
  const openApprove = (row) => {
    setApproveNotes("");
    setApproveFile(null);
    setApproveRow(row);
  };

  // Bukti pembayaran wajib untuk jenis Refund (uang keluar); Deposit / Tips opsional
  const proofRequired = approveRow?.refundType === "Refund";

  const submitApprove = async () => {
    if (!approveRow || (proofRequired && !approveFile)) return;
    setBusyId(approveRow.id);
    try {
      const body = new FormData();
      if (approveNotes.trim()) body.append("notes", approveNotes.trim());
      if (approveFile) body.append("attachment", approveFile);
      const res = await apiUpload(`/waschen/transactions/refunds/${approveRow.id}/approve`, {
        method: "PATCH",
        body,
      });
      showToast("success", res.message || `${approveRow.refundType} ${approveRow.orderNo} disetujui`);
      setApproveRow(null);
      await load();
      onChanged?.();
    } catch (err) {
      showToast("error", err.message || "Gagal approve refund");
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (row) => {
    setRejectNotes("");
    setRejectRow(row);
  };

  const submitReject = async () => {
    if (!rejectRow || !rejectNotes.trim()) return;
    setBusyId(rejectRow.id);
    try {
      const res = await api(`/waschen/transactions/refunds/${rejectRow.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ notes: rejectNotes.trim() }),
      });
      showToast("success", res.message || `Pengajuan ${rejectRow.orderNo} ditolak`);
      setRejectRow(null);
      await load();
      onChanged?.();
    } catch (err) {
      showToast("error", err.message || "Gagal menolak refund");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={cn("rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-0 sm:min-w-[14rem] flex-1 max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. nota, pelanggan, alasan..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["Pending", "Approved", "Rejected", "Semua"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                  filter === f ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-600 border-slate-200"
                )}
              >
                {f === "Semua" ? "Semua" : STATUS_LABEL[f]} ({f === "Semua" ? rows.length : countBy(f)})
              </button>
            ))}
            <button type="button" onClick={() => load()} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Nota</th>
                <th className="px-4 py-3 font-semibold">Pelanggan</th>
                <th className="px-4 py-3 font-semibold">Pengajuan</th>
                <th className="px-4 py-3 font-semibold">Alasan</th>
                <th className="px-4 py-3 font-semibold">Dibayar</th>
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <HiOutlineExclamationTriangle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="font-semibold">Tidak ada pengajuan refund</p>
                    <p className="mt-1 text-[11px]">Pengajuan dikirim frontliner dari aksi Refund di Riwayat POS</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setDetailRow(r)}
                    title="Klik untuk lihat detail & bukti"
                    className="hover:bg-slate-50/80 align-top cursor-pointer"
                  >
                    <td
                      className="px-4 py-3 whitespace-nowrap"
                      title={[r.outletName, r.requestedByName && `Diajukan oleh ${fmtEmployeeName(r.requestedByName)}`].filter(Boolean).join("\n")}
                    >
                      <p className="font-bold font-mono text-[#5f1340]">{r.orderNo}</p>
                      <p className="text-[11px] text-slate-500">{fmtDate(r.requestedAt)}</p>
                    </td>
                    <td className="px-4 py-3 min-w-[8rem] max-w-[12rem]">
                      <p className="font-semibold text-slate-800 break-words">{r.customerName || "—"}</p>
                      <p className="text-[11px] text-slate-500">{r.customerPhone || ""}</p>
                      {r.refundType === "Deposit" && <p className="text-[10px] text-slate-400">Saldo: {fmtIDR(r.depositBalance)}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span title={TYPE_HINT[r.refundType]} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", TYPE_STYLE[r.refundType])}>{r.refundType}</span>
                      <p className="mt-1 text-base font-bold text-sky-700">{fmtIDR(r.amount)}</p>
                      {r.source === "Hapus Nota" && <p className="text-[10px] font-semibold text-rose-600">dari Hapus Nota</p>}
                    </td>
                    <td className="px-4 py-3 min-w-[12rem] max-w-[18rem]">
                      <p className="text-slate-700 break-words line-clamp-2">{r.reason || "—"}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" title={r.paymentMethod || ""}>
                      <p className="font-semibold text-slate-800">{fmtIDR(r.paidAmount)}</p>
                      <p className="text-[11px] text-slate-500">{shortMethod(r.paymentMethod)}</p>
                      {Number(r.paidAmount) !== Number(r.grandTotal) && (
                        <p className="text-[10px] text-slate-400">Tagihan {fmtIDR(r.grandTotal)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {r.status === "Pending" ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => openApprove(r)}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busyId === r.id ? "..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => openReject(r)}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span
                          title={[r.reviewedByName && fmtEmployeeName(r.reviewedByName), r.reviewedAt && fmtDate(r.reviewedAt)].filter(Boolean).join(" · ")}
                          className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", STATUS_STYLE[r.status])}
                        >
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailRow && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setDetailRow(null)}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4 bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold font-mono text-sm text-[#5f1340]">{detailRow.orderNo}</h3>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", STATUS_STYLE[detailRow.status])}>
                    {STATUS_LABEL[detailRow.status] || detailRow.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {[fmtDate(detailRow.requestedAt), detailRow.outletName, detailRow.requestedByName && `oleh ${fmtEmployeeName(detailRow.requestedByName)}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" onClick={() => setDetailRow(null)}>
                <HiOutlineXMark className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pelanggan</p>
                  <p className="mt-0.5 font-semibold text-slate-800 break-words">{detailRow.customerName || "—"}</p>
                  <p className="text-[11px] text-slate-500">{detailRow.customerPhone || ""}</p>
                </div>
                <div className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pengajuan</p>
                  <span className={cn("mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold", TYPE_STYLE[detailRow.refundType])}>{detailRow.refundType}</span>
                  <p className="mt-0.5 text-base font-bold text-sky-700">{fmtIDR(detailRow.amount)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dibayar</p>
                  <p className="mt-0.5 font-semibold text-slate-800">{fmtIDR(detailRow.paidAmount)}</p>
                  <p className="text-[11px] text-slate-500 break-words">{detailRow.paymentMethod || "-"}</p>
                  {Number(detailRow.paidAmount) !== Number(detailRow.grandTotal) && (
                    <p className="text-[10px] text-slate-400">Tagihan {fmtIDR(detailRow.grandTotal)}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alasan</p>
                <p className="mt-1 text-slate-700 break-words">{detailRow.reason || "—"}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Bukti</p>
                {[detailRow.paymentProofUrl, detailRow.attachmentUrl, detailRow.approvePath].some(Boolean) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <ProofTile url={detailRow.paymentProofUrl} label="Bukti bayar nota" title={`Bukti bayar — ${detailRow.orderNo}`} />
                    <ProofTile url={detailRow.attachmentUrl} label="Bukti tambahan" title={`Bukti tambahan — ${detailRow.orderNo}`} />
                    <ProofTile url={detailRow.approvePath} label="Bukti pembayaran refund" title={`Bukti pembayaran refund — ${detailRow.orderNo}`} />
                  </div>
                ) : (
                  <p className="text-slate-400">Tanpa bukti</p>
                )}
              </div>

              {detailRow.status === "Approved" && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                  <p className="text-[11px] font-bold text-emerald-700">
                    Disetujui{detailRow.reviewedByName ? ` oleh ${fmtEmployeeName(detailRow.reviewedByName)}` : ""}{detailRow.reviewedAt ? ` · ${fmtDate(detailRow.reviewedAt)}` : ""}
                  </p>
                  {detailRow.approveNotes && <p className="mt-0.5 text-slate-600 break-words">Catatan: {detailRow.approveNotes}</p>}
                </div>
              )}
              {detailRow.status === "Rejected" && (
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2.5">
                  <p className="text-[11px] font-bold text-rose-700">
                    Ditolak{detailRow.reviewedByName ? ` oleh ${fmtEmployeeName(detailRow.reviewedByName)}` : ""}{detailRow.reviewedAt ? ` · ${fmtDate(detailRow.reviewedAt)}` : ""}
                  </p>
                  {detailRow.declineNotes && <p className="mt-0.5 text-slate-600 break-words">Alasan: {detailRow.declineNotes}</p>}
                </div>
              )}

              {detailRow.status === "Pending" && (
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => { const r = detailRow; setDetailRow(null); openReject(r); }}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => { const r = detailRow; setDetailRow(null); openApprove(r); }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {approveRow && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => busyId !== approveRow.id && setApproveRow(null)}
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Setujui {approveRow.refundType} — {approveRow.orderNo}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{approveRow.customerName} · {fmtIDR(approveRow.amount)}</p>
              </div>
              <button type="button" onClick={() => setApproveRow(null)} disabled={busyId === approveRow.id}>
                <HiOutlineXMark className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {TYPE_HINT[approveRow.refundType] && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                {TYPE_HINT[approveRow.refundType]}
                {approveRow.refundType === "Deposit" && ` Saldo ${approveRow.customerName || "member"} naik ${fmtIDR(approveRow.amount)}.`}
              </p>
              )}
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                  Bukti pembayaran {proofRequired ? <span className="text-rose-600">*wajib</span> : "(opsional)"}
                </label>
                {approveFile ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <HiOutlinePaperClip className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate font-semibold text-slate-700">{approveFile.name}</span>
                    </span>
                    <button type="button" onClick={() => setApproveFile(null)} className="text-slate-400 hover:text-rose-600">
                      <HiOutlineXMark className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-4 text-slate-500 hover:border-emerald-400">
                    <HiOutlinePaperClip className="h-4 w-4" />
                    <span className="font-semibold">Unggah foto / PDF bukti transfer</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => setApproveFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Catatan (opsional, dilihat frontliner di POS)</label>
                <textarea
                  rows={3}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Contoh: transfer ke rekening pelanggan sudah dilakukan"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setApproveRow(null)} disabled={busyId === approveRow.id} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button
                  type="button"
                  disabled={(proofRequired && !approveFile) || busyId === approveRow.id}
                  onClick={submitApprove}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {busyId === approveRow.id ? "Menyimpan..." : "Setujui Pengajuan"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {rejectRow && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => busyId !== rejectRow.id && setRejectRow(null)}
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Tolak {rejectRow.refundType} — {rejectRow.orderNo}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{rejectRow.customerName} · {fmtIDR(rejectRow.amount)}</p>
              </div>
              <button type="button" onClick={() => setRejectRow(null)} disabled={busyId === rejectRow.id}>
                <HiOutlineXMark className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                  Alasan penolakan <span className="text-rose-600">*wajib</span> (dilihat frontliner di POS)
                </label>
                <textarea
                  rows={3}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Contoh: bukti transfer tidak sesuai nominal"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setRejectRow(null)} disabled={busyId === rejectRow.id} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button
                  type="button"
                  disabled={!rejectNotes.trim() || busyId === rejectRow.id}
                  onClick={submitReject}
                  className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {busyId === rejectRow.id ? "Menyimpan..." : "Tolak Pengajuan"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
