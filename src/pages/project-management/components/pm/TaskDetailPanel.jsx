import { useState } from "react";
import { Card } from "../ui/Card";
import { SectionLabel } from "../ui/SectionLabel";
import { Tag } from "../ui/Tag";
import { EmployeeChip } from "../ui/EmployeeChip";
import { AssigneeMultiSelect } from "./AssigneeMultiSelect";
import { STATUS_LIST, PRIORITY_LIST, statusOf, priorityOf } from "../../constants/pmConstants";
import { fmtDate, fmtDateTime, isOverdue, initials } from "../../utils/pmUtils"; // ← tambah fmtDateTime

/* ─── Tab definitions ───────────────────────────────────────────── */
const TABS = [
  { key: "detail", label: "Detail" },
  { key: "evidence", label: "Evidence" },
  { key: "comments", label: "Komentar" },
];

/* ─── Main Component ─────────────────────────────────────────────── */
export const TaskDetailPanel = ({ board, EvidencePanel }) => {
  const [tab, setTab] = useState("detail");
  const { selected, loading } = board;

  if (loading) return (
    <div className="lg:col-span-7 space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}
    </div>
  );

  if (!selected) return (
    <div className="lg:col-span-7">
      <Card className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-5xl mb-4">📋</span>
        <div className="text-slate-700 font-semibold text-base">Pilih task untuk melihat detail</div>
        <div className="text-slate-400 text-sm mt-1.5">Klik salah satu task di sebelah kiri</div>
      </Card>
    </div>
  );

  const statusInfo = statusOf(selected.status);
  const priorityInfo = priorityOf(selected.priority);
  const over = isOverdue(selected.enddate, selected.status);

  const isAssignedToMe = selected.assignees?.some(
    (a) => a.employee_id === board.employee?.employee_id
  );

  // Staff yang di-assign ke task = punya akses penuh seperti supervisor
  const canEdit = !board.isStaff || isAssignedToMe;
  const canDelete = !board.isStaff || isAssignedToMe; // ← sama seperti canEdit

  return (
    <div className="lg:col-span-7 space-y-4">
      {/* Header Card */}
      <Card className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {board.editMode ? (
              <input
                value={board.eTitle}
                onChange={(e) => board.setETitle(e.target.value)}
                className="w-full text-lg font-bold text-slate-900 bg-transparent border-b-2 border-slate-300 focus:border-slate-700 outline-none pb-1 transition"
                placeholder="Judul task..."
              />
            ) : (
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{selected.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!board.editMode ? (
              <>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => board.setEditMode(true)}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition"
                  >
                    ✏ Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={board.deleteTask}
                    className="h-8 px-3 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-500 transition"
                  >
                    🗑 Hapus
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { board.setEditMode(false); board.selectTask(selected); }}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition"
                  disabled={board.updating}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={board.updateTask}
                  disabled={board.updating}
                  className="h-8 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {board.updating
                    ? <><span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menyimpan...</>
                    : "💾 Simpan"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status + Priority badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Tag className={statusInfo.pill}>{statusInfo.label}</Tag>
          <Tag className={priorityInfo.pill}>{priorityInfo.label}</Tag>
          {over && <Tag className="bg-rose-600 text-white">⚠ Overdue</Tag>}
          {selected.link && (
            <a href={selected.link} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
              🔗 Link
            </a>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              "px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px",
              tab === t.key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Detail */}
      {tab === "detail" && (
        <Card className="p-5 space-y-5">
          {/* Description */}
          <div>
            <SectionLabel>Deskripsi</SectionLabel>
            {board.editMode ? (
              <textarea
                value={board.eDesc}
                onChange={(e) => board.setEDesc(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 resize-none transition"
                placeholder="Tambahkan deskripsi..."
              />
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selected.desc || <span className="text-slate-400 italic">Tidak ada deskripsi.</span>}
              </p>
            )}
          </div>

          {/* Link */}
          {board.editMode && (
            <div>
              <SectionLabel>Link</SectionLabel>
              <input
                type="url"
                value={board.eLink}
                onChange={(e) => board.setELink(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition"
                placeholder="https://..."
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SectionLabel>Start Date</SectionLabel>
              {board.editMode ? (
                <input type="date" value={board.eStart} onChange={(e) => board.setEStart(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition" />
              ) : (
                <div className="text-sm font-medium text-slate-800">{fmtDate(selected.startdate)}</div>
              )}
            </div>
            <div>
              <SectionLabel>Due Date</SectionLabel>
              {board.editMode ? (
                <input type="date" value={board.eEnd} onChange={(e) => board.setEEnd(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition" />
              ) : (
                <div className={["text-sm font-medium", over ? "text-rose-600" : "text-slate-800"].join(" ")}>
                  {fmtDate(selected.enddate)}
                  {over && <span className="ml-2 text-xs font-semibold text-rose-500">(Overdue)</span>}
                </div>
              )}
            </div>
          </div>

          {/* Status + Priority (edit mode) */}
          {board.editMode && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionLabel>Status</SectionLabel>
                <select value={board.eStatus} onChange={(e) => board.setEStatus(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 transition">
                  {STATUS_LIST.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <SectionLabel>Priority</SectionLabel>
                <select value={board.ePriority} onChange={(e) => board.setEPriority(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 transition">
                  {PRIORITY_LIST.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── Owner Task ── */}
          <div>
            <SectionLabel>Owner Task</SectionLabel>
            {selected.owner_name ? (
              <EmployeeChip
                id={selected.owner_employee_id}
                name={selected.owner_name}
                email={selected.owner_email}
                colorClass="bg-slate-700"
                badge="Owner"
              />
            ) : (
              <span className="text-xs text-slate-400 italic">Tidak ada owner</span>
            )}
          </div>

          {/* Assignees */}
          <div>
            <SectionLabel>Assigned To</SectionLabel>
            {board.editMode ? (
              <AssigneeMultiSelect
                employees={board.employees}
                selected={board.eAssignees}
                onChange={board.setEAssignees}
                selfId={board.employee?.employee_id}
                isStaff={board.isStaff}
              />
            ) : selected.assignees?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {selected.assignees.map((a) => (
                  <div
                    key={a.employee_id}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
                  >
                    <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {initials(a.full_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
                        {a.full_name?.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || `#${a.employee_id}`}
                      </div>
                      {a.email && (
                        <div className="text-[10px] text-slate-400 truncate leading-tight">{a.email}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">Belum ada assignee.</div>
            )}
          </div>
        </Card>
      )}

      {/* Tab: Evidence */}
      {tab === "evidence" && (
        <Card className="p-5">
          <EvidencePanel
            taskId={selected.id}
            // staff assigned bisa upload, tapi hanya supervisor/direktur yang bisa delete
            canDelete={canDelete}
          />
        </Card>
      )}

      {/* Tab: Komentar */}
      {tab === "comments" && (
        <Card className="p-5 space-y-4">
          {/* Comment list */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {board.comments.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl">💬</span>
                <p className="text-sm text-slate-400 mt-2">Belum ada komentar.</p>
              </div>
            ) : (
              board.comments.map((c) => {
                const isMe = c.employee_id === board.employee?.employee_id;
                // ← CapitalEachWord untuk nama karyawan
                const displayName = (c.full_name || c.author || "")
                  .toLowerCase()
                  .split(" ")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");

                return (
                  <div key={c.id} className={["flex gap-2.5", isMe ? "flex-row-reverse" : ""].join(" ")}>
                    <div className={[
                      "h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-1",
                      isMe ? "bg-slate-800 text-white" : "bg-blue-700 text-white",
                    ].join(" ")}>
                      {initials(c.full_name || c.author)}
                    </div>
                    <div className={["max-w-[75%] flex flex-col", isMe ? "items-end" : "items-start"].join(" ")}>
                      {/* Nama pengirim */}
                      <div className={[
                        "text-[10px] font-semibold mb-1 text-slate-500",
                        isMe ? "text-right" : "",
                      ].join(" ")}>
                        {isMe ? "Kamu" : displayName} {/* ← pakai displayName */}
                      </div>

                      {/* Bubble komentar */}
                      <div className={[
                        "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                        isMe
                          ? "bg-slate-900 text-white rounded-tr-sm"
                          : "bg-slate-100 text-slate-800 rounded-tl-sm",
                      ].join(" ")}>
                        {c.comment || c.text}
                      </div>

                      {/* ← Timestamp pakai fmtDateTime + tooltip tanggal lengkap */}
                      <div
                        className={["text-[10px] text-slate-400 mt-1 flex items-center gap-1", isMe ? "flex-row-reverse" : ""].join(" ")}
                        title={c.created_at ? new Date(c.created_at).toLocaleString("id-ID") : ""}
                      >
                        <span>🕐</span>
                        <span>{c.created_at ? fmtDateTime(c.created_at) : "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input comment */}
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <div className="h-7 w-7 rounded-md bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
              {initials(board.employee?.full_name)}
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                value={board.commentText}
                onChange={(e) => board.setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    board.addComment();
                  }
                }}
                placeholder="Tulis komentar... (Enter untuk kirim)"
                rows={2}
                disabled={board.sendingComment}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 resize-none transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={board.addComment}
                disabled={board.sendingComment || !board.commentText.trim()}
                className="h-9 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-40 transition self-end flex items-center gap-1.5"
              >
                {board.sendingComment
                  ? <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : "Send"}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};