import { useEffect, useRef, useState } from "react";
import { ThermalPrinterProvider } from "./context/ThermalPrinterContext";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineBars3,
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineTag,
  HiOutlineShoppingBag,
  HiOutlineBolt,
  HiOutlineSparkles,
  HiOutlineCreditCard,
  HiOutlineScale,
  HiOutlineXMark,
  HiOutlineUserGroup,
  HiOutlineBanknotes,
  HiOutlineWallet,
  HiOutlineTicket,
  HiOutlineQueueList,
  HiOutlineGlobeAlt,
  HiOutlineChevronDown,
  HiOutlineCircleStack,
  HiOutlineSwatch,
  HiOutlineBeaker,
  HiOutlineBuildingStorefront,
  HiOutlineClipboardDocumentList,
  HiOutlineReceiptPercent,
  HiOutlinePrinter,
  HiOutlineArchiveBox,
  HiOutlineChartBarSquare,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineClipboardDocumentCheck,
  HiOutlineSun,
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const SIDEBAR_WIDTH_KEY = "myWaschen.sidebarWidth";
const SIDEBAR_OPEN_SECTIONS_KEY = "myWaschen.sidebarOpenSections.v2";
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 288;

function clampSidebarWidth(width) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

function readStoredSidebarWidth() {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (!raw) return SIDEBAR_DEFAULT_WIDTH;
    return clampSidebarWidth(Number(raw));
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

const MENU_SECTIONS = [
  {
    id: "hris",
    label: "HRIS",
    icon: HiOutlineUsers,
    items: [
      {
        to: "/my-waschen/employees",
        icon: HiOutlineUsers,
        label: "Data Karyawan",
        description: "Pengelolaan staff Waschen",
      },
      {
        to: "/my-waschen/hris/absensi",
        icon: HiOutlineClock,
        label: "Absensi",
        description: "Rekap absensi & perizinan karyawan",
      },
      {
        to: "/my-waschen/hris/perizinan",
        icon: HiOutlineClipboardDocumentCheck,
        label: "Perizinan",
        description: "Approval izin, sakit, cuti",
      },
      {
        to: "/my-waschen/hris/kasbon",
        icon: HiOutlineBanknotes,
        label: "Kasbon",
        description: "Approval kasbon & pinjaman",
      },
      {
        to: "/my-waschen/hris/jadwal-libur",
        icon: HiOutlineSun,
        label: "Jadwal Libur",
        description: "Penetapan & approval libur karyawan",
      },
    ],
  },
  {
    id: "transaksi",
    label: "Transaksi",
    icon: HiOutlineReceiptPercent,
    items: [
      {
        to: "/my-waschen",
        icon: HiOutlineSquares2X2,
        label: "Dashboard",
        description: "Ringkasan & statistik bisnis",
        end: true,
      },
      {
        to: "/my-waschen/customers",
        icon: HiOutlineUserGroup,
        label: "Data Customer",
        description: "Database pelanggan & membership",
      },
      {
        to: "/my-waschen/transactions",
        icon: HiOutlineClipboardDocumentList,
        label: "Riwayat Transaksi",
        description: "Nota, refund, dan pengajuan hapus",
      },
      {
        to: "/my-waschen/daily-report",
        icon: HiOutlineCalendarDays,
        label: "Daily Report",
        description: "Pantau & koreksi saldo shift frontliner",
      },
      {
        to: "/my-waschen/petty-cash",
        icon: HiOutlineBanknotes,
        label: "Petty Cash",
        description: "Approval pengajuan kas laci outlet",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: HiOutlineArchiveBox,
    items: [
      {
        to: "/my-waschen/inventory/dashboard",
        icon: HiOutlineChartBarSquare,
        label: "Dashboard Inventory",
        description: "Resume stok cepat semua outlet",
      },
      {
        to: "/my-waschen/inventory",
        icon: HiOutlineArchiveBox,
        label: "Manajemen Inventory",
        description: "Stok warehouse per outlet",
        end: true,
      },
    ],
  },
  {
    id: "master",
    label: "Master Data",
    icon: HiOutlineCircleStack,
    items: [
      {
        to: "/my-waschen/master/services",
        icon: HiOutlineShoppingBag,
        label: "Katalog Layanan",
        description: "Daftar tarif & spesifikasi layanan",
      },
      {
        to: "/my-waschen/master/nota-settings",
        icon: HiOutlinePrinter,
        label: "Konfigurasi Nota",
        description: "Preview & toggle field nota thermal",
      },
      {
        to: "/my-waschen/master/category-services",
        icon: HiOutlineTag,
        label: "Kategori Layanan",
        description: "Pengelolaan grup jenis layanan",
      },
      {
        to: "/my-waschen/master/outlets",
        icon: HiOutlineBuildingStorefront,
        label: "Master Outlet",
        description: "Cabang & kode singkatan outlet",
      },
      {
        to: "/my-waschen/master/units",
        icon: HiOutlineScale,
        label: "Master Satuan",
        description: "Satuan unit (Pcs, Kg, Liter, Roll, dll)",
      },
      {
        to: "/my-waschen/master/service-speeds",
        icon: HiOutlineBolt,
        label: "Kecepatan Layanan",
        description: "Durasi & surcharge express",
      },
      {
        to: "/my-waschen/master/materials",
        icon: HiOutlineSwatch,
        label: "Master Material",
        description: "Jenis bahan pakaian / laundry",
      },
      {
        to: "/my-waschen/master/method-laundries",
        icon: HiOutlineBeaker,
        label: "Metode Laundry",
        description: "Wet Clean & Dry Clean",
      },
      {
        to: "/my-waschen/master/parfumes",
        icon: HiOutlineSparkles,
        label: "Parfum Laundry",
        description: "Varian aroma & parfum premium",
      },
      {
        to: "/my-waschen/master/membership-packages",
        icon: HiOutlineCreditCard,
        label: "Paket Membership",
        description: "Paket deposit & kuota kiloan",
      },
      {
        to: "/my-waschen/master/customer-tiers",
        icon: HiOutlineSparkles,
        label: "Tier Pelanggan",
        description: "Tier spending organik VIP/Gold/Reguler",
      },
      {
        to: "/my-waschen/master/customer-sources",
        icon: HiOutlineGlobeAlt,
        label: "Sumber Pelanggan",
        description: "Master sumber akuisisi pelanggan",
      },
      {
        to: "/my-waschen/master/payment-methods",
        icon: HiOutlineBanknotes,
        label: "Metode Pembayaran",
        description: "Opsi pembayaran di POS",
      },
      {
        to: "/my-waschen/master/petty-cash-categories",
        icon: HiOutlineWallet,
        label: "Kategori Petty Cash",
        description: "Kategori kas kecil outlet",
      },
      {
        to: "/my-waschen/master/promos",
        icon: HiOutlineTicket,
        label: "Master Promo",
        description: "Promo & diskon transaksi",
      },
      {
        to: "/my-waschen/master/work-statuses",
        icon: HiOutlineQueueList,
        label: "Status Pekerjaan",
        description: "Alur status order laundry",
      },
      {
        to: "/my-waschen/master/day-off-policy",
        icon: HiOutlineSun,
        label: "Rules Libur",
        description: "Kebijakan kuota jadwal libur karyawan",
      },
    ],
  },
];

const MENU_ITEMS = MENU_SECTIONS.flatMap((section) => section.items);

function isItemActive(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

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
            ? "bg-gradient-to-r from-[#5f1340] to-[#4a0d31] text-white shadow-md shadow-[#5f1340]/30"
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
                  isActive ? "text-pink-100" : "text-slate-400",
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

function DropdownSection({ section, open, onToggle, collapsed, onClose, pathname }) {
  const SectionIcon = section.icon;
  const hasActiveChild = section.items.some((item) => isItemActive(pathname, item));

  if (collapsed) {
    return (
      <nav className="space-y-0.5 px-1.5">
        {section.items.map((item) => (
          <NavItem key={item.to} {...item} onClose={onClose} collapsed />
        ))}
      </nav>
    );
  }

  return (
    <div className="px-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
          hasActiveChild
            ? "bg-[#5f1340]/8 text-[#5f1340]"
            : "text-slate-700 hover:bg-slate-100",
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition",
            hasActiveChild
              ? "border-[#5f1340]/20 bg-white text-[#5f1340]"
              : "border-slate-200 bg-white text-slate-400",
          )}
        >
          <SectionIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-none">{section.label}</p>
          <p className="mt-0.5 truncate text-[11px] leading-none text-slate-400">
            {section.items.length} menu
          </p>
        </div>
        <HiOutlineChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
            hasActiveChild && "text-[#5f1340]",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <nav className="mt-1 space-y-0.5 border-l border-slate-200 ml-5 pl-2 pb-1">
            {section.items.map((item) => (
              <NavItem key={item.to} {...item} onClose={onClose} collapsed={false} />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ collapsed = false, onClose }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [openSections, setOpenSections] = useState(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_OPEN_SECTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
      /* ignore */
    }
    return { hris: false, transaksi: false, inventory: false, master: false };
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_OPEN_SECTIONS_KEY, JSON.stringify(openSections));
    } catch {
      /* ignore */
    }
  }, [openSections]);

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5f1340] to-[#4a0d31] shadow-md">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 4.5 6.5 19.5 12 8.5 17.5 19.5 20 4.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800 leading-tight">My Waschen</p>
              <p className="truncate text-[11px] text-slate-400">POS Laundry System</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5f1340] to-[#4a0d31] shadow-md">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M4 4.5 6.5 19.5 12 8.5 17.5 19.5 20 4.5" />
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

      <div className="flex-1 overflow-y-auto py-3 space-y-2">
        {MENU_SECTIONS.map((section) => (
          <DropdownSection
            key={section.id}
            section={section}
            open={Boolean(openSections[section.id])}
            onToggle={() => toggleSection(section.id)}
            collapsed={collapsed}
            onClose={onClose}
            pathname={pathname}
          />
        ))}
      </div>

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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 border border-pink-200 text-[#5f1340] shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-[#313030]">{label}</p>
        <p className="text-[11px] leading-tight text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function MyWaschen() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const drawerRef = useRef(null);
  const resizeStateRef = useRef({ startX: 0, startWidth: SIDEBAR_DEFAULT_WIDTH });

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

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {
      /* ignore */
    }
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return undefined;

    const onMove = (e) => {
      const clientX = e.touches?.[0]?.clientX ?? e.clientX;
      const delta = clientX - resizeStateRef.current.startX;
      const next = clampSidebarWidth(resizeStateRef.current.startWidth + delta);
      setSidebarWidth(next);
      if (desktopCollapsed) setCollapsed(false);
    };

    const onUp = () => setIsResizing(false);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [isResizing, desktopCollapsed]);

  useEffect(() => {
    document.title = "My Waschen | Alora Group Indonesia";
  }, []);

  const startResize = (e) => {
    if (desktopCollapsed) return;
    e.preventDefault();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    resizeStateRef.current = { startX: clientX, startWidth: sidebarWidth };
    setIsResizing(true);
  };

  const currentDesktopWidth = desktopCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  return (
    <ThermalPrinterProvider>
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside
        className={cn(
          "relative hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm overflow-hidden",
          !isResizing && "transition-[width] duration-200 ease-out",
        )}
        style={{ width: currentDesktopWidth }}
      >
        <Sidebar collapsed={desktopCollapsed} />

        {!desktopCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Sesuaikan lebar sidebar"
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            onMouseDown={startResize}
            onTouchStart={startResize}
            onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                setSidebarWidth((w) => clampSidebarWidth(w - 16));
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setSidebarWidth((w) => clampSidebarWidth(w + 16));
              }
            }}
            className={cn(
              "absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize touch-none",
              "hover:bg-[#5f1340]/25 active:bg-[#5f1340]/40",
              isResizing && "bg-[#5f1340]/40",
            )}
            title="Seret untuk ubah lebar · Double-click untuk reset"
          />
        )}
      </aside>

      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileOpen(false)}
      />

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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
        </header>

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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5f1340] to-[#4a0d31]">
              <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 4.5 6.5 19.5 12 8.5 17.5 19.5 20 4.5" />
              </svg>
            </div>
            <span className="text-sm font-bold text-[#313030]">My Waschen</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </div>
    </div>
    </ThermalPrinterProvider>
  );
}
