import ReactDOM from "react-dom";
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo, FiX } from "react-icons/fi";
import { useEffect } from "react";
import { useToast } from "../../hooks/useToast";

const ToastItem = ({ toast: t, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(t.id), 4000);
    return () => clearTimeout(timer);
  }, [t.id, onRemove]);

  const configs = {
    success: { icon: <FiCheckCircle size={16} />, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", icon_cls: "text-emerald-600" },
    error:   { icon: <FiXCircle size={16} />,    bg: "bg-rose-50 border-rose-200",       text: "text-rose-800",    icon_cls: "text-rose-600" },
    warning: { icon: <FiAlertTriangle size={16} />, bg: "bg-amber-50 border-amber-200",  text: "text-amber-800",   icon_cls: "text-amber-600" },
    info:    { icon: <FiInfo size={16} />,        bg: "bg-blue-50 border-blue-200",       text: "text-blue-800",    icon_cls: "text-blue-600" },
  };
  const cfg = configs[t.type] || configs.info;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${cfg.bg}`}
      style={{ animation: "slideInRight 0.3s ease-out" }}>
      <span className={`shrink-0 mt-0.5 ${cfg.icon_cls}`}>{cfg.icon}</span>
      <p className={`flex-1 text-sm font-medium leading-snug ${cfg.text}`}>{t.message}</p>
      <button onClick={() => onRemove(t.id)} className={`shrink-0 opacity-50 hover:opacity-100 transition ${cfg.text}`}>
        <FiX size={14} />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, remove } = useToast();
  if (!toasts.length) return null;
  return ReactDOM.createPortal(
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <style>{`@keyframes slideInRight { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:translateX(0); } }`}</style>
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={remove} />
        </div>
      ))}
    </div>,
    document.body
  );
};