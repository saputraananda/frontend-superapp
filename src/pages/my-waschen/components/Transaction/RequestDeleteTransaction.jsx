import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineTrash,
  HiOutlineArrowPath,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
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

function isPending(status) {
  return status === 0 || status === "0" || status == null;
}

function isApproved(status) {
  return status === 1 || status === "1";
}

export default function RequestDeleteTransaction({ employees = [], onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [approvingId, setApprovingId] = useState(null);
  const [employeeId, setEmployeeId] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/waschen/transactions?listType=delete");
      setRows(res.data || []);
    } catch (err) {
      showToast("error", err.message || "Gagal memuat request delete");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = rows.filter((r) => isPending(r.deleteApprovalStatus)).length;
  const approvedCount = rows.filter((r) => isApproved(r.deleteApprovalStatus)).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchQ =
        !q ||
        String(r.orderNo || "").toLowerCase().includes(q) ||
        String(r.customerName || "").toLowerCase().includes(q) ||
        String(r.deleteReason || "").toLowerCase().includes(q);
      const matchF =
        filter === "Semua" ||
        (filter === "Pending" && isPending(r.deleteApprovalStatus)) ||
        (filter === "Approved" && isApproved(r.deleteApprovalStatus));
      return matchQ && matchF;
    });
  }, [rows, search, filter]);

  const approve = async (row) => {
    if (!employeeId) {
      showToast("error", "Pilih karyawan (mst_employee) yang menyetujui");
      return;
    }
    setApprovingId(row.id);
    try {
      await api(`/waschen/transactions/${row.id}/approve-delete`, {
        method: "PATCH",
        body: JSON.stringify({ employeeId: Number(employeeId) }),
      });
      showToast("success", `Hapus nota ${row.orderNo} disetujui`);
      await load();
      onChanged?.();
    } catch (err) {
      showToast("error", err.message || "Gagal approve hapus");
    } finally {
      setApprovingId(null);
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600">
            <HiOutlineTrash className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-wider">Total Request Delete</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-800">{rows.length} <span className="text-sm font-semibold text-slate-500">Pengajuan</span></p>
          <p className="mt-1 text-[11px] text-slate-500">Pengajuan hapus nota</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <HiOutlineClock className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-wider">Pending Approval</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-800">{pendingCount} <span className="text-sm font-semibold">Nota</span></p>
          <p className="mt-1 text-[11px] text-amber-700/80">Menunggu konfirmasi SuperApp</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <HiOutlineCheckCircle className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-wider">Approved</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{approvedCount} <span className="text-sm font-semibold">Nota</span></p>
          <p className="mt-1 text-[11px] text-emerald-700/80">Disetujui karyawan Waschen</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[14rem] flex-1 max-w-md">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. nota, pelanggan, alasan..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-rose-500"
            >
              <option value="">Karyawan approve...</option>
              {employees.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>
                  {e.employee_code} — {fmtEmployeeName(e.full_name)}
                </option>
              ))}
            </select>
            {["Semua", "Pending", "Approved"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                  filter === f ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200"
                )}
              >
                {f} ({f === "Semua" ? rows.length : f === "Pending" ? pendingCount : approvedCount})
              </button>
            ))}
            <button type="button" onClick={load} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">No. Nota & Waktu</th>
                <th className="px-4 py-3 font-semibold">Pelanggan</th>
                <th className="px-4 py-3 font-semibold">Outlet</th>
                <th className="px-4 py-3 font-semibold">Alasan Hapus</th>
                <th className="px-4 py-3 font-semibold text-right">Grand Total</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <HiOutlineExclamationTriangle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="font-semibold">Tidak ada pengajuan hapus nota</p>
                    <p className="mt-1 text-[11px]">Semua pengajuan request delete akan tampil di sini</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-bold font-mono text-[#5f1340]">{r.orderNo}</p>
                      <p className="text-[10px] text-slate-400">{fmtDate(r.deleteRequestedAt)}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.customerName || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.branch || r.outletName || "—"}</td>
                    <td className="px-4 py-3 max-w-[16rem] truncate text-slate-600" title={r.deleteReason}>{r.deleteReason || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold">{fmtIDR(r.grandTotal)}</td>
                    <td className="px-4 py-3 text-center">
                      {isApproved(r.deleteApprovalStatus) ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Approved</span>
                      ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isPending(r.deleteApprovalStatus) ? (
                        <button
                          type="button"
                          disabled={approvingId === r.id}
                          onClick={() => approve(r)}
                          className="rounded-xl bg-rose-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {approvingId === r.id ? "..." : "Approve"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
