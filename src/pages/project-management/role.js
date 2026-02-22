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

export function canBoD(emp) {
    return Number(emp?.job_level_id) === 3;
}
export function canHoD(emp) {
    return Number(emp?.job_level_id) >= 2;
}