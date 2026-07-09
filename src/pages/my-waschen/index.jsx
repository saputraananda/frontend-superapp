import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineArchiveBox,
  HiOutlineArrowLeft,
  HiOutlineBanknotes,
  HiOutlineBars3,
  HiOutlineBuildingStorefront,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineCog6Tooth,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineGift,
  HiOutlineMapPin,
  HiOutlineServer,
  HiOutlineShoppingCart,
  HiOutlineSquares2X2,
  HiOutlineTag,
  HiOutlineArrowTrendingUp,
  HiOutlineUsers,
  HiOutlineWrenchScrewdriver,
  HiOutlineXMark,
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const MENU_ITEMS = [
  // ── Dashboard ──
  {
    to: "/my-waschen",
    icon: HiOutlineSquares2X2,
    label: "Dashboard",
    description: "Ringkasan & statistik bisnis",
    category: "dashboard",
    end: true,
  },

  // ── Admin ──
  {
    to: "/my-waschen/admin-laporan",
    icon: HiOutlineDocumentText,
    label: "Admin Laporan",
    description: "Laporan & reporting",
    category: "admin",
  },
  {
    to: "/my-waschen/admin-settings",
    icon: HiOutlineCog6Tooth,
    label: "Admin Settings",
    description: "Pengaturan sistem",
    category: "admin",
  },
  {
    to: "/my-waschen/admin-target",
    icon: HiOutlineChartBarSquare,
    label: "Admin Target",
    description: "Target management",
    category: "admin",
  },
  {
    to: "/my-waschen/admin-target-detail",
    icon: HiOutlineClipboardDocumentList,
    label: "Admin Target Detail",
    description: "Detail target",
    category: "admin",
  },
  {
    to: "/my-waschen/admin-promo-sla-stok",
    icon: HiOutlineTag,
    label: "Admin Promo / SLA / Stok",
    description: "Promo, SLA & stok",
    category: "admin",
  },
  {
    to: "/my-waschen/admin-period-close",
    icon: HiOutlineCalendarDays,
    label: "Admin Period Close",
    description: "Penutupan periode",
    category: "admin",
  },
  {
    to: "/my-waschen/admin-shift-report",
    icon: HiOutlineClock,
    label: "Admin Shift Report",
    description: "Laporan shift",
    category: "admin",
  },
  {
    to: "/my-waschen/admin-kas-overview",
    icon: HiOutlineBanknotes,
    label: "Admin Kas Overview",
    description: "Ringkasan kas",
    category: "admin",
  },
  {
    to: "/my-waschen/admin-sub-session",
    icon: HiOutlineClipboardDocumentList,
    label: "Admin Sub-Session",
    description: "Sub-session management",
    category: "admin",
  },

  // ── Approval ──
  {
    to: "/my-waschen/approval-center",
    icon: HiOutlineCheckCircle,
    label: "Approval Center",
    description: "Pusat persetujuan",
    category: "approval",
  },
  {
    to: "/my-waschen/approval",
    icon: HiOutlineCheckCircle,
    label: "Approval List",
    description: "Daftar persetujuan",
    category: "approval",
  },
  {
    to: "/my-waschen/purchase-requests",
    icon: HiOutlineShoppingCart,
    label: "Purchase Requests",
    description: "Permintaan pembelian",
    category: "approval",
  },
  {
    to: "/my-waschen/purchase-request-approval",
    icon: HiOutlineShoppingCart,
    label: "PR Approval",
    description: "Approval purchase request",
    category: "approval",
  },
  {
    to: "/my-waschen/setor-approval",
    icon: HiOutlineCurrencyDollar,
    label: "Setor Approval",
    description: "Approval setoran",
    category: "approval",
  },
  {
    to: "/my-waschen/cash-deposit-approval",
    icon: HiOutlineCurrencyDollar,
    label: "Cash Deposit Approval",
    description: "Approval deposit tunai",
    category: "approval",
  },
  {
    to: "/my-waschen/kas-approval",
    icon: HiOutlineBanknotes,
    label: "Kas Approval",
    description: "Approval kas",
    category: "approval",
  },

  // ── CRM / Marketing ──
  {
    to: "/my-waschen/birthday",
    icon: HiOutlineGift,
    label: "Birthday Program",
    description: "Program ulang tahun",
    category: "crm",
  },

  // ── Laporan & Monitoring ──
  {
    to: "/my-waschen/comparison-report",
    icon: HiOutlineChartBarSquare,
    label: "Comparison Report",
    description: "Perbandingan outlet",
    category: "reports",
  },
  {
    to: "/my-waschen/forecast",
    icon: HiOutlineArrowTrendingUp,
    label: "Forecast",
    description: "Prediksi pendapatan",
    category: "reports",
  },
  {
    to: "/my-waschen/general-report",
    icon: HiOutlineDocumentText,
    label: "General Report",
    description: "Laporan umum",
    category: "reports",
  },
  {
    to: "/my-waschen/error-dashboard",
    icon: HiOutlineExclamationTriangle,
    label: "Error Tracking",
    description: "Pelacakan error",
    category: "reports",
  },

  // ── Outlet & Layanan ──
  {
    to: "/my-waschen/info-outlet",
    icon: HiOutlineBuildingStorefront,
    label: "Info Outlet",
    description: "Informasi outlet",
    category: "outlet",
  },
  {
    to: "/my-waschen/kelola-layanan-outlet",
    icon: HiOutlineWrenchScrewdriver,
    label: "Kelola Layanan Outlet",
    description: "Layanan per outlet",
    category: "outlet",
  },
  {
    to: "/my-waschen/manajemen-layanan",
    icon: HiOutlineClipboardDocumentList,
    label: "Manajemen Layanan",
    description: "CRUD layanan",
    category: "outlet",
  },
  {
    to: "/my-waschen/manajemen-outlet",
    icon: HiOutlineMapPin,
    label: "Manajemen Outlet",
    description: "CRUD outlet",
    category: "outlet",
  },
  {
    to: "/my-waschen/manajemen-user",
    icon: HiOutlineUsers,
    label: "Manajemen User",
    description: "Pengelolaan pengguna",
    category: "outlet",
  },
  {
    to: "/my-waschen/inventory-master",
    icon: HiOutlineArchiveBox,
    label: "Inventory Master",
    description: "Master inventaris",
    category: "outlet",
  },
  {
    to: "/my-waschen/all-outlet-stocks",
    icon: HiOutlineServer,
    label: "All Outlet Stocks",
    description: "Stok semua outlet",
    category: "outlet",
  },
];

