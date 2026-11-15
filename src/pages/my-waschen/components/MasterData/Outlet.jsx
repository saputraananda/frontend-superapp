import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineBuildingStorefront,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineArrowsUpDown,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function SortTh({ col, label, sortBy, sortDir, onSort }) {
  const active = sortBy === col;
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-slate-100",
        active ? "text-[#5f1340] bg-[#5f1340]/10" : "text-slate-500",
      )}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (sortDir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />) : <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />}
      </div>
    </th>
  );
}

function StatusBadge({ isActive }) {
  const on = Number(isActive) === 1;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold select-none",
        on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-emerald-500" : "bg-slate-400")} />
      {on ? "Aktif" : "Nonaktif"}
    </span>
  );
}

const EMPTY_FORM = { id: null, outlet_code: "", name: "", full_name: "", address: "", lat: "", lon: "", is_drop_point: 0, is_active: 1, requires_shift: 1 };

/** Badge kebijakan shift outlet (mst_outlet.requires_shift; NULL dianggap wajib). */
function ShiftBadge({ requiresShift }) {
  const on = Number(requiresShift ?? 1) === 1;
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        on ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-100 text-slate-500"
      )}
    >
      {on ? "Wajib Shift" : "Tanpa Shift"}
    </span>
  );
}

