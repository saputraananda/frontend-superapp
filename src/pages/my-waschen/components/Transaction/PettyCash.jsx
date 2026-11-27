import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineXMark,
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineChevronDown,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineXCircle,
  HiOutlinePhoto,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";
import { exportTableExcel, periodLabel } from "../../utils/exportTableExcel";
import { api, BASE_URL } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import { PhotoViewerModal } from "../HRIS/hrisShared";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import { fmtEmployeeName } from "../../utils/hrisUtils";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );
}

const INPUT_CLS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10 disabled:bg-slate-50 disabled:text-slate-600";

function Field({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function fmtDate(v) {
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

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getAging(v) {
  if (!v) return { days: null, label: "—", dateLabel: "—" };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { days: null, label: "—", dateLabel: String(v) };
  const days = Math.max(0, Math.round((startOfLocalDay(new Date()) - startOfLocalDay(d)) / 86400000));
  return {
    days,
    label: days === 0 ? "Today" : `${days}D`,
    dateLabel: d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
}

function agingTone(days) {
  if (days == null) return "border-slate-200 bg-slate-50 text-slate-500";
  if (days === 0) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (days <= 2) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function readLoggedInEmployee() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.employee?.employee_id ? user.employee : null;
  } catch {
    return null;
  }
}

function sourceBadge(isPettyCash) {
  return isPettyCash === false
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-[#5f1340]/20 bg-[#5f1340]/5 text-[#5f1340]";
}

function statusBadge(status) {
  if (status === "Disetujui") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Ditolak") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function StatCell({ label, value, hint, valueClass }) {
  return (
    <div className="relative flex h-full min-h-[6.25rem] flex-col border-b border-slate-100 px-4 py-3.5 last:border-b-0 sm:px-5 sm:py-4 lg:border-b-0 lg:after:absolute lg:after:inset-y-4 lg:after:right-0 lg:after:w-px lg:after:bg-slate-100 lg:last:after:hidden">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1.5 truncate text-xl font-semibold tabular-nums tracking-tight sm:text-2xl", valueClass)}>
        {value}
      </p>
      <p className="mt-auto truncate pt-2 text-[11px] leading-4 text-slate-400">{hint || "\u00a0"}</p>
    </div>
  );
}

const STATUS_FILTERS = ["Semua", "Pengajuan", "Disetujui", "Ditolak"];
const EMPTY_FORM = { outletId: "", type: "Keluar", category: "", amount: "", description: "", isPettyCash: true };

const EMPTY_SUMMARY = {
  total: 0,
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  currentBalance: null,
  hasOpenShift: false,
  cutoffOut: 0,
  cutoffIn: 0,
  cutoffCentralOut: 0,
};

export default function PettyCash() {
  const cutoff = useCutoffPeriod();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [outlets, setOutlets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pengajuan");
  const [outletId, setOutletId] = useState("");
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [detailRow, setDetailRow] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [modalEmployeeId, setModalEmployeeId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [proofView, setProofView] = useState(null);
  // Konfirmasi aksi di modal detail: 'approve' | 'reject' | null
  const [confirmAction, setConfirmAction] = useState(null);
  const [proofBroken, setProofBroken] = useState(false);
  const [exporting, setExporting] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadMeta = useCallback(async () => {
    try {
      const [outletRes, empRes, catRes] = await Promise.all([
        api("/waschen/outlets"),
        api("/waschen/inventory/employees"),
        api("/waschen/petty-cash-categories?isActive=1"),
      ]);
      setOutlets(outletRes.data || []);
      setEmployees(empRes.data || []);
      setCategories(catRes.data || []);
    } catch {
      setOutlets([]);
      setEmployees([]);
      setCategories([]);
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams();
      if (outletId) q.set("outletId", outletId);
      if (statusFilter !== "Semua") q.set("status", statusFilter);
      if (search.trim()) q.set("search", search.trim());
      if (cutoff.dateFrom) q.set("dateFrom", cutoff.dateFrom);
      if (cutoff.dateTo) q.set("dateTo", cutoff.dateTo);
      const sq = new URLSearchParams();
      if (outletId) sq.set("outletId", outletId);
      if (cutoff.dateFrom) sq.set("dateFrom", cutoff.dateFrom);
      if (cutoff.dateTo) sq.set("dateTo", cutoff.dateTo);
      const [listRes, sumRes] = await Promise.all([
        api(`/waschen/petty-cash?${q}`),
        api(`/waschen/petty-cash/summary?${sq}`),
      ]);
      setRows(listRes.data || []);
      setSummary({ ...EMPTY_SUMMARY, ...(sumRes.data || {}) });
    } catch (err) {
      if (silent) return;
      showToast("error", err.message || "Gagal memuat petty cash");
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [outletId, statusFilter, search, cutoff.dateFrom, cutoff.dateTo]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  /** Download Excel semua pengajuan sesuai filter aktif (outlet, status, cari, periode). */
  const downloadExcel = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams({ all: "1" });
      if (outletId) q.set("outletId", outletId);
      if (statusFilter !== "Semua") q.set("status", statusFilter);
      if (search.trim()) q.set("search", search.trim());
      if (cutoff.dateFrom) q.set("dateFrom", cutoff.dateFrom);
      if (cutoff.dateTo) q.set("dateTo", cutoff.dateTo);
      const res = await api(`/waschen/petty-cash?${q}`);
      const data = res.data || [];
      if (!data.length) {
        showToast("error", "Tidak ada data petty cash untuk diunduh dengan filter ini");
        return;
      }
      const outletName = outletId
        ? (outlets.find((o) => String(o.id) === String(outletId))?.full_name || outlets.find((o) => String(o.id) === String(outletId))?.name || outletId)
        : "Semua outlet";
      const signed = (r) => (r.type === "Masuk" ? 1 : -1) * (Number(r.amount) || 0);
      await exportTableExcel({
        title: "Petty Cash",
        sheetName: "Petty Cash",
        fileName: `PettyCash_${outletName}_${cutoff.dateFrom || ""}_${cutoff.dateTo || ""}`,
        filters: [
          ["Periode", periodLabel(cutoff.dateFrom, cutoff.dateTo)],
          ["Outlet", outletName],
          ["Status", statusFilter],
          ...(search.trim() ? [["Pencarian", search.trim()]] : []),
        ],
        columns: [
          { header: "Tanggal", key: "transactionDate", type: "datetime", width: 18 },
          { header: "Outlet", value: (r) => r.outletFullName || r.outletName, width: 26 },
          { header: "Frontliner", value: (r) => fmtEmployeeName(r.cashierName) || "", width: 22 },
          { header: "Tipe", key: "type", width: 9, align: "center" },
          { header: "Sumber Dana", value: (r) => (r.isPettyCash === false ? "Central Cash" : "Petty Cash"), width: 14 },
          { header: "Kategori", key: "category", width: 28 },
          { header: "Keterangan", key: "description", width: 36, wrap: true },
          { header: "Nominal", key: "amount", type: "money", width: 15 },
          { header: "Status", key: "status", width: 12, align: "center" },
          { header: "Diproses Oleh", value: (r) => fmtEmployeeName(r.approvedByName) || "", width: 22 },
          { header: "Tgl Diproses", key: "approvedAt", type: "datetime", width: 18 },
          { header: "Alasan Ditolak", key: "rejectedReason", width: 28, wrap: true },
          { header: "Bukti Foto", value: (r) => r.receiptPhotoUrl || "", width: 40 },
        ],
        rows: data,
        totals: { amount: data.reduce((a, r) => a + Math.abs(signed(r)), 0) },
      });
      showToast("success", `${data.length} data petty cash diunduh`);
    } catch (err) {
      showToast("error", err.message || "Gagal mengunduh Excel");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true));

  const loggedInEmployee = useMemo(() => readLoggedInEmployee(), []);

  const employeeOptions = useMemo(() => {
    if (!loggedInEmployee?.employee_id) return employees;
    const exists = employees.some((e) => Number(e.employee_id) === Number(loggedInEmployee.employee_id));
    return exists ? employees : [loggedInEmployee, ...employees];
  }, [employees, loggedInEmployee]);

  const categoryOptions = useMemo(() => {
    const labels = categories.map((c) => c.label || c.name).filter(Boolean);
    if (editForm.category && !labels.includes(editForm.category)) {
      return [editForm.category, ...labels];
    }
    return labels;
  }, [categories, editForm.category]);

  const isPending = detailRow?.status === "Pengajuan";

  const openDetail = (row) => {
    setDetailRow(row);
    setEditForm({
      outletId: String(row.outletId || ""),
      type: row.type || "Keluar",
      category: row.category || "",
      amount: String(row.amount ?? ""),
      description: row.description || "",
      isPettyCash: row.isPettyCash !== false,
    });
    setModalEmployeeId(loggedInEmployee?.employee_id ? String(loggedInEmployee.employee_id) : "");
    setRejectReason("");
  };

  const closeDetail = () => {
    setDetailRow(null);
    setRejectReason("");
    setConfirmAction(null);
    setProofBroken(false);
  };

  const receiptUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
  };

  const saveEdit = async () => {
    if (!detailRow) return;
    if (!editForm.outletId) {
      showToast("error", "Outlet wajib dipilih");
      return false;
    }
    if (!editForm.category.trim()) {
      showToast("error", "Kategori wajib diisi");
      return false;
    }
    if (!Number(editForm.amount) || Number(editForm.amount) <= 0) {
      showToast("error", "Nominal wajib > 0");
      return false;
    }
    await api(`/waschen/petty-cash/${detailRow.id}`, {
      method: "PUT",
      body: JSON.stringify({
        outletId: Number(editForm.outletId),
        type: editForm.type,
        category: editForm.category.trim(),
        amount: Number(editForm.amount),
        description: editForm.description.trim() || null,
        isPettyCash: editForm.isPettyCash !== false,
      }),
    });
    return true;
  };

  const submitSave = async (e) => {
    e.preventDefault();
    if (!isPending) return;
    setSubmitting(true);
    try {
      const ok = await saveEdit();
      if (!ok) return;
      showToast("success", "Pengajuan diperbarui");
      closeDetail();
      await load();
    } catch (err) {
      showToast("error", err.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const submitApprove = async () => {
    if (!detailRow) return;
    if (!modalEmployeeId) {
      showToast("error", "Petugas yang menyetujui wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await saveEdit();
      await api(`/waschen/petty-cash/${detailRow.id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ employeeId: Number(modalEmployeeId) }),
      });
      showToast("success", "Pengajuan petty cash disetujui");
      closeDetail();
      await load();
    } catch (err) {
      showToast("error", err.message || "Gagal menyetujui");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!detailRow) return;
    if (!modalEmployeeId) {
      showToast("error", "Petugas yang menolak wajib diisi");
      return;
    }
    if (!rejectReason.trim()) {
      showToast("error", "Catatan penolakan wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/waschen/petty-cash/${detailRow.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({
          employeeId: Number(modalEmployeeId),
          rejectedReason: rejectReason.trim(),
        }),
      });
      showToast("success", "Pengajuan petty cash ditolak");
      closeDetail();
      await load();
    } catch (err) {
      showToast("error", err.message || "Gagal menolak");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api(`/waschen/petty-cash/${deleteTarget.id}`, { method: "DELETE" });
      showToast("success", "Pengajuan dihapus");
      setDeleteTarget(null);
      if (detailRow?.id === deleteTarget.id) closeDetail();
      await load();
    } catch (err) {
      showToast("error", err.message || "Gagal menghapus");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[100rem] mx-auto overflow-x-hidden">
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Petty Cash</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Review pengajuan kas laci per outlet — klik baris untuk detail, edit, dan approval
          </p>
        </div>
      </PageHero>

      {toast && (
        <div
          className={cn(
            "rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2",
            toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
          )}
        >
          {toast.type === "error" ? (
            <HiOutlineExclamationTriangle className="h-4 w-4" />
          ) : (
            <HiOutlineCheckCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className={cn(
            "grid grid-cols-2 divide-y divide-slate-100 md:grid-cols-3 md:divide-y-0",
            outletId ? "lg:grid-cols-6" : "lg:grid-cols-5"
          )}
        >
          <StatCell label="Total" value={summary.total} hint="Semua status" valueClass="text-slate-800" />
          <StatCell label="Menunggu" value={summary.pendingCount} hint="Perlu review" valueClass="text-amber-700" />
          <StatCell label="Disetujui" value={summary.approvedCount} hint="Sudah lolos" valueClass="text-emerald-700" />
          <StatCell label="Ditolak" value={summary.rejectedCount} hint="Tidak disetujui" valueClass="text-rose-700" />
          {outletId && (
            <StatCell
              label="Saldo petty cash"
              value={fmtIDR(summary.currentBalance)}
              hint={summary.hasOpenShift ? "Shift sedang terbuka" : "Tidak ada shift terbuka"}
              valueClass="text-[#5f1340]"
            />
          )}
          <StatCell
            label="Pengeluaran cutoff"
            value={fmtIDR(summary.cutoffOut)}
            hint={
              Number(summary.cutoffCentralOut) > 0
                ? `${cutoff.periodLabel} · Central ${fmtIDR(summary.cutoffCentralOut)}`
                : cutoff.periodLabel
            }
            valueClass="text-slate-800"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="space-y-2 border-b border-slate-100 p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="relative min-w-0">
              <HiOutlineBuildingStorefront className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10"
              >
                <option value="">Semua outlet</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name || o.name}
                  </option>
                ))}
              </select>
              <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="relative min-w-0">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kategori, keterangan..."
                className="w-full min-w-0 rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select
              value={cutoff.isCustomDate ? "custom" : "cutoff"}
              onChange={(e) => {
                const nextCustom = e.target.value === "custom";
                if (nextCustom !== cutoff.isCustomDate) cutoff.toggleCustom();
              }}
              className="col-span-2 min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40 sm:col-span-1"
            >
              <option value="cutoff">Cutoff</option>
              <option value="custom">Custom tanggal</option>
            </select>
            {cutoff.isCustomDate ? (
              <>
                <input
                  type="date"
                  value={cutoff.dateFrom || ""}
                  onChange={(e) => cutoff.handleCustomStartChange(e.target.value)}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40"
                />
                <input
                  type="date"
                  value={cutoff.dateTo || ""}
                  min={cutoff.dateFrom || undefined}
                  onChange={(e) => cutoff.setDateTo(e.target.value)}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40"
                />
              </>
            ) : (
              <>
                <select
                  value={cutoff.selectedMonth}
                  onChange={(e) => cutoff.setSelectedMonth(Number(e.target.value))}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40"
                >
                  {cutoff.monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={cutoff.selectedYear}
                  onChange={(e) => cutoff.handleYearChange(e.target.value)}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40"
                >
                  {cutoff.years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold",
                  statusFilter === f
                    ? "bg-[#5f1340] text-white border-[#5f1340]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {f}
              </button>
            ))}
            <button
              type="button"
              onClick={load}
              title="Muat ulang"
              className="ml-auto shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={downloadExcel}
              disabled={exporting || loading}
              title="Download Excel sesuai filter"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#5f1340] px-3 py-2 text-xs font-bold text-white hover:bg-[#4d0f33] disabled:opacity-60"
            >
              <HiOutlineArrowDownTray className="h-4 w-4" />
              <span className="hidden sm:inline">{exporting ? "Mengunduh..." : "Download Excel"}</span>
            </button>
          </div>
        </div>

        {/* Mobile: kartu */}
        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            <p className="py-12 text-center text-xs text-slate-400">Memuat...</p>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <HiOutlineBanknotes className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm font-semibold">Belum ada pengajuan petty cash</p>
            </div>
          ) : (
            rows.map((row) => {
              const aging = getAging(row.transactionDate);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openDetail(row)}
                  className="block w-full px-4 py-3 text-left active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{row.outletFullName || row.outletName || "—"}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{row.category || "—"}</p>
                    </div>
                    <p className="shrink-0 text-sm font-black tabular-nums text-slate-800">{fmtIDR(row.amount)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", statusBadge(row.status))}>{row.status}</span>
                    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", sourceBadge(row.isPettyCash))}>
                      {row.isPettyCash === false ? "Central Cash" : "Petty Cash"}
                    </span>
                    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", agingTone(aging.days))}>{aging.label}</span>
                  </div>
                  <p className="mt-1.5 truncate text-[11px] text-slate-400">
                    {fmtDate(row.transactionDate)} · {fmtEmployeeName(row.cashierName) || "—"}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Desktop: tabel */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">Aging</th>
                <th className="px-4 py-3 font-semibold">Outlet</th>
                <th className="px-4 py-3 font-semibold">Frontliner</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Sumber</th>
                <th className="px-4 py-3 font-semibold text-center">Nominal</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Memuat...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <HiOutlineBanknotes className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm font-semibold">Belum ada pengajuan petty cash</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const aging = getAging(row.transactionDate);
                  return (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-slate-50/80"
                    onClick={() => openDetail(row)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{fmtDate(row.transactionDate)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", agingTone(aging.days))}>
                          {aging.label}
                        </span>
                        <p className="mt-1 text-[10px] font-medium text-slate-400">{aging.dateLabel}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.outletFullName || row.outletName || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtEmployeeName(row.cashierName)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.category}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", sourceBadge(row.isPettyCash))}>
                        {row.isPettyCash === false ? "Central Cash" : "Petty Cash"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center font-bold tabular-nums text-slate-800">{fmtIDR(row.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", statusBadge(row.status))}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          title="Lihat detail"
                          onClick={() => openDetail(row)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <HiOutlineEye className="h-4 w-4" />
                        </button>
                        {row.status === "Pengajuan" ? (
                          <button
                            type="button"
                            title="Hapus pengajuan"
                            onClick={() => setDeleteTarget(row)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detailRow &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4" onClick={closeDetail}>
            <form
              onSubmit={submitSave}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="relative shrink-0 bg-gradient-to-br from-[#5f1340] to-[#3d0c29] px-5 pb-5 pt-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Detail Pengajuan Petty Cash</p>
                    <p className="mt-0.5 text-xs font-medium text-white/80">{fmtDate(detailRow.transactionDate)}</p>
                  </div>
                  <button type="button" onClick={closeDetail} className="rounded-full bg-white/10 p-1.5 text-white/80 hover:bg-white/20" aria-label="Tutup">
                    <HiOutlineXMark className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-3 text-3xl font-black tabular-nums tracking-tight">
                  {editForm.type === "Masuk" ? "+" : "−"}{fmtIDR(editForm.amount)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", statusBadge(detailRow.status))}>
                    {detailRow.status}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/90">
                    <HiOutlineUser className="h-3 w-3" /> {fmtEmployeeName(detailRow.cashierName) || "—"}
                  </span>
                  <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/90">
                    {editForm.isPettyCash ? "Petty Cash" : "Central Cash"}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="space-y-3">
                  <Field label="Outlet">
                    <select
                      required
                      disabled={!isPending}
                      value={editForm.outletId}
                      onChange={(e) => setEditForm((p) => ({ ...p, outletId: e.target.value }))}
                      className={INPUT_CLS}
                    >
                      <option value="">— Pilih outlet —</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>{o.full_name || o.name}</option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Tipe">
                      <select
                        disabled={!isPending}
                        value={editForm.type}
                        onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                        className={INPUT_CLS}
                      >
                        <option value="Keluar">Keluar</option>
                        <option value="Masuk">Masuk</option>
                      </select>
                    </Field>
                    <Field label="Nominal">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                        <input
                          required
                          disabled={!isPending}
                          inputMode="numeric"
                          value={editForm.amount ? Number(editForm.amount).toLocaleString("id-ID") : ""}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
                            setEditForm((p) => ({ ...p, amount: digits }));
                          }}
                          placeholder="0"
                          className={cn(INPUT_CLS, "pl-10 font-bold tabular-nums")}
                        />
                      </div>
                    </Field>
                  </div>

                  <Field label="Sumber dana">
                    <select
                      disabled={!isPending}
                      value={editForm.isPettyCash ? "1" : "0"}
                      onChange={(e) => setEditForm((p) => ({ ...p, isPettyCash: e.target.value === "1" }))}
                      className={INPUT_CLS}
                    >
                      <option value="1">Petty Cash (mengubah saldo kas laci)</option>
                      <option value="0">Central Cash (saldo tidak berubah)</option>
                    </select>
                  </Field>

                  <Field label="Kategori">
                    <select
                      required
                      disabled={!isPending}
                      value={editForm.category}
                      onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                      className={INPUT_CLS}
                    >
                      <option value="">— Pilih kategori —</option>
                      {categoryOptions.map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Keterangan">
                    <textarea
                      disabled={!isPending}
                      rows={2}
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      className={cn(INPUT_CLS, "resize-none")}
                    />
                  </Field>
                </div>

                <Field label="Bukti foto">
                  {detailRow.receiptPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => setProofView(receiptUrl(detailRow.receiptPhotoUrl))}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-left transition hover:border-[#5f1340]/40"
                      title="Lihat bukti"
                    >
                      {proofBroken ? (
                        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-white text-slate-300">
                          <HiOutlinePhoto className="h-8 w-8" />
                        </span>
                      ) : (
                        <img
                          src={receiptUrl(detailRow.receiptPhotoUrl)}
                          alt=""
                          onError={() => setProofBroken(true)}
                          className="h-20 w-20 shrink-0 rounded-xl bg-white object-cover"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700">Bukti pengajuan</span>
                        {proofBroken && (
                          <span className="block text-[11px] text-amber-700">Pratinjau gagal dimuat — tetap bisa dibuka</span>
                        )}
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#5f1340]">
                          <HiOutlineEye className="h-3.5 w-3.5" /> Ketuk untuk memperbesar
                        </span>
                      </span>
                    </button>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">Tidak ada bukti foto</p>
                  )}
                </Field>

                {isPending ? (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <Field label="Diproses oleh">
                      <EmployeeSearchSelect
                        employees={employeeOptions}
                        value={modalEmployeeId}
                        onChange={setModalEmployeeId}
                      />
                      {loggedInEmployee?.full_name ? (
                        <span className="mt-1 block text-[11px] font-normal normal-case text-slate-500">
                          Default: akun login ({fmtEmployeeName(loggedInEmployee.full_name)}) — bisa diganti admin
                        </span>
                      ) : null}
                    </Field>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                    {detailRow.approvedByName ? `Diproses oleh ${fmtEmployeeName(detailRow.approvedByName)}` : "Sudah diproses"}
                    {detailRow.rejectedReason ? ` · ${detailRow.rejectedReason}` : ""}
                  </div>
                )}
              </div>

              {/* Footer aksi */}
              {isPending && (
                <div className="shrink-0 space-y-2 border-t border-slate-100 bg-white px-5 py-3 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 sm:w-auto"
                  >
                    {submitting ? "Menyimpan..." : "Simpan perubahan"}
                  </button>
                  <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirmAction("reject")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <HiOutlineXCircle className="h-4 w-4" /> Tolak
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        if (!modalEmployeeId) {
                          showToast("error", "Petugas yang menyetujui wajib diisi");
                          return;
                        }
                        setConfirmAction("approve");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <HiOutlineCheckCircle className="h-4 w-4" /> Setujui
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>,
          document.body
        )}

      <PhotoViewerModal open={!!proofView} url={proofView} label="Bukti petty cash" onClose={() => setProofView(null)} />

      {detailRow && confirmAction &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => !submitting && setConfirmAction(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="px-5 pt-5 text-center">
                <span className={cn(
                  "mx-auto grid h-12 w-12 place-items-center rounded-2xl",
                  confirmAction === "approve" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {confirmAction === "approve" ? <HiOutlineCheckCircle className="h-7 w-7" /> : <HiOutlineXCircle className="h-7 w-7" />}
                </span>
                <h3 className="mt-3 text-base font-black text-slate-800">
                  {confirmAction === "approve" ? "Setujui pengajuan?" : "Tolak pengajuan?"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {confirmAction === "approve"
                    ? (editForm.isPettyCash ? "Saldo petty cash outlet akan berubah." : "Dicatat sebagai Central Cash, saldo petty cash tidak berubah.")
                    : "Frontliner akan melihat alasan penolakan ini."}
                </p>
              </div>
              <div className="mx-5 mt-4 space-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Nominal</span><span className="font-black tabular-nums text-slate-800">{fmtIDR(editForm.amount)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Outlet</span><span className="truncate text-right font-semibold text-slate-700">{(outlets.find((o) => String(o.id) === String(editForm.outletId))?.full_name) || detailRow.outletFullName || detailRow.outletName || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Kategori</span><span className="truncate text-right font-semibold text-slate-700">{editForm.category || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Diproses oleh</span><span className="truncate text-right font-semibold text-slate-700">{fmtEmployeeName(employeeOptions.find((e) => String(e.employee_id ?? e.id) === String(modalEmployeeId))?.full_name) || "—"}</span></div>
              </div>
              {confirmAction === "reject" && (
                <div className="mx-5 mt-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Alasan penolakan *</p>
                  <textarea
                    rows={3}
                    autoFocus
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: bukti tidak jelas, nominal tidak sesuai nota"
                    className={cn(INPUT_CLS, "resize-none")}
                  />
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirmAction(null)}
                  className="rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting || (confirmAction === "reject" && !rejectReason.trim())}
                  onClick={confirmAction === "approve" ? submitApprove : submitReject}
                  className={cn(
                    "rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-50",
                    confirmAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {submitting ? "Memproses..." : confirmAction === "approve" ? "Ya, Setujui" : "Ya, Tolak"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {deleteTarget &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDeleteTarget(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Hapus pengajuan?</h3>
              <p className="text-xs text-slate-500">
                {deleteTarget.category} · {fmtIDR(deleteTarget.amount)} akan dihapus permanen.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold">
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function employeeLabel(e) {
  if (!e) return "";
  const name = fmtEmployeeName(e.full_name, "");
  return `${name}${e.employee_code ? ` · ${e.employee_code}` : ""}`.trim();
}

function EmployeeSearchSelect({ employees = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => employees.find((e) => String(e.employee_id) === String(value)) || null,
    [employees, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees.slice(0, 80);
    return employees
      .filter((e) => {
        const hay = `${e.full_name || ""} ${e.employee_code || ""} ${e.email || ""} ${e.company_name || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 80);
  }, [employees, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 hover:border-slate-300"
      >
        <HiOutlineUser className="h-4 w-4 shrink-0 text-slate-400" />
        <span className={cn("flex-1 truncate", !selected && "text-slate-400")}>
          {selected ? employeeLabel(selected) : "— Pilih petugas —"}
        </span>
        <HiOutlineChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / kode karyawan..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#5f1340]/40"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-slate-400">Tidak ada hasil</li>
            ) : (
              filtered.map((e) => {
                const active = String(e.employee_id) === String(value);
                return (
                  <li key={e.employee_id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(String(e.employee_id));
                        setOpen(false);
                        setQuery("");
                      }}
                      className={cn(
                        "flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50",
                        active && "bg-[#5f1340]/5"
                      )}
                    >
                      <span className={cn("text-sm font-medium", active ? "text-[#5f1340]" : "text-slate-800")}>
                        {fmtEmployeeName(e.full_name)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {[e.employee_code, e.company_name].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
