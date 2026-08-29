import { QRCodeSVG } from "qrcode.react";
import { buildNotaModel, NOTA_DASH } from "../../utils/notaModel.js";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function textSizeClass(size) {
  if (size === "huge") return "text-[18px] font-black break-all leading-tight";
  if (size === "tall") return "text-[12px] font-black leading-tight";
  return "text-[9px] leading-snug";
}

function textAlignClass(align) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export default function ThermalNotaBody({ receipt, settings, variant = "customer", compact = false }) {
  if (!receipt || !settings) {
    return (
      <div className="mx-auto w-full max-w-[300px] rounded border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-400">
        Preview nota tidak tersedia
      </div>
    );
  }

  const rows = buildNotaModel(receipt, settings, variant);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[300px] bg-[#fffefb] shadow-sm border border-slate-200/80 font-mono text-slate-800",
        compact ? "px-3 py-3" : "px-4 py-4"
      )}
    >
      {rows.map((row, idx) => {
        if (row.type === "blank") {
          return <div key={idx} className="h-1.5" />;
        }
        if (row.type === "dash") {
          return (
            <p key={idx} className="text-[9px] text-slate-500 my-0.5 whitespace-pre">
              {NOTA_DASH}
            </p>
          );
        }
        if (row.type === "header") {
          return (
            <div key={idx} className="flex gap-1.5 items-start mb-1">
              {row.qr ? (
                <div className="shrink-0">
                  <QRCodeSVG value={row.qr} size={168} level="M" includeMargin={false} />
                </div>
              ) : null}
              <div className="min-w-0 flex-1 pt-0.5">
                {(row.lines || []).map((line, li) => (
                  <p
                    key={li}
                    className={cn(
                      "break-words",
                      li === 0 ? "font-bold text-[10px] leading-tight" : "text-[8px] leading-snug text-slate-700"
                    )}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          );
        }
        if (row.type === "text") {
          return (
            <p
              key={idx}
              className={cn(
                textSizeClass(row.size),
                textAlignClass(row.align),
                row.bold && "font-bold",
                "whitespace-pre-wrap break-words my-0"
              )}
            >
              {row.text}
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}
