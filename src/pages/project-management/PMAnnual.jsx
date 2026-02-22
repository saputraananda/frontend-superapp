// src/pages/project-management/PMAnnual.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pmApi } from "./pmApi";
import { getEmployeeFromLocal, canBoD } from "./role";
import { useNavigate } from "react-router-dom";

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
  };
  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", colors[color]].join(" ")}>
      {children}
    </span>
  );
};

function projectIdOf(p) {
  return p?.id ?? p?.project_id ?? p?.id_project ?? p?.pm_project_id ?? p?.tr_pm_project_id ?? null;
}

export default function PMAnnual() {
  const nav = useNavigate();
  const employee = useMemo(() => getEmployeeFromLocal(), []);
  const isBoD = useMemo(() => canBoD(employee), [employee]);

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await pmApi.listProjects();
      setProjects(res?.data || []);
    } catch (e) {
      setErr(e?.message || "Gagal load annual projects");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setErr("");
    const t = title.trim();
    const d = desc.trim();
    if (!t) { setErr("Title wajib diisi."); return; }
    setSubmitting(true);
    try {
      await pmApi.createProject({ title: t, desc: d });
      setOpen(false);
      setTitle("");
      setDesc("");
      await load();
    } catch (e) {
      setErr(e?.message || "Gagal membuat annual project");
    } finally {
      setSubmitting(false);
    }
  }

  const goProject = (p) => {
    const id = projectIdOf(p);
    if (!id) { setErr("Project ID tidak ditemukan."); return; }
    nav(`${id}`);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Topbar */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-lg font-bold shadow-md">
                📋
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900 leading-none">Project Management</div>
                <div className="text-xs text-slate-500 mt-0.5">Annual Overview</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold shadow">
                {(employee?.full_name || employee?.name || "U")[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-800">{employee?.full_name || employee?.name || "User"}</div>
                <div className="text-xs text-slate-400">{employee?.job_level_name ?? "-"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge color="blue">Annual</Badge>
              <Badge color="slate">{projects.length} Projects</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Annual Projects
            </h1>
            <p className="text-slate-500 text-sm mt-2 max-w-lg">
              BoD membuat project tahunan → HoD breakdown ke semester → monthly → task harian.
            </p>
          </div>

          {isBoD ? (
            <button
              type="button"
              onClick={() => { setErr(""); setOpen(true); }}
              className="shrink-0 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-lg hover:bg-slate-700 hover:shadow-xl active:scale-95 transition-all duration-150"
            >
              <span className="text-lg leading-none">＋</span> Create Annual
            </button>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-50 ring-1 ring-slate-200 px-4 py-2 rounded-xl">
              🔒 Hanya BoD (job_level_id=3) yang bisa create annual.
            </div>
          )}
        </div>

        {err && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3">
            <span className="text-rose-500 text-lg">⚠️</span>
            <div className="text-rose-700 text-sm font-medium">{err}</div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : projects.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map((p) => {
              const id = projectIdOf(p);
              return (
                <button
                  key={id ?? JSON.stringify(p)}
                  type="button"
                  onClick={() => goProject(p)}
                  className="group text-left"
                >
                  <Card className="p-6 hover:shadow-xl hover:-translate-y-1 hover:ring-slate-300 cursor-pointer">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center text-white text-base shadow-md shrink-0">
                        📁
                      </div>
                      <Badge color="blue">Annual</Badge>
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 leading-snug group-hover:text-slate-700 transition-colors">
                      {p?.title || "—"}
                    </div>
                    <div className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {p?.desc || "Tidak ada deskripsi."}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        📅 {p?.created_at ? new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 group-hover:underline">
                        Lihat Semester →
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <div className="text-slate-700 font-semibold text-lg">Belum ada annual project</div>
            <div className="text-slate-400 text-sm mt-1">Mulai dengan membuat project tahunan pertama.</div>
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
            <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-5 flex items-center justify-between">
              <div>
                <div className="text-white font-extrabold text-lg">Create Annual Project</div>
                <div className="text-slate-300 text-xs mt-0.5">Semua HoD akan bisa lihat project ini</div>
              </div>
              <button
                type="button"
                onClick={() => { if (!submitting) setOpen(false); }}
                className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {err && (
                <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-rose-700 text-sm">
                  {err}
                </div>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Title <span className="text-rose-500">*</span></span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl bg-slate-50 px-4 text-sm text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Target 2026: Market Leader"
                  disabled={submitting}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  className="mt-1.5 min-h-[120px] w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition resize-none"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Deskripsi strategi, KPI, scope, dsb."
                  disabled={submitting}
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { if (!submitting) setOpen(false); }}
                  className="h-10 px-5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={create}
                  className="h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50 active:scale-95 transition-all shadow-md"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating...</span>
                  ) : "Create Project"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}