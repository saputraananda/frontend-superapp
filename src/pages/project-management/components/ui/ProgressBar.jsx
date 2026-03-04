export const ProgressBar = ({ value = 0 }) => {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const color = v >= 80 ? "bg-emerald-600" : v >= 50 ? "bg-blue-600" : v >= 25 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-2 w-full rounded-sm bg-slate-100 border border-slate-200 overflow-hidden">
      <div className={`h-full rounded-sm transition-all duration-700 ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
};