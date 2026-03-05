import { STATUS_WEIGHT } from "../constants/pmConstants";

export function computeProgress(tasks) {
  if (!tasks?.length) return 0;
  const sum = tasks.reduce((acc, t) => acc + (STATUS_WEIGHT[t.status] ?? 0), 0);
  return Math.round((sum / tasks.length) * 100);
}

export function fmtDate(str) {
  if (!str) return "—";
  const s = String(str);

  // ✅ Ambil date part saja — slice sebelum "T" agar tidak kena timezone
  const datePart = s.includes("T") ? s.slice(0, 10) : s;

  // ✅ Validasi format YYYY-MM-DD
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "—";

  const [, year, month, day] = match.map(Number);

  // ✅ new Date(year, month-1, day) = LOCAL time, tidak ada UTC shift
  const d = new Date(year, month - 1, day);

  return d.toLocaleDateString("id-ID", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

export function fmtDateTime(str) {
  if (!str) return "—";
  const s = String(str);

  // Ambil date part
  const datePart = s.includes("T") ? s.slice(0, 10) : s.slice(0, 10);
  const matchDate = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matchDate) return "—";

  const [, year, month, day] = matchDate.map(Number);

  // Ambil time part jika ada
  let hours = 0, minutes = 0;
  if (s.includes("T")) {
    const timePart = s.slice(11, 16); // "HH:MM"
    const matchTime = timePart.match(/^(\d{2}):(\d{2})$/);
    if (matchTime) {
      hours   = Number(matchTime[1]);
      minutes = Number(matchTime[2]);
    }
  } else if (s.length > 10 && s[10] === " ") {
    // Format "YYYY-MM-DD HH:MM:SS" dari MySQL
    const timePart = s.slice(11, 16);
    const matchTime = timePart.match(/^(\d{2}):(\d{2})$/);
    if (matchTime) {
      hours   = Number(matchTime[1]);
      minutes = Number(matchTime[2]);
    }
  }

  const d = new Date(year, month - 1, day, hours, minutes);

  // Relative time: jika < 24 jam → tampilkan "X jam lalu" / "X menit lalu"
  const now  = new Date();
  const diff = now - d; // ms
  const diffMin  = Math.floor(diff / 60000);
  const diffHour = Math.floor(diff / 3600000);
  const diffDay  = Math.floor(diff / 86400000);

  if (diff < 0) {
    // Future (edge case)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }
  if (diffMin < 1)   return "Baru saja";
  if (diffMin < 60)  return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) return `Kemarin, ${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`;
  if (diffDay < 7) {
    const dayName = d.toLocaleDateString("id-ID", { weekday: "long" });
    return `${dayName}, ${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`;
  }

  // Lebih dari seminggu → tanggal + jam
  const tgl = d.toLocaleDateString("id-ID", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
  return `${tgl}, ${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`;
}

export function toDateInput(val) {
  if (!val) return "";
  const s = String(val);

  // ✅ Sudah YYYY-MM-DD → langsung return
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ✅ Ada T (ISO string) → slice saja, JANGAN new Date()
  if (s.includes("T")) return s.slice(0, 10);

  // ✅ Fallback pakai UTC agar tidak -1 hari
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return [
      d.getUTCFullYear(),
      String(d.getUTCMonth() + 1).padStart(2, "0"),
      String(d.getUTCDate()).padStart(2, "0"),
    ].join("-");
  } catch { return ""; }
}

export function isOverdue(enddate, status) {
  if (!enddate) return false;
  if (["completed", "approved"].includes(status)) return false;

  // ✅ Parse manual agar tidak kena timezone shift
  const s = String(enddate);
  const datePart = s.includes("T") ? s.slice(0, 10) : s;
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const end   = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return end < today;
}

export function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function isImage(fileType, fileName) {
  if (fileType?.startsWith("image/")) return true;
  const ext = fileName?.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
}

export function isPdf(fileType, fileName) {
  if (fileType === "application/pdf") return true;
  return fileName?.toLowerCase().endsWith(".pdf");
}

export function fileIcon(fileType, fileName) {
  if (isImage(fileType, fileName)) return "IMG";
  if (isPdf(fileType, fileName)) return "PDF";
  if (fileType?.includes("spreadsheet") || fileName?.match(/\.xlsx?$/i)) return "XLS";
  if (fileType?.includes("word") || fileName?.match(/\.docx?$/i)) return "DOC";
  if (fileType?.includes("zip") || fileName?.match(/\.(zip|rar|7z)$/i)) return "ZIP";
  return "FILE";
}