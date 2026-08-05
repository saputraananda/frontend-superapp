import { useState, useRef, useEffect } from "react";
import { HiOutlineChevronDown, HiOutlineCheck } from "react-icons/hi2";

export default function MultiSelectDropdown({
  label,
  options, // Array of strings or objects { value, label }
  selectedValues = [],
  onChange,
  placeholder = "Semua",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleOption = (val) => {
    let next;
    if (selectedValues.includes(val)) {
      next = selectedValues.filter((v) => v !== val);
    } else {
      next = [...selectedValues, val];
    }
    onChange(next);
  };

  const displayLabel = () => {
    if (selectedValues.length === 0) return placeholder;
    return options
      .filter((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        return selectedValues.includes(val);
      })
      .map((opt) => (typeof opt === "string" ? opt : opt.label))
      .join(", ");
  };

  return (
    <div className={`relative w-full ${isOpen ? "z-30" : "z-10"}`} ref={containerRef}>
      {label && (
        <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-left text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:border-indigo-400 transition"
      >
        <span className="truncate pr-2 font-medium">{displayLabel()}</span>
        <HiOutlineChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-55 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-150 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-fadeIn">
          {options.map((opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const lbl = typeof opt === "string" ? opt : opt.label;
            const isSelected = selectedValues.includes(val);

            return (
              <button
                key={val}
                type="button"
                onClick={() => handleToggleOption(val)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // controlled by button onClick
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="truncate">{lbl}</span>
                </div>
                {isSelected && <HiOutlineCheck className="h-3 w-3 text-indigo-600 shrink-0 font-bold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}