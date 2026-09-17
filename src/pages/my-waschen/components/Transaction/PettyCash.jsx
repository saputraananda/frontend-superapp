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
} from "react-icons/hi2";
import { api, BASE_URL } from "../../../../lib/api";
import PageHero from "../PageHero";
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

  const load = useCallback(async () => {
    setLoading(true);
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
      showToast("error", err.message || "Gagal memuat petty cash");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [outletId, statusFilter, search, cutoff.dateFrom, cutoff.dateTo]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    load();
  }, [load]);

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
              className="ml-auto shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
                    <td className="px-4 py-3 font-semibold text-slate-800">{fmtDate(row.transactionDate)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", agingTone(aging.days))}>
                          {aging.label}
                        </span>
                        <p className="mt-1 text-[10px] font-medium text-slate-400">{aging.dateLabel}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.outletFullName || row.outletName || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtEmployeeName(row.cashierName)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          row.isPettyCash === false
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-[#5f1340]/20 bg-[#5f1340]/5 text-[#5f1340]"
                        )}
                      >
                        {row.isPettyCash === false ? "Central Cash" : "Petty Cash"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{fmtIDR(row.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", statusBadge(row.status))}>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={closeDetail}>
            <form
              onSubmit={submitSave}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Detail Pengajuan</h3>
                  <p className="text-xs text-slate-500">{fmtDate(detailRow.transactionDate)}</p>
                </div>
                <button type="button" onClick={closeDetail} className="p-1 text-slate-400">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", statusBadge(detailRow.status))}>
                  {detailRow.status}
                </span>
                <span className="text-[11px] text-slate-500">Frontliner: {fmtEmployeeName(detailRow.cashierName)}</span>
              </div>

              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Outlet
                <select
                  required
                  disabled={!isPending}
                  value={editForm.outletId}
                  onChange={(e) => setEditForm((p) => ({ ...p, outletId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:bg-slate-50"
                >
                  <option value="">— Pilih outlet —</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name || o.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400">
                  Tipe
                  <select
                    disabled={!isPending}
                    value={editForm.type}
                    onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:bg-slate-50"
                  >
                    <option value="Keluar">Keluar</option>
                    <option value="Masuk">Masuk</option>
                  </select>
                </label>
                <label className="block text-[10px] font-bold uppercase text-slate-400">
                  Nominal
                  <input
                    required
                    disabled={!isPending}
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50"
                  />
                </label>
              </div>

              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Sumber dana
                <select
                  disabled={!isPending}
                  value={editForm.isPettyCash ? "1" : "0"}
                  onChange={(e) => setEditForm((p) => ({ ...p, isPettyCash: e.target.value === "1" }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:bg-slate-50"
                >
                  <option value="1">Petty Cash (mengubah saldo kas laci)</option>
                  <option value="0">Central Cash (saldo tidak berubah)</option>
                </select>
              </label>

              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Kategori
                <select
                  required
                  disabled={!isPending}
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:bg-slate-50"
                >
                  <option value="">— Pilih kategori —</option>
                  {categoryOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Keterangan
                <textarea
                  disabled={!isPending}
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50"
                />
              </label>

              {detailRow.receiptPhotoUrl ? (
                <a
                  href={receiptUrl(detailRow.receiptPhotoUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-slate-200"
                >
                  <img
                    src={receiptUrl(detailRow.receiptPhotoUrl)}
                    alt="Bukti"
                    className="max-h-48 w-full object-contain bg-slate-50"
                  />
                </a>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Tidak ada bukti foto</p>
              )}

              {isPending ? (
                <>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Diproses oleh
                    <div className="mt-1">
                      <EmployeeSearchSelect
                        employees={employeeOptions}
                        value={modalEmployeeId}
                        onChange={setModalEmployeeId}
                      />
                    </div>
                    {loggedInEmployee?.full_name ? (
                      <span className="mt-1 block text-[11px] font-normal normal-case text-slate-500">
                        Default: akun login ({fmtEmployeeName(loggedInEmployee.full_name)}) — bisa diganti admin
                      </span>
                    ) : null}
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Catatan penolakan (wajib jika menolak)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                    >
                      {submitting ? "..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={submitApprove}
                      className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={submitReject}
                      className="rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Tolak
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {detailRow.approvedByName ? `Diproses oleh ${fmtEmployeeName(detailRow.approvedByName)}` : "Sudah diproses"}
                  {detailRow.rejectedReason ? ` · ${detailRow.rejectedReason}` : ""}
                </div>
              )}
            </form>
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
