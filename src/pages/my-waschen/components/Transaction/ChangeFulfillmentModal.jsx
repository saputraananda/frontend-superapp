import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineTruck,
  HiOutlineArchiveBox,
  HiOutlineXMark,
  HiOutlineMapPin,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getLoggedEmployeeId() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return Number(u?.employee?.employee_id) || null;
  } catch {
    return null;
  }
}

/**
 * Modal ubah pengambilan: Ambil di Outlet ↔ Delivery (full nota atau per item).
 */
export default function ChangeFulfillmentModal({
  open,
  onClose,
  order,
  items = [],
  onSuccess,
  showToast,
}) {
  const [mode, setMode] = useState("delivery");
  const [scope, setScope] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeItems = useMemo(
    () => (items || []).filter((it) => it.id && it.item_work_status !== "Dibatalkan"),
    [items]
  );

  useEffect(() => {
    if (!open || !order) return;
    const wantDelivery = !order.isDelivery;
    setMode(wantDelivery ? "delivery" : "pickup");
    setScope("all");
    setSelectedIds(activeItems.map((it) => it.id));
    setAddress(order.deliveryAddress || order.customerAddress || "");
    setNotes(order.deliveryNotes || "");
  }, [open, order, activeItems]);

  if (!open || !order) return null;

  const toggleItem = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    const toDelivery = mode === "delivery";
    const itemIds = scope === "all" ? activeItems.map((it) => it.id) : selectedIds;

    if (!itemIds.length) {
      showToast?.("error", "Pilih minimal 1 item");
      return;
    }
    if (toDelivery && !String(address || "").trim()) {
      showToast?.("error", "Isi alamat pengantaran supaya tim delivery mudah antar");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api(`/waschen/transactions/${order.id || order.orderNo}/fulfillment`, {
        method: "PATCH",
        body: JSON.stringify({
          isDelivery: toDelivery,
          itemIds,
          deliveryAddress: toDelivery ? String(address).trim() : null,
          deliveryNotes: toDelivery ? String(notes || "").trim() || null : null,
          employeeId: getLoggedEmployeeId(),
          notes: toDelivery
            ? `Ubah ke Delivery (${scope === "all" ? "full nota" : `${itemIds.length} item`})`
            : `Ubah ke Ambil di Outlet (${scope === "all" ? "full nota" : `${itemIds.length} item`})`,
        }),
      });

      showToast?.("success", res.message || "Metode pengambilan diperbarui");
      onSuccess?.(res.data);
      onClose?.();
    } catch (err) {
      showToast?.("error", err.message || "Gagal mengubah metode pengambilan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Ubah Metode Pengambilan</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Nota {order.orderNo || order.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-500 hover:bg-slate-100"
            aria-label="Tutup"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("delivery")}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                mode === "delivery"
                  ? "border-orange-300 bg-orange-50 text-orange-800"
                  : "border-slate-200 bg-white text-slate-600"
              )}
            >
              <HiOutlineTruck className="h-4 w-4 mb-1" />
              <span className="text-[12px] font-bold block">Delivery</span>
              <span className="text-[10px] font-medium opacity-80">Diantar kurir</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("pickup")}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                mode === "pickup"
                  ? "border-[#5f1340]/30 bg-[#5f1340]/5 text-[#5f1340]"
                  : "border-slate-200 bg-white text-slate-600"
              )}
            >
              <HiOutlineArchiveBox className="h-4 w-4 mb-1" />
              <span className="text-[12px] font-bold block">Ambil di Outlet</span>
              <span className="text-[10px] font-medium opacity-80">Customer ambil sendiri</span>
            </button>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Cakupan
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={cn(
                  "flex-1 py-2 rounded-xl border text-[11px] font-bold",
                  scope === "all"
                    ? "bg-[#5f1340] text-white border-[#5f1340]"
                    : "bg-white text-slate-600 border-slate-200"
                )}
              >
                Satu Nota Full
              </button>
              <button
                type="button"
                onClick={() => setScope("selected")}
                className={cn(
                  "flex-1 py-2 rounded-xl border text-[11px] font-bold",
                  scope === "selected"
                    ? "bg-[#5f1340] text-white border-[#5f1340]"
                    : "bg-white text-slate-600 border-slate-200"
                )}
              >
                Beberapa Item
              </button>
            </div>
          </div>

          {scope === "selected" && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {activeItems.map((it) => {
                const checked = selectedIds.includes(it.id);
                const isDel = it.fulfillment_type === "Delivery_Kurir";
                return (
                  <label
                    key={it.id}
                    className="flex items-start gap-2.5 cursor-pointer bg-white border border-slate-200 rounded-xl px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(it.id)}
                      className="mt-0.5 accent-[#5f1340]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-[12px] font-bold text-slate-800 block truncate">
                        {it.service_name || "Item"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {it.item_work_status || "-"} · {isDel ? "Delivery" : "Ambil outlet"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {mode === "delivery" && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <HiOutlineMapPin className="h-3 w-3" /> Alamat Pengantaran
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="Alamat lengkap customer…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-medium text-slate-700 outline-none focus:border-[#5f1340]/40 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Catatan Delivery (opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: rumah cat hijau, belok kiri…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-medium text-slate-700 outline-none focus:border-[#5f1340]/40"
                />
              </div>
              <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                Item yang sudah <strong>Siap Diambil</strong> akan otomatis jadi{" "}
                <strong>Siap Diantar</strong> supaya muncul di tab Delivery mobile.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex gap-2 justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-[#5f1340] hover:bg-[#4d0f33] text-white text-xs font-bold disabled:opacity-60"
          >
            {submitting ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
