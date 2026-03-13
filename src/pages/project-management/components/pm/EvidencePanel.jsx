import { useState, useEffect, useRef, useCallback } from "react";
import { pmApi } from "../../pmApi";
import { toast } from "../../hooks/useToast";
import { customConfirm } from "../../hooks/useModal";
import { formatBytes, isImage, isPdf, fileIcon } from "../../utils/pmUtils";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const EvidencePanel = ({ taskId, canDelete = false, onChanged }) => {
  const [files, setFiles]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(null);
  const inputRef                  = useRef(null);

  // ── Link input state ──
  const [linkUrl, setLinkUrl]       = useState("");
  const [linkLabel, setLinkLabel]   = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await pmApi.listEvidence(taskId);
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
      await load();
      onChanged?.();
    } catch (ex) {
      console.error("[EvidencePanel] Upload error:", ex);
      toast.error(ex.message || "Upload gagal");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleAddLink() {
    if (!linkUrl.trim()) return;
    let normalizedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }
    setAddingLink(true);
    try {
      await pmApi.addEvidenceLink(taskId, {
        url: normalizedUrl,
        label: linkLabel.trim() || null,
      });
      toast.success("Link berhasil ditambahkan");
      setLinkUrl("");
      setLinkLabel("");
      await load();
      onChanged?.();
    } catch (ex) {
      toast.error(ex.message || "Gagal menambahkan link");
    } finally {
      setAddingLink(false);
    }
  }

  async function handleDelete(fileId, fileName, isLink) {
    const confirmed = await customConfirm(
      isLink ? "Hapus Link" : "Hapus Evidence",
      `"${fileName}" akan dihapus permanen.`,
      "Hapus", true
    );
    if (!confirmed) return;
    try {
      await pmApi.deleteEvidence(fileId);
      toast.success(isLink ? "Link berhasil dihapus" : "File berhasil dihapus");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || "Gagal hapus");
    }
  }

  function openPreview(file) {
    // Link → open in new tab
    if (file.file_type === "link") {
      window.open(file.file_path, "_blank", "noopener,noreferrer");
      return;
    }
    const filePath = file.file_path || file.filepath || "";
    const url = filePath.startsWith("http")
      ? filePath
      : `${API_URL}${filePath}`;
    setPreview({
      url,
      name: file.file_name || file.filename || file.name || "File",
      type: file.file_type || "",
    });
  }

  const iconColorMap = {
    LINK: "bg-blue-100 text-blue-700",
    IMG:  "bg-blue-100 text-blue-700",
    PDF:  "bg-rose-100 text-rose-700",
    XLS:  "bg-emerald-100 text-emerald-700",
    DOC:  "bg-indigo-100 text-indigo-700",
    ZIP:  "bg-amber-100 text-amber-700",
    FILE: "bg-slate-100 text-slate-600",
  };

  // Separate links and files for display
  const linkItems = files.filter((f) => f.file_type === "link");
  const fileItems = files.filter((f) => f.file_type !== "link");

  return (
    <div className="space-y-4">

      {/* ── Link section ── */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Link Referensi</div>

        {/* Existing links */}
        {linkItems.length > 0 && (
          <div className="space-y-1.5">
            {linkItems.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5 hover:bg-blue-50 transition group"
              >
                <div className="h-8 w-8 rounded-md flex items-center justify-center text-sm shrink-0 bg-blue-100 text-blue-700">
                  🔗
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-700 truncate">{link.file_name}</div>
                  {link.file_name !== link.file_path && (
                    <div className="text-[10px] text-slate-400 truncate">{link.file_path}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <a
                    href={/^https?:\/\//i.test(link.file_path) ? link.file_path : `https://${link.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 rounded-md border border-blue-200 bg-white hover:bg-blue-50 flex items-center justify-center text-blue-600 text-xs transition"
                    title="Buka di tab baru"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </a>
                  {canDelete && (
                    <button
                      type="button"
                      title="Hapus"
                      onClick={() => handleDelete(link.id, link.file_name, true)}
                      className="h-7 w-7 rounded-md border border-rose-200 bg-white hover:bg-rose-50 flex items-center justify-center text-rose-500 text-xs transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add link input */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              disabled={addingLink}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
            />
            <input
              type="text"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="Label (opsional, mis: Figma Design)"
              disabled={addingLink}
              className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
            />
          </div>
          <button
            type="button"
            onClick={handleAddLink}
            disabled={addingLink || !linkUrl.trim()}
            className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-40 transition flex items-center gap-1 shrink-0"
          >
            {addingLink
              ? <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <>🔗 Tambah</>}
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-slate-200" />

      {/* ── File upload section ── */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Berkas Lampiran</div>

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
        ) : fileItems.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-center">
            <p className="text-sm text-slate-400">Belum ada berkas yang diupload.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {fileItems.map((file) => {
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
                    {size != null && size > 0 && <div className="text-xs text-slate-400">{formatBytes(size)}</div>}
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
                        onClick={() => handleDelete(file.id, name, false)}
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
      </div>

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