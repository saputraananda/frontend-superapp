import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import LoadingScreen from "../../components/LoadingScreen";
import HeaderLayout from "../../layouts/HeaderLayout";

// Import komponen
import ApplicationsSection from "./components/ApplicationsSection";
import PersonalTasksCard from "./components/PersonalTasksCard";
import OperationalTasksCard from "./components/OperationalTasksCard";
import StatsCards from "./components/StatsCards";
import WeatherWidget from "./components/WeatherWidget";
import YouTubeSlider from "./components/YouTubeSlider";
import PerformanceRating from "./components/PerformanceRating";

export default function Portal({ user, onLogout }) {
  const [apps, setApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [employeeLoaded, setEmployeeLoaded] = useState(false);

  const youtubeVideos = useMemo(
    () => [
      { id: "fkuYp1gxW14", title: "Video 1" },
      { id: "M89sWlGYSdo", title: "Video 2" },
      { id: "tu12L4xlUNU", title: "Video 3" }
    ],
    []
  );

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

  const getJobTitle = () => {
    if (!employeeData) return "Employee";
    const jobLevel = employeeData.job_level_name?.trim() || "";
    const position = employeeData.position_name?.trim() || "";
    return jobLevel && position
      ? `${jobLevel} ${position}`
      : jobLevel || position || "Employee";
  };

  const operationalTasks = [
    { id: 1, title: "Penambahan Mesin Cuci Citra Gran", date: "26 Apr 235", progress: 60, status: "On Progress" },
    { id: 2, title: "Perbaikan Motor Raffles", date: "26 Apr 235", progress: 80, status: "Menunggu" }
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
            {/* Stats Cards - Pindah ke atas */}
            <StatsCards />

            {/* Applications Section */}
            <ApplicationsSection 
              apps={apps} 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
            />

            {/* Tasks Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PersonalTasksCard />
              <OperationalTasksCard tasks={operationalTasks} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            <WeatherWidget />
            <YouTubeSlider videos={youtubeVideos} />
            <PerformanceRating user={user} jobTitle={getJobTitle()} />
          </div>
        </div>
      </div>
    </HeaderLayout>
  );
}