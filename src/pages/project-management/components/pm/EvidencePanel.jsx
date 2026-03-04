import { useState, useEffect, useRef, useCallback } from "react";
import { pmApi } from "../../pmApi";
import { toast } from "../../hooks/useToast";
import { customConfirm } from "../../hooks/useModal";
import { formatBytes, isImage, isPdf, fileIcon } from "../../utils/pmUtils";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB (sama dengan backend)
const ACCEPTED = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const EvidencePanel = ({ taskId, canDelete = false, onChanged }) => { // ← tambah onChanged
  const [files, setFiles]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(null);
  const inputRef                  = useRef(null);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await pmApi.listEvidence(taskId); // ← akan kita tambah di pmApi
      setFiles(res?.data || []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    // Validasi ukuran
    const oversized = selected.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length) {
      toast.error(`File terlalu besar (maks 20 MB): ${oversized.map((f) => f.name).join(", ")}`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      await pmApi.uploadEvidence(taskId, selected);
      toast.success(`${selected.length} file berhasil diupload`);
      await load(); // ← reload dari server
      onChanged?.();
    } catch (ex) {
      console.error("[EvidencePanel] Upload error:", ex);
      toast.error(ex.message || "Upload gagal");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(fileId, fileName) {
    const confirmed = await customConfirm(
      "Hapus Evidence",
      `File "${fileName}" akan dihapus permanen.`,
      "Hapus", true
    );
    if (!confirmed) return;
    try {
      await pmApi.deleteEvidence(fileId); // ← fix: hanya butuh evidenceId
      toast.success("File berhasil dihapus");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || "Gagal hapus file");
    }
  }

  // ✅ Preview langsung dari file_path yang disimpan di DB
  function openPreview(file) {
    const filePath = file.file_path || file.filepath || "";
    const url = filePath.startsWith("http")
      ? filePath
      : `${API_URL}${filePath}`; // contoh: http://localhost:3001/assets/evidence/xxx.pdf
    setPreview({
      url,
      name: file.file_name || file.filename || file.name || "File",
      type: file.file_type || "",
    });
  }

  const iconColorMap = {
    IMG:  "bg-blue-100 text-blue-700",
    PDF:  "bg-rose-100 text-rose-700",
    XLS:  "bg-emerald-100 text-emerald-700",
    DOC:  "bg-indigo-100 text-indigo-700",
    ZIP:  "bg-amber-100 text-amber-700",
    FILE: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        className={[
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition cursor-pointer",
          uploading
            ? "border-slate-300 bg-slate-50 cursor-not-allowed opacity-60"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white",
        ].join(" ")}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (uploading) return;
          if (e.dataTransfer?.files?.length) {
            handleUpload({ target: { files: e.dataTransfer.files } });
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <span className="h-5 w-5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Mengupload...</span>
          </>
        ) : (
          <>
            <span className="text-2xl">📎</span>
            <div>
              <span className="text-sm font-semibold text-slate-700">Klik atau drag &amp; drop file</span>
              <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, PDF, DOCX, XLSX, ZIP · maks 20 MB</p>
            </div>
          </>
        )}
      </div>

      {/* File list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-center">
          <p className="text-sm text-slate-400">Belum ada evidence yang diupload.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => {
            const name  = file.file_name || file.filename || file.name || "File";
            const ftype = file.file_type || "";
            const icon  = fileIcon(ftype, name);
            const color = iconColorMap[icon] || iconColorMap.FILE;
            const size  = file.file_size || file.size;

            return (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50 transition group"
              >
                <div className={`h-8 w-8 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{name}</div>
                  {size != null && <div className="text-xs text-slate-400">{formatBytes(size)}</div>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    title="Preview / Download"
                    onClick={() => openPreview(file)}
                    className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 text-sm transition"
                  >
                    {isImage(ftype, name) ? "🖼" : isPdf(ftype, name) ? "📄" : "⬇"}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      title="Hapus"
                      onClick={() => handleDelete(file.id, name)}
                      className="h-7 w-7 rounded-md border border-rose-200 bg-white hover:bg-rose-50 flex items-center justify-center text-rose-500 text-xs transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] rounded-xl overflow-hidden bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <span className="text-sm font-semibold text-slate-700 truncate max-w-[80%]">{preview.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  download={preview.name}
                  className="h-7 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 flex items-center gap-1 transition"
                >
                  ⬇ Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold transition"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center bg-slate-100 p-4">
              {isImage(preview.type, preview.name) ? (
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-[75vh] rounded-lg object-contain shadow" />
              ) : isPdf(preview.type, preview.name) ? (
                <iframe src={preview.url} title={preview.name} className="w-full rounded-lg" style={{ height: "75vh" }} />
              ) : (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📎</div>
                  <p className="text-slate-600 font-medium mb-3">Preview tidak tersedia untuk file ini.</p>
                  <a href={preview.url} download={preview.name} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition">
                    ⬇ Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};