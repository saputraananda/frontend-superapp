import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
	HiOutlineArrowLeft,
	HiOutlineBars3,
	HiOutlineCalendarDays,
	HiOutlineClipboardDocumentList,
	HiOutlineCog6Tooth,
	HiOutlineXMark,
	HiOutlineDocumentText,
	HiOutlineClipboardDocument,
} from "react-icons/hi2";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

const MENU_ITEMS = [
	{
		to: "/absensi-ikm",
		icon: HiOutlineCalendarDays,
		label: "Dashboard Absensi",
		description: "Rekap & monitoring absensi",
		end: true,
	},
	{
		to: "/perizinan-ikm",
		icon: HiOutlineClipboardDocumentList,
		label: "Cuti & Perizinan",
		description: "Kelola izin, sakit & cuti",
	},
	{
		to: "/master-absensi",
		icon: HiOutlineCog6Tooth,
		label: "Master Absensi",
		description: "Manajemen data shift",
	},
	{
		to: "/linen-report-ikm",
		icon: HiOutlineDocumentText,
		label: "Linen Report",
		description: "Catatan temuan linen",
	},
	{
		to: "/leader-daily-report",
		icon: HiOutlineClipboardDocument,
		label: "Leader Daily Report",
		description: "Laporan harian operasional",
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
					isActive
						? "bg-blue-600 text-white shadow-md shadow-blue-200"
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
									isActive ? "text-blue-100" : "text-slate-400",
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

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Brand header */}
			<div
				className={cn(
					"flex items-center border-b border-slate-100 py-4",
					collapsed ? "justify-center px-2" : onClose ? "justify-between px-5 gap-3" : "px-5",
				)}
			>
				{!collapsed && (
					<div className="flex min-w-0 flex-1 items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-800 to-cyan-500 shadow-md">
							<HiOutlineCalendarDays className="h-5 w-5 text-white" />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-bold text-slate-800 leading-tight truncate">Absensi IKM</p>
							<p className="text-[11px] text-slate-400 truncate">Alora Group Indonesia</p>
						</div>
					</div>
				)}
				{collapsed && (
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-800 to-cyan-500 shadow-md">
						<HiOutlineCalendarDays className="h-5 w-5 text-white" />
					</div>
				)}
				{/* Mobile close button */}
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

			{/* Menu label */}
			{!collapsed && (
				<p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
					Menu
				</p>
			)}
			{collapsed && <div className="pt-3" />}

			{/* Navigation */}
			<nav className={cn("flex-1 overflow-y-auto space-y-0.5", collapsed ? "px-1.5" : "px-3")}>
				{MENU_ITEMS.map((item) => (
					<NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
				))}
			</nav>

			{/* Footer: back to portal */}
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
						collapsed && "justify-center px-2",
					)}
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

export default function AbsensiIKM() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [desktopCollapsed, setDesktopCollapsed] = useState(false);
	const drawerRef = useRef(null);

	// Close on Escape key
	useEffect(() => {
		const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	// Trap body scroll when drawer is open
	useEffect(() => {
		document.body.style.overflow = mobileOpen ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [mobileOpen]);

	return (
		<div className="flex h-screen overflow-hidden bg-indigo-50">
			{/* ── Desktop sidebar ─────────────────────────────────────────── */}
			<aside
				className={cn(
					"hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 ease-in-out overflow-hidden",
					desktopCollapsed ? "w-20" : "w-64",
				)}
			>
				<Sidebar collapsed={desktopCollapsed} />
			</aside>

			{/* ─── Mobile overlay ────────────────────────────────────────────── */}
			<div
				aria-hidden="true"
				className={cn(
					"fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
					mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
				)}
				onClick={() => setMobileOpen(false)}
			/>

			{/* ─── Mobile drawer ─────────────────────────────────────────────── */}
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

			{/* ─── Page area ─────────────────────────────────────────────────── */}
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				<header className="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setDesktopCollapsed((prev) => !prev)}
							className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
							aria-label={desktopCollapsed ? "Buka sidebar" : "Tutup sidebar"}
						>
							{desktopCollapsed ? (
								<HiOutlineBars3 className="h-5 w-5" />
							) : (
								<HiOutlineXMark className="h-5 w-5" />
							)}
						</button>

						<div>
							<p className="text-sm font-semibold text-slate-800">Navigasi Absensi IKM</p>
							<p className="text-xs text-slate-500">
								{desktopCollapsed ? "Sidebar disembunyikan ringkas" : "Sidebar aktif dan siap digunakan"}
							</p>
						</div>
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
						onClick={() => setMobileOpen((prev) => !prev)}
						className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition"
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
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-800 to-cyan-500">
							<HiOutlineCalendarDays className="h-3.5 w-3.5 text-white" />
						</div>
						<span className="text-sm font-bold text-slate-700">Absensi IKM</span>
					</div>
				</header>

				{/* Scrollable content */}
				<div className="flex-1 overflow-y-auto overflow-x-hidden">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
