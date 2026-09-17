import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import LoadingScreen from "../../components/LoadingScreen";
import HeaderLayout from "../../layouts/HeaderLayout";

// Import komponen
import ApplicationsSection from "./components/ApplicationsSection";
import PersonalTasksCard from "./components/PersonalTasksCard";
import DailyTasksCard from "./components/DailyTasksCard";
import StatsCards from "./components/StatsCards";
// import WeatherWidget from "./components/WeatherWidget";
import YouTubeSlider from "./components/YouTubeSlider";
import AloraChatBot from "./components/AloraChatBot";
import AppShortcutsCard from "./components/AppShortcutsCard";
import BadgeMaintenance from "./components/BadgeMaintenance";
// import BirthdayPortalTheme from "./components/BirthdayPortalTheme";

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
    <HeaderLayout user={user} jobTitle={getJobTitle()} onLogout={onLogout}>
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

        <YouTubeSlider />
        <AppShortcutsCard />

        {/* Tasks Section — full width, dibagi 2 (disembunyikan untuk role employee) */}
        {!isEmployeeRole && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PersonalTasksCard />
            <DailyTasksCard />
          </div>
        )}

      </div>
      <AloraChatBot />
    </HeaderLayout>
  );
}