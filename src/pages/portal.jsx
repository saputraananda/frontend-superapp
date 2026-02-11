// import { useEffect, useState } from "react";
// import { api } from "../lib/api";

// export default function Portal({ user, onLogout }) {
//   const [apps, setApps] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [activeTab, setActiveTab] = useState("populer");

//   useEffect(() => {
//     api("/apps").then((d) => setApps(d.apps));
//   }, []);

//   const filteredApps = apps.filter((a) =>
//     a.name.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   const getStatusColor = (status) => {
//     if (status === "aktif") return "text-green-600 bg-green-100";
//     if (status === "segera") return "text-yellow-600 bg-yellow-100";
//     return "text-red-600 bg-red-100";
//   };

//   const getStatusText = (status) => {
//     if (status === "aktif") return "Aktif";
//     if (status === "segera") return "Segera";
//     return "Perbaikan";
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-300 to-purple-200">
//       {/* Header */}
//       <header className="bg-white/20 backdrop-blur-lg border-b border-white/30">
//         <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <img src="/logo_waschen.webp" alt="Waschen" className="h-10" />
//             <div>
//               <h1 className="text-xl font-bold text-white">Alora Group Indonesia</h1>
//               <p className="text-xs text-white/80">Semua layanan dalam satu genggaman</p>
//             </div>
//           </div>

//           {/* User Info */}
//           <div className="flex items-center gap-4">
//             <div className="text-right">
//               <p className="text-sm font-semibold text-white">Hallo, {user?.name || "User"}!</p>
//               <p className="text-xs text-white/70">{user?.role || "Employee"}</p>
//             </div>
//             <img
//               src={user?.avatar || "https://ui-avatars.com/api/?name=" + (user?.name || "U")}
//               alt="Avatar"
//               className="h-12 w-12 rounded-full border-2 border-white/50"
//             />
//             <button
//               onClick={onLogout}
//               className="ml-2 rounded-lg bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30"
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="mx-auto max-w-7xl px-6 py-8">
//         {/* Search Bar */}
//         <div className="mb-8 rounded-3xl bg-white/30 p-6 backdrop-blur-lg border border-white/40 shadow-xl">
//           <div className="relative">
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Cari layanan atau aplikasi..."
//               className="w-full rounded-2xl border border-white/50 bg-white/60 px-5 py-4 pl-12 text-sm text-slate-800 placeholder:text-slate-400 outline-none backdrop-blur-md focus:border-purple-300 focus:ring-4 focus:ring-purple-200/50"
//             />
//             <svg
//               className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
//               />
//             </svg>
//           </div>

//           {/* Tabs */}
//           <div className="mt-4 flex gap-3">
//             {["populer", "favorit", "terbaru"].map((tab) => (
//               <button
//                 key={tab}
//                 onClick={() => setActiveTab(tab)}
//                 className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition ${
//                   activeTab === tab
//                     ? "bg-purple-600 text-white"
//                     : "bg-white/50 text-purple-700 hover:bg-white/70"
//                 }`}
//               >
//                 {tab === "populer" && "👑 Populer"}
//                 {tab === "favorit" && "⭐ Favorit"}
//                 {tab === "terbaru" && "⚡ Terbaru"}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Apps Grid */}
//         <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
//           {filteredApps.map((app) => (
//             <a
//               key={app.id}
//               href={app.href}
//               className="group relative overflow-hidden rounded-3xl bg-white/40 p-6 backdrop-blur-lg border border-white/50 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl hover:bg-white/50"
//             >
//               {/* Icon */}
//               <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-lg">
//                 <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
//                   <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
//                 </svg>
//               </div>

//               {/* Content */}
//               <h3 className="text-lg font-bold text-slate-800">{app.name}</h3>
//               <p className="mt-1 text-sm text-slate-600">{app.description}</p>

//               {/* Status Badge */}
//               <div className="mt-4">
//                 <span
//                   className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
//                     app.status || "aktif"
//                   )}`}
//                 >
//                   <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
//                   {getStatusText(app.status || "aktif")}
//                 </span>
//               </div>

//               {/* Arrow Icon on Hover */}
//               <div className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white opacity-0 transition group-hover:opacity-100">
//                 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                 </svg>
//               </div>
//             </a>
//           ))}
//         </div>

//         {filteredApps.length === 0 && (
//           <div className="rounded-3xl bg-white/30 p-12 text-center backdrop-blur-lg">
//             <p className="text-slate-600">Tidak ada aplikasi ditemukan.</p>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }


import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export default function Portal({ user, onLogout }) {
  const [apps, setApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("populer");

  useEffect(() => {
    api("/apps").then((d) => setApps(d.apps || []));
  }, []);

  const filteredApps = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return apps.filter((a) => a.name.toLowerCase().includes(q));
  }, [apps, searchQuery]);

  const statusUI = (status) => {
    if (status === "aktif")
      return "text-emerald-700 bg-emerald-100/70";
    if (status === "segera")
      return "text-amber-700 bg-amber-100/70";
    return "text-rose-700 bg-rose-100/70";
  };

  const statusText = (status) => {
    if (status === "aktif") return "Aktif";
    if (status === "segera") return "Segera";
    return "Perbaikan";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo_waschen.webp" alt="Waschen" className="h-10" />
            <div>
              <h1 className="text-lg font-bold text-slate-800">
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
              <p className="text-xs text-slate-500">
                {user?.role || "Employee"}
              </p>
            </div>

            <img
              src={
                user?.avatar ||
                "https://ui-avatars.com/api/?name=" + (user?.name || "U")
              }
              alt="Avatar"
              className="h-11 w-11 rounded-full border border-white shadow-md"
            />

            <button
              onClick={onLogout}
              className="rounded-xl bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white/80"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Search */}
        <div className="mb-8 rounded-3xl border border-white/60 bg-white/40 p-6 backdrop-blur-xl shadow-xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari layanan atau aplikasi..."
              className="w-full rounded-2xl border border-white bg-white/70 px-5 py-4 pl-12 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-purple-200/60"
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
          <div className="mt-4 flex gap-3">
            {[
              { key: "populer", label: "👑 Populer" },
              { key: "favorit", label: "⭐ Favorit" },
              { key: "terbaru", label: "⚡ Terbaru" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => (
            <a
              key={app.id}
              href={app.href}
              className="group rounded-3xl border border-white/60 bg-white/50 p-6 backdrop-blur-xl shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* Icon */}
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md">
                <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-slate-800">
                {app.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {app.description}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusUI(
                    app.status
                  )}`}
                >
                  {statusText(app.status)}
                </span>

                <span className="text-sm text-purple-600 opacity-0 transition group-hover:opacity-100">
                  Buka →
                </span>
              </div>
            </a>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="mt-8 rounded-3xl bg-white/50 p-12 text-center shadow-md">
            <p className="text-slate-600">Tidak ada aplikasi ditemukan.</p>
          </div>
        )}
      </main>
    </div>
  );
}