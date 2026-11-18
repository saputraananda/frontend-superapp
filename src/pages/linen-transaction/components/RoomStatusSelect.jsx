import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineChevronDown } from "react-icons/hi2";

// Dropdown ruangan dengan badge jumlah (Pcs) untuk ruangan yang masih punya sisa linen
// belum dikirim bersih. <select> bawaan browser tidak bisa menampilkan badge.
// Props opsional agar bisa dipakai di form lain: allLabel (teks "semua"), countLabel (satuan di badge "N ruangan"),
// suffix (teks setelah angka di badge, "" = angka saja), disabled, buttonClassName (gaya tombol).
export default function RoomStatusSelect({
  value,
  onChange,
  rooms,
  roomStatus = {},
  allLabel = "Semua Ruangan",
  countLabel = "ruangan",
  suffix = " Pcs",
  disabled = false,
  buttonClassName = "flex min-w-[150px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-left text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 cursor-pointer",
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const qtyOf = (id) => Number(roomStatus[id] || 0);
  const selected = rooms.find((r) => String(r.id) === String(value));
  const pending = rooms.filter((r) => qtyOf(r.id) > 0).length;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    // Scroll di dalam daftar ruangan sendiri tidak boleh menutup menu; hanya scroll halaman/modal di belakangnya
    const onScroll = (e) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, minWidth: Math.max(r.width, 240) });
    }
    setOpen((o) => !o);
  };

  const pick = (id) => {
    onChange(String(id));
    setOpen(false);
  };

  const Badge = ({ qty }) =>
    qty > 0 ? (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 whitespace-nowrap">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
        {qty}{suffix}
      </span>
    ) : null;

  const optCls = (active) =>
    `flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs font-medium cursor-pointer transition ${
      active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`${buttonClassName} disabled:cursor-not-allowed disabled:bg-slate-100`}
      >
        <span className="truncate">{selected ? selected.room_name : allLabel}</span>
        <span className="flex items-center gap-1.5">
          {selected ? (
            <Badge qty={qtyOf(selected.id)} />
          ) : (
            pending > 0 && (
              <span className="rounded-full border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 whitespace-nowrap">
                {pending} {countLabel}
              </span>
            )
          )}
          <HiOutlineChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.minWidth, zIndex: 9999 }}
            className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            <button type="button" onClick={() => pick("")} className={optCls(!value)}>
              <span>{allLabel}</span>
              {pending > 0 && (
                <span className="rounded-full border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                  {pending} {countLabel}
                </span>
              )}
            </button>
            {rooms.map((room) => (
              <button key={room.id} type="button" onClick={() => pick(room.id)} className={optCls(String(room.id) === String(value))}>
                <span className="truncate">{room.room_name}</span>
                <Badge qty={qtyOf(room.id)} />
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
