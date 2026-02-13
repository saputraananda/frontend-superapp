import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export default function Portal({ user, onLogout }) {
  const [apps, setApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("populer");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);

  useEffect(() => {
    document.title = "Portal | Alora Group Indonesia";
    api("/apps").then((d) => setApps(d.apps || []));

    // Pisahkan pembacaan localStorage ke fungsi tersendiri
    function loadEmployeeData() {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return;

      const parsed = JSON.parse(storedUser);
      const user = parsed.user ?? parsed;

      setEmployeeData(user.employee ?? null);
    }
    loadEmployeeData();
  }, []);

  const filteredApps = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return apps.filter((a) => a.name.toLowerCase().includes(q));
  }, [apps, searchQuery]);

  const statusUI = (is_active) => {
    return is_active === 1
      ? "text-emerald-700 bg-emerald-100/70"
      : "text-rose-700 bg-rose-100/70";
  };

  const statusText = (is_active) => {
    return is_active === 1 ? "Aktif" : "Perbaikan";
  };

  // Format jabatan dari job_level + position
  const getJobTitle = () => {
    if (!employeeData) return "Employee";

    const jobLevel = employeeData.job_level_name?.trim() || "";
    const position = employeeData.position_name?.trim() || "";

    return jobLevel && position
      ? `${jobLevel} ${position}`
      : jobLevel || position || "Employee";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <img src="/alora.png" alt="Alora Group Indonesia" className="h-16 lg:h-20" />
              <div>
                <h1 className="text-base lg:text-lg font-bold text-slate-800">
                  Alora Group Indonesia
                </h1>
                <p className="text-xs text-slate-500">
                  Semua layanan dalam satu dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">
                  Halo, {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-500">{getJobTitle()}</p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-11 w-11 rounded-full border border-white shadow-md transition hover:scale-105"
                >
                  <img
                    src={
                      user?.avatar ||
                      "https://ui-avatars.com/api/?name=" + (user?.name || "U")
                    }
                    alt="Avatar"
                    className="h-full w-full rounded-full"
                  />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-xl z-30">
                    <a
                      href="/profile"
                      className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-purple-50 rounded-t-xl"
                    >
                      👤 Lihat Profil
                    </a>
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-b-xl"
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <img src="/alora.png" alt="Alora Group Indonesia" className="h-12" />
              <div>
                <h1 className="text-sm font-bold text-slate-800">
                  Alora Group
                </h1>
                <p className="text-xs text-slate-500">Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="h-10 w-10 rounded-full border border-white shadow-md"
              >
                <img
                  src={
                    user?.avatar ||
                    "https://ui-avatars.com/api/?name=" + (user?.name || "U")
                  }
                  alt="Avatar"
                  className="h-full w-full rounded-full"
                />
              </button>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/70 border border-white shadow-md"
              >
                <svg
                  className="h-5 w-5 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {showMobileMenu ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {showMobileMenu && (
            <div className="md:hidden pb-3 border-t border-white/50 mt-2 pt-3">
              <div className="space-y-2">
                <div className="px-3 py-2 rounded-xl bg-white/50">
                  <p className="text-sm font-semibold text-slate-700">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500">{getJobTitle()}</p>
                </div>
                <a
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-purple-50 rounded-xl"
                >
                  👤 Lihat Profil
                </a>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Search */}
        <div className="mb-6 sm:mb-8 rounded-3xl border border-white/60 bg-white/40 p-4 sm:p-6 backdrop-blur-xl shadow-xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari layanan atau aplikasi..."
              className="w-full rounded-2xl border border-white bg-white/70 px-5 py-3 sm:py-4 pl-12 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-purple-200/60"
            />
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2 sm:gap-3 overflow-x-auto pb-1">
            {[
              { key: "populer", label: "👑 Populer" },
              { key: "favorit", label: "⭐ Favorit" },
              { key: "terbaru", label: "⚡ Terbaru" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium transition ${activeTab === tab.key
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white/70 text-purple-700 hover:bg-white"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => (
            <a
              key={app.id}
              href={app.href}
              className="group rounded-3xl border border-white/60 bg-white/50 p-5 sm:p-6 backdrop-blur-xl shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md">
                <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-800">{app.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{app.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusUI(
                    app.is_active
                  )}`}
                >
                  {statusText(app.is_active)}
                </span>

                <span className="text-sm text-purple-600 opacity-0 transition group-hover:opacity-100">
                  Buka →
                </span>
              </div>
            </a>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="mt-8 rounded-3xl bg-white/50 p-8 sm:p-12 text-center shadow-md">
            <p className="text-slate-600">Tidak ada aplikasi ditemukan.</p>
          </div>
        )}
      </main>
    </div>
  );
}