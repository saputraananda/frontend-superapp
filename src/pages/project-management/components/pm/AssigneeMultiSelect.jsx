import { useState, useEffect, useRef } from "react";

export const AssigneeMultiSelect = ({
  employees,
  selected,
  onChange,
  disabled,
  selfId,
  isStaff,
  single = false,      // ← NEW: single-select mode for PIC
  excludeIds = [],    // ← NEW: IDs to grey out (already assigned elsewhere)
  placeholder,
  accentColor = "blue", // ← NEW: color theme per role
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Color themes per accent
  const colorThemes = {
    blue: {
      chip: "bg-blue-50 border-blue-200 text-blue-800",
      chipBtn: "text-blue-400 hover:text-blue-700",
      check: "bg-blue-600 border-blue-600 text-white",
      selected: "bg-blue-50 text-blue-800 font-medium",
      ring: "focus:border-blue-400 focus:ring-blue-100",
    },
    emerald: {
      chip: "bg-emerald-50 border-emerald-200 text-emerald-800",
      chipBtn: "text-emerald-400 hover:text-emerald-700",
      check: "bg-emerald-600 border-emerald-600 text-white",
      selected: "bg-emerald-50 text-emerald-800 font-medium",
      ring: "focus:border-emerald-400 focus:ring-emerald-100",
    },
    amber: {
      chip: "bg-amber-50 border-amber-200 text-amber-800",
      chipBtn: "text-amber-400 hover:text-amber-700",
      check: "bg-amber-600 border-amber-600 text-white",
      selected: "bg-amber-50 text-amber-800 font-medium",
      ring: "focus:border-amber-400 focus:ring-amber-100",
    },
    violet: {
      chip: "bg-violet-50 border-violet-200 text-violet-800",
      chipBtn: "text-violet-400 hover:text-violet-700",
      check: "bg-violet-600 border-violet-600 text-white",
      selected: "bg-violet-50 text-violet-800 font-medium",
      ring: "focus:border-violet-400 focus:ring-violet-100",
    },
  };
  const theme = colorThemes[accentColor] || colorThemes.blue;

  const toggle = (empId) => {
    if (excludeIds.includes(empId)) return;

    if (single) {
      // Single-select: replace entire selection
      onChange(selected.includes(empId) ? [] : [empId]);
      setOpen(false);
      setSearch("");
    } else {
      if (selected.includes(empId)) {
        onChange(selected.filter((id) => id !== empId));
      } else {
        onChange([...selected, empId]);
      }
    }
  };

  const removeChip = (e, empId) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(empId);
  };

  const selectedEmployees = employees.filter((emp) => selected.includes(emp.employee_id));

  const filteredEmployees = employees.filter((emp) =>
    emp.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            if (open) setSearch("");
            setOpen((v) => !v);
          }
        }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") !disabled && setOpen((v) => !v); }}
        className={[
          "w-full min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 py-2",
          "flex flex-wrap gap-1.5 items-center cursor-pointer",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:border-slate-400",
        ].join(" ")}
      >
        {selectedEmployees.length === 0 && (
          <span className="text-sm text-slate-400">{placeholder || "Pilih assignee..."}</span>
        )}
        {selectedEmployees.map((emp) => (
          <span
            key={emp.employee_id}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${theme.chip}`}
          >
            {emp.full_name}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => removeChip(e, emp.employee_id)}
                className={`font-bold ml-0.5 ${theme.chipBtn}`}
              >
                ✕
              </button>
            )}
          </span>
        ))}
        <span className="ml-auto text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
      </div>

      {/* Dropdown list */}
      {open && !disabled && (
        <div className="absolute z-50 bottom-full mb-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="max-h-44 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                {employees.length === 0 ? "Tidak ada karyawan" : "Karyawan tidak ditemukan"}
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selected.includes(emp.employee_id);
                const isSelf     = emp.employee_id === selfId;
                const isExcluded = excludeIds.includes(emp.employee_id);
                return (
                  <button
                    key={emp.employee_id}
                    type="button"
                    onClick={() => toggle(emp.employee_id)}
                    disabled={isExcluded}
                    className={[
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition",
                      isSelected ? theme.selected : "hover:bg-slate-50 text-slate-700",
                      isExcluded ? "opacity-40 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <span className={[
                      "h-4 w-4 rounded border flex items-center justify-center text-[10px] shrink-0",
                      isSelected ? theme.check : "border-slate-300",
                    ].join(" ")}>
                      {isSelected && "✓"}
                    </span>
                    {emp.full_name}
                    {isSelf && <span className="ml-auto text-[10px] text-slate-400">(Saya)</span>}
                    {isExcluded && !isSelf && <span className="ml-auto text-[10px] text-slate-400">(sudah dipilih)</span>}
                  </button>
                );
              })
            )}
          </div>

          {/* Search input */}
          <div className="p-2 border-t border-slate-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Cari karyawan..."
              className={`w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:ring-1 ${theme.ring}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
