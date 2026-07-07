import { useEffect, useRef, useState, useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
	HiOutlineArrowLeft,
	HiOutlineBars3,
	HiOutlineBuildingOffice2,
	HiOutlineSquares2X2,
	HiOutlineTableCells,
	HiOutlineCog6Tooth,
	HiOutlineSwatch,
	HiOutlineCircleStack,
	HiOutlineFolder,
	HiOutlineTruck,
	HiOutlineXMark,
} from "react-icons/hi2";

function cn(...c) {
	return c.filter(Boolean).join(" ");
}

const MENU_SECTIONS = [
	{
		label: "Dashboard",
		items: [
			{
				to: "/rumah-sakit-ikm",
				icon: HiOutlineBuildingOffice2,
				label: "Data Rumah Sakit",
				description: "Kelola data & lokasi RS",
				end: true,
			},
			{
				to: "/linen-ikm",
				icon: HiOutlineTableCells,
				label: "Data Linen",
				description: "Manajemen data linen",
			},
		],
	},
	{
		label: "Master Linen RS",
		items: [
			{
				label: "Eka BSD",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-bsd-linen", label: "Master Data Linen", description: "Master linen RS Eka BSD" },
					{ to: "/eka-bsd-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka BSD" },
				],
			},
			{
				label: "Eka MT.Haryono",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-mth-linen", label: "Master Data Linen", description: "Master linen RS Eka MTH" },
					{ to: "/eka-mth-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka MTH" },
				],
			},
			{
				label: "Eka Depok",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-depok-linen", label: "Master Data Linen", description: "Master linen RS Eka Depok" },
					{ to: "/eka-depok-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka Depok" },
				],
			},
			{
				label: "Eka Cilegon",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-cilegon-linen", label: "Master Data Linen", description: "Master linen RS Eka Cilegon" },
					{ to: "/eka-cilegon-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka Cilegon" },
				],
			},
			{
				label: "Eka Permata Hijau",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-phj-linen", label: "Master Data Linen", description: "Master linen RS Eka PHJ" },
					{ to: "/eka-phj-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka PHJ" },
				],
			},
			{
				label: "Eka Cibubur",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-cbb-linen", label: "Master Data Linen", description: "Master linen RS Eka Cibubur" },
					{ to: "/eka-cbb-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka Cibubur" },
				],
			},
			{
				label: "Eka Bekasi",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-bks-linen", label: "Master Data Linen", description: "Master linen RS Eka Bekasi" },
					{ to: "/eka-bks-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka Bekasi" },
				],
			},
			{
				label: "Eka Grand Family PIK",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-gfpik-linen", label: "Master Data Linen", description: "Master linen RS Eka Grand Family PIK" },
					{ to: "/eka-gfpik-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka Grand Family PIK" },
				],
			},
			{
				label: "Eka Family Pluit",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/eka-fpluit-linen", label: "Master Data Linen", description: "Master linen RS Eka Family Pluit" },
					{ to: "/eka-fpluit-stock-opname", label: "Stock Opname", description: "Stock opname RS Eka Family Pluit" },
				],
			},
			{
				label: "Permata Cibubur",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/permata-cbb-linen", label: "Master Data Linen", description: "Master linen RS Permata Cibubur" },
					{ to: "/permata-cbb-stock-opname", label: "Stock Opname", description: "Stock opname RS Permata Cibubur" },
				],
			},
			{
				label: "RSIA Bunda Jakarta",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/rsia-bunda-jkt-linen", label: "Master Data Linen", description: "Master linen RSIA Bunda Jakarta" },
					{ to: "/rsia-bunda-jkt-stock-opname", label: "Stock Opname", description: "Stock opname RSIA Bunda Jakarta" },
				],
			},
			{
				label: "RSU Bunda Jakarta",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/rsu-bunda-jkt-linen", label: "Master Data Linen", description: "Master linen RSU Bunda Jakarta" },
					{ to: "/rsu-bunda-jkt-stock-opname", label: "Stock Opname", description: "Stock opname RSU Bunda Jakarta" },
				],
			},
			{
				label: "RSU Bunda Margonda",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/rsu-bunda-mgd-linen", label: "Master Data Linen", description: "Master linen RSU Bunda Margonda" },
					{ to: "/rsu-bunda-mgd-stock-opname", label: "Stock Opname", description: "Stock opname RSU Bunda Margonda" },
				],
			},
			{
				label: "Columbia BSD",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/columbia-bsd-linen", label: "Master Data Linen", description: "Master linen RS Columbia BSD" },
					{ to: "/columbia-bsd-stock-opname", label: "Stock Opname", description: "Stock opname RS Columbia BSD" },
				],
			},
			{
				label: "Atma Jaya Hospital",
				icon: HiOutlineSquares2X2,
				subItems: [
					{ to: "/atma-jaya-jkt-linen", label: "Master Data Linen", description: "Master linen RS Atma Jaya JKT" },
					{ to: "/atma-jaya-jkt-stock-opname", label: "Stock Opname", description: "Stock opname RS Atma Jaya JKT" },
				],
			},
		],
	},
	{
		label: "Master Data",
		items: [
			{
				to: "/master-data-ikm/size",
				icon: HiOutlineCog6Tooth,
				label: "Ukuran",
				description: "Master ukuran (S, M, L, ...)",
			},
			{
				to: "/master-data-ikm/color",
				icon: HiOutlineSwatch,
				label: "Warna",
				description: "Master warna linen",
			},
			{
				to: "/master-data-ikm/material",
				icon: HiOutlineCircleStack,
				label: "Bahan",
				description: "Master bahan linen",
			},
			{
				to: "/master-data-ikm/category",
				icon: HiOutlineFolder,
				label: "Kategori Linen",
				description: "Master kategori linen",
			},
			{
				to: "/master-data-ikm/vendor",
				icon: HiOutlineTruck,
				label: "Vendor",
				description: "Master vendor pemasok",
			},
		],
	},
];

