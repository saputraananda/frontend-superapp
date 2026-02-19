import React, { useMemo, useState } from "react";

const STATUS = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
];

const PRIORITY = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

const statusLabel = (s) => {
  switch (s) {
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In Progress";
    case "on_hold":
      return "On Hold";
    case "submitted_for_review":
      return "Submitted for Review";
    case "revision_required":
      return "Revision Required";
    case "approved":
      return "Approved";
    case "completed":
      return "Completed";
    default:
      return s;
  }
};

const statusPill = (s) => {
  switch (s) {
    case "assigned":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    case "in_progress":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    case "on_hold":
      return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
    case "submitted_for_review":
      return "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200";
    case "revision_required":
      return "bg-rose-50 text-rose-800 ring-1 ring-rose-200";
    case "approved":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
    case "completed":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
};

const priorityPill = (p) => {
  switch (p) {
    case "critical":
      return "bg-rose-500 text-white";
    case "medium":
      return "bg-amber-400 text-white";
    case "low":
      return "bg-emerald-500 text-white";
    default:
      return "bg-slate-200 text-slate-700";
  }
};

const initials = (name) =>
  String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const ProgressBar = ({ value = 0 }) => {
  const v = clamp(Number(value) || 0, 0, 100);
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-slate-100 ring-1 ring-slate-200 overflow-hidden">
        <div className="h-full bg-slate-900/80" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
};

const Avatar = ({ name, size = "sm" }) => {
  const cls =
    size === "lg"
      ? "h-10 w-10 text-sm"
      : size === "md"
        ? "h-8 w-8 text-xs"
        : "h-7 w-7 text-xs";
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-slate-200 to-slate-50 ring-1 ring-slate-200 flex items-center justify-center font-semibold text-slate-700`}
      title={name}
    >
      {initials(name)}
    </div>
  );
};

const Segmented = ({ items, value, onChange }) => (
  <div className="inline-flex rounded-xl bg-white ring-1 ring-slate-200 p-1 shadow-sm">
    {items.map((it) => {
      const active = it.key === value;
      return (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={[
            "px-3 py-1.5 rounded-lg text-sm font-medium transition",
            active
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
          ].join(" ")}
        >
          {it.label}
        </button>
      );
    })}
  </div>
);

const Select = ({ value, onChange, options, label }) => (
  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
    <span className="hidden sm:inline">{label}:</span>
    <select
      className="h-10 rounded-xl bg-white px-3 text-sm text-slate-700 ring-1 ring-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-slate-300"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

const Tag = ({ children, className = "" }) => (
  <span
    className={[
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
      className,
    ].join(" ")}
  >
    {children}
  </span>
);

const Card = ({ children, className = "" }) => (
  <div className={["rounded-2xl bg-white shadow-sm ring-1 ring-slate-200", className].join(" ")}>
    {children}
  </div>
);

const Divider = () => <div className="h-px w-full bg-slate-100" />;

function computeMonthlyProgress(tasks) {
  if (!tasks?.length) return 0;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

function isDueWithinDays(dateISO, days) {
  if (!dateISO) return false;
  const now = new Date();
  const due = new Date(dateISO);
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

function isOverdue(dateISO) {
  if (!dateISO) return false;
  const now = new Date();
  const due = new Date(dateISO);
  return due < now;
}

export default function ProjectManagement() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [picFilter, setPicFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("t3");

  const project = {
    annual: { title: "Meningkatkan Profit 25%", owner: "BoD" },
    sixMonth: { title: "Expansion 2 Outlet Baru", owner: "HoD BDSM" },
    monthly: {
      title: "Finalisasi Lokasi & Persiapan Outlet 1",
      timeline: "Mar 1 - Mar 31",
      progress: 45,
      owner: "Mba Nizar",
    },
  };

  const tasks = [
    {
      id: "t1",
      title: "Survey & Analisis 3 Lokasi Kandidat",
      priority: "critical",
      status: "in_progress",
      progress: 60,
      due: "2026-03-15",
      pic: "Mba Diana",
      copic: null,
      comments: 2,
      lastUpdate: "2026-03-12",
      needsApproval: false,
      description:
        "Kumpulkan data traffic, kompetitor, biaya sewa, dan proyeksi ROI untuk 3 kandidat lokasi.",
      evidence: ["https://docs.google.com/.../analisis-lokasi"],
      thread: [
        { by: "Mba Diana", at: "Mar 12, 10:15", text: "Sudah shortlist 3 lokasi, sedang validasi biaya sewa." },
        { by: "Mba Nizar", at: "Mar 12, 10:20", text: "Pastikan ada data foot traffic weekend juga ya." },
      ],
    },
    {
      id: "t2",
      title: "Planning Kebutuhan Manpower",
      priority: "medium",
      status: "submitted_for_review",
      progress: 90,
      due: "2026-03-18",
      pic: "Mba Cindy",
      copic: "Mba Salma",
      comments: 3,
      lastUpdate: "2026-03-10",
      needsApproval: false,
      description:
        "Mapping kebutuhan posisi outlet baru dan rencana rekrutmen. Sertakan estimasi biaya payroll.",
      evidence: ["https://docs.google.com/.../manpower-plan"],
      thread: [
        { by: "Mba Salma", at: "Mar 10, 09:02", text: "Draft kebutuhan posisi sudah dibuat, tinggal review." },
        { by: "Mba Cindy", at: "Mar 10, 09:10", text: "Aku submit untuk review ya." },
        { by: "Mba Nizar", at: "Mar 10, 09:40", text: "Oke, nanti aku cek siang." },
      ],
    },
    {
      id: "t3",
      title: "Bikin Draft Job Desc",
      priority: "low",
      status: "assigned",
      progress: 0,
      due: "2026-03-15",
      pic: "Mba Salma",
      copic: null,
      comments: 2,
      lastUpdate: "2026-03-05",
      needsApproval: true,
      approvalBy: "Mba Nizar",
      description:
        "Buat draft job description untuk posisi outlet baru (kasir, staff operasional, supervisor).",
      evidence: [],
      thread: [
        { by: "Mba Salma", at: "Mar 5, 10:15", text: "I have created an initial draft. Please review. @Mba Nizar" },
        { by: "Mba Nizar", at: "Mar 5, 10:17", text: "OK, I'll review it and let you know soon." },
      ],
    },
  ];

  const people = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.pic) set.add(t.pic);
      if (t.copic) set.add(t.copic);
    });
    const arr = Array.from(set).sort();
    return [{ key: "all", label: "All" }, ...arr.map((p) => ({ key: p, label: p }))];
  }, [tasks]);

  const monthlyProgress = useMemo(() => {
    return computeMonthlyProgress(tasks);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
      .filter((t) => (priorityFilter === "all" ? true : t.priority === priorityFilter))
      .filter((t) =>
        picFilter === "all" ? true : t.pic === picFilter || t.copic === picFilter
      )
      .filter((t) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.pic?.toLowerCase().includes(q) ||
          t.copic?.toLowerCase().includes(q)
        );
      });
  }, [tasks, statusFilter, priorityFilter, picFilter, query]);

  const selected = useMemo(
    () => tasks.find((t) => t.id === selectedId) || tasks[0],
    [tasks, selectedId]
  );

  const workload = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "completed").length;
    const overdue = tasks.filter((t) => isOverdue(t.due) && t.status !== "completed").length;
    const dueThisWeek = tasks.filter((t) => isDueWithinDays(t.due, 7) && t.status !== "completed").length;

    const score = active + overdue * 2 + dueThisWeek;
    const level = score >= 10 ? "HIGH" : score >= 6 ? "MEDIUM" : "LOW";

    return { active, overdue, dueThisWeek, level };
  }, [tasks]);

  const levelPill = useMemo(() => {
    if (workload.level === "HIGH") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    if (workload.level === "MEDIUM") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  }, [workload.level]);

  const topbar = (
    <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-white/80" />
            </div>
            <div className="text-white font-semibold">Meningkatkan Profit 25%</div>
            <div className="hidden md:flex items-center gap-2 text-white/70 text-sm">
              <span className="mx-1">›</span>
              <span>{project.sixMonth.title}</span>
              <span className="mx-1">›</span>
              <span className="text-white/90">{project.monthly.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar name="Ananda" size="md" />
              <button className="h-10 px-3 rounded-xl bg-white/10 ring-1 ring-white/10 text-white/90 text-sm hover:bg-white/15 transition">
                ▾
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {topbar}

      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {project.monthly.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold text-slate-900">Progress:</span>
                <span className="font-semibold text-slate-900">{monthlyProgress}%</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold text-slate-900">Timeline:</span>
                <span>{project.monthly.timeline}</span>
              </span>
            </div>
            <div className="max-w-xl">
              <ProgressBar value={monthlyProgress} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="p-5">
              <div className="text-sm font-semibold text-slate-900 mb-4">Overview</div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-slate-500">Annual Project:</div>
                  <div className="font-semibold text-slate-900">{project.annual.title}</div>
                </div>
                <Divider />
                <div>
                  <div className="text-slate-500">6-Month Project:</div>
                  <div className="font-semibold text-slate-900">{project.sixMonth.title}</div>
                </div>
                <Divider />
                <div>
                  <div className="text-slate-500">Monthly Project:</div>
                  <div className="font-semibold text-slate-900">{project.monthly.title}</div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-slate-900">Workload Summary</div>
                <Tag className={levelPill}>{workload.level}</Tag>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                  <div className="text-xs text-slate-500">Active Tasks</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">{workload.active}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                  <div className="text-xs text-slate-500">Overdue</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">{workload.overdue}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 col-span-2">
                  <div className="text-xs text-slate-500">Due This Week</div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">{workload.dueThisWeek}</div>
                    <div className="text-xs text-slate-500">≤ 7 hari</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Center + Right */}
          <div className="lg:col-span-9 grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Task list */}
            <div className="xl:col-span-7 space-y-4">
              {/* Controls */}
              <Card className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Segmented items={STATUS} value={statusFilter} onChange={setStatusFilter} />

                    <div className="flex flex-wrap items-center gap-3">
                      <Select
                        label="Priority"
                        value={priorityFilter}
                        onChange={setPriorityFilter}
                        options={PRIORITY}
                      />
                      <Select
                        label="PIC"
                        value={picFilter}
                        onChange={setPicFilter}
                        options={people}
                      />
                      <button className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-sm hover:bg-slate-800 transition inline-flex items-center gap-2">
                        <span className="text-base leading-none">＋</span> Add Task
                      </button>
                      <button className="h-10 w-10 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm hover:bg-slate-50 transition">
                        ⚙️
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search task, PIC..."
                      className="h-11 w-full rounded-xl bg-white pl-10 pr-4 text-sm text-slate-700 ring-1 ring-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</div>
                  </div>
                </div>
              </Card>

              {/* List */}
              <div className="space-y-4">
                {filteredTasks.map((t) => {
                  const active = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={[
                        "w-full text-left transition",
                        active ? "scale-[1.01]" : "hover:scale-[1.005]",
                      ].join(" ")}
                    >
                      <Card className={["p-5", active ? "ring-2 ring-slate-300" : ""].join(" ")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-lg bg-slate-900/10 ring-1 ring-slate-200 flex items-center justify-center text-slate-700 text-xs">
                                ✓
                              </div>
                              <div className="font-bold text-slate-900 truncate">{t.title}</div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Avatar name={t.pic} />
                                <span className="font-semibold text-slate-700">PIC:</span>
                                <span className="font-semibold text-slate-900">{t.pic}</span>
                              </div>
                              {t.copic ? (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500">
                                    Co-PIC: <span className="font-semibold text-slate-900">{t.copic}</span>
                                  </span>
                                </>
                              ) : null}
                            </div>

                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                <span>{statusLabel(t.status)}:</span>
                                <span className="font-semibold text-slate-700">{t.progress}%</span>
                              </div>
                              <ProgressBar value={t.progress} />
                            </div>

                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                              <span>{t.comments} comments</span>
                              <span className="text-slate-300">|</span>
                              <span>Last Update: {new Date(t.lastUpdate).toLocaleDateString()}</span>
                              <span className="text-slate-300">|</span>
                              <span>Due: {new Date(t.due).toLocaleDateString()}</span>
                            </div>

                            {t.needsApproval ? (
                              <div className="mt-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-sm text-rose-800 flex items-center gap-2">
                                <span>⚠️</span>
                                <span>
                                  Waiting for Approval by <span className="font-semibold">{t.approvalBy}</span>
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Tag className={priorityPill(t.priority)}>{statusLabel(t.priority)}</Tag>
                            <Tag className={statusPill(t.status)}>{statusLabel(t.status)}</Tag>
                          </div>
                        </div>
                      </Card>
                    </button>
                  );
                })}

                {!filteredTasks.length ? (
                  <Card className="p-8">
                    <div className="text-center text-slate-600">
                      Tidak ada task yang match filter/search.
                    </div>
                  </Card>
                ) : null}
              </div>

              {/* Bottom progress card */}
              <Card className="p-5">
                <div className="text-sm font-semibold text-slate-900">Project Progress</div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <span>
                    Monthly Progress: <span className="font-semibold text-slate-900">{monthlyProgress}%</span>
                  </span>
                  <span className="text-xs text-slate-500">Cascading to 6-Month & Annual</span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={monthlyProgress} />
                </div>
              </Card>
            </div>

            {/* Details panel */}
            <div className="xl:col-span-5">
              <Card className="p-5 sticky top-24">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold text-slate-900 truncate">
                      {selected?.title}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tag className={priorityPill(selected?.priority)}>{statusLabel(selected?.priority)}</Tag>
                      <Tag className={statusPill(selected?.status)}>{statusLabel(selected?.status)}</Tag>
                    </div>
                  </div>
                  <button className="h-10 w-10 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm hover:bg-slate-50 transition">
                    ⋯
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                    <div className="text-xs text-slate-500">Priority</div>
                    <div className="mt-1 font-bold text-slate-900">
                      {statusLabel(selected?.priority)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                    <div className="text-xs text-slate-500">Status</div>
                    <div className="mt-1 font-bold text-slate-900">
                      {statusLabel(selected?.status)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                    <div className="text-xs text-slate-500">PIC</div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="font-bold text-slate-900">{selected?.pic}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                    <div className="text-xs text-slate-500">Due Date</div>
                    <div className="mt-1 font-bold text-slate-900">
                      {selected?.due ? new Date(selected.due).toLocaleDateString() : "-"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white ring-1 ring-slate-200 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>
                      Progress: <span className="font-semibold text-slate-900">{selected?.progress ?? 0}%</span>
                    </span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={selected?.progress ?? 0} />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-900">Description</div>
                  <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {selected?.description || "-"}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-900">Attachment / Evidence</div>
                  <div className="mt-2 space-y-2">
                    {(selected?.evidence || []).length ? (
                      selected.evidence.map((e, idx) => (
                        <a
                          key={idx}
                          href={e}
                          className="block rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                        >
                          {e}
                        </a>
                      ))
                    ) : (
                      <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-sm text-slate-500">
                        No attachment yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold text-slate-900">Comments</div>
                  <div className="mt-3 space-y-3">
                    {(selected?.thread || []).map((c, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Avatar name={c.by} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-900 text-sm">{c.by}</div>
                            <div className="text-xs text-slate-400">{c.at}</div>
                          </div>
                          <div className="mt-1 text-sm text-slate-600">{c.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-2 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2 shadow-sm">
                      <span className="text-slate-400">💬</span>
                      <input
                        className="h-10 w-full outline-none text-sm text-slate-700"
                        placeholder="Write a comment... @mention"
                      />
                      <button className="h-10 px-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition">
                        Send
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Mentions akan mengirim notifikasi ke user terkait.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-slate-400">
          UI mock — data masih statis. Bisa lanjut ke versi CRUD + role-based access kalau Anda mau.
        </div>
      </div>
    </div>
  );
}