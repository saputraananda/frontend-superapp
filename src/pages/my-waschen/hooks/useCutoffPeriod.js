import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  autoFillCutoffEnd,
  currentCutoffPeriod,
  cutoffRange,
  cutoffYearOptions,
  monthLabel,
  MONTH_OPTIONS,
} from "../utils/cutoffPeriod";

export default function useCutoffPeriod() {
  const defaultPeriod = useMemo(() => currentCutoffPeriod(), []);
  const initialRange = useMemo(
    () => cutoffRange(defaultPeriod.year, defaultPeriod.month),
    [defaultPeriod.year, defaultPeriod.month],
  );

  const [isCustomDate, setIsCustomDate] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedYear, setSelectedYear] = useState(defaultPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.month);
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const savedRange = useRef(null);

  const years = useMemo(() => cutoffYearOptions(), []);

  const leaveToday = useCallback(() => {
    setTodayOnly(false);
    savedRange.current = null;
  }, []);

  useEffect(() => {
    if (todayOnly || isCustomDate || !selectedYear || !selectedMonth) return;
    const { dateFrom: df, dateTo: dt } = cutoffRange(selectedYear, selectedMonth);
    setDateFrom(df);
    setDateTo(dt);
  }, [selectedYear, selectedMonth, isCustomDate, todayOnly]);

  const handleYearChange = useCallback((y) => {
    leaveToday();
    setSelectedYear(Number(y));
  }, [leaveToday]);

  const handleMonthChange = useCallback((m) => {
    leaveToday();
    setSelectedMonth(Number(m));
  }, [leaveToday]);

  const handleCustomStartChange = useCallback((val) => {
    leaveToday();
    setDateFrom(val);
    const autoEnd = autoFillCutoffEnd(val);
    if (autoEnd) setDateTo(autoEnd);
  }, [leaveToday]);

  const handleDateToChange = useCallback((val) => {
    leaveToday();
    setDateTo(val);
  }, [leaveToday]);

  const toggleToday = useCallback(() => {
    setTodayOnly((prev) => {
      if (!prev) {
        savedRange.current = { dateFrom, dateTo };
        const d = new Date();
        const p = (n) => String(n).padStart(2, "0");
        const t = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        setDateFrom(t);
        setDateTo(t);
        return true;
      }
      const saved = savedRange.current;
      if (saved) {
        setDateFrom(saved.dateFrom);
        setDateTo(saved.dateTo);
      }
      return false;
    });
  }, [dateFrom, dateTo]);

  const toggleCustom = useCallback(() => {
    leaveToday();
    setIsCustomDate((prev) => {
      const next = !prev;
      if (!next && selectedYear && selectedMonth) {
        const { dateFrom: df, dateTo: dt } = cutoffRange(selectedYear, selectedMonth);
        setDateFrom(df);
        setDateTo(dt);
      }
      return next;
    });
  }, [selectedYear, selectedMonth, leaveToday]);

  const resetToCurrentCutoff = useCallback(() => {
    leaveToday();
    const cur = currentCutoffPeriod();
    setIsCustomDate(false);
    setSelectedYear(cur.year);
    setSelectedMonth(cur.month);
  }, [leaveToday]);

  const periodLabel = selectedYear && selectedMonth
    ? `${monthLabel(selectedMonth)} ${selectedYear}`
    : "—";

  const rangeLabelShort = dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : "";

  return {
    isCustomDate,
    todayOnly,
    toggleToday,
    toggleCustom,
    selectedYear,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    handleYearChange,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo: handleDateToChange,
    handleCustomStartChange,
    resetToCurrentCutoff,
    periodLabel,
    rangeLabelShort,
    years,
    monthOptions: MONTH_OPTIONS,
    monthLabel,
  };
}
