import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineBars3,
  HiOutlineBuildingOffice2,
  HiOutlineBriefcase,
  HiOutlineXMark,
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const THEME = {
  primary: "#126776",
  secondary: "#1ea59e",
};

/** Icon jas dokter / lab coat untuk brand sidebar */
function LabCoatIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c-.8 0-1.5.4-1.9 1.1L8.2 6.2 5 7.5V9l2.2-.7.8 11.2A2 2 0 0 0 10 21h4a2 2 0 0 0 2-1.5l.8-11.2L19 9V7.5l-3.2-1.3-1.9-3.1A2.2 2.2 0 0 0 12 2zm0 2.2 1.4 2.3H10.6L12 4.2zM9.3 8.2h5.4l-.7 9.8h-4l-.7-9.8z" />
      <path d="M11 11h2v6h-2z" opacity=".35" />
    </svg>
  );
}

const MENU_ITEMS = [
  {
    to: "/serah-terima-linen",
    icon: HiOutlineBuildingOffice2,
    label: "Serah Terima Linen",
    description: "Penerimaan & pengiriman linen RS",
    end: true,
  },
  {
    to: "/serah-terima-linen/komersil",
    icon: HiOutlineBriefcase,
    label: "Serah Terima Komersil",
    description: "Penerimaan & pengiriman linen komersil",
  },
];

function NavItem({ to, icon: Icon, label, description, end, onClose, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
          collapsed && "justify-center px-2",
          isActive ? "text-white shadow-md" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )
      }
      style={({ isActive }) =>
        isActive
          ? { backgroundColor: THEME.secondary, boxShadow: `0 4px 14px ${THEME.secondary}55` }
          : undefined
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
              isActive
                ? "bg-white/20 text-white"
                : "border border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold leading-none">{label}</p>
              <p
                className={cn(
                  "mt-0.5 truncate text-[11px] leading-none",
                  isActive ? "text-white/80" : "text-slate-400",
                )}
              >
                {description}
              </p>
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

function BrandMark() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-lg"
        style={{
        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
        boxShadow: `0 8px 20px ${THEME.secondary}55`,
      }}
    >
      <LabCoatIcon className="h-5 w-5 text-white" />
    </div>
  );
}

function Sidebar({ collapsed = false, onClose }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className={cn(
          "flex items-center border-b border-slate-100 py-4",
          collapsed ? "justify-center px-2" : onClose ? "justify-between gap-3 px-5" : "px-5",
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-slate-800">Serah Terima Linen</p>
              <p className="truncate text-[11px] text-slate-400">Alora Group Indonesia</p>
            </div>
          </div>
        )}
        {collapsed && <BrandMark />}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Tutup sidebar"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        )}
      </div>

      {!collapsed && (
        <p className="px-5 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Menu</p>
      )}
      {collapsed && <div className="pt-3" />}

      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto", collapsed ? "px-1.5" : "px-3")}>
        {MENU_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
        ))}
      </nav>

      <div className={cn("border-t border-slate-100 py-3", collapsed ? "px-1.5" : "px-3")}>
        <button
          type="button"
          title={collapsed ? "Kembali ke Portal" : undefined}
          onClick={() => {
            if (onClose) onClose();
            navigate("/portal");
          }}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition group-hover:border-slate-300 group-hover:text-slate-600">
            <HiOutlineArrowLeft className="h-4 w-4" />
          </div>
          {!collapsed && <span>Kembali ke Portal</span>}
        </button>
      </div>
    </div>
  );
}

function ActiveMenuTitle() {
  const { pathname } = useLocation();
  const active =
    MENU_ITEMS.find((m) => m.end && pathname === m.to) ??
    MENU_ITEMS.find((m) => !m.end && pathname.startsWith(m.to));

  return (
    <div>
      <p className="text-sm font-semibold leading-tight text-slate-800">
        {active?.label ?? "Serah Terima Linen"}
      </p>
      <p className="text-[11px] leading-tight text-slate-400">
        {active?.description ?? "Rekapitulasi serah terima linen"}
      </p>
    </div>
  );
}

export default function LinenTransactionLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: `${THEME.secondary}14` }}>
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-in-out lg:flex overflow-hidden",
          desktopCollapsed ? "w-20" : "w-64",
        )}
      >
        <Sidebar collapsed={desktopCollapsed} />
      </aside>

      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        ref={drawerRef}
        aria-label="Sidebar navigasi"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:flex">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDesktopCollapsed((p) => !p)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              aria-label={desktopCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            >
              <HiOutlineBars3 className="h-5 w-5" />
            </button>
            <ActiveMenuTitle />
          </div>
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold text-white"
            style={{
              borderColor: `${THEME.secondary}88`,
              backgroundColor: THEME.secondary,
            }}
          >
            <div className="h-2 w-2 rounded-full bg-white" />
            Serah Terima Linen
          </div>
        </header>

        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 active:scale-95"
            aria-label="Buka menu"
          >
            <HiOutlineBars3 className="h-5 w-5" />
          </button>
          <ActiveMenuTitle />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
