import { initials } from "../../utils/pmUtils";

export const EmployeeChip = ({ id, name, email, label, colorClass = "bg-slate-700" }) => {
  if (!id) return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400 italic">
      Tidak ada {label}.
    </div>
  );
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className={`h-8 w-8 rounded-md ${colorClass} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
        {initials(name)}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 truncate">{name || `Emp #${id}`}</div>
        {email && <div className="text-xs text-slate-400 truncate">{email}</div>}
      </div>
    </div>
  );
};