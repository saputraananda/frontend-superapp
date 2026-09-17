import { cn, WASCHEN_ROLE_OPTIONS } from "../utils/hrisUtils";

export default function HrisOutletRoleFilter({
  outlets,
  outletId,
  onOutletChange,
  role,
  onRoleChange,
  className,
}) {
  const selectCls = (active) =>
    cn(
      "w-full rounded-xl border py-2.5 pl-3 pr-8 text-xs font-semibold outline-none transition appearance-none cursor-pointer focus:border-[#5f1340]/40",
      active
        ? "border-[#5f1340]/40 bg-[#5f1340]/5 text-[#5f1340]"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
    );

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)}>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Outlet
        </label>
        <select value={outletId} onChange={(e) => onOutletChange(e.target.value)} className={selectCls(outletId)}>
          <option value="">Semua Outlet</option>
          {outlets.map((o) => (
            <option key={o.id} value={String(o.id)}>
              {o.outlet_code ? `${o.outlet_code} — ` : ""}
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Bagian
        </label>
        <select value={role} onChange={(e) => onRoleChange(e.target.value)} className={selectCls(role)}>
          <option value="">Semua Bagian</option>
          {WASCHEN_ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
