import { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineChevronDown, HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const ACCENT = {
  orange: {
    openBorder: "border-orange-400 focus-within:ring-orange-100",
    ring: "focus:ring-orange-100 focus:border-orange-400",
    active: "bg-orange-500 text-white",
    icon: "text-orange-500",
  },
  emerald: {
    openBorder: "border-emerald-400 focus-within:ring-emerald-100",
    ring: "focus:ring-emerald-100 focus:border-emerald-400",
    active: "bg-emerald-500 text-white",
    icon: "text-emerald-500",
  },
};

/**
 * Searchable single-select for Petugas IKM.
 * options: [{ employee_id, full_name }]
 */
export default function EmployeeSearchSelect({
  value,
  onChange,
  employees = [],
  placeholder = "Cari / pilih Petugas IKM",
  required = false,
  accent = "orange",
  allowClear = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const styles = ACCENT[accent] || ACCENT.orange;

  useEffect(() => {
    const clickOut = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const selected = useMemo(
    () => employees.find((emp) => Number(emp.employee_id) === Number(value)),
    [employees, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) =>
      String(emp.full_name || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handleSelect = (employeeId) => {
    onChange(String(employeeId));
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div className="relative" ref={wrapRef}>
      {open ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm shadow-sm ring-2",
            styles.openBorder
          )}
        >
          <HiOutlineMagnifyingGlass className={cn("h-4 w-4 shrink-0", styles.icon)} />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={selected?.full_name || placeholder}
            disabled={disabled}
            className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            setSearch("");
          }}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition hover:border-slate-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50",
            styles.ring
          )}
        >
          <span className={selected ? "font-medium text-slate-800" : "text-slate-400"}>
            {selected?.full_name || placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {allowClear && value ? (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Hapus pilihan"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </span>
            ) : null}
            <HiOutlineChevronDown className="h-4 w-4 text-slate-400" />
          </span>
        </button>
      )}

      {/* keep native required validation for forms */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value || ""}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 flex max-h-64 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-slate-400">Tidak ditemukan</p>
            ) : (
              filtered.map((emp) => {
                const active = Number(emp.employee_id) === Number(value);
                return (
                  <button
                    key={emp.employee_id}
                    type="button"
                    onClick={() => handleSelect(emp.employee_id)}
                    className={cn(
                      "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition",
                      active ? styles.active : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className="font-medium">{emp.full_name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
