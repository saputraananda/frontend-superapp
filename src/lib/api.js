const API = "http://localhost:3001";

export async function api(path, options = {}) {
  const res = await fetch(`http://localhost:3001${path}`, {
    ...options,
    credentials: "include", // ← wajib agar cookie session terkirim
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