import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, assetUrl } from "../../../lib/api";
import {
    HiOutlineUsers,
    HiOutlineMagnifyingGlass,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const COMPLETENESS_FIELDS = [
    "full_name", "email", "private_email", "gender", "birth_place", "birth_date", "phone_number",
    "address", "ktp_number", "family_card_number", "religion_id", "marital_status",
    "company_id", "department_id", "position_id", "employment_status_id", "join_date",
    "contract_end_date", "education_level_id", "school_name", "major_name", "bank_id",
    "bank_account_number", "bpjs_health_number", "bpjs_employment_number",
    "npwp_number", "emergency_contact", "notes", "profile_path", "ktp_path",
    "username",
];

function calcCompleteness(emp) {
    const filled = COMPLETENESS_FIELDS.filter(
        (k) => String(emp[k] ?? "").trim() !== ""
    ).length;
    return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

function CompletenessBar({ pct }) {
    const bgClass =
        pct >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
            pct >= 50 ? "text-amber-700 bg-amber-50 border-amber-200" :
                "text-rose-600 bg-rose-50 border-rose-200";
    const barClass =
        pct >= 80 ? "bg-emerald-500" :
            pct >= 50 ? "bg-amber-500" :
                "bg-rose-500";
    return (
        <div className="flex items-center gap-2">
            <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden md:block">
                <div className={cn("h-full rounded-full transition-all duration-300", barClass)} style={{ width: `${pct}%` }} />
            </div>
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums", bgClass)}>
                {pct}%
            </span>
        </div>
    );
}

function StatusBadge({ exitDate, contractEnd }) {
    if (exitDate) return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-600">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Keluar
        </span>
    );
    if (contractEnd) {
        const days = Math.ceil((new Date(contractEnd) - new Date()) / 86400000);
        if (days <= 30 && days >= 0) return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {days} hari lagi
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif
        </span>
    );
}

function Avatar({ src, name, size = "md" }) {
    const [err, setErr] = useState(false);
    const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
    const initials = (name ?? "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const colors = ["bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700"];
    const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
    if (src && !err) return (
        <img src={src} alt="" onError={() => setErr(true)}
            className={cn(dim, "rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm")} />
    );
    return (
        <div className={cn(dim, "rounded-full shrink-0 ring-2 ring-white flex items-center justify-center font-bold shadow-sm", color)}>
            {initials}
        </div>
    );
}

const LIMIT_OPTIONS = [10, 20, 50, 100, 0];
const selectCls = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-750 outline-none hover:border-slate-350 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-150 shadow-sm cursor-pointer";

export default function DataKaryawan() {
    const navigate = useNavigate();
    
    const [employees, setEmployees] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingTable, setLoadingTable] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filterCompany, setFilterCompany] = useState("");
    const [filterDept, setFilterDept] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [limit, setLimit] = useState(10); // set to 10 as default instead of 0 (Semua) for better initial load speed

    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        api("/employees/master-data").then((res) => {
            setCompanies(res.companies || []);
            setDepartments(res.departments || []);
        }).catch(() => { });
    }, []);

    const loadTable = useCallback(async () => {
        setLoadingTable(true);
        try {
            const params = new URLSearchParams();
            if (filterCompany) params.set("company_id", filterCompany);
            if (filterDept) params.set("department_id", filterDept);
            if (filterStatus) params.set("status", filterStatus);
            if (search) params.set("search", search);
            params.set("page", page);
            params.set("limit", limit === 0 ? 99999 : limit);
            const res = await api(`/hr/employees?${params}`);
            setEmployees(res.data || []);
            setTotal(res.total || 0);
        } catch (e) { console.error(e); }
        finally { setLoadingTable(false); }
    }, [filterCompany, filterDept, filterStatus, search, page, limit]);

    useEffect(() => { loadTable(); }, [loadTable]);

    const totalPages = limit === 0 ? 1 : Math.ceil(total / limit);
    const handleFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

    return (
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            
            {/* Filter Section */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50">
                {/* Search Input */}
                <div className="flex-1 flex items-center rounded-xl border border-slate-200 bg-slate-55/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15 focus-within:border-blue-500 transition-all duration-200 overflow-hidden">
                    <div className="flex items-center pl-3.5 text-slate-400">
                        <HiOutlineMagnifyingGlass className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Cari nama, email, NIK..."
                        className="w-full px-3 py-2.5 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                    />
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:flex lg:items-center">
                    <div className="relative w-full lg:w-52">
                        <select value={filterCompany} onChange={handleFilterChange(setFilterCompany)} className={selectCls}>
                            <option value="">Semua Perusahaan</option>
                            {companies.map((c) => (
                                <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative w-full lg:w-52">
                        <select value={filterDept} onChange={handleFilterChange(setFilterDept)} className={selectCls}>
                            <option value="">Semua Departemen</option>
                            {departments.map((d) => (
                                <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative w-full lg:w-52">
                        <select value={filterStatus} onChange={handleFilterChange(setFilterStatus)} className={selectCls}>
                            <option value="">Semua Status</option>
                            <option value="active">Aktif</option>
                            <option value="resigned">Keluar</option>
                            <option value="contract_ending">Kontrak ≤ 30 hari</option>
                        </select>
                    </div>
                </div>
            </div>
            
            {/* Table Container Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-100/60 overflow-hidden">
                
                {/* Table Header Controls */}
                <div className="px-6 py-4 border-b border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <p className="text-sm font-bold text-slate-800">Daftar Karyawan</p>
                        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-600 tabular-nums">
                            {total} Karyawan
                        </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-400">Tampilkan:</span>
                        <div className="flex items-center gap-1 bg-slate-105/80 p-0.5 rounded-xl border border-slate-200/50">
                            {LIMIT_OPTIONS.map((n) => (
                                <button
                                    key={n}
                                    onClick={() => { setLimit(n); setPage(1); }}
                                    className={cn(
                                        "rounded-lg px-3 py-1 text-xs font-bold transition-all duration-155",
                                        limit === n
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    {n === 0 ? "Semua" : n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loadingTable ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                            <p className="text-sm font-semibold text-slate-400">Memuat data karyawan...</p>
                        </div>
                    </div>
                ) : employees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                            <HiOutlineUsers className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-700">Tidak Ada Data</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs px-4">Tidak ditemukan karyawan yang cocok dengan kriteria pencarian atau filter Anda.</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Karyawan</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Perusahaan</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Departemen</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Jabatan</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">No Telp</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Bergabung</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Kelengkapan</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {employees.map((emp) => {
                                    const pct = calcCompleteness(emp);
                                    return (
                                        <tr key={emp.employee_id} className="group hover:bg-slate-50/60 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3.5">
                                                    <Avatar src={emp.profile_path ? assetUrl(emp.profile_path) : null} name={emp.full_name} />
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 truncate text-sm hover:text-blue-600 transition-colors duration-150 cursor-pointer"
                                                           onClick={() => navigate(`/master-karyawan/${emp.employee_id}`)}>
                                                            {emp.full_name?.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) ?? "—"}
                                                        </p>
                                                        <p className="text-xs text-slate-400 truncate mt-0.5">{emp.email || "—"}</p>
                                                        {emp.employee_code && (
                                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-wider bg-slate-100 inline-block px-1.5 py-0.5 rounded">{emp.employee_code}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell whitespace-nowrap">
                                                <span className="text-sm font-medium text-slate-600">{emp.company_name ?? "—"}</span>
                                            </td>
                                            <td className="px-6 py-4 hidden lg:table-cell whitespace-nowrap">
                                                <span className="text-sm text-slate-500">{emp.department_name ?? "—"}</span>
                                            </td>
                                            <td className="px-6 py-4 hidden lg:table-cell whitespace-nowrap">
                                                <p className="text-sm text-slate-700 font-semibold">{emp.position_name ?? "—"}</p>
                                                {emp.job_level_name && <p className="text-[11px] text-slate-400 mt-0.5">{emp.job_level_name}</p>}
                                            </td>
                                            <td className="px-6 py-4 hidden xl:table-cell whitespace-nowrap">
                                                {emp.phone_number
                                                    ? <span className="text-sm text-slate-600 font-mono">{emp.phone_number}</span>
                                                    : <span className="text-sm text-slate-300">—</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 hidden xl:table-cell whitespace-nowrap">
                                                <span className="text-sm text-slate-500 font-mono">{emp.join_date?.split("T")[0] ?? "—"}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge exitDate={emp.exit_date} contractEnd={emp.contract_end_date} />
                                            </td>
                                            <td className="px-6 py-4 hidden xl:table-cell whitespace-nowrap">
                                                <CompletenessBar pct={pct} />
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => navigate(`/master-karyawan/${emp.employee_id}`)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white group-hover:border-blue-200 group-hover:bg-blue-50/70 group-hover:text-blue-600 px-3.5 py-2 text-xs font-bold text-slate-500 transition-all duration-200 shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
                                                >
                                                    Detail
                                                    <HiOutlineChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform duration-200" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && limit !== 0 && (
                    <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30">
                        <p className="text-xs text-slate-500 text-center sm:text-left">
                            Halaman <span className="font-bold text-slate-700">{page}</span> dari <span className="font-bold text-slate-700">{totalPages}</span>
                            <span className="mx-2 text-slate-300">·</span>
                            Total <span className="font-bold text-slate-700">{total}</span> data
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
                            >
                                <HiOutlineChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                if (pg > totalPages) return null;
                                return (
                                    <button
                                        key={pg}
                                        onClick={() => setPage(pg)}
                                        className={cn(
                                            "flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold transition-all duration-150 shadow-sm",
                                            pg === page
                                                ? "bg-blue-600 text-white border border-blue-600"
                                                : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        {pg}
                                    </button>
                                );
                            })}
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
                            >
                                <HiOutlineChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
