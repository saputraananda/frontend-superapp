import ReactDOM from "react-dom";
import { useState, useEffect } from "react";
import { FiInfo, FiCheckCircle, FiAlertTriangle, FiTrash2 } from "react-icons/fi";
import { modalListeners, resolveModal } from "../../hooks/useModal";

export const ModalDialog = () => {
  const [modal, setModal] = useState({ open: false });

  useEffect(() => {
    const handler = (m) => setModal((prev) => ({ ...prev, ...m }));
    modalListeners.push(handler);
    return () => { modalListeners.splice(modalListeners.indexOf(handler), 1); };
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape" && modal.open) resolveModal(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal.open]);

  if (!modal.open) return null;

  const isConfirm = modal.type === "confirm";
  const iconMap = {
    info:    { icon: <FiInfo size={22} />,          bg: "bg-blue-100",    text: "text-blue-600",    btn: "bg-blue-600 hover:bg-blue-700 text-white" },
    success: { icon: <FiCheckCircle size={22} />,   bg: "bg-emerald-100", text: "text-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    warning: { icon: <FiAlertTriangle size={22} />, bg: "bg-amber-100",   text: "text-amber-600",   btn: "bg-amber-500 hover:bg-amber-600 text-white" },
    danger:  { icon: <FiTrash2 size={22} />,        bg: "bg-rose-100",    text: "text-rose-600",    btn: "bg-rose-600 hover:bg-rose-700 text-white" },
  };
  const ic = isConfirm && modal.danger ? iconMap.danger : iconMap[modal.alertType || "info"];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={() => resolveModal(false)}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
        style={{ animation: "modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={(e) => e.stopPropagation()}>
        <style>{`@keyframes modalPop { from { opacity:0; transform:scale(0.85) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className={`h-14 w-14 rounded-2xl ${ic.bg} ${ic.text} flex items-center justify-center mb-4`}>{ic.icon}</div>
          <div className="text-slate-900 font-bold text-base mb-1.5">{modal.title}</div>
          {modal.message && <div className="text-slate-500 text-sm leading-relaxed">{modal.message}</div>}
        </div>
        <div className={`px-6 pb-6 flex gap-2.5 ${isConfirm ? "" : "justify-center"}`}>
          {isConfirm ? (
            <>
              <button onClick={() => resolveModal(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-all active:scale-95">
                Batal
              </button>
              <button onClick={() => resolveModal(true)}
                className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all active:scale-95 ${ic.btn}`}>
                {modal.confirmLabel || "Ya"}
              </button>
            </>
          ) : (
            <button onClick={() => resolveModal(true)}
              className={`h-10 px-8 rounded-xl text-sm font-bold transition-all active:scale-95 ${ic.btn}`}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};