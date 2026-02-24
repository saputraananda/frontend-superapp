import { useEffect } from "react";
import { HiOutlineExclamationTriangle, HiOutlineXMark } from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * @param {boolean}  open          tampil atau tidak
 * @param {string}   title         judul dialog
 * @param {string}   message       pesan konfirmasi
 * @param {string}   confirmLabel  label tombol konfirmasi (default: "Hapus")
 * @param {string}   cancelLabel   label tombol batal (default: "Batal")
 * @param {string}   variant       "danger" | "warning" (default: "danger")
 * @param {function} onConfirm     callback saat konfirmasi
 * @param {function} onCancel      callback saat batal / tutup
 */
export default function ConfirmDialog({
  open,
  title       = "Konfirmasi Hapus",
  message     = "Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = "Hapus",
  cancelLabel  = "Batal",
  variant      = "danger",
  onConfirm,
  onCancel,
}) {
  // Tutup dengan Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  // Kunci scroll body saat terbuka
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const isDanger  = variant === "danger";
  const iconBg    = isDanger ? "bg-rose-100"   : "bg-amber-100";
  const iconColor = isDanger ? "text-rose-600"  : "text-amber-600";
  const btnCls    = isDanger
    ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/30 text-white"
    : "bg-amber-500 hover:bg-amber-600 focus:ring-amber-400/30 text-white";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl",
          "animate-[dialogIn_0.18s_ease-out]"
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <HiOutlineXMark className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={cn(
            "flex items-center justify-center h-12 w-12 rounded-full mx-auto mb-4",
            iconBg
          )}>
            <HiOutlineExclamationTriangle className={cn("w-6 h-6", iconColor)} />
          </div>

          {/* Title */}
          <h2
            id="confirm-title"
            className="text-base font-bold text-slate-800 text-center mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <p
            id="confirm-message"
            className="text-sm text-slate-500 text-center leading-relaxed"
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5",
              "text-sm font-semibold text-slate-600",
              "hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-300/50"
            )}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5",
              "text-sm font-semibold transition",
              "focus:outline-none focus:ring-2",
              btnCls
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}