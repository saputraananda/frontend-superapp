import { useState } from "react";
import { HiOutlineChevronDown, HiOutlineSquares2X2 } from "react-icons/hi2";

export default function ApplicationsSection({ apps, searchQuery, setSearchQuery }) {
  const [isOpen, setIsOpen] = useState(true);

  const filteredApps = apps.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusUI = (is_active) =>
    is_active === 1
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-rose-700 bg-rose-50 border-rose-200";

  const statusText = (is_active) => (is_active === 1 ? "Aktif" : "Perbaikan");

  const getAppIcon = (appName) => {
    const name = appName.toLowerCase();
    if (name.includes("project"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      );
    if (name.includes("sales"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      );
    if (name.includes("master") || name.includes("karyawan"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      );
    if (name.includes("satisfaction"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
        </svg>
      );
    if (name.includes("add-user") || name.includes("add user") || name.includes("user employee"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
        </svg>
      );
    if (name.includes("add-menu") || name.includes("add menu") || name.includes("menu app"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm13-3a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" clipRule="evenodd" />
        </svg>
      );
    if (name.includes("weekly") || name.includes("leader") || name.includes("report"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
        </svg>
      );
    return (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
      </svg>
    );
  };

  const getAppIconBg = (appName) => {
    const name = appName.toLowerCase();
    if (name.includes("project"))  return "bg-blue-600";
    if (name.includes("sales"))    return "bg-indigo-500";
    if (name.includes("master") || name.includes("karyawan")) return "bg-cyan-500";
    if (name.includes("satisfaction")) return "bg-rose-400";
    if (name.includes("add-user") || name.includes("add user") || name.includes("user employee")) return "bg-violet-500";
    if (name.includes("add-menu") || name.includes("add menu") || name.includes("menu app")) return "bg-teal-500";
    if (name.includes("weekly") || name.includes("leader") || name.includes("report")) return "bg-indigo-500";
    return "bg-blue-600";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Header — klik untuk toggle ── */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 hover:bg-slate-100 transition group"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100">
            <HiOutlineSquares2X2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Aplikasi Untuk Kamu</h2>
            {/* Badge jumlah app */}
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-600">
              {apps.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium group-hover:text-slate-600 transition">
            {isOpen ? "Tutup" : "Buka"}
          </span>
          <div className={`flex items-center justify-center h-6 w-6 rounded-lg border border-slate-200 bg-white transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
            <HiOutlineChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
      </button>

      {/* ── Collapsible body ── */}
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
        <div className="p-5">

          {/* Search */}
          <div className="relative mb-5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari layanan atau aplikasi..."
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pl-11 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
            <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Apps Grid */}
          {filteredApps.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500 text-sm">Tidak ada aplikasi ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredApps.map((app) => (
                <a
                  key={app.id}
                  href={app.href}
                  className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className={`flex-shrink-0 h-10 w-10 rounded-lg ${getAppIconBg(app.name)} text-white flex items-center justify-center shadow-sm`}>
                    {getAppIcon(app.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 truncate">{app.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{app.description}</p>
                    <span className={`inline-block mt-2 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusUI(app.is_active)}`}>
                      {statusText(app.is_active)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Footer info */}
          {filteredApps.length > 0 && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Menampilkan <span className="font-semibold text-slate-600">{filteredApps.length}</span> aplikasi
            </p>
          )}
        </div>
      </div>
    </div>
  );
}