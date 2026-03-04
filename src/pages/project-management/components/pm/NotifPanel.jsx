import { useState, useEffect, useCallback } from "react";
import { pmApi } from "../../pmApi";
import { toast } from "../../hooks/useToast";
import { fmtDate } from "../../utils/pmUtils";

const NOTIF_ICONS = {
  task_assigned:       { icon: "📋", bg: "bg-blue-50",    border: "border-blue-200",    dot: "bg-blue-500"    },
  status_changed:      { icon: "🔄", bg: "bg-amber-50",   border: "border-amber-200",   dot: "bg-amber-500"   },
  comment_added:       { icon: "💬", bg: "bg-slate-50",   border: "border-slate-200",   dot: "bg-slate-400"   },
  task_overdue:        { icon: "⚠️", bg: "bg-rose-50",    border: "border-rose-200",    dot: "bg-rose-500"    },
  evidence_uploaded:   { icon: "📎", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  task_completed:      { icon: "✅", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  revision_required:   { icon: "✏️", bg: "bg-rose-50",    border: "border-rose-200",    dot: "bg-rose-500"    },
  default:             { icon: "🔔", bg: "bg-slate-50",   border: "border-slate-200",   dot: "bg-slate-400"   },
};

const notifStyle = (type) => NOTIF_ICONS[type] || NOTIF_ICONS.default;

export const NotifPanel = ({ open, onClose }) => {
  const [notifs, setNotifs]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [marking, setMarking]   = useState(false);
  const [filter, setFilter]     = useState("all"); // "all" | "unread"

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
    if (open) load();
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
      await pmApi.markAllNotifsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("Semua notifikasi ditandai dibaca");
    } catch {
      toast.error("Gagal menandai semua notifikasi");
    } finally {
      setMarking(false);
    }
  }

  const displayed = filter === "unread"
    ? notifs.filter((n) => !n.is_read)
    : notifs;

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col border-l border-slate-200"
        style={{ animation: "slideInRight 0.25s ease-out" }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              🔔 Notifikasi
              {unreadCount > 0 && (
                <span className="h-5 min-w-[20px] rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center px-1.5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{notifs.length} total notifikasi</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Filter + Mark all */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-xs font-semibold">
            {["all", "unread"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "px-3 py-1.5 transition capitalize",
                  filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50",
                ].join(" ")}
              >
                {f === "all" ? "Semua" : `Belum Dibaca (${unreadCount})`}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={marking}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition disabled:opacity-50"
            >
              {marking ? "..." : "Tandai semua"}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {loading ? (
            <div className="space-y-2 px-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <span className="text-4xl mb-3">🔕</span>
              <p className="text-slate-600 font-semibold">Tidak ada notifikasi</p>
              <p className="text-slate-400 text-xs mt-1">
                {filter === "unread" ? "Semua notifikasi sudah dibaca." : "Belum ada notifikasi masuk."}
              </p>
            </div>
          ) : (
            displayed.map((n) => {
              const style = notifStyle(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={[
                    "relative flex gap-3 rounded-xl border px-3.5 py-3 transition cursor-pointer",
                    style.bg, style.border,
                    !n.is_read ? "shadow-sm hover:shadow-md" : "opacity-70 hover:opacity-90",
                  ].join(" ")}
                >
                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className={`absolute top-3 right-3 h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                  )}

                  {/* Icon */}
                  <div className="h-9 w-9 rounded-xl bg-white border border-white/80 shadow-sm flex items-center justify-center text-base shrink-0 mt-0.5">
                    {style.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    {n.title && (
                      <div className={["text-sm leading-snug mb-0.5", !n.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-700"].join(" ")}>
                        {n.title}
                      </div>
                    )}
                    {n.message && (
                      <div className="text-xs text-slate-500 leading-relaxed line-clamp-2">{n.message}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      {n.created_at ? fmtDate(n.created_at) : "—"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="w-full h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="h-3 w-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Memuat...</>
              : "🔄 Refresh"}
          </button>
        </div>
      </div>
    </>
  );
};