import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineArrowPath, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineSparkles, HiOutlineTrash, HiOutlineUserGroup, HiOutlineXMark } from "react-icons/hi2";
import ConfirmDialog from "../../../../../components/ConfirmDialog";
import { api } from "../../../../../lib/api";
import { fmtNum, inputCls, yearOptions } from "./targetUtils";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

/** Tab Target Customer (per tahun) di Master Outlet. Tahun kosong otomatis ikut tahun sebelumnya. */
export default function TargetCustomerTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { tahun, jumlah, editing }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteRow, setDeleteRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/waschen/targets/customer");
      setRows(res.data || []);
      setCurrent(res.meta?.current || null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const thisYear = new Date().getFullYear();

  const openForm = (row) => {
    setFormError("");
    setModal(row ? { tahun: String(row.tahun), jumlah: String(row.jumlah), editing: !row.is_auto } : { tahun: String(thisYear + (rows.some((r) => r.tahun === thisYear && !r.is_auto) ? 1 : 0)), jumlah: "", editing: false });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!modal.tahun || modal.jumlah === "" || Number(modal.jumlah) < 0 || Number.isNaN(Number(modal.jumlah))) {
      setFormError("Tahun dan jumlah wajib diisi dengan benar");
      return;
    }
    setSaving(true);
    try {
      const res = await api("/waschen/targets/customer", { method: "POST", body: JSON.stringify({ tahun: Number(modal.tahun), jumlah: Number(modal.jumlah) }) });
      showToast(res.message || "Target customer disimpan");
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteRow) return;
    try {
      await api(`/waschen/targets/customer/${deleteRow.id}`, { method: "DELETE" });
      showToast(`Target customer ${deleteRow.tahun} dihapus`);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleteRow(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Target customer {thisYear}</p>
          <p className="mt-0.5 text-2xl font-bold text-[#5f1340] tabular-nums">{current ? `${fmtNum(current.jumlah)} customer` : "Belum ada"}</p>
          {current?.is_auto && <p className="mt-0.5 text-[11px] font-semibold text-amber-700">Otomatis mengikuti target {current.source_tahun}</p>}
        </div>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#5f1340]/30 bg-white p-4 text-xs font-bold text-[#5f1340] shadow-sm transition hover:bg-[#5f1340]/5"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tambah Target Customer
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <p className="text-xs font-bold text-slate-700">Target per tahun</p>
          <button type="button" onClick={load} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Muat ulang">
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
        {loading && !rows.length ? (
          <div className="space-y-2 p-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <HiOutlineUserGroup className="h-10 w-10 text-slate-300" />
            <p className="text-xs text-slate-400">Belum ada target customer</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={`${r.tahun}-${r.is_auto ? "auto" : r.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className={cn("flex h-10 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-black tabular-nums", r.is_auto ? "bg-amber-50 text-amber-700" : "bg-[#5f1340]/10 text-[#5f1340]")}>
                  {r.tahun}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-bold tabular-nums", r.is_auto ? "text-slate-500" : "text-slate-900")}>{fmtNum(r.jumlah)} customer</p>
                  {r.is_auto ? (
                    <p className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700">
                      <HiOutlineSparkles className="h-3 w-3" />
                      Otomatis · mengikuti target {r.source_tahun}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Diset{r.tahun === thisYear ? " · tahun berjalan" : ""}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openForm(r)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-[#5f1340]/30 hover:text-[#5f1340]"
                    title={r.is_auto ? "Tetapkan target tahun ini" : "Ubah"}
                  >
                    <HiOutlinePencilSquare className="h-4 w-4" />
                  </button>
                  {!r.is_auto && (
                    <button type="button" onClick={() => setDeleteRow(r)} className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600" title="Hapus">
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal &&
        createPortal(
          <div data-modal-root className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => !saving && setModal(null)}>
            <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{modal.editing ? "Ubah Target Customer" : "Tetapkan Target Customer"}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">Target jumlah customer dalam satu tahun</p>
                </div>
                <button type="button" onClick={() => setModal(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                {formError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tahun</span>
                  <select className={inputCls} value={modal.tahun} onChange={(e) => setModal((m) => ({ ...m, tahun: e.target.value }))}>
                    {yearOptions([modal.tahun]).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jumlah customer</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className={inputCls}
                    value={modal.jumlah}
                    onChange={(e) => setModal((m) => ({ ...m, jumlah: e.target.value }))}
                    placeholder="Contoh: 6600"
                    autoFocus
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
                <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-[#5f1340] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Hapus target customer?"
        message={deleteRow ? `Target tahun ${deleteRow.tahun} dihapus. Tahun itu akan otomatis mengikuti target tahun sebelumnya.` : ""}
        onConfirm={remove}
        onCancel={() => setDeleteRow(null)}
      />
    </div>
  );
}
