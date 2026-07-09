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
import MasterSatuan from "./pages/master-data-superapp/components/MasterSatuan";
import MasterVendor from "./pages/master-data-superapp/components/MasterVendor";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Portal from "./pages/portal";
import Profile from "./pages/profile";
import Dashboard from "./pages/dashboard-sales";
import ProjectManagement from "./pages/project-management";
import EmployeeSatisfaction from "./pages/employee-satisfaction";
import MasterKaryawan from "./pages/master-karyawan/index";
import DashboardMaster from "./pages/master-karyawan/components/DashboardMaster";
import DataKaryawan from "./pages/master-karyawan/components/DataKaryawan";
import EmployeeDetail from "./pages/master-karyawan/[id]";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import MaintenancePage from "./pages/maintenance";
import AsetManagement from "./pages/aset-management";
import MasterRsIkm from "./pages/master-rs-ikm";
import RumahSakitPage from "./pages/master-rs-ikm/components/Dashboard/RumahSakit";
import EkaBSD from "./pages/master-rs-ikm/components/MasterLinen/EkaBSD";
import EkaMTH from "./pages/master-rs-ikm/components/MasterLinen/EkaMTH";
import EkaDepok from "./pages/master-rs-ikm/components/MasterLinen/EkaDepok";
import EkaCilegon from "./pages/master-rs-ikm/components/MasterLinen/EkaCilegon";
import EkaPHJ from "./pages/master-rs-ikm/components/MasterLinen/EkaPHJ";
import EkaCBB from "./pages/master-rs-ikm/components/MasterLinen/EkaCBB";
import EkaBKS from "./pages/master-rs-ikm/components/MasterLinen/EkaBKS";
import PermataCBB from "./pages/master-rs-ikm/components/MasterLinen/PermataCBB";
import RSIABundaJKT from "./pages/master-rs-ikm/components/MasterLinen/RSIABundaJKT";
import RSUBundaJKT from "./pages/master-rs-ikm/components/MasterLinen/RSUBundaJKT";
import RSUBundaMGD from "./pages/master-rs-ikm/components/MasterLinen/RSUBundaMGD";
import EkaGFPIK from "./pages/master-rs-ikm/components/MasterLinen/EkaGFPIK";
import EkaFPluit from "./pages/master-rs-ikm/components/MasterLinen/EkaFPluit";
import ColumbiaBSD from "./pages/master-rs-ikm/components/MasterLinen/ColumbiaBSD";
import RSAtmaJayaJKT from "./pages/master-rs-ikm/components/MasterLinen/RSAtmaJayaJKT";
import StockOpnamePage from "./pages/master-rs-ikm/components/MasterLinen/StockOpnamePage";
import DataLinenPage from "./pages/master-rs-ikm/components/Dashboard/DataLinen";
import MasterSize from "./pages/master-rs-ikm/components/MasterData/MasterSize";
import MasterColor from "./pages/master-rs-ikm/components/MasterData/MasterColor";
import MasterMaterial from "./pages/master-rs-ikm/components/MasterData/MasterMaterial";
import MasterLinenCategory from "./pages/master-rs-ikm/components/MasterData/MasterLinenCategory";
import MasterVendorIKM from "./pages/master-rs-ikm/components/MasterData/MasterVendor";
import TargetWaschen from "./pages/target-waschen";
import AbsensiIKM from "./pages/absensi-ikm";
import AbsensiPage from "./pages/absensi-ikm/components/Absensi";
import PerizinanIKM from "./pages/absensi-ikm/components/PerizinanIKM";
import MasterAbsensi from "./pages/absensi-ikm/components/MasterAbsensi";
import LinenReport from "./pages/absensi-ikm/components/LinenReport";
import RewashLinen from "./pages/absensi-ikm/components/RewashLinen";
import LeaderDailyReport from "./pages/absensi-ikm/components/LeaderDailyReport";
import KasbonPinjaman from "./pages/absensi-ikm/components/KasbonPinjaman";
import AbsensiManajemen from "./pages/absensi-ikm/components/AbsensiManajemen";
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
import CsAtNps from "./pages/csat-nps";
import CsAtWaschen from "./pages/csat-nps/components/CsatWaschen";
import CsAtCleanox from "./pages/csat-nps/components/CsatCleanox";
import B2BAlora from "./pages/b2b-alora";
import B2bKoperasiDashboard from "./pages/b2b-alora/B2B-Koperasi-2026/components/b2bKoperasiDashboard";
import B2bKoperasiCustomer from "./pages/b2b-alora/B2B-Koperasi-2026/components/b2bKoperasiCustomer";
import B2bHajiDashboard from "./pages/b2b-alora/B2B-Haji-2025/components/b2bHajiDashboard";
import KnowYourEmployee from "./pages/knowyour-employee";
import EmployeeMood from "./pages/knowyour-employee/components/EmployeeMood";
import DashboardKYE from "./pages/knowyour-employee/components/DashboardKYE";
import AnalisisBurnout from "./pages/knowyour-employee/components/AnalisisBurnout";
import CleanoxManagement from "./pages/cleanox-management";
import EmployeeCleanox from "./pages/cleanox-management/components/EmployeeCleanox";
import MasterService from "./pages/cleanox-management/components/MasterService";
import MasterCategory from "./pages/cleanox-management/components/MasterCategory";
import KpiProduksiCleanox from "./pages/cleanox-management/components/KpiProduksiCleanox";
import EmployeeCleanoxDetail from "./pages/cleanox-management/components/[id]";
import MyWaschen from "./pages/my-waschen";
import DashboardPage from "./pages/my-waschen/components/DashboardPage";
import AdminLaporanPage from "./pages/my-waschen/components/AdminLaporanPage";
import AdminSettingsPage from "./pages/my-waschen/components/AdminSettingsPage";
import AdminTargetPage from "./pages/my-waschen/components/AdminTargetPage";
import AdminTargetDetailPage from "./pages/my-waschen/components/AdminTargetDetailPage";
import AdminPromoSlaStokPage from "./pages/my-waschen/components/AdminPromoSlaStokPage";
import AdminPeriodClosePage from "./pages/my-waschen/components/AdminPeriodClosePage";
import AdminShiftReportPage from "./pages/my-waschen/components/AdminShiftReportPage";
import AdminKasOverviewPage from "./pages/my-waschen/components/AdminKasOverviewPage";
import AdminSubSessionPage from "./pages/my-waschen/components/AdminSubSessionPage";
import ApprovalCenterPage from "./pages/my-waschen/components/ApprovalCenterPage";
import ApprovalPage from "./pages/my-waschen/components/ApprovalPage";
import PurchaseRequestsPage from "./pages/my-waschen/components/PurchaseRequestsPage";
import PurchaseRequestApprovalPage from "./pages/my-waschen/components/PurchaseRequestApprovalPage";
import SetorApprovalPage from "./pages/my-waschen/components/SetorApprovalPage";
import CashDepositApproval from "./pages/my-waschen/components/CashDepositApproval";
import KasApprovalPage from "./pages/my-waschen/components/KasApprovalPage";
import BirthdayPage from "./pages/my-waschen/components/BirthdayPage";
import ComparisonReportPage from "./pages/my-waschen/components/ComparisonReportPage";
import ForecastPage from "./pages/my-waschen/components/ForecastPage";
import GeneralReportPage from "./pages/my-waschen/components/GeneralReportPage";
import ErrorDashboardPage from "./pages/my-waschen/components/ErrorDashboardPage";
import InfoOutletPage from "./pages/my-waschen/components/InfoOutletPage";
import KelolaLayananOutletPage from "./pages/my-waschen/components/KelolaLayananOutletPage";
import ManajemenLayananPage from "./pages/my-waschen/components/ManajemenLayananPage";
import ManajemenOutletPage from "./pages/my-waschen/components/ManajemenOutletPage";
import ManajemenUserPage from "./pages/my-waschen/components/ManajemenUserPage";
import InventoryMasterPage from "./pages/my-waschen/components/InventoryMasterPage";
import AllOutletStocksPage from "./pages/my-waschen/components/AllOutletStocksPage";

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
          <Route path="master-satuan" element={<MasterSatuan />} />
          <Route path="master-vendor" element={<MasterVendor />} />
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
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/master-karyawan"]}>
              <MasterKaryawan />
            </ProtectedRoute>
          }
        >
          <Route path="/master-karyawan" element={<DashboardMaster />} />
          <Route path="/master-karyawan/list" element={<DataKaryawan />} />
        </Route>

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
          <Route path="/eka-bsd-linen" element={<EkaBSD />} />
          <Route path="/eka-bsd-stock-opname" element={<StockOpnamePage key="eka-bsd-opname" hospitalId={2} hospitalName="Eka Hospital BSD (Bumi Serpong Damai)" />} />
          <Route path="/eka-mth-linen" element={<EkaMTH />} />
          <Route path="/eka-mth-stock-opname" element={<StockOpnamePage key="eka-mth-opname" hospitalId={5} hospitalName="Eka Hospital MTH (MT Haryono)" />} />
          <Route path="/eka-depok-linen" element={<EkaDepok />} />
          <Route path="/eka-depok-stock-opname" element={<StockOpnamePage key="eka-depok-opname" hospitalId={4} hospitalName="Eka Hospital Depok" />} />
          <Route path="/eka-cilegon-linen" element={<EkaCilegon />} />
          <Route path="/eka-cilegon-stock-opname" element={<StockOpnamePage key="eka-cilegon-opname" hospitalId={9} hospitalName="Eka Hospital Cilegon" />} />
          <Route path="/eka-phj-linen" element={<EkaPHJ />} />
          <Route path="/eka-phj-stock-opname" element={<StockOpnamePage key="eka-phj-opname" hospitalId={7} hospitalName="Eka Hospital Permata Hijau" />} />
          <Route path="/eka-cbb-linen" element={<EkaCBB />} />
          <Route path="/eka-cbb-stock-opname" element={<StockOpnamePage key="eka-cbb-opname" hospitalId={3} hospitalName="Eka Hospital Cibubur" />} />
          <Route path="/eka-bks-linen" element={<EkaBKS />} />
          <Route path="/eka-bks-stock-opname" element={<StockOpnamePage key="eka-bks-opname" hospitalId={1} hospitalName="Eka Hospital Bekasi" />} />
          <Route path="/eka-gfpik-linen" element={<EkaGFPIK />} />
          <Route path="/eka-gfpik-stock-opname" element={<StockOpnamePage key="eka-gfpik-opname" hospitalId={8} hospitalName="Eka Hospital Grand Family PIK (Pantai Indah Kapuk)" />} />
          <Route path="/eka-fpluit-linen" element={<EkaFPluit />} />
          <Route path="/eka-fpluit-stock-opname" element={<StockOpnamePage key="eka-fpluit-opname" hospitalId={6} hospitalName="Eka Hospital Family Pluit" />} />
          <Route path="/permata-cbb-linen" element={<PermataCBB />} />
          <Route path="/permata-cbb-stock-opname" element={<StockOpnamePage key="permata-cbb-opname" hospitalId={14} hospitalName="RS Permata Cibubur" />} />
          <Route path="/rsia-bunda-jkt-linen" element={<RSIABundaJKT />} />
          <Route path="/rsia-bunda-jkt-stock-opname" element={<StockOpnamePage key="rsia-bunda-jkt-opname" hospitalId={10} hospitalName="Bunda - RSIA Bunda Jakarta" />} />
          <Route path="/rsu-bunda-jkt-linen" element={<RSUBundaJKT />} />
          <Route path="/rsu-bunda-jkt-stock-opname" element={<StockOpnamePage key="rsu-bunda-jkt-opname" hospitalId={11} hospitalName="Bunda - RSU Bunda Jakarta" />} />
          <Route path="/rsu-bunda-mgd-linen" element={<RSUBundaMGD />} />
          <Route path="/rsu-bunda-mgd-stock-opname" element={<StockOpnamePage key="rsu-bunda-mgd-opname" hospitalId={12} hospitalName="Bunda - RSU Bunda Margonda" />} />
          <Route path="/eka-gfpik-linen" element={<EkaGFPIK />} />
          <Route path="/eka-fpluit-linen" element={<EkaFPluit />} />
          <Route path="/columbia-bsd-linen" element={<ColumbiaBSD />} />
          <Route path="/columbia-bsd-stock-opname" element={<StockOpnamePage key="columbia-bsd-opname" hospitalId={15} hospitalName="RS Columbia BSD (Bumi Serpong Damai)" />} />
          <Route path="/atma-jaya-jkt-linen" element={<RSAtmaJayaJKT />} />
          <Route path="/atma-jaya-jkt-stock-opname" element={<StockOpnamePage key="atma-jaya-jkt-opname" hospitalId={16} hospitalName="Atma Jaya Hospital" />} />
          <Route path="/master-data-ikm/size" element={<MasterSize />} />
          <Route path="/master-data-ikm/color" element={<MasterColor />} />
          <Route path="/master-data-ikm/material" element={<MasterMaterial />} />
          <Route path="/master-data-ikm/category" element={<MasterLinenCategory />} />
          <Route path="/master-data-ikm/vendor" element={<MasterVendorIKM />} />
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
          <Route path="/linen-rewash-ikm" element={<RewashLinen />} />
          <Route path="/leader-daily-report" element={<LeaderDailyReport />} />
          <Route path="/kasbon-pinjaman" element={<KasbonPinjaman />} />
          <Route path="/absensi-manajemen-ikm" element={<AbsensiManajemen />} />
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

        {/* ── CSAT & NPS — Result of Our Work ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/result-of-our-work"]}>
              <CsAtNps />
            </ProtectedRoute>
          }
        >
          <Route path="/result-of-our-work" element={<Navigate to="/result-of-our-work/waschen" replace />} />
          <Route path="/result-of-our-work/waschen" element={<CsAtWaschen />} />
          <Route path="/result-of-our-work/cleanox" element={<CsAtCleanox />} />
        </Route>

        {/* ── B2B Alora Group ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/event-b2b-alora"]}>
              <B2BAlora />
            </ProtectedRoute>
          }
        >
          <Route path="/event-b2b-alora" element={<B2bKoperasiDashboard />} />
          <Route path="/event-b2b-alora/customer" element={<B2bKoperasiCustomer />} />
          <Route path="/event-b2b-alora/haji" element={<B2bHajiDashboard />} />
        </Route>

        {/* ── Know Your Employee ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/know-your-employee"]}>
              <KnowYourEmployee />
            </ProtectedRoute>
          }
        >
          <Route path="/know-your-employee" element={<EmployeeMood />} />
          <Route path="/know-your-employee/dashboard" element={<DashboardKYE />} />
          <Route path="/know-your-employee/burnout" element={<AnalisisBurnout />} />
        </Route>

        {/* ── Cleanox Management System ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/cleanox-management-system"]}>
              <CleanoxManagement />
            </ProtectedRoute>
          }
        >
          <Route path="/cleanox-management-system" element={<EmployeeCleanox />} />
          <Route path="/cleanox-management-system/service" element={<MasterService />} />
          <Route path="/cleanox-management-system/category" element={<MasterCategory />} />
          <Route path="/cleanox-management-system/kpi" element={<KpiProduksiCleanox />} />
          <Route path="/cleanox-management-system/:id" element={<EmployeeCleanoxDetail />} />
        </Route>

        {/* ── My Waschen POS ── */}
        <Route
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/my-waschen"]}>
              <MyWaschen />
            </ProtectedRoute>
          }
        >
          <Route path="/my-waschen" element={<DashboardPage />} />
          <Route path="/my-waschen/admin-laporan" element={<AdminLaporanPage />} />
          <Route path="/my-waschen/admin-settings" element={<AdminSettingsPage />} />
          <Route path="/my-waschen/admin-target" element={<AdminTargetPage />} />
          <Route path="/my-waschen/admin-target-detail" element={<AdminTargetDetailPage />} />
          <Route path="/my-waschen/admin-promo-sla-stok" element={<AdminPromoSlaStokPage />} />
          <Route path="/my-waschen/admin-period-close" element={<AdminPeriodClosePage />} />
          <Route path="/my-waschen/admin-shift-report" element={<AdminShiftReportPage />} />
          <Route path="/my-waschen/admin-kas-overview" element={<AdminKasOverviewPage />} />
          <Route path="/my-waschen/admin-sub-session" element={<AdminSubSessionPage />} />
          <Route path="/my-waschen/approval-center" element={<ApprovalCenterPage />} />
          <Route path="/my-waschen/approval" element={<ApprovalPage />} />
          <Route path="/my-waschen/purchase-requests" element={<PurchaseRequestsPage />} />
          <Route path="/my-waschen/purchase-request-approval" element={<PurchaseRequestApprovalPage />} />
          <Route path="/my-waschen/setor-approval" element={<SetorApprovalPage />} />
          <Route path="/my-waschen/cash-deposit-approval" element={<CashDepositApproval />} />
          <Route path="/my-waschen/kas-approval" element={<KasApprovalPage />} />
          <Route path="/my-waschen/birthday" element={<BirthdayPage />} />
          <Route path="/my-waschen/comparison-report" element={<ComparisonReportPage />} />
          <Route path="/my-waschen/forecast" element={<ForecastPage />} />
          <Route path="/my-waschen/general-report" element={<GeneralReportPage />} />
          <Route path="/my-waschen/error-dashboard" element={<ErrorDashboardPage />} />
          <Route path="/my-waschen/info-outlet" element={<InfoOutletPage />} />
          <Route path="/my-waschen/kelola-layanan-outlet" element={<KelolaLayananOutletPage />} />
          <Route path="/my-waschen/manajemen-layanan" element={<ManajemenLayananPage />} />
          <Route path="/my-waschen/manajemen-outlet" element={<ManajemenOutletPage />} />
          <Route path="/my-waschen/manajemen-user" element={<ManajemenUserPage />} />
          <Route path="/my-waschen/inventory-master" element={<InventoryMasterPage />} />
          <Route path="/my-waschen/all-outlet-stocks" element={<AllOutletStocksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}