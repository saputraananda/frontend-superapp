const BAUD_CANDIDATES = [9600, 115200, 38400, 19200, 57600];
const CHUNK = 512;
const CHUNK_DELAY_MS = 20;

let activePort = null;
let activeWriter = null;
let activeReader = null;

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isSerialSupported() {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function isPrinterConnected() {
  return Boolean(activePort?.readable && activeWriter);
}

export function getConnectedPortInfo() {
  if (!activePort) return null;
  const info = activePort.getInfo?.() || {};
  return {
    usbVendorId: info.usbVendorId,
    usbProductId: info.usbProductId,
  };
}

export function formatSerialConnectError(err) {
  const name = err?.name || "";
  if (name === "NotFoundError") return "Port printer tidak dipilih.";
  if (name === "SecurityError") return "Akses serial ditolak browser.";
  if (name === "NetworkError") return "Koneksi printer terputus.";
  return err?.message || "Gagal menghubungkan printer.";
}

async function releaseReader() {
  if (activeReader) {
    try {
      await activeReader.cancel();
      activeReader.releaseLock();
    } catch {
      /* ignore */
    }
    activeReader = null;
  }
}

export async function disconnectThermalPrinter() {
  await releaseReader();
  if (activeWriter) {
    try {
      await activeWriter.close();
    } catch {
      /* ignore */
    }
    activeWriter = null;
  }
  if (activePort) {
    try {
      await activePort.close();
    } catch {
      /* ignore */
    }
    activePort = null;
  }
}

export async function connectThermalPrinter() {
  if (!isSerialSupported()) {
    throw new Error("Web Serial API tidak tersedia. Gunakan Chrome atau Edge desktop.");
  }

  await disconnectThermalPrinter();

  const port = await navigator.serial.requestPort();
  let lastError = null;

  for (const baudRate of BAUD_CANDIDATES) {
    try {
      await port.open({ baudRate });
      activePort = port;
      activeWriter = port.writable.getWriter();
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      try {
        await port.close();
      } catch {
        /* ignore */
      }
    }
  }

  if (lastError) {
    activePort = null;
    activeWriter = null;
    throw lastError;
  }

  return getConnectedPortInfo();
}

export async function writeToThermalPrinter(data) {
  if (!activeWriter) {
    throw new Error("Printer belum terhubung. Klik Hubungkan Printer terlebih dahulu.");
  }

  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    await activeWriter.write(slice);
    if (i + CHUNK < bytes.length) {
      await sleep(CHUNK_DELAY_MS);
    }
  }
}

export async function tryReconnectThermalPrinter() {
  if (!activePort || isPrinterConnected()) return isPrinterConnected();
  try {
    await activePort.open({ baudRate: 9600 });
    activeWriter = activePort.writable.getWriter();
    return true;
  } catch {
    return false;
  }
}
