import { useState, useEffect, useRef } from "react";

export const AssigneeMultiSelect = ({ employees, selected, onChange, disabled, selfId, isStaff }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch(""); // ← tetap di sini, ini event handler, bukan effect
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input saat dropdown terbuka
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const toggle = (empId) => {
    if (isStaff && empId === selfId) return;
    if (selected.includes(empId)) {
      onChange(selected.filter((id) => id !== empId));
    } else {
      onChange([...selected, empId]);
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
            if (open) setSearch(""); // reset saat menutup
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
          <span className="text-sm text-slate-400">Pilih assignee...</span>
        )}
        {selectedEmployees.map((emp) => (
          <span
            key={emp.employee_id}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800"
          >
            {emp.full_name}
            {(!isStaff || emp.employee_id !== selfId) && !disabled && (
              <button
                type="button"
                onClick={(e) => removeChip(e, emp.employee_id)}
                className="text-blue-400 hover:text-blue-700 font-bold ml-0.5"
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
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Cari karyawan..."
              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          {/* Employee list */}
          <div className="max-h-44 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                {employees.length === 0 ? "Tidak ada karyawan" : "Karyawan tidak ditemukan"}
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selected.includes(emp.employee_id);
                const isSelf     = emp.employee_id === selfId;
                return (
                  <button
                    key={emp.employee_id}
                    type="button"
                    onClick={() => toggle(emp.employee_id)}
                    disabled={isStaff && isSelf}
                    className={[
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition",
                      isSelected ? "bg-blue-50 text-blue-800 font-medium" : "hover:bg-slate-50 text-slate-700",
                      isStaff && isSelf ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <span className={[
                      "h-4 w-4 rounded border flex items-center justify-center text-[10px] shrink-0",
                      isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300",
                    ].join(" ")}>
                      {isSelected && "✓"}
                    </span>
                    {emp.full_name}
                    {isSelf && <span className="ml-auto text-[10px] text-slate-400">(Saya)</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};