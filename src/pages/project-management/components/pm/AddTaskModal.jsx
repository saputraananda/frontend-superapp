import { useState } from "react";
import { pmApi } from "../../pmApi";
import { toast } from "../../hooks/useToast";
import { STATUS_LIST, PRIORITY_LIST } from "../../constants/pmConstants";
import { AssigneeMultiSelect } from "./AssigneeMultiSelect";

export const AddTaskModal = ({ monthlyId, employees, employee, isStaff, onClose, onAdded }) => {
  const [tTitle, setTTitle]       = useState("");
  const [tDesc, setTDesc]         = useState("");
  const [tStart, setTStart]       = useState("");
  const [tEnd, setTEnd]           = useState("");
  const [tPriority, setTPriority] = useState("medium");
  const [tStatus, setTStatus]     = useState("assigned");
  const [tAssignees, setTAssignees] = useState(() =>
    isStaff && employee?.employee_id ? [employee.employee_id] : []
  );
  const [tLink, setTLink]           = useState("");
  const [tSubmitting, setTSubmitting] = useState(false);

  async function addTask() {
    if (!tTitle.trim()) { toast.error("Title task wajib diisi."); return; }
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => { if (!tSubmitting) onClose(); }}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div>
            <div className="text-white font-bold">Add Task</div>
            <div className="text-slate-400 text-xs mt-0.5">Tambah task ke monthly board ini</div>
          </div>
          <button type="button" onClick={() => { if (!tSubmitting) onClose(); }}
            className="h-8 w-8 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition font-bold">✕</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
            <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition"
              value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="Nama task..." disabled={tSubmitting} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</span>
            <textarea className="mt-1.5 min-h-[72px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition resize-none"
              value={tDesc} onChange={(e) => setTDesc(e.target.value)} disabled={tSubmitting} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Link (opsional)</span>
            <input type="url" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition"
              value={tLink} onChange={(e) => setTLink(e.target.value)} placeholder="https://..." disabled={tSubmitting} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Start Date</span>
              <input type="date" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400 transition"
                value={tStart} onChange={(e) => setTStart(e.target.value)} disabled={tSubmitting} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Due Date</span>
              <input type="date" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400 transition"
                value={tEnd} onChange={(e) => setTEnd(e.target.value)} disabled={tSubmitting} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority</span>
              <select className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition"
                value={tPriority} onChange={(e) => setTPriority(e.target.value)} disabled={tSubmitting}>
                {PRIORITY_LIST.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</span>
              <select className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition"
                value={tStatus} onChange={(e) => setTStatus(e.target.value)} disabled={tSubmitting}>
                {STATUS_LIST.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
              PIC / Assigned To
              {isStaff && <span className="text-slate-400 font-normal ml-1">(kamu otomatis termasuk)</span>}
            </span>
            <AssigneeMultiSelect
              employees={employees} selected={tAssignees} onChange={setTAssignees}
              disabled={tSubmitting} selfId={employee?.employee_id} isStaff={isStaff} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { if (!tSubmitting) onClose(); }}
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
              disabled={tSubmitting}>Batal</button>
            <button type="button" onClick={addTask}
              className="h-9 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition border border-slate-800"
              disabled={tSubmitting}>
              {tSubmitting
                ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating...</span>
                : "Add Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};