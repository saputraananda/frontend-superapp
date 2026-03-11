// frontend/src/pages/aset-management/components/UIComponents.jsx
import { cn } from "./constants";

export function Field({ label, required, hint, error, children }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">
                    {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
                </label>
                {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
            </div>
            {children}
            {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
    );
}

export function InfoRow({ label, value }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm text-slate-700">{value}</span>
        </div>
    );
}

export function StatCard({ label, value, icon, color = "blue" }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100",
        slate: "bg-slate-50 text-slate-600 border-slate-100",
    };
    return (
        <div className={cn("rounded-xl border p-3 sm:p-4", colors[color] || colors.blue)}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
        </div>
    );
}

export function ApprovalBadge({ status }) {
    const map = {
        draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200" },
        pending_spv: { label: "Pending SPV", cls: "bg-amber-50 text-amber-700 border-amber-200" },
        pending_bod: { label: "Pending BoD", cls: "bg-orange-50 text-orange-700 border-orange-200" },
        approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    };
    const s = map[status] || map.draft;
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", s.cls)}>
            {s.label}
        </span>
    );
}