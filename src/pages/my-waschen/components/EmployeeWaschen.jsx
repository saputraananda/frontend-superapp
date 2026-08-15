import { useEffect, useMemo, useState } from "react";
import {
    HiOutlineUsers,
    HiOutlineIdentification,
    HiOutlineBriefcase,
    HiOutlinePhone,
    HiOutlineExclamationTriangle,
    HiOutlineMagnifyingGlass,
    HiOutlineEnvelope,
    HiOutlineXMark,
    HiOutlineArrowPath,
    HiOutlineCheckCircle,
    HiOutlineChevronUp,
    HiOutlineChevronDown,
    HiOutlineArrowsUpDown,
    HiOutlineCalendarDays,
    HiOutlinePlus,
    HiOutlineUserPlus,
    HiOutlineSparkles,

    HiOutlineUsers as UsersIcon,
    HiOutlineIdentification as IdentificationIcon,
    HiOutlineBriefcase as BriefcaseIcon,
    HiOutlinePhone as PhoneIcon,
    HiOutlineExclamationTriangle as ExclamationIcon,
    HiOutlineMagnifyingGlass as SearchIcon,
    HiOutlineEnvelope as EnvelopeIcon,
    HiOutlineXMark as XMarkIcon,
    HiOutlineArrowPath as ArrowPathIcon,
    HiOutlineCheckCircle as CheckCircleIcon,
    HiOutlineChevronUp as ChevronUpIcon,
    HiOutlineChevronDown as ChevronDownIcon,
    HiOutlineArrowsUpDown as ArrowsUpDownIcon,
    HiOutlineCalendarDays as CalendarIcon,
    HiOutlinePlus as PlusIcon,
    HiOutlineUserPlus as UserPlusIcon,
    HiOutlineSparkles as SparklesIcon,
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa";
import { api } from "../../../lib/api";

function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function capitalEachWord(value) {
    if (!value) return "";
    return String(value)
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SortTh({ col, label, sortBy, sortDir, onSort, className = "" }) {
    const active = sortBy === col;
    return (
        <th
            className={cn(
                "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100",
                active ? "text-[#5f1340] bg-[#5f1340]/10" : "text-slate-500",
                className,
            )}
            onClick={() => onSort(col)}
        >
            <div className="flex items-center gap-1">
                {label}
                {active ? (
                    sortDir === "asc" ? (
                        <ChevronUpIcon className="h-3.5 w-3.5 text-[#5f1340]" />
                    ) : (
                        <ChevronDownIcon className="h-3.5 w-3.5 text-[#5f1340]" />
                    )
                ) : (
                    <ArrowsUpDownIcon className="h-3.5 w-3.5 opacity-30" />
                )}
            </div>
        </th>
    );
}

const ROLE_META = {
    "Frontliner": { label: "Frontliner", cls: "border-blue-300 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
    "Washing Staff": { label: "Washing Staff", cls: "border-teal-300 bg-teal-50 text-teal-700", dot: "bg-teal-500" },
    "Ironing Staff": { label: "Ironing Staff", cls: "border-purple-300 bg-purple-50 text-purple-700", dot: "bg-purple-500" },
    "Packing Staff": { label: "Packing Staff", cls: "border-amber-300 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
    "Delivery Staff": { label: "Delivery Staff", cls: "border-emerald-300 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

function RoleBadge({ role }) {
    if (!role) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-350 bg-slate-50 text-slate-600 px-2 py-0.5 text-[11px] font-semibold select-none">
                Belum Ditentukan
            </span>
        );
    }
    const meta = ROLE_META[role] || ROLE_META["Washing Staff"];
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold select-none", meta.cls)}>
            {meta.label}
        </span>
    );
}

function LeaderBadge({ isLeader }) {
    if (isLeader === null || isLeader === undefined) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-350 bg-slate-50 text-slate-600 px-2 py-0.5 text-[11px] font-semibold select-none">
                Belum Ditentukan
            </span>
        );
    }
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold select-none",
                Number(isLeader) === 1
                    ? "border-pink-300 bg-gradient-to-r from-[#5f1340] to-[#4a0d31] text-white shadow-sm shadow-[#5f1340]/25"
                    : "border-[#e0e0e0] bg-slate-100 text-slate-650"
            )}
        >
            {Number(isLeader) === 1 ? "Leader" : "Staff"}
        </span>
    );
}

function SkeletonRow() {
    return (
        <tr className="border-t border-slate-100 animate-pulse">
            {[24, 30, 45, 30, 36, 28, 30, 24].map((w, i) => (
                <td key={i} className="px-4 py-4">
                    <div className="h-3.5 rounded bg-slate-200" style={{ width: `${w * 3}px` }} />
                </td>
            ))}
        </tr>
    );
}

