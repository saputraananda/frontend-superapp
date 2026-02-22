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
  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export const pmApi = {
  // Annual
  listProjects: () => http("/projects"),
  createProject: (payload) => http("/projects", { method: "POST", body: payload }),
  getProjectDetail: (projectId) => http(`/projects/${projectId}`),

  // Semester
  listSemesters: (projectId) => http(`/projects/${projectId}/semesters`),
  createSemester: (projectId, payload) =>
    http(`/projects/${projectId}/semesters`, { method: "POST", body: payload }),
  getSemesterDetail: (semesterId) => http(`/semesters/${semesterId}`), // ← pakai http() bukan fetchJson

  // Monthly
  listMonths: (semesterId) => http(`/semesters/${semesterId}/monthlies`),
  createMonth: (semesterId, payload) =>
    http(`/semesters/${semesterId}/monthlies`, { method: "POST", body: payload }),
  getMonthDetail: (monthlyId) => http(`/monthlies/${monthlyId}`),

  // Tasks
  createTask: (monthlyId, payload) =>
    http(`/monthlies/${monthlyId}/tasks`, { method: "POST", body: payload }),
  updateTask: (taskId, payload) =>
    http(`/tasks/${taskId}`, { method: "PUT", body: payload }),

  // Comments
  listComments: (taskId) => http(`/tasks/${taskId}/comments`),
  addComment: (taskId, payload) =>
    http(`/tasks/${taskId}/comments`, { method: "POST", body: payload }),

  // Evidence
  uploadEvidence(taskId, files) {
    const fd = new FormData();
    for (const file of files) fd.append("files", file);
    return fetch(`${BASE}/tasks/${taskId}/evidence`, {
      method:      "POST",
      credentials: "include",
      body:        fd,
    }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw new Error(json.message || "Upload failed");
      return json;
    });
  },

  listEvidence(taskId) {
    return fetch(`${BASE}/tasks/${taskId}/evidence`, { credentials: "include" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.message || "Fetch failed");
        return json;
      });
  },

  deleteEvidence(taskId, evidenceId) {
    return fetch(`${BASE}/tasks/${taskId}/evidence/${evidenceId}`, {
      method:      "DELETE",
      credentials: "include",
    }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw new Error(json.message || "Delete failed");
      return json;
    });
  },
};