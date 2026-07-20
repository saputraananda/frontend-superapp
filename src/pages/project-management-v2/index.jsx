import { useEffect, useRef, useState, useCallback } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    HiOutlineArrowLeft,
    HiOutlineBars3,
    HiOutlineXMark,
    HiOutlineFolder,
    HiOutlineRectangleStack,
    HiOutlineClipboardDocumentList,
    HiOutlineChatBubbleLeftRight,
    HiOutlineFolderOpen,
    HiOutlinePlus,
    HiOutlineChevronDown,
    HiOutlineSquares2X2,
} from "react-icons/hi2";
import { api } from "../../lib/api";
import AddWorkspaceModal from "./components/AddWorkspaceModal";
import AddSubWorkspaceModal from "./components/AddSubWorkspaceModal";

function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}

const STATIC_SECTIONS = [
    {
        title: "My Tasks",
        items: [
            {
                to: "/project-management-v2/assigned-to-me",
                icon: HiOutlineRectangleStack,
                label: "Assigned To Me",
                description: "Tugas didelegasikan ke saya",
                end: true,
            },
            {
                to: "/project-management-v2/personal-list",
                icon: HiOutlineClipboardDocumentList,
                label: "Personal List",
                description: "Checklist tugas mandiri",
                end: false,
            },
        ],
    },
    {
        title: "Direct Messages",
        items: [
            {
                to: "/project-management-v2/chat",
                icon: HiOutlineChatBubbleLeftRight,
                label: "Direct Messages",
                description: "Obrolan tim & diskusi",
                end: false,
            },
        ],
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
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
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
                                    isActive ? "text-indigo-100" : "text-slate-400",
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

const GRADIENTS = [
    "from-indigo-500 via-purple-500 to-pink-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-amber-500 via-orange-500 to-rose-500",
    "from-blue-500 via-indigo-500 to-violet-500",
    "from-violet-500 via-fuchsia-500 to-pink-500",
];

const getGradientClass = (id) => {
    const idx = (id || 0) % GRADIENTS.length;
    return GRADIENTS[idx];
};

// ─── Workspace Accordion Item ──────────────────────────────────────────────────
function WorkspaceAccordionItem({ workspace, collapsed, onClose, onAddSub, refreshKey }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [subs, setSubs] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [loadingSubs, setLoadingSubs] = useState(false);

    // Auto-expand if current path matches this workspace
    useEffect(() => {
        if (location.pathname.includes(`/workspaces/${workspace.id}`)) {
            setExpanded(true);
        }
    }, [location.pathname, workspace.id]);

    const loadSubs = useCallback(async () => {
        setLoadingSubs(true);
        try {
            const data = await api(`/api/pm2/workspaces/${workspace.id}/sub`);
            setSubs(data?.data || []);
        } catch {
            setSubs([]);
        } finally {
            setLoadingSubs(false);
        }
    }, [workspace.id]);

    useEffect(() => {
        if (expanded) loadSubs();
    }, [expanded, loadSubs, refreshKey]);

    const toggle = () => setExpanded((v) => !v);

    const handleWorkspaceClick = () => {
        navigate(`/project-management-v2/workspaces/${workspace.id}`);
        setExpanded(true);
        if (onClose) onClose();
    };

    const isWorkspaceActive = location.pathname.startsWith(`/project-management-v2/workspaces/${workspace.id}`);

    if (collapsed) {
        return (
            <NavLink
                to={`/project-management-v2/workspaces/${workspace.id}`}
                title={workspace.title}
                className={cn(
                    "group flex justify-center rounded-xl px-2 py-2.5 transition-all",
                    isWorkspaceActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-600 hover:bg-slate-100",
                )}
            >
                <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                    isWorkspaceActive
                        ? "bg-white/20 text-white"
                        : "border border-slate-200 bg-white text-slate-400 group-hover:text-slate-600",
                )}>
                    <HiOutlineFolderOpen className="h-4 w-4" />
                </div>
            </NavLink>
        );
    }

    return (
        <div className="space-y-0.5">
            {/* Workspace header button */}
            <div className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all cursor-pointer select-none",
                isWorkspaceActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}>
                {/* Icon — click to navigate to workspace */}
                <button
                    onClick={handleWorkspaceClick}
                    className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                        isWorkspaceActive
                            ? "bg-white/20 text-white"
                            : "border border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600",
                    )}
                >
                    <HiOutlineFolderOpen className="h-4 w-4" />
                </button>

                {/* Label — click to navigate & expand */}
                <button onClick={handleWorkspaceClick} className="flex-1 min-w-0 text-left">
                    <p className={cn("truncate text-sm font-semibold leading-none", isWorkspaceActive ? "text-white" : "text-slate-700")}>
                        {workspace.title}
                    </p>
                    <p className={cn("mt-0.5 truncate text-[11px] leading-none", isWorkspaceActive ? "text-indigo-100" : "text-slate-400")}>
                        {workspace.sub_count || 0} sub-workspace
                    </p>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddSub(workspace); }}
                        title="Tambah Sub-Workspace"
                        className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition opacity-0 group-hover:opacity-100",
                            isWorkspaceActive ? "text-indigo-200 hover:text-white hover:bg-white/20" : "text-slate-400 hover:bg-slate-200"
                        )}
                    >
                        <HiOutlinePlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={toggle}
                        className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition",
                            isWorkspaceActive ? "text-indigo-200 hover:text-white" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <HiOutlineChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded ? "rotate-180" : "")} />
                    </button>
                </div>
            </div>

            {/* Sub-workspace list */}
            {expanded && (
                <div className="relative ml-4 pl-3 space-y-0.5">
                    {/* Colorful vertical line */}
                    <div className={cn(
                        "absolute left-0 top-1 bottom-1 w-[2.5px] rounded-full bg-gradient-to-b shadow-sm",
                        getGradientClass(workspace.id)
                    )} />
                    {loadingSubs ? (
                        <div className="flex items-center gap-2 py-2 px-2">
                            <div className="h-3 w-3 animate-spin rounded-full border border-indigo-400 border-t-transparent" />
                            <span className="text-[10px] text-slate-400">Memuat...</span>
                        </div>
                    ) : subs.length === 0 ? (
                        <button
                            onClick={() => onAddSub(workspace)}
                            className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition border border-dashed border-slate-200"
                        >
                            <HiOutlinePlus className="h-3 w-3" /> Tambah sub-workspace
                        </button>
                    ) : (
                        subs.map((sub) => {
                            const subPath = `/project-management-v2/workspaces/${workspace.id}/sub/${sub.id}`;
                            const isSubActive = location.pathname === subPath;
                            return (
                                <NavLink
                                    key={sub.id}
                                    to={subPath}
                                    onClick={onClose}
                                    className={cn(
                                        "group/sub flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold transition",
                                        isSubActive
                                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                    )}
                                >
                                    <div className={cn(
                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded transition",
                                        isSubActive ? "bg-indigo-600 text-white" : "bg-slate-200/60 text-slate-400 group-hover/sub:bg-slate-300"
                                    )}>
                                        <HiOutlineSquares2X2 className="h-3 w-3" />
                                    </div>
                                    <span className="truncate">{sub.title}</span>
                                    {sub.task_count > 0 && (
                                        <span className="ml-auto shrink-0 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                            {sub.task_count}
                                        </span>
                                    )}
                                </NavLink>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Dynamic Business Unit Section ────────────────────────────────────────────
function BusinessUnitSection({ collapsed, onClose }) {
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddWorkspace, setShowAddWorkspace] = useState(false);
    const [addSubTarget, setAddSubTarget] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadWorkspaces = useCallback(async () => {
        try {
            const data = await api("/api/pm2/workspaces");
            setWorkspaces(data?.data || []);
        } catch {
            setWorkspaces([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWorkspaces();
        const handleUpdate = () => {
            setRefreshKey((k) => k + 1);
            loadWorkspaces();
        };
        window.addEventListener("pm2_workspaces_updated", handleUpdate);
        return () => window.removeEventListener("pm2_workspaces_updated", handleUpdate);
    }, [loadWorkspaces]);

    const handleWorkspaceSuccess = () => {
        loadWorkspaces();
    };

    const handleSubSuccess = () => {
        setRefreshKey((k) => k + 1);
        loadWorkspaces();
    };

    return (
        <>
            <div className="space-y-1">
                {!collapsed && (
                    <div className="flex items-center justify-between px-3 pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400/85">
                            Business Unit / Workspace
                        </p>
                        <button
                            onClick={() => setShowAddWorkspace(true)}
                            title="Buat Workspace"
                            className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                        >
                            <HiOutlinePlus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
                {collapsed && <div className="mx-2 my-2 border-t border-slate-100" />}

                <div className="space-y-0.5">
                    {loading ? (
                        collapsed ? (
                            <div className="flex justify-center py-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2">
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-indigo-400 border-t-transparent" />
                                <span className="text-[11px] text-slate-400">Memuat workspace...</span>
                            </div>
                        )
                    ) : workspaces.length === 0 ? (
                        !collapsed && (
                            <button
                                onClick={() => setShowAddWorkspace(true)}
                                className="w-full flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[11px] font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition"
                            >
                                <HiOutlinePlus className="h-4 w-4" /> Buat workspace pertama
                            </button>
                        )
                    ) : (
                        workspaces.map((ws) => (
                            <WorkspaceAccordionItem
                                key={ws.id}
                                workspace={ws}
                                collapsed={collapsed}
                                onClose={onClose}
                                onAddSub={(ws) => setAddSubTarget(ws)}
                                refreshKey={refreshKey}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddWorkspaceModal
                open={showAddWorkspace}
                onClose={() => setShowAddWorkspace(false)}
                onSuccess={handleWorkspaceSuccess}
            />
            <AddSubWorkspaceModal
                open={!!addSubTarget}
                onClose={() => setAddSubTarget(null)}
                onSuccess={handleSubSuccess}
                workspaceId={addSubTarget?.id}
                workspaceName={addSubTarget?.title}
            />
        </>
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
                    collapsed ? "justify-center px-2" : onClose ? "justify-between gap-3 px-5" : "px-5",
                )}
            >
                {!collapsed && (
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-950 to-indigo-700 shadow-md">
                            <HiOutlineClipboardDocumentList className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800 leading-tight">Project Management</p>
                            <p className="truncate text-[11px] text-slate-400">Version 2.0</p>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-950 to-indigo-700 shadow-md">
                        <HiOutlineClipboardDocumentList className="h-5 w-5 text-white" />
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

            {/* Navigation */}
            <nav className={cn("flex-1 overflow-y-auto space-y-4 pt-4", collapsed ? "px-1.5" : "px-3")}>
                {/* Static sections: My Tasks */}
                <div className="space-y-1">
                    {!collapsed && (
                        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400/85">
                            My Tasks
                        </p>
                    )}
                    <div className="space-y-0.5">
                        {STATIC_SECTIONS[0].items.map((item) => (
                            <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
                        ))}
                    </div>
                </div>

                {/* Dynamic: Business Unit / Workspaces */}
                <BusinessUnitSection collapsed={collapsed} onClose={onClose} />

                {/* Static sections: Direct Messages */}
                <div className="space-y-1">
                    {!collapsed && (
                        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400/85">
                            Direct Messages
                        </p>
                    )}
                    {collapsed && <div className="mx-2 my-2 border-t border-slate-100" />}
                    <div className="space-y-0.5">
                        {STATIC_SECTIONS[1].items.map((item) => (
                            <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
                        ))}
                    </div>
                </div>
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

    // Check static menu matches
    let found = null;
    for (const s of STATIC_SECTIONS) {
        const item = s.items.find((x) => (x.end ? pathname === x.to : pathname.startsWith(x.to)));
        if (item) { found = item; break; }
    }

    // Check workspace/sub-workspace pattern
    const isWorkspace = pathname.startsWith("/project-management-v2/workspaces");

    const label = found?.label ?? (isWorkspace ? "Workspace" : "Project Management 2.0");
    const description = found?.description ?? (isWorkspace ? "Workspace departemen & divisi" : "Modul Manajemen Project Terintegrasi");
    const Icon = found?.icon ?? HiOutlineFolderOpen;

    return (
        <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0">
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="text-sm font-semibold leading-tight text-slate-800">{label}</p>
                <p className="text-[11px] leading-tight text-slate-400">{description}</p>
            </div>
        </div>
    );
}

export default function ProjectManagementV2() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopCollapsed, setCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isResizing, setIsResizing] = useState(false);
    const drawerRef = useRef(null);

    const startResizing = (mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = Math.max(180, Math.min(480, e.clientX));
            setSidebarWidth(newWidth);
        };
        const handleMouseUp = () => setIsResizing(false);
        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        }
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isResizing]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    useEffect(() => {
        document.title = "Project Management 2.0 | Alora Group Indonesia";
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Desktop sidebar */}
            <aside
                style={{ width: desktopCollapsed ? "80px" : `${sidebarWidth}px` }}
                className={cn(
                    "hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm relative overflow-hidden",
                    !isResizing && "transition-[width] duration-300 ease-in-out"
                )}
            >
                <Sidebar collapsed={desktopCollapsed} />
                {!desktopCollapsed && (
                    <div
                        onMouseDown={startResizing}
                        className={cn(
                            "absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-500/50 transition-colors z-50",
                            isResizing ? "bg-indigo-600/30" : "bg-transparent"
                        )}
                    />
                )}
            </aside>

            {/* Mobile overlay */}
            <div
                aria-hidden="true"
                className={cn(
                    "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
                    mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                )}
                onClick={() => setMobileOpen(false)}
            />

            {/* Mobile drawer */}
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

            {/* Main content area */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {/* Desktop topbar */}
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
                    <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
                        <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                        Project Management 2.0
                    </div>
                </header>

                {/* Mobile topbar */}
                <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 active:scale-95"
                        aria-label="Buka menu navigasi"
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <HiOutlineXMark className="h-5 w-5" /> : <HiOutlineBars3 className="h-5 w-5" />}
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-950 to-indigo-700">
                            <HiOutlineClipboardDocumentList className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Project Management 2.0</span>
                    </div>
                </header>

                {/* Outlet: render child routes */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
