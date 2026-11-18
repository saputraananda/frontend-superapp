import { HiOutlineCheckCircle, HiOutlineXMark } from "react-icons/hi2";
import { cn } from "./helpers";

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl",
        isError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {isError ? <HiOutlineXMark className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

export function PageShell({ icon: Icon, title, subtitle, action, toast, children }) {
  return (
    <>
      <Toast toast={toast} />
      <main className="min-h-screen bg-slate-50 py-6 sm:py-8">
        <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
          <section
            className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-amber-500/10 sm:p-6"
            style={{ background: "linear-gradient(135deg, #E8823A, #D4A12A)" }}
          >
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/20">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{title}</h1>
                  <p className="text-xs text-white/80">{subtitle}</p>
                </div>
              </div>
              {action}
            </div>
          </section>
          {children}
        </div>
      </main>
    </>
  );
}

export function Spinner() {
  return <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />;
}

export function StatusBadge({ active }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500",
      )}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}
