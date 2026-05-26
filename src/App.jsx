import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./lib/api";
import MasterDataSuperApp from "./pages/master-data-superapp";
import MasterUser from "./pages/master-data-superapp/components/MasterUser";
import MasterMenu from "./pages/master-data-superapp/components/MasterMenu";
import MasterBank from "./pages/master-data-superapp/components/MasterBank";
import MasterCompany from "./pages/master-data-superapp/components/MasterCompany";
import MasterDepartment from "./pages/master-data-superapp/components/MasterDepartment";
import MasterEducationLevel from "./pages/master-data-superapp/components/MasterEducationLevel";
import MasterEmployeeStatus from "./pages/master-data-superapp/components/MasterEmployeeStatus";
import MasterJobLevel from "./pages/master-data-superapp/components/MasterJobLevel";
import MasterOutlet from "./pages/master-data-superapp/components/MasterOutlet";
import MasterPosition from "./pages/master-data-superapp/components/MasterPosition";
import MasterReligion from "./pages/master-data-superapp/components/MasterReligion";
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
import RumahSakitPage from "./pages/master-rs-ikm/components/RumahSakit";
import DataLinenPage from "./pages/master-rs-ikm/components/DataLinen";
import TargetWaschen from "./pages/target-waschen";
import AbsensiIKM from "./pages/absensi-ikm";
import AbsensiPage from "./pages/absensi-ikm/components/Absensi";
import PerizinanIKM from "./pages/absensi-ikm/components/PerizinanIKM";
import MasterAbsensi from "./pages/absensi-ikm/components/MasterAbsensi";
import LinenReport from "./pages/absensi-ikm/components/LinenReport";
import LeaderDailyReport from "./pages/absensi-ikm/components/LeaderDailyReport";
import KasbonPinjaman from "./pages/absensi-ikm/components/KasbonPinjaman";
import KaryawanIKM from "./pages/karyawan-ikm";
import KaryawanIKMDetail from "./pages/karyawan-ikm/[id]";
import OperationalAlora from "./pages/operational-alora";
import DashboardOperasional from "./pages/operational-alora/components/DashboardOperasional";
import QualityCheckOC from "./pages/operational-alora/components/QualityCheck";
import ChemicalTreatmentOC from "./pages/operational-alora/components/ChemicalTreatment";
import ComplaintManagement from "./pages/complaint-management";
import DashboardKomplain from "./pages/complaint-management/components/DashboardKomplain";
import DaftarKomplain from "./pages/complaint-management/components/DaftarKomplain";
import FormKomplain from "./pages/complaint-management/components/FormKomplain";
import PengajuanAlora from "./pages/pengajuan-alora";
import DashboardPengajuan from "./pages/pengajuan-alora/pages/DashboardPengajuan";
import PengajuanBarang from "./pages/pengajuan-alora/pages/PengajuanBarang";
import FormPengajuan from "./pages/pengajuan-alora/pages/FormPengajuan";
import DocumentAlora from "./pages/document-alora";
import MasterDocument from "./pages/document-alora/components/MasterDocument";
import TransDocument from "./pages/document-alora/components/TransDocument";

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
        {/* ── Master Data SuperApp ── */}
        <Route
          path="/master-data-superapp"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/master-data-superapp"]}>
              <MasterDataSuperApp />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/master-data-superapp/master-user" replace />} />
          <Route path="master-user" element={<MasterUser />} />
          <Route path="master-menu" element={<MasterMenu />} />
          <Route path="master-bank" element={<MasterBank />} />
          <Route path="master-company" element={<MasterCompany />} />
          <Route path="master-department" element={<MasterDepartment />} />
          <Route path="master-education-level" element={<MasterEducationLevel />} />
          <Route path="master-employee-status" element={<MasterEmployeeStatus />} />
          <Route path="master-job-level" element={<MasterJobLevel />} />
          <Route path="master-outlet" element={<MasterOutlet />} />
          <Route path="master-position" element={<MasterPosition />} />
          <Route path="master-religion" element={<MasterReligion />} />
        </Route>

        {/* ── Legacy redirects ── */}
        <Route path="/add-user" element={<Navigate to="/master-data-superapp/master-user" replace />} />
        <Route path="/add-menu" element={<Navigate to="/master-data-superapp/master-menu" replace />} />

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
          <Route path="/kasbon-pinjaman" element={<KasbonPinjaman />} />
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
        </Route>

        <Route path="/" element={<Navigate to={user ? "/portal" : "/login"} />} />
        <Route path="*" element={<Navigate to={user ? "/portal" : "/login"} />} />

        {/* ── Complaint Management System ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/complaint-management-system"]}>
              <ComplaintManagement />
            </ProtectedRoute>
          }
        >
          <Route path="/complaint-management-system" element={<DashboardKomplain />} />
          <Route path="/complaint-list" element={<DaftarKomplain />} />
          <Route path="/complaint-form" element={<FormKomplain />} />
        </Route>

        {/* ── Pengajuan Alora ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/pengajuan-alora"]}>
              <PengajuanAlora />
            </ProtectedRoute>
          }
        >
          <Route path="/pengajuan-alora" element={<DashboardPengajuan />} />
          <Route path="/pengajuan-alora/list" element={<PengajuanBarang />} />
          <Route path="/pengajuan-alora/form" element={<FormPengajuan />} />
        </Route>

        {/* ── Document Alora ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/document-alora"]}>
              <DocumentAlora />
            </ProtectedRoute>
          }
        >
          <Route path="/document-alora" element={<MasterDocument />} />
          <Route path="/document-alora/transactions" element={<TransDocument />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}