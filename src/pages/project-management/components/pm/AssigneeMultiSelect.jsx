import { useState, useEffect, useRef } from "react";

export const AssigneeMultiSelect = ({ employees, selected, onChange, disabled, selfId, isStaff }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (empId) => {
    if (isStaff && empId === selfId) return; // staff tidak bisa remove diri sendiri
    if (selected.includes(empId)) {
      onChange(selected.filter((id) => id !== empId));
    } else {
      onChange([...selected, empId]);
    }
  };

  const removeChip = (e, empId) => {
    e.preventDefault();   // ← cegah bubble ke parent
    e.stopPropagation();  // ← cegah dropdown toggle
    toggle(empId);
  };

  const selectedEmployees = employees.filter((emp) => selected.includes(emp.employee_id));

  return (
    <div ref={ref} className="relative">
      {/* ✅ Ganti <button> jadi <div> agar tidak ada nested button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((v) => !v)}
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
            {/* ✅ Sekarang <button> ini tidak nested di dalam <button> lagi */}
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
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {employees.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">Tidak ada karyawan</div>
          ) : (
            employees.map((emp) => {
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
      )}
    </div>
  );
};