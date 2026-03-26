import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import LoadingScreen from "../../components/LoadingScreen";
import HeaderLayout from "../../layouts/HeaderLayout";

// Import komponen
import ApplicationsSection from "./components/ApplicationsSection";
import PersonalTasksCard from "./components/PersonalTasksCard";
import DailyTasksCard from "./components/DailyTasksCard";
import StatsCards from "./components/StatsCards";
import WeatherWidget from "./components/WeatherWidget";
import YouTubeSlider from "./components/YouTubeSlider";
import BroadcastBanner from "./components/BroadcastBanner"; 

export default function Portal({ user, onLogout }) {
  const [apps, setApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [employeeLoaded, setEmployeeLoaded] = useState(false);

  const youtubeVideos = useMemo(
    () => [
      { id: "Go_vhpddMDw", title: "Video 1" },
      { id: "R1wmG6NeuoY", title: "Video 2" },
      { id: "J8Vv--ioTa4", title: "Video 3" },
      { id: "XvjL7a6iLKc", title: "Video 4" },
      { id: "Wt6sXPLsLNI", title: "Video 5" },
      { id: "G1cOjb_-tKg", title: "Video 6" },
      { id: "fkuYp1gxW14", title: "Video 7" },
      { id: "M89sWlGYSdo", title: "Video 8" },
      { id: "fkuYp1gxW14", title: "Video 9" },
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <HeaderLayout user={user} jobTitle={getJobTitle()} onLogout={onLogout}>
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Top section: Main Content + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* <BroadcastBanner /> */}
            <StatsCards />
            <ApplicationsSection
              apps={apps}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            <WeatherWidget />
            <YouTubeSlider videos={youtubeVideos} />
          </div>
        </div>

        {/* Tasks Section — full width, dibagi 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PersonalTasksCard />
          <DailyTasksCard />
        </div>

      </div>
    </HeaderLayout>
  );
}