import { useRef, useState } from "react";
import { apiUpload, assetUrl } from "../../../lib/api";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function PhotoUpload({ type, currentPath, currentName, onUploaded, onDeleted }) {
  const inputRef                  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [preview, setPreview]     = useState(null);
  const [error, setError]         = useState("");

  const isProfile = type === "profile";
  const label     = isProfile ? "Pas Foto" : "Foto KTP";
  const apiPath   = isProfile ? "/employees/profile/photo" : "/employees/profile/ktp";
  const fieldKey  = isProfile ? "profile_photo" : "ktp_photo";

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

    // Preview lokal
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const form = new FormData();
      form.append(fieldKey, file);

      // ✅ Pakai apiUpload — tidak hardcode fetch lagi
      const data = await apiUpload(apiPath, { method: "POST", body: form });

      onUploaded({
        path: isProfile ? data.profile_path : data.ktp_path,
        name: isProfile ? data.profile_name : data.ktp_name,
      });
      setPreview(null);
    } catch (err) {
      setError(err.message);
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus ${label}?`)) return;
    setDeleting(true);
    setError("");
    try {
      // ✅ Pakai apiUpload — tidak hardcode fetch lagi
      await apiUpload(apiPath, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          "relative overflow-hidden border-2 border-dashed border-purple-200 bg-white/60 transition",
          isProfile ? "h-32 w-32 rounded-full" : "h-28 w-48 rounded-2xl",
          "flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/40"
        )}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={label}
            className={cn("object-cover w-full h-full", isProfile ? "rounded-full" : "rounded-2xl")}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400 select-none">
            <span className="text-3xl">{isProfile ? "🧑" : "🪪"}</span>
            <span className="text-[10px] text-center px-2">
              {uploading ? "Mengupload..." : `Klik upload ${label}`}
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
            onClick={handleDelete}
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
  );
}