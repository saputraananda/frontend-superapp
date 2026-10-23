import { useEffect, useRef, useState } from "react";
import { HiOutlineChevronDown, HiOutlineCheck } from "react-icons/hi2";
import { cn, WASCHEN_ROLE_OPTIONS } from "../utils/hrisUtils";

const LABEL_CLS = "block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1";

const fieldCls = (active) =>
  cn(
    "w-full rounded-xl border py-2.5 pl-3 pr-8 text-xs font-semibold outline-none transition cursor-pointer focus:border-[#5f1340]/40",
    active
      ? "border-[#5f1340]/40 bg-[#5f1340]/5 text-[#5f1340]"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
  );

/** Dropdown checkbox: kosong = semua. */
function MultiSelect({ options, value, onChange, allLabel, unitLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const summary = !value.length
    ? allLabel
    : value.length === 1
      ? options.find((o) => o.value === value[0])?.label || value[0]
      : `${value.length} ${unitLabel} dipilih`;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn(fieldCls(value.length > 0), "text-left truncate")}>
        {summary}
      </button>
      <HiOutlineChevronDown
        className={cn("pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-transform", open && "rotate-180")}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold",
              !value.length ? "bg-[#5f1340]/10 text-[#5f1340]" : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {allLabel}
            {!value.length && <HiOutlineCheck className="h-3.5 w-3.5" />}
          </button>
          {options.map((o) => {
            const checked = value.includes(o.value);
            return (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs",
                  checked ? "font-semibold text-[#5f1340]" : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.value)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5f1340]"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HrisOutletRoleFilter({
  outlets,
  outletId,
  onOutletChange,
  role,
  onRoleChange,
  // Mode multi-pilih (opsional): array + setter array
  multiple = false,
  outletIds = [],
  onOutletIdsChange,
  roles = [],
  onRolesChange,
  className,
}) {
  const outletOptions = outlets.map((o) => ({
    value: String(o.id),
    label: `${o.outlet_code ? `${o.outlet_code} — ` : ""}${o.name}`,
  }));

  if (multiple) {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)}>
        <div>
          <label className={LABEL_CLS}>Outlet</label>
          <MultiSelect options={outletOptions} value={outletIds} onChange={onOutletIdsChange} allLabel="Semua Outlet" unitLabel="outlet" />
        </div>
        <div>
          <label className={LABEL_CLS}>Posisi</label>
          <MultiSelect options={WASCHEN_ROLE_OPTIONS} value={roles} onChange={onRolesChange} allLabel="Semua Posisi" unitLabel="posisi" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)}>
      <div>
        <label className={LABEL_CLS}>Outlet</label>
        <select value={outletId} onChange={(e) => onOutletChange(e.target.value)} className={cn(fieldCls(outletId), "appearance-none")}>
          <option value="">Semua Outlet</option>
          {outletOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL_CLS}>Posisi</label>
        <select value={role} onChange={(e) => onRoleChange(e.target.value)} className={cn(fieldCls(role), "appearance-none")}>
          <option value="">Semua Posisi</option>
          {WASCHEN_ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
