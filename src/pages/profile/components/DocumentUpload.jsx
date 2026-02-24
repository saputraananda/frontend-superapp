import { useRef, useState } from "react";
import { apiUpload, assetUrl } from "../../../lib/api";
import ConfirmDialog from "../../../components/ConfirmDialog";
import {
  HiOutlineDocumentText,
  HiOutlineArrowUpTray,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function DocumentUpload({
  docType,
  label,
  hint,
  currentPath,
  currentName,
  onUploaded,
  onDeleted,
}) {
  const inputRef                        = useRef(null);
  const [uploading,    setUploading]    = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [error,        setError]        = useState("");
  const [confirmOpen,  setConfirmOpen]  = useState(false);

  const apiPath = `/employees/profile/document/${docType}`;
  const isPdf   = currentName?.toLowerCase().endsWith(".pdf");
  const fileUrl = assetUrl(currentPath);
  const hasDoc  = !!currentPath;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("Hanya file JPG, PNG, WEBP, atau PDF yang diizinkan.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10 MB.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const data = await apiUpload(apiPath, { method: "POST", body: form });
      onUploaded({
        path: data[`${docType}_path`],
        name: data[`${docType}_name`],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // Klik tombol hapus → buka dialog dulu
  const handleDeleteClick = () => setConfirmOpen(true);

  // User klik "Hapus" di dialog
  const handleDeleteConfirm = async () => {
    setConfirmOpen(false);
    setDeleting(true);
    setError("");
    try {
      await apiUpload(apiPath, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Dokumen"
        message={`Apakah Anda yakin ingin menghapus dokumen ${label}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* ── Card ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</p>
            {hint && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{hint}</p>}
          </div>
          {hasDoc ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shrink-0">
              <HiOutlineCheckCircle className="w-3 h-3" />Ada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 shrink-0">
              <HiOutlineExclamationCircle className="w-3 h-3" />Belum
            </span>
          )}
        </div>

        {/* Drop / Preview Area */}
        <div
          onClick={() => !uploading && !deleting && inputRef.current?.click()}
          className={cn(
            "relative rounded-lg border-2 border-dashed transition-all cursor-pointer",
            "flex flex-col items-center justify-center gap-2 min-h-[96px] p-3 text-center",
            hasDoc
              ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
              : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30"
          )}
        >
          {hasDoc ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-lg",
                isPdf ? "bg-red-100" : "bg-blue-100"
              )}>
                <HiOutlineDocumentText className={cn("w-5 h-5", isPdf ? "text-red-600" : "text-blue-600")} />
              </div>
              <p className="text-[11px] font-medium text-slate-700 max-w-[160px] truncate" title={currentName}>
                {currentName}
              </p>
              <p className="text-[10px] text-slate-400">
                {isPdf ? "PDF tersimpan" : "Gambar tersimpan"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-400">
              <HiOutlineArrowUpTray className="w-6 h-6" />
              <p className="text-[11px]">Klik untuk upload</p>
              <p className="text-[10px] text-slate-300">JPG · PNG · WEBP · PDF &nbsp;|&nbsp; Maks. 10 MB</p>
            </div>
          )}

          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 rounded-lg flex flex-col items-center justify-center gap-2 bg-white/80">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p className="text-[11px] text-blue-600 font-medium">Mengupload...</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={uploading || deleting}
            onClick={() => inputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
          >
            <HiOutlineArrowUpTray className="w-3.5 h-3.5" />
            {hasDoc ? "Ganti" : "Upload"}
          </button>

          {hasDoc && (
            <>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                <HiOutlineEye className="w-3.5 h-3.5" />
                Lihat
              </a>
              <button
                type="button"
                disabled={uploading || deleting}
                onClick={handleDeleteClick}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
              >
                <HiOutlineTrash className="w-3.5 h-3.5" />
                {deleting ? "..." : "Hapus"}
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="text-[11px] text-rose-600 flex items-center gap-1">
            <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </>
  );
}