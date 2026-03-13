import { useState, useRef } from "react";
import { Card } from "../ui/Card";
import { SectionLabel } from "../ui/SectionLabel";
import { Tag } from "../ui/Tag";
import { EmployeeChip } from "../ui/EmployeeChip";
import { AssigneeMultiSelect } from "./AssigneeMultiSelect";
import { STATUS_LIST, PRIORITY_LIST, statusOf, priorityOf } from "../../constants/pmConstants";
import { fmtDate, fmtDateTime, isOverdue, initials } from "../../utils/pmUtils";
import RichTextEditor from "../../../../components/RichTextEditor";

/* ─── Tab definitions ───────────────────────────────────────────── */
const TABS = [
  { key: "detail", label: "Detail" },
  { key: "evidence", label: "Evidence" },
  { key: "comments", label: "Komentar" },
];

/* ─── Main Component ─────────────────────────────────────────────── */
export const TaskDetailPanel = ({ board, EvidencePanel }) => {
  // ── SEMUA hooks harus di sini, sebelum return apapun ──
  const [tab, setTab] = useState("detail");
  const [mentionedIds, setMentionedIds] = useState([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen]   = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef(null);

  const { selected, loading } = board;

  // ← Early returns SETELAH semua hooks
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

  /** Render teks komentar, highlight @Nama */
  function renderCommentText(text = "") {
    return text.split(/(@[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/g).map((part, i) =>
      part.startsWith("@")
        ? <span key={i} className="text-blue-400 font-semibold">{part}</span>
        : <span key={i}>{part}</span>
    );
  }

  function onCommentChange(e) {
    const val = e.target.value;
    board.setCommentText(val);
    const caret = e.target.selectionStart;
    const textBefore = val.slice(0, caret);
    const match = textBefore.match(/@(\S*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionOpen(true);
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }

  function selectMention(emp) {
    const caret = textareaRef.current?.selectionStart ?? board.commentText.length;
    const val = board.commentText;
    const textBefore = val.slice(0, caret);
    const match = textBefore.match(/@(\S*)$/);
    const before = match ? val.slice(0, caret - match[0].length) : val.slice(0, caret);
    const after = val.slice(caret);
    const displayName = toDisplayName(emp.full_name);
    board.setCommentText(before + `@${displayName} ` + after);
    setMentionedIds((prev) => [...new Set([...prev, emp.employee_id])]);
    setMentionOpen(false);
    setMentionQuery("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function onCommentKeyDown(e) {
    if (mentionOpen && mentionList.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionList.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionList.length) % mentionList.length); return; }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); selectMention(mentionList[mentionIndex]); return; }
      if (e.key === "Escape")    { setMentionOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && !mentionOpen) {
      e.preventDefault();
      handleSendComment();
    }
  }

  function handleSendComment() {
    board.addComment(mentionedIds);
    setMentionedIds([]);
  }

  const toDisplayName = (str = "") =>
    str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const mentionList = mentionQuery.length > 0
    ? (board.employees || [])
        .filter((e) => toDisplayName(e.full_name).toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 6)
    : [];

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
              <RichTextEditor
                value={board.eDesc}
                onChange={board.setEDesc}
                placeholder="Tambahkan deskripsi..."
              />
            ) : selected.desc ? (
              <div
                className="
                  text-sm text-slate-600 leading-relaxed
                  [&_strong]:font-bold [&_b]:font-bold
                  [&_em]:italic [&_i]:italic
                  [&_u]:underline
                  [&_s]:line-through
                  [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mt-3 [&_h2]:mb-1
                  [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-2 [&_h3]:mb-1
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                  [&_li]:my-0.5
                  [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_blockquote]:italic [&_blockquote]:my-2
                  [&_pre]:bg-slate-800 [&_pre]:text-slate-100 [&_pre]:rounded [&_pre]:p-3 [&_pre]:my-2 [&_pre]:text-xs [&_pre]:overflow-x-auto
                  [&_hr]:border-slate-300 [&_hr]:my-3
                  [&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer
                  [&_p]:mb-1
                "
                dangerouslySetInnerHTML={{ __html: selected.desc }}
              />
            ) : (
              <span className="text-sm text-slate-400 italic">Tidak ada deskripsi.</span>
            )}
          </div>

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

          {/* ── Attachments (saat edit mode) ── */}
          {board.editMode && (
            <div>
              <SectionLabel>Lampiran / Evidence</SectionLabel>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <EvidencePanel
                  taskId={selected.id}
                  canDelete={canDelete}
                  onChanged={() => board.load()}
                />
              </div>
            </div>
          )}
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
                        {renderCommentText(c.comment || c.text || "")}
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
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={board.commentText}
                  onChange={onCommentChange}
                  onKeyDown={onCommentKeyDown}
                  placeholder="Tulis komentar... ketik @ untuk mention"
                  rows={2}
                  disabled={board.sendingComment}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300 resize-none transition disabled:opacity-50"
                />

                {/* Mention dropdown */}
                {mentionOpen && mentionList.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 border-b border-slate-100 uppercase tracking-wide">
                      Tag Karyawan
                    </div>
                    {mentionList.map((emp, idx) => (
                      <button
                        key={emp.employee_id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectMention(emp); }}
                        className={[
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50 transition",
                          idx === mentionIndex ? "bg-blue-50" : "",
                        ].join(" ")}
                      >
                        <div className="h-6 w-6 rounded-md bg-blue-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                          {initials(emp.full_name)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{toDisplayName(emp.full_name)}</div>
                          {emp.job_level_name && <div className="text-[10px] text-slate-400">{emp.job_level_name}</div>}
                        </div>
                      </button>
                    ))}
                    <div className="px-3 py-1 text-[10px] text-slate-400 border-t border-slate-100">
                      ↑↓ navigasi · Enter pilih · Esc tutup
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleSendComment}
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