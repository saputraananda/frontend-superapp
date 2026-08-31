import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineBuildingStorefront,
  HiOutlinePencilSquare,
  HiOutlineXMark,
  HiOutlineDocumentDuplicate,
  HiOutlineArrowPath,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shiftLabel(sn) {
  return Number(sn) === 2 ? "Siang" : "Pagi";
}

const EMPTY_EDIT = {
  initialCash: "",
  initialPettyCash: "",
  actualCash: "",
  actualPettyCash: "",
  declaredRevenue: "",
  openImbalanceReason: "",
  closingNotes: "",
  reportText: "",
};

function toInput(v) {
  if (v == null || v === "") return "";
  return String(v);
}

export default function DailyReport() {
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadOutlets = useCallback(async () => {
    try {
      const res = await api("/waschen/outlets");
      setOutlets(res.data || []);
    } catch {
      setOutlets([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ date });
      if (outletId) q.set("outletId", outletId);
      const res = await api(`/waschen/daily-report?${q}`);
      setShifts(res.data || []);
    } catch (err) {
      showToast("error", err.message || "Gagal memuat daily report");
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [date, outletId]);

  useEffect(() => {
    loadOutlets();
  }, [loadOutlets]);

  useEffect(() => {
    load();
  }, [load]);

  const outletName = useMemo(() => {
    if (!outletId) return "Semua Outlet";
    const o = outlets.find((x) => String(x.id) === String(outletId));
    return o?.full_name || o?.name || `Outlet #${outletId}`;
  }, [outletId, outlets]);

  const openEdit = (shift) => {
    setEditRow(shift);
    setEditForm({
      initialCash: toInput(shift.initialCash),
      initialPettyCash: toInput(shift.initialPettyCash),
      actualCash: toInput(shift.actualCash),
      actualPettyCash: toInput(shift.actualPettyCash),
      declaredRevenue: toInput(shift.declaredRevenue),
      openImbalanceReason: shift.openImbalanceReason || "",
      closingNotes: shift.closingNotes || "",
      reportText: shift.reportText || "",
    });
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditForm(EMPTY_EDIT);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      const res = await api(`/waschen/daily-report/${editRow.id}`, {
        method: "PUT",
        body: JSON.stringify({
          initialCash: Number(editForm.initialCash) || 0,
          initialPettyCash: Number(editForm.initialPettyCash) || 0,
          actualCash: editForm.actualCash === "" ? null : Number(editForm.actualCash),
          actualPettyCash: editForm.actualPettyCash === "" ? null : Number(editForm.actualPettyCash),
          declaredRevenue: editForm.declaredRevenue === "" ? null : Number(editForm.declaredRevenue),
          openImbalanceReason: editForm.openImbalanceReason,
          closingNotes: editForm.closingNotes,
          reportText: editForm.reportText,
        }),
      });
      showToast("success", res.message || "Laporan diperbarui");
      closeEdit();
      await load();
    } catch (err) {
      showToast("error", err.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const copyReport = async (shift) => {
    if (!shift.reportText) return;
    try {
      await navigator.clipboard.writeText(shift.reportText);
      setCopiedId(shift.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast("error", "Gagal menyalin teks laporan");
    }
  };

  return (
    <div className="min-w-0 w-full max-w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
      <PageHero className="!flex-col !items-stretch gap-4">
        <div className="min-w-0 w-full">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/20">
              <HiOutlineClipboardDocumentList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-tight">
                Daily Report Shift
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-pink-100/90 mt-1 leading-relaxed">
                Pantau & koreksi saldo yang dilaporkan frontliner di POS My Waschen
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 w-full">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-bold outline-none focus:ring-2 focus:ring-white/30 [color-scheme:dark]"
          />
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-bold outline-none focus:ring-2 focus:ring-white/30"
          >
            <option value="" className="text-slate-800">Semua Outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id} className="text-slate-800">
                {o.full_name || o.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={load}
            className="inline-flex w-full md:col-span-2 xl:col-span-1 items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white text-[#5f1340] text-xs font-black hover:bg-pink-50 transition"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4 shrink-0", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </PageHero>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-slate-500 font-semibold px-1">
        <HiOutlineBuildingStorefront className="h-4 w-4 shrink-0" />
        <span className="break-words">{outletName}</span>
        <span className="hidden sm:inline">·</span>
        <span>{date}</span>
        <span>·</span>
        <span>{shifts.length} shift</span>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-sm font-bold">
          Memuat laporan shift...
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-sm font-bold">
          Tidak ada data shift untuk filter ini
        </div>
      ) : (
        shifts.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 min-w-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between border-b border-slate-100 pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-black text-[#5f1340] leading-snug break-words">
                  {s.outletFullName || s.outletName || `Outlet #${s.outletId}`}
                  <span className="text-slate-500 font-bold"> · </span>
                  Shift {shiftLabel(s.shiftNumber)}
                  <span className="text-slate-500 font-bold"> · </span>
                  {s.id}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed break-words">
                  Status <strong>{s.status}</strong>
                  {s.closeType ? ` · ${s.closeType}` : ""}
                  {" · "}Buka {fmtDateTime(s.openedAt)}
                  {s.closedAt ? ` · Tutup ${fmtDateTime(s.closedAt)}` : ""}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed break-words">
                  Dibuka <strong>{s.openerName || "—"}</strong>
                  {s.closedByName ? <> · Ditutup <strong>{s.closedByName}</strong></> : null}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto shrink-0">
                {s.reportText && (
                  <button
                    type="button"
                    onClick={() => copyReport(s)}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#5f1340]/10 text-[#5f1340] text-[11px] font-black"
                  >
                    <HiOutlineDocumentDuplicate className="h-3.5 w-3.5 shrink-0" />
                    {copiedId === s.id ? "Tersalin" : "Salin Report"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black hover:bg-amber-100"
                >
                  <HiOutlinePencilSquare className="h-3.5 w-3.5 shrink-0" />
                  Edit Saldo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
              <StatCard label="Cash Modal Open" value={fmtIDR(s.initialCash)} />
              <StatCard label="Petty Open" value={fmtIDR(s.initialPettyCash)} />
              <StatCard label="Cash Aktual Close" value={s.actualCash != null ? fmtIDR(s.actualCash) : "—"} highlight />
              <StatCard label="Revenue" value={s.declaredRevenue != null ? fmtIDR(s.declaredRevenue) : "—"} accent />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
              <StatCard label="Expected Cash" value={fmtIDR(s.expectedCash)} muted />
              <StatCard label="Selisih (Diff)" value={fmtIDR(s.difference)} muted />
              <StatCard label="Petty Aktual Close" value={s.actualPettyCash != null ? fmtIDR(s.actualPettyCash) : "—"} muted />
              <StatCard label="System Revenue" value={fmtIDR(s.systemCashRevenue)} muted />
            </div>

            {s.openImbalanceReason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <strong>Alasan imbalance open:</strong> {s.openImbalanceReason}
              </div>
            )}

            {s.closingNotes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700">
                <strong>Catatan closing:</strong> {s.closingNotes}
              </div>
            )}

            {s.verifiedTransactions?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Nota terverifikasi ({s.verifiedTransactions.length})
                </p>
                <div className="overflow-x-auto -mx-1 px-1 border border-slate-200 rounded-xl">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase text-slate-400 font-extrabold">
                        <th className="py-2 px-3 text-left">No Nota</th>
                        <th className="py-2 px-3 text-left">Customer</th>
                        <th className="py-2 px-3 text-left">Bayar</th>
                        <th className="py-2 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {s.verifiedTransactions.map((v) => (
                        <tr key={v.id}>
                          <td className="py-2 px-3 font-mono text-[#5f1340]">{v.orderNo}</td>
                          <td className="py-2 px-3">{v.customerName || "—"}</td>
                          <td className="py-2 px-3">{v.paymentMethod || "—"}</td>
                          <td className="py-2 px-3 text-right">{fmtIDR(v.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {s.reportText && (
              <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-2xl p-4 whitespace-pre-wrap text-slate-700 max-h-64 overflow-y-auto">
                {s.reportText}
              </pre>
            )}
          </div>
        ))
      )}

      {editRow && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={closeEdit} aria-label="Tutup" />
          <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-[#5f1340]">Koreksi Saldo Shift {editRow.id}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed break-words">
                  {editRow.outletFullName || editRow.outletName} · Shift {shiftLabel(editRow.shiftNumber)} · {fmtDateTime(editRow.openedAt)}
                </p>
              </div>
              <button type="button" onClick={closeEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Cash Modal Open" value={editForm.initialCash} onChange={(v) => setEditForm((f) => ({ ...f, initialCash: v }))} />
                <Field label="Petty Open" value={editForm.initialPettyCash} onChange={(v) => setEditForm((f) => ({ ...f, initialPettyCash: v }))} />
                <Field label="Cash Aktual Close" value={editForm.actualCash} onChange={(v) => setEditForm((f) => ({ ...f, actualCash: v }))} />
                <Field label="Petty Aktual Close" value={editForm.actualPettyCash} onChange={(v) => setEditForm((f) => ({ ...f, actualPettyCash: v }))} />
                <Field label="Revenue" value={editForm.declaredRevenue} onChange={(v) => setEditForm((f) => ({ ...f, declaredRevenue: v }))} className="sm:col-span-2" />
              </div>

              <TextArea label="Alasan Imbalance Open" value={editForm.openImbalanceReason} onChange={(v) => setEditForm((f) => ({ ...f, openImbalanceReason: v }))} />
              <TextArea label="Catatan Closing" value={editForm.closingNotes} onChange={(v) => setEditForm((f) => ({ ...f, closingNotes: v }))} />
              <TextArea label="Report Text" value={editForm.reportText} onChange={(v) => setEditForm((f) => ({ ...f, reportText: v }))} rows={8} mono />

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#5f1340] text-white text-sm font-black hover:bg-[#4a0d31] disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Koreksi"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast && createPortal(
        <div className={cn(
          "fixed z-[300] px-4 py-3 rounded-2xl shadow-lg text-sm font-bold text-white",
          "bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm",
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
        )}>
          {toast.message}
        </div>,
        document.body
      )}
    </div>
  );
}

function StatCard({ label, value, accent, highlight, muted }) {
  return (
    <div className={cn(
      "p-3 rounded-xl border min-w-0",
      accent ? "bg-[#5f1340]/5 border-[#5f1340]/20" : muted ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200",
      highlight && "ring-1 ring-[#5f1340]/20"
    )}>
      <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block leading-tight">{label}</span>
      <span className={cn(
        "font-black block mt-1 text-sm sm:text-base leading-tight break-words",
        accent ? "text-[#5f1340]" : "text-slate-800"
      )}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, value, onChange, className = "" }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-[#5f1340]"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3, mono = false }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#5f1340] resize-y",
          mono && "font-mono text-xs"
        )}
      />
    </label>
  );
}
