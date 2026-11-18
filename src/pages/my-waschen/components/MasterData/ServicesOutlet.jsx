import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineClock,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const rupiah = (val) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val) || 0);

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const isSet = (v) => v !== null && v !== undefined && v !== "";
const isCustom = (r) =>
  [r.override_name, r.override_category_id, r.override_unit_id, r.override_unit, r.override_price,
    r.override_duration_days, r.override_min_order_qty, r.override_dc_price_add].some(isSet);
const available = (r) => Number(r.outlet_active) === 1;

/** Input rupiah dengan pemisah ribuan; nilai disimpan sebagai string angka ("" = kosong). */
function RupiahInput({ value, onChange, placeholder }) {
  const shown = value === "" || value == null ? "" : Number(value).toLocaleString("id-ID");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={shown}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]"
      />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1 block font-semibold text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

/** Nilai di outlet: ditandai jika berbeda dari master. */
function Val({ custom, children, master }) {
  return (
    <div>
      <span className={cn(custom && "rounded bg-amber-50 px-1.5 py-0.5 font-bold text-amber-800")}>{children}</span>
      {custom && <span className="mt-0.5 block text-[10px] text-slate-400 line-through">{master}</span>}
    </div>
  );
}

export default function ServicesOutlet({ outlet, categories, units, showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterAvail, setFilterAvail] = useState("1");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api(`/waschen/services/outlets/${outlet.id}`);
      setRows(res.data || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setSearch("");
    setFilterCategoryId("");
    setFilterAvail("1");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterAvail === "1" && !available(r)) return false;
      if (filterAvail === "0" && available(r)) return false;
      if (filterAvail === "custom" && !(available(r) && isCustom(r))) return false;
      if (filterCategoryId && String(r.category_id) !== String(filterCategoryId)) return false;
      if (q && !`${r.code} ${r.name} ${r.master_name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, filterCategoryId, filterAvail]);

  const stats = useMemo(() => {
    const avail = rows.filter(available);
    return { total: rows.length, available: avail.length, custom: avail.filter(isCustom).length };
  }, [rows]);

  const openEdit = (r) => {
    setFormError("");
    setEdit(r);
    setForm({
      is_active: available(r) ? 1 : 0,
      name: r.override_name ?? "",
      category_id: r.override_category_id ?? "",
      unit_id: r.override_unit_id ?? "",
      unit: r.override_unit ?? "",
      price: isSet(r.override_price) ? String(Math.round(Number(r.override_price))) : "",
      regular_duration_days: isSet(r.override_duration_days) ? String(Number(r.override_duration_days)) : "",
      min_order_qty: isSet(r.override_min_order_qty) ? String(Number(r.override_min_order_qty)) : "",
      dc_price_add: isSet(r.override_dc_price_add) ? String(Math.round(Number(r.override_dc_price_add))) : "",
    });
  };

  const resetToMaster = () =>
    setForm((f) => ({ ...f, name: "", category_id: "", unit_id: "", unit: "", price: "", regular_duration_days: "", min_order_qty: "", dc_price_add: "" }));

  const saveEdit = async (e) => {
    e.preventDefault();
    if (isSet(form.min_order_qty) && Number(form.min_order_qty) <= 0) {
      setFormError("Min. order harus lebih dari 0, atau kosongkan untuk ikut master");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await api(`/waschen/services/${edit.id}/outlets/${outlet.id}`, { method: "PUT", body: JSON.stringify(form) });
      showToast("Layanan outlet berhasil disimpan");
      setEdit(null);
      await load(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onUnitChange = (uId) => {
    const u = units.find((x) => String(x.id) === String(uId));
    setForm((f) => ({ ...f, unit_id: uId, unit: uId ? u?.symbol || u?.code || "" : "" }));
  };

  const isDropPoint = Number(outlet.is_drop_point) === 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tersedia di {outlet.name}</p>
          <p className="mt-0.5 text-2xl font-bold text-emerald-600">
            {stats.available}
            <span className="text-sm font-semibold text-slate-400"> / {stats.total} master</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nilai Custom Outlet</p>
          <p className="mt-0.5 text-2xl font-bold text-amber-600">{stats.custom}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[11px] leading-relaxed text-slate-500 shadow-sm">
          {isDropPoint && (
            <span className="mb-1 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">Drop Point</span>
          )}
          <p>
            Hanya layanan <b>tersedia</b> yang muncul di POS outlet ini. Kolom yang dikosongkan saat edit akan{" "}
            <b>ikut master</b>. Nilai custom ditandai kuning.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 p-4 lg:flex-row">
          <div className="relative w-full lg:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode, nama layanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340] focus:ring-1 focus:ring-[#5f1340]"
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-[#5f1340]"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterAvail}
              onChange={(e) => setFilterAvail(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-[#5f1340]"
            >
              <option value="1">Tersedia di outlet</option>
              <option value="0">Tidak tersedia</option>
              <option value="custom">Tersedia &amp; custom</option>
              <option value="">Semua master</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3 font-semibold uppercase tracking-wider">No</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Nama Layanan</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Satuan</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Tarif</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Durasi</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Min</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">Memuat layanan outlet...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">Tidak ada layanan untuk filter ini</td>
                </tr>
              ) : (
                filtered.map((r, idx) => {
                  const on = available(r);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openEdit(r)}
                      className={cn("cursor-pointer transition-colors hover:bg-slate-50/80", !on && "bg-slate-50/60 text-slate-400")}
                    >
                      <td className="px-4 py-3 font-medium tabular-nums text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <Val custom={isSet(r.override_name)} master={r.master_name}>
                          <span className={cn("font-semibold", on ? "text-slate-800" : "text-slate-400")}>{r.name}</span>
                        </Val>
                        <span className="font-mono text-[10px] text-slate-400">{r.code}</span>
                        {!on && <span className="ml-1.5 text-[10px] italic text-slate-400">· tidak tersedia di outlet ini</span>}
                        {Number(r.master_active) !== 1 && (
                          <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            Master nonaktif
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Val custom={isSet(r.override_category_id)} master={r.master_category_name}>{r.category_name || "-"}</Val>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Val custom={isSet(r.override_unit) || isSet(r.override_unit_id)} master={r.master_unit}>{r.unit || "-"}</Val>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#5f1340]">
                        <Val custom={isSet(r.override_price)} master={rupiah(r.master_price)}>{rupiah(r.price)}</Val>
                        {Number(r.is_dc_required) !== 1 && Number(r.dc_price_add) > 0 && (
                          <span className="block text-[10px] font-semibold text-amber-800">+{rupiah(r.dc_price_add)} jika DC</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Val custom={isSet(r.override_duration_days)} master={`${num(r.master_duration_days)} Hari`}>
                          <span className="inline-flex items-center gap-1">
                            <HiOutlineClock className="h-3.5 w-3.5 text-slate-400" />
                            {num(r.regular_duration_days)} Hari
                          </span>
                        </Val>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums">
                        <Val custom={isSet(r.override_min_order_qty)} master={num(r.master_min_order_qty)}>{num(r.min_order_qty)}</Val>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                          title="Atur layanan di outlet ini"
                        >
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Layanan di {outlet.name}</h3>
                <p className="text-[11px] text-slate-500">
                  {edit.master_name} · <span className="font-mono">{edit.code}</span>
                </p>
              </div>
              <button type="button" onClick={() => setEdit(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveEdit} className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <span>
                  <span className="block font-semibold text-slate-800">Tersedia di {outlet.name}</span>
                  <span className="text-[11px] text-slate-500">Jika dimatikan, layanan tidak muncul di POS outlet ini.</span>
                </span>
                <input
                  type="checkbox"
                  checked={Number(form.is_active) === 1}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
                  className="h-5 w-5 accent-[#5f1340]"
                />
              </label>

              <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                <span>Kosongkan kolom untuk <b>ikut master</b>. Nilai master tampil sebagai placeholder.</span>
                <button type="button" onClick={resetToMaster} className="shrink-0 font-bold underline hover:no-underline">
                  Reset semua ke master
                </button>
              </div>

              <Field label="Nama Layanan di Outlet">
                <input
                  type="text"
                  value={form.name}
                  placeholder={edit.master_name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Kategori">
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  >
                    <option value="">Ikut master ({edit.master_category_name || "-"})</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Master Satuan">
                  <select
                    value={form.unit_id}
                    onChange={(e) => onUnitChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  >
                    <option value="">Ikut master ({edit.master_unit || "-"})</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Teks Satuan">
                  <input
                    type="text"
                    value={form.unit}
                    placeholder={edit.master_unit || "Kg"}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Tarif (Rp)">
                  <RupiahInput
                    value={form.price}
                    placeholder={Number(edit.master_price || 0).toLocaleString("id-ID")}
                    onChange={(v) => setForm((f) => ({ ...f, price: v }))}
                  />
                </Field>
                <Field label="Durasi Reguler (Hari)">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.regular_duration_days}
                    placeholder={String(num(edit.master_duration_days) ?? 2)}
                    onChange={(e) => setForm((f) => ({ ...f, regular_duration_days: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  />
                </Field>
                <Field label="Min. Order Qty">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.min_order_qty}
                    placeholder={String(num(edit.master_min_order_qty) ?? 1)}
                    onChange={(e) => setForm((f) => ({ ...f, min_order_qty: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  />
                </Field>
              </div>

              {Number(edit.is_dc_required) !== 1 && (
                <Field label="Tambahan harga jika DC (Rp)" hint="Kosong = ikut master. Isi 0 = tanpa tambahan DC di outlet ini.">
                  <RupiahInput
                    value={form.dc_price_add}
                    placeholder={Number(edit.master_dc_price_add) > 0 ? Number(edit.master_dc_price_add).toLocaleString("id-ID") : "Ikut master (tanpa tambahan)"}
                    onChange={(v) => setForm((f) => ({ ...f, dc_price_add: v }))}
                  />
                </Field>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#5f1340]/20 hover:opacity-95 disabled:opacity-50"
                >
                  {busy && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                  <span>{busy ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
