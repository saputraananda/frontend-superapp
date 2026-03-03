const API = import.meta.env.VITE_API_URL;

// rapikan: hilangkan trailing slash supaya konsisten
export const BASE_URL = (API || "").replace(/\/$/, "");

export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Network error" }));
    throw new Error(err.message || "Request failed");
  }

  return res.json();
}

/**
 * Fetch tanpa Content-Type — untuk FormData/upload file
 */
export async function apiUpload(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    // Jangan set Content-Type agar browser otomatis isi boundary FormData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Network error" }));
    throw new Error(err.message || "Request failed");
  }

  return res.json();
}

/**
 * Build URL lengkap untuk aset statis
 *
 * Bisa menerima:
 * - full url: "https://...."
 * - absolute path: "/assets/avatars/x.jpg"
 * - relative path: "assets/avatars/x.jpg" atau "avatars/x.jpg"
 */
export function assetUrl(p) {
  if (!p) return null;

  // kalau sudah full url
  if (/^https?:\/\//i.test(p)) return p;

  // normalize: hilangkan leading slash supaya gampang digabung
  let clean = String(p).replace(/^\/+/, "");

  // kalau backend cuma ngirim "avatars/xxx.jpg" → anggap itu di bawah /assets
  if (!clean.startsWith("assets/")) {
    clean = `assets/${clean}`;
  }

  return `${BASE_URL}/${clean}`;
}