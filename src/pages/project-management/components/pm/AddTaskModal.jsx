import { useState, useEffect } from "react";
import { pmApi } from "../../pmApi";
import { toast } from "../../hooks/useToast";
import { STATUS_LIST } from "../../constants/pmConstants";
import { AssigneeMultiSelect } from "./AssigneeMultiSelect";

const PRIORITY_OPTIONS = [
  { key: "critical", label: "Critical", dot: "bg-red-400" },
  { key: "medium", label: "Medium", dot: "bg-amber-400" },
  { key: "low", label: "Low", dot: "bg-emerald-400" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";

const FieldLabel = ({ children }) => (
  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
    {children}
  </label>
);

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
  const [tLink, setTLink] = useState("");
  const [tSubmitting, setTSubmitting] = useState(false);

  // Lock body scroll saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function addTask() {
    if (!tTitle.trim()) { toast.error("Judul task wajib diisi."); return; }
    setTSubmitting(true);
    try {
      await pmApi.createTask(monthlyId, {
        title: tTitle.trim(), desc: tDesc.trim() || null,
        startdate: tStart || null, enddate: tEnd || null,
        status: tStatus, priority: tPriority,
        assignee_ids: tAssignees, link: tLink.trim() || null,
      });
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
      onClick={() => { if (!tSubmitting) onClose(); }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[95dvh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
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
            <textarea
              className={`${inputClass} py-2.5 resize-none`}
              rows={3}
              value={tDesc}
              onChange={(e) => setTDesc(e.target.value)}
              placeholder="Jelaskan apa yang perlu dikerjakan..."
              disabled={tSubmitting}
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

          {/* Link */}
          <div>
            <FieldLabel>
              Link Referensi{" "}
              <span className="text-slate-400 normal-case font-normal tracking-normal">(opsional)</span>
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
              <input
                type="url"
                className={`${inputClass} h-10 pl-9`}
                value={tLink}
                onChange={(e) => setTLink(e.target.value)}
                placeholder="https://..."
                disabled={tSubmitting}
              />
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