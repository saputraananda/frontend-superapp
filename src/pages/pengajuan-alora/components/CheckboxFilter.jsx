import { useEffect, useMemo, useRef, useState } from "react";
import {
    HiOutlineChevronDown,
    HiOutlineMagnifyingGlass,
    HiOutlineXMark,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

/**
 * Filter dropdown yang di dalamnya berisi daftar checkbox multi-pilih.
 *
 * label    : "Departemen" | "Company" | "Outlet"
 * icon     : Icon component
 * options  : [{ value, label }]
 * selected : null  → semua terpilih (tidak difilter)
 *            array → daftar value yang terpilih
 * onChange : callback(null | array)
 * disabled : boolean (misal outlet saat Waschen Laundry tidak dipilih)
 * hint     : keterangan saat disabled
 */
export default function CheckboxFilter({
    label,
    icon: Icon,
    options = [],
    selected,
    onChange,
    disabled = false,
    hint,
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    // Tutup dropdown saat klik di luar atau tekan Escape
    useEffect(() => {
        if (!open) return;
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    // Cek apakah item aktif (null = semua aktif)
    const isChecked = (v) => selected === null || selected.includes(v);
    const allValues = useMemo(() => options.map((o) => o.value), [options]);
    const checkedCount = selected === null ? options.length : selected.length;
    const isFiltered = selected !== null && selected.length < options.length;

    const toggle = (v) => {
        const current = selected === null ? allValues : selected;
        const next = current.includes(v)
            ? current.filter((x) => x !== v)
            : [...current, v];
        // Jika semua terpilih kembali, reset ke null agar tidak ada filter spesifik yang dikirim
        onChange(next.length === allValues.length ? null : next);
    };

    // Filter pencarian opsi jika daftar panjang
    const filteredOptions = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) =>
            String(o.label).toLowerCase().includes(q)
        );
    }, [options, search]);

    // Label ringkasan untuk tombol dropdown
    const summaryLabel = useMemo(() => {
        if (options.length === 0) return "Memuat...";
        if (selected === null || selected.length === options.length) {
            return `Semua ${label}`;
        }
        if (selected.length === 0) {
            return `0 ${label}`;
        }
        if (selected.length === 1) {
            const match = options.find((o) => o.value === selected[0]);
            return match ? match.label : `1 ${label}`;
        }
        return `${selected.length} ${label}`;
    }, [options, selected, label]);

    return (
        <div ref={dropdownRef} className="relative inline-block text-left">
            {/* Tombol Trigger Dropdown */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                title={hint && disabled ? hint : undefined}
                className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition select-none shadow-2xs outline-none",
                    disabled
                        ? "border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed opacity-60"
                        : isFiltered
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70 font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                )}
            >
                {Icon && (
                    <Icon
                        className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isFiltered ? "text-emerald-700" : "text-slate-400"
                        )}
                    />
                )}
                <span className="truncate max-w-[130px] sm:max-w-[170px]">{summaryLabel}</span>
                {isFiltered && (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-bold text-white tabular-nums">
                        {checkedCount}
                    </span>
                )}
                <HiOutlineChevronDown
                    className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        open ? "rotate-180 text-emerald-600" : "text-slate-400"
                    )}
                />
            </button>

            {/* Menu Popover Dropdown Checkbox */}
            {open && !disabled && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl ring-1 ring-slate-900/5 animate-in fade-in-0 zoom-in-95 duration-100">
                    {/* Header: Judul & Tombol Cepat */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-700">Filter {label}</span>
                            <span className="text-[11px] text-slate-400 tabular-nums">
                                ({checkedCount}/{options.length})
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => onChange(null)}
                                disabled={selected === null}
                                className="font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-300 disabled:cursor-not-allowed transition"
                            >
                                Semua
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                disabled={selected !== null && selected.length === 0}
                                className="font-semibold text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed transition"
                            >
                                Kosongkan
                            </button>
                        </div>
                    </div>

                    {/* Search Input jika opsi > 5 */}
                    {options.length > 5 && (
                        <div className="relative my-2">
                            <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Cari ${label.toLowerCase()}...`}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <HiOutlineXMark className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Daftar Item Checkbox */}
                    <div className="max-h-56 overflow-y-auto space-y-0.5 py-1 pr-1">
                        {filteredOptions.length === 0 ? (
                            <p className="py-4 text-center text-xs text-slate-400 italic">
                                Tidak ada {label.toLowerCase()} yang cocok
                            </p>
                        ) : (
                            filteredOptions.map((o) => {
                                const on = isChecked(o.value);
                                return (
                                  <label
                                    key={o.value}
                                    className={cn(
                                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer select-none transition",
                                      on
                                        ? "bg-emerald-50/70 text-emerald-900 font-medium"
                                        : "text-slate-700 hover:bg-slate-50"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      onChange={() => toggle(o.value)}
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                                    />
                                    <span className="truncate flex-1">{o.label}</span>
                                  </label>
                                );
                            })
                        )}
                    </div>

                    {/* Footer: Status & Tombol Tutup */}
                    <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between px-1">
                        <span className="text-[10px] text-slate-400">
                            {checkedCount === options.length
                                ? "Semua dipilih"
                                : `${checkedCount} dipilih`}
                        </span>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white transition shadow-2xs"
                        >
                            Selesai
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
