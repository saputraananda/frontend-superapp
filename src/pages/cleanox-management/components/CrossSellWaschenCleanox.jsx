import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import {
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineFunnel,
  HiOutlineArrowDownTray,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCalendar,
  HiOutlineTag,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlinePhone,
  HiOutlineInformationCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineMapPin,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineUserPlus,
  HiOutlineClipboardDocumentCheck,
  HiOutlineChartBar,
  HiOutlineCheckBadge,
  HiOutlineArrowRight,
  HiOutlineDocumentDuplicate,
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const OUTLET_OPTIONS = [
  "Citra Gran",
  "Sentra Eropa",
  "Raffles Hills",
  "Legenda Wisata",
  "Canadian",
];

const SERVICE_TAG_OPTIONS = [
  "Cuci Sofa",
  "Cuci Kasur",
  "Cuci Karpet",
  "Cuci Gorden",
  "Cuci Kursi",
  "Stroller / Car Seat",
  "General Cleaning",
  "Deep Cleaning",
  "Sepatu / Bag Spa",
  "Lainnya",
];

const POSITION_OPTIONS = [
  "Frontliner",
  "Delivery",
  "Leader",
  "Admin",
  "Laundry Operator",
];

const STATUS_OPTIONS = [
  { value: "belum_dihubungi", label: "Belum Dihubungi", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "sudah_dihubungi", label: "Sudah Dihubungi", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "follow_up_ulang", label: "Follow up Ulang", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "closing", label: "Closing / Transaksi", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "batal", label: "Batal / Tidak Tertarik", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

function formatDateIndo(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

function cleanPhoneNumber(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  return digits;
}

export default function CrossSellWaschenCleanox() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [activeTab, setActiveTab] = useState("input"); // 'input' | 'data' | 'kpi' | 'staff'

  // Master Staff & Target Data
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [targetPerStaff, setTargetPerStaff] = useState(10);
  const [savingTarget, setSavingTarget] = useState(false);

  // Recommendations Data
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [filterOutlet, setFilterOutlet] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // KPI Data
  const [kpiData, setKpiData] = useState(null);
  const [loadingKpi, setLoadingKpi] = useState(false);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FORM INPUT STATE (TAB 1)
  // ───────────────────────────────────────────────────────────────────────────
  const [formDate, setFormDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [formOutlet, setFormOutlet] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formServices, setFormServices] = useState([]);
  const [formNotes, setFormNotes] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);

  // Staff Progress Card State (Tab 1 Right Panel)
  const [staffProgress, setStaffProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // EDIT MODAL STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [editModalItem, setEditModalItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal State
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Export to POS State
  const [exportingId, setExportingId] = useState(null);

  // ───────────────────────────────────────────────────────────────────────────
  // MASTER STAFF FORM STATE (TAB 4)
  // ───────────────────────────────────────────────────────────────────────────
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPosition, setNewStaffPosition] = useState("Frontliner");
  const [newStaffOutlet, setNewStaffOutlet] = useState("Citra Gran");
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [editStaffModal, setEditStaffModal] = useState(null);
  const [staffFilterOutlet, setStaffFilterOutlet] = useState("all");
  const [staffFilterActive, setStaffFilterActive] = useState("all");

  // ───────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ───────────────────────────────────────────────────────────────────────────
  const fetchStaffList = async () => {
    try {
      setLoadingStaff(true);
      const res = await api("/cleanox/cross-sell/staff");
      setStaffList(res.staff || []);
    } catch (err) {
      console.error("Gagal load staff:", err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoadingRecs(true);
      const params = new URLSearchParams({
        year: String(selectedYear),
        month: String(selectedMonth),
      });
      if (filterOutlet !== "all") params.append("outlet", filterOutlet);
      if (filterStaff !== "all") params.append("staff_id", filterStaff);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await api(`/cleanox/cross-sell/recommendations?${params.toString()}`);
      setRecommendations(res.recommendations || []);
    } catch (err) {
      console.error("Gagal load rekomendasi:", err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const fetchKpi = async () => {
    try {
      setLoadingKpi(true);
      const res = await api(`/cleanox/cross-sell/kpi?year=${selectedYear}&month=${selectedMonth}`);
      setKpiData(res);
      if (res.target_per_staff) {
        setTargetPerStaff(res.target_per_staff);
      }
    } catch (err) {
      console.error("Gagal load KPI:", err);
    } finally {
      setLoadingKpi(false);
    }
  };

  const fetchTargetConfig = async () => {
    try {
      const res = await api(`/cleanox/cross-sell/target?year=${selectedYear}&month=${selectedMonth}`);
      if (res.target_per_staff) {
        setTargetPerStaff(res.target_per_staff);
      }
    } catch (err) {
      console.error("Gagal load target:", err);
    }
  };

  const fetchStaffProgress = async (staffId) => {
    if (!staffId) {
      setStaffProgress(null);
      return;
    }
    try {
      setLoadingProgress(true);
      const res = await api(`/cleanox/cross-sell/staff/${staffId}/progress?year=${selectedYear}&month=${selectedMonth}`);
      setStaffProgress(res);
    } catch (err) {
      console.error("Gagal load progress staff:", err);
      setStaffProgress(null);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStaffList();
    fetchTargetConfig();
  }, []);

  // Reload when month or year changes
  useEffect(() => {
    fetchRecommendations();
    fetchKpi();
    fetchTargetConfig();
    if (formStaffId) {
      fetchStaffProgress(formStaffId);
    }
  }, [selectedYear, selectedMonth]);

  // Reload data tab when filters change
  useEffect(() => {
    if (activeTab === "data") {
      fetchRecommendations();
    }
  }, [filterOutlet, filterStaff, filterStatus, searchQuery, activeTab]);

  // Refresh progress when form staff changes
  useEffect(() => {
    if (formStaffId) {
      fetchStaffProgress(formStaffId);
    } else {
      setStaffProgress(null);
    }
  }, [formStaffId]);

  // When outlet is selected in form, if current staff doesn't belong to it, reset staff selection
  const activeStaffForForm = useMemo(() => {
    const list = staffList.filter((s) => s.is_active);
    if (!formOutlet) return list;
    return list.filter((s) => s.outlet === formOutlet);
  }, [staffList, formOutlet]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 1: FORM ACTIONS
  // ───────────────────────────────────────────────────────────────────────────
  const handleToggleService = (service) => {
    setFormServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSaveRecommendation = async (e) => {
    e.preventDefault();
    if (!formDate) return showToast("Tanggal chat wajib diisi", "error");
    if (!formOutlet) return showToast("Cabang asal customer wajib dipilih", "error");
    if (!formStaffId) return showToast("Staff yang merekomendasikan wajib dipilih", "error");
    if (!formCustomerName.trim()) return showToast("Nama customer wajib diisi", "error");
    if (!formCustomerPhone.trim()) return showToast("Nomor WA customer wajib diisi", "error");
    if (formServices.length === 0) return showToast("Pilih minimal 1 layanan yang diminati", "error");

    try {
      setSubmittingForm(true);
      const payload = {
        chat_date: formDate,
        outlet: formOutlet,
        staff_id: Number(formStaffId),
        customer_name: formCustomerName.trim(),
        customer_phone: formCustomerPhone.trim(),
        interested_services: formServices,
        notes: formNotes.trim() || null,
      };

      await api("/cleanox/cross-sell/recommendations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showToast("Rekomendasi berhasil dicatat!", "success");
      // Reset form
      setFormCustomerName("");
      setFormCustomerPhone("");
      setFormServices([]);
      setFormNotes("");

      // Refresh progress & data
      fetchStaffProgress(formStaffId);
      fetchRecommendations();
      fetchKpi();
    } catch (err) {
      showToast(err.message || "Gagal menyimpan rekomendasi", "error");
    } finally {
      setSubmittingForm(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 2: DATA ACTIONS (EXPORT TO POS, STATUS CHANGE, SALIN EXCEL)
  // ───────────────────────────────────────────────────────────────────────────
  const handleUpdateStatusInline = async (recId, newStatus) => {
    try {
      await api(`/cleanox/cross-sell/recommendations/${recId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ follow_up_status: newStatus }),
      });
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, follow_up_status: newStatus } : r))
      );
      showToast("Status follow-up diperbarui!", "success");
      fetchKpi();
    } catch (err) {
      showToast(err.message || "Gagal mengubah status", "error");
    }
  };

  const handleExportToPos = async (rec) => {
    if (rec.is_in_pos) return;
    try {
      setExportingId(rec.id);
      const res = await api(`/cleanox/cross-sell/recommendations/${rec.id}/export-to-pos`, {
        method: "POST",
      });
      setRecommendations((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, is_in_pos: 1 } : r))
      );
      showToast(res.message || "Customer berhasil ditambahkan ke Cleanox POS!", "success");
      fetchKpi();
    } catch (err) {
      showToast(err.message || "Gagal menambahkan customer ke POS", "error");
    } finally {
      setExportingId(null);
    }
  };

  const handleCopyDataToClipboard = () => {
    if (!recommendations.length) {
      return showToast("Tidak ada data untuk disalin", "error");
    }
    const headers = [
      "No",
      "Tgl Chat",
      "Cabang",
      "Staff",
      "Jabatan",
      "Customer",
      "Nomor WA",
      "Layanan Diminati",
      "Status Follow-up",
      "Masuk POS",
      "Catatan",
    ];

    const rows = recommendations.map((r, idx) => [
      idx + 1,
      r.chat_date?.slice(0, 10),
      r.outlet,
      r.staff_name,
      r.staff_position || "Frontliner",
      r.customer_name,
      r.customer_phone,
      Array.isArray(r.interested_services) ? r.interested_services.join(", ") : "",
      STATUS_OPTIONS.find((s) => s.value === r.follow_up_status)?.label || r.follow_up_status,
      r.is_in_pos ? "Sudah di POS" : "Belum",
      (r.notes || "").replace(/\t|\n/g, " "),
    ]);

    const tsvContent = [
      headers.join("\t"),
      ...rows.map((row) => row.join("\t")),
    ].join("\n");

    navigator.clipboard.writeText(tsvContent).then(
      () => {
        showToast("✓ Data berhasil disalin ke clipboard! Siap di-paste ke Excel / Spreadsheet.", "success");
      },
      () => {
        showToast("Gagal menyalin data ke clipboard", "error");
      }
    );
  };

  const handleCopyKpiStaffToClipboard = () => {
    if (!kpiData?.staff_kpi?.length) return showToast("Tidak ada data KPI", "error");
    const headers = ["Staff", "Posisi", "Ruko", "Rekomendasi", "Target", "Progres (%)", "Status KPI", "Closing"];
    const rows = kpiData.staff_kpi.map((s) => [
      s.name,
      s.position,
      s.outlet,
      s.count,
      s.target,
      `${s.progress_percent}%`,
      s.is_reached ? "Tercapai" : `Kurang ${s.remaining}`,
      s.closing_count,
    ]);
    const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    navigator.clipboard.writeText(tsv).then(() => {
      showToast("✓ Rekap KPI Staff berhasil disalin ke clipboard!", "success");
    });
  };

  const handleCopyKpiOutletToClipboard = () => {
    if (!kpiData?.outlet_kpi?.length) return showToast("Tidak ada data cabang", "error");
    const headers = ["Cabang Asal", "Rekomendasi", "Staff Aktif", "Staff Tercapai", "Closing", "Conversion Rate (%)"];
    const rows = kpiData.outlet_kpi.map((o) => [
      o.outlet,
      o.total_recommendations,
      o.active_staff_count,
      o.staff_reached_target_count,
      o.closing_count,
      `${o.conversion_rate}%`,
    ]);
    const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    navigator.clipboard.writeText(tsv).then(() => {
      showToast("✓ Rekap Cabang berhasil disalin ke clipboard!", "success");
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 3: TARGET KPI SAVE
  // ───────────────────────────────────────────────────────────────────────────
  const handleSaveTarget = async () => {
    try {
      setSavingTarget(true);
      await api("/cleanox/cross-sell/target", {
        method: "POST",
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          target_per_staff: Number(targetPerStaff),
        }),
      });
      showToast(`Target ${targetPerStaff} rekomendasi/staff untuk ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} berhasil disimpan!`, "success");
      fetchKpi();
      if (formStaffId) fetchStaffProgress(formStaffId);
    } catch (err) {
      showToast(err.message || "Gagal menyimpan target", "error");
    } finally {
      setSavingTarget(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 4: MASTER STAFF ACTIONS
  // ───────────────────────────────────────────────────────────────────────────
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return showToast("Nama staff wajib diisi", "error");
    if (!newStaffOutlet) return showToast("Outlet wajib dipilih", "error");

    try {
      setSubmittingStaff(true);
      await api("/cleanox/cross-sell/staff", {
        method: "POST",
        body: JSON.stringify({
          name: newStaffName.trim(),
          position: newStaffPosition,
          outlet: newStaffOutlet,
        }),
      });
      showToast("Staff Waschen berhasil ditambahkan!", "success");
      setNewStaffName("");
      fetchStaffList();
    } catch (err) {
      showToast(err.message || "Gagal menambahkan staff", "error");
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleToggleStaff = async (staff) => {
    const nextStatus = staff.is_active ? 0 : 1;
    try {
      await api(`/cleanox/cross-sell/staff/${staff.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextStatus }),
      });
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, is_active: nextStatus } : s))
      );
      showToast(nextStatus ? "Staff diaktifkan" : "Staff dinonaktifkan", "success");
    } catch (err) {
      showToast(err.message || "Gagal mengubah status staff", "error");
    }
  };

  const handleSaveStaffEdit = async (e) => {
    e.preventDefault();
    if (!editStaffModal?.name?.trim()) return showToast("Nama staff wajib diisi", "error");
    try {
      await api(`/cleanox/cross-sell/staff/${editStaffModal.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editStaffModal.name.trim(),
          position: editStaffModal.position,
          outlet: editStaffModal.outlet,
        }),
      });
      showToast("Data staff berhasil diperbarui!", "success");
      setEditStaffModal(null);
      fetchStaffList();
    } catch (err) {
      showToast(err.message || "Gagal memperbarui staff", "error");
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // EDIT & DELETE RECOMMENDATION MODAL
  // ───────────────────────────────────────────────────────────────────────────
  const openEditModal = (rec) => {
    setEditModalItem(rec);
    setEditForm({
      chat_date: rec.chat_date?.slice(0, 10),
      outlet: rec.outlet,
      staff_id: rec.staff_id,
      customer_name: rec.customer_name,
      customer_phone: rec.customer_phone,
      interested_services: Array.isArray(rec.interested_services) ? [...rec.interested_services] : [],
      notes: rec.notes || "",
      follow_up_status: rec.follow_up_status,
    });
  };

  const handleSaveEditRecommendation = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      await api(`/cleanox/cross-sell/recommendations/${editModalItem.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      showToast("Data rekomendasi berhasil diperbarui!", "success");
      setEditModalItem(null);
      fetchRecommendations();
      fetchKpi();
    } catch (err) {
      showToast(err.message || "Gagal memperbarui rekomendasi", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRecommendation = async () => {
    if (!deleteModalItem) return;
    try {
      setDeleting(true);
      await api(`/cleanox/cross-sell/recommendations/${deleteModalItem.id}`, {
        method: "DELETE",
      });
      showToast("Rekomendasi berhasil dihapus", "success");
      setDeleteModalItem(null);
      fetchRecommendations();
      fetchKpi();
    } catch (err) {
      showToast(err.message || "Gagal menghapus rekomendasi", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered staff list in Tab 4
  const filteredStaffList = useMemo(() => {
    return staffList.filter((s) => {
      if (staffFilterOutlet !== "all" && s.outlet !== staffFilterOutlet) return false;
      if (staffFilterActive === "active" && !s.is_active) return false;
      if (staffFilterActive === "inactive" && s.is_active) return false;
      return true;
    });
  }, [staffList, staffFilterOutlet, staffFilterActive]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Toast Notification Banner ── */}
      {toastMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl transition-all",
            toastMessage.type === "success"
              ? "bg-emerald-800 text-white shadow-emerald-900/30"
              : "bg-rose-800 text-white shadow-rose-900/30"
          )}
        >
          {toastMessage.type === "success" ? (
            <HiOutlineCheck className="h-5 w-5 text-emerald-300" />
          ) : (
            <HiOutlineInformationCircle className="h-5 w-5 text-rose-300" />
          )}
          <span>{toastMessage.message}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TOP HEADER: WASCHEN LAUNDRY → CLEANOX & MONTH NAVIGATOR
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-r from-[#152a48] via-[#1b3459] to-[#244372] p-5 sm:p-6 text-white shadow-lg shadow-[#1b3459]/15">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase text-blue-200 backdrop-blur-sm">
                WASCHEN LAUNDRY → CLEANOX
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Rekomendasi Cross-Sell
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100/80 max-w-2xl">
              Dicatat admin Cleanox saat frontliner/delivery Waschen menyetor kontak via chat Minox. Target {targetPerStaff} customer per staff per bulan.
            </p>
          </div>

          {/* Month Selector Navigation */}
          <div className="flex items-center self-start sm:self-center gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur-md border border-white/10">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Bulan sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition"
            >
              <HiOutlineChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-3 text-center">
              <span className="text-sm font-bold text-white tracking-wide">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Bulan berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition"
            >
              <HiOutlineChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 4 Tabs Nav ── */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab("input")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition",
              activeTab === "input"
                ? "bg-white text-[#1b3459] shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <HiOutlinePencilSquare className="h-4 w-4" />
            <span>Input Rekomendasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("data")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition",
              activeTab === "data"
                ? "bg-white text-[#1b3459] shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <HiOutlineDocumentText className="h-4 w-4" />
            <span>Data</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                activeTab === "data" ? "bg-blue-100 text-[#1b3459]" : "bg-white/20 text-white"
              )}
            >
              {recommendations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("kpi")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition",
              activeTab === "kpi"
                ? "bg-white text-[#1b3459] shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <HiOutlineChartBar className="h-4 w-4" />
            <span>Rekap KPI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition",
              activeTab === "staff"
                ? "bg-white text-[#1b3459] shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <HiOutlineUserGroup className="h-4 w-4" />
            <span>Master Staff</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                activeTab === "staff" ? "bg-blue-100 text-[#1b3459]" : "bg-white/20 text-white"
              )}
            >
              {staffList.filter((s) => s.is_active).length}
            </span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 1: INPUT REKOMENDASI (TWO COLUMNS: FORM + PROGRESS CARD)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "input" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Form Input (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-5 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                Form Input Rekomendasi
              </h2>
              <p className="text-xs text-slate-500">
                Diisi saat admin Cleanox menerima chat rekomendasi customer dari staff Waschen
              </p>
            </div>

            <form onSubmit={handleSaveRecommendation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Tanggal chat ke Minox */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal chat ke Minox <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#1b3459] focus:outline-none focus:ring-1 focus:ring-[#1b3459]"
                    />
                  </div>
                </div>

                {/* 2. Cabang asal customer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cabang asal customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formOutlet}
                    onChange={(e) => {
                      setFormOutlet(e.target.value);
                      setFormStaffId("");
                    }}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#1b3459] focus:outline-none focus:ring-1 focus:ring-[#1b3459]"
                  >
                    <option value="">Pilih Cabang Waschen...</option>
                    {OUTLET_OPTIONS.map((outlet) => (
                      <option key={outlet} value={outlet}>
                        {outlet}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Staff yang merekomendasikan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff yang merekomendasikan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#1b3459] focus:outline-none focus:ring-1 focus:ring-[#1b3459]"
                >
                  <option value="">
                    {formOutlet ? `Pilih Staff Waschen (${formOutlet})...` : "Pilih Staff Waschen (Semua Cabang)..."}
                  </option>
                  {activeStaffForForm.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} — {staff.position || "Frontliner"} ({staff.outlet})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 4. Nama customer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama customer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="Nama lengkap customer"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#1b3459] focus:outline-none focus:ring-1 focus:ring-[#1b3459]"
                  />
                </div>

                {/* 5. Nomor WA customer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WA customer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#1b3459] focus:outline-none focus:ring-1 focus:ring-[#1b3459]"
                  />
                </div>
              </div>

              {/* 6. Layanan yang diminati (Multi-select pill tags) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Layanan yang diminati <span className="text-rose-500">*</span>{" "}
                  <span className="text-[11px] font-normal text-slate-400">
                    (Dapat memilih lebih dari satu)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SERVICE_TAG_OPTIONS.map((tag) => {
                    const isSelected = formServices.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleService(tag)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                          isSelected
                            ? "bg-[#1b3459] text-white shadow-sm ring-1 ring-[#1b3459]"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        {isSelected && <HiOutlineCheck className="h-3.5 w-3.5" />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Catatan (opsional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan (opsional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: customer minta dijemput besok pagi, sofa 3 dudukan noda kopi..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#1b3459] focus:outline-none focus:ring-1 focus:ring-[#1b3459]"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b3459] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#1b3459]/20 transition hover:bg-[#152a48] disabled:opacity-50"
                >
                  {submittingForm ? (
                    <>
                      <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineSparkles className="h-4 w-4" />
                      <span>Simpan Rekomendasi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Staff Progress Card (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Progres Staff Terpilih
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>

              {loadingProgress ? (
                <div className="py-12 text-center text-slate-400">
                  <HiOutlineArrowPath className="h-6 w-6 animate-spin mx-auto mb-2 text-[#1b3459]" />
                  <p className="text-xs">Memuat capaian staff...</p>
                </div>
              ) : staffProgress ? (
                <div className="mt-4 space-y-4">
                  {/* Staff Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        {staffProgress.staff?.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {staffProgress.staff?.position || "Frontliner"} · {staffProgress.staff?.outlet}
                      </p>
                    </div>
                    {staffProgress.is_reached ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <HiOutlineCheckBadge className="h-4 w-4 text-emerald-600" />
                        Target Tercapai!
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-[#1b3459]">
                        Target: {staffProgress.target}/bln
                      </span>
                    )}
                  </div>

                  {/* Big Counter & Progress Bar */}
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-[#1b3459]">
                          {staffProgress.count}
                        </span>
                        <span className="text-sm font-semibold text-slate-400">
                          / {staffProgress.target}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-700">
                        {staffProgress.progress_percent}%
                      </span>
                    </div>

                    <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          staffProgress.is_reached ? "bg-emerald-500" : "bg-[#1b3459]"
                        )}
                        style={{ width: `${Math.min(100, staffProgress.progress_percent)}%` }}
                      />
                    </div>

                    <div className="mt-2.5 text-xs text-slate-600">
                      {staffProgress.is_reached ? (
                        <span className="text-emerald-700 font-medium">
                          🎉 Hebat! Target rekomendasi bulan ini sudah terpenuhi.
                        </span>
                      ) : (
                        <span>
                          Butuh <strong className="text-slate-800">{staffProgress.remaining}</strong> rekomendasi lagi untuk capai target bulan ini.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-start gap-2">
                    <HiOutlineInformationCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p>
                      Setiap data yang diinput otomatis terhitung ke dalam KPI bulanan staff Waschen, baik yang sudah closing maupun sedang di-follow up.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400">
                  <HiOutlineUserGroup className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">
                    Pilih Staff Waschen di Form
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kartu ini akan menampilkan progres dan sisa target staff yang dipilih
                  </p>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm text-xs text-slate-600 space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <HiOutlineSparkles className="h-4 w-4 text-amber-500" />
                Alur Integrasi ke POS Cleanox
              </h4>
              <p>
                Setelah data diinput di sini, Anda dapat membuka tab <strong>Data</strong> dan klik tombol <strong>"Tambahkan ke POS"</strong> agar pelanggan otomatis terdaftar di Master Customer Cleanox POS beserta informasi perujuk Waschen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 2: DATA REKOMENDASI (TABLE + FILTER + TAMBAHKAN KE POS + SALIN EXCEL)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "data" && (
        <div className="space-y-4">
          {/* Header Bar Data & Action */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Data Rekomendasi Cross-Sell
                </h2>
                <p className="text-xs text-slate-500">
                  Menampilkan {recommendations.length} rekomendasi pada {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDataToClipboard}
                  disabled={!recommendations.length}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                  title="Salin data tabel ke format Excel / Spreadsheet"
                >
                  <HiOutlineDocumentDuplicate className="h-4 w-4 text-slate-500" />
                  <span>Salin ke Excel</span>
                </button>

                <button
                  type="button"
                  onClick={fetchRecommendations}
                  disabled={loadingRecs}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b3459] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#152a48] disabled:opacity-50"
                >
                  <HiOutlineArrowPath className={cn("h-4 w-4", loadingRecs && "animate-spin")} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
              {/* Filter Cabang */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Cabang Asal
                </label>
                <select
                  value={filterOutlet}
                  onChange={(e) => setFilterOutlet(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#1b3459] focus:outline-none"
                >
                  <option value="all">Semua Cabang</option>
                  {OUTLET_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Staff */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Staff Waschen
                </label>
                <select
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#1b3459] focus:outline-none"
                >
                  <option value="all">Semua Staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.outlet})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Status Follow-up
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#1b3459] focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Pencarian
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nama / no WA / catatan..."
                    className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-1.5 text-xs text-slate-800 focus:border-[#1b3459] focus:outline-none"
                  />
                  <HiOutlineMagnifyingGlass className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Table Data */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3 min-w-[100px]">Tgl Chat</th>
                    <th className="py-3 px-3 min-w-[120px]">Cabang</th>
                    <th className="py-3 px-3 min-w-[140px]">Staff Waschen</th>
                    <th className="py-3 px-3 min-w-[160px]">Customer</th>
                    <th className="py-3 px-3 min-w-[180px]">Layanan Diminati</th>
                    <th className="py-3 px-3 min-w-[160px]">Status Follow-up</th>
                    <th className="py-3 px-3 min-w-[140px] text-center">POS Cleanox</th>
                    <th className="py-3 px-3 min-w-[90px] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingRecs ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <HiOutlineArrowPath className="h-6 w-6 animate-spin mx-auto mb-2 text-[#1b3459]" />
                        <p>Memuat data rekomendasi...</p>
                      </td>
                    </tr>
                  ) : recommendations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <HiOutlineDocumentText className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">Belum ada data rekomendasi</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Gunakan tab <strong>Input Rekomendasi</strong> untuk menambahkan data baru pada bulan ini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    recommendations.map((row, idx) => {
                      const waDigits = cleanPhoneNumber(row.customer_phone);
                      const waUrl = waDigits ? `https://wa.me/${waDigits}` : null;
                      const statusObj = STATUS_OPTIONS.find((s) => s.value === row.follow_up_status);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 text-center font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800">
                            {formatDateIndo(row.chat_date)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                              <HiOutlineMapPin className="h-3 w-3 text-slate-400" />
                              {row.outlet}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{row.staff_name}</div>
                            <div className="text-[11px] text-slate-500">
                              {row.staff_position || "Frontliner"}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{row.customer_name}</div>
                            {waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium mt-0.5"
                                title="Buka Chat WhatsApp"
                              >
                                <HiOutlinePhone className="h-3 w-3" />
                                <span>{row.customer_phone}</span>
                              </a>
                            ) : (
                              <div className="text-[11px] text-slate-500">{row.customer_phone}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(row.interested_services) && row.interested_services.length > 0 ? (
                                row.interested_services.map((svc, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                                  >
                                    {svc}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </div>
                            {row.notes && (
                              <p className="mt-1 text-[11px] text-slate-500 italic max-w-xs truncate" title={row.notes}>
                                "{row.notes}"
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {/* Inline follow-up status selector */}
                            <select
                              value={row.follow_up_status}
                              onChange={(e) => handleUpdateStatusInline(row.id, e.target.value)}
                              className={cn(
                                "rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none transition cursor-pointer",
                                statusObj?.color || "bg-slate-100 border-slate-200 text-slate-700"
                              )}
                            >
                              {STATUS_OPTIONS.map((st) => (
                                <option key={st.value} value={st.value}>
                                  {st.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* ACTION: TAMBAHKAN KE POS */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {row.is_in_pos ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800"
                                title="Sudah terdaftar di Master Customer Cleanox POS dengan referral Waschen"
                              >
                                <HiOutlineCheckBadge className="h-3.5 w-3.5 text-emerald-600" />
                                Masuk POS
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleExportToPos(row)}
                                disabled={exportingId === row.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                                title="Masukkan customer ini ke master customer POS dengan referral Waschen"
                              >
                                {exportingId === row.id ? (
                                  <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <HiOutlineUserPlus className="h-3.5 w-3.5" />
                                )}
                                <span>+ Tambahkan ke POS</span>
                              </button>
                            )}
                          </td>

                          {/* Action Buttons: Edit & Delete */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(row)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                title="Edit Rekomendasi"
                              >
                                <HiOutlinePencilSquare className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteModalItem(row)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                title="Hapus Rekomendasi"
                              >
                                <HiOutlineTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 3: REKAP KPI (4 METRIC CARDS + 2 TABLES + TARGET SETTING)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "kpi" && (
        <div className="space-y-6">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Card 1: Staff Mencapai Target */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Staff Mencapai Target
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1b3459]">
                  {kpiData?.summary?.staff_reached_target || 0}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / {kpiData?.summary?.total_staff || staffList.filter((s) => s.is_active).length} staff
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Target {targetPerStaff} per staff/bln</p>
            </div>

            {/* Card 2: Total Rekomendasi */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Rekomendasi
              </span>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {kpiData?.summary?.total_recommendations || 0}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Semua kontak disetor bulan ini</p>
            </div>

            {/* Card 3: Rata-rata per Staff */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Rata-Rata per Staff
              </span>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {kpiData?.summary?.avg_per_staff ? kpiData.summary.avg_per_staff.toFixed(1) : "0,0"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Rekomendasi per staff aktif</p>
            </div>

            {/* Card 4: Sudah Closing & Sisa Hari */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sudah Closing
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                  {kpiData?.summary?.total_closing || 0}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  · Sisa {kpiData?.summary?.remaining_days_in_month ?? "-"} hari di bulan ini
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Masuk POS: {kpiData?.summary?.total_exported_to_pos || 0} customer
              </p>
            </div>
          </div>

          {/* Table 1: KPI per Staff Waschen */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  KPI per Staff Waschen · {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </h3>
                <p className="text-xs text-slate-500">
                  Pencapaian rekomendasi staff terhadap target bulanan
                </p>
              </div>

              {/* Target Setting Input & Copy Button */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                  <span className="font-semibold text-slate-600">Target/bln:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={targetPerStaff}
                    onChange={(e) => setTargetPerStaff(e.target.value)}
                    className="w-12 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-center font-bold text-[#1b3459] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTarget}
                    disabled={savingTarget}
                    className="rounded bg-[#1b3459] px-2 py-0.5 font-semibold text-white hover:bg-[#152a48] transition"
                  >
                    {savingTarget ? "..." : "Simpan"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyKpiStaffToClipboard}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  <HiOutlineDocumentDuplicate className="h-4 w-4 text-slate-500" />
                  <span>Salin ke Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3 min-w-[140px]">Staff</th>
                    <th className="py-3 px-3 min-w-[100px]">Posisi</th>
                    <th className="py-3 px-3 min-w-[110px]">Ruko / Outlet</th>
                    <th className="py-3 px-3 min-w-[110px]">Rekomendasi</th>
                    <th className="py-3 px-3 min-w-[140px]">Progres</th>
                    <th className="py-3 px-3 min-w-[130px]">Status KPI</th>
                    <th className="py-3 px-3 min-w-[80px] text-center">Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingKpi ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <HiOutlineArrowPath className="h-6 w-6 animate-spin mx-auto mb-1 text-[#1b3459]" />
                        <p>Memuat rekap KPI staff...</p>
                      </td>
                    </tr>
                  ) : !kpiData?.staff_kpi?.length ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada staff Waschen terdaftar
                      </td>
                    </tr>
                  ) : (
                    kpiData.staff_kpi.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {staff.name}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {staff.position || "Frontliner"}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {staff.outlet}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900">{staff.count}</span>
                          <span className="text-slate-400"> / {staff.target}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  staff.is_reached ? "bg-emerald-500" : "bg-[#1b3459]"
                                )}
                                style={{ width: `${Math.min(100, staff.progress_percent)}%` }}
                              />
                            </div>
                            <span className="font-semibold text-slate-700 text-[11px]">
                              {staff.progress_percent}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {staff.is_reached ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Tercapai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                              <span className="h-2 w-2 rounded-full bg-amber-400" />
                              Berjalan · kurang {staff.remaining}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">
                          {staff.closing_count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Ringkasan per Cabang Asal Customer */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Per Cabang Asal Customer
                </h3>
                <p className="text-xs text-slate-500">
                  Rekapitulasi rekomendasi dan kontribusi staff berdasarkan ruko Waschen
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyKpiOutletToClipboard}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <HiOutlineDocumentDuplicate className="h-4 w-4 text-slate-500" />
                <span>Salin ke Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3 min-w-[140px]">Cabang</th>
                    <th className="py-3 px-3 min-w-[110px]">Rekomendasi</th>
                    <th className="py-3 px-3 min-w-[110px]">Staff Aktif</th>
                    <th className="py-3 px-3 min-w-[120px]">Staff Tercapai</th>
                    <th className="py-3 px-3 min-w-[90px]">Closing</th>
                    <th className="py-3 px-3 min-w-[120px]">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {!kpiData?.outlet_kpi?.length ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Belum ada data cabang
                      </td>
                    </tr>
                  ) : (
                    kpiData.outlet_kpi.map((row) => (
                      <tr key={row.outlet} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {row.outlet}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {row.total_recommendations}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {row.active_staff_count} orang
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-600">
                          {row.staff_reached_target_count} orang
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {row.closing_count}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {row.conversion_rate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footnote */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500">
            <p>
              💡 <strong>Catatan:</strong> KPI dihitung dari tanggal chat ke Minox. Semua rekomendasi yang tercatat dihitung, apa pun status follow-up-nya. Status follow-up hanya informasi untuk tim Cleanox.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 4: MASTER STAFF WASCHEN (TWO COLUMNS: LIST + ADD FORM)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "staff" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Staff List (7-8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Daftar Staff Waschen
                </h3>
                <p className="text-xs text-slate-500">
                  {staffList.filter((s) => s.is_active).length} staff aktif dari {staffList.length} total staff
                </p>
              </div>

              {/* Filters for staff list */}
              <div className="flex items-center gap-2">
                <select
                  value={staffFilterOutlet}
                  onChange={(e) => setStaffFilterOutlet(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Outlet</option>
                  {OUTLET_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>

                <select
                  value={staffFilterActive}
                  onChange={(e) => setStaffFilterActive(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif Saja</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-2.5 px-3">Nama</th>
                    <th className="py-2.5 px-3">Posisi</th>
                    <th className="py-2.5 px-3">Ruko / Outlet</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingStaff ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <HiOutlineArrowPath className="h-6 w-6 animate-spin mx-auto mb-1 text-[#1b3459]" />
                        <p>Memuat staff Waschen...</p>
                      </td>
                    </tr>
                  ) : filteredStaffList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada staff ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredStaffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {staff.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {staff.position || "Frontliner"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {staff.outlet}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {staff.is_active ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-400">
                              <span className="h-2 w-2 rounded-full bg-slate-300" />
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditStaffModal(staff)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                              title="Edit Data Staff"
                            >
                              <HiOutlinePencilSquare className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStaff(staff)}
                              className={cn(
                                "rounded-lg px-2 py-0.5 text-[11px] font-semibold transition",
                                staff.is_active
                                  ? "text-rose-600 hover:bg-rose-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              )}
                            >
                              {staff.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Tambah Staff Baru (4-5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                Tambah Staff Waschen
              </h3>
              <p className="text-xs text-slate-500">
                Daftarkan frontliner / delivery Waschen yang dapat dipilih pada form rekomendasi
              </p>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama staff <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#1b3459] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Posisi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStaffPosition}
                  onChange={(e) => setNewStaffPosition(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#1b3459] focus:outline-none"
                >
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ruko / outlet <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStaffOutlet}
                  onChange={(e) => setNewStaffOutlet(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#1b3459] focus:outline-none"
                >
                  {OUTLET_OPTIONS.map((outlet) => (
                    <option key={outlet} value={outlet}>
                      {outlet}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b3459] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#152a48] disabled:opacity-50"
                >
                  {submittingStaff ? (
                    <>
                      <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineUserPlus className="h-4 w-4" />
                      <span>Tambah Staff</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                <p>
                  ℹ️ <strong>Tips:</strong> Staff yang resign cukup dinonaktifkan. Riwayat rekomendasinya tetap tersimpan untuk rekap bulan-bulan sebelumnya.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL: EDIT REKOMENDASI
      ═══════════════════════════════════════════════════════════════════════════ */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit Data Rekomendasi
              </h3>
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRecommendation} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Chat</label>
                  <input
                    type="date"
                    value={editForm.chat_date || ""}
                    onChange={(e) => setEditForm({ ...editForm, chat_date: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cabang</label>
                  <select
                    value={editForm.outlet || ""}
                    onChange={(e) => setEditForm({ ...editForm, outlet: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    {OUTLET_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Waschen</label>
                <select
                  value={editForm.staff_id || ""}
                  onChange={(e) => setEditForm({ ...editForm, staff_id: Number(e.target.value) })}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.outlet})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Customer</label>
                  <input
                    type="text"
                    value={editForm.customer_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. WA</label>
                  <input
                    type="tel"
                    value={editForm.customer_phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Layanan Diminati</label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICE_TAG_OPTIONS.map((tag) => {
                    const isSelected = (editForm.interested_services || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const curr = editForm.interested_services || [];
                          const updated = curr.includes(tag) ? curr.filter((x) => x !== tag) : [...curr, tag];
                          setEditForm({ ...editForm, interested_services: updated });
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                          isSelected ? "bg-[#1b3459] text-white" : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Follow-up</label>
                <select
                  value={editForm.follow_up_status || "belum_dihubungi"}
                  onChange={(e) => setEditForm({ ...editForm, follow_up_status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-[#1b3459] px-4 py-2 font-semibold text-white hover:bg-[#152a48] transition disabled:opacity-50"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL: DELETE CONFIRMATION
      ═══════════════════════════════════════════════════════════════════════════ */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mx-auto">
              <HiOutlineTrash className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Hapus Rekomendasi?
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Data rekomendasi dari <strong>{deleteModalItem.staff_name}</strong> untuk customer <strong>{deleteModalItem.customer_name}</strong> akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                disabled={deleting}
                className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteRecommendation}
                disabled={deleting}
                className="w-1/2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL: EDIT MASTER STAFF
      ═══════════════════════════════════════════════════════════════════════════ */}
      {editStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit Staff Waschen
              </h3>
              <button
                type="button"
                onClick={() => setEditStaffModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Staff</label>
                <input
                  type="text"
                  value={editStaffModal.name || ""}
                  onChange={(e) => setEditStaffModal({ ...editStaffModal, name: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Posisi</label>
                <select
                  value={editStaffModal.position || "Frontliner"}
                  onChange={(e) => setEditStaffModal({ ...editStaffModal, position: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ruko / Outlet</label>
                <select
                  value={editStaffModal.outlet || "Citra Gran"}
                  onChange={(e) => setEditStaffModal({ ...editStaffModal, outlet: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  {OUTLET_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditStaffModal(null)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1b3459] px-3 py-1.5 font-semibold text-white hover:bg-[#152a48]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
