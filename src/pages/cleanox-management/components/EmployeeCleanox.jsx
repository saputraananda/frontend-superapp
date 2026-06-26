import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    HiOutlineEye,
    HiOutlineChevronUp,
    HiOutlineChevronDown,
    HiOutlineArrowsUpDown,
    HiOutlineCalendarDays,
    HiOutlinePlus,
    HiOutlineUserPlus,
    HiOutlineBuildingOffice,
} from "react-icons/hi2";
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
                active ? "text-[#1b3459] bg-[#97bd3f]/10" : "text-slate-500",
                className,
            )}
            onClick={() => onSort(col)}
        >
            <div className="flex items-center gap-1">
                {label}
                {active ? (
                    sortDir === "asc" ? (
                        <HiOutlineChevronUp className="h-3.5 w-3.5" />
                    ) : (
                        <HiOutlineChevronDown className="h-3.5 w-3.5" />
                    )
                ) : (
                    <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />
                )}
            </div>
        </th>
    );
}

const ROLE_META = {
    produksi: { label: "Produksi", cls: "border-amber-300 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
    frontliner: { label: "Frontliner", cls: "border-blue-300 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
};

function CompanyBadge({ role }) {
    const meta = ROLE_META[role] || ROLE_META.produksi;
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold select-none", meta.cls)}>
            {meta.label}
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

function MobileCard({ item, onDetail, activeDropdownId, setActiveDropdownId, onUpdateRole, updating }) {
    const isDropdownOpen = activeDropdownId === `mobile-${item.employee_id}`;
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{capitalEachWord(item.full_name) || "-"}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                        NIK: <span className="font-medium text-slate-500">{item.employee_code || "Tanpa kode"}</span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onDetail(item.employee_id)}
                    title="Lihat detail karyawan"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-[#1b3459] hover:text-white hover:border-[#1b3459] transition-colors"
                >
                    <HiOutlineEye className="h-4 w-4" />
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 relative">
                <GenderBadge gender={item.gender} />
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
                        <CompanyBadge role={item.cleanox_role} />
                        {updating ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#1b3459]" />
                        ) : (
                            <HiOutlineChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
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
                            <div className="absolute left-0 mt-1 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-20">
                                {Object.entries(ROLE_META).map(([key, meta]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setActiveDropdownId(null);
                                            if (item.cleanox_role === key) return;
                                            await onUpdateRole(item.employee_id, key);
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                            item.cleanox_role === key 
                                                ? "bg-slate-50 text-[#1b3459]" 
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
            </div>

            <div className="grid grid-cols-1 gap-1.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                {item.username && (
                    <div className="flex items-center gap-2">
                        <HiOutlineIdentification className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{item.username}</span>
                    </div>
                )}
                {item.email && (
                    <div className="flex items-center gap-2 min-w-0">
                        <HiOutlineEnvelope className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{item.email}</span>
                    </div>
                )}
                {item.phone_number && (
                    <div className="flex items-center gap-2">
                        <HiOutlinePhone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{item.phone_number}</span>
                    </div>
                )}
                {(item.job_level_name || item.position_name) && (
                    <div className="flex items-center gap-2">
                        <HiOutlineBriefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{[item.job_level_name, item.position_name].filter(Boolean).join(" - ")}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function EmployeeCleanox() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [updatingIds, setUpdatingIds] = useState(new Set());

    const handleUpdateRole = async (employeeId, newRole) => {
        try {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.add(employeeId);
                return next;
            });
            setError("");

            await api(`/cleanox/employees/${employeeId}/role`, {
                method: "PUT",
                body: JSON.stringify({ role: newRole }),
            });

            setRows((prev) =>
                prev.map((row) =>
                    row.employee_id === employeeId
                        ? { ...row, cleanox_role: newRole }
                        : row
                )
            );
            
            setSuccess("Unit/bagian karyawan berhasil diperbarui");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.message || "Gagal memperbarui unit/bagian karyawan");
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

    // Modal Add Karyawan State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addMode, setAddMode] = useState("existing");
    const [assignable, setAssignable] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [selectedRole, setSelectedRole] = useState("produksi");
    // Form fields for new employee
    const [newFullName, setNewFullName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newCompanyId, setNewCompanyId] = useState("3");

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
        document.title = "Data Karyawan Cleanox | Alora Group Indonesia";
    }, []);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

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

                const response = await api(`/cleanox/employees?${qs.toString()}`);
                setRows(response.data || []);
            } catch (err) {
                setError(err.message || "Gagal memuat data karyawan Cleanox");
                setRows([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [search, sortBy, sortDir, refreshKey]);

    // Fetch assignable active employees when modal opens
    useEffect(() => {
        if (!showAddModal) return;
        const fetchAssignable = async () => {
            try {
                const res = await api("/cleanox/employees/assignable");
                setAssignable(res.data || []);
                if (res.data && res.data.length > 0) {
                    setSelectedEmployeeId(res.data[0].employee_id);
                } else {
                    setSelectedEmployeeId("");
                }
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
    };

    const handleAddSubmit = async () => {
        setModalSaving(true);
        setModalError("");
        try {
            const body = {
                mode: addMode,
            };

            if (addMode === "existing") {
                if (!selectedEmployeeId) {
                    throw new Error("Pilih karyawan terlebih dahulu.");
                }
                body.employee_id = selectedEmployeeId;
                body.role = selectedRole;
            } else {
                if (!newFullName.trim() || !newEmail.trim() || !newUsername.trim() || !newPassword.trim()) {
                    throw new Error("Semua bidang wajib diisi untuk karyawan baru.");
                }
                body.full_name = newFullName;
                body.email = newEmail;
                body.username = newUsername;
                body.password = newPassword;
                body.company_id = newCompanyId;
                body.role = selectedRole;
            }

            await api("/cleanox/employees", {
                method: "POST",
                body: JSON.stringify(body),
            });

            setSuccess("Karyawan Cleanox berhasil ditambahkan");
            setShowAddModal(false);
            // Reset fields
            setNewFullName("");
            setNewEmail("");
            setNewUsername("");
            setNewPassword("");
            setNewCompanyId("3");
            setSelectedRole("produksi");
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
        setSelectedRole("produksi");
        setShowDropdown(false);
        setModalError("");
    };

    const hasActiveFilters = Boolean(search);

    return (
        <main className="min-h-screen bg-slate-50 py-6 sm:py-10">
            {success && (
                <div className="fixed top-4 right-4 z-50 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <HiOutlineCheckCircle className="h-4 w-4 text-emerald-600" />
                    {success}
                </div>
            )}
            {error && (
                <div className="fixed top-4 right-4 z-50 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-600" />
                    {error}
                </div>
            )}
            <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
                {/* Hero header */}
                <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
                    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-emerald-300/10 blur-3xl" />

                    <div className="relative p-5 sm:p-6 lg:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    Master Data Karyawan Cleanox
                                </h1>
                                <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                                    Kelola data karyawan produksi dan frontliner yang ditugaskan pada unit bisnis Cleanox.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#97bd3f] hover:bg-[#86aa34] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-sm shadow-[#97bd3f]/20 active:scale-95"
                            >
                                <HiOutlinePlus className="h-4 w-4" />
                                Tambah Karyawan
                            </button>
                        </div>
                    </div>
                </section>

                {/* Search & Filters */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#97bd3f]/10 text-[#1b3459]">
                                <HiOutlineMagnifyingGlass className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Pencarian Karyawan</p>
                                <p className="text-xs text-slate-500">Cari berdasarkan nama, username, email, atau NIK</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setRefreshKey((k) => k + 1)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <HiOutlineArrowPath className="h-3.5 w-3.5" />
                                Refresh
                            </button>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                                >
                                    <HiOutlineXMark className="h-3.5 w-3.5" />
                                    Bersihkan Filter
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="relative">
                            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Masukkan nama, NIK, username, atau email..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:bg-white focus:ring-2 focus:ring-[#1b3459]/10"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput("")}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                >
                                    <HiOutlineXMark className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Table / List View */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="text-base font-bold text-slate-800">Daftar Karyawan Cleanox</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Klik pada header tabel untuk mengurutkan data.
                        </p>
                    </div>

                    {/* Desktop view */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap w-10">
                                        No
                                    </th>
                                    <SortTh col="employee_code" label="NIK" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <SortTh col="full_name" label="Nama Karyawan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <SortTh col="username" label="Username" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <SortTh col="join_date" label="Bergabung" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Telepon
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Unit / Bagian
                                    </th>
                                    <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

                                {!loading && rows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-14 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <HiOutlineUsers className="h-9 w-9 opacity-40" />
                                                <p className="text-sm">
                                                    {hasActiveFilters
                                                        ? "Tidak ada karyawan Cleanox yang cocok dengan filter saat ini."
                                                        : "Belum ada data karyawan Cleanox."}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {!loading &&
                                    rows.map((item, idx) => (
                                        <tr key={item.employee_id} className="align-top transition-colors hover:bg-[#97bd3f]/5">
                                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400 font-medium">
                                                {idx + 1}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                {item.employee_code ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-semibold text-slate-600">
                                                        {item.employee_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1b3459] text-xs font-bold text-white">
                                                        {(item.full_name || "?")[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 whitespace-nowrap">
                                                            {capitalEachWord(item.full_name) || "-"}
                                                        </p>
                                                        {item.email && (
                                                            <p className="text-[11px] text-slate-400 whitespace-nowrap">{item.email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                {item.username ? (
                                                    <span className="text-xs font-medium text-slate-700">{item.username}</span>
                                                ) : (
                                                    <span className="text-xs italic text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                                                {item.join_date ? (
                                                    <span className="flex items-center gap-1">
                                                        <HiOutlineCalendarDays className="h-3.5 w-3.5 text-slate-300" />
                                                        {formatDate(item.join_date)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                                                {item.phone_number || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 relative">
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
                                                        <CompanyBadge role={item.cleanox_role} />
                                                        {updatingIds.has(item.employee_id) ? (
                                                            <div className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-[#1b3459]" />
                                                        ) : (
                                                            <HiOutlineChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
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
                                                            <div className="absolute left-0 mt-1.5 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                                                                {Object.entries(ROLE_META).map(([key, meta]) => (
                                                                    <button
                                                                        key={key}
                                                                        type="button"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            if (item.cleanox_role === key) return;
                                                                            await handleUpdateRole(item.employee_id, key);
                                                                        }}
                                                                        className={cn(
                                                                            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                                                                            item.cleanox_role === key 
                                                                                ? "bg-slate-50 text-[#1b3459]" 
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
                                            <td className="w-28 whitespace-nowrap px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(`/cleanox-management-system/${item.employee_id}`, {
                                                            state: { backTo: "/cleanox-management-system" },
                                                        })
                                                    }
                                                    title="Lihat detail karyawan"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-[#1b3459] hover:text-white hover:border-[#1b3459] transition-colors"
                                                >
                                                    <HiOutlineEye className="h-4 w-4" />
                                                </button>
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
                                <HiOutlineUsers className="h-8 w-8 opacity-40" />
                                <p>
                                    {hasActiveFilters
                                        ? "Tidak ada data yang cocok."
                                        : "Belum ada data karyawan Cleanox."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3 p-4 sm:grid-cols-2">
                                {rows.map((item) => (
                                    <MobileCard
                                        key={item.employee_id}
                                        item={item}
                                        onDetail={(id) =>
                                            navigate(`/cleanox-management-system/${id}`, {
                                                state: { backTo: "/cleanox-management-system" },
                                            })
                                        }
                                        activeDropdownId={activeDropdownId}
                                        setActiveDropdownId={setActiveDropdownId}
                                        onUpdateRole={handleUpdateRole}
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
                    <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <HiOutlineUserPlus className="h-5 w-5 text-[#97bd3f]" />
                                Tambah Karyawan Cleanox
                            </h3>
                            <button type="button" onClick={closeAddModal} className="text-slate-400 hover:text-slate-600">
                                <HiOutlineXMark className="h-5 w-5" />
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
                                    addMode === "existing" ? "bg-white text-[#1b3459] shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Pilih Karyawan Aktif
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAddMode("new"); setModalError(""); }}
                                className={cn(
                                    "flex-1 py-2 text-center rounded-md transition-all",
                                    addMode === "new" ? "bg-white text-[#1b3459] shadow-sm" : "text-slate-500 hover:text-slate-800"
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
                                            Tidak ada karyawan aktif (dari company 1, 3, atau 5) yang tersedia untuk ditugaskan.
                                        </p>
                                    ) : (
                                        <div className="relative">
                                            <div className="relative">
                                                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:bg-white focus:ring-2 focus:ring-[#1b3459]/10"
                                                />
                                                {searchAssignable && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSearchAssignable(""); setShowDropdown(false); }}
                                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <HiOutlineXMark className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {showDropdown && (filteredAssignable.length === 0 ? (
                                                <p className="mt-1.5 text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                    Tidak ada karyawan yang cocok dengan pencarian.
                                                </p>
                                            ) : (
                                                <div className="mt-1.5 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
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
                                                                "w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-[#97bd3f]/10",
                                                                selectedEmployeeId === emp.employee_id
                                                                    ? "bg-[#97bd3f]/15 font-semibold text-[#1b3459]"
                                                                    : "text-slate-700"
                                                            )}
                                                        >
                                                            <span className="font-medium">{emp.full_name}</span>
                                                            {emp.employee_code && (
                                                                <span className="ml-1.5 font-mono text-slate-400">({emp.employee_code})</span>
                                                            )}
                                                            {emp.email && (
                                                                <span className="ml-2 text-slate-400">— {emp.email}</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}

                                            {selectedEmployeeId && (
                                                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#97bd3f]/10 border border-[#97bd3f]/20 px-2.5 py-1.5">
                                                    <HiOutlineCheckCircle className="h-3.5 w-3.5 text-[#97bd3f]" />
                                                    <span className="text-xs font-medium text-[#1b3459]">
                                                        Terpilih: {assignable.find((e) => e.employee_id === selectedEmployeeId)?.full_name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Unit / Bagian</label>
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                                    >
                                        <option value="produksi">Produksi</option>
                                        <option value="frontliner">Frontliner</option>
                                    </select>
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
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="email@company.com"
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        placeholder="username_karyawan"
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="********"
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Perusahaan</label>
                                        <select
                                            value={newCompanyId}
                                            onChange={(e) => setNewCompanyId(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                                        >
                                            <option value="1">PT Waschen Alora Indonesia (1)</option>
                                            <option value="3">Cleanox Indonesia (3)</option>
                                            <option value="5">Waschen (5)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit / Bagian</label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                                        >
                                            <option value="produksi">Produksi</option>
                                            <option value="frontliner">Frontliner</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={closeAddModal}
                                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={modalSaving || (addMode === "existing" && assignable.length === 0)}
                                onClick={handleAddSubmit}
                                className="flex-1 rounded-lg bg-[#97bd3f] hover:bg-[#86aa34] py-2.5 text-xs font-semibold text-white transition disabled:opacity-50"
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
