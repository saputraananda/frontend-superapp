export const STATUS_LIST = [
  { key: "assigned",             label: "Assigned",   dot: "bg-slate-400",  pill: "bg-slate-100 text-slate-700 ring-1 ring-slate-300" },
  { key: "in_progress",          label: "In Progress",dot: "bg-amber-500",  pill: "bg-amber-50 text-amber-800 ring-1 ring-amber-300" },
  { key: "on_hold",              label: "On Hold",    dot: "bg-zinc-400",   pill: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-300" },
  { key: "submitted_for_review", label: "For Review", dot: "bg-indigo-500", pill: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-300" },
  { key: "revision_required",    label: "Revision",   dot: "bg-rose-500",   pill: "bg-rose-50 text-rose-800 ring-1 ring-rose-300" },
  { key: "approved",             label: "Approved",   dot: "bg-emerald-500",pill: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300" },
  { key: "completed",            label: "Completed",  dot: "bg-emerald-700",pill: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400" },
];

export const STATUS_WEIGHT = {
  assigned: 0, on_hold: 0, in_progress: 0.3,
  submitted_for_review: 0.6, revision_required: 0.5,
  approved: 0.9, completed: 1,
};

export const PRIORITY_LIST = [
  { key: "critical", label: "Critical", pill: "bg-rose-600 text-white",    dot: "bg-rose-600" },
  { key: "medium",   label: "Medium",   pill: "bg-amber-500 text-white",   dot: "bg-amber-500" },
  { key: "low",      label: "Low",      pill: "bg-emerald-600 text-white", dot: "bg-emerald-600" },
];

// ← ini yang kurang / belum ada
export const statusOf   = (key) => STATUS_LIST.find((s) => s.key === key)   || STATUS_LIST[0];
export const priorityOf = (key) => PRIORITY_LIST.find((p) => p.key === key) || PRIORITY_LIST[1];