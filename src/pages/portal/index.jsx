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
  const [weather, setWeather] = useState(null);

  // ✅ YouTube slider state (tanpa komponen tambahan)
  const youtubeVideos = useMemo(
    () => [
      { id: "fkuYp1gxW14", title: "Video 1" },
      { id: "M89sWlGYSdo", title: "Video 2" },
      { id: "tu12L4xlUNU", title: "Video 3" }
    ],
    []
  );
  const [videoIndex, setVideoIndex] = useState(0);

  const prevVideo = () => {
    setVideoIndex((i) => (i - 1 + youtubeVideos.length) % youtubeVideos.length);
  };

  const nextVideo = () => {
    setVideoIndex((i) => (i + 1) % youtubeVideos.length);
  };

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

    const loadWeather = async () => {
      try {
        const lat = -6.3728;
        const lon = 106.9127;
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`
        );
        const data = await response.json();
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          weatherCode: data.current.weather_code
        });
      } catch (err) {
        console.error("Error loading weather:", err);
        setWeather({ temp: 30, humidity: 72, windSpeed: 8, weatherCode: 2 });
      }
    };

    loadApps();
    loadEmployeeData();
    loadWeather();
  }, [youtubeVideos.length]);

  useEffect(() => {
    if (appsLoaded && employeeLoaded) {
      setLoading(false);
    }
  }, [appsLoaded, employeeLoaded]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return apps.filter((a) => a.name.toLowerCase().includes(q));
  }, [apps, searchQuery]);

  const displayedApps = useMemo(() => {
    return filteredApps.slice(0, 6);
  }, [filteredApps]);

  const statusUI = (is_active) => {
    return is_active === 1
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-rose-700 bg-rose-50 border-rose-200";
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

  const getWeatherDescription = (code) => {
    if (code <= 1) return "Cerah";
    if (code <= 3) return "Partly Cloudy";
    if (code <= 48) return "Berkabut";
    if (code <= 67) return "Hujan";
    if (code <= 77) return "Salju";
    return "Hujan Badai";
  };

  const getWeatherIcon = (code) => {
    if (code <= 1) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 48) return "🌫️";
    if (code <= 67) return "🌧️";
    return "⛈️";
  };

  const getAppIcon = (appName) => {
    const name = appName.toLowerCase();
    if (name.includes("project")) {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      );
    }
    if (name.includes("sales")) {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      );
    }
    if (name.includes("task")) {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path
            fillRule="evenodd"
            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    if (name.includes("master") || name.includes("karyawan")) {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      );
    }
    if (name.includes("satisfaction")) {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    if (name.includes("dokumen") || name.includes("upload")) {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
      </svg>
    );
  };

  const getAppIconBg = (appName) => {
    const name = appName.toLowerCase();
    if (name.includes("project")) return "bg-blue-600";
    if (name.includes("sales")) return "bg-blue-600";
    if (name.includes("task")) return "bg-amber-500";
    if (name.includes("master") || name.includes("karyawan")) return "bg-cyan-500";
    if (name.includes("satisfaction")) return "bg-rose-400";
    if (name.includes("dokumen") || name.includes("upload")) return "bg-violet-500";
    return "bg-blue-600";
  };

  const personalTasks = [
    { id: 1, title: "Update Profil Diri", date: "Hari Ini", time: "16:00 - 16:00", deadline: "16.00", type: "today" },
    { id: 2, title: "Laporkan Timesheet April", date: "27 April 2024", time: "10:00", deadline: "10:00", type: "upcoming" }
  ];

  const operationalTasks = [
    { id: 1, title: "Submit Monthly Sales Report", date: "26 Apr 235", progress: 60, status: "On Progress" },
    { id: 2, title: "Review and Approve New HR", date: "26 Apr 235", progress: 80, status: "Menunggu" }
  ];

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <HeaderLayout user={user} jobTitle={getJobTitle()} onLogout={onLogout}>
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Aplikasi Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                <h2 className="text-base font-bold text-slate-800">Aplikasi</h2>
              </div>

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
                  <svg
                    className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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

                {/* Apps Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayedApps.map((app) => (
                    <a
                      key={app.id}
                      href={app.href}
                      className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div
                        className={`flex-shrink-0 h-10 w-10 rounded-lg ${getAppIconBg(
                          app.name
                        )} text-white flex items-center justify-center shadow-sm`}
                      >
                        {getAppIcon(app.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">
                          {app.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {app.description}
                        </p>
                        <span
                          className={`inline-block mt-2 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusUI(
                            app.is_active
                          )}`}
                        >
                          {statusText(app.is_active)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>

                {filteredApps.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-slate-500 text-sm">
                      Tidak ada aplikasi ditemukan.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Pribadi */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">
                    Task Pribadi
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                      Upcoming
                    </button>
                    <button className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition">
                      Overdue
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {personalTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
                    >
                      <div
                        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          task.type === "today"
                            ? "bg-rose-100 text-rose-500"
                            : "bg-blue-100 text-blue-500"
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-800">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          📅 {task.date} {task.time && `- ${task.time}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">
                          {task.type === "today" ? "Hari Ini" : task.date}
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          {task.deadline}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Operasional */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">
                    Task Operasional
                  </h2>
                  <button className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                    Upcoming
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {operationalTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-800">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-500">{task.status}</p>
                        <div className="mt-1.5 w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">{task.date}</p>
                        <p className="text-sm font-bold text-blue-600">
                          {task.progress}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Karyawan */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">
                      Total Karyawan
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-slate-800">
                        1,250
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 font-medium">
                      + 3.9% this month
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Sales */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-cyan-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path
                        fillRule="evenodd"
                        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">
                      Total Sales
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-slate-800">
                        Rp 390.5
                      </span>
                      <span className="text-sm text-slate-500">juta</span>
                    </div>
                    <p className="text-xs text-emerald-600 font-medium">
                      + 9.5% this month
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee Satisfaction */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">
                      Employee Satisfaction
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-800">
                        88
                      </span>
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4].map((i) => (
                          <svg
                            key={i}
                            className="h-3.5 w-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <svg
                          className="h-3.5 w-3.5 text-slate-300"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-600 font-medium">
                      + 12% this month
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Weather Widget */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-slate-600 shadow-sm p-5 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold">Raffles Hills, Cibubur</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {weather ? getWeatherDescription(weather.weatherCode) : "Loading..."}
                  </p>
                </div>
                <div className="text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-start">
                  <span className="text-5xl font-light">{weather?.temp || 30}</span>
                  <span className="text-2xl">°</span>
                </div>
                <div className="text-6xl">{weather ? getWeatherIcon(weather.weatherCode) : "⛅"}</div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-600">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.5 2a3.5 3.5 0 101.665 6.58L8.585 10l-1.42 1.42a3.5 3.5 0 101.414 1.414l8.128-8.127a1 1 0 00-1.414-1.414L7.165 11.42A3.5 3.5 0 105.5 2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs">
                    {weather?.humidity || 72}% <span className="text-slate-400">Humidity</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="text-xs">
                    {weather?.windSpeed || 8} km/h <span className="text-slate-400">NE</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ✅ YouTube Video Slider (inline, tanpa component baru) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-800">Cek video terbaru kami</h3>

                {/* small responsive controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevVideo}
                    aria-label="Video sebelumnya"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={nextVideo}
                    aria-label="Video selanjutnya"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="relative w-full h-0 pb-[56.25%] rounded-lg overflow-hidden">
                  <iframe
                    key={youtubeVideos[videoIndex]?.id} // reload saat ganti video
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${youtubeVideos[videoIndex]?.id}`}
                    title={youtubeVideos[videoIndex]?.title || "YouTube video"}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Tonton update terbaru dari{" "}
                    <span className="text-blue-600 font-medium">Aurora</span>
                  </p>

                  {/* dots kecil */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {youtubeVideos.map((v, i) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVideoIndex(i)}
                        aria-label={`Pilih video ${i + 1}`}
                        className={`h-1.5 rounded-full transition ${
                          i === videoIndex ? "bg-blue-600 w-4" : "bg-slate-300 w-1.5"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Rating */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-800">Performance Rating</h3>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg className="h-16 w-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="6" fill="none" />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="url(#gradient)"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(4.7 / 5) * 176} 176`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#eab308" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-slate-800">4.7</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Rating Anda</p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      4.07 / 6 <span className="text-slate-400">/5</span>
                    </p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">+ 0.3 this month</p>
                  </div>
                </div>
              </div>
            </div>
            {/* end sidebar */}
          </div>
        </div>
      </div>
    </HeaderLayout>
  );
}