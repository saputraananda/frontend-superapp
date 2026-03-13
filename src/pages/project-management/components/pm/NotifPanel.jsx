import { useState, useEffect, useCallback } from "react";
import { pmApi } from "../../pmApi";
import { toast } from "../../hooks/useToast";
import { fmtDateTime } from "../../utils/pmUtils"; // ← ganti import
import { useNavigate } from "react-router-dom";

const NOTIF_ICONS = {
  task_assigned: { icon: "📋", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
  status_changed: { icon: "🔄", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
  comment_added: { icon: "💬", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
  task_overdue: { icon: "⚠️", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
  evidence_uploaded: { icon: "📎", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  task_completed: { icon: "✅", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  revision_required: { icon: "✏️", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
  mentioned: { icon: "🏷️", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  default: { icon: "🔔", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
};

const TYPE_LABELS = {
  task_assigned: "Ditugaskan",
  status_changed: "Status Berubah",
  comment_added: "Komentar",
  task_overdue: "Terlambat",
  evidence_uploaded: "Bukti Diunggah",
  task_completed: "Selesai",
  revision_required: "Revisi",
  mentioned: "Disebut",
};

const notifStyle = (type) => NOTIF_ICONS[type] || NOTIF_ICONS.default;

/** "ANANDA PRATHAMA SAPUTRA" → "Ananda Prathama Saputra" */
const toCapitalEachWord = (str = "") =>
  str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** Ganti nama karyawan UPPERCASE di teks notifikasi */
const formatMessage = (msg = "") =>
  msg.replace(/\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b/g, (match) => toCapitalEachWord(match));

export const NotifPanel = ({ open, onClose }) => {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState("all"); 
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const nav = useNavigate();

  function handleNotifClick(n) {
    if (!n.is_read) markRead(n.id); 
    if (n.task_id && n.monthly_id) {
      onClose();
      nav(`/projectmanagement/month/${n.monthly_id}?task=${n.task_id}`);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pmApi.listNotifications();
      setNotifs(res?.data || []);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) { load(); setShowDeleteAll(false); }
  }, [open, load]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape" && open) onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function markRead(id) {
    try {
      await pmApi.markNotifRead(id);
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      toast.error("Gagal menandai notifikasi");
    }
  }

  async function markAllRead() {
    setMarking(true);
    try {
      await pmApi.markAllNotifRead(); // ← fix: nama fungsi yang benar
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("Semua notifikasi ditandai dibaca ✓");
    } catch {
      toast.error("Gagal menandai semua notifikasi");
    } finally {
      setMarking(false);
    }
  }

  async function deleteOne(id, e) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await pmApi.deleteNotif(id);
      setNotifs((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notifikasi dihapus");
    } catch {
      toast.error("Gagal menghapus notifikasi");
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteAll() {
    setDeleting(true);
    try {
      await pmApi.deleteAllNotif();
      setNotifs([]);
      setShowDeleteAll(false);
      toast.success("Semua notifikasi dihapus");
    } catch {
      toast.error("Gagal menghapus semua notifikasi");
    } finally {
      setDeleting(false);
    }
  }

  const displayed = filter === "unread"
    ? notifs.filter((n) => !n.is_read)
    : notifs;

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const readCount = notifs.filter((n) => n.is_read).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col border-l border-slate-200"
        style={{ animation: "slideInRight 0.22s cubic-bezier(.4,0,.2,1)" }}
      >
        <style>{`
          @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .notif-item { transition: all 0.15s; }
          .notif-item:hover .notif-delete-btn { opacity: 1 !important; }
        `}</style>

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-base">
              🔔
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                Notifikasi
                {unreadCount > 0 && (
                  <span className="h-5 min-w-[20px] rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center px-1.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span>{notifs.length} total</span>
                {unreadCount > 0 && <><span>·</span><span className="text-amber-500 font-medium">{unreadCount} belum dibaca</span></>}
                {readCount > 0 && <><span>·</span><span className="text-slate-400">{readCount} dibaca</span></>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-xs font-semibold shadow-sm">
            {["all", "unread"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "px-3 py-1.5 transition-all",
                  filter === f
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                ].join(" ")}
              >
                {f === "all" ? "Semua" : `Belum Dibaca${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking}
                title="Tandai semua dibaca"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition disabled:opacity-40 px-2 py-1 rounded-md hover:bg-blue-50"
              >
                {marking ? "⏳" : "✓ Tandai semua"}
              </button>
            )}
            {notifs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAll((v) => !v)}
                title="Hapus notifikasi"
                className={[
                  "text-xs font-semibold transition px-2 py-1 rounded-md",
                  showDeleteAll
                    ? "bg-rose-100 text-rose-700"
                    : "text-slate-400 hover:text-rose-600 hover:bg-rose-50",
                ].join(" ")}
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* ── Delete All Confirmation bar ── */}
        {showDeleteAll && (
          <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-rose-700 font-medium">
              Hapus semua {notifs.length} notifikasi? Tindakan tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteAll(false)}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteAll}
                disabled={deleting}
                className="text-xs px-2.5 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 font-semibold transition disabled:opacity-50 flex items-center gap-1"
              >
                {deleting ? <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                {deleting ? "Menghapus..." : "Hapus Semua"}
              </button>
            </div>
          </div>
        )}

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {loading ? (
            <div className="space-y-2 px-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[72px] rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center py-10">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mb-4 shadow-inner">
                🔕
              </div>
              <p className="text-slate-700 font-semibold text-sm">Tidak ada notifikasi</p>
              <p className="text-slate-400 text-xs mt-1 max-w-[180px]">
                {filter === "unread"
                  ? "Semua notifikasi sudah dibaca."
                  : "Belum ada notifikasi masuk."}
              </p>
            </div>
          ) : (
            displayed.map((n) => {
              const style = notifStyle(n.type);
              const isDeleting = deletingId === n.id;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={[
                    "notif-item relative flex gap-3.5 rounded-xl border px-3.5 py-3.5 group",
                    style.bg, style.border,
                    (n.task_id && n.monthly_id) || !n.is_read
                      ? "shadow-sm cursor-pointer hover:shadow-md hover:brightness-[0.97]"
                      : "opacity-75 hover:opacity-90 cursor-default",
                    isDeleting ? "opacity-40 pointer-events-none" : "",
                  ].join(" ")}
                >
                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className={`absolute top-3.5 right-8 h-2 w-2 rounded-full shrink-0 ${style.dot} shadow`} />
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => deleteOne(n.id, e)}
                    disabled={isDeleting}
                    title="Hapus notifikasi ini"
                    className="notif-delete-btn absolute top-2 right-2 h-5 w-5 rounded-md bg-white/80 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 flex items-center justify-center text-[10px] opacity-0 transition-all shadow-sm"
                  >
                    {isDeleting ? "⏳" : "✕"}
                  </button>

                  {/* Icon */}
                  <div className="h-9 w-9 rounded-xl bg-white border border-white shadow-sm flex items-center justify-center text-base shrink-0 mt-0.5">
                    {style.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-5">
                    {/* Type badge */}
                    {n.type && TYPE_LABELS[n.type] && (
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold mb-1 ${style.badge}`}>
                        {TYPE_LABELS[n.type]}
                      </span>
                    )}

                    {/* Title */}
                    {n.title && (
                      <div className={[
                        "text-xs leading-snug mb-1",
                        !n.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-600",
                      ].join(" ")}>
                        {formatMessage(n.title)}
                      </div>
                    )}

                    {/* Message */}
                    {n.message && (
                      <div className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {formatMessage(n.message)}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2">  {/* ← dari mt-1.5 */}
                      <span
                        className="text-[10px] text-slate-400 font-medium"
                        title={n.created_at ? new Date(n.created_at).toLocaleString("id-ID") : ""}
                      >
                        🕐 {n.created_at ? fmtDateTime(n.created_at) : "—"} {/* ← ganti fmtDate → fmtDateTime */}
                      </span>
                      {(n.task_id && n.monthly_id) ? (
                        <span className="text-[10px] text-purple-500 font-semibold">🔗 Lihat task</span>
                      ) : !n.is_read ? (
                        <span className="text-[10px] text-blue-500 font-semibold">Klik untuk baca</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex-1 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading
              ? <><span className="h-3 w-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Memuat...</>
              : <><span>🔄</span> Refresh</>}
          </button>
          <div className="text-[10px] text-slate-400 text-right leading-tight">
            <div>{notifs.length} notif</div>
            <div>{unreadCount} belum dibaca</div>
          </div>
        </div>
      </div>
    </>
  );
};