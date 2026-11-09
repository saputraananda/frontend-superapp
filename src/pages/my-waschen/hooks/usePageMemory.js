import { useLayoutEffect, useRef, useState } from "react";
import { useNavigationType } from "react-router-dom";

const PREFIX = "mw-page:";
const SCROLLER_ID = "mw-content";

/**
 * Ingatan halaman list: filter, halaman, dan posisi scroll disimpan saat user membuka halaman detail,
 * lalu dipulihkan ketika kembali (navigasi POP / tombol back). Klik menu sidebar (PUSH) mulai dari awal.
 */
export function useSavedPage(key) {
  const navType = useNavigationType();
  const [saved] = useState(() => {
    if (navType !== "POP") return {};
    try {
      return JSON.parse(sessionStorage.getItem(PREFIX + key)) || {};
    } catch {
      return {};
    }
  });
  return saved;
}

/** Simpan state list + posisi scroll saat ini; panggil tepat sebelum navigate ke halaman detail. */
export function rememberPage(key, state = {}) {
  const scroller = document.getElementById(SCROLLER_ID);
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ ...state, scroll: scroller ? scroller.scrollTop : 0 }));
  } catch {
    /* sessionStorage tidak tersedia */
  }
}

/** Kembalikan scrollTop setelah data siap (`ready`), menunggu konten cukup tinggi. */
export function useRestoreScroll(y, ready, dep) {
  const pending = useRef(Number(y) || 0);
  useLayoutEffect(() => {
    const target = pending.current;
    if (!ready || !target) return undefined;
    const scroller = document.getElementById(SCROLLER_ID);
    if (!scroller || scroller.scrollHeight < target + 80) return undefined;
    const apply = () => { scroller.scrollTop = target; };
    apply();
    const frame = requestAnimationFrame(apply);
    const timer = setTimeout(() => {
      apply();
      if (Math.abs(scroller.scrollTop - target) < 8) pending.current = 0;
    }, 60);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [ready, dep]);
}
