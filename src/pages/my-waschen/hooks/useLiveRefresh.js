import { useEffect, useRef } from "react";

/** Muat ulang diam-diam tiap 5 detik, dan saat tab browser kembali aktif. */
export default function useLiveRefresh(refresh) {
  const ref = useRef(refresh);
  ref.current = refresh;

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      ref.current?.();
    };
    const id = window.setInterval(tick, 5000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
}
