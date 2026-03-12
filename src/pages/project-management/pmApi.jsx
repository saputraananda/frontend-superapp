// src/pages/project-management/pmApi.js

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const BASE = `${API_URL}/api/pm`;

async function http(path, { method = "GET", body } = {}) {
  const opts = {
    method,
    credentials: "include",
    headers: {},
  };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res  = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
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
  listEvidence: (taskId) => http(`/tasks/${taskId}/evidence`), // ← tambah ini

  uploadEvidence: async (taskId, files) => {
    const fd = new FormData();
    for (const f of Array.from(files)) {
      fd.append("files", f);
    }
    const res = await fetch(`${API_URL}/api/pm/tasks/${taskId}/evidence`, {
      method: "POST",
      credentials: "include",
      // ← JANGAN set Content-Type
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Upload gagal");
    return data;
  },

  // ← fix: hanya butuh evidenceId, tidak butuh taskId
  deleteEvidence: (evidenceId) =>
    http(`/evidence/${evidenceId}`, { method: "DELETE" }),

  // ── Employees ─────────────────────────────────────────────────────────────
  listEmployees:    ()                    => http("/employees"),

  // ── Notifikasi ────────────────────────────────────────────────────────────
  listNotifications:  ()                  => http("/notifications"),
  markNotifRead:      (notifId)           => http(`/notifications/${notifId}/read`, { method: "PATCH" }),
  markAllNotifRead:   ()                  => http("/notifications/read-all",        { method: "PATCH" }),
  deleteNotif:        (notifId)           => http(`/notifications/${notifId}`,      { method: "DELETE" }),
  deleteAllNotif:     ()                  => http("/notifications",                 { method: "DELETE" }),
  listCompanies: () => http("/companies"),
};