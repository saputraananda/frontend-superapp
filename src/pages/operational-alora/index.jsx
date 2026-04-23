import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    HiOutlineArrowLeft,
    HiOutlineBars3,
    HiOutlineBeaker,
    HiOutlineCheckBadge,
    HiOutlineChevronDown,
    HiOutlineCpuChip,
    HiOutlineExclamationTriangle,
    HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../lib/api";
import { getOperationalCompanyConfig } from "./components/companyRegistry";

function cn(...c) {
    return c.filter(Boolean).join(" ");
}

const ALLOWED_COMPANY_CODES = new Set(["WL", "CLX", "IKM"]);

function filterOperationalCompanies(companies) {
    return companies.filter((company) => ALLOWED_COMPANY_CODES.has(String(company.company_code || "").toUpperCase()));
}

const MENU_ITEMS = [
    {
        to: "/operational-alora-group",
        icon: HiOutlineCpuChip,
        label: "Dashboard Operasional",
        description: "Monitoring operasional laundry",
        end: true,
    },
    {
        to: "/quality-check-oc",
        icon: HiOutlineCheckBadge,
        label: "Quality Check",
        description: "Kontrol kualitas proses",
        upcoming: true,
    },
    {
        to: "/chemical-treatment-oc",
        icon: HiOutlineBeaker,
        label: "Chemical & Treatment",
        description: "Manajemen bahan kimia",
        upcoming: true,
    },
    {
        to: "/complain-oc",
        icon: HiOutlineExclamationTriangle,
        label: "Complain",
        description: "Monitoring komplain operasional",
        upcoming: true,
    },
];

function CompanyLogo({ companyName, companyConfig, size = "md" }) {
    const imageClass = size === "sm" ? "h-9 max-w-[40px]" : "h-12 max-w-[52px]";

    if (companyConfig.logoSrc) {
        return <img src={companyConfig.logoSrc} alt={companyName} className={cn("w-auto object-contain", imageClass)} />;
    }

    return <HiOutlineCpuChip className="h-8 w-8 text-slate-400" />;
}

function CompanySelect({ companies, selectedCompanyId, onChange, companyConfig, collapsed = false }) {
    if (collapsed) return null;

    return (
        <div className="border-b border-slate-100 px-5 py-4">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Perusahaan
            </label>
            <div className="relative">
                <select
                    value={selectedCompanyId ?? ""}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={cn(
                        "w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition",
                        companyConfig.focusClass
                    )}
                >
                    {companies.map((company) => (
                        <option key={company.company_id} value={company.company_id}>
                            {company.company_code ? `${company.company_code} - ` : ""}
                            {company.company_name}
                        </option>
                    ))}
                </select>
                <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
        </div>
    );
}

function NavItem({ item, onClose, collapsed, companyConfig }) {
    const { to, icon: Icon, label, description, end, upcoming } = item;

    return (
        <NavLink
            to={to}
            end={end}
            onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
                cn(
                    "group relative flex items-start gap-3 rounded-xl px-3 py-3 text-sm transition-all",
                    collapsed && "justify-center px-2",
                    isActive ? companyConfig.navActiveClass : companyConfig.navIdleClass
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
                                : "border border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1 pr-2">
                            <p className="text-sm font-semibold leading-tight text-balance">{label}</p>
                            <p
                                className={cn(
                                    "mt-1 text-[11px] leading-tight text-balance",
                                    isActive ? companyConfig.navDescriptionActiveClass : "text-slate-400"
                                )}
                            >
                                {description}
                            </p>
                        </div>
                    )}
                    {!collapsed && upcoming && (
                        <span className="ml-auto mt-1 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
                            soon
                        </span>
                    )}
                </>
            )}
        </NavLink>
    );
}

