// src/pages/project-management/role.js
export function getEmployeeFromLocal() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.employee || null;
  } catch {
    return null;
  }
}

// ── Job Level Constants (sesuai DB) ──────────────────────────────────────────
// 1 = Direktur  → bisa semua
// 2 = Manager   → bisa semester, monthly, task, set assignees
// 3 = Supervisor → bisa semester, monthly, task, set assignees
// 4 = Staff      → hanya bisa buat task (self PIC only)

/** Hanya Direktur (job_level_id = 1) */
export function canDirektur(emp) {
  return Number(emp?.job_level_id) === 1;
}

/** Direktur, Manager, Supervisor (job_level_id = 1, 2, 3) */
export function canSupervisorUp(emp) {
  const level = emp?.job_level_id;
  if (level == null) return false;
  return Number(level) <= 3;
}

/** Semua level termasuk Staff (job_level_id = 1, 2, 3, atau 4) */
export function canStaffUp(emp) {
  const level = emp?.job_level_id;
  if (level == null) return false;
  return Number(level) <= 4;
}

export function getJobLevelLabel(emp) {
  const name = emp?.job_level_name?.trim();
  if (name) return name;
  const level = Number(emp?.job_level_id);
  if (Number.isNaN(level)) return "Staff";
  if (level === 1) return "Direktur";
  if (level === 2) return "Manager";
  if (level === 3) return "Supervisor";
  if (level === 4) return "Staff";
  return "Staff";
}

// ── Alias agar tidak perlu ubah semua tempat yang sudah pakai canBoD/canHoD ──
/** @deprecated Gunakan canDirektur() */
export const canBoD = canDirektur;

/** @deprecated Gunakan canSupervisorUp() */
export const canHoD = canSupervisorUp;