import { useEffect, useState } from "react";
import { api } from "../../../../../lib/api";
import useCutoffPeriod from "../../../hooks/useCutoffPeriod";

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function fmtIDR(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val) || 0);
}

export function fmtNum(val) {
  return new Intl.NumberFormat("id-ID").format(Number(val) || 0);
}

export function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export const EVENT_TRANSACTIONS_PATH = "/my-waschen/event/transactions";

export function eventLabel(ev) {
  return `${ev.full_name || ev.name}${ev.event_active ? "" : " (selesai)"}`;
}

/** Daftar outlet event (mst_outlet.is_event = 1), yang sedang berjalan dulu. */
export function useEventOutlets() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    api("/waschen/event/outlets")
      .then((res) => setEvents(res.data || []))
      .catch(() => setEvents([]));
  }, []);
  return events;
}

/**
 * Filter periode untuk halaman event. Default langsung periode cutoff berjalan
 * (tahun & bulan terisi otomatis); opsi "Semua periode" tetap tersedia.
 */
export function useEventPeriod() {
  const cutoff = useCutoffPeriod();
  const [allPeriods, setAllPeriods] = useState(false);
  return {
    cutoff,
    allPeriods,
    setAllPeriods,
    dateFrom: allPeriods ? "" : cutoff.dateFrom,
    dateTo: allPeriods ? "" : cutoff.dateTo,
  };
}
