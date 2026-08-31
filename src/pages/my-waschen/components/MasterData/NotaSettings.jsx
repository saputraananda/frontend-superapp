import { useCallback, useEffect, useState } from "react";
import {
  HiOutlinePrinter,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineLink,
  HiOutlineLinkSlash,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";
import ThermalNotaBody from "../Transaction/ThermalNotaBody";
import { useThermalPrinter } from "../../context/ThermalPrinterContext";
import {
  DEFAULT_CUSTOMER_SETTINGS,
  DEFAULT_INTERNAL_SETTINGS,
  fetchLatestReceiptFromDb,
  fetchPrinterSettings,
  savePrinterSettings,
} from "../../utils/printerSettings.js";
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 hover:border-slate-200 transition">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5f1340]/40",
          checked ? "bg-[#5f1340]" : "bg-slate-300"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export default function NotaSettings() {
  const {
    supported,
    connected,
    connecting,
    printing,
    lastError: printerError,
    connect,
    disconnect,
    printNota,
  } = useThermalPrinter();

  const [outlets, setOutlets] = useState([]);  const [outletId, setOutletId] = useState(0);
  const [activeTab, setActiveTab] = useState("customer");
  const [fieldLabels, setFieldLabels] = useState([]);
  const [customer, setCustomer] = useState(DEFAULT_CUSTOMER_SETTINGS);
  const [internal, setInternal] = useState(DEFAULT_INTERNAL_SETTINGS);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [toast, setToast] = useState(null);
  const activeSettings = activeTab === "internal" ? internal : customer;
  const setActiveSettings = activeTab === "internal" ? setInternal : setCustomer;

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadOutlets = useCallback(async () => {
    const res = await api("/waschen/outlets");
    setOutlets(res.data || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await loadOutlets();
      const settingsData = await fetchPrinterSettings(outletId);
      setCustomer({ ...DEFAULT_CUSTOMER_SETTINGS, ...settingsData.customer });
      setInternal({ ...DEFAULT_INTERNAL_SETTINGS, ...settingsData.internal });
      setFieldLabels(settingsData.fieldLabels || FIELD_LABELS);

      const receipt = await fetchLatestReceiptFromDb(outletId || null);
      setPreviewReceipt(receipt);
    } catch (err) {
      showToast("error", err.message || "Gagal memuat konfigurasi nota");
    } finally {
      setLoading(false);
    }
  }, [outletId, loadOutlets]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleToggle = (key, value) => {
    setActiveSettings((prev) => ({ ...prev, [key]: value ? 1 : 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePrinterSettings(outletId, customer, internal);
      showToast("success", "Pengaturan nota berhasil disimpan");
    } catch (err) {
      showToast("error", err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleResetTab = () => {
    if (activeTab === "internal") {
      setInternal({ ...DEFAULT_INTERNAL_SETTINGS });
    } else {
      setCustomer({ ...DEFAULT_CUSTOMER_SETTINGS });
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
      showToast("success", "Printer thermal terhubung");
    } catch (err) {
      showToast("error", err.message || "Gagal menghubungkan printer");
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    showToast("success", "Printer thermal diputus");
  };

  const handleTestPrint = async () => {
    if (!previewReceipt) {
      showToast("error", "Belum ada transaksi untuk test print");
      return;
    }
    if (!connected) {
      showToast("error", "Hubungkan printer thermal terlebih dahulu");
      return;
    }
    setTestPrinting(true);
    try {
      await printNota(previewReceipt, activeSettings, activeTab);
      showToast(
        "success",
        `Test print nota ${activeTab === "internal" ? "Internal" : "Customer"} berhasil dikirim`
      );
    } catch (err) {
      showToast("error", err.message || "Gagal test print");
    } finally {
      setTestPrinting(false);
    }
  };

  return (    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 max-w-[100rem] mx-auto">
      <PageHero>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Konfigurasi Nota</h1>
          <p className="mt-1 text-sm text-white/75">
            Atur tampilan nota thermal internal & customer per outlet · preview live
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
        >
          <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <section className="xl:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outlet</span>
              <select
                value={outletId}
                onChange={(e) => setOutletId(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value={0}>Default Global (semua outlet)</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name || o.name} ({o.outlet_code})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50">
              {[
                { id: "customer", label: "Nota Customer" },
                { id: "internal", label: "Nota Internal" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-bold transition",
                    activeTab === tab.id
                      ? "bg-white text-[#5f1340] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">Printer Thermal</h2>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                  connected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                )}
              >
                {connected ? "Terhubung" : "Belum terhubung"}
              </span>
            </div>

            {!supported ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Web Serial tidak tersedia. Gunakan Chrome atau Edge desktop untuk test print ke printer
                Bluetooth/USB.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!connected ? (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#5f1340] hover:bg-[#4d0f33] disabled:opacity-50 px-3.5 py-2 text-xs font-semibold text-white"
                  >
                    <HiOutlineLink className="h-4 w-4" />
                    {connecting ? "Menghubungkan..." : "Hubungkan Printer"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <HiOutlineLinkSlash className="h-4 w-4" />
                    Putuskan
                  </button>
                )}
              </div>
            )}

            {printerError ? (
              <p className="text-[11px] text-rose-600">{printerError}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-800">Field Nota</h2>
              <button
                type="button"
                onClick={handleResetTab}
                className="text-[11px] font-semibold text-slate-500 hover:text-[#5f1340]"
              >
                Reset default
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-0.5">
                {(fieldLabels.length ? fieldLabels : []).map((field) => (
                  <ToggleRow
                    key={field.key}
                    label={field.label}
                    checked={Number(activeSettings[field.key]) === 1}
                    onChange={(v) => handleToggle(field.key, v)}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5f1340] hover:bg-[#4d0f33] disabled:opacity-50 px-4 py-3 text-xs font-bold text-white"
            >
              <HiOutlinePrinter className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </section>

        <section className="xl:col-span-7 rounded-2xl border border-slate-200 bg-[#ece9e4] p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Preview Live</h2>
              <p className="text-xs text-slate-500">
                {previewReceipt
                  ? `Data transaksi: ${previewReceipt.id}`
                  : "Belum ada transaksi — preview kosong"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700">
                Tab: {activeTab === "internal" ? "Internal" : "Customer"}
              </span>
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={!previewReceipt || !connected || testPrinting || printing || loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#5f1340] hover:bg-[#4d0f33] disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-white shadow-sm"
              >
                <HiOutlinePrinter className={cn("h-4 w-4", (testPrinting || printing) && "animate-pulse")} />
                {testPrinting || printing ? "Mencetak..." : "Test Print"}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5f1340] border-t-transparent" />
            </div>
          ) : previewReceipt ? (
            <ThermalNotaBody
              receipt={previewReceipt}
              settings={activeSettings}
              variant={activeTab}
            />
          ) : (
            <div className="mx-auto max-w-[300px] rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-xs text-slate-400">
              Buat transaksi terlebih dahulu untuk melihat preview nota
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
