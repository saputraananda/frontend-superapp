import { useState, useEffect, useRef } from "react";
import { pmApi } from "../../pmApi";
import { toast } from "../../hooks/useToast";
import { STATUS_LIST } from "../../constants/pmConstants";
import { AssigneeMultiSelect } from "./AssigneeMultiSelect";
import { formatBytes, fileIcon } from "../../utils/pmUtils";
import RichTextEditor from "../../../../components/RichTextEditor";

const PRIORITY_OPTIONS = [
  { key: "critical", label: "Critical", dot: "bg-red-400" },
  { key: "medium", label: "Medium", dot: "bg-amber-400" },
  { key: "low", label: "Low", dot: "bg-emerald-400" },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";

const FieldLabel = ({ children }) => (
  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
    {children}
  </label>
);

const iconColorMap = {
  IMG: "bg-blue-100 text-blue-700",
  PDF: "bg-rose-100 text-rose-700",
  XLS: "bg-emerald-100 text-emerald-700",
  DOC: "bg-indigo-100 text-indigo-700",
  ZIP: "bg-amber-100 text-amber-700",
  FILE: "bg-slate-100 text-slate-600",
};

export const AddTaskModal = ({ monthlyId, employees, employee, isStaff, onClose, onAdded }) => {
  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  const [tPriority, setTPriority] = useState("medium");
  const [tStatus, setTStatus] = useState("assigned");
  const [tAssignees, setTAssignees] = useState(() =>
    isStaff && employee?.employee_id ? [employee.employee_id] : []
  );
  const [tSubmitting, setTSubmitting] = useState(false);

  // ── File attachment state ──
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = useRef(null);

  // ── Pending link state ──
  const [pendingLinks, setPendingLinks] = useState([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleFileSelect(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const oversized = selected.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length) {
      toast.error(`File terlalu besar (maks 20 MB): ${oversized.map((f) => f.name).join(", ")}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPendingFiles((prev) => [...prev, ...selected]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(index) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function addPendingLink() {
    if (!linkUrl.trim()) { toast.error("URL wajib diisi"); return; }
    setPendingLinks((prev) => [...prev, { url: linkUrl.trim(), label: linkLabel.trim() || linkUrl.trim() }]);
    setLinkUrl("");
    setLinkLabel("");
  }

  function removePendingLink(index) {
    setPendingLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function addTask() {
    if (!tTitle.trim()) { toast.error("Judul task wajib diisi."); return; }
    setTSubmitting(true);
    try {
      const res = await pmApi.createTask(monthlyId, {
        title: tTitle.trim(), desc: tDesc.replace(/<[^>]*>/g, "").trim() ? tDesc : null,
        startdate: tStart || null, enddate: tEnd || null,
        status: tStatus, priority: tPriority,
        assignee_ids: tAssignees,
      });

      const newTaskId = res.id;
      if (newTaskId) {
        // Upload pending files
        if (pendingFiles.length > 0) {
          try {
            await pmApi.uploadEvidence(newTaskId, pendingFiles);
          } catch (uploadErr) {
            toast.error(`Task ditambahkan, tapi gagal upload file: ${uploadErr.message}`);
          }
        }
        // Save pending links
        for (const link of pendingLinks) {
          try {
            await pmApi.addEvidenceLink(newTaskId, link);
          } catch (linkErr) {
            toast.error(`Gagal menyimpan link: ${linkErr.message}`);
          }
        }
      }

      toast.success("Task berhasil ditambahkan");
      onAdded();
      onClose();
    } catch (e) {
      toast.error(e?.message || "Gagal tambah task");
    } finally { setTSubmitting(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[95dvh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="h-1 w-10 bg-slate-200 rounded-full mx-auto mt-3 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="text-slate-800 font-extrabold text-sm">Tambah Task Baru</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Isi detail dan assign ke anggota tim</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { if (!tSubmitting) onClose(); }}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition shrink-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <FieldLabel>
              Judul Task <span className="text-rose-400 normal-case font-normal tracking-normal">*</span>
            </FieldLabel>
            <input
              className={`${inputClass} h-10`}
              value={tTitle}
              onChange={(e) => setTTitle(e.target.value)}
              placeholder="Nama task..."
              disabled={tSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Deskripsi</FieldLabel>
            <RichTextEditor
              value={tDesc}
              onChange={setTDesc}
              placeholder="Jelaskan apa yang perlu dikerjakan..."
            />
          </div>

          {/* Priority */}
          <div>
            <FieldLabel>Prioritas</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  disabled={tSubmitting}
                  onClick={() => setTPriority(p.key)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${tPriority === p.key
                    ? "bg-slate-800 border-slate-800 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${p.dot}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <FieldLabel>Status</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {STATUS_LIST.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  disabled={tSubmitting}
                  onClick={() => setTStatus(s.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${tStatus === s.key
                    ? "bg-slate-800 border-slate-800 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div>
            <FieldLabel>Tanggal</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10.5px] font-semibold text-slate-400 mb-2">Mulai</p>
                <input
                  type="date"
                  className={`${inputClass} h-9 px-3`}
                  value={tStart}
                  onChange={(e) => setTStart(e.target.value)}
                  disabled={tSubmitting}
                />
              </div>
              <div>
                <p className="text-[10.5px] font-semibold text-slate-400 mb-2">
                  Due Date <span className="text-rose-400">*</span>
                </p>
                <input
                  type="date"
                  className={`${inputClass} h-9 px-3`}
                  value={tEnd}
                  onChange={(e) => setTEnd(e.target.value)}
                  disabled={tSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <FieldLabel>
              PIC / Assigned To{" "}
              {isStaff && (
                <span className="text-slate-400 normal-case font-normal tracking-normal">
                  (kamu otomatis termasuk)
                </span>
              )}
            </FieldLabel>
            <AssigneeMultiSelect
              employees={employees}
              selected={tAssignees}
              onChange={setTAssignees}
              disabled={tSubmitting}
              selfId={employee?.employee_id}
              isStaff={isStaff}
            />
          </div>

          {/* ── Evidence: Links + Files ── */}
          <div>
            <FieldLabel>
              Lampiran &amp; Link{" "}
              <span className="text-slate-400 normal-case font-normal tracking-normal">(opsional)</span>
            </FieldLabel>

            {/* Pending links */}
            <div className="space-y-2 mb-3">
              {pendingLinks.length > 0 && (
                <div className="space-y-1.5">
                  {pendingLinks.map((link, idx) => (
                    <div
                      key={`link-${idx}`}
                      className="flex items-center gap-2.5 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 group"
                    >
                      <div className="h-7 w-7 rounded-md flex items-center justify-center text-sm shrink-0 bg-blue-100 text-blue-700">
                        🔗
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-blue-700 truncate">{link.label}</div>
                        {link.label !== link.url && (
                          <div className="text-[10px] text-slate-400 truncate">{link.url}</div>
                        )}
                      </div>
                      {!tSubmitting && (
                        <button
                          type="button"
                          onClick={() => removePendingLink(idx)}
                          className="h-6 w-6 rounded-md border border-rose-200 bg-white hover:bg-rose-50 flex items-center justify-center text-rose-500 text-[10px] transition shrink-0"
                          title="Hapus"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Link input */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={tSubmitting}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                  />
                  <input
                    type="text"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="Label (opsional)"
                    disabled={tSubmitting}
                    className="w-full h-7 rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={addPendingLink}
                  disabled={tSubmitting || !linkUrl.trim()}
                  className="h-8 px-2.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-500 disabled:opacity-40 transition flex items-center gap-1 shrink-0"
                >
                  🔗 Tambah
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 mb-3" />

            {/* File drop zone */}
            <div
              className={[
                "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 text-center transition cursor-pointer",
                tSubmitting
                  ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white",
              ].join(" ")}
              onClick={() => !tSubmitting && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (tSubmitting) return;
                if (e.dataTransfer?.files?.length) {
                  handleFileSelect({ target: { files: e.dataTransfer.files } });
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED}
                className="hidden"
                onChange={handleFileSelect}
                disabled={tSubmitting}
              />
              <span className="text-xl">📎</span>
              <div>
                <span className="text-xs font-semibold text-slate-600">Klik atau drag & drop file</span>
                <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, PDF, DOCX, XLSX, ZIP · maks 20 MB</p>
              </div>
            </div>

            {/* Pending file list */}
            {pendingFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {pendingFiles.map((file, idx) => {
                  const icon = fileIcon(file.type, file.name);
                  const color = iconColorMap[icon] || iconColorMap.FILE;
                  return (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 group"
                    >
                      <div className={`h-7 w-7 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 ${color}`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-700 truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-400">{formatBytes(file.size)}</div>
                      </div>
                      {!tSubmitting && (
                        <button
                          type="button"
                          onClick={() => removePendingFile(idx)}
                          className="h-6 w-6 rounded-md border border-rose-200 bg-white hover:bg-rose-50 flex items-center justify-center text-rose-500 text-[10px] transition shrink-0"
                          title="Hapus"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(pendingFiles.length > 0 || pendingLinks.length > 0) && (
              <p className="text-[10px] text-slate-400 pl-1 mt-1.5">
                {pendingLinks.length > 0 && `${pendingLinks.length} link`}
                {pendingLinks.length > 0 && pendingFiles.length > 0 && " + "}
                {pendingFiles.length > 0 && `${pendingFiles.length} file`}
                {" "}akan disimpan saat task dibuat
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-3">
          <p className="flex-1 text-[10.5px] text-slate-400 hidden sm:block">
            Field bertanda <span className="text-rose-400">*</span> wajib diisi
          </p>
          <button
            type="button"
            onClick={() => { if (!tSubmitting) onClose(); }}
            className="h-9 px-5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-100 transition"
            disabled={tSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={addTask}
            className="h-9 px-5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-2"
            disabled={tSubmitting}
          >
            {tSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Task
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};