function Sidebar({
    collapsed = false,
    onClose,
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompany,
    companyConfig,
}) {
    const navigate = useNavigate();

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div
                className={cn(
                    "flex items-center border-b border-slate-100 py-4",
                    collapsed ? "justify-center px-2" : onClose ? "justify-between gap-3 px-5" : "px-5"
                )}
            >
                {!collapsed && selectedCompany && (
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <CompanyLogo companyName={selectedCompany.company_name} companyConfig={companyConfig} />
                        <div className="min-w-0">
                            <p className="text-sm font-bold leading-tight text-slate-800">Operational Control</p>
                            <p className="text-[11px] text-slate-400">{selectedCompany.company_name}</p>
                        </div>
                    </div>
                )}
                {collapsed && selectedCompany && (
                    <CompanyLogo companyName={selectedCompany.company_name} companyConfig={companyConfig} />
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

            <CompanySelect
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onChange={setSelectedCompanyId}
                companyConfig={companyConfig}
                collapsed={collapsed}
            />

            {!collapsed && (
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Menu
                </p>
            )}
            {collapsed && <div className="pt-3" />}

            <nav className={cn("flex-1 overflow-y-auto space-y-0.5", collapsed ? "px-1.5" : "px-3")}>
                {MENU_ITEMS.map((item) => (
                    <NavItem
                        key={item.to}
                        item={item}
                        onClose={onClose}
                        collapsed={collapsed}
                        companyConfig={companyConfig}
                    />
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
                        "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                        collapsed && "justify-center px-2"
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

export default function OperationalAlora() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
        const stored = window.localStorage.getItem("operational-company-id");
        return stored ? Number(stored) : 5;
    });
    const drawerRef = useRef(null);

    useEffect(() => {
        api("/operational/companies")
            .then((rows) => {
                const filteredCompanies = filterOperationalCompanies(rows);
                setCompanies(filteredCompanies);
                const storedId = Number(window.localStorage.getItem("operational-company-id") || 0);
                const preferredId = storedId || 5;
                const initialCompany = filteredCompanies.find((company) => Number(company.company_id) === preferredId)
                    || filteredCompanies.find((company) => Number(company.company_id) === 5)
                    || filteredCompanies[0];

                if (initialCompany) {
                    setSelectedCompanyId(Number(initialCompany.company_id));
                }
            })
            .catch(() => {
                const fallbackCompanies = filterOperationalCompanies([
                    { company_id: 2, company_code: "IKM", company_name: "PT Intersolusi Karya Mandiri" },
                    { company_id: 3, company_code: "CLX", company_name: "Cleanox Indonesia" },
                    { company_id: 5, company_code: "WL", company_name: "Waschen Laundry" },
                ]);
                setCompanies(fallbackCompanies);
                setSelectedCompanyId(5);
            });
    }, []);

    useEffect(() => {
        if (!selectedCompanyId) return;
        window.localStorage.setItem("operational-company-id", String(selectedCompanyId));
    }, [selectedCompanyId]);

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

    const selectedCompany = useMemo(
        () => companies.find((company) => Number(company.company_id) === Number(selectedCompanyId)) || null,
        [companies, selectedCompanyId]
    );

    const companyConfig = useMemo(
        () => getOperationalCompanyConfig(selectedCompany || { company_id: 5 }),
        [selectedCompany]
    );

    return (
        <div className={cn("flex h-screen overflow-hidden", companyConfig.pageBgClass)}>
            <aside
                className={cn(
                    "hidden shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-in-out overflow-hidden lg:flex",
                    desktopCollapsed ? "w-20" : "w-72"
                )}
            >
                <Sidebar
                    collapsed={desktopCollapsed}
                    companies={companies}
                    selectedCompanyId={selectedCompanyId}
                    setSelectedCompanyId={setSelectedCompanyId}
                    selectedCompany={selectedCompany}
                    companyConfig={companyConfig}
                />
            </aside>

            <div
                aria-hidden="true"
                className={cn(
                    "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
                    mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                )}
                onClick={() => setMobileOpen(false)}
            />

            <aside
                ref={drawerRef}
                aria-label="Sidebar navigasi"
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <Sidebar
                    onClose={() => setMobileOpen(false)}
                    companies={companies}
                    selectedCompanyId={selectedCompanyId}
                    setSelectedCompanyId={setSelectedCompanyId}
                    selectedCompany={selectedCompany}
                    companyConfig={companyConfig}
                />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="hidden items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 lg:flex">
                    <button
                        type="button"
                        onClick={() => setDesktopCollapsed((p) => !p)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                        aria-label={desktopCollapsed ? "Buka sidebar" : "Tutup sidebar"}
                    >
                        {desktopCollapsed ? <HiOutlineBars3 className="h-5 w-5" /> : <HiOutlineXMark className="h-5 w-5" />}
                    </button>
                    {selectedCompany && (
                        <div className="flex items-center gap-2">
                            <CompanyLogo companyName={selectedCompany.company_name} companyConfig={companyConfig} size="sm" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-700">Operational Control</p>
                                <p className="text-xs text-slate-400">{selectedCompany.company_name}</p>
                            </div>
                        </div>
                    )}
                </header>

                <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileOpen((p) => !p)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 active:scale-95"
                        aria-label="Buka menu navigasi"
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <HiOutlineXMark className="h-5 w-5" /> : <HiOutlineBars3 className="h-5 w-5" />}
                    </button>
                    {selectedCompany && (
                        <div className="flex min-w-0 items-center gap-2">
                            <CompanyLogo companyName={selectedCompany.company_name} companyConfig={companyConfig} size="sm" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-700">Operational Control</p>
                                <p className="truncate text-xs text-slate-400">{selectedCompany.company_name}</p>
                            </div>
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-x-hidden overflow-y-auto">
                    <Outlet
                        context={{
                            companies,
                            selectedCompany,
                            selectedCompanyId,
                            setSelectedCompanyId,
                            companyConfig,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
