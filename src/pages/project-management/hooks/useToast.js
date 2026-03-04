import { useState, useEffect, useCallback } from "react";

let toastListeners = [];
let toastCounter = 0;

export function emitToast(toast) {
  toastListeners.forEach((fn) => fn(toast));
}

export const toast = {
  success: (msg) => emitToast({ type: "success", message: msg }),
  error:   (msg) => emitToast({ type: "error",   message: msg }),
  info:    (msg) => emitToast({ type: "info",    message: msg }),
  warning: (msg) => emitToast({ type: "warning", message: msg }),
};

export function useToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => setToasts((prev) => [...prev, { ...t, id: ++toastCounter }]);
    toastListeners.push(handler);
    return () => { toastListeners = toastListeners.filter((fn) => fn !== handler); };
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, remove };
}