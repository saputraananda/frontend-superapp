import { useEffect } from "react";
import { HiOutlineWrenchScrewdriver, HiOutlineXMark } from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * @param {boolean}  open        tampil atau tidak
 * @param {string}   title       judul dialog (default)
 * @param {string}   message     pesan (default)
 * @param {string}   closeLabel  label tombol tutup (default: "Mengerti")
 * @param {function} onClose     callback saat tutup
 */
export default function UnderDevelopmentDialog({
  open,
  title      = "Fitur Dalam Pengembangan",
  message    = "Halaman ini masih dalam tahap pengembangan. Harap jangan diisi terlebih dahulu dan tunggu pembaruan selanjutnya.",
  closeLabel = "Mengerti",
  onClose,
}) {
  // Tutup dengan Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl",
          "animate-[dialogIn_0.18s_ease-out]"
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dev-title"
        aria-describedby="dev-message"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <HiOutlineXMark className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center h-12 w-12 rounded-full mx-auto mb-4 bg-amber-100">
            <HiOutlineWrenchScrewdriver className="w-6 h-6 text-amber-600" />
          </div>

          {/* Badge */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Under Development
            </span>
          </div>

          {/* Title */}
          <h2
            id="dev-title"
            className="text-base font-bold text-slate-800 text-center mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <p
            id="dev-message"
            className="text-sm text-slate-500 text-center leading-relaxed"
          >
            {message}
          </p>
        </div>

        {/* Action */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "w-full rounded-xl px-4 py-2.5",
              "text-sm font-semibold transition",
              "bg-amber-500 hover:bg-amber-600 text-white",
              "focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            )}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}