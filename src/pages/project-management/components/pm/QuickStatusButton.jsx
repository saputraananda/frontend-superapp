import { useState, useRef, useEffect } from "react";
import { pmApi } from "../../pmApi";
import { toast } from "../../hooks/useToast";
import { STATUS_LIST, statusOf } from "../../constants/pmConstants";

export const QuickStatusButton = ({ task, onUpdated }) => {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const ref                   = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function changeStatus(e, newStatus) {
    e.stopPropagation();
    if (newStatus === task.status) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    try {
      await pmApi.updateTask(task.id, { status: newStatus });
      toast.success("Status diperbarui");
      onUpdated?.();
    } catch (err) {
      toast.error(err?.message || "Gagal ubah status");
    } finally {
      setLoading(false);
    }
  }

  const current = statusOf(task.status);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={loading}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={[
          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold transition",
          current.pill,
          loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80",
        ].join(" ")}
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${current.dot}`} />
        {loading ? "..." : current.label}
        {!loading && <span className="opacity-60 text-[9px]">▾</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
          {STATUS_LIST.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={(e) => changeStatus(e, s.key)}
              className={[
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition hover:bg-slate-50",
                s.key === task.status ? "bg-slate-50 font-semibold" : "",
              ].join(" ")}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
              <span className="text-slate-700">{s.label}</span>
              {s.key === task.status && <span className="ml-auto text-slate-400 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};