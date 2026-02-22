// src/pages/project-management/PMMonthly.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pmApi } from "./pmApi";
import { getEmployeeFromLocal, canHoD } from "./role";
import { useNavigate, useParams } from "react-router-dom";

const Card = ({ children, className = "", ...props }) => (
    <div
        className={["rounded-2xl bg-white shadow-md ring-1 ring-slate-100 transition-all duration-200", className].join(" ")}
        {...props}
    >
        {children}
    </div>
);

const Badge = ({ children, color = "slate" }) => {
    const colors = {
        slate: "bg-slate-100 text-slate-700",
        blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
        green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        orange: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    };
    return (
        <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", colors[color]].join(" ")}>
            {children}
        </span>
    );
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const monthName = (m) => MONTH_NAMES[Number(m) - 1] || `M${m}`;

const MONTH_COLORS = [
    "from-rose-500 to-rose-400",
    "from-orange-500 to-orange-400",
    "from-amber-500 to-amber-400",
    "from-lime-600 to-lime-500",
    "from-emerald-600 to-emerald-500",
    "from-teal-600 to-teal-500",
    "from-cyan-600 to-cyan-500",
    "from-sky-600 to-sky-500",
    "from-blue-600 to-blue-500",
    "from-violet-600 to-violet-500",
    "from-purple-600 to-purple-500",
    "from-pink-600 to-pink-500",
];
const monthColor = (m) => MONTH_COLORS[(Number(m) - 1) % 12];

function monthIdOf(x) {
    return x?.id ?? x?.monthly_id ?? x?.id_monthly ?? x?.id_montlhy ?? null;
}

export default function PMMonthly() {
    const { projectId, semesterId } = useParams();
    const nav = useNavigate();

    const employee = useMemo(() => getEmployeeFromLocal(), []);
    const isHoD = useMemo(() => canHoD(employee), [employee]);

    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState([]);
    const [semesterData, setSemesterData] = useState(null); // ← tambah ini
    const [err, setErr] = useState("");

    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(1);
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function load() {
        setErr("");
        setLoading(true);
        try {
            const [semRes, monthRes] = await Promise.all([
                pmApi.getSemesterDetail(semesterId),
                pmApi.listMonths(semesterId),
            ]);
            setSemesterData(semRes?.data || null); // ← simpan semester data
            setMonths(monthRes?.data || []);
        } catch (e) {
            setErr(e?.message || "Gagal load monthly");
        } finally {
            setLoading(false);
        }
    }

    async function create() {
        setErr("");
        const t = title.trim();
        const d = desc.trim();
        if (!t) return setErr("Title wajib diisi.");
        if (!semesterId) return setErr("semesterId tidak ditemukan dari URL.");
        setSubmitting(true);
        try {
            await pmApi.createMonth(semesterId, { projectId, month, title: t, desc: d });
            setOpen(false);
            setTitle("");
            setDesc("");
            await load();
        } catch (e) {
            setErr(e?.message || "Gagal membuat monthly");
        } finally {
            setSubmitting(false);
        }
    }

    const goBoard = (m) => {
        const id = monthIdOf(m);
        if (!id) { setErr("Monthly ID tidak ditemukan."); return; }
        nav(`/projectmanagement/month/${id}`, {
            state: { projectId, semesterId }
        });
    };

    useEffect(() => { load(); }, [semesterId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Topbar */}
            <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <button
                            type="button"
                            onClick={() => nav(`/projectmanagement/${projectId}`)}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <span className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">←</span>
                            <span className="hidden sm:inline">Semesters</span>
                        </button>

                        <div className="text-sm font-extrabold text-slate-900">Monthly Projects</div>

                        <div className="flex items-center gap-2">
                            {/* semesterData.semester = 1 atau 2, bukan id row */}
                            <Badge color="orange">
                                Semester {semesterData?.semester ?? "—"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
                {/* Hero */}
                <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge color="orange">Monthly</Badge>
                            <Badge color="slate">{months.length} Bulan</Badge>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Monthly List
                        </h1>
                        <p className="text-slate-500 text-sm mt-2">
                            Klik setiap bulan untuk masuk ke board tasks &amp; progress tracking.
                        </p>
                    </div>

                    {isHoD ? (
                        <button
                            type="button"
                            onClick={() => { setErr(""); setOpen(true); }}
                            className="shrink-0 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-700 hover:shadow-xl active:scale-95 transition-all duration-150"
                        >
                            <span className="text-lg leading-none">＋</span> Create Monthly
                        </button>
                    ) : (
                        <div className="text-xs text-slate-400 bg-slate-50 ring-1 ring-slate-200 px-4 py-2 rounded-xl">
                            🔒 Hanya HoD+ (job_level_id ≥ 2).
                        </div>
                    )}
                </div>

                {err && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3">
                        <span className="text-rose-500 text-lg">⚠️</span>
                        <div className="text-rose-700 text-sm font-medium">{err}</div>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : months.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {months.map((m) => {
                            const id = monthIdOf(m);
                            return (
                                <button
                                    key={id ?? JSON.stringify(m)}
                                    type="button"
                                    onClick={() => goBoard(m)}
                                    className="group text-left"
                                >
                                    <Card className="overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:ring-slate-300 cursor-pointer">
                                        {/* Color bar header */}
                                        <div className={`h-2 w-full bg-gradient-to-r ${monthColor(m.month)}`} />
                                        <div className="p-6">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${monthColor(m.month)} flex items-center justify-center text-white text-sm font-extrabold shadow-md shrink-0`}>
                                                    {monthName(m.month)}
                                                </div>
                                                <Badge color="orange">Bulan {m.month}</Badge>
                                            </div>
                                            <div className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-slate-700 transition-colors">
                                                {m.title || "—"}
                                            </div>
                                            <div className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                                {m.desc || "Tidak ada deskripsi."}
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <div className="text-xs text-slate-400">
                                                    🗓 {monthName(m.month)} • Semester {semesterData?.semester ?? "—"}
                                                </div>
                                                <div className="text-xs font-semibold text-slate-900 group-hover:underline">
                                                    Buka Board →
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="p-12 text-center">
                        <div className="text-5xl mb-4">📅</div>
                        <div className="text-slate-700 font-semibold text-lg">Belum ada monthly</div>
                        <div className="text-slate-400 text-sm mt-1">HoD bisa membuat monthly project di sini.</div>
                    </Card>
                )}
            </div>

            {/* Modal */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => { if (!submitting) setOpen(false); }}
                >
                    <div
                        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-5 flex items-center justify-between">
                            <div>
                                <div className="text-white font-extrabold text-lg">Create Monthly</div>
                                <div className="text-orange-100 text-xs mt-0.5">Pilih bulan dan isi detail project</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { if (!submitting) setOpen(false); }}
                                className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                            >✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            {err && (
                                <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-rose-700 text-sm">{err}</div>
                            )}

                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Bulan</span>
                                <select
                                    className="mt-1.5 h-11 w-full rounded-xl bg-slate-50 px-4 text-sm text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-400 transition"
                                    value={month}
                                    onChange={(e) => setMonth(Number(e.target.value))}
                                    disabled={submitting}
                                >
                                    {MONTH_NAMES.map((name, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} — {name}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Title <span className="text-rose-500">*</span></span>
                                <input
                                    className="mt-1.5 h-11 w-full rounded-xl bg-slate-50 px-4 text-sm text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Finalisasi Lokasi & Persiapan Outlet 1"
                                    disabled={submitting}
                                />
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Description</span>
                                <textarea
                                    className="mt-1.5 min-h-[110px] w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition resize-none"
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    disabled={submitting}
                                />
                            </label>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { if (!submitting) setOpen(false); }}
                                    className="h-10 px-5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
                                    disabled={submitting}
                                >Batal</button>
                                <button
                                    type="button"
                                    onClick={create}
                                    className="h-10 px-5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50 active:scale-95 transition-all shadow-md"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating...
                                        </span>
                                    ) : "Create Monthly"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}