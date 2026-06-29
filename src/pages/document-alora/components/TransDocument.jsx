import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowsRightLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineXMark,
  HiOutlineArrowUturnLeft,
  HiOutlineHandThumbUp,
  HiOutlineTrash,
  HiOutlineClock,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const STATUS_CONFIG = {
  borrowed: { label: "Dipinjam", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  returned: { label: "Dikembalikan", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:  { label: "Terlambat", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  lost:     { label: "Hilang", cls: "bg-slate-100 text-slate-600 border-slate-300" },
};

const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.borrowed;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", c.cls)}>
      {c.label}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={cn(
      "fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-lg border",
      toast.type === "success"
        ? "bg-emerald-50/95 border-emerald-200 text-emerald-700"
        : "bg-rose-50/95 border-rose-200 text-rose-700")}>
      {toast.type === "success"
        ? <HiOutlineCheckCircle className="h-5 w-5" />
        : <HiOutlineExclamationTriangle className="h-5 w-5" />}
      {toast.msg}
    </div>
  );
}

// ── Borrow Form Modal ─────────────────────────────────────────────────────────
function BorrowModal({ open, onClose, onSaved, lookups }) {
  const [form, setForm] = useState({
    document_id: "", department_id: "", purpose: "",
    borrow_date: new Date().toISOString().split("T")[0],
    return_due: "", condition_on_borrow: "good", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        document_id: "", department_id: "", purpose: "",
        borrow_date: new Date().toISOString().split("T")[0],
        return_due: "", condition_on_borrow: "good", notes: "",
      });
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.document_id || !form.purpose || !form.borrow_date || !form.return_due) {
      setError("Mohon lengkapi semua field wajib");
      return;
    }
    setSaving(true);
    try {
      await api("/doc-alora/transactions", { method: "POST", body: JSON.stringify(form) });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800">Pinjam Dokumen</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition">
            <HiOutlineXMark className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
              <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dokumen *</label>
            <select value={form.document_id} onChange={e => setForm(f => ({ ...f, document_id: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
              <option value="">— Pilih Dokumen —</option>
              {lookups.documents.map(d => (
                <option key={d.id} value={d.id}>{d.document_name} ({d.document_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Departemen</label>
            <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
              <option value="">— Otomatis dari profil —</option>
              {lookups.departments.map(d => (
                <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Keperluan *</label>
            <textarea value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} rows={3}
              placeholder="Jelaskan keperluan peminjaman..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Pinjam *</label>
              <input type="date" value={form.borrow_date} onChange={e => setForm(f => ({ ...f, borrow_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Batas Kembali *</label>
              <input type="date" value={form.return_due} onChange={e => setForm(f => ({ ...f, return_due: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kondisi Saat Dipinjam</label>
            <select value={form.condition_on_borrow} onChange={e => setForm(f => ({ ...f, condition_on_borrow: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
              <option value="good">Baik</option>
              <option value="damaged">Rusak</option>
              <option value="incomplete">Tidak Lengkap</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-900 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm">
              {saving ? "Menyimpan..." : "Simpan Peminjaman"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Return Modal ──────────────────────────────────────────────────────────────
function ReturnModal({ open, onClose, onSaved, transactionId }) {
  const [form, setForm] = useState({ condition_on_return: "good", notes: "" });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/doc-alora/transactions/${transactionId}/return`, {
        method: "POST", body: JSON.stringify(form),
      });
      onSaved();
      onClose();
    } catch (err) {
      alert(err.message || "Gagal mengembalikan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Kembalikan Dokumen</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kondisi Saat Dikembalikan</label>
            <select value={form.condition_on_return} onChange={e => setForm(f => ({ ...f, condition_on_return: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
              <option value="good">Baik</option>
              <option value="damaged">Rusak</option>
              <option value="incomplete">Tidak Lengkap</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm">
              {saving ? "Memproses..." : "Kembalikan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TransDocument() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSI] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFS] = useState("");
  const [toast, setToast] = useState(null);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnId, setReturnId] = useState(null);
  const [lookups, setLookups] = useState({ documents: [], departments: [] });

  const LIMIT = 15;
  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // load lookups
  useEffect(() => {
    (async () => {
      try {
        const [docRes, deptRes] = await Promise.all([
          api("/doc-alora/lookup/documents"),
          api("/doc-alora/lookup/departments"),
        ]);
        setLookups({
          documents: docRes.data || [],
          departments: deptRes.data || [],
        });
      } catch { /* ignore */ }
    })();
  }, []);

  // load list
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      const d = await api(`/doc-alora/transactions?${params}`);
      setData(d.data || []);
      setTotal(d.total || 0);
    } catch (err) {
      showToast("error", err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => { loadList(); }, [loadList]);

  const handleApprove = async (id) => {
    try {
      await api(`/doc-alora/transactions/${id}/approve`, { method: "POST" });
      showToast("success", "Transaksi disetujui");
      loadList();
    } catch (err) { showToast("error", err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await api(`/doc-alora/transactions/${id}`, { method: "DELETE" });
      showToast("success", "Transaksi dihapus");
      loadList();
    } catch (err) { showToast("error", err.message); }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Peminjaman Dokumen</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola peminjaman & pengembalian dokumen</p>
        </div>
        <button onClick={() => setBorrowOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition shadow-sm">
          <HiOutlinePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Pinjam Dokumen</span>
        </button>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={searchInput} onChange={e => setSI(e.target.value)}
            placeholder="Cari kode transaksi, nama dokumen, atau peminjam..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition" />
        </div>
        <select value={filterStatus} onChange={e => { setFS(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
          <option value="">Semua Status</option>
          <option value="borrowed">Dipinjam</option>
          <option value="returned">Dikembalikan</option>
          <option value="overdue">Terlambat</option>
          <option value="lost">Hilang</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 rounded-full border-2 border-blue-900 border-t-transparent animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <HiOutlineArrowsRightLeft className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Belum ada transaksi peminjaman</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Transaksi</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Peminjam</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Tgl Pinjam</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Batas Kembali</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map(row => {
                  const isBorrowed = row.status === "borrowed" || row.status === "overdue";
                  return (
                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-4 max-w-[280px] sm:max-w-xs md:max-w-sm lg:max-w-md">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            isBorrowed ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                          )}>
                            {isBorrowed
                              ? <HiOutlineClock className="h-4 w-4" />
                              : <HiOutlineCheckCircle className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 break-words whitespace-normal">{row.document_name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{row.transaction_code} · {row.document_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="text-sm text-slate-700">{row.borrower_name || "—"}</p>
                        <p className="text-[11px] text-slate-400">{row.department_name || ""}</p>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <p className="text-xs text-slate-600">{formatDate(row.borrow_date)}</p>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-xs text-slate-600">{formatDate(row.return_due)}</p>
                        {row.actual_return && (
                          <p className="text-[11px] text-emerald-600">Kembali: {formatDate(row.actual_return)}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {isBorrowed && (
                            <button onClick={() => { setReturnId(row.id); setReturnOpen(true); }}
                              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition" title="Kembalikan">
                              <HiOutlineArrowUturnLeft className="h-4 w-4" />
                            </button>
                          )}
                          {!row.approved_by && (
                            <button onClick={() => handleApprove(row.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Setujui">
                              <HiOutlineHandThumbUp className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(row.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Hapus">
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
            <p className="text-[11px] text-slate-400">
              Hal <span className="font-semibold text-slate-600">{page}</span>/{totalPages}
              <span className="ml-1">({total} transaksi)</span>
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <HiOutlineChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <HiOutlineChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <BorrowModal
        open={borrowOpen}
        onClose={() => setBorrowOpen(false)}
        onSaved={() => { showToast("success", "Peminjaman berhasil dicatat"); loadList(); }}
        lookups={lookups}
      />
      <ReturnModal
        open={returnOpen}
        onClose={() => { setReturnOpen(false); setReturnId(null); }}
        onSaved={() => { showToast("success", "Dokumen berhasil dikembalikan"); loadList(); }}
        transactionId={returnId}
      />
    </div>
  );
}