const CATEGORY_LABELS = {
  dashboard: "Dashboard",
  admin: "Admin",
  approval: "Approval",
  crm: "CRM & Marketing",
  reports: "Laporan & Monitoring",
  outlet: "Outlet & Layanan",
};

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
          isActive
            ? "bg-gradient-to-r from-violet-600 to-purple-500 text-white shadow-md shadow-violet-500/30"
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
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold leading-none">{label}</p>
              <p
                className={cn(
                  "mt-0.5 truncate text-[11px] leading-none",
                  isActive ? "text-violet-100" : "text-slate-400",
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

function Sidebar({ collapsed = false, onClose }) {
  const navigate = useNavigate();

  const grouped = MENU_ITEMS.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categoryOrder = ["dashboard", "admin", "approval", "crm", "reports", "outlet"];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Brand header ── */}
      <div
        className={cn(
          "flex items-center border-b border-slate-100 py-4",
          collapsed
            ? "justify-center px-2"
            : onClose
              ? "justify-between gap-3 px-5"
              : "px-5",
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-400 shadow-md">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.5 3.5A2 2 0 0 0 17.5 2h-11A2 2 0 0 0 4.5 3.5v17a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-17ZM12 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-5.5 13.5c0-2.485 2.485-4.5 5.5-4.5s5.5 2.015 5.5 4.5h-11Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800 leading-tight">My Waschen</p>
              <p className="truncate text-[11px] text-slate-400">POS Laundry System</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-400 shadow-md">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.5 3.5A2 2 0 0 0 17.5 2h-11A2 2 0 0 0 4.5 3.5v17a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-17ZM12 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-5.5 13.5c0-2.485 2.485-4.5 5.5-4.5s5.5 2.015 5.5 4.5h-11Z" />
            </svg>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition lg:hidden"
            aria-label="Tutup sidebar"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Scrollable nav area ── */}
      <div className="flex-1 overflow-y-auto">
        {categoryOrder.map((cat) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;

          return (
            <div key={cat}>
              {!collapsed && (
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {CATEGORY_LABELS[cat] || cat}
                </p>
              )}
              {collapsed && <div className="pt-3" />}
              <nav className={cn("space-y-0.5", collapsed ? "px-1.5" : "px-3")}>
                {items.map((item) => (
                  <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
                ))}
              </nav>
            </div>
          );
        })}
      </div>

      {/* ── Footer: back to portal ── */}
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

  const label = active?.label ?? "My Waschen";
  const description = active?.description ?? "Aplikasi POS Waschen Laundry";
  const Icon = active?.icon ?? HiOutlineSquares2X2;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 border border-violet-200 text-violet-600 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-slate-800">{label}</p>
        <p className="text-[11px] leading-tight text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default function MyWaschen() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setCollapsed] = useState(false);
  const drawerRef = useRef(null);

  // Keyboard: Escape to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Set page title
  useEffect(() => {
    document.title = "My Waschen | Alora Group Indonesia";
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-in-out overflow-hidden",
          desktopCollapsed ? "w-20" : "w-64",
        )}
      >
        <Sidebar collapsed={desktopCollapsed} />
      </aside>

      {/* ── Mobile overlay ── */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile drawer ── */}
      <aside
        ref={drawerRef}
        aria-label="Sidebar navigasi"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Main content area ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Desktop topbar ── */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              aria-label={desktopCollapsed ? "Buka sidebar" : "Tutup sidebar"}
            >
              <HiOutlineBars3 className="h-5 w-5" />
            </button>
            <ActiveMenuTitle />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            My Waschen POS
          </div>
        </header>

        {/* ── Mobile topbar ── */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-400">
              <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.5 3.5A2 2 0 0 0 17.5 2h-11A2 2 0 0 0 4.5 3.5v17a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-17ZM12 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-5.5 13.5c0-2.485 2.485-4.5 5.5-4.5s5.5 2.015 5.5 4.5h-11Z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-700">My Waschen</span>
          </div>
        </header>

        {/* ── Outlet: render child routes ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