export default function Outlet() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);
      const res = await api(`/waschen/outlets?${query.toString()}`);
      setData(res.data || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useLiveRefresh(() => loadData(true));
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.outlet_code.trim() || !formData.name.trim() || !formData.full_name.trim()) {
      setFormError("Kode Outlet, Nama, dan Nama Lengkap wajib diisi");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      if (formData.id) {
        await api(`/waschen/outlets/${formData.id}`, { method: "PUT", body: JSON.stringify(formData) });
        showToast("Outlet berhasil diperbarui");
      } else {
        await api("/waschen/outlets", { method: "POST", body: JSON.stringify(formData) });
        showToast("Outlet berhasil ditambahkan. Tambahkan layanannya di Master Layanan.");
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/outlets/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Outlet berhasil dihapus");
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((d) => Number(d.is_active ?? 1) === 1).length,
    dropPoint: data.filter((d) => Number(d.is_drop_point) === 1).length,
  }), [data]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 2xl:px-12 space-y-6 max-w-[1920px] mx-auto">
      {toast && (
        <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl", toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <PageHero>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Master Outlet</h1>
            <p className="mt-3 text-sm leading-6 text-white/75">
              Kelola daftar cabang / outlet Waschen
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData(EMPTY_FORM);
              setFormError("");
              setModalOpen(true);
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md hover:bg-pink-50"
          >
            <HiOutlinePlus className="h-4 w-4" />
            Tambah Outlet
          </button>
        
      </PageHero>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Outlet</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Outlet Aktif</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Outlet Drop Point</p>
          <p className="text-2xl font-bold text-sky-700 mt-0.5">{stats.dropPoint}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode / nama outlet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5f1340]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <SortTh col="outlet_code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="full_name" label="Nama Lengkap" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3">Koordinat</th>
                <th className="px-4 py-3 text-center">Shift</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-4 py-4">
                      <div className="h-3.5 bg-slate-200 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data outlet
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{item.outlet_code}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        <HiOutlineBuildingStorefront className="h-3.5 w-3.5 text-slate-400" />
                        {item.name}
                        {Number(item.is_drop_point) === 1 && (
                          <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">Drop Point</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{item.full_name}</td>
                    <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">{item.address || "—"}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.lat != null && item.lon != null ? (
                        <span className="font-mono text-slate-600">{Number(item.lat).toFixed(6)}, {Number(item.lon).toFixed(6)}</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Belum diisi</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center"><ShiftBadge requiresShift={item.requires_shift} /></td>
                    <td className="px-4 py-3.5 text-center"><StatusBadge isActive={item.is_active ?? 1} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              id: item.id,
                              outlet_code: item.outlet_code || "",
                              name: item.name || "",
                              full_name: item.full_name || "",
                              address: item.address || "",
                              lat: item.lat != null ? String(item.lat) : "",
                              lon: item.lon != null ? String(item.lon) : "",
                              is_drop_point: Number(item.is_drop_point) === 1 ? 1 : 0,
                              is_active: Number(item.is_active ?? 1) === 1 ? 1 : 0,
                              requires_shift: Number(item.requires_shift ?? 1) === 1 ? 1 : 0,
                            });
                            setFormError("");
                            setModalOpen(true);
                          }}
                          className="rounded-lg border p-1.5 hover:border-amber-300 hover:bg-amber-50"
                        >
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-lg border p-1.5 hover:border-rose-300 hover:bg-rose-50">
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
                <h3 className="font-bold text-sm">{formData.id ? "Edit Outlet" : "Tambah Outlet"}</h3>
                <button type="button" onClick={() => setModalOpen(false)}>
                  <HiOutlineXMark className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
                {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{formError}</div>}
                <div>
                  <label className="block font-semibold mb-1">Kode Outlet *</label>
                  <input
                    type="text"
                    value={formData.outlet_code}
                    onChange={(e) => setFormData((p) => ({ ...p, outlet_code: e.target.value.toUpperCase() }))}
                    placeholder="CG / RH / LEG"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono outline-none focus:border-[#5f1340]"
                    required
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Dipakai di kode pelanggan: CUS&#123;kode&#125;&#123;YYMM&#125;0001</p>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Nama Singkat *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Citra Gran"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Waschen Laundry Citra Gran"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Alamat</label>
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Koordinat Outlet</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.lat}
                      onChange={(e) => setFormData((p) => ({ ...p, lat: e.target.value }))}
                      placeholder="Latitude, mis. -6.2088"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono outline-none focus:border-[#5f1340]"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.lon}
                      onChange={(e) => setFormData((p) => ({ ...p, lon: e.target.value }))}
                      placeholder="Longitude, mis. 106.8456"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono outline-none focus:border-[#5f1340]"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Opsional. Dipakai Waschen Mobile untuk cek jarak absen; tanpa koordinat, absen di outlet ini ditolak.</p>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]"
                  >
                    <option value={1}>Aktif</option>
                    <option value={0}>Nonaktif</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">Outlet nonaktif tidak bisa membuat nota baru di POS.</p>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Number(formData.is_drop_point) === 1}
                    onChange={(e) => setFormData((p) => ({ ...p, is_drop_point: e.target.checked ? 1 : 0 }))}
                    className="mt-0.5 rounded border-slate-300 text-[#5f1340] focus:ring-[#5f1340]"
                  />
                  <span>
                    <span className="block font-semibold text-slate-700">Outlet Drop Point</span>
                    <span className="block text-[10px] text-slate-400">Outlet penerima cucian; item bisa didistribusikan ke outlet lain untuk produksi.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Number(formData.requires_shift ?? 1) === 1}
                    onChange={(e) => setFormData((p) => ({ ...p, requires_shift: e.target.checked ? 1 : 0 }))}
                    className="mt-0.5 rounded border-slate-300 text-[#5f1340] focus:ring-[#5f1340]"
                  />
                  <span>
                    <span className="block font-semibold text-slate-700">Wajib Shift</span>
                    <span className="block text-[10px] text-slate-400">Jika aktif, staf harus buka shift sebelum membuat nota. Matikan untuk outlet yang tidak memakai shift, misalnya drop point.</span>
                  </span>
                </label>
                {!formData.id && (
                  <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                    Outlet baru belum punya layanan. Tambahkan layanannya lewat menu <b>Master Layanan</b> (per outlet) sebelum outlet dipakai membuat nota.
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">
                    Batal
                  </button>
                  <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 font-semibold text-white disabled:opacity-50">
                    {submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {deleteTarget &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-4 border">
              <h3 className="font-bold text-sm">Hapus outlet {deleteTarget.name}?</h3>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border px-4 py-2 text-xs font-semibold">
                  Batal
                </button>
                <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
                  {deleting ? "Hapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
