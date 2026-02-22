// src/pages/project-management/PMSemester.jsx
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
    purple: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  };
  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", colors[color]].join(" ")}>
      {children}
    </span>
  );
};

const semesterEmoji = (s) => s === 1 ? "🌱" : "🌿";
const semesterLabel = (s) => s === 1 ? "Jan – Jun" : "Jul – Des";

export default function PMSemester() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const employee = useMemo(() => getEmployeeFromLocal(), []);
  const isHoD = useMemo(() => canHoD(employee), [employee]);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [semester, setSemester] = useState(1);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await pmApi.getProjectDetail(projectId);
      setProject(res.project);
      setSemesters(res.semesters || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setErr("");
    if (!title.trim()) { setErr("Title wajib diisi."); return; }
    setSubmitting(true);
    try {
      await pmApi.createSemester(projectId, { semester, title, desc });
      setOpen(false);
      setTitle("");
      setDesc("");
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Topbar */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={() => nav("/projectmanagement")}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">←</span>
              <span className="hidden sm:inline">Annual</span>
            </button>

            <div className="text-sm font-extrabold text-slate-900 truncate max-w-[50%] text-center">
              {project?.title || "Project"}
            </div>

            <div className="flex items-center gap-2">
              <Badge color="purple">Semester</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge color="purple">6-Month Plan</Badge>
              <Badge color="slate">{semesters.length} Semester</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Semester Projects
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Breakdown annual project ke semester 1 & 2 untuk tracking yang lebih fokus.
            </p>
          </div>

          {isHoD ? (
            <button
              onClick={() => { setErr(""); setOpen(true); }}
              className="shrink-0 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-700 hover:shadow-xl active:scale-95 transition-all duration-150"
            >
              <span className="text-lg leading-none">＋</span> Create Semester
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : semesters.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {semesters.map((s) => (
              <button
                key={s.id}
                onClick={() => nav(`/projectmanagement/${projectId}/semester/${s.id}`)}
                className="group text-left"
              >
                <Card className="p-6 hover:shadow-xl hover:-translate-y-1 hover:ring-slate-300 cursor-pointer">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center text-xl shadow-md shrink-0">
                      {semesterEmoji(s.semester)}
                    </div>
                    <Badge color="purple">Semester {s.semester} · {semesterLabel(s.semester)}</Badge>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 group-hover:text-slate-700 transition-colors">
                    {s.title}
                  </div>
                  <div className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {s.desc || "Tidak ada deskripsi."}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      📅 Updated: {new Date(s.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 group-hover:underline">
                      Lihat Monthly →
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <div className="text-slate-700 font-semibold text-lg">Belum ada semester</div>
            <div className="text-slate-400 text-sm mt-1">HoD bisa membuat semester 1 & 2.</div>
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
            <div className="bg-gradient-to-r from-violet-700 to-violet-500 px-6 py-5 flex items-center justify-between">
              <div>
                <div className="text-white font-extrabold text-lg">Create Semester</div>
                <div className="text-violet-200 text-xs mt-0.5">Pilih semester 1 (Jan–Jun) atau 2 (Jul–Des)</div>
              </div>
              <button
                onClick={() => { if (!submitting) setOpen(false); }}
                className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >✕</button>
            </div>

            <div className="p-6 space-y-4">
              {err && (
                <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-rose-700 text-sm">{err}</div>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Semester</span>
                <select
                  className="mt-1.5 h-11 w-full rounded-xl bg-slate-50 px-4 text-sm text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-violet-400 transition"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  disabled={submitting}
                >
                  <option value={1}>🌱 Semester 1 — Jan s/d Jun</option>
                  <option value={2}>🌿 Semester 2 — Jul s/d Des</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Title <span className="text-rose-500">*</span></span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl bg-slate-50 px-4 text-sm text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Expansion 2 Outlet Baru"
                  disabled={submitting}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  className="mt-1.5 min-h-[110px] w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition resize-none"
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
                  className="h-10 px-5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50 active:scale-95 transition-all shadow-md"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating...</span>
                  ) : "Create Semester"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}