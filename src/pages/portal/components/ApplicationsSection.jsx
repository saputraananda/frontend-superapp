import { HiOutlineSquares2X2 } from "react-icons/hi2";

export default function ApplicationsSection({ apps, searchQuery, setSearchQuery }) {

  const filteredApps = apps.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const getAppIcon = (appName) => {
    const name = appName.toLowerCase();
    if (name.includes("pengajuan") || name.includes("request") || name.includes("reimburse") || name.includes("pengadaan"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      );
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
    if (name.includes("karyawan"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      );
    if (name.includes("master data") || name.includes("superapp"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 5a2 2 0 012-2h2.586A2 2 0 0110 3.586L10.414 4H18a2 2 0 012 2v1H4V5zM2 9a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V9zm7 2a1 1 0 000 2h6a1 1 0 100-2H9zm-1 4a1 1 0 011-1h4a1 1 0 110 2H9a1 1 0 01-1-1z" />
        </svg>
      );
    if (name.includes("master"))
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
    if (name.includes("absensi") || name.includes("attendance"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 2a1 1 0 012 0v1h6V2a1 1 0 112 0v1h1.5A2.5 2.5 0 0121 5.5v14A2.5 2.5 0 0118.5 22h-13A2.5 2.5 0 013 19.5v-14A2.5 2.5 0 015.5 3H7V2zM5 9v10.5c0 .28.22.5.5.5h13a.5.5 0 00.5-.5V9H5zm10.7 3.3a1 1 0 10-1.4-1.42l-3.1 3.08-1.5-1.48a1 1 0 10-1.4 1.42l2.2 2.17a1 1 0 001.4 0l3.8-3.77z" />
        </svg>
      );
    if (name.includes("aset") || name.includes("asset"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 000 2h2a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    if (name.includes("rumah sakit") || name.includes("hospital") || name.includes("rs ikm"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 3.75A2.25 2.25 0 0 0 4.75 6v12A2.25 2.25 0 0 0 7 20.25h10A2.25 2.25 0 0 0 19.25 18V6A2.25 2.25 0 0 0 17 3.75H7ZM12 7a.75.75 0 0 1 .75.75v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5A.75.75 0 0 1 12 7Z" />
        </svg>
      );
    if (name.includes("target"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11 2h2v3h-2zM11 19h2v3h-2zM2 11h3v2H2zM19 11h3v2h-3z" />
          <path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 3.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 2.5a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    if (name.includes("monitoring") || name.includes("waschen mo    nitoring"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 19a1 1 0 100 2h16a1 1 0 100-2H4z" />
          <path d="M7 10a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zM12 6a1 1 0 011 1v9a1 1 0 11-2 0V7a1 1 0 011-1zM17 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" />
        </svg>
      );
    if (name.includes("operational") || name.includes("control"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      );
    if (name.includes("complaint") || name.includes("komplain"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 5a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1zm0 8a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
      );
    if (name.includes("csat") || name.includes("nps") || name.includes("result"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    if (name.includes("b2b") || name.includes("koperasi") || name.includes("event"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 21V7l9-4 9 4v14H3zm2-2h5v-5H5v5zm7 0h7v-5h-7v5zm-7-7h14V8.5L12 5.3 5 8.5V12z" />
        </svg>
      );
    if (name.includes("document") || name.includes("dokumen"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-5 9h8v2H8v-2zm0 4h5v2H8v-2zm0-8h3v2H8V9z" />
        </svg>
      );
    if (name.includes("know your employee") || name.includes("employee mood") || name.includes("know your"))
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm0 14.5c-2.73 0-5.15-1.24-6.77-3.19C6.54 14.51 9.13 13.5 12 13.5s5.46 1.01 6.77 2.81A8.44 8.44 0 0112 19.5z" />
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
    if (name.includes("pengajuan") || name.includes("request") || name.includes("reimburse") || name.includes("pengadaan")) return "bg-emerald-600";
    if (name.includes("project")) return "bg-blue-600";
    if (name.includes("sales")) return "bg-indigo-500";
    if (name.includes("karyawan")) return "bg-cyan-500";
    if (name.includes("master data") || name.includes("superapp")) return "bg-violet-600";
    if (name.includes("master")) return "bg-cyan-500";
    if (name.includes("satisfaction")) return "bg-rose-400";
    if (name.includes("absensi") || name.includes("attendance")) return "bg-emerald-500";
    if (name.includes("aset") || name.includes("asset")) return "bg-amber-500";
    if (name.includes("rumah sakit") || name.includes("hospital") || name.includes("rs ikm")) return "bg-red-500";
    if (name.includes("target")) return "bg-orange-500";
    if (name.includes("monitoring") || name.includes("waschen monitoring")) return "bg-sky-600";
    if (name.includes("operational") || name.includes("control")) return "bg-violet-600";
    if (name.includes("complaint") || name.includes("komplain")) return "bg-rose-600";
    if (name.includes("csat") || name.includes("nps") || name.includes("result")) return "bg-amber-500";
    if (name.includes("b2b") || name.includes("koperasi") || name.includes("event")) return "bg-sky-600";
    if (name.includes("document") || name.includes("dokumen")) return "bg-blue-900";
    if (name.includes("know your employee") || name.includes("employee mood") || name.includes("know your")) return "bg-violet-500";
    return "bg-blue-600";
  };

  return (
    <div className="p-5">
      {/* Header statis — tanpa toggle */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100">
          <HiOutlineSquares2X2 className="h-4 w-4 text-blue-600" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Menu Untuk Kamu</h2>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-600">
          {apps.length}
        </span>
      </div>

      {/* Search & Grid langsung tampil */}
      <div className="relative mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari layanan atau menu..."
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pl-11 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
        />
        <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Apps Grid */}
      {filteredApps.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 text-sm">Tidak ada menu ditemukan.</p>
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
                {app.is_active !== 1 && (
                  <span className="inline-block mt-2 rounded-full border px-2 py-0.5 text-[10px] font-medium text-rose-700 bg-rose-50 border-rose-200">
                    Perbaikan
                  </span>
                )}              </div>
            </a>
          ))}
        </div>
      )}

      {/* Footer info */}
      {filteredApps.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Menampilkan <span className="font-semibold text-slate-600">{filteredApps.length}</span> menu
        </p>
      )}
    </div>
  );
}