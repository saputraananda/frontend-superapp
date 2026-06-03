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
    const textColor =
        pct >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
            pct >= 50 ? "text-amber-700 bg-amber-50 border-amber-200" :
                "text-rose-600 bg-rose-50 border-rose-200";
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums", textColor)}>
            {pct}%
        </span>
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
            className={cn(dim, "rounded-full object-cover shrink-0 ring-2 ring-white")} />
    );
    return (
        <div className={cn(dim, "rounded-full shrink-0 ring-2 ring-white flex items-center justify-center font-bold", color)}>
            {initials}
        </div>
    );
}

const LIMIT_OPTIONS = [10, 20, 50, 100, 0];
const selectCls = "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition shadow-sm";

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
    const [limit, setLimit] = useState(0);

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
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition">
                    <div className="flex items-center pl-3.5 text-slate-400">
                        <HiOutlineMagnifyingGlass className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Cari nama, email, NIK..."
                        className="px-3 py-2.5 text-sm outline-none w-60 bg-transparent text-slate-700 placeholder:text-slate-300"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <select value={filterCompany} onChange={handleFilterChange(setFilterCompany)} className={selectCls}>
                        <option value="">Semua Perusahaan</option>
                        {companies.map((c) => (
                            <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                        ))}
                    </select>
                    <select value={filterDept} onChange={handleFilterChange(setFilterDept)} className={selectCls}>
                        <option value="">Semua Departemen</option>
                        {departments.map((d) => (
                            <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                        ))}
                    </select>
                    <select value={filterStatus} onChange={handleFilterChange(setFilterStatus)} className={selectCls}>
                        <option value="">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="resigned">Keluar</option>
                        <option value="contract_ending">Kontrak ≤ 30 hari</option>
                    </select>
                </div>

                <p className="sm:ml-auto text-sm text-slate-500">
                    <span className="font-bold text-slate-700 tabular-nums">{total}</span> karyawan ditemukan
                </p>
                <div className="flex items-center gap-1.5 sm:ml-0">
                    <span className="text-xs text-slate-400 shrink-0">Tampilkan:</span>
                    {LIMIT_OPTIONS.map((n) => (
                        <button
                            key={n}
                            onClick={() => { setLimit(n); setPage(1); }}
                            className={cn(
                                "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                                limit === n
                                    ? "border-blue-500 bg-blue-600 text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {n === 0 ? "Semua" : n}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loadingTable ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                            <p className="text-sm text-slate-400">Memuat data karyawan...</p>
                        </div>
                    </div>
                ) : employees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <HiOutlineUsers className="w-7 h-7 text-slate-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-slate-600">Tidak ada data</p>
                            <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Karyawan</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Perusahaan</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Departemen</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Jabatan</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">No Telp</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Bergabung</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Kelengkapan</th>
                                    <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {employees.map((emp) => {
                                    const pct = calcCompleteness(emp);
                                    return (
                                        <tr key={emp.employee_id} className="group hover:bg-blue-50/30 transition-colors duration-100">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <Avatar src={emp.profile_path ? assetUrl(emp.profile_path) : null} name={emp.full_name} />
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-800 truncate text-sm">{emp.full_name?.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) ?? "—"}</p>
                                                        <p className="text-xs text-slate-400 truncate mt-0.5">{emp.email}</p>
                                                        {emp.employee_code && (
                                                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{emp.employee_code}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <span className="text-sm text-slate-600">{emp.company_name ?? "—"}</span>
                                            </td>
                                            <td className="px-6 py-4 hidden lg:table-cell">
                                                <span className="text-sm text-slate-600">{emp.department_name ?? "—"}</span>
                                            </td>
                                            <td className="px-6 py-4 hidden lg:table-cell">
                                                <p className="text-sm text-slate-700 font-medium">{emp.position_name ?? "—"}</p>
                                                {emp.job_level_name && <p className="text-xs text-slate-400 mt-0.5">{emp.job_level_name}</p>}
                                            </td>
                                            <td className="px-6 py-4 hidden xl:table-cell">
                                                {emp.phone_number
                                                    ? <span className="text-sm text-slate-600 tabular-nums font-mono">{emp.phone_number}</span>
                                                    : <span className="text-sm text-slate-300">—</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 hidden xl:table-cell">
                                                <span className="text-sm text-slate-500 tabular-nums">{emp.join_date?.split("T")[0] ?? "—"}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge exitDate={emp.exit_date} contractEnd={emp.contract_end_date} />
                                            </td>
                                            <td className="px-6 py-4 hidden xl:table-cell">
                                                <CompletenessBar pct={pct} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(`/master-karyawan/${emp.employee_id}`)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 px-3.5 py-2 text-xs font-semibold text-slate-500 transition-all duration-150 shadow-sm">
                                                    Lihat Detail
                                                    <HiOutlineChevronRight className="w-3.5 h-3.5" />
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
                    <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            Halaman <span className="font-bold text-slate-700">{page}</span> dari <span className="font-bold text-slate-700">{totalPages}</span>
                            <span className="mx-2 text-slate-300">·</span>
                            Total <span className="font-bold text-slate-700 tabular-nums">{total}</span> data
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm">
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
                                            "flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold transition shadow-sm",
                                            pg === page
                                                ? "bg-blue-600 text-white border border-blue-600"
                                                : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                        )}>
                                        {pg}
                                    </button>
                                );
                            })}
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm">
                                <HiOutlineChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
