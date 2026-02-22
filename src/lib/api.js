const API = import.meta.env.VITE_API_URL;

export const BASE_URL = API;

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
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
  const res = await fetch(`${API}${path}`, {
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
 * Build URL lengkap untuk aset statis (foto profil, KTP, dll)
 * Adaptif: dev → http://localhost:3001/assets/...
 *          prod → https://api.waschenalora.com/assets/...
 */
export function assetUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}