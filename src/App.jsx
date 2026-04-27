import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./lib/api";
import AddUser from "./pages/add-user";
import AddMenu from "./pages/add-menu";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Portal from "./pages/portal";
import Profile from "./pages/profile";
import Dashboard from "./pages/dashboard-sales";
import ProjectManagement from "./pages/project-management";
import EmployeeSatisfaction from "./pages/employee-satisfaction";
import MasterKaryawan from "./pages/master-karyawan/index";
import EmployeeDetail from "./pages/master-karyawan/[id]";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import MaintenancePage from "./pages/maintenance";
import AsetManagement from "./pages/aset-management";
import MasterRsIkm from "./pages/master-rs-ikm";
import RumahSakitPage from "./pages/master-rs-ikm/components/rumahSakit";
import DataLinenPage from "./pages/master-rs-ikm/components/dataLinen";
import TargetWaschen from "./pages/target-waschen";
import AbsensiIKM from "./pages/absensi-ikm";
import AbsensiPage from "./pages/absensi-ikm/components/absensi";
import PerizinanIKM from "./pages/absensi-ikm/components/perizinanIKM";
import MasterAbsensi from "./pages/absensi-ikm/components/masterAbsensi";
import LinenReport from "./pages/absensi-ikm/components/LinenReport";
import LeaderDailyReport from "./pages/absensi-ikm/components/LeaderDailyReport";
import KaryawanIKM from "./pages/karyawan-ikm";
import KaryawanIKMDetail from "./pages/karyawan-ikm/[id]";
import OperationalAlora from "./pages/operational-alora";
import DashboardOperasional from "./pages/operational-alora/components/dashboardOperasional";
import QualityCheckOC from "./pages/operational-alora/components/qualityCheck";
import ChemicalTreatmentOC from "./pages/operational-alora/components/chemicalTreatment";
import ComplainOC from "./pages/operational-alora/components/complain";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appRoles, setAppRoles] = useState({});
  const [authChecked, setAuthChecked] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const d = await api("/auth/me");
        setUser(d.user);
        localStorage.setItem("user", JSON.stringify(d.user));
      } catch {
        setUser(null);
        localStorage.removeItem("user");
      } finally {
        setAuthChecked(true);
      }
    };

    const loadRoles = async () => {
      try {
        const data = await api("/apps/authorization");
        const mapping = {};
        data.forEach((app) => {
          mapping[app.path] = app.authorization
            ? app.authorization.split(",").map((r) => r.trim())
            : [];
        });
        setAppRoles(mapping);
      } catch {
        setAppRoles({});
      } finally {
        setRolesLoaded(true);
      }
    };

    checkAuth();
    loadRoles();
  }, []);

  useEffect(() => {
    if (authChecked && rolesLoaded) {
      setLoading(false);
    }
  }, [authChecked, rolesLoaded]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(null);
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Add User ── */}
        <Route
          path="/add-user"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/add-user"]}>
              <AddUser user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* ── Add Menu ── */}
        <Route
          path="/add-menu"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/add-menu"]}>
              <AddMenu user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* ── Login ── */}
        <Route
          path="/login"
          element={user ? <Navigate to="/portal" /> : <Login onLogin={handleLogin} />}
        />

        {/* ── Register ── */}
        <Route
          path="/register"
          element={user ? <Navigate to="/portal" /> : <Register />}
        />

        {/* ── Halaman Utama ── */}
        <Route
          path="/portal/*"
          element={
            <ProtectedRoute user={user}>
              <Portal user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* ── Profile ── */}
        <Route
          path="/profile/*"
          element={
            <ProtectedRoute user={user}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ── Sales Dashboard ── */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/dashboard"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Project Management ── */}
        <Route
          path="/projectmanagement/*"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/projectmanagement"]}>
              <ProjectManagement />
            </ProtectedRoute>
          }
        />

        {/* ── Employee Satisfaction ── */}
        <Route
          path="/employeesatisfaction/*"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/employeesatisfaction"]}>
              <EmployeeSatisfaction />
            </ProtectedRoute>
          }
        />

        {/* ── Master Karyawan ── */}
        <Route
          path="/master-karyawan"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/master-karyawan"]}>
              <MasterKaryawan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/master-karyawan/:id"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/master-karyawan"]}>
              <EmployeeDetail />
            </ProtectedRoute>
          }
        />

        {/* ── Maintenance ── */}
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute user={user}>
              <MaintenancePage user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* ── Aset Management ── */}
        <Route
          path="/aset-management"
          element={
            <ProtectedRoute user={user}>
              <AsetManagement user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/rumah-sakit-ikm"]}>
              <MasterRsIkm />
            </ProtectedRoute>
          }
        >
          <Route path="/rumah-sakit-ikm" element={<RumahSakitPage />} />
          <Route path="/linen-ikm" element={<DataLinenPage />} />
        </Route>

        {/* ── Target Waschen ── */}
        <Route
          path="/target-waschen"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/target-waschen"]}>
              <TargetWaschen user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* ── IKM Suite (with sidebar) ── */}
        <Route
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={appRoles["/absensi-IKM"] || appRoles["/absensi-ikm"]}
            >
              <AbsensiIKM />
            </ProtectedRoute>
          }
        >
          <Route path="/absensi-IKM" element={<AbsensiPage user={user} onLogout={handleLogout} />} />
          <Route path="/absensi-ikm" element={<AbsensiPage user={user} onLogout={handleLogout} />} />
          <Route path="/perizinan-ikm" element={<PerizinanIKM user={user} onLogout={handleLogout} />} />
          <Route path="/master-absensi" element={<MasterAbsensi />} />
          <Route path="/linen-report-ikm" element={<LinenReport />} />
          <Route path="/leader-daily-report" element={<LeaderDailyReport />} />
        </Route>

        {/* ── Karyawan IKM ── */}
        <Route
          path="/karyawan-IKM"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={appRoles["/karyawan-IKM"] || appRoles["/karyawan-ikm"]}
            >
              <KaryawanIKM user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/karyawan-ikm"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={appRoles["/karyawan-IKM"] || appRoles["/karyawan-ikm"]}
            >
              <KaryawanIKM user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/karyawan-IKM/:id"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={appRoles["/karyawan-IKM"] || appRoles["/karyawan-ikm"]}
            >
              <KaryawanIKMDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/karyawan-ikm/:id"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={appRoles["/karyawan-IKM"] || appRoles["/karyawan-ikm"]}
            >
              <KaryawanIKMDetail />
            </ProtectedRoute>
          }
        />

        {/* ── Operational Alora ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/operational-alora-group"]}>
              <OperationalAlora />
            </ProtectedRoute>
          }
        >
          <Route path="/operational-alora-group" element={<DashboardOperasional />} />
          <Route path="/quality-check-oc" element={<QualityCheckOC />} />
          <Route path="/chemical-treatment-oc" element={<ChemicalTreatmentOC />} />
          <Route path="/complain-oc" element={<ComplainOC />} />
        </Route>

        <Route path="/" element={<Navigate to={user ? "/portal" : "/login"} />} />
        <Route path="*" element={<Navigate to={user ? "/portal" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}