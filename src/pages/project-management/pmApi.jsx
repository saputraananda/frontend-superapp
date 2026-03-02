// src/pages/project-management/pmApi.js

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const BASE = `${API_URL}/api/pm`;

async function http(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request gagal");
  return data;
}

export const pmApi = {
  // ── Projects ──────────────────────────────────────────────────────────────
  listProjects:     ()                    => http("/projects"),
  createProject:    (p)                   => http("/projects",            { method: "POST",   body: p }),
  getProjectDetail: (projectId)           => http(`/projects/${projectId}`),
  updateProject:    (projectId, p)        => http(`/projects/${projectId}`, { method: "PUT",    body: p }),
  deleteProject:    (projectId)           => http(`/projects/${projectId}`, { method: "DELETE" }),

  // ── Semesters ─────────────────────────────────────────────────────────────
  listSemesters:    (projectId)           => http(`/projects/${projectId}/semesters`),
  createSemester:   (projectId, p)        => http(`/projects/${projectId}/semesters`, { method: "POST", body: p }),
  getSemesterDetail:(semesterId)          => http(`/semesters/${semesterId}`),
  updateSemester:   (semesterId, p)       => http(`/semesters/${semesterId}`, { method: "PUT",    body: p }),
  deleteSemester:   (semesterId)          => http(`/semesters/${semesterId}`, { method: "DELETE" }),

  // ── Monthly ───────────────────────────────────────────────────────────────
  listMonths:       (semesterId)          => http(`/semesters/${semesterId}/monthlies`),
  createMonth:      (semesterId, p)       => http(`/semesters/${semesterId}/monthlies`, { method: "POST", body: p }),
  getMonthDetail:   (monthlyId)           => http(`/monthlies/${monthlyId}`),
  updateMonth:      (monthlyId, p)        => http(`/monthlies/${monthlyId}`, { method: "PUT",    body: p }),
  deleteMonth:      (monthlyId)           => http(`/monthlies/${monthlyId}`, { method: "DELETE" }),

  // ── Tasks ─────────────────────────────────────────────────────────────────
  listTasks:        (monthlyId)           => http(`/monthlies/${monthlyId}/tasks`),
  createTask:       (monthlyId, p)        => http(`/monthlies/${monthlyId}/tasks`, { method: "POST", body: p }),
  updateTask:       (taskId, p)           => http(`/tasks/${taskId}`,              { method: "PUT",  body: p }),
  deleteTask:       (taskId)              => http(`/tasks/${taskId}`,              { method: "DELETE" }),

  // ── Comments ──────────────────────────────────────────────────────────────
  listComments:     (taskId)              => http(`/tasks/${taskId}/comments`),
  addComment:       (taskId, p)           => http(`/tasks/${taskId}/comments`, { method: "POST", body: p }),

  // ── Evidence / Attachments ────────────────────────────────────────────────
  uploadEvidence: async (taskId, files) => {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    const res = await fetch(`${BASE}/tasks/${taskId}/evidence`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Upload gagal");
    return data;
  },
  deleteEvidence: (taskId, evidenceId) => http(`/evidence/${evidenceId}`, { method: "DELETE" }),

  // ── Employees ─────────────────────────────────────────────────────────────
  listEmployees:    ()                    => http("/employees"),

  // ── Notifikasi ────────────────────────────────────────────────────────────
  listNotifications:  ()                  => http("/notifications"),
  markNotifRead:      (notifId)           => http(`/notifications/${notifId}/read`, { method: "PATCH" }),
  markAllNotifRead:   ()                  => http("/notifications/read-all",        { method: "PATCH" }),
};