import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import LoadingScreen from "../../components/LoadingScreen";
import HeaderLayout from "../../layouts/HeaderLayout";

// Import komponen
import ApplicationsSection from "./components/ApplicationsSection";
import DailyTasksCard from "./components/DailyTasksCard";
import StatsCards from "./components/StatsCards";
// import WeatherWidget from "./components/WeatherWidget";
import YouTubeSlider from "./components/YouTubeSlider";
import AloraChatBot from "./components/AloraChatBot";
import AppShortcutsCard from "./components/AppShortcutsCard";
import BadgeMaintenance from "./components/BadgeMaintenance";

// Kartu yang belum di-restyle satu per satu: ikut palet login (border lavender + bayangan krem).
const SOFT_CSS = `.soft-card > *:first-child{border:2px solid var(--p-border,#E3CDEA) !important;border-radius:16px !important;box-shadow:4px 4px 0 var(--p-shadow,#E8C9A8) !important}`;
// import BirthdayPortalTheme from "./components/BirthdayPortalTheme";

// Palet warna portal: Biru Langit & Jingga (variabel CSS --p-* dipakai kartu, header, dan background).
const PORTAL_PALETTE_STYLE = {
  "--p-bg": "#EEF4FB",
  "--p-tint": "#E3EEFA",
  "--p-border": "#C5D9F0",
  "--p-shadow": "#F6D3AE",
  "--p-cream": "#FFF6EA",
  "--p-creamb": "#F6DDBD",
  "--p-a1": "#2563EB",
  "--p-a2": "#F97316",
  "--p-a2d": "#9A4A0B",
  "--p-track": "#D9E6F6",
  "--p-ink": "#172B4D",
};

export default function Portal({ user, onLogout }) {
  const [apps, setApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeData, setEmployeeData] = useState(null);
  const [userRole, setUserRole] = useState(user?.role ?? null);
  const [loading, setLoading] = useState(true);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [employeeLoaded, setEmployeeLoaded] = useState(false);

  const isEmployeeRole = (userRole || user?.role) === "employee";

  useEffect(() => {
    document.title = "Portal | Alora Group Indonesia";

    const loadApps = async () => {
      try {
        const d = await api("/apps");
        setApps(d.apps || []);
        if (d.role) setUserRole(d.role);
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

  const getJobTitle = () => {
    if (!employeeData) return "Employee";
    const jobLevel = employeeData.job_level_name?.trim() || "";
    const position = employeeData.position_name?.trim() || "";
    return jobLevel && position
      ? `${jobLevel} ${position}`
      : jobLevel || position || "Employee";
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div style={PORTAL_PALETTE_STYLE}>
    <HeaderLayout user={user} jobTitle={getJobTitle()} onLogout={onLogout} themed>
      <style>{SOFT_CSS}</style>
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* <BirthdayPortalTheme /> */}

        {/* <BroadcastBanner /> */}
        {/* <WeatherWidget /> */}
        <BadgeMaintenance />
        <StatsCards companyId={employeeData?.company_id} />

        <ApplicationsSection
          apps={apps}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="soft-card"><YouTubeSlider /></div>
        <div className="soft-card"><AppShortcutsCard /></div>

        {/* Tasks Section — full width, dibagi 2 (disembunyikan untuk role employee) */}
        {!isEmployeeRole && (
          <div className="grid grid-cols-1 gap-6">
            <div className="soft-card"><DailyTasksCard /></div>
          </div>
        )}

      </div>
      <AloraChatBot />
    </HeaderLayout>
    </div>
  );
}