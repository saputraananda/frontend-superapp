import { useRef, useState } from "react";
import { apiUpload, assetUrl } from "../../../lib/api";
import ConfirmDialog from "../../../components/ConfirmDialog";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// PhotoUpload hanya untuk Pas Foto (type="profile")
// KTP sudah pindah ke tab Dokumen via DocumentUpload
export default function PhotoUpload({ currentPath, currentName, onUploaded, onDeleted }) {
  const inputRef                       = useRef(null);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [preview,     setPreview]     = useState(null);
  const [error,       setError]       = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const apiPath  = "/employees/profile/photo";
  const fieldKey = "profile_photo";

  const displaySrc = preview || assetUrl(currentPath);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Hanya file JPG, PNG, atau WEBP yang diizinkan.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const form = new FormData();
      form.append(fieldKey, file);
      const data = await apiUpload(apiPath, { method: "POST", body: form });
      onUploaded({ path: data.profile_path, name: data.profile_name });
      setPreview(null);
    } catch (err) {
      setError(err.message);
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // Klik hapus → buka dialog dulu
  const handleDeleteClick = () => setConfirmOpen(true);

  // User konfirmasi hapus
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
        title="Hapus Pas Foto"
        message="Apakah Anda yakin ingin menghapus pas foto? Foto tidak bisa dikembalikan setelah dihapus."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* ── Upload UI ── */}
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "relative overflow-hidden border-2 border-dashed border-purple-200 bg-white/60 transition",
            "h-32 w-32 rounded-full",
            "flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/40"
          )}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt="Pas Foto"
              className="object-cover w-full h-full rounded-full"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400 select-none">
              <span className="text-3xl">🧑</span>
              <span className="text-[10px] text-center px-2">
                {uploading ? "Mengupload..." : "Klik upload foto"}
              </span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
          )}
        </div>

        {currentName && !preview && (
          <p className="max-w-[10rem] truncate text-center text-[10px] text-slate-500" title={currentName}>
            {currentName}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={uploading || deleting}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 transition disabled:opacity-50"
          >
            {displaySrc ? "Ganti" : "Upload"}
          </button>

          {(displaySrc || currentPath) && (
            <button
              type="button"
              disabled={uploading || deleting}
              onClick={handleDeleteClick}
              className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-200 transition disabled:opacity-50"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          )}
        </div>

        {error && <p className="text-[11px] text-rose-600 text-center">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </>
  );
}