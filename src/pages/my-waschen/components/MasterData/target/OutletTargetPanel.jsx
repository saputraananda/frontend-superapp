import { useCallback, useEffect, useState } from "react";
import { HiOutlineArrowPath, HiOutlinePencilSquare, HiOutlineSparkles, HiOutlineTrash } from "react-icons/hi2";
import { api } from "../../../../../lib/api";
import TargetActualChart from "./TargetActualChart";
import { BULAN, fmtRupiah, fmtRupiahInput, inputCls, periodLabel, periodShort, toDigits, yearOptions } from "./targetUtils";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const pctOf = (actual, target) => (target ? Math.round(((Number(actual) || 0) / target) * 100) : null);

/**
 * Isi tab "Target Sales" di modal outlet: grafik aktual vs target, form tambah/ubah target
 * (default bulan berikutnya), dan riwayat. Bulan tanpa target = "Otomatis" (ikut bulan sebelumnya).
 */
export default function OutletTargetPanel({ outlet, onSaved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ tahun: "", bulan: "", nominal: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(
    async (resetForm = false) => {
      setLoading(true);
      setError("");
      try {
        const res = await api(`/waschen/targets/sales/outlet/${outlet.id}`);
        setData(res.data);
        if (resetForm) {
          const s = res.data?.suggestion || {};
          setForm({ tahun: String(s.tahun || ""), bulan: String(s.bulan || ""), nominal: s.nominal != null ? String(s.nominal) : "" });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [outlet.id],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const history = data?.history || [];
  const chart = data?.chart || [];
  const meta = data?.chart_meta || {};
  const billing = data?.billing;
  const isBilling = (r) => billing && r.tahun === billing.tahun && r.bulan === billing.bulan;
  const rowFor = (tahun, bulan) => history.find((r) => r.tahun === Number(tahun) && r.bulan === Number(bulan));
  const selected = form.tahun && form.bulan ? rowFor(form.tahun, form.bulan) : null;

  const current = chart.find((c) => c.is_current);
  const lastFull = [...chart].reverse().find((c) => !c.is_current && c.target);
  const pctCurrent = current ? pctOf(current.actual, current.target) : null;
  const pctLast = lastFull ? pctOf(lastFull.actual, lastFull.target) : null;

  const pickPeriod = (tahun, bulan) => {
    const r = rowFor(tahun, bulan);
    setForm({ tahun: String(tahun), bulan: String(bulan), nominal: r ? String(r.nominal) : form.nominal });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.tahun || !form.bulan || form.nominal === "" || Number(form.nominal) < 0 || Number.isNaN(Number(form.nominal))) {
      setError("Periode dan nominal target wajib diisi dengan benar");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api("/waschen/targets/sales", {
        method: "POST",
        body: JSON.stringify({ outlet_id: outlet.id, tahun: Number(form.tahun), bulan: Number(form.bulan), nominal: Number(form.nominal) }),
      });
      setNotice(`${res.message || "Target disimpan"} · ${periodLabel(form.tahun, form.bulan)}`);
      await load(true);
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    setDeletingId(row.id);
    setError("");
    try {
      const res = await api(`/waschen/targets/sales/${row.id}`, { method: "DELETE" });
      setNotice(res.message || "Target dihapus");
      setConfirmId(null);
      await load(false);
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Grafik aktual vs target */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Aktual vs Target · 12 bulan</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{meta.actual_note || "Aktual dari perhitungan Sales"}</p>
          </div>
          {meta.has_actual && (
            <div className="flex gap-2 text-right">
              {lastFull && (
                <div className="rounded-xl bg-slate-50 px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-slate-400">{periodShort(lastFull.tahun, lastFull.bulan)}</p>
                  <p className="text-sm font-bold tabular-nums text-slate-800">{pctLast != null ? `${pctLast}%` : "—"}</p>
                </div>
              )}
              {current && (
                <div className="rounded-xl bg-[#5f1340]/5 px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-[#5f1340]/70">{periodShort(current.tahun, current.bulan)} (berjalan)</p>
                  <p className="text-sm font-bold tabular-nums text-[#5f1340]">{pctCurrent != null ? `${pctCurrent}%` : "—"}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {loading && !chart.length ? (
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        ) : chart.some((c) => c.target != null || c.actual) ? (
          <TargetActualChart data={chart} hasActual={meta.has_actual} asOf={meta.as_of} />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-10 text-center text-xs text-slate-400">Belum ada target maupun data penjualan untuk ditampilkan.</p>
        )}
        {meta.actual_error && <p className="mt-2 text-[11px] text-rose-600">Data aktual gagal dimuat: {meta.actual_error}</p>}
      </section>

      {/* Form */}
      <form onSubmit={save} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tambah / ubah target</p>
          {selected && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", selected.is_auto ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
              {selected.is_auto ? "Saat ini otomatis — simpan untuk menetapkan" : "Sudah diset — simpan untuk mengubah"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
          <select className={inputCls} value={form.bulan} onChange={(e) => pickPeriod(form.tahun, e.target.value)} aria-label="Bulan">
            {BULAN.map((b, i) => (
              <option key={b} value={i + 1}>
                {b}
              </option>
            ))}
          </select>
          <select className={inputCls} value={form.tahun} onChange={(e) => pickPeriod(e.target.value, form.bulan)} aria-label="Tahun">
            {yearOptions([form.tahun]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            className={cn(inputCls, "col-span-2 tabular-nums sm:col-span-1")}
            value={fmtRupiahInput(form.nominal)}
            onChange={(e) => setForm((f) => ({ ...f, nominal: toDigits(e.target.value) }))}
            placeholder="Rp 0"
            aria-label="Nominal target (Rupiah)"
          />
          <button
            type="submit"
            disabled={saving || loading}
            className="col-span-2 inline-flex items-center justify-center rounded-xl bg-[#5f1340] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#4d0f33] disabled:opacity-60 sm:col-span-1"
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Target untuk {form.tahun && form.bulan ? periodLabel(form.tahun, form.bulan) : "periode terpilih"}. Bulan yang belum diset otomatis mengikuti target bulan sebelumnya.
        </p>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        {notice && !error && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}
      </form>

      {/* Riwayat (juga berfungsi sebagai tabel data grafik) */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Riwayat target</p>
          <button type="button" onClick={() => load(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Muat ulang">
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
        {loading && !history.length ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">Outlet ini belum punya target. Isi form di atas untuk mulai.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {history.map((r) => {
              const active = String(r.tahun) === form.tahun && String(r.bulan) === form.bulan;
              const p = r.actual != null ? pctOf(r.actual, r.nominal) : null;
              return (
                <li key={`${r.tahun}-${r.bulan}`} className={cn("flex items-center gap-3 px-3 py-2.5", active && "bg-[#5f1340]/[0.04]")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800">{periodLabel(r.tahun, r.bulan)}</span>
                      {isBilling(r) && <span className="rounded-full bg-[#5f1340]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#5f1340]">Bulan berjalan</span>}
                      {r.is_auto && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700" title="Belum diset — mengikuti target bulan sebelumnya">
                          <HiOutlineSparkles className="h-3 w-3" />
                          Otomatis · ikut {periodShort(r.source_tahun, r.source_bulan)}
                        </span>
                      )}
                    </div>
                    {r.actual != null && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Aktual {fmtRupiah(r.actual)}
                        {p != null && <span className="font-semibold text-slate-600"> · {p}%</span>}
                      </p>
                    )}
                  </div>
                  <span className={cn("shrink-0 text-xs font-bold tabular-nums", r.is_auto ? "text-slate-500" : "text-slate-900")}>{fmtRupiah(r.nominal)}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setForm({ tahun: String(r.tahun), bulan: String(r.bulan), nominal: String(r.nominal) })}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-[#5f1340]/30 hover:text-[#5f1340]"
                      title={r.is_auto ? "Tetapkan target bulan ini" : "Ubah target"}
                    >
                      <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                    </button>
                    {!r.is_auto &&
                      (confirmId === r.id ? (
                        <button type="button" disabled={deletingId === r.id} onClick={() => remove(r)} className="rounded-lg bg-rose-600 px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-60">
                          {deletingId === r.id ? "…" : "Yakin hapus?"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus (bulan ini kembali otomatis)"
                        >
                          <HiOutlineTrash className="h-3.5 w-3.5" />
                        </button>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
