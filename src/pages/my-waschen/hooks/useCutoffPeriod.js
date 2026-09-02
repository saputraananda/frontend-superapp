import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [selectedYear, setSelectedYear] = useState(defaultPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.month);
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);

  const years = useMemo(() => cutoffYearOptions(), []);

  useEffect(() => {
    if (!isCustomDate && selectedYear && selectedMonth) {
      const { dateFrom: df, dateTo: dt } = cutoffRange(selectedYear, selectedMonth);
      setDateFrom(df);
      setDateTo(dt);
    }
  }, [selectedYear, selectedMonth, isCustomDate]);

  const handleYearChange = useCallback((y) => {
    setSelectedYear(Number(y));
  }, []);

  const handleCustomStartChange = useCallback((val) => {
    setDateFrom(val);
    const autoEnd = autoFillCutoffEnd(val);
    if (autoEnd) setDateTo(autoEnd);
  }, []);

  const toggleCustom = useCallback(() => {
    setIsCustomDate((prev) => {
      const next = !prev;
      if (!next && selectedYear && selectedMonth) {
        const { dateFrom: df, dateTo: dt } = cutoffRange(selectedYear, selectedMonth);
        setDateFrom(df);
        setDateTo(dt);
      }
      return next;
    });
  }, [selectedYear, selectedMonth]);

  const resetToCurrentCutoff = useCallback(() => {
    const cur = currentCutoffPeriod();
    setIsCustomDate(false);
    setSelectedYear(cur.year);
    setSelectedMonth(cur.month);
  }, []);

  const periodLabel = selectedYear && selectedMonth
    ? `${monthLabel(selectedMonth)} ${selectedYear}`
    : "—";

  const rangeLabelShort = dateFrom && dateTo ? `${dateFrom} s/d ${dateTo}` : "";

  return {
    isCustomDate,
    toggleCustom,
    selectedYear,
    selectedMonth,
    setSelectedMonth,
    handleYearChange,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    handleCustomStartChange,
    resetToCurrentCutoff,
    periodLabel,
    rangeLabelShort,
    years,
    monthOptions: MONTH_OPTIONS,
    monthLabel,
  };
}
