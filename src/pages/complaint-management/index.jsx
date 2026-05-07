import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineBars3,
  HiOutlineChartBarSquare,
  HiOutlineExclamationCircle,
  HiOutlineListBullet,
  HiOutlineXMark,
} from "react-icons/hi2";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const MENU_ITEMS = [
  {
    to: "/complaint-management-system",
    icon: HiOutlineChartBarSquare,
    label: "Dashboard",
    description: "Ringkasan & statistik komplain",
    end: true,
  },
  {
    to: "/complaint-list",
    icon: HiOutlineListBullet,
    label: "Daftar Komplain",
    description: "Seluruh data komplain",
  },
];

function NavItem({ to, icon: Icon, label, description, end, onClose }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
          isActive
            ? "bg-fuchsia-700 text-white shadow-md shadow-fuchsia-300"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )
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
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-semibold leading-none">{label}</p>
            <p
              className={cn(
                "mt-0.5 truncate text-[11px] leading-none",
                isActive ? "text-fuchsia-100" : "text-slate-400",
              )}
            >
              {description}
            </p>
          </div>
        </>
      )}
    </NavLink>
  );
}

function Sidebar({ collapsed = false, onClose }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Brand */}
      <div
        className={cn(
          "flex items-center border-b border-slate-100 py-4",
          collapsed ? "justify-center px-2" : onClose ? "justify-between gap-3 px-5" : "px-5",
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-700 to-pink-700 shadow-lg shadow-pink-700/30">
              <HiOutlineExclamationCircle className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-slate-800">
                Complaint Management
              </p>
              <p className="truncate text-[11px] text-slate-400">Alora Group Indonesia</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-700 to-pink-700 shadow-lg shadow-pink-700/30">
            <HiOutlineExclamationCircle className="h-5 w-5 text-white" />
          </div>
        )}
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
        <p className="px-5 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Menu
        </p>
      )}
      {collapsed && <div className="pt-3" />}

      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto", collapsed ? "px-1.5" : "px-3")}>
        {MENU_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onClose={onClose} />
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
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition group-hover:text-slate-600">
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

  const label = active?.label ?? "Complaint Management";
  const description = active?.description ?? "Sistem pengelolaan komplain pelanggan";

  return (
    <div>
      <p className="text-sm font-semibold leading-tight text-slate-800">{label}</p>
      <p className="text-[11px] leading-tight text-slate-400">{description}</p>
    </div>
  );
}

export default function ComplaintManagement() {
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
    <div className="flex h-screen overflow-hidden bg-fuchsia-50/30">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-in-out lg:flex overflow-hidden",
          desktopCollapsed ? "w-20" : "w-64",
        )}
      >
        <Sidebar collapsed={desktopCollapsed} />
      </aside>

      {/* Mobile overlay */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
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

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Desktop topbar */}
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
          <div className="flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-100 px-3 py-1.5 text-xs font-semibold text-fuchsia-800">
            <div className="h-2 w-2 rounded-full bg-fuchsia-600" />
            Complaint Management System
          </div>
        </header>

        {/* Mobile topbar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 active:scale-95"
            aria-label="Buka menu navigasi"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <HiOutlineXMark className="h-5 w-5" />
            ) : (
              <HiOutlineBars3 className="h-5 w-5" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-700 to-pink-700">
              <HiOutlineExclamationCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-700">Complaint Management</span>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
