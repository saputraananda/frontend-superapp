import { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineChevronDown, HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

/**
 * Searchable hospital select — dropdown always opens below the trigger.
 * hospitals: [{ id, hospital_name }]
 */
export default function HospitalSearchSelect({
  value,
  onChange,
  hospitals = [],
  placeholder = "Semua Rumah Sakit",
  allowClear = true,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const selected = useMemo(
    () => hospitals.find((h) => String(h.id) === String(value)),
    [hospitals, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter((h) =>
      String(h.hospital_name || "").toLowerCase().includes(q)
    );
  }, [hospitals, search]);

  const handleSelect = (id) => {
    onChange(id === "" || id == null ? "" : String(id));
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div className="relative z-20" ref={wrapRef}>
      {open ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#1ea59e] bg-white px-3 py-2.5 text-sm shadow-sm ring-2 ring-[#1ea59e]/20">
          <HiOutlineMagnifyingGlass className="h-4 w-4 shrink-0 text-[#1ea59e]" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={selected?.hospital_name || "Cari rumah sakit..."}
            disabled={disabled}
            className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            setSearch("");
          }}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          <span className={cn("truncate", selected ? "font-medium text-slate-800" : "text-slate-500")}>
            {selected?.hospital_name || placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {allowClear && value ? (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Hapus pilihan"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </span>
            ) : null}
            <HiOutlineChevronDown className="h-4 w-4 text-slate-400" />
          </span>
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 flex max-h-64 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <div className="overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={cn(
                "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition",
                !value ? "bg-[#1ea59e] text-white" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className="font-medium">{placeholder}</span>
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-slate-400">RS tidak ditemukan</p>
            ) : (
              filtered.map((h) => {
                const active = String(h.id) === String(value);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSelect(h.id)}
                    className={cn(
                      "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition",
                      active ? "bg-[#1ea59e] text-white" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className="font-medium">{h.hospital_name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
