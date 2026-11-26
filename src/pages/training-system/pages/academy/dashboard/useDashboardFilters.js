import { useState } from "react";
import { INITIAL_STATE, monthsOf, periodOf } from "./dashboardCompute";

/** Keadaan filter satu tab (ganti posisi mengosongkan jenis). */
export function useDashboardFilters(periods) {
  const p = periodOf(periods);
  const [st, setSt] = useState(() => (periods ? { ...INITIAL_STATE, year: p.lastYear, month: p.lastMonth } : INITIAL_STATE));
  const set = (patch) => setSt((prev) => ({ ...prev, ...patch }));
  return {
    st,
    set,
    setMonth: (month) => set({ month }),
    // Bulan terpilih yang tidak ada di tahun baru diganti ke bulan pertama yang tersedia.
    setYear: (year) => {
      const months = monthsOf(p, year);
      set({ year, month: months.includes(st.month) ? st.month : months[0] });
    },
    setPos: (pos) => set({ pos, training: "all" }),
    setTraining: (training) => set({ training }),
    setSource: (source) => set({ source }),
    setCab: (cab) => set({ cab }),
  };
}
