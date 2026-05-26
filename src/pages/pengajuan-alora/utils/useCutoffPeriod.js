/**
 * useCutoffPeriod
 *
 * Aturan cutoff perusahaan:
 *   - Periode "bulan X" = 26 (X-1) s/d 25 X
 *   - Contoh: Periode Mei 2026 = 26 Apr 2026 → 25 Mei 2026
 *
 * Default aktif = periode berjalan hari ini:
 *   - hari 1–25  → periode = bulan ini
 *   - hari 26–31 → periode = bulan DEPAN  (sudah masuk cutoff baru)
 *
 * Periode tersedia di-fetch dari server (berdasarkan data riil di DB),
 * bukan statis, sehingga dropdown tahun & bulan sesuai dengan data.
 */

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";

const MONTH_LABELS = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function monthLabel(m) { return MONTH_LABELS[Number(m)] || String(m); }

/** { year, month } periode cutoff berjalan berdasar tanggal hari ini */
export function currentCutoffPeriod() {
    const now = new Date();
    const day = now.getDate();
    if (day >= 26) {
        // sudah masuk cutoff bulan depan
        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { year: next.getFullYear(), month: next.getMonth() + 1 };
    }
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** date_from & date_to untuk periode (year, month) */
export function cutoffRange(year, month) {
    if (!year || !month) return { dateFrom: "", dateTo: "" };
    const y  = Number(year);
    const m  = Number(month);
    // 26 bulan sebelumnya
    const fromDate = new Date(y, m - 2, 26);   // month-2 karena Date() pakai 0-index
    // 25 bulan ini
    const toDate   = new Date(y, m - 1, 25);
    const fmt = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { dateFrom: fmt(fromDate), dateTo: fmt(toDate) };
}

/**
 * @param {"me"|"department"|"approval"} scope
 */
export default function useCutoffPeriod(scope = "department") {
    const defaultPeriod = useMemo(() => currentCutoffPeriod(), []);

    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedYear,  setSelectedYear]  = useState(defaultPeriod.year);
    const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.month);

    useEffect(() => {
        let cancel = false;
        (async () => {
            setLoading(true);
            try {
                const d = await api(`/pengajuan/periods?scope=${scope}`);
                if (!cancel) {
                    const list = (d.periods || []).map(p => ({
                        year:  Number(p.year),
                        month: Number(p.month),
                    }));
                    setPeriods(list);

                    // Jika default (bulan berjalan) ada → pakai itu
                    const match = list.find(
                        p => p.year === defaultPeriod.year && p.month === defaultPeriod.month
                    );
                    if (!match && list.length > 0) {
                        // Ambil periode paling baru dari server
                        setSelectedYear(list[0].year);
                        setSelectedMonth(list[0].month);
                    }
                    // Jika match → tetap di defaultPeriod (sudah di-state)
                }
            } catch {
                /* jaringan error — tetap pakai default */
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope]);

    // Tahun unik, urut descending
    const years = useMemo(() =>
        [...new Set(periods.map(p => p.year))].sort((a, b) => b - a),
    [periods]);

    // Bulan tersedia untuk tahun terpilih, urut ascending
    const months = useMemo(() =>
        periods
            .filter(p => p.year === selectedYear)
            .map(p => p.month)
            .sort((a, b) => a - b),
    [periods, selectedYear]);

    // Ganti tahun → otomatis pilih bulan terbaru yang ada
    const handleYearChange = (y) => {
        const yr = Number(y);
        setSelectedYear(yr);
        const avail = periods
            .filter(p => p.year === yr)
            .map(p => p.month)
            .sort((a, b) => b - a); // descending → [0] = terbaru
        if (avail.length > 0) setSelectedMonth(avail[0]);
    };

    const { dateFrom, dateTo } = useMemo(
        () => cutoffRange(selectedYear, selectedMonth),
        [selectedYear, selectedMonth]
    );

    // Label singkat, mis: "2026-04-26 s/d 2026-05-25"
    const rangeLabelShort = dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : "";

    return {
        loading,
        years,
        months,
        selectedYear,
        selectedMonth,
        setSelectedMonth,
        handleYearChange,
        dateFrom,
        dateTo,
        monthLabel,
        periodLabel: selectedYear && selectedMonth
            ? `${monthLabel(selectedMonth)} ${selectedYear}`
            : "—",
        rangeLabelShort,
    };
}
