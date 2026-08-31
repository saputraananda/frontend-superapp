import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  HiOutlineArchiveBox,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineArrowsUpDown,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineClock,
  HiOutlineBuildingStorefront,
  HiOutlineChevronDown,
  HiOutlineClipboardDocumentList,
  HiOutlineCalendarDays,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
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

const EMPTY_ITEM = { id: null, code: "", name: "", unit_id: "2", description: "", is_active: 1 };
const EMPTY_ADJUST = { movementType: "In", qty: "", setQty: "", notes: "", employeeId: "" };
const EMPTY_OPENING = { qty_opening: "", period_start: "", min_stock: "" };

export default function InventoryPage() {
  const [searchParams] = useSearchParams();
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState(() => searchParams.get("outletId") || "");
  const [stock, setStock] = useState([]);
  const [summary, setSummary] = useState({ totalItems: 0, lowStockCount: 0, totalQty: 0 });
  const [employees, setEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(() => readLoggedInEmployee());
  const [units, setUnits] = useState([]);
  const [logs, setLogs] = useState([]);

  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [itemModal, setItemModal] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState(EMPTY_ADJUST);
  const [thresholdsModal, setThresholdsModal] = useState(null);
  const [thresholdsForm, setThresholdsForm] = useState({ min_stock: 0, par_stock: 0 });
  const [logsOpen, setLogsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openingModal, setOpeningModal] = useState(null);
  const [openingForm, setOpeningForm] = useState(EMPTY_OPENING);
  const [opnameOpen, setOpnameOpen] = useState(false);
  const [opnameDate, setOpnameDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [opnameLines, setOpnameLines] = useState([]);
  const [opnameEmployeeId, setOpnameEmployeeId] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadOutlets = useCallback(async () => {
    const res = await api("/waschen/outlets");
    const list = res.data || [];
    setOutlets(list);
    const fromUrl = searchParams.get("outletId");
    if (fromUrl && list.some((o) => String(o.id) === String(fromUrl))) {
      setOutletId(String(fromUrl));
    } else if (!outletId && list.length) {
      setOutletId(String(list[0].id));
    }
  }, [outletId, searchParams]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await api("/waschen/inventory/employees");
      setEmployees(res.data || []);
      if (res.current?.employee_id) {
        setCurrentEmployee(res.current);
      }
    } catch {
      setEmployees([]);
      const fallback = readLoggedInEmployee();
      if (fallback) setCurrentEmployee(fallback);
    }
  }, []);

  const loadUnits = useCallback(async () => {
    try {
      const res = await api("/waschen/units?isActive=1");
      setUnits(res.data || []);
    } catch {
      setUnits([]);
    }
  }, []);

  const loadStock = useCallback(async () => {
    if (!outletId) {
      setStock([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ outletId: String(outletId) });
      if (search) q.set("search", search);
      if (lowOnly) q.set("lowOnly", "1");
      const res = await api(`/waschen/inventory/stock?${q}`);
      setStock(res.data || []);
      setSummary(res.summary || { totalItems: 0, lowStockCount: 0, totalQty: 0 });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [outletId, search, lowOnly]);

  const loadLogs = useCallback(async () => {
    if (!outletId) return;
    try {
      const res = await api(`/waschen/inventory/logs?outletId=${outletId}&limit=40`);
      setLogs(res.data || []);
    } catch {
      setLogs([]);
    }
  }, [outletId]);

  useEffect(() => {
    loadOutlets();
    loadEmployees();
    loadUnits();
  }, [loadOutlets, loadEmployees, loadUnits]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const selectedOutlet = useMemo(
    () => outlets.find((o) => String(o.id) === String(outletId)),
    [outlets, outletId]
  );

  const employeeOptions = useMemo(() => {
    if (!currentEmployee?.employee_id) return employees;
    const exists = employees.some(
      (e) => Number(e.employee_id) === Number(currentEmployee.employee_id)
    );
    return exists ? employees : [currentEmployee, ...employees];
  }, [employees, currentEmployee]);

  const openCreateItem = () => {
    setItemForm(EMPTY_ITEM);
    setFormError("");
    setItemModal(true);
  };

  const openEditItem = (row) => {
    setItemForm({
      id: row.item_id,
      code: row.item_code || "",
      name: row.item_name || "",
      unit_id: String(row.item_unit_id || row.unit_id || "2"),
      description: row.item_description || "",
      is_active: 1,
    });
    setFormError("");
    setItemModal(true);
  };

  const submitItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      setFormError("Nama item wajib diisi");
      return;
    }
    if (!itemForm.unit_id) {
      setFormError("Satuan wajib dipilih");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        ...itemForm,
        unit_id: Number(itemForm.unit_id),
      };
      if (itemForm.id) {
        await api(`/waschen/inventory/items/${itemForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast("Item diperbarui");
      } else {
        await api("/waschen/inventory/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("Item katalog ditambahkan");
      }
      setItemModal(false);
      await loadStock();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjust = (row) => {
    setAdjustModal(row);
    setAdjustForm({
      ...EMPTY_ADJUST,
      movementType: "In",
      employeeId: currentEmployee?.employee_id ? String(currentEmployee.employee_id) : "",
    });
    setFormError("");
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    if (!adjustModal) return;
    setSubmitting(true);
    setFormError("");
    try {
      const body = {
        movementType: adjustForm.movementType,
        notes: adjustForm.notes || null,
        employeeId: adjustForm.employeeId ? Number(adjustForm.employeeId) : null,
      };
      if (adjustForm.movementType === "Adjust") {
        body.setQty = Number(adjustForm.setQty);
      } else {
        body.qty = Number(adjustForm.qty);
      }
      await api(`/waschen/inventory/stock/${adjustModal.id}/adjust`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      showToast("Stok diperbarui");
      setAdjustModal(null);
      loadStock();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openThresholds = (row) => {
    setThresholdsModal(row);
    setThresholdsForm({
      min_stock: Number(row.min_stock) || 0,
      par_stock: Number(row.par_stock) || 0,
    });
    setFormError("");
  };

  const submitThresholds = async (e) => {
    e.preventDefault();
    if (!thresholdsModal) return;
    setSubmitting(true);
    try {
      await api(`/waschen/inventory/stock/${thresholdsModal.id}`, {
        method: "PUT",
        body: JSON.stringify(thresholdsForm),
      });
      showToast("Min / Par stock diperbarui");
      setThresholdsModal(null);
      loadStock();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api(`/waschen/inventory/stock/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Item dinonaktifkan dari outlet");
      setDeleteTarget(null);
      loadStock();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openLogs = async () => {
    setLogsOpen(true);
    await loadLogs();
  };

  const openOpening = (row) => {
    setOpeningModal(row);
    setOpeningForm(EMPTY_OPENING);
    setFormError("");
  };

  const submitOpening = async (e) => {
    e.preventDefault();
    if (!openingModal) return;
    if (!String(openingForm.qty_opening).trim()) {
      setFormError("Stok awal wajib diisi");
      return;
    }
    if (!openingForm.period_start) {
      setFormError("Awal periode wajib diisi");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        qty_opening: Number(openingForm.qty_opening),
        period_start: openingForm.period_start,
      };
      if (String(openingForm.min_stock).trim() !== "") {
        payload.min_stock = Number(openingForm.min_stock);
      }
      await api(`/waschen/inventory/stock/${openingModal.id}/opening`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showToast("Stok awal periode disimpan");
      setOpeningModal(null);
      loadStock();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openOpname = async () => {
    if (!outletId) return;
    setOpnameOpen(true);
    setFormError("");
    setOpnameEmployeeId(
      currentEmployee?.employee_id ? String(currentEmployee.employee_id) : ""
    );
    try {
      const res = await api(
        `/waschen/inventory/opname/daily?outletId=${outletId}&usageDate=${opnameDate}`
      );
      const existing = Object.fromEntries(
        (res.data || []).map((r) => [r.item_id, r])
      );
      setOpnameLines(
        stock.map((row) => ({
          itemId: row.item_id,
          itemName: row.item_name,
          itemUnit: row.item_unit,
          qtyUsed: existing[row.item_id]?.qty_used ?? "",
          notes: existing[row.item_id]?.notes ?? "",
        }))
      );
    } catch {
      setOpnameLines(
        stock.map((row) => ({
          itemId: row.item_id,
          itemName: row.item_name,
          itemUnit: row.item_unit,
          qtyUsed: "",
          notes: "",
        }))
      );
    }
  };

  const reloadOpnameLines = async (date) => {
    if (!outletId) return;
    try {
      const res = await api(
        `/waschen/inventory/opname/daily?outletId=${outletId}&usageDate=${date}`
      );
      const existing = Object.fromEntries(
        (res.data || []).map((r) => [r.item_id, r])
      );
      setOpnameLines(
        stock.map((row) => ({
          itemId: row.item_id,
          itemName: row.item_name,
          itemUnit: row.item_unit,
          qtyUsed: existing[row.item_id]?.qty_used ?? "",
          notes: existing[row.item_id]?.notes ?? "",
        }))
      );
    } catch {
      /* keep current lines */
    }
  };

  const submitOpname = async (e) => {
    e.preventDefault();
    if (!outletId) return;
    setSubmitting(true);
    setFormError("");
    try {
      const lines = opnameLines
        .filter((l) => l.qtyUsed !== "" && Number(l.qtyUsed) >= 0)
        .map((l) => ({
          itemId: l.itemId,
          qtyUsed: Number(l.qtyUsed),
          notes: l.notes || null,
        }));
      if (!lines.length) {
        setFormError("Isi minimal 1 item dengan qty pemakaian");
        setSubmitting(false);
        return;
      }
      await api("/waschen/inventory/opname/daily", {
        method: "POST",
        body: JSON.stringify({
          outletId: Number(outletId),
          usageDate: opnameDate,
          employeeId: opnameEmployeeId ? Number(opnameEmployeeId) : null,
          lines,
        }),
      });
      showToast("Pemakaian harian tersimpan");
      setOpnameOpen(false);
      loadStock();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const varianceClass = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) return "text-slate-600";
    if (n > 0) return "text-amber-700 font-semibold";
    return "text-emerald-700 font-semibold";
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 max-w-[100rem] mx-auto">
      <PageHero>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Manajemen Inventory</h1>
          <p className="mt-1 text-sm text-white/75">
            Stok awal · pemakaian harian · selisih vs BOM layanan selesai
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openLogs}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
          >
            <HiOutlineClock className="h-4 w-4" />
            Riwayat
          </button>
          <button
            type="button"
            onClick={loadStock}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outlet</p>
          <p className="mt-1 text-sm font-bold text-slate-800 truncate">
            {selectedOutlet?.name || "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Item</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{summary.totalItems}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600/80">Di bawah Min</p>
          <p className="mt-1 text-xl font-bold text-rose-800">{summary.lowStockCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Qty</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{fmtQty(summary.totalQty)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative min-w-[180px]">
              <HiOutlineBuildingStorefront className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name || o.name} ({o.outlet_code})
                  </option>
                ))}
              </select>
              <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="relative flex-1 min-w-[160px]">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari item..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#5f1340] focus:ring-[#5f1340]"
              />
              Stok rendah saja
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openOpname}
              disabled={!outletId || !stock.length}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#5f1340] hover:bg-white/90 disabled:opacity-50"
            >
              <HiOutlineClipboardDocumentList className="h-4 w-4" />
              Pemakaian Harian
            </button>
            <button
              type="button"
              onClick={openCreateItem}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5f1340] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#4d0f33]"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Item Baru
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item</th>
                <th className="px-4 py-3 text-left font-semibold">Satuan</th>
                <th className="px-4 py-3 text-center font-semibold" title="Stok awal periode (admin)">
                  Stok Awal
                </th>
                <th className="px-4 py-3 text-center font-semibold">Min</th>
                <th className="px-4 py-3 text-center font-semibold" title="Dari transaksi selesai × BOM">
                  Seharusnya
                </th>
                <th className="px-4 py-3 text-center font-semibold" title="Input harian tim produksi">
                  Aktual
                </th>
                <th className="px-4 py-3 text-center font-semibold">Sisa</th>
                <th className="px-4 py-3 text-center font-semibold">Selisih</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="h-4 rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : stock.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                    <HiOutlineArchiveBox className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm font-semibold">Belum ada item di outlet ini</p>
                    <p className="mt-1 text-xs">Belum ada stok di outlet ini</p>
                  </td>
                </tr>
              ) : (
                stock.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{row.item_name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{row.item_code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.item_unit}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-800">
                      {fmtQty(row.qty_opening)}
                      {row.period_start ? (
                        <p className="text-[10px] font-normal text-slate-400">sejak {row.period_start}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{fmtQty(row.min_stock)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{fmtQty(row.qty_expected)}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{fmtQty(row.qty_actual)}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{fmtQty(row.qty_remaining ?? row.qty_current)}</td>
                    <td className={cn("px-4 py-3 text-center", varianceClass(row.qty_variance))}>
                      {Number(row.qty_variance) > 0 ? "+" : ""}
                      {fmtQty(row.qty_variance)}
                    </td>
                    <td className="px-4 py-3">
                      {Number(row.is_low_stock) === 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          <HiOutlineExclamationTriangle className="h-3 w-3" />
                          Low
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Set stok awal periode"
                          onClick={() => openOpening(row)}
                          className="rounded-lg p-1.5 text-indigo-700 hover:bg-indigo-50"
                        >
                          <HiOutlineCalendarDays className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Sesuaikan stok (restock)"
                          onClick={() => openAdjust(row)}
                          className="rounded-lg p-1.5 text-[#5f1340] hover:bg-[#5f1340]/10"
                        >
                          <HiOutlineArrowsUpDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Min / Par stock"
                          onClick={() => openThresholds(row)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit item katalog"
                          onClick={() => openEditItem(row)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Lepas dari outlet"
                          onClick={() => setDeleteTarget(row)}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        >
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
      </section>

      {/* Modal: Item katalog */}
      {itemModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setItemModal(false)}>
            <form
              onSubmit={submitItem}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  {itemForm.id ? "Edit Item Katalog" : "Item Katalog Baru"}
                </h3>
                <button type="button" onClick={() => setItemModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <input
                placeholder="Kode (opsional, auto jika kosong)"
                value={itemForm.code}
                onChange={(e) => setItemForm((p) => ({ ...p, code: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Nama item"
                value={itemForm.name}
                onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                required
                value={itemForm.unit_id}
                onChange={(e) => setItemForm((p) => ({ ...p, unit_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Pilih satuan...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.symbol || u.name}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Deskripsi"
                value={itemForm.description}
                onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={2}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#5f1340] py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Simpan"}
              </button>
            </form>
          </div>,
          document.body
        )}

      {/* Modal: Adjust */}
      {adjustModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setAdjustModal(null)}>
            <form
              onSubmit={submitAdjust}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Sesuaikan Stok</h3>
                  <p className="text-xs text-slate-500">
                    {adjustModal.item_name} · sekarang {fmtQty(adjustModal.qty_current)} {adjustModal.item_unit}
                  </p>
                </div>
                <button type="button" onClick={() => setAdjustModal(null)} className="p-1 text-slate-400">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50">
                {[
                  { id: "In", label: "Tambah (+)" },
                  { id: "Out", label: "Kurangi (−)" },
                  { id: "Adjust", label: "Set angka" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAdjustForm((p) => ({ ...p, movementType: t.id }))}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-[11px] font-bold",
                      adjustForm.movementType === t.id ? "bg-white text-[#5f1340] shadow-sm" : "text-slate-500"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {adjustForm.movementType === "Adjust" ? (
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qty akhir"
                  value={adjustForm.setQty}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, setQty: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              ) : (
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Jumlah"
                  value={adjustForm.qty}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, qty: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              )}
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Petugas
                <select
                  value={adjustForm.employeeId}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, employeeId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <option value="">— Pilih petugas —</option>
                  {employeeOptions.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.full_name}
                      {e.company_name ? ` · ${e.company_name}` : ""}
                    </option>
                  ))}
                </select>
                {currentEmployee?.full_name && (
                  <span className="mt-1 block text-[11px] font-normal normal-case text-slate-500">
                    Default: {currentEmployee.full_name}
                  </span>
                )}
              </label>
              <textarea
                placeholder="Catatan"
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={2}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#5f1340] py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {submitting ? "Memproses..." : "Simpan Perubahan"}
              </button>
            </form>
          </div>,
          document.body
        )}

      {/* Modal: Thresholds */}
      {thresholdsModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setThresholdsModal(null)}>
            <form
              onSubmit={submitThresholds}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3"
            >
              <h3 className="text-sm font-bold text-slate-800">Min / Par — {thresholdsModal.item_name}</h3>
              <p className="text-[11px] text-slate-500">Nilai ini khusus outlet {selectedOutlet?.name}</p>
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Min stock
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={thresholdsForm.min_stock}
                  onChange={(e) => setThresholdsForm((p) => ({ ...p, min_stock: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Par stock
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={thresholdsForm.par_stock}
                  onChange={(e) => setThresholdsForm((p) => ({ ...p, par_stock: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#5f1340] py-2.5 text-xs font-bold text-white">
                Simpan
              </button>
            </form>
          </div>,
          document.body
        )}

      {/* Modal: Opening stock */}
      {openingModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpeningModal(null)}>
            <form
              onSubmit={submitOpening}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Stok Awal Periode</h3>
                  <p className="text-xs text-slate-500">{openingModal.item_name}</p>
                </div>
                <button type="button" onClick={() => setOpeningModal(null)} className="p-1 text-slate-400">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <p className="text-[11px] text-slate-500 rounded-lg bg-slate-50 px-3 py-2">
                Set stok fisik saat mulai periode. Sisa = Stok Awal − Pemakaian Aktual. Seharusnya dihitung otomatis dari BOM × transaksi selesai.
              </p>
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Stok awal
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingForm.qty_opening}
                  onChange={(e) => setOpeningForm((p) => ({ ...p, qty_opening: e.target.value }))}
                  placeholder="Contoh: 10"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Awal periode
                <input
                  required
                  type="date"
                  value={openingForm.period_start}
                  onChange={(e) => setOpeningForm((p) => ({ ...p, period_start: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Min stock
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingForm.min_stock}
                  onChange={(e) => setOpeningForm((p) => ({ ...p, min_stock: e.target.value }))}
                  placeholder="Opsional"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                />
              </label>
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#5f1340] py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {submitting ? "Menyimpan..." : "Simpan Stok Awal"}
              </button>
            </form>
          </div>,
          document.body
        )}

      {/* Modal: Daily opname */}
      {opnameOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpnameOpen(false)}>
            <form
              onSubmit={submitOpname}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Input Pemakaian Harian</h3>
                  <p className="text-xs text-slate-500">{selectedOutlet?.name}</p>
                </div>
                <button type="button" onClick={() => setOpnameOpen(false)} className="p-1 text-slate-400">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-end">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Tanggal
                  <input
                    type="date"
                    value={opnameDate}
                    onChange={(e) => {
                      setOpnameDate(e.target.value);
                      reloadOpnameLines(e.target.value);
                    }}
                    className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex-1 min-w-[180px] text-[10px] font-bold uppercase text-slate-400">
                  Petugas
                  <select
                    value={opnameEmployeeId}
                    onChange={(e) => setOpnameEmployeeId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    <option value="">— Pilih petugas —</option>
                    {employeeOptions.map((e) => (
                      <option key={e.employee_id} value={e.employee_id}>
                        {e.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {formError && <p className="px-5 pt-2 text-xs text-rose-600">{formError}</p>}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                <table className="min-w-full text-xs">
                  <thead className="text-[10px] uppercase text-slate-400">
                    <tr>
                      <th className="py-2 text-left font-semibold">Item</th>
                      <th className="py-2 text-right font-semibold w-28">Qty pakai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {opnameLines.map((line, idx) => (
                      <tr key={line.itemId}>
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-slate-800">{line.itemName}</p>
                          <p className="text-[10px] text-slate-400">{line.itemUnit}</p>
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={line.qtyUsed}
                            onChange={(e) =>
                              setOpnameLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, qtyUsed: e.target.value } : l))
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-5 py-4">
                <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#5f1340] py-2.5 text-xs font-bold text-white disabled:opacity-50">
                  {submitting ? "Menyimpan..." : "Simpan Pemakaian Harian"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Modal: Delete */}
      {deleteTarget &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setDeleteTarget(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Lepas item dari outlet?</h3>
              <p className="text-xs text-slate-500">
                {deleteTarget.item_name} tidak akan muncul di stok outlet ini (riwayat tetap tersimpan).
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold">
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmRemove}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white"
                >
                  Lepas
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Drawer: Logs */}
      {logsOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40" onClick={() => setLogsOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Riwayat Stok</h3>
                  <p className="text-[11px] text-slate-500">{selectedOutlet?.name}</p>
                </div>
                <button type="button" onClick={() => setLogsOpen(false)} className="p-1 text-slate-400">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {logs.length === 0 ? (
                  <p className="py-12 text-center text-xs text-slate-400">Belum ada riwayat</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{log.item_name}</p>
                          <p className="text-[10px] text-slate-500">{fmtDate(log.created_at)}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
                            log.movement_type === "In"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : log.movement_type === "Out"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-slate-200 bg-white text-slate-600"
                          )}
                        >
                          {log.movement_type} {fmtQty(log.qty)}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {fmtQty(log.qty_before)} → {fmtQty(log.qty_after)}
                        {log.employee_name ? ` · ${log.employee_name}` : ""}
                      </p>
                      {log.notes ? <p className="mt-0.5 text-[10px] text-slate-400">{log.notes}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
