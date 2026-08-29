import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";
import { buildNotaModel, NOTA_DASH, wrapNotaText } from "./notaModel.js";

export const PRINT_WIDTH = 384;
export const QR_PRINT_SIZE = 200;
const BAND_H = 120;

const INIT = [0x1b, 0x40];
const ALIGN_LEFT = [0x1b, 0x61, 0x00];
const ALIGN_CENTER = [0x1b, 0x61, 0x01];
const ALIGN_RIGHT = [0x1b, 0x61, 0x02];
const BOLD_ON = [0x1b, 0x45, 0x01];
const BOLD_OFF = [0x1b, 0x45, 0x00];
const SIZE_NORMAL = [0x1d, 0x21, 0x00];
const SIZE_TALL = [0x1d, 0x21, 0x01];
const SIZE_HUGE = [0x1d, 0x21, 0x11];
const LF = [0x0a];
const FEED = [0x1b, 0x64, 0x04];
const CUT = [0x1d, 0x56, 0x00];

function concatParts(parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function sanitizeText(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0a\x0d\x20-\x7E]/g, "?");
}

function encodeText(str) {
  return new TextEncoder().encode(sanitizeText(str));
}

function alignCmd(align) {
  if (align === "center") return ALIGN_CENTER;
  if (align === "right") return ALIGN_RIGHT;
  return ALIGN_LEFT;
}

function sizeCmd(size) {
  if (size === "huge") return SIZE_HUGE;
  if (size === "tall") return SIZE_TALL;
  return SIZE_NORMAL;
}

async function renderQrCanvas(value, size = QR_PRINT_SIZE) {
  if (!value || typeof document === "undefined") return null;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    createElement(QRCodeCanvas, {
      value,
      size,
      level: "M",
      includeMargin: false,
    })
  );

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  const canvas = container.querySelector("canvas");
  const cloned = document.createElement("canvas");
  cloned.width = canvas.width;
  cloned.height = canvas.height;
  cloned.getContext("2d").drawImage(canvas, 0, 0);

  root.unmount();
  document.body.removeChild(container);
  return cloned;
}

function canvasBandToRaster(canvas, yStart, bandHeight) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = Math.min(bandHeight, canvas.height - yStart);
  const img = ctx.getImageData(0, yStart, width, height);
  const bytesPerRow = Math.ceil(width / 8);
  const raster = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const lum = img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114;
      if (lum < 180) {
        const byteIndex = y * bytesPerRow + (x >> 3);
        raster[byteIndex] |= 0x80 >> (x % 8);
      }
    }
  }

  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  const header = new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  const out = new Uint8Array(header.length + raster.length);
  out.set(header, 0);
  out.set(raster, header.length);
  return out;
}

function canvasToRasterBands(canvas) {
  const parts = [];
  for (let y = 0; y < canvas.height; y += BAND_H) {
    parts.push(canvasBandToRaster(canvas, y, BAND_H));
  }
  return parts;
}

async function renderHeaderRaster(row) {
  const lines = row.lines || [];
  const lineHeight = 20;
  const textWidth = PRINT_WIDTH - (row.qr ? QR_PRINT_SIZE + 12 : 0);
  const textHeight = Math.max(QR_PRINT_SIZE, lines.length * lineHeight + 8);

  const canvas = document.createElement("canvas");
  canvas.width = PRINT_WIDTH;
  canvas.height = textHeight;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 18px monospace";

  if (row.qr) {
    const qrCanvas = await renderQrCanvas(row.qr, QR_PRINT_SIZE);
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, 0, 0, QR_PRINT_SIZE, QR_PRINT_SIZE);
    }
  }

  const textX = row.qr ? QR_PRINT_SIZE + 10 : 4;
  lines.forEach((line, idx) => {
    ctx.font = idx === 0 ? "bold 18px monospace" : "16px monospace";
    const wrapped = wrapNotaText(line, Math.floor(textWidth / 9));
    wrapped.forEach((wLine, wIdx) => {
      ctx.fillText(wLine, textX, 18 + (idx + wIdx) * lineHeight);
    });
  });

  return canvasToRasterBands(canvas);
}

async function renderHeaderFallback(row) {
  const parts = [INIT, ALIGN_LEFT, BOLD_ON];
  for (const line of row.lines || []) {
    parts.push(encodeText(line));
    parts.push(LF);
  }
  parts.push(BOLD_OFF);
  if (row.qr) {
    parts.push(encodeText(String(row.qr)));
    parts.push(LF);
  }
  return parts;
}

async function renderTextRow(row) {
  const lines = wrapNotaText(row.text);
  const parts = [alignCmd(row.align), sizeCmd(row.size)];
  if (row.bold) parts.push(BOLD_ON);
  for (const line of lines) {
    parts.push(encodeText(line));
    parts.push(LF);
  }
  if (row.bold) parts.push(BOLD_OFF);
  parts.push(SIZE_NORMAL, ALIGN_LEFT);
  return parts;
}

async function renderModel(rows) {
  const parts = [INIT, ALIGN_LEFT, SIZE_NORMAL, BOLD_OFF];

  for (const row of rows) {
    if (row.type === "blank") {
      parts.push(LF);
    } else if (row.type === "dash") {
      parts.push(encodeText(NOTA_DASH));
      parts.push(LF);
    } else if (row.type === "header") {
      try {
        const bands = await renderHeaderRaster(row);
        parts.push(...bands);
        parts.push(LF);
      } catch {
        const fallback = await renderHeaderFallback(row);
        parts.push(...fallback);
      }
    } else if (row.type === "text") {
      const textParts = await renderTextRow(row);
      parts.push(...textParts);
    }
  }

  parts.push(FEED, LF, LF, CUT);
  return concatParts(parts);
}

export async function buildEscPosNota(receipt, settings, variant = "customer") {
  const rows = buildNotaModel(receipt, settings, variant);
  return renderModel(rows);
}

export async function buildEscPosDualNota(receipt, customerSettings, internalSettings) {
  const internal = await buildEscPosNota(receipt, internalSettings, "internal");
  const customer = await buildEscPosNota(receipt, customerSettings, "customer");
  const out = new Uint8Array(internal.length + customer.length);
  out.set(internal, 0);
  out.set(customer, internal.length);
  return out;
}
