/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlinePrinter,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineLink,
} from "react-icons/hi2";
import ThermalNotaBody from "./ThermalNotaBody";
import { useThermalPrinter } from "../../context/ThermalPrinterContext";
import {
  DEFAULT_CUSTOMER_SETTINGS,
  DEFAULT_INTERNAL_SETTINGS,
  fetchPrinterSettings,
  mapDbTransactionToReceipt,
  mapTxnToThermalReceipt,
} from "../../utils/printerSettings.js";

export { mapDbTransactionToReceipt, mapTxnToThermalReceipt };

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ThermalNota({ createdOrderReceipt, onClose, outletId = 0 }) {
  const { supported, connected, connecting, printing, connect, printNota } = useThermalPrinter();

  const receiptKey = createdOrderReceipt?.id ?? null;
  const [settings, setSettings] = useState({
    customer: DEFAULT_CUSTOMER_SETTINGS,
    internal: DEFAULT_INTERNAL_SETTINGS,
  });
  const [printingVariant, setPrintingVariant] = useState(null);
  const [printError, setPrintError] = useState("");
  const [printSuccess, setPrintSuccess] = useState("");

  const resolvedOutletId = outletId || createdOrderReceipt?.outletId || 0;
  const fetchKey = createdOrderReceipt ? `${receiptKey}-${resolvedOutletId}` : null;
  const [loadedKey, setLoadedKey] = useState(null);
  const loadingSettings = Boolean(fetchKey && loadedKey !== fetchKey);

  useEffect(() => {
    if (!createdOrderReceipt) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [createdOrderReceipt]);

  useEffect(() => {
    if (!createdOrderReceipt || !fetchKey) return undefined;
    let cancelled = false;
    fetchPrinterSettings(resolvedOutletId)
      .then((data) => {
        if (!cancelled) {
          setSettings({
            customer: { ...DEFAULT_CUSTOMER_SETTINGS, ...(data?.customer || {}) },
            internal: { ...DEFAULT_INTERNAL_SETTINGS, ...(data?.internal || {}) },
          });
          setLoadedKey(fetchKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettings({
            customer: DEFAULT_CUSTOMER_SETTINGS,
            internal: DEFAULT_INTERNAL_SETTINGS,
          });
          setLoadedKey(fetchKey);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [createdOrderReceipt, fetchKey, resolvedOutletId]);

  if (!createdOrderReceipt) return null;

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleConnect = async () => {
    setPrintError("");
    try {
      await connect();
    } catch (err) {
      setPrintError(err.message || "Gagal menghubungkan printer");
    }
  };

  const handlePrintVariant = async (variant) => {
    setPrintError("");
    setPrintSuccess("");
    if (!connected) {
      setPrintError("Hubungkan printer thermal terlebih dahulu");
      return;
    }
    if (!settings?.customer || !settings?.internal) {
      setPrintError("Pengaturan nota belum dimuat");
      return;
    }

    setPrintingVariant(variant);
    try {
      const variantSettings = variant === "internal" ? settings.internal : settings.customer;
      await printNota(createdOrderReceipt, variantSettings, variant);
      setPrintSuccess(
        `Nota ${variant === "internal" ? "Internal" : "Customer"} berhasil dikirim ke printer`
      );
    } catch (err) {
      setPrintError(err.message || "Gagal mencetak nota");
    } finally {
      setPrintingVariant(null);
    }
  };

  const printDisabled = loadingSettings || !connected || Boolean(printing) || Boolean(printingVariant);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-[2px] overflow-y-auto overscroll-contain"
      onClick={handleClose}
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 w-full max-w-4xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5f1340]/10 text-[#5f1340]">
                <HiOutlinePrinter className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800 truncate">Preview & Cetak Nota</h3>
                <p className="text-[10px] text-slate-500">Pilih nota Internal atau Customer untuk dicetak</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#ece9e4] py-5 px-4 sm:px-6">
            {loadingSettings ? (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5f1340] border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl mx-auto justify-items-center">
                <div className="w-full max-w-[280px] flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f1340] bg-white/80 px-2.5 py-1 rounded-lg border border-[#5f1340]/15">
                    Nota Internal
                  </span>
                  <ThermalNotaBody
                    receipt={createdOrderReceipt}
                    settings={settings.internal}
                    variant="internal"
                  />
                </div>
                <div className="w-full max-w-[280px] flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                    Nota Customer
                  </span>
                  <ThermalNotaBody
                    receipt={createdOrderReceipt}
                    settings={settings.customer}
                    variant="customer"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-100 space-y-2">
            {!supported && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Web Serial tidak tersedia di browser ini. Gunakan Chrome/Edge desktop + printer thermal
                Bluetooth/USB.
              </p>
            )}

            {supported && !connected && (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#5f1340]/20 bg-[#5f1340]/5 px-3 py-2 text-xs font-semibold text-[#5f1340] hover:bg-[#5f1340]/10 disabled:opacity-50"
              >
                <HiOutlineLink className="h-4 w-4" />
                {connecting ? "Menghubungkan printer..." : "Hubungkan Printer Thermal"}
              </button>
            )}

            {printError && (
              <div className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                {printError}
              </div>
            )}

            {printSuccess && (
              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                <HiOutlineCheckCircle className="h-4 w-4" />
                {printSuccess}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
              {!connected ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-2.5 text-xs font-bold text-white cursor-not-allowed"
                >
                  <HiOutlinePrinter className="h-4 w-4" />
                  Hubungkan Printer Dulu
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePrintVariant("internal")}
                    disabled={printDisabled}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#5f1340] bg-white text-[#5f1340] hover:bg-[#5f1340]/5 disabled:opacity-50 px-3 py-2.5 text-xs font-bold"
                  >
                    <HiOutlinePrinter className={cn("h-4 w-4", printingVariant === "internal" && "animate-pulse")} />
                    {printingVariant === "internal" ? "Mencetak..." : "Cetak Internal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintVariant("customer")}
                    disabled={printDisabled}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#5f1340] hover:bg-[#4d0f33] disabled:opacity-50 px-3 py-2.5 text-xs font-bold text-white shadow-sm"
                  >
                    <HiOutlinePrinter className={cn("h-4 w-4", printingVariant === "customer" && "animate-pulse")} />
                    {printingVariant === "customer" ? "Mencetak..." : "Cetak Customer"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