function GenderBadge({ gender }) {
    if (!gender) return <span className="text-slate-300 text-xs">-</span>;
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase",
                gender === "L" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-pink-200 bg-pink-50 text-pink-700",
            )}
        >
            {gender === "L" ? "L" : "P"}
        </span>
    );
}

function MobileCard({ item, activeDropdownId, setActiveDropdownId, outlets, onUpdateRole, onToggleLeader, onUpdateOutlet, updating }) {
    const isDropdownOpen = activeDropdownId === `mobile-${item.employee_id}`;
    const isOutletDropdownOpen = activeDropdownId === `mobile-outlet-${item.employee_id}`;
    const isLeaderDropdownOpen = activeDropdownId === `mobile-leader-${item.employee_id}`;
    
    return (
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#313030]">{capitalEachWord(item.full_name) || "-"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        NIK: <span className="font-medium text-slate-600">{item.employee_code || "Tanpa NIK"}</span>
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 relative">
                <GenderBadge gender={item.gender} />
                
                {/* Role selection dropdown */}
                <div className="relative inline-block">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(isDropdownOpen ? null : `mobile-${item.employee_id}`);
                        }}
                        disabled={updating}
                        className="group inline-flex items-center gap-1 hover:opacity-85 transition-opacity"
                    >
                        <RoleBadge role={item.waschen_role} />
                        {updating ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#5f1340]" />
                        ) : (
                            <ChevronDownIcon className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        )}
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                }}
                            />
                            <div className="absolute left-0 mt-1 w-40 rounded-lg border border-[#e0e0e0] bg-white p-1 shadow-lg z-20">
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveDropdownId(null);
                                        if (!item.waschen_role) return;
                                        await onUpdateRole(item.employee_id, null);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                        !item.waschen_role
                                            ? "bg-pink-50 text-[#5f1340]"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    Belum Ditentukan
                                </button>
                                {Object.entries(ROLE_META).map(([key, meta]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setActiveDropdownId(null);
                                            if (item.waschen_role === key) return;
                                            await onUpdateRole(item.employee_id, key);
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                            item.waschen_role === key
                                                ? "bg-pink-50 text-[#5f1340]"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                                        {meta.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Outlet selection dropdown */}
                <div className="relative inline-block">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(isOutletDropdownOpen ? null : `mobile-outlet-${item.employee_id}`);
                        }}
                        disabled={updating}
                        className="group inline-flex items-center gap-1 hover:opacity-85 transition-opacity"
                    >
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {item.outlet_name || "-"}
                        </span>
                        {updating ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#5f1340]" />
                        ) : (
                            <ChevronDownIcon className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        )}
                    </button>

                    {isOutletDropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                }}
                            />
                            <div className="absolute left-0 mt-1 w-44 max-h-48 overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white p-1 shadow-lg z-20">
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveDropdownId(null);
                                        if (!item.outlet_id) return;
                                        await onUpdateOutlet(item.employee_id, null);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                        !item.outlet_id
                                            ? "bg-pink-50 text-[#5f1340]"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    Tidak Ada Cabang
                                </button>
                                {outlets.map((o) => (
                                    <button
                                        key={o.id}
                                        type="button"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setActiveDropdownId(null);
                                            if (item.outlet_id === o.id) return;
                                            await onUpdateOutlet(item.employee_id, o.id);
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                            item.outlet_id === o.id
                                                ? "bg-pink-50 text-[#5f1340]"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        {o.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Leader dropdown */}
                <div className="relative inline-block">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(isLeaderDropdownOpen ? null : `mobile-leader-${item.employee_id}`);
                        }}
                        disabled={updating}
                        className="group inline-flex items-center gap-1 hover:opacity-85 transition-opacity"
                    >
                        <LeaderBadge isLeader={item.is_leader} />
                        {updating ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#5f1340]" />
                        ) : (
                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        )}
                    </button>

                    {isLeaderDropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                }}
                            />
                            <div className="absolute left-0 mt-1 w-40 rounded-lg border border-[#e0e0e0] bg-white p-1 shadow-lg z-20">
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveDropdownId(null);
                                        if (item.is_leader === null) return;
                                        await onToggleLeader(item.employee_id, null);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                        item.is_leader === null
                                            ? "bg-pink-50 text-[#5f1340]"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    Belum Ditentukan
                                </button>
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveDropdownId(null);
                                        if (item.is_leader === 1) return;
                                        await onToggleLeader(item.employee_id, 1);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                        item.is_leader === 1
                                            ? "bg-pink-50 text-[#5f1340]"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    Leader
                                </button>
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveDropdownId(null);
                                        if (item.is_leader === 0) return;
                                        await onToggleLeader(item.employee_id, 0);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                        item.is_leader === 0
                                            ? "bg-pink-50 text-[#5f1340]"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    Staff
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 rounded-lg bg-[#f8f8f8] p-3 text-xs text-slate-600">
                {item.username && (
                    <div className="flex items-center gap-2">
                        <IdentificationIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{item.username}</span>
                    </div>
                )}
                {item.email && (
                    <div className="flex items-center gap-2 min-w-0">
                        <EnvelopeIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{item.email}</span>
                    </div>
                )}
                {item.phone_number && (
                    <div className="flex items-center gap-2">
                        <a
                            href={`https://wa.me/${item.phone_number.replace(/\D/g, "").replace(/^0/, "62")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:underline transition-colors font-medium"
                        >
                            <FaWhatsapp className="h-3.5 w-3.5 shrink-0" />
                            {item.phone_number}
                        </a>
                    </div>
                )}
                {(item.job_level_name || item.position_name) && (
                    <div className="flex items-center gap-2">
                        <BriefcaseIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{[item.job_level_name, item.position_name].filter(Boolean).join(" - ")}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function EmployeeWaschen() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [updatingIds, setUpdatingIds] = useState(new Set());
    const [outlets, setOutlets] = useState([]);

    const handleUpdateRole = async (employeeId, newRole) => {
        try {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.add(employeeId);
                return next;
            });
            setError("");

            await api(`/waschen/employees/${employeeId}/role`, {
                method: "PUT",
                body: JSON.stringify({ role: newRole }),
            });

            setRows((prev) =>
                prev.map((row) =>
                    row.employee_id === employeeId
                        ? { ...row, waschen_role: newRole }
                        : row
                )
            );

            setSuccess("Bagian/layanan karyawan berhasil diperbarui");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.message || "Gagal memperbarui bagian/layanan karyawan");
            setTimeout(() => setError(""), 4000);
        } finally {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.delete(employeeId);
                return next;
            });
        }
    };

    const handleUpdateOutlet = async (employeeId, newOutletId) => {
        try {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.add(employeeId);
                return next;
            });
            setError("");

            await api(`/waschen/employees/${employeeId}/role`, {
                method: "PUT",
                body: JSON.stringify({ outlet_id: newOutletId }),
            });

            const selectedOutlet = outlets.find((o) => Number(o.id) === Number(newOutletId));
            const newOutletName = selectedOutlet ? selectedOutlet.name : "-";

            setRows((prev) =>
                prev.map((row) =>
                    row.employee_id === employeeId
                        ? { ...row, outlet_id: newOutletId, outlet_name: newOutletName }
                        : row
                )
            );

            setSuccess("Cabang/outlet karyawan berhasil diperbarui");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.message || "Gagal memperbarui cabang/outlet karyawan");
            setTimeout(() => setError(""), 4000);
        } finally {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.delete(employeeId);
                return next;
            });
        }
    };

    const handleToggleLeader = async (employeeId, newIsLeader) => {
        try {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.add(employeeId);
                return next;
            });
            setError("");

            await api(`/waschen/employees/${employeeId}/role`, {
                method: "PUT",
                body: JSON.stringify({ is_leader: newIsLeader }),
            });

            setRows((prev) =>
                prev.map((row) =>
                    row.employee_id === employeeId
                        ? { ...row, is_leader: newIsLeader }
                        : row
                )
            );

            setSuccess("Status jabatan karyawan berhasil diperbarui");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.message || "Gagal memperbarui status jabatan");
            setTimeout(() => setError(""), 4000);
        } finally {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.delete(employeeId);
                return next;
            });
        }
    };

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("full_name");
    const [sortDir, setSortDir] = useState("asc");
    const [refreshKey, setRefreshKey] = useState(0);
    const [filterRole, setFilterRole] = useState("");
    const [filterOutletId, setFilterOutletId] = useState("");
    const [filterIsLeader, setFilterIsLeader] = useState("");

    // Modal Add Karyawan State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addMode, setAddMode] = useState("existing");
    const [assignable, setAssignable] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [selectedIsLeader, setSelectedIsLeader] = useState(null);
    const [selectedOutletId, setSelectedOutletId] = useState("");
    
    // Form fields for new employee
    const [newFullName, setNewFullName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [modalSaving, setModalSaving] = useState(false);
    const [modalError, setModalError] = useState("");
    const [searchAssignable, setSearchAssignable] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    const filteredAssignable = useMemo(() => {
        if (!searchAssignable.trim()) return assignable;
        const kw = searchAssignable.toLowerCase();
        return assignable.filter(
            (e) =>
                e.full_name?.toLowerCase().includes(kw) ||
                e.employee_code?.toLowerCase().includes(kw) ||
                e.email?.toLowerCase().includes(kw)
        );
    }, [assignable, searchAssignable]);

    useEffect(() => {
        document.title = "Data Karyawan Waschen | Alora Group Indonesia";
    }, []);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch outlets
    useEffect(() => {
        const fetchOutlets = async () => {
            try {
                const res = await api("/outlets");
                setOutlets(res.outlets || []);
            } catch (err) {
                console.error("Gagal mengambil data outlet:", err);
            }
        };
        fetchOutlets();
    }, []);

    // Fetch employees
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoading(true);
                setError("");

                const qs = new URLSearchParams();
                qs.set("sortBy", sortBy);
                qs.set("sortDir", sortDir);
                if (search) qs.set("search", search);
                if (filterRole) qs.set("role", filterRole);
                if (filterOutletId) qs.set("outletId", filterOutletId);
                if (filterIsLeader !== "") qs.set("isLeader", filterIsLeader);

                const response = await api(`/waschen/employees?${qs.toString()}`);
                setRows(response.data || []);
            } catch (err) {
                setError(err.message || "Gagal memuat data karyawan Waschen");
                setRows([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [search, sortBy, sortDir, refreshKey, filterRole, filterOutletId, filterIsLeader]);

    // Fetch assignable active employees when modal opens
    useEffect(() => {
        if (!showAddModal) return;
        const fetchAssignable = async () => {
            try {
                const res = await api("/waschen/employees/assignable");
                const list = res.data || [];
                const filtered = list.filter((e) => Number(e.company_id) === 5);
                setAssignable(filtered);
                setSelectedEmployeeId("");
            } catch (err) {
                console.error("Gagal mengambil karyawan yang dapat ditugaskan:", err);
            }
        };
        fetchAssignable();
    }, [showAddModal]);

    const handleSort = (col) => {
        if (sortBy === col) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(col);
            setSortDir("asc");
        }
    };

    const resetFilters = () => {
        setSearchInput("");
        setSearch("");
        setSortBy("full_name");
        setSortDir("asc");
        setFilterRole("");
        setFilterOutletId("");
        setFilterIsLeader("");
    };

    const handleAddSubmit = async () => {
        setModalSaving(true);
        setModalError("");
        try {
            const body = {
                mode: addMode,
                is_leader: selectedIsLeader === null || selectedIsLeader === undefined ? null : (selectedIsLeader ? 1 : 0),
                outlet_id: selectedOutletId ? Number(selectedOutletId) : null,
                role: selectedRole ? selectedRole : null,
            };

            if (addMode === "existing") {
                if (!selectedEmployeeId) {
                    throw new Error("Pilih karyawan terlebih dahulu.");
                }
                body.employee_id = selectedEmployeeId;
            } else {
                if (!newFullName.trim() || !newEmail.trim() || !newUsername.trim() || !newPassword.trim()) {
                    throw new Error("Semua bidang wajib diisi untuk karyawan baru.");
                }
                body.full_name = newFullName;
                body.email = newEmail;
                body.username = newUsername;
                body.password = newPassword;
                body.company_id = 5;
            }

            await api("/waschen/employees", {
                method: "POST",
                body: JSON.stringify(body),
            });

            setSuccess("Karyawan Waschen berhasil ditambahkan");
            setShowAddModal(false);
            
            // Reset fields
            setNewFullName("");
            setNewEmail("");
            setNewUsername("");
            setNewPassword("");
            setSelectedRole("");
            setSelectedIsLeader(null);
            setSelectedOutletId("");
            setSearchAssignable("");
            setSelectedEmployeeId("");
            setShowDropdown(false);

            // Refresh list
            setRefreshKey((k) => k + 1);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setModalError(err.message || "Gagal menyimpan data karyawan");
        } finally {
            setModalSaving(false);
        }
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setSearchAssignable("");
        setSelectedEmployeeId("");
        setSelectedRole("");
        setSelectedIsLeader(null);
        setSelectedOutletId("");
        setShowDropdown(false);
        setModalError("");
    };

    const hasActiveFilters = Boolean(search) || Boolean(filterRole) || Boolean(filterOutletId) || filterIsLeader !== "";

    return (
        <main className="min-h-screen bg-[#f8f8f8] py-6 sm:py-10">
            {success && (
                <div className="fixed top-4 right-4 z-50 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                    {success}
                </div>
            )}
            {error && (
                <div className="fixed top-4 right-4 z-50 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <ExclamationIcon className="h-4 w-4 text-rose-600" />
                    {error}
                </div>
            )}
            <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
                {/* Hero header */}
                <section className="relative overflow-hidden rounded-3xl border border-[#e0e0e0] bg-gradient-to-br from-[#3d0728] via-[#5f1340] to-[#4a0d31] shadow-sm">
                    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-[#5f1340]/20 blur-3xl" />

                    <div className="relative p-5 sm:p-6 lg:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    Master Data Karyawan Waschen
                                </h1>
                                <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                                    Kelola data frontliner, washing, ironing, packing, dan delivery staff yang ditugaskan pada unit bisnis Waschen Laundry.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Search & Filters */}
                <section className="rounded-2xl border border-[#e0e0e0] bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-[#5f1340]">
                                <SearchIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#313030]">Pencarian Karyawan</p>
                                <p className="text-xs text-slate-500">Cari berdasarkan nama, username, email, atau NIK</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setRefreshKey((k) => k + 1)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <ArrowPathIcon className="h-3.5 w-3.5" />
                                Refresh
                            </button>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                                >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                    Bersihkan Filter
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="relative">
                            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Masukkan nama, NIK, username, atau email..."
                                className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] py-3 pl-9 pr-10 text-sm text-[#313030] outline-none transition focus:border-[#5f1340] focus:bg-white focus:ring-2 focus:ring-[#5f1340]/10"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput("")}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Filter dropdowns */}
                        <div className="flex flex-wrap gap-2">
                            {/* Filter Bagian / Unit */}
                            <div className="relative">
                                <select
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                    className={`appearance-none rounded-lg border py-2 pl-3 pr-7 text-xs font-semibold outline-none transition cursor-pointer ${
                                        filterRole
                                            ? "border-[#5f1340] bg-pink-50 text-[#5f1340] ring-1 ring-[#5f1340]/20"
                                            : "border-[#e0e0e0] bg-[#f8f8f8] text-slate-600 hover:border-slate-300"
                                    }`}
                                >
                                    <option value="">Semua Bagian</option>
                                    {Object.entries(ROLE_META).map(([key, meta]) => (
                                        <option key={key} value={key}>{meta.label}</option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                            </div>

                            {/* Filter Cabang */}
                            <div className="relative">
                                <select
                                    value={filterOutletId}
                                    onChange={(e) => setFilterOutletId(e.target.value)}
                                    className={`appearance-none rounded-lg border py-2 pl-3 pr-7 text-xs font-semibold outline-none transition cursor-pointer ${
                                        filterOutletId
                                            ? "border-[#5f1340] bg-pink-50 text-[#5f1340] ring-1 ring-[#5f1340]/20"
                                            : "border-[#e0e0e0] bg-[#f8f8f8] text-slate-600 hover:border-slate-300"
                                    }`}
                                >
                                    <option value="">Semua Cabang</option>
                                    {outlets.map((o) => (
                                        <option key={o.id} value={String(o.id)}>{o.name}</option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                            </div>

                            {/* Filter Jabatan */}
                            <div className="relative">
                                <select
                                    value={filterIsLeader}
                                    onChange={(e) => setFilterIsLeader(e.target.value)}
                                    className={`appearance-none rounded-lg border py-2 pl-3 pr-7 text-xs font-semibold outline-none transition cursor-pointer ${
                                        filterIsLeader !== ""
                                            ? "border-[#5f1340] bg-pink-50 text-[#5f1340] ring-1 ring-[#5f1340]/20"
                                            : "border-[#e0e0e0] bg-[#f8f8f8] text-slate-600 hover:border-slate-300"
                                    }`}
                                >
                                    <option value="">Semua Jabatan</option>
                                    <option value="1">Leader</option>
                                    <option value="0">Staff</option>
                                </select>
                                <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Table / List View */}
                <section className="overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-[#313030]">Daftar Karyawan Waschen</h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Klik header kolom untuk mengurutkan atau klik lencana untuk mengubah status / unit / cabang / jabatan.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5f1340] hover:bg-[#4a0d31] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-sm shadow-[#5f1340]/20 active:scale-95"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Tambah Karyawan
                            </button>
                        </div>
                    </div>

                    {/* Desktop view */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="border-b border-[#e0e0e0] bg-[#f8f8f8]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap w-10">
                                        No
                                    </th>
                                    <SortTh col="employee_code" label="NIK" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <SortTh col="full_name" label="Nama Karyawan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <SortTh col="join_date" label="Bergabung" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Telepon
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Bagian / Unit
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Cabang
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Jabatan
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

                                {!loading && rows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-14 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <UsersIcon className="h-9 w-9 opacity-40" />
                                                <p className="text-sm">
                                                    {hasActiveFilters
                                                        ? "Tidak ada data karyawan Waschen yang cocok."
                                                        : "Belum ada data karyawan Waschen."}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {!loading &&
                                    rows.map((item, idx) => (
                                        <tr key={item.employee_id} className="align-middle transition-colors hover:bg-[#5f1340]/5">
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-450 font-medium">
                                                {idx + 1}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5">
                                                {item.employee_code ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-[#e0e0e0] bg-[#f8f8f8] px-2 py-0.5 text-xs font-mono font-semibold text-slate-655">
                                                        {item.employee_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5f1340] to-[#4a0d31] text-xs font-bold text-white shadow-sm">
                                                        {(item.full_name || "?")[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-[#313030] whitespace-nowrap">
                                                            {capitalEachWord(item.full_name) || "-"}
                                                        </p>
                                                        {item.username && (
                                                            <p className="text-[11px] text-slate-500 whitespace-nowrap">{item.username}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                                                {item.join_date ? (
                                                    <span className="flex items-center gap-1">
                                                        <CalendarIcon className="h-3.5 w-3.5 text-slate-300" />
                                                        {formatDate(item.join_date)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                                                {item.phone_number ? (
                                                    <a
                                                        href={`https://wa.me/${item.phone_number.replace(/\D/g, "").replace(/^0/, "62")}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline transition-colors font-medium"
                                                    >
                                                        <FaWhatsapp className="h-3.5 w-3.5 shrink-0" />
                                                        {item.phone_number}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5 relative">
                                                <div className="relative inline-block">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdownId(activeDropdownId === item.employee_id ? null : item.employee_id);
                                                        }}
                                                        disabled={updatingIds.has(item.employee_id)}
                                                        className="group inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                                                    >
                                                        <RoleBadge role={item.waschen_role} />
                                                        {updatingIds.has(item.employee_id) ? (
                                                            <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#5f1340]" />
                                                        ) : (
                                                            <ChevronDownIcon className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                                        )}
                                                    </button>

                                                    {activeDropdownId === item.employee_id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(null);
                                                                }}
                                                            />
                                                            <div className="absolute left-0 mt-1.5 w-40 rounded-lg border border-[#e0e0e0] bg-white p-1 shadow-lg z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdownId(null);
                                                                        if (!item.waschen_role) return;
                                                                        await handleUpdateRole(item.employee_id, null);
                                                                    }}
                                                                    className={cn(
                                                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                                                        !item.waschen_role
                                                                            ? "bg-pink-50 text-[#5f1340]"
                                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                    )}
                                                                >
                                                                    Belum Ditentukan
                                                                </button>
                                                                {Object.entries(ROLE_META).map(([key, meta]) => (
                                                                    <button
                                                                        key={key}
                                                                        type="button"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            if (item.waschen_role === key) return;
                                                                            await handleUpdateRole(item.employee_id, key);
                                                                        }}
                                                                        className={cn(
                                                                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                                                            item.waschen_role === key
                                                                                ? "bg-pink-50 text-[#5f1340]"
                                                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                        )}
                                                                    >
                                                                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                                                                        {meta.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5 relative">
                                                <div className="relative inline-block">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdownId(activeDropdownId === `outlet-${item.employee_id}` ? null : `outlet-${item.employee_id}`);
                                                        }}
                                                        disabled={updatingIds.has(item.employee_id)}
                                                        className="group inline-flex items-center gap-1 hover:opacity-85 transition-opacity"
                                                    >
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                                            {item.outlet_name || "-"}
                                                        </span>
                                                        {updatingIds.has(item.employee_id) ? (
                                                            <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#5f1340]" />
                                                        ) : (
                                                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                                        )}
                                                    </button>

                                                    {activeDropdownId === `outlet-${item.employee_id}` && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(null);
                                                                }}
                                                            />
                                                            <div className="absolute left-0 mt-1.5 w-48 max-h-48 overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white p-1 shadow-lg z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdownId(null);
                                                                        if (!item.outlet_id) return;
                                                                        await handleUpdateOutlet(item.employee_id, null);
                                                                    }}
                                                                    className={cn(
                                                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                                                        !item.outlet_id
                                                                            ? "bg-pink-50 text-[#5f1340]"
                                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                    )}
                                                                >
                                                                    Tidak Ada Cabang
                                                                </button>
                                                                {outlets.map((o) => (
                                                                    <button
                                                                        key={o.id}
                                                                        type="button"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            if (item.outlet_id === o.id) return;
                                                                            await handleUpdateOutlet(item.employee_id, o.id);
                                                                        }}
                                                                        className={cn(
                                                                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                                                            item.outlet_id === o.id
                                                                                ? "bg-pink-50 text-[#5f1340]"
                                                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                        )}
                                                                    >
                                                                        {o.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3.5 relative">
                                                <div className="relative inline-block">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdownId(activeDropdownId === `leader-${item.employee_id}` ? null : `leader-${item.employee_id}`);
                                                        }}
                                                        disabled={updatingIds.has(item.employee_id)}
                                                        className="group inline-flex items-center gap-1 hover:opacity-85 transition-opacity"
                                                    >
                                                        <LeaderBadge isLeader={item.is_leader} />
                                                        {updatingIds.has(item.employee_id) ? (
                                                            <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#5f1340]" />
                                                        ) : (
                                                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                                        )}
                                                    </button>

                                                    {activeDropdownId === `leader-${item.employee_id}` && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(null);
                                                                }}
                                                            />
                                                            <div className="absolute right-0 mt-1.5 w-40 rounded-lg border border-[#e0e0e0] bg-white p-1 shadow-lg z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdownId(null);
                                                                        if (item.is_leader === null) return;
                                                                        await handleToggleLeader(item.employee_id, null);
                                                                    }}
                                                                    className={cn(
                                                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                                                        item.is_leader === null
                                                                            ? "bg-pink-50 text-[#5f1340]"
                                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                    )}
                                                                >
                                                                    Belum Ditentukan
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdownId(null);
                                                                        if (item.is_leader === 1) return;
                                                                        await handleToggleLeader(item.employee_id, 1);
                                                                    }}
                                                                    className={cn(
                                                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                                                        item.is_leader === 1
                                                                            ? "bg-pink-50 text-[#5f1340]"
                                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                    )}
                                                                >
                                                                    Leader
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setActiveDropdownId(null);
                                                                        if (item.is_leader === 0) return;
                                                                        await handleToggleLeader(item.employee_id, 0);
                                                                    }}
                                                                    className={cn(
                                                                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                                                        item.is_leader === 0
                                                                            ? "bg-pink-50 text-[#5f1340]"
                                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                    )}
                                                                >
                                                                    Staff
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile view */}
                    <div className="lg:hidden">
                        {loading ? (
                            <div className="space-y-3 p-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2"
                                    >
                                        <div className="flex justify-between">
                                            <div className="h-4 w-36 rounded bg-slate-200" />
                                            <div className="h-4 w-8 rounded bg-slate-200" />
                                        </div>
                                        <div className="h-14 rounded bg-slate-200" />
                                    </div>
                                ))}
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-400">
                                <UsersIcon className="h-8 w-8 opacity-40" />
                                <p>Belum ada data karyawan Waschen.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 p-4 sm:grid-cols-2">
                                {rows.map((item) => (
                                    <MobileCard
                                        key={item.employee_id}
                                        item={item}
                                        activeDropdownId={activeDropdownId}
                                        setActiveDropdownId={setActiveDropdownId}
                                        outlets={outlets}
                                        onUpdateRole={handleUpdateRole}
                                        onToggleLeader={handleToggleLeader}
                                        onUpdateOutlet={handleUpdateOutlet}
                                        updating={updatingIds.has(item.employee_id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Modal Tambah Karyawan */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeAddModal} />
                    <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl transition-all">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-[#313030] flex items-center gap-2">
                                <UserPlusIcon className="h-5 w-5 text-[#5f1340]" />
                                Tambah Karyawan Waschen
                            </h3>
                            <button type="button" onClick={closeAddModal} className="text-slate-400 hover:text-slate-600">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-100">
                                {modalError}
                            </div>
                        )}

                        {/* Mode Selector */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-5 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => { setAddMode("existing"); setModalError(""); }}
                                className={cn(
                                    "flex-1 py-2 text-center rounded-md transition-all",
                                    addMode === "existing" ? "bg-white text-[#5f1340] shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Pilih Karyawan Aktif
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAddMode("new"); setModalError(""); }}
                                className={cn(
                                    "flex-1 py-2 text-center rounded-md transition-all",
                                    addMode === "new" ? "bg-white text-[#5f1340] shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Buat Karyawan Baru
                            </button>
                        </div>

                        {addMode === "existing" ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cari & Pilih Karyawan</label>
                                    {assignable.length === 0 ? (
                                        <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                                            Tidak ada karyawan aktif yang tersedia untuk ditugaskan.
                                        </p>
                                    ) : (
                                        <div className="relative">
                                            <div className="relative">
                                                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={searchAssignable}
                                                    onChange={(e) => {
                                                        setSearchAssignable(e.target.value);
                                                        setShowDropdown(true);
                                                    }}
                                                    onFocus={() => setShowDropdown(true)}
                                                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                                    placeholder="Ketik nama, NIK, atau email..."
                                                    className="w-full rounded-lg border border-[#e0e0e0] bg-[#f8f8f8] py-2.5 pl-9 pr-10 text-sm text-[#313030] outline-none transition focus:border-[#5f1340] focus:bg-white focus:ring-2 focus:ring-[#5f1340]/10"
                                                />
                                                {searchAssignable && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSearchAssignable(""); setShowDropdown(false); }}
                                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <XMarkIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {showDropdown && (filteredAssignable.length === 0 ? (
                                                <p className="mt-1.5 text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                    Tidak ada karyawan yang cocok.
                                                </p>
                                            ) : (
                                                <div className="mt-1.5 max-h-52 overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white shadow-sm divide-y divide-slate-100">
                                                    {filteredAssignable.map((emp) => (
                                                        <button
                                                            key={emp.employee_id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedEmployeeId(emp.employee_id);
                                                                setSearchAssignable(`${emp.full_name}${emp.employee_code ? ` (${emp.employee_code})` : ""}`);
                                                                setShowDropdown(false);
                                                            }}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-[#5f1340]/10",
                                                                selectedEmployeeId === emp.employee_id
                                                                    ? "bg-[#5f1340]/15 font-semibold text-[#5f1340]"
                                                                    : "text-slate-700"
                                                            )}
                                                        >
                                                            <span className="font-medium">{emp.full_name}</span>
                                                            {emp.employee_code && (
                                                                <span className="ml-1.5 font-mono text-slate-400">({emp.employee_code})</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}

                                            {selectedEmployeeId && (
                                                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#5f1340]/10 border border-[#5f1340]/20 px-2.5 py-1.5">
                                                    <CheckCircleIcon className="h-3.5 w-3.5 text-[#5f1340]" />
                                                    <span className="text-xs font-medium text-[#5f1340]">
                                                        Terpilih: {assignable.find((e) => e.employee_id === selectedEmployeeId)?.full_name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Unit / Bagian</label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10 cursor-pointer"
                                        >
                                            <option value="">Belum Ditentukan</option>
                                            {Object.keys(ROLE_META).map((roleName) => (
                                                <option key={roleName} value={roleName}>{roleName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cabang / Outlet</label>
                                        <select
                                            value={selectedOutletId}
                                            onChange={(e) => setSelectedOutletId(e.target.value)}
                                            className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10 cursor-pointer"
                                        >
                                            <option value="">Belum Ditentukan</option>
                                            {outlets.map((o) => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Jabatan / Status</label>
                                        <select
                                            value={selectedIsLeader === null || selectedIsLeader === undefined ? "" : (selectedIsLeader ? "1" : "0")}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSelectedIsLeader(val === "" ? null : (val === "1"));
                                            }}
                                            className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10 cursor-pointer"
                                        >
                                            <option value="">Belum Ditentukan</option>
                                            <option value="1">Leader</option>
                                            <option value="0">Staff</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        value={newFullName}
                                        onChange={(e) => setNewFullName(e.target.value)}
                                        placeholder="Masukkan nama lengkap..."
                                        className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-sm text-[#313030] outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="email@company.com"
                                        className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-sm text-[#313030] outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        placeholder="username_karyawan"
                                        className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-sm text-[#313030] outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="********"
                                        className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-sm text-[#313030] outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit / Bagian</label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10 cursor-pointer"
                                        >
                                            <option value="">Belum Ditentukan</option>
                                            {Object.keys(ROLE_META).map((roleName) => (
                                                <option key={roleName} value={roleName}>{roleName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cabang / Outlet</label>
                                        <select
                                            value={selectedOutletId}
                                            onChange={(e) => setSelectedOutletId(e.target.value)}
                                            className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10 cursor-pointer"
                                        >
                                            <option value="">Belum Ditentukan</option>
                                            {outlets.map((o) => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jabatan / Status</label>
                                        <select
                                            value={selectedIsLeader === null || selectedIsLeader === undefined ? "" : (selectedIsLeader ? "1" : "0")}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSelectedIsLeader(val === "" ? null : (val === "1"));
                                            }}
                                            className="w-full rounded-lg border border-[#e0e0e0] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#5f1340] focus:ring-2 focus:ring-[#5f1340]/10 cursor-pointer"
                                        >
                                            <option value="">Belum Ditentukan</option>
                                            <option value="1">Leader</option>
                                            <option value="0">Staff</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeAddModal}
                                className="flex-1 rounded-lg border border-[#e0e0e0] py-2.5 text-xs font-semibold text-slate-650 hover:bg-slate-50 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={modalSaving}
                                onClick={handleAddSubmit}
                                className="flex-1 rounded-lg bg-[#5f1340] hover:bg-[#4a0d31] py-2.5 text-xs font-semibold text-white transition disabled:opacity-50"
                            >
                                {modalSaving ? "Menyimpan..." : "Simpan Karyawan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