const ALL_MENU_ITEMS = MENU_SECTIONS.flatMap(s =>
	s.items.flatMap(item => item.subItems ? item.subItems : [item])
);

function NavItem({ to, icon: Icon, label, description, end, subItems, onClose, collapsed, expanded, onToggle }) {
	const { pathname } = useLocation();

	// Check if active or if any sub-item is active
	const isSubActive = subItems ? subItems.some(sub => pathname === sub.to) : false;
	const isActive = to ? (pathname === to) : isSubActive;

	if (subItems) {
		return (
			<div className="flex flex-col">
				<button
					type="button"
					onClick={onToggle}
					className={cn(
						"group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left outline-none",
						isSubActive && !collapsed
							? "bg-red-50 text-red-700 font-semibold"
							: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
					)}
				>
					<div
						className={cn(
							"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
							isSubActive
								? "bg-red-100 text-red-700"
								: "border border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600",
						)}
					>
						<Icon className="h-4 w-4" />
					</div>
					{!collapsed && (
						<div className="min-w-0 flex-1 overflow-hidden flex items-center justify-between">
							<div>
								<p className="truncate text-sm font-semibold leading-none">{label}</p>
								<p className="mt-0.5 truncate text-[11px] leading-none text-slate-400">
									{subItems.length} Sub Menu
								</p>
							</div>
							<svg
								className={cn("h-4 w-4 transform transition-transform text-slate-400", expanded ? "rotate-180" : "")}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</div>
					)}
				</button>

				{expanded && !collapsed && (
					<div className="ml-8 mt-1 space-y-1 border-l border-slate-100 pl-3">
						{subItems.map((sub) => {
							const subActive = pathname === sub.to;
							return (
								<NavLink
									key={sub.to}
									to={sub.to}
									onClick={onClose}
									className={cn(
										"block py-2 px-3 text-xs rounded-lg transition-colors font-medium",
										subActive
											? "bg-red-600 text-white font-semibold shadow-sm"
											: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
									)}
								>
									{sub.label}
								</NavLink>
							);
						})}
					</div>
				)}
			</div>
		);
	}

	return (
		<NavLink
			to={to}
			end={end}
			onClick={onClose}
			className={({ isActive }) =>
				cn(
					"group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
					isActive
						? "bg-red-600 text-white shadow-sm shadow-red-200"
						: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
				)
			}
		>
			{({ isActive }) => (
				<>
					<div
						className={cn(
							"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
							isActive
								? "bg-white/20 text-white"
								: "border border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600",
						)}
					>
						<Icon className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1 overflow-hidden">
						<p className="truncate text-sm font-semibold leading-none">{label}</p>
						<p className={cn("mt-0.5 truncate text-[11px] leading-none", isActive ? "text-red-100" : "text-slate-400")}>
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
	const { pathname } = useLocation();

	// Find active section based on the current URL path
	const activeSection = useMemo(() => {
		return MENU_SECTIONS.flatMap(s => s.items).find(item =>
			item.subItems ? item.subItems.some(sub => pathname === sub.to) : false
		);
	}, [pathname]);

	const [expandedSection, setExpandedSection] = useState(activeSection?.label || null);

	// Sync expanded state when pathname changes
	useEffect(() => {
		if (activeSection) {
			setExpandedSection(activeSection.label);
		}
	}, [pathname, activeSection]);

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Brand */}
			<div
				className={cn(
					"flex items-center border-b border-slate-100 py-4",
					collapsed ? "justify-center px-2" : onClose ? "justify-between px-5 gap-3" : "px-5",
				)}
			>
				{!collapsed && (
					<div className="flex min-w-0 flex-1 items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-800 to-orange-500 shadow-sm">
							<HiOutlineBuildingOffice2 className="h-5 w-5 text-white" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-bold text-slate-800 leading-tight">Data RS & Linen</p>
							<p className="truncate text-[11px] text-slate-400">Alora Group Indonesia</p>
						</div>
					</div>
				)}
				{collapsed && (
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-800 to-orange-500 shadow-sm">
						<HiOutlineBuildingOffice2 className="h-5 w-5 text-white" />
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

			<nav className={cn("flex-1 overflow-y-auto space-y-4", collapsed ? "px-1.5" : "px-3")}>
				{MENU_SECTIONS.map((section) => (
					<div key={section.label}>
						{!collapsed && (
							<p className="px-2 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{section.label}</p>
						)}
						{collapsed && <div className="pt-3" />}
						<div className="space-y-0.5">
							{section.items.map((item) => (
								<NavItem
									key={item.to || item.label}
									{...item}
									onClose={onClose}
									collapsed={collapsed}
									expanded={expandedSection === item.label}
									onToggle={() => setExpandedSection(expandedSection === item.label ? null : item.label)}
								/>
							))}
						</div>
					</div>
				))}
			</nav>

			<div className={cn("border-t border-slate-100 py-3", collapsed ? "px-1.5" : "px-3")}>
				<button
					type="button"
					onClick={() => { if (onClose) onClose(); navigate("/portal"); }}
					className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
				>
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 group-hover:text-slate-600 transition">
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
		ALL_MENU_ITEMS.find((m) => m.end && pathname === m.to) ??
		ALL_MENU_ITEMS.find((m) => !m.end && pathname.startsWith(m.to));

	const label = active?.label ?? "RS IKM";
	const description = active?.description ?? "Navigasi modul RS IKM";

	return (
		<div>
			<p className="text-sm font-semibold leading-tight text-slate-800">{label}</p>
			<p className="text-[11px] leading-tight text-slate-400">{description}</p>
		</div>
	);
}

export default function MasterRsIkm() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [desktopCollapsed, setDesktopCollapsed] = useState(false);
	const drawerRef = useRef(null);

	useEffect(() => {
		const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		document.body.style.overflow = mobileOpen ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [mobileOpen]);

	return (
		<div className="flex h-screen overflow-hidden bg-rose-50">
			{/* Desktop sidebar */}
			<aside
				className={cn(
					"hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-in-out overflow-hidden",
					desktopCollapsed ? "w-20" : "w-64",
				)}
			>
				<Sidebar collapsed={desktopCollapsed} />
			</aside>

			{/* Mobile overlay */}
			<div
				aria-hidden="true"
				className={cn(
					"fixed inset-0 z-40 bg-black/50 lg:hidden",
					mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
				)}
				onClick={() => setMobileOpen(false)}
			/>

			{/* Mobile drawer */}
			<aside
				ref={drawerRef}
				aria-label="Sidebar navigasi"
				className={cn(
					"fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-slate-200 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:hidden",
					mobileOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<Sidebar onClose={() => setMobileOpen(false)} />
			</aside>

			{/* Content */}
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				{/* Desktop topbar with toggle */}
				<header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
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
					<div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
						<div className="h-2 w-2 rounded-full bg-emerald-500" />
						Desktop Mode
					</div>
				</header>

				{/* Mobile topbar */}
				<header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
					<button
						type="button"
						onClick={() => setMobileOpen((p) => !p)}
						className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition"
						aria-label="Buka menu navigasi"
						aria-expanded={mobileOpen}
					>
						{mobileOpen ? <HiOutlineXMark className="h-5 w-5" /> : <HiOutlineBars3 className="h-5 w-5" />}
					</button>
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-800 to-orange-500">
							<HiOutlineBuildingOffice2 className="h-3.5 w-3.5 text-white" />
						</div>
						<span className="text-sm font-bold text-slate-700">Data RS IKM</span>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto overflow-x-hidden">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
