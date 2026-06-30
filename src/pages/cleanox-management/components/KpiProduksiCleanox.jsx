import { useEffect, useMemo, useState, useCallback } from "react";
import {
    HiOutlineTrophy,
    HiOutlineCalendarDays,
    HiOutlineChevronDown,
    HiOutlineXMark,
    HiOutlineExclamationTriangle,
    HiOutlineArrowPath,
    HiOutlineBars3BottomLeft,
    HiOutlineMagnifyingGlass,
    HiOutlineDocumentArrowDown,
    HiOutlineBuildingOffice,
    HiOutlineUserGroup,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineArrowTrendingUp,
    HiOutlineTruck,
    HiOutlineCube,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineEye,
    HiOutlineChevronUp,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineSparkles,
    HiOutlineFire,
    HiOutlineShieldCheck,
    HiOutlineChartBar,
    HiOutlineMinusCircle,
} from "react-icons/hi2";
import { api, BASE_URL } from "../../../lib/api";

function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}

function renderStageCell(value, maxVal, colors) {
    const pct = maxVal > 0 ? Math.round((value / maxVal) * 100) : 0;
    return (
        <div className="flex flex-col gap-1 w-full max-w-[110px]">
            <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={cn("font-sans", colors?.text || "text-slate-700")}>{formatNumber(value)}</span>
                <span className="text-[9px] text-slate-400 font-normal">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                <div className={cn("h-full rounded-full", colors?.bar || "bg-slate-400")} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function formatNumber(val) {
    if (val == null) return "0";
    return Number(val).toLocaleString("id-ID");
}

function capitalEachWord(value) {
    if (!value) return "";
    return String(value)
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
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

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatDateShort(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
    }).format(date);
}

const STAGES = [
    { key: "pickup", label: "Pickup", color: "blue" },
    { key: "cuci_jemur", label: "Cuci & Jemur", color: "amber" },
    { key: "packing", label: "Packing", color: "purple" },
    { key: "pengantaran", label: "Pengantaran", color: "green" },
];

const STAGE_COLORS = {
    pickup: { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500", border: "border-blue-200", light: "bg-blue-50" },
    cuci_jemur: { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500", border: "border-amber-200", light: "bg-amber-50" },
    packing: { bg: "bg-purple-100", text: "text-purple-700", bar: "bg-purple-500", border: "border-purple-200", light: "bg-purple-50" },
    pengantaran: { bg: "bg-green-100", text: "text-green-700", bar: "bg-green-500", border: "border-green-200", light: "bg-green-50" },
};

const RANK_BADGE = {
    1: { bg: "bg-yellow-400", text: "text-yellow-900", label: "1st", icon: "gold" },
    2: { bg: "bg-slate-300", text: "text-slate-800", label: "2nd", icon: "silver" },
    3: { bg: "bg-amber-600", text: "text-amber-900", label: "3rd", icon: "bronze" },
};

const EMPTY_INSIGHTS = {
    daily_stage: [],
    aging_processing_hours: [],
    top_services: [],
    sla: null,
};

function cutoffStart(year, month) {
    const y = Number(year);
    const m = Number(month);
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    return `${prevYear}-${String(prevMonth).padStart(2, "0")}-26`;
}
function cutoffEnd(year, month) {
    const y = Number(year);
    const m = Number(month);
    return `${y}-${String(m).padStart(2, "0")}-25`;
}

function getDaysDiff(targetDate, pengantaranDate) {
    if (!targetDate || !pengantaranDate) return NaN;
    const target = new Date(targetDate);
    const deliv = new Date(pengantaranDate);
    if (isNaN(target.getTime()) || isNaN(deliv.getTime())) return NaN;
    target.setHours(0, 0, 0, 0);
    deliv.setHours(0, 0, 0, 0);
    return Math.round((deliv - target) / 864e5);
}

const CATEGORY_LABELS = {
    early: "Lebih Cepat",
    on_time: "Tepat Waktu",
    late: "Terlambat",
    pending: "Belum Diantar",
    tepat: "Tepat Waktu",
    terlambat: "Terlambat",
    total: "Total Pengantaran",
};

const AGING_LABELS = {
    pickup_to_cuci_jemur: { label: "Pickup ➔ Cuci & Jemur", color: "from-blue-500 to-amber-500" },
    cuci_jemur_to_packing: { label: "Cuci & Jemur ➔ Packing", color: "from-amber-500 to-purple-500" },
    packing_to_delivery: { label: "Packing ➔ Pengantaran", color: "from-purple-500 to-green-500" },
    pickup_to_delivery: { label: "Total Waktu (Pickup ➔ Pengantaran)", color: "from-slate-400 to-slate-600" },
};

function isBillingRange(d) {
    return d.getDate() >= 26;
}

function getDefaultDateRange() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    if (isBillingRange(now)) {
        const nextM = m === 12 ? 1 : m + 1;
        const nextY = m === 12 ? y + 1 : y;
        return {
            date_start: cutoffStart(nextY, nextM),
            date_end: cutoffEnd(nextY, nextM),
        };
    }
    return {
        date_start: cutoffStart(y, m),
        date_end: cutoffEnd(y, m),
    };
}

function LoadingBar() {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-100">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-[#1b3459] via-[#97bd3f] to-[#1b3459]"
                style={{ animation: "loading-bar 1.5s ease-in-out infinite" }}
            />
            <style>{`@keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
        </div>
    );
}

function EmployeeCard({ employee, rank, onClick, maxTotal }) {
    const progressPct = maxTotal > 0 ? Math.round((employee.total / maxTotal) * 100) : 0;

    return (
        <button
            type="button"
            onClick={() => onClick(employee)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-[#97bd3f]/30 hover:-translate-y-0.5 w-full"
        >
            {rank && rank <= 3 && (
                <div className={cn("absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black shadow-sm ring-2 ring-white", RANK_BADGE[rank]?.bg || "bg-slate-400")}>
                    {rank === 1 ? "1" : rank === 2 ? "2" : "3"}
                </div>
            )}
            <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1b3459] text-sm font-bold text-white">
                    {(employee.name || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{capitalEachWord(employee.name)}</p>
                    <p className="text-[11px] text-slate-400">
                        {employee.total} items &middot; Rank #{employee.rank || rank}
                    </p>
                </div>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#97bd3f] to-[#1b3459] transition-all duration-500"
                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                {STAGES.map((stage) => {
                    const val = employee[stage.key] || 0;
                    const sc = STAGE_COLORS[stage.key];
                    return (
                        <div key={stage.key} className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1", sc?.border || "border-slate-200", sc?.light || "bg-slate-50")}>
                            <span className={cn("h-2 w-2 rounded-full shrink-0", sc?.bar || "bg-slate-400")} />
                            <span className="text-[10px] font-semibold text-slate-500 truncate">{stage.label}</span>
                            <span className={cn("ml-auto text-[10px] font-bold", sc?.text || "text-slate-700")}>{formatNumber(val)}</span>
                        </div>
                    );
                })}
            </div>
        </button>
    );
}

function DetailModal({ employee, dateStart, dateEnd, onClose }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeStage, setActiveStage] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!employee) return;
        const fetchDetail = async () => {
            try {
                setLoading(true);
                setError("");
                const res = await api(`/kpi/detail?${new URLSearchParams({ employee_name: employee.name, date_start: dateStart, date_end: dateEnd })}`);
                setItems(res.items || []);
            } catch (err) {
                setError(err.message || "Gagal memuat detail");
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [employee, dateStart, dateEnd]);

    const filtered = useMemo(() => {
        if (!activeStage) return items;
        return items.filter((it) => it.stage === activeStage);
    }, [items, activeStage]);

    const stageCounts = useMemo(() => {
        const counts = {};
        items.forEach((it) => { counts[it.stage] = (counts[it.stage] || 0) + 1; });
        return counts;
    }, [items]);

    if (!employee) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">{capitalEachWord(employee.name)}</h3>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{formatNumber(employee.total)} items &middot; Rank #{employee.rank}</p>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <HiOutlineXMark className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-6 py-4 shrink-0 scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    <style>{`.scrollbar-none::-webkit-scrollbar { display: none; }`}</style>
                    <button
                        type="button"
                        onClick={() => setActiveStage(null)}
                        className={cn(
                            "shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold transition duration-200",
                            !activeStage
                                ? "bg-[#1b3459] text-white border-[#1b3459] shadow-sm"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        )}
                    >
                        Semua ({items.length})
                    </button>
                    {STAGES.map((stage) => {
                        const cnt = stageCounts[stage.key] || 0;
                        const sc = STAGE_COLORS[stage.key];
                        const isActive = activeStage === stage.key;
                        return (
                            <button
                                key={stage.key}
                                type="button"
                                onClick={() => setActiveStage(isActive ? null : stage.key)}
                                className={cn(
                                    "shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold transition duration-200",
                                    isActive
                                        ? `${sc?.bg || "bg-slate-100"} ${sc?.text || "text-slate-700"} ${sc?.border || "border-slate-300"} shadow-sm`
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                )}
                            >
                                {stage.label} ({cnt})
                            </button>
                        );
                    })}
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-sm text-rose-500">
                            <HiOutlineExclamationTriangle className="h-8 w-8" />
                            <p>{error}</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-sm text-slate-400">
                            <HiOutlineCube className="h-8 w-8 opacity-40" />
                            <p>Tidak ada items pada tahap ini.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map((it, i) => (
                                <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{it.invoice || "-"}</span>
                                                {it.outlet && <span className="rounded-md bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 uppercase tracking-wider">{it.outlet}</span>}
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">{it.customer_name || "-"}</p>
                                        </div>
                                        <span className={cn("shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", STAGE_COLORS[it.stage]?.border || "border-slate-200", STAGE_COLORS[it.stage]?.text || "text-slate-600", STAGE_COLORS[it.stage]?.bg || "bg-slate-50")}>
                                            {STAGES.find((s) => s.key === it.stage)?.label || it.stage}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                                        <p className="text-xs font-semibold text-slate-700 truncate max-w-[60%]">{it.item_name || "-"}</p>
                                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{it.jumlah} {it.satuan_item}</span>
                                            <span>&bull;</span>
                                            <span className="flex items-center gap-1"><HiOutlineClock className="h-3 w-3" />{it.date ? formatDateShort(it.date) : "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SlaItemsModal({ category, dateStart, dateEnd, outlet, onClose }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const perPage = 15;

    useEffect(() => {
        const fetchItems = async () => {
            try {
                setLoading(true);
                setError("");
                const params = new URLSearchParams({ category, date_start: dateStart, date_end: dateEnd });
                if (outlet) params.set("outlet", outlet);
                const res = await api(`/kpi/sla-items?${params.toString()}`);
                setRows(res.items || []);
            } catch (err) {
                setError(err.message || "Gagal memuat data SLA");
                setRows([]);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [category, dateStart, dateEnd, outlet]);

    const filtered = useMemo(() => {
        if (!search.trim()) return rows;
        const kw = search.toLowerCase();
        return rows.filter((r) => {
            const vals = [r.invoice, r.customer_name, r.item_name, r.status].filter(Boolean);
            return vals.some((v) => v.toLowerCase().includes(kw));
        });
    }, [rows, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    useEffect(() => { setPage(1); }, [search]);

    const handleExport = async () => {
        try {
            setExporting(true);
            const params = new URLSearchParams({ category, date_start: dateStart, date_end: dateEnd });
            if (outlet) params.set("outlet", outlet);
            const token = localStorage.getItem("cleanox_token");
            const res = await fetch(`${BASE_URL}/kpi/sla-items/export?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error("Gagal mengekspor data");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `sla-${category}-${dateStart}-${dateEnd}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || "Gagal mengekspor");
        } finally {
            setExporting(false);
        }
    };

    const catLabel = CATEGORY_LABELS[category] || category;
    const itemStart = filtered.length > 0 ? (page - 1) * perPage + 1 : 0;
    const itemEnd = Math.min(page * perPage, filtered.length);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 flex max-h-[85vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 px-6 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition">
                            <HiOutlineChevronLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h3 className="text-base font-black text-slate-800">SLA &mdash; {catLabel}</h3>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">{filtered.length} item &bull; halaman {page} / {totalPages}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nota / outlet / custom..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-[#1b3459] focus:bg-white focus:ring-2 focus:ring-[#1b3459]/10"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={exporting || rows.length === 0}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                        >
                            <HiOutlineDocumentArrowDown className="h-3.5 w-3.5 text-slate-500" />
                            Export
                        </button>
                        <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                            <HiOutlineXMark className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="space-y-3 p-6">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-2 py-14 text-sm text-rose-500">
                            <HiOutlineExclamationTriangle className="h-8 w-8" />
                            <p>{error}</p>
                        </div>
                    ) : paginated.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-400">
                            <HiOutlineCube className="h-8 w-8 opacity-40" />
                            <p>{search ? "Tidak ada hasil pencarian." : "Tidak ada items."}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-3 font-semibold">No Nota</th>
                                    <th className="px-6 py-3 font-semibold">Outlet</th>
                                    <th className="px-6 py-3 font-semibold">Customer</th>
                                    <th className="px-6 py-3 font-semibold">Item</th>
                                    <th className="px-6 py-3 text-center font-semibold">Terima</th>
                                    <th className="px-6 py-3 text-center font-semibold">Target</th>
                                    <th className="px-6 py-3 text-center font-semibold">Pengantaran</th>
                                    <th className="px-6 py-3 text-center font-semibold">Selisih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {paginated.map((it, idx) => {
                                    const diffNum = getDaysDiff(it.target_date, it.pengantaran_at);
                                    const isPending = !it.pengantaran_at;
                                    const diffLabel = isPending ? "-" : diffNum > 0 ? `+${diffNum} hari` : `${diffNum} hari`;
                                    const diffColor = isPending
                                        ? "text-slate-400"
                                        : diffNum > 0
                                            ? "text-rose-600"
                                            : diffNum === 0
                                                ? "text-blue-600"
                                                : "text-emerald-600";

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3.5 font-bold font-mono text-slate-800">{it.invoice || "-"}</td>
                                            <td className="px-6 py-3.5 text-slate-500">{it.outlet || "-"}</td>
                                            <td className="px-6 py-3.5 font-bold text-slate-700 uppercase">{it.customer_name || "-"}</td>
                                            <td className="px-6 py-3.5 text-slate-600 font-semibold">{it.item_name || "-"}</td>
                                            <td className="px-6 py-3.5 text-center text-slate-500">{formatDateShort(it.received_date)}</td>
                                            <td className="px-6 py-3.5 text-center font-bold text-amber-700">{formatDateShort(it.target_date)}</td>
                                            <td className="px-6 py-3.5 text-center font-bold text-slate-700">
                                                {it.pengantaran_at ? (
                                                    <span className={diffNum > 0 ? "text-rose-600" : "text-emerald-600"}>
                                                        {formatDateShort(it.pengantaran_at)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-normal">Belum</span>
                                                )}
                                            </td>
                                            <td className={cn("px-6 py-3.5 text-center font-bold", diffColor)}>{diffLabel}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 shrink-0 bg-white">
                        <span className="text-xs text-slate-400 font-medium">{itemStart}-{itemEnd} dari {filtered.length}</span>
                        <div className="flex items-center gap-1">
                            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                                <HiOutlineChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                const p = start + i;
                                if (p > totalPages) return null;
                                return (
                                    <button key={p} type="button" onClick={() => setPage(p)} className={cn("flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition-colors", p === page ? "bg-[#1b3459] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50")}>
                                        {p}
                                    </button>
                                );
                            })}
                            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                                <HiOutlineChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function KpiProduksiPage() {
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState("");

    const [outlets, setOutlets] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [selectedOutlet, setSelectedOutlet] = useState("");

    const defaultRange = getDefaultDateRange();
    const [dateStart, setDateStart] = useState(defaultRange.date_start);
    const [dateEnd, setDateEnd] = useState(defaultRange.date_end);

    const [summaryData, setSummaryData] = useState([]);
    const [overall, setOverall] = useState(null);
    const [insights, setInsights] = useState(EMPTY_INSIGHTS);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [slaCategory, setSlaCategory] = useState(null);

    const [selectedYear, setSelectedYear] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [viewMode, setViewMode] = useState("leaderboard");
    const [isCustomDate, setIsCustomDate] = useState(false);

    useEffect(() => {
        document.title = "KPI Produksi Cleanox | Alora Group Indonesia";
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const [outletsRes, periodsRes] = await Promise.all([
                    api("/kpi/outlets"),
                    api("/kpi/available-periods"),
                ]);
                setOutlets(outletsRes.outlets || []);
                setPeriods(periodsRes.periods || []);
            } catch (err) {
                console.error("Init fetch error:", err);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (periods.length > 0 && !selectedYear && !selectedMonth) {
            setSelectedYear(periods[0].yr);
            setSelectedMonth(periods[0].mo);
        }
    }, [periods, selectedYear, selectedMonth]);

    useEffect(() => {
        if (!isCustomDate && selectedYear && selectedMonth) {
            setDateStart(cutoffStart(selectedYear, selectedMonth));
            setDateEnd(cutoffEnd(selectedYear, selectedMonth));
        }
    }, [selectedYear, selectedMonth, isCustomDate]);

    const handleCustomStartChange = useCallback((val) => {
        setDateStart(val);
        if (val) {
            const parts = val.split("-");
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                if (day === 26) {
                    const nextM = m === 12 ? 1 : m + 1;
                    const nextY = m === 12 ? y + 1 : y;
                    setDateEnd(`${nextY}-${String(nextM).padStart(2, "0")}-25`);
                }
            }
        }
    }, []);

    const fetchSummary = useCallback(async (start, end, outlet) => {
        if (!start || !end) return;
        try {
            setDataLoading(true);
            setError("");
            const params = new URLSearchParams({ date_start: start, date_end: end });
            if (outlet) params.set("outlet", outlet);
            const res = await api(`/kpi/summary?${params.toString()}`);
            setSummaryData(res.summary || []);
            setOverall(res.overall || null);
            setInsights(res.insights || EMPTY_INSIGHTS);
        } catch (err) {
            setError(err.message || "Gagal memuat data KPI");
            setSummaryData([]);
            setOverall(null);
            setInsights(EMPTY_INSIGHTS);
        } finally {
            setDataLoading(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary(dateStart, dateEnd, selectedOutlet);
    }, [dateStart, dateEnd, selectedOutlet, fetchSummary]);

    const uniqueYears = useMemo(() => {
        const yrs = new Set(periods.map(p => p.yr));
        return Array.from(yrs).sort((a, b) => b - a);
    }, [periods]);

    const availableMonths = useMemo(() => {
        if (!selectedYear) return [];
        return periods.filter(p => p.yr === Number(selectedYear)).map(p => p.mo).sort((a, b) => a - b);
    }, [periods, selectedYear]);

    const sortedEmployees = useMemo(() => {
        return [...summaryData].sort((a, b) => (a.rank || 999) - (b.rank || 999));
    }, [summaryData]);

    const maxTotal = useMemo(() => {
        return Math.max(...sortedEmployees.map((e) => e.total || 0), 1);
    }, [sortedEmployees]);

    const maxStageValues = useMemo(() => {
        const maxVals = { pickup: 1, cuci_jemur: 1, packing: 1, pengantaran: 1 };
        sortedEmployees.forEach((e) => {
            maxVals.pickup = Math.max(maxVals.pickup, e.pickup || 0);
            maxVals.cuci_jemur = Math.max(maxVals.cuci_jemur, e.cuci_jemur || 0);
            maxVals.packing = Math.max(maxVals.packing, e.packing || 0);
            maxVals.pengantaran = Math.max(maxVals.pengantaran, e.pengantaran || 0);
        });
        return maxVals;
    }, [sortedEmployees]);

    const handleEmployeeClick = (emp) => {
        setSelectedEmployee(emp);
    };

    const handleSlaClick = (cat) => {
        setSlaCategory(cat);
    };



    const overallStages = overall ? [
        { key: "pickup", label: "Pickup", value: overall.pickup_done || 0 },
        { key: "cuci_jemur", label: "Cuci & Jemur", value: overall.cuci_jemur_done || 0 },
        { key: "packing", label: "Packing", value: overall.packing_done || 0 },
        { key: "pengantaran", label: "Pengantaran", value: overall.pengantaran_done || 0 },
    ] : [];

    return (
        <main className="min-h-screen bg-slate-50 py-6 sm:py-10">
            {(loading || dataLoading) && <LoadingBar />}
            {error && (
                <div className="fixed top-4 right-4 z-50 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-600" />
                    {error}
                </div>
            )}
            <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
                {/* Hero Header */}
                <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
                    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-emerald-300/10 blur-3xl" />
                    <div className="relative p-5 sm:p-6 lg:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    KPI Produksi Cleanox
                                </h1>
                                <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                                    Pantau kinerja produksi berdasarkan tahapan Pickup, Cuci &amp; Jemur, Packing, dan Pengantaran.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
                {/* Filter Card */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex flex-wrap items-end gap-3 w-full">
                            {!isCustomDate ? (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tahun</label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                                        >
                                            <option value="" disabled>Pilih Tahun</option>
                                            {uniqueYears.map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bulan (Cutoff)</label>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                                        >
                                            <option value="" disabled>Pilih Bulan</option>
                                            {availableMonths.map((m) => (
                                                <option key={m} value={m}>{MONTH_NAMES[m - 1]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal Awal</label>
                                        <input
                                            type="date"
                                            value={dateStart || ""}
                                            onChange={(e) => handleCustomStartChange(e.target.value)}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal Akhir</label>
                                        <input
                                            type="date"
                                            value={dateEnd || ""}
                                            onChange={(e) => setDateEnd(e.target.value)}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outlet</label>
                                <select
                                    value={selectedOutlet}
                                    onChange={(e) => setSelectedOutlet(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                                >
                                    <option value="">Semua Outlet</option>
                                    {outlets.map((o) => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomDate(!isCustomDate);
                                    if (isCustomDate) {
                                        if (selectedYear && selectedMonth) {
                                            setDateStart(cutoffStart(selectedYear, selectedMonth));
                                            setDateEnd(cutoffEnd(selectedYear, selectedMonth));
                                        }
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition text-xs font-bold shrink-0 self-end"
                            >
                                <HiOutlineCalendarDays className="h-4 w-4 text-slate-400" />
                                {isCustomDate ? "Gunakan Cutoff Bulanan" : "Custom Tanggal"}
                            </button>
                        </div>
                        <div className="mt-4 lg:mt-0 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shrink-0 self-end">
                            Periode: {formatDateShort(dateStart)} - {formatDateShort(dateEnd)}
                        </div>
                    </div>
                </section>
                {/* Overall Stats */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <HiOutlineChartBar className="h-4 w-4 text-[#97bd3f]" />
                        Statistik Produksi
                    </h2>
                    {dataLoading ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
                            ))}
                        </div>
                    ) : overall ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            <div className="rounded-xl bg-gradient-to-br from-[#1b3459] to-[#12233c] p-4 text-white">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Total Items</p>
                                <p className="mt-1 text-2xl font-black">{formatNumber(overall.total_items || 0)}</p>
                            </div>
                            {overallStages.map((stage) => {
                                const sc = STAGE_COLORS[stage.key];
                                return (
                                    <div key={stage.key} className={cn("rounded-xl border p-4", sc?.border || "border-slate-200", sc?.light || "bg-slate-50")}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{stage.label}</p>
                                        <p className={cn("mt-1 text-2xl font-black", sc?.text || "text-slate-700")}>{formatNumber(stage.value)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-8 text-sm text-slate-400">
                            <HiOutlineCube className="h-5 w-5 mr-2 opacity-40" />
                            Belum ada data.
                        </div>
                    )}
                </section>
                {/* Insights Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Daily Stage */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <HiOutlineSquares2X2 className="h-4 w-4 text-[#97bd3f]" />
                            Produksi Harian per Tahap
                        </h3>
                        {dataLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />
                                ))}
                            </div>
                        ) : insights.daily_stage.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {insights.daily_stage.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                        <span className="text-xs font-medium text-slate-600">{formatDateShort(d.date)}</span>
                                        <div className="flex items-center gap-2">
                                            {STAGES.map((stage) => {
                                                const val = d[stage.key] || 0;
                                                if (val === 0) return null;
                                                const sc = STAGE_COLORS[stage.key];
                                                return (
                                                    <span key={stage.key} className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", sc?.border || "border-slate-200", sc?.text || "text-slate-600")}>
                                                        {val}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-8 text-xs text-slate-400">Belum ada data harian.</div>
                        )}
                    </section>

                    {/* Aging Processing Time */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <HiOutlineClock className="h-4 w-4 text-[#97bd3f]" />
                            Aging Processing Time
                        </h3>
                        {dataLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />
                                ))}
                            </div>
                        ) : insights.aging_processing_hours.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {insights.aging_processing_hours.map((a, i) => {
                                    const config = AGING_LABELS[a.stage] || { label: a.stage, color: "from-slate-400 to-slate-500" };
                                    const maxHrs = Math.max(...insights.aging_processing_hours.map(x => x.avg_hours), 1);
                                    const pct = Math.round((a.avg_hours / maxHrs) * 100);
                                    return (
                                        <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-600">{config.label}</span>
                                                <span className="text-xs font-black text-slate-800">{formatNumber(Math.round(a.avg_hours))} jam</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className={cn("h-full rounded-full bg-gradient-to-r", config.color)}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] text-slate-400 text-right">{a.sample_count} sampel</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-8 text-xs text-slate-400">Belum ada data aging.</div>
                        )}
                    </section>

                    {/* Top Services */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <HiOutlineFire className="h-4 w-4 text-[#97bd3f]" />
                            Layanan Terpopuler
                        </h3>
                        {dataLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />
                                ))}
                            </div>
                        ) : insights.top_services.length > 0 ? (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                {insights.top_services.map((s, i) => {
                                    const pct = overall?.total_items > 0 ? Math.round((s.volume / overall.total_items) * 100) : 0;
                                    return (
                                        <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white", i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-slate-300")}>{i + 1}</span>
                                                <span className="text-xs font-medium text-slate-700 truncate">{s.service_name || s.name}</span>
                                            </div>
                                            <span className="shrink-0 text-xs font-bold text-slate-800 ml-2">{formatNumber(s.volume)} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span></span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-8 text-xs text-slate-400">Belum ada data layanan.</div>
                        )}
                    </section>
                </div>
                {/* SLA Ketepatan Pengantaran */}
                {insights.sla && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <HiOutlineShieldCheck className="h-4 w-4 text-[#97bd3f]" />
                                SLA Ketepatan Pengantaran
                            </h3>
                            <span className="text-[10px] text-slate-400 font-medium">
                                Perbandingan antara tanggal selesai (nota smartlink) dengan tanggal pengantaran.
                            </span>
                        </div>

                        <div className="flex flex-col gap-6 lg:flex-row">
                            {/* Left Gauge Panel */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-5 flex flex-col items-center justify-center text-center lg:w-80 shrink-0">
                                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">SLA RATE</span>
                                <span className={cn("text-4xl font-black my-2", insights.sla.sla_rate >= 80 ? "text-emerald-600" : insights.sla.sla_rate >= 50 ? "text-amber-600" : "text-rose-600")}>
                                    {insights.sla.sla_rate !== null ? `${insights.sla.sla_rate.toFixed(1)}%` : "-"}
                                </span>
                                {/* Progress Bar Container */}
                                <div className="w-full mt-2">
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                insights.sla.sla_rate >= 80 ? "bg-emerald-500" : insights.sla.sla_rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                                            )}
                                            style={{ width: `${Math.min(insights.sla.sla_rate || 0, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[9px] font-semibold text-slate-400 mt-1 px-0.5">
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-col gap-0.5 text-xs text-slate-500">
                                    <span className="font-semibold text-slate-600">{insights.sla.total_delivered} item diantar</span>
                                    {insights.sla.avg_delta_hours !== null && (
                                        <span className={cn("font-bold text-[10px]", insights.sla.avg_delta_hours <= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            rata-rata {insights.sla.avg_delta_hours > 0 ? "+" : ""}{String(insights.sla.avg_delta_hours).replace(".", ",")} jam dari deadline
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right Category Breakdown */}
                            {(() => {
                                const pctEarly = insights.sla.total_delivered > 0 ? Math.round((insights.sla.early / insights.sla.total_delivered) * 100) : 0;
                                const pctOnTime = insights.sla.total_delivered > 0 ? Math.round((insights.sla.on_time / insights.sla.total_delivered) * 100) : 0;
                                const pctLate = insights.sla.total_delivered > 0 ? Math.round((insights.sla.late / insights.sla.total_delivered) * 100) : 0;

                                return (
                                    <div className="flex-1 flex flex-col gap-2.5">
                                        {/* Lebih Cepat */}
                                        <button
                                            type="button"
                                            onClick={() => handleSlaClick("early")}
                                            className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/20 px-4 py-3 text-left transition hover:shadow-sm hover:border-emerald-300"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                                    <HiOutlineCheckCircle className="h-4.5 w-4.5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-emerald-800">Lebih Cepat</p>
                                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Diantar sebelum tanggal selesai</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-emerald-800 font-sans">
                                                    {insights.sla.early}{" "}
                                                    <span className="text-xs text-slate-400 font-normal">({pctEarly}%)</span>
                                                </span>
                                                <HiOutlineChevronRight className="h-4 w-4 text-slate-400" />
                                            </div>
                                        </button>

                                        {/* Tepat Waktu */}
                                        <button
                                            type="button"
                                            onClick={() => handleSlaClick("on_time")}
                                            className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/20 px-4 py-3 text-left transition hover:shadow-sm hover:border-blue-300"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                    <HiOutlineMinusCircle className="h-4.5 w-4.5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-blue-800">Tepat Waktu</p>
                                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Diantar di hari tanggal selesai</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-blue-800 font-sans">
                                                    {insights.sla.on_time}{" "}
                                                    <span className="text-xs text-slate-400 font-normal">({pctOnTime}%)</span>
                                                </span>
                                                <HiOutlineChevronRight className="h-4 w-4 text-slate-400" />
                                            </div>
                                        </button>

                                        {/* Terlambat */}
                                        <button
                                            type="button"
                                            onClick={() => handleSlaClick("late")}
                                            className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/20 px-4 py-3 text-left transition hover:shadow-sm hover:border-rose-300"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                                    <HiOutlineExclamationTriangle className="h-4.5 w-4.5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-rose-800">Terlambat</p>
                                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Diantar setelah tanggal selesai</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-rose-800 font-sans">
                                                    {insights.sla.late}{" "}
                                                    <span className="text-xs text-slate-400 font-normal">({pctLate}%)</span>
                                                </span>
                                                <HiOutlineChevronRight className="h-4 w-4 text-slate-400" />
                                            </div>
                                        </button>

                                        {/* Belum Diantar */}
                                        <button
                                            type="button"
                                            onClick={() => handleSlaClick("pending")}
                                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-left transition hover:shadow-sm hover:border-slate-300"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                                    <HiOutlineClock className="h-4.5 w-4.5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">Belum Diantar</p>
                                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Pengantaran belum dilakukan</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-slate-800 font-sans">
                                                    {insights.sla.pending}
                                                </span>
                                                <HiOutlineChevronRight className="h-4 w-4 text-slate-400" />
                                            </div>
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </section>
                )}
                {/* Employee Rankings */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <HiOutlineUserGroup className="h-4 w-4 text-[#97bd3f]" />
                            Ranking Karyawan
                        </h2>
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode("leaderboard")}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                                    viewMode === "leaderboard"
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Leaderboard Table
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("cards")}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                                    viewMode === "cards"
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Grid Kartu
                            </button>
                        </div>
                    </div>
                    {dataLoading ? (
                        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                            ))}
                        </div>
                    ) : sortedEmployees.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-400">
                            <HiOutlineUserGroup className="h-8 w-8 opacity-40" />
                            <p>Belum ada data karyawan.</p>
                        </div>
                    ) : viewMode === "leaderboard" ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[850px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-3 text-center w-16">Rank</th>
                                        <th className="px-6 py-3">Karyawan</th>
                                        <th className="px-6 py-3 text-center w-36">Total Items</th>
                                        <th className="px-6 py-3">Pickup</th>
                                        <th className="px-6 py-3">Cuci &amp; Jemur</th>
                                        <th className="px-6 py-3">Packing</th>
                                        <th className="px-6 py-3">Pengantaran</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {sortedEmployees.map((emp, idx) => {
                                        const rankNum = emp.rank || idx + 1;
                                        const totalPct = Math.round((emp.total / maxTotal) * 100);

                                        return (
                                            <tr
                                                key={emp.name}
                                                onClick={() => handleEmployeeClick(emp)}
                                                className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 text-center">
                                                    {rankNum === 1 ? (
                                                        <span className="text-xl">🥇</span>
                                                    ) : rankNum === 2 ? (
                                                        <span className="text-xl">🥈</span>
                                                    ) : rankNum === 3 ? (
                                                        <span className="text-xl">🥉</span>
                                                    ) : (
                                                        <span className="font-bold text-slate-400">#{rankNum}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1b3459] text-xs font-bold text-white group-hover:scale-105 transition-transform">
                                                            {(emp.name || "?")[0].toUpperCase()}
                                                        </div>
                                                        <span className="font-bold text-slate-800 group-hover:text-[#1b3459] transition-colors">
                                                            {capitalEachWord(emp.name)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="font-black text-slate-800 text-sm">{formatNumber(emp.total)}</span>
                                                        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                                            <div className="h-full bg-slate-500" style={{ width: `${totalPct}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {renderStageCell(emp.pickup || 0, maxStageValues.pickup, STAGE_COLORS.pickup)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {renderStageCell(emp.cuci_jemur || 0, maxStageValues.cuci_jemur, STAGE_COLORS.cuci_jemur)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {renderStageCell(emp.packing || 0, maxStageValues.packing, STAGE_COLORS.packing)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {renderStageCell(emp.pengantaran || 0, maxStageValues.pengantaran, STAGE_COLORS.pengantaran)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {sortedEmployees.map((emp, idx) => (
                                <EmployeeCard
                                    key={emp.name}
                                    employee={emp}
                                    rank={emp.rank || idx + 1}
                                    maxTotal={maxTotal}
                                    onClick={handleEmployeeClick}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Detail Modal */}
            {selectedEmployee && (
                <DetailModal
                    employee={selectedEmployee}
                    dateStart={dateStart}
                    dateEnd={dateEnd}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}

            {/* SLA Items Modal */}
            {slaCategory && (
                <SlaItemsModal
                    category={slaCategory}
                    dateStart={dateStart}
                    dateEnd={dateEnd}
                    outlet={selectedOutlet}
                    onClose={() => setSlaCategory(null)}
                />
            )}
        </main>
    );
}
