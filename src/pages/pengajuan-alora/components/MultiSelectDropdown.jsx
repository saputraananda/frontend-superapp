import { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineChevronDown, HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

/**
 * Dropdown multi-pilih dengan search.
 * options : [{ value, label }]
 * value   : array of string
 */
export default function MultiSelectDropdown({
    options = [],
    value = [],
    onChange,
    placeholder = "— Pilih —",
    emptyLabel = "Tidak ada pilihan",
    searchPlaceholder = "Cari...",
    className = "",
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const boxRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    const selected = useMemo(
        () => options.filter(o => value.includes(String(o.value))),
        [options, value]
    );

    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        return s ? options.filter(o => String(o.label).toLowerCase().includes(s)) : options;
    }, [options, q]);

    const toggle = (v) => {
        const key = String(v);
        onChange(value.includes(key) ? value.filter(x => x !== key) : [...value, key]);
    };

    const summary = selected.length === 0
        ? placeholder
        : selected.length === 1
            ? selected[0].label
            : `${selected.length} dipilih`;

    return (
        <div ref={boxRef} className={cn("relative", className)}>
            <button type="button" onClick={() => setOpen(o => !o)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30">
                <span className={cn("min-w-0 flex-1 truncate", selected.length ? "text-slate-800" : "text-slate-400")}>
                    {summary}
                </span>
                <HiOutlineChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-2">
                        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100" />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        {shown.length === 0 && (
                            <p className="px-3 py-3 text-center text-xs text-slate-400">{emptyLabel}</p>
                        )}
                        {shown.map(o => {
                            const on = value.includes(String(o.value));
                            return (
                                <button type="button" key={o.value} onClick={() => toggle(o.value)}
                                    className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                                        on && "bg-emerald-50/60")}>
                                    <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded border",
                                        on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")}>
                                        {on && <HiOutlineCheck className="h-3 w-3" />}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-slate-700">{o.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {selected.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selected.map(o => (
                        <span key={o.value}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {o.label}
                            <button type="button" onClick={() => toggle(o.value)} aria-label={`Hapus ${o.label}`}
                                className="text-emerald-500 transition hover:text-rose-600">
                                <HiOutlineXMark className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
