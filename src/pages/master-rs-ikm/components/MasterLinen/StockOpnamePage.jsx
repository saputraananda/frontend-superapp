import { useState, useEffect } from "react";
import { api } from "../../../../lib/api";
import {
  HiOutlineClipboardDocumentList,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineEye,
  HiOutlineArrowLeft,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineExclamationCircle
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

// Helper for formatting date to Indonesian locale
function formatLocalDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

export default function StockOpnamePage({ hospitalId, hospitalName }) {
  const [view, setView] = useState("history"); // "history" | "form"
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [opnameType, setOpnameType] = useState("RS"); // "RS" | "IKM"
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [linens, setLinens] = useState([]);
  const [linensLoading, setLinensLoading] = useState(false);
  const [quantities, setQuantities] = useState({}); // { hospital_linen_id: qty }
  const [formSearch, setFormSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hospitalRooms, setHospitalRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // Detail Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Toast / feedback states
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api(`/ikm/stock-opname?hospital_id=${hospitalId}`);
      setHistory(res.data || []);
    } catch (err) {
      showToast("error", err?.message || "Gagal memuat riwayat stock opname");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setView("history");
    setLinens([]);
    setQuantities({});
    setFormSearch("");
    setDetailData(null);
    setOpnameType("RS");
    setSelectedRoomId("");
    fetchHistory();

    // Fetch hospital rooms
    (async () => {
      try {
        const res = await api("/ikm/master-rs/hospitals");
        const hospitals = res.data || [];
        const h = hospitals.find(h => String(h.id) === String(hospitalId));
        if (h) {
          setHospitalRooms(h.rooms || []);
        }
      } catch { /* silent */ }
    })();
  }, [hospitalId]);

  const loadLinensForForm = async () => {
    setLinensLoading(true);
    try {
      const res = await api(`/ikm/hospital-linen/${hospitalId}`);
      // Only keep active ones
      const activeLinens = (res?.data || []).filter(item => item.is_active);
      setLinens(activeLinens);
      
      // Initialize quantities to empty/0
      const initialQty = {};
      activeLinens.forEach(item => {
        initialQty[item.id] = "";
      });
      setQuantities(initialQty);
    } catch (err) {
      showToast("error", err?.message || "Gagal memuat list linen RS");
    } finally {
      setLinensLoading(false);
    }
  };

  const handleOpenForm = () => {
    setView("form");
    loadLinensForForm();
  };

  const handleCloseForm = () => {
    setView("history");
    setLinens([]);
    setQuantities({});
    setFormSearch("");
    setSelectedRoomId("");
  };

  const handleQtyChange = (hospitalLinenId, val) => {
    // Keep only numeric values
    const cleaned = val.replace(/[^0-9]/g, "");
    setQuantities(prev => ({
      ...prev,
      [hospitalLinenId]: cleaned
    }));
  };

  const handleViewDetail = async (opnameId) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await api(`/ikm/stock-opname/${opnameId}`);
      setDetailData(res);
    } catch (err) {
      showToast("error", err?.message || "Gagal memuat detail stock opname");
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (opnameType === "RS" && hospitalRooms.length > 0 && !selectedRoomId) {
      showToast("error", "Harap pilih ruangan rumah sakit");
      return;
    }

    // Check that we have details to submit
    const details = linens.map(item => ({
      hospital_linen_id: item.id,
      stock_qty: Number(quantities[item.id]) || 0
    }));

    setSubmitting(true);
    try {
      await api("/ikm/stock-opname", {
        method: "POST",
        body: JSON.stringify({
          hospital_id: hospitalId,
          opname_type: opnameType,
          opname_date: formDate,
          room_id: (opnameType === "RS" && hospitalRooms.length > 0) ? selectedRoomId : null,
          details
        })
      });
      showToast("success", "Stock opname berhasil disimpan");
      handleCloseForm();
      fetchHistory();
    } catch (err) {
      showToast("error", err?.message || "Gagal menyimpan stock opname");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter linens in form based on search query
  const filteredLinens = linens.filter(l => {
    const masterName = (l.master_linen_name || "").toLowerCase();
    const hospitalName = (l.hospital_linen_name || "").toLowerCase();
    const query = formSearch.toLowerCase();
    return masterName.includes(query) || hospitalName.includes(query);
  });

  return (
    <div className="p-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 animate-slide-in ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
            : "bg-rose-50 border-rose-100 text-rose-800"
        }`}>
          {toast.type === "success" ? (
            <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <HiOutlineExclamationCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {view === "history" ? (
        <div>
          {/* Header Action Bar */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">Stock Opname — {hospitalName}</h1>
              <p className="text-xs text-slate-400 mt-0.5">Catatan riwayat & pengisian stok linen rumah sakit</p>
            </div>
            <button
              onClick={handleOpenForm}
              className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition active:scale-95 shrink-0"
            >
              <HiOutlinePlus className="h-4 w-4" /> Input Stock Opname
            </button>
          </div>

          {/* History List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <HiOutlineClock className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-300" />
                Memuat riwayat...
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <HiOutlineClipboardDocumentList className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">Belum ada riwayat stock opname</p>
                <p className="text-xs text-slate-400">Silakan klik tombol "Input Stock Opname" untuk mencatat stok hari ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">No</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Opname</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipe SO / Ruangan</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pengisi / PIC</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Jumlah Jenis Linen</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quantity</th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((row, i) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4 text-slate-400 text-xs font-medium">{i + 1}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800 flex items-center gap-2">
                          <HiOutlineCalendar className="h-4 w-4 text-slate-400" />
                          {formatLocalDate(row.opname_date)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold w-max",
                              row.opname_type === "IKM"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            )}>
                              {row.opname_type === "IKM" ? "Gudang IKM" : "Rumah Sakit"}
                            </span>
                            {row.opname_type === "RS" && row.room_name && (
                              <span className="text-xs text-slate-400 font-semibold mt-1">🚪 {row.room_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">{row.pic_name}</td>
                        <td className="px-5 py-4 text-center font-semibold text-slate-800">{row.item_count} jenis</td>
                        <td className="px-5 py-4 text-center font-semibold text-slate-800">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                            {row.total_qty} pcs
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleViewDetail(row.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition text-xs font-semibold"
                            >
                              <HiOutlineEye className="h-3.5 w-3.5" /> Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Form View */
        <form onSubmit={handleSubmit} className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Form Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCloseForm}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
            >
              <HiOutlineArrowLeft className="h-4 w-4" /> Kembali
            </button>
            <h2 className="text-sm font-bold text-slate-800">Form Input Stock Opname</h2>
            <div className="w-16" />
          </div>

          <div className="p-6 flex flex-col gap-6">
            {/* Form Fields Header */}
            <div className={cn("grid grid-cols-1 gap-4", (opnameType === "RS" && hospitalRooms.length > 0) ? "md:grid-cols-4" : "md:grid-cols-3")}>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Stock Opname</label>
                <div className="relative">
                  <HiOutlineCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rumah Sakit</label>
                <input
                  type="text"
                  disabled
                  value={hospitalName}
                  className="w-full px-3 py-2 border border-slate-100 rounded-xl bg-slate-50 text-slate-500 text-sm font-medium outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipe Stock Opname</label>
                <select
                  value={opnameType}
                  onChange={(e) => {
                    setOpnameType(e.target.value);
                    if (e.target.value === "IKM") setSelectedRoomId("");
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm font-medium outline-none bg-white transition"
                >
                  <option value="RS">Stock Opname Rumah Sakit</option>
                  <option value="IKM">Stock Opname Gudang IKM</option>
                </select>
              </div>
              {opnameType === "RS" && hospitalRooms.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Ruangan <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm font-medium outline-none bg-white transition"
                  >
                    <option value="">— Pilih Ruangan —</option>
                    {hospitalRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.room_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Linen list Search and table */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Pengisian Stok Linen</span>
                <div className="relative w-full sm:w-64">
                  <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formSearch}
                    onChange={(e) => setFormSearch(e.target.value)}
                    placeholder="Cari linen..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              {linensLoading ? (
                <div className="py-12 text-center text-slate-400 bg-white border border-slate-100 rounded-xl">
                  <HiOutlineClock className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-300" />
                  Memuat data linen...
                </div>
              ) : filteredLinens.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-white border border-slate-100 rounded-xl">
                  Tidak ada data linen aktif ditemukan.
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block border border-slate-100 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-4 py-3 font-semibold text-slate-500 w-12 text-center">No</th>
                          <th className="px-4 py-3 font-semibold text-slate-500 w-32">Kode</th>
                          <th className="px-4 py-3 font-semibold text-slate-500">Nama Linen</th>
                          <th className="px-4 py-3 font-semibold text-slate-500">Nama di RS</th>
                          <th className="px-4 py-3 font-semibold text-slate-500 w-28">Kepemilikan</th>
                          {opnameType === "RS" ? (
                            <th className="px-4 py-3 font-semibold text-slate-500 w-32 text-center">
                              {selectedRoomId ? "Stok Ruangan Saat Ini" : "Stok RS Saat Ini"}
                            </th>
                          ) : (
                            <th className="px-4 py-3 font-semibold text-slate-500 w-32 text-center">Stok IKM Saat Ini</th>
                          )}
                          <th className="px-4 py-3 font-semibold text-slate-500 w-36 text-center">Stok Opname Baru (Pcs)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLinens.map((item, i) => (
                          <tr key={item.id} className="hover:bg-slate-50/40">
                            <td className="px-4 py-3 text-slate-400 text-center">{i + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-700">
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold font-mono">
                                {item.linen_code}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {item.master_linen_name} {[item.size_name, item.color_name, item.material_name].filter(Boolean).join(" ")}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{item.hospital_linen_name || <span className="text-slate-300">—</span>}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.ownership_type === "MILIK_RS" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                              }`}>
                                {item.ownership_type === "MILIK_RS" ? "Milik RS" : "Sewa"}
                              </span>
                            </td>
                            {opnameType === "RS" ? (
                              <td className="px-4 py-3 text-center text-slate-650 font-medium">
                                {selectedRoomId 
                                  ? `${item.room_stocks?.find(r => String(r.room_id) === String(selectedRoomId))?.stock_in_rs ?? 0} Pcs`
                                  : `${item.stock_in_rs ?? 0} Pcs`
                                }
                              </td>
                            ) : (
                              <td className="px-4 py-3 text-center text-slate-650 font-medium">{item.stock_in_ikm ?? 0} Pcs</td>
                            )}
                            <td className="px-4 py-2">
                              <div className="flex justify-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  required
                                  value={quantities[item.id] ?? ""}
                                  onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                  className="w-20 px-2 py-1 text-center text-sm border border-slate-200 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-semibold text-slate-800 transition"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-3">
                    {filteredLinens.map((item, i) => (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold font-mono text-[10px]">
                              {item.linen_code}
                            </span>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.ownership_type === "MILIK_RS" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {item.ownership_type === "MILIK_RS" ? "Milik RS" : "Sewa"}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 text-sm">
                            {item.master_linen_name} {[item.size_name, item.color_name, item.material_name].filter(Boolean).join(" ")}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 mt-1">
                            {item.hospital_linen_name && (
                              <p className="text-[11px] text-slate-400 truncate">
                                Nama di RS: <span className="text-slate-600 font-medium">{item.hospital_linen_name}</span>
                              </p>
                            )}
                            <span className="text-[11px] text-slate-300">•</span>
                            <p className="text-[11px] text-slate-400">
                              Stok {opnameType === "RS" ? (selectedRoomId ? "Ruangan" : "RS") : "IKM"}:{" "}
                              <span className="text-slate-700 font-semibold">
                                {opnameType === "RS" 
                                  ? (selectedRoomId 
                                      ? `${item.room_stocks?.find(r => String(r.room_id) === String(selectedRoomId))?.stock_in_rs ?? 0} Pcs`
                                      : `${item.stock_in_rs ?? 0} Pcs`)
                                  : `${item.stock_in_ikm ?? 0} Pcs`
                                }
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            required
                            value={quantities[item.id] ?? ""}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                            className="w-16 px-2 py-1.5 text-center border border-slate-200 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-bold text-slate-800 text-sm transition"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Submission Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || linens.length === 0}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white shadow transition disabled:opacity-50 active:scale-95"
              >
                {submitting ? "Menyimpan..." : "Simpan Stock Opname"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Detail Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />
          <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50">
                  <HiOutlineClipboardDocumentList className="h-4 w-4 text-red-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">Detail Stock Opname</h2>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <HiOutlineClock className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-300" />
                  Memuat detail...
                </div>
              ) : !detailData ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  Gagal memuat data detail.
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Header info */}
                  <div className={cn("bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-2 gap-4",
                    detailData.header.opname_type === "RS" ? "md:grid-cols-6" : "md:grid-cols-5"
                  )}>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Opname</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{formatLocalDate(detailData.header.opname_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe Stock Opname</p>
                      <p className="text-xs mt-0.5">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          detailData.header.opname_type === "IKM"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        )}>
                          {detailData.header.opname_type === "IKM" ? "Gudang IKM" : "Rumah Sakit"}
                        </span>
                      </p>
                    </div>
                    {detailData.header.opname_type === "RS" && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ruangan</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">🚪 {detailData.header.room_name || "—"}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rumah Sakit</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{hospitalName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pengisi / PIC</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{detailData.header.pic_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Quantity</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {detailData.details.reduce((sum, d) => sum + d.stock_qty, 0)} Pcs
                      </p>
                    </div>
                  </div>

                  {/* Details table */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Daftar Detail Stok Linen</h3>
                    <div className="border border-slate-100 rounded-xl overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-4 py-3 font-semibold text-slate-500 w-12 text-center">No</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 w-32">Kode</th>
                            <th className="px-4 py-3 font-semibold text-slate-500">Nama Linen</th>
                            <th className="px-4 py-3 font-semibold text-slate-500">Nama di RS</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 w-28 text-center">Kepemilikan</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 w-28 text-center">Jumlah Stok (Pcs)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailData.details.map((item, i) => (
                            <tr key={item.id} className="hover:bg-slate-50/40">
                              <td className="px-4 py-3 text-slate-400 text-center">{i + 1}</td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-700">
                                <span className="inline-flex px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold font-mono">
                                  {item.linen_code}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {item.linen_name} {[item.size_name, item.color_name, item.material_name].filter(Boolean).join(" ")}
                              </td>
                              <td className="px-4 py-3 text-slate-500">{item.hospital_linen_name || <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.ownership_type === "MILIK_RS" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                                }`}>
                                  {item.ownership_type === "MILIK_RS" ? "Milik RS" : "Sewa"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-800 text-sm">
                                {item.stock_qty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
