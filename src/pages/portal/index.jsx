import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import LoadingScreen from "../../components/LoadingScreen";
import HeaderLayout from "../../layouts/HeaderLayout";

export default function Portal({ user, onLogout }) {
  const [apps, setApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [employeeLoaded, setEmployeeLoaded] = useState(false);

  useEffect(() => {
    document.title = "Portal | Alora Group Indonesia";

    const loadApps = async () => {
      try {
        const d = await api("/apps");
        setApps(d.apps || []);
      } catch (err) {
        console.error("Error loading apps:", err);
        setApps([]);
      } finally {
        setAppsLoaded(true);
      }
    };

    const loadEmployeeData = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const userData = parsed.user ?? parsed;
          setEmployeeData(userData.employee ?? null);
        }
      } catch (err) {
        console.error("Error parsing user data:", err);
        setEmployeeData(null);
      } finally {
        setEmployeeLoaded(true);
      }
    };

    loadApps();
    loadEmployeeData();
  }, []);

  useEffect(() => {
    if (appsLoaded && employeeLoaded) {
      setLoading(false);
    }
  }, [appsLoaded, employeeLoaded]);

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

  const getJobTitle = () => {
    if (!employeeData) return "Employee";

    const jobLevel = employeeData.job_level_name?.trim() || "";
    const position = employeeData.position_name?.trim() || "";

    return jobLevel && position
      ? `${jobLevel} ${position}`
      : jobLevel || position || "Employee";
  };

  if (loading) {
    return <LoadingScreen type="portal" />;
  }

  return (
    <HeaderLayout user={user} jobTitle={getJobTitle()} onLogout={onLogout}>
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
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusUI(app.is_active)}`}>
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
    </HeaderLayout>
  );
}