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
// 2 = Supervisor → bisa semester, monthly, task, set assignees
// 3 = Staff      → hanya bisa buat task (self PIC only)

/** Hanya Direktur (job_level_id = 1) */
export function canDirektur(emp) {
  return Number(emp?.job_level_id) === 1;
}

/** Direktur & Supervisor (job_level_id = 1 atau 2) */
export function canSupervisorUp(emp) {
  return Number(emp?.job_level_id) <= 2;
}

/** Semua level termasuk Staff (job_level_id = 1, 2, atau 3) */
export function canStaffUp(emp) {
  return Number(emp?.job_level_id) <= 3;
}

// ── Alias agar tidak perlu ubah semua tempat yang sudah pakai canBoD/canHoD ──
/** @deprecated Gunakan canDirektur() */
export const canBoD = canDirektur;

/** @deprecated Gunakan canSupervisorUp() */
export const canHoD = canSupervisorUp;