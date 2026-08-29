import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { buildEscPosDualNota, buildEscPosNota } from "../utils/escpos.js";
import {
  connectThermalPrinter,
  disconnectThermalPrinter,
  formatSerialConnectError,
  getConnectedPortInfo,
  isPrinterConnected,
  isSerialSupported,
  writeToThermalPrinter,
} from "../utils/thermalPrinter.js";

const ThermalPrinterContext = createContext(null);

export function ThermalPrinterProvider({ children }) {
  const [connected, setConnected] = useState(() => isPrinterConnected());
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [portInfo, setPortInfo] = useState(() => getConnectedPortInfo());
  const [lastError, setLastError] = useState("");

  const supported = isSerialSupported();

  const connect = useCallback(async () => {
    setConnecting(true);
    setLastError("");
    try {
      const info = await connectThermalPrinter();
      setConnected(true);
      setPortInfo(info);
      return info;
    } catch (err) {
      const msg = formatSerialConnectError(err);
      setLastError(msg);
      setConnected(false);
      setPortInfo(null);
      throw new Error(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setLastError("");
    await disconnectThermalPrinter();
    setConnected(false);
    setPortInfo(null);
  }, []);

  const printNota = useCallback(async (receipt, settings, variant = "customer") => {
    if (!receipt) throw new Error("Data nota preview tidak tersedia");
    if (!isPrinterConnected()) throw new Error("Printer belum terhubung");

    setPrinting(true);
    setLastError("");
    try {
      const bytes = await buildEscPosNota(receipt, settings, variant);
      await writeToThermalPrinter(bytes);
    } catch (err) {
      const msg = err?.message || "Gagal mencetak nota";
      setLastError(msg);
      throw new Error(msg);
    } finally {
      setPrinting(false);
    }
  }, []);

  const printDualNota = useCallback(async (receipt, customerSettings, internalSettings) => {
    if (!receipt) throw new Error("Data nota tidak tersedia");
    if (!isPrinterConnected()) throw new Error("Printer belum terhubung");

    setPrinting(true);
    setLastError("");
    try {
      const bytes = await buildEscPosDualNota(receipt, customerSettings, internalSettings);
      await writeToThermalPrinter(bytes);
    } catch (err) {
      const msg = err?.message || "Gagal mencetak nota";
      setLastError(msg);
      throw new Error(msg);
    } finally {
      setPrinting(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      supported,
      connected,
      connecting,
      printing,
      portInfo,
      lastError,
      connect,
      disconnect,
      printNota,
      printDualNota,
    }),
    [supported, connected, connecting, printing, portInfo, lastError, connect, disconnect, printNota, printDualNota]
  );

  return (
    <ThermalPrinterContext.Provider value={value}>{children}</ThermalPrinterContext.Provider>
  );
}

export function useThermalPrinter() {
  const ctx = useContext(ThermalPrinterContext);
  if (!ctx) {
    throw new Error("useThermalPrinter harus dipakai di dalam ThermalPrinterProvider");
  }
  return ctx;
}
