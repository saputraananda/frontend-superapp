import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineXMark,
  HiOutlineArrowDownTray,
  HiOutlineDocumentText,
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * DocViewerModal
 * Props:
 *   open      : boolean
 *   onClose   : () => void
 *   fileUrl   : string   — URL file (gambar atau PDF)
 *   fileName  : string   — nama file untuk judul & download
 *   label     : string   — label dokumen (mis. "KTP", "Pas Foto")
 */
export default function DocViewerModal({ open, onClose, fileUrl, fileName, label }) {
  const isPdf = fileName?.toLowerCase().endsWith(".pdf");

  // Tutup dengan Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    // Freeze scroll background
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  if (!open || !fileUrl) return null;

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Modal Panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${label}`}
        className={cn(
          "fixed inset-0 z-[9999] flex items-center justify-center p-4",
          "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "pointer-events-auto relative flex flex-col",
            "w-full max-w-3xl max-h-[90vh]",
            "rounded-2xl bg-white shadow-2xl ring-1 ring-black/10",
            "overflow-hidden"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg shrink-0",
                isPdf ? "bg-red-100" : "bg-blue-100"
              )}>
                <HiOutlineDocumentText className={cn("w-4 h-4", isPdf ? "text-red-600" : "text-blue-600")} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-slate-800 truncate" title={fileName}>{fileName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Tombol Download */}
              <a
                href={fileUrl}
                download={fileName}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                  "bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700",
                  "hover:bg-blue-100 transition"
                )}
              >
                <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
                Unduh
              </a>

              {/* Tombol Tutup */}
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg",
                  "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                )}
                aria-label="Tutup"
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-0">
            {isPdf ? (
              <iframe
                src={fileUrl}
                title={fileName}
                className="w-full h-full min-h-[60vh]"
                style={{ border: "none" }}
              />
            ) : (
              <div className="p-4 flex items-center justify-center w-full">
                <img
                  src={fileUrl}
                  alt={label}
                  className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-md"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                {/* Fallback jika gambar gagal load */}
                <div
                  className="hidden flex-col items-center gap-3 text-slate-400 py-12"
                >
                  <HiOutlineDocumentText className="w-12 h-12" />
                  <p className="text-sm">Gagal memuat gambar</p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Buka di tab baru
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
