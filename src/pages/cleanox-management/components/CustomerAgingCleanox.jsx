import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../lib/api";
import {
  HiOutlineBellAlert,
  HiOutlineShieldCheck,
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
  HiCheckCircle,
  HiArrowUturnLeft,
  HiOutlineCheckBadge,
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

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

function formatDateTimeIndo(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 16);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateStr).slice(0, 16);
  }
}

function buildWhatsAppUrl(phone, message, forceDirectWaMe = false) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("620")) digits = "62" + digits.slice(3);
  else if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  const encoded = encodeURIComponent((message || "").trim());

  if (forceDirectWaMe) {
    return `https://wa.me/${digits}?text=${encoded}`;
  }

  // Jika mobile browser, gunakan wa.me agar langsung memicu app WhatsApp.
  // Jika desktop / PC CS, gunakan web.whatsapp.com agar langsung ke chat WhatsApp Web
  // tanpa layar perantara api.whatsapp dan mencegah bug redirect Meta yang merusak emoji.
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    return `https://wa.me/${digits}?text=${encoded}`;
  }
  return `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}`;
}

function getItemNoun(categoryKey, serviceName) {
  const k = (categoryKey || "").toLowerCase();
  const s = (serviceName || "").toLowerCase();

  if (k.includes("tas") || s.includes("tas")) return "tas";
  if (k.includes("sepatu") || s.includes("sepatu")) return "sepatu";
  if (k.includes("kasur") || s.includes("kasur") || s.includes("bed") || s.includes("matras") || s.includes("springbed")) return "kasur";
  if (k.includes("sofa") || s.includes("sofa") || s.includes("kursi") || k.includes("deep_clean_sofa_kursi")) return "sofa & kursi";
  if (k.includes("bantal") || s.includes("bantal") || s.includes("guling")) return "bantal & guling";
  if (k.includes("sajadah") || s.includes("sajadah")) return "sajadah";
  if (k.includes("stroller") || s.includes("stroller") || s.includes("baby")) return "stroller";
  if (k.includes("karpet") || s.includes("karpet") || s.includes("carpet")) return "karpet";
  if (k.includes("gordyn") || s.includes("gordyn") || s.includes("vitrase")) return "gordyn & vitrase";
  if (k.includes("headboard") || s.includes("headboard") || s.includes("dipan")) return "headboard";
  if (k.includes("mobil") || s.includes("mobil") || s.includes("interior")) return "interior mobil";
  if (k.includes("koper") || s.includes("koper")) return "koper";
  if (k.includes("general") || s.includes("general cleaning")) return "ruangan";
  return "barang";
}

export default function CustomerAgingCleanox() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    reminder: 0,
    safe: 0,
    crossSelling: 0,
    reminded: 0,
    unreminded: 0,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Main Filter Tab:
  // 'unreminded' (Belum Kirim Pesan) | 'reminded' (Sudah Kirim Pesan) | 'all_reminder' | 'safe' | 'cross_selling' | 'all'
  const [activeTab, setActiveTab] = useState("all");

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("aging_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [pagination, setPagination] = useState({ totalRecords: 0, totalPages: 1 });

  // Detail & WA Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waTargetItem, setWaTargetItem] = useState(null);
  const [customWaMessage, setCustomWaMessage] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    document.title = "Aging & Reminder Layanan Cleanox | SuperApp";
    loadCategories();
  }, []);

  // Kunci scroll body & dukung tombol Escape saat modal terbuka
  useEffect(() => {
    const isAnyModalOpen = waModalOpen || Boolean(selectedCustomer);
    if (!isAnyModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (waModalOpen) setWaModalOpen(false);
        if (selectedCustomer) setSelectedCustomer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [waModalOpen, selectedCustomer]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadCategories = async () => {
    try {
      const res = await api("/cleanox/customer-aging/categories");
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.warn("Gagal load kategori aging:", err);
    }
  };

  // Map activeTab to query params for backend
  const getFilterParams = () => {
    let statusParam = "all";
    let reminderStatusParam = "all";

    if (activeTab === "unreminded") {
      statusParam = "reminder";
      reminderStatusParam = "unreminded";
    } else if (activeTab === "reminded") {
      statusParam = "all";
      reminderStatusParam = "reminded";
    } else if (activeTab === "all_reminder") {
      statusParam = "reminder";
      reminderStatusParam = "all";
    } else if (activeTab === "safe") {
      statusParam = "safe";
      reminderStatusParam = "all";
    } else if (activeTab === "cross_selling") {
      statusParam = "cross_selling";
      reminderStatusParam = "all";
    }

    return { statusParam, reminderStatusParam };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { statusParam, reminderStatusParam } = getFilterParams();

      const queryParams = new URLSearchParams({
        search: search.trim(),
        status: statusParam,
        reminderStatus: reminderStatusParam,
        category: categoryFilter,
        sortBy,
        page: String(page),
        pageSize: String(pageSize),
      });

      const res = await api(`/cleanox/customer-aging?${queryParams.toString()}`);
      if (res.success) {
        setData(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        throw new Error(res.message || "Gagal memuat data aging pelanggan");
      }
    } catch (err) {
      console.error("Error fetching aging data:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, categoryFilter, sortBy, page, pageSize]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  // Generate Default WA CRM Template
  const generateWaMessage = (item) => {
    if (!item) return "";
    const rawName = (item.customer_name || "").trim();
    // Bersihkan sebutan jika nama pelanggan sudah diawali kata sapaan
    const cleanName = rawName.replace(/^(kakak|kak|ibu|bapak|pak)\s+/i, "").trim();
    const displayName = cleanName ? `Kak ${cleanName}` : (rawName ? `Kak ${rawName}` : "Kakak");
    const serviceName = item.service_name || item.category_label || "layanan";

    if (item.is_cross_selling || (item.category_key || "").toLowerCase().includes("koper")) {
      return (
        `Halo ${displayName}! ☺️\n\n` +
        `Terima kasih sudah mempercayakan perawatan perlengkapan Kakak di Cleanox🤍\n\n` +
        `Sebagai informasi, Cleanox juga menyediakan layanan perawatan berkala untuk Koper agar selalu bersih, higienis, dan siap menemani perjalanan Kakak berikutnya ✨\n\n` +
        `Apakah ${displayName} mau Minox bantu jadwalkan penjemputan dan perawatan kopernya?🥰🙏🏻`
      );
    }

    const itemNoun = getItemNoun(item.category_key, item.service_name);
    const thresholdDays = item.threshold_days || 75;

    return (
      `Halo ${displayName}! ☺️\n\n` +
      `Terima kasih sudah mempercayakan ${serviceName} Kakak di Cleanox🤍\n\n` +
      `Untuk menjaga kebersihan, kenyamanan, dan kondisi ${itemNoun} tetap optimal, perawatan berkala disarankan setiap ${thresholdDays} hari. Saat ini sudah waktunya untuk melakukan perawatan kembali ✨\n\n` +
      `Apakah ${displayName} mau Minox bantu jadwalkan penjemputan dan perawatan kembali?🥰🙏🏻`
    );
  };

  const handleOpenWaModal = (item) => {
    setWaTargetItem(item);
    setCustomWaMessage(generateWaMessage(item));
    setWaModalOpen(true);
  };

  // Kirim WhatsApp dan langsung otomatis mencatat reminder ke database
  const handleSendWa = async (forceWaMe = false) => {
    if (!waTargetItem) return;
    const phone = waTargetItem.normalized_phone || waTargetItem.customer_phone;
    const url = buildWhatsAppUrl(phone, customWaMessage, forceWaMe);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    const nowISO = new Date().toISOString();

    // Catat log reminder ke backend
    try {
      await api("/cleanox/customer-aging/remind", {
        method: "POST",
        body: JSON.stringify({
          customer_phone: waTargetItem.customer_phone,
          customer_name: waTargetItem.customer_name,
          reference_no: waTargetItem.reference_no,
          category_key: waTargetItem.category_key,
          service_name: waTargetItem.service_name,
          channel: "WhatsApp",
          notes: "Terkirim via SuperApp CRM WhatsApp",
        }),
      });

      // Update state data lokal secara instan agar tabel langsung berubah
      setData((prev) =>
        prev.map((row) =>
          (row.reference_no === waTargetItem.reference_no && row.category_key === waTargetItem.category_key) ||
          (row.customer_phone === waTargetItem.customer_phone && row.category_key === waTargetItem.category_key)
            ? {
                ...row,
                is_reminded: true,
                reminded_at: nowISO,
                reminded_by: "CS Cleanox",
                reminder_channel: "WhatsApp",
                reminder_count: (row.reminder_count || 0) + 1,
              }
            : row
        )
      );

      // Update stats agregat secara instan
      setStats((prev) => ({
        ...prev,
        reminded: (prev.reminded || 0) + (waTargetItem.is_reminded ? 0 : 1),
        unreminded: waTargetItem.is_reminded ? prev.unreminded : Math.max(0, (prev.unreminded || 0) - 1),
      }));

      showToast(`✅ Pesan WhatsApp terbuka & status ${waTargetItem.customer_name} berhasil ditandai "Sudah Kirim Pesan"!`);
    } catch (err) {
      console.error("Gagal mencatat log reminder:", err);
      showToast("⚠️ WhatsApp terbuka, namun pencatatan database mengalami kendala: " + err.message);
    }

    setWaModalOpen(false);
  };

  // Toggle manual (Tandai sudah dihubungi / Batal)
  const handleManualToggleRemind = async (item) => {
    if (!item) return;
    const isCurrentlyReminded = item.is_reminded;

    try {
      if (isCurrentlyReminded) {
        // Batal / Reset status
        await api("/cleanox/customer-aging/unremind", {
          method: "POST",
          body: JSON.stringify({
            customer_phone: item.customer_phone,
            category_key: item.category_key,
            reference_no: item.reference_no,
          }),
        });

        setData((prev) =>
          prev.map((row) =>
            (row.reference_no === item.reference_no && row.category_key === item.category_key) ||
            (row.customer_phone === item.customer_phone && row.category_key === item.category_key)
              ? { ...row, is_reminded: false, reminded_at: null, reminded_by: null }
              : row
          )
        );

        setStats((prev) => ({
          ...prev,
          reminded: Math.max(0, (prev.reminded || 0) - 1),
          unreminded: item.status === "reminder" ? (prev.unreminded || 0) + 1 : prev.unreminded,
        }));

        showToast(`Status reminder untuk ${item.customer_name} berhasil direset kembali ke Belum Kirim Pesan.`);
      } else {
        // Tandai sudah dihubungi manual
        const nowISO = new Date().toISOString();
        await api("/cleanox/customer-aging/remind", {
          method: "POST",
          body: JSON.stringify({
            customer_phone: item.customer_phone,
            customer_name: item.customer_name,
            reference_no: item.reference_no,
            category_key: item.category_key,
            service_name: item.service_name,
            channel: "Telepon / Offline",
            notes: "Ditandai manual via SuperApp",
          }),
        });

        setData((prev) =>
          prev.map((row) =>
            (row.reference_no === item.reference_no && row.category_key === item.category_key) ||
            (row.customer_phone === item.customer_phone && row.category_key === item.category_key)
              ? {
                  ...row,
                  is_reminded: true,
                  reminded_at: nowISO,
                  reminded_by: "CS Cleanox",
                  reminder_channel: "Telepon / Offline",
                  reminder_count: (row.reminder_count || 0) + 1,
                }
              : row
          )
        );

        setStats((prev) => ({
          ...prev,
          reminded: (prev.reminded || 0) + 1,
          unreminded: item.status === "reminder" ? Math.max(0, (prev.unreminded || 0) - 1) : prev.unreminded,
        }));

        showToast(`✅ ${item.customer_name} berhasil ditandai sebagai "Sudah Kirim Pesan"!`);
      }
    } catch (err) {
      console.error("Gagal toggle status reminder:", err);
      alert("Gagal memperbarui status reminder: " + err.message);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!data.length) return;
    const headers = [
      "No",
      "Nama Pelanggan",
      "No Telepon",
      "Alamat",
      "Kategori Layanan",
      "Nama Layanan Terakhir",
      "Tanggal Selesai",
      "Aging (Hari)",
      "Batas Siklus (Hari)",
      "Status Siklus",
      "Status Follow-up",
      "Tanggal Di-reminder",
      "No Nota / Invoice",
      "Outlet",
    ];

    const rows = data.map((item, idx) => [
      idx + 1,
      `"${item.customer_name.replace(/"/g, '""')}"`,
      `"${item.customer_phone}"`,
      `"${(item.customer_address || "").replace(/"/g, '""')}"`,
      `"${item.category_label}"`,
      `"${item.service_name.replace(/"/g, '""')}"`,
      `"${item.tgl_selesai ? String(item.tgl_selesai).slice(0, 10) : ""}"`,
      item.aging_days,
      item.threshold_days || "Cross-Selling",
      item.status.toUpperCase(),
      item.is_reminded ? "SUDAH DIREMINDER" : "BELUM DIREMINDER",
      item.reminded_at ? `"${String(item.reminded_at).slice(0, 19)}"` : '""',
      `"${item.reference_no}"`,
      `"${item.outlet}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cleanox_Customer_Aging_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/50 relative">
      {/* ── Toast Alert Notifikasi ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900/95 backdrop-blur-md px-5 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-2xl border border-slate-700/50 animate-bounce">
          <HiOutlineCheckBadge className="h-6 w-6 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b3459] to-[#0d1d33] text-white shadow-lg shadow-[#1b3459]/25 ring-1 ring-white/20">
              <HiOutlineBellAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                Aging & Reminder Layanan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Pantau siklus kebersihan berkala pelanggan, tindak lanjuti antrian reminder & lacak status pesan terkirim
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || !data.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <HiOutlineArrowDownTray className="h-4 w-4 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b3459] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#1b3459]/20 transition hover:bg-[#152a48] disabled:opacity-50"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {/* Card 1: Total Pelanggan */}
        <div
          onClick={() => {
            setActiveTab("all");
            setPage(1);
          }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
            activeTab === "all" ? "border-slate-400 ring-2 ring-slate-400/20" : "border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Riwayat
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <HiOutlineUserGroup className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {stats.total.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">Semua transaksi</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-300" />
        </div>

        {/* Card 2: ⚠️ Belum Kirim Pesan (Antrian Prioritas) */}
        <div
          onClick={() => {
            setActiveTab("unreminded");
            setPage(1);
          }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
            activeTab === "unreminded" ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              Belum Kirim Pesan
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <HiOutlineBellAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {stats.unreminded.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-rose-500/80 font-medium">Antrian follow-up CS</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
        </div>

        {/* Card 3: ✅ Sudah Kirim Pesan */}
        <div
          onClick={() => {
            setActiveTab("reminded");
            setPage(1);
          }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
            activeTab === "reminded" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Sudah Kirim Pesan
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <HiCheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {stats.reminded.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-emerald-600/80 font-medium">Telah dihubungi</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
        </div>

        {/* Card 4: Masa Aman / Safe */}
        <div
          onClick={() => {
            setActiveTab("safe");
            setPage(1);
          }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
            activeTab === "safe" ? "border-blue-400 ring-2 ring-blue-400/20" : "border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Masa Aman (Safe)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HiOutlineShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600">
              {stats.safe.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">Dalam siklus aman</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500" />
        </div>

        {/* Card 5: Cross Selling Koper */}
        <div
          onClick={() => {
            setActiveTab("cross_selling");
            setPage(1);
          }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
            activeTab === "cross_selling" ? "border-purple-400 ring-2 ring-purple-400/20" : "border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
              Cross-Selling
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <HiOutlineSparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600">
              {stats.crossSelling.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">Add-on Koper</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-purple-500" />
        </div>
      </div>

      {/* ── Master Filter Tabs Bar ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        {/* Single Unified Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <HiOutlineFunnel className="h-3.5 w-3.5" />
            Status:
          </span>
          {[
            {
              id: "all",
              label: "Semua Data",
              count: stats.total,
              color: "default",
            },
            {
              id: "unreminded",
              label: "⚠️ Belum Kirim Pesan (Antrian CS)",
              count: stats.unreminded,
              color: "danger",
            },
            {
              id: "reminded",
              label: "✅ Sudah Kirim Pesan",
              count: stats.reminded,
              color: "success",
            },
            {
              id: "all_reminder",
              label: "🔔 Semua Perlu Reminder",
              count: stats.reminder,
              color: "warning",
            },
            {
              id: "safe",
              label: "🛡️ Masa Aman",
              count: stats.safe,
              color: "safe",
            },
            {
              id: "cross_selling",
              label: "✨ Penawaran Koper",
              count: stats.crossSelling,
              color: "purple",
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm",
                  active
                    ? tab.color === "danger"
                      ? "bg-rose-600 text-white shadow-rose-600/25 ring-2 ring-rose-600/30"
                      : tab.color === "success"
                      ? "bg-emerald-600 text-white shadow-emerald-600/25 ring-2 ring-emerald-600/30"
                      : tab.color === "warning"
                      ? "bg-amber-600 text-white shadow-amber-600/25 ring-2 ring-amber-600/30"
                      : tab.color === "purple"
                      ? "bg-purple-600 text-white shadow-purple-600/25 ring-2 ring-purple-600/30"
                      : "bg-[#1b3459] text-white shadow-[#1b3459]/25 ring-2 ring-[#1b3459]/30"
                    : tab.color === "danger"
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    : tab.color === "success"
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    : tab.color === "warning"
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 border border-transparent"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                    active
                      ? "bg-white/20 text-white"
                      : tab.color === "danger"
                      ? "bg-rose-200/80 text-rose-800"
                      : tab.color === "success"
                      ? "bg-emerald-200/80 text-emerald-800"
                      : "bg-white text-slate-700 shadow-xs"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Category, Sorting Row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-5 relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama customer, no HP / WhatsApp, nota..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  setTimeout(() => fetchData(), 50);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Category Dropdown */}
          <div className="lg:col-span-4">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
            >
              <option value="all">Semua Kategori Layanan (14 Layanan)</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} {c.days ? `(${c.days} hari)` : "(Cross-Selling)"}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="lg:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
            >
              <option value="aging_desc">Aging Tertinggi (Paling Lama)</option>
              <option value="aging_asc">Aging Terendah (Paling Baru)</option>
              <option value="date_desc">Tgl Selesai Terbaru</option>
              <option value="date_asc">Tgl Selesai Terlama</option>
              <option value="name_asc">Nama Pelanggan (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <HiOutlineArrowPath className="h-8 w-8 animate-spin text-[#1b3459]" />
            <p className="mt-3 text-sm font-medium text-slate-600">Memuat data aging pelanggan...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 rounded-lg bg-[#1b3459] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#152a48]"
            >
              Coba Lagi
            </button>
          </div>
        ) : !data.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <HiOutlineInformationCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Tidak ada data pelanggan yang sesuai</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba ubah filter status atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 pl-4 pr-2 sm:pl-6 text-center w-12">No</th>
                  <th className="py-3.5 px-3">Pelanggan</th>
                  <th className="py-3.5 px-3">Kategori Layanan</th>
                  <th className="py-3.5 px-3">Layanan Terakhir</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Tgl Selesai</th>
                  <th className="py-3.5 px-3 text-center">Aging</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Siklus</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Status & Follow-up</th>
                  <th className="py-3.5 pl-3 pr-4 sm:pr-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {data.map((item, idx) => {
                  const rowNumber = (pagination.page - 1) * pagination.pageSize + idx + 1;
                  const isReminder = item.status === "reminder";
                  const isSafe = item.status === "safe";
                  const isCross = item.status === "cross_selling";
                  const isReminded = Boolean(item.is_reminded);

                  return (
                    <tr
                      key={`${item.reference_no}__${item.category_key}__${idx}`}
                      className={cn(
                        "transition-colors group",
                        isReminded
                          ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                          : "hover:bg-slate-50/80"
                      )}
                    >
                      {/* No */}
                      <td className="py-3.5 pl-4 pr-2 sm:pl-6 text-center font-medium text-slate-400 text-xs">
                        {rowNumber}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs uppercase border",
                              isReminded
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            {item.customer_name ? item.customer_name.slice(0, 2) : "C"}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomer(item)}
                              className="font-bold text-slate-900 hover:text-[#1b3459] hover:underline text-left truncate block max-w-[150px] sm:max-w-[180px]"
                            >
                              {item.customer_name}
                            </button>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              {item.customer_phone ? (
                                <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                                  <HiOutlinePhone className="h-3 w-3 text-slate-400" />
                                  {item.customer_phone}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Tanpa No. HP</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                          <HiOutlineTag className="h-3 w-3 text-slate-400" />
                          {item.category_label}
                        </span>
                      </td>

                      {/* Last Service Name */}
                      <td className="py-3.5 px-3 max-w-[180px]">
                        <p className="truncate font-medium text-slate-800 text-xs" title={item.service_name}>
                          {item.service_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          Nota: {item.reference_no}
                        </p>
                      </td>

                      {/* Completion Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <HiOutlineCalendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDateIndo(item.tgl_selesai)}</span>
                        </div>
                      </td>

                      {/* Aging Days */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={cn(
                              "font-extrabold text-sm",
                              isReminder ? "text-rose-600" : isSafe ? "text-blue-600" : "text-purple-600"
                            )}
                          >
                            {item.aging_days} Hari
                          </span>
                          <span className="text-[10px] text-slate-400">sejak selesai</span>
                        </div>
                      </td>

                      {/* Threshold / Cycle */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {item.threshold_days ? (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {item.threshold_days} Hari
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* ── Kolom STATUS & FOLLOW-UP (JELAS & TEGAS) ── */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isReminded ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-300 shadow-xs">
                              <HiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                              Sudah Kirim Pesan
                            </span>
                            <span className="text-[10px] text-emerald-700 font-mono font-medium mt-1">
                              Terkirim: {formatDateTimeIndo(item.reminded_at)}
                            </span>
                          </div>
                        ) : isReminder ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                              Belum Kirim Pesan
                            </span>
                            <span className="text-[10px] text-rose-600 font-medium mt-1">
                              Lewat +{item.days_diff}h siklus
                            </span>
                          </div>
                        ) : isSafe ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                              <HiOutlineShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                              Masa Aman (Safe)
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              Sisa {item.days_diff} hari
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                              <HiOutlineSparkles className="h-3.5 w-3.5 text-purple-600" />
                              Cross-Selling
                            </span>
                            <span className="text-[10px] text-purple-500 mt-1">
                              Add-on Koper
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ── Kolom AKSI ── */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isReminded ? (
                            // Sudah Pernah Kirim -> Tombol "Kirim Ulang" + "Reset"
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenWaModal(item)}
                                title="Kirim ulang pesan WhatsApp"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                              >
                                <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Kirim Ulang</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleManualToggleRemind(item)}
                                title="Reset status pesan terkirim"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              >
                                <HiArrowUturnLeft className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            // Belum Kirim -> Tombol "Kirim WA" Hijau Solid + Quick Checkmark Manual
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenWaModal(item)}
                                title="Kirim pesan WhatsApp reminder"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              >
                                <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleManualToggleRemind(item)}
                                title="Tandai sudah dihubungi (tanpa buka WhatsApp)"
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 transition"
                              >
                                <HiCheckCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {/* Tombol Info Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(item)}
                            title="Lihat detail info nota & riwayat"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          >
                            <HiOutlineInformationCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Bar ── */}
        {!loading && data.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 sm:px-6 py-3.5 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              Menampilkan{" "}
              <span className="font-semibold text-slate-700">
                {(pagination.page - 1) * pagination.pageSize + 1}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-slate-700">
                {pagination.totalRecords}
              </span>{" "}
              riwayat
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1b3459]"
                >
                  <option value={10}>10 / halaman</option>
                  <option value={15}>15 / halaman</option>
                  <option value={25}>25 / halaman</option>
                  <option value={50}>50 / halaman</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <HiOutlineChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-slate-700">
                  {page} / {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <HiOutlineChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Kirim WhatsApp ── */}
      {waModalOpen && waTargetItem && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setWaModalOpen(false)}
          />

          <div
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-[fadeIn_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/75">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <HiOutlineChatBubbleLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                    {waTargetItem.is_reminded ? "Kirim Ulang Pesan WhatsApp" : "Kirim Pesan WhatsApp Reminder"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Kirim pesan ke {waTargetItem.customer_name} ({waTargetItem.customer_phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Prior contact alert */}
              {waTargetItem.is_reminded && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                  <HiCheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Pelanggan ini sebelumnya sudah direminder pada <strong>{formatDateTimeIndo(waTargetItem.reminded_at)}</strong>.
                  </span>
                </div>
              )}

              {/* Customer Info Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan:</span>
                  <span className="font-bold text-slate-800">{waTargetItem.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Telepon:</span>
                  <span className="font-mono font-semibold text-slate-700">{waTargetItem.customer_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Layanan:</span>
                  <span className="font-semibold text-slate-800">{waTargetItem.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nota / Invoice:</span>
                  <span className="font-mono text-slate-600">{waTargetItem.reference_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Masa Aging:</span>
                  <span className="font-bold text-rose-600">
                    {waTargetItem.aging_days} Hari Lalu ({formatDateIndo(waTargetItem.tgl_selesai)})
                  </span>
                </div>
              </div>

              {/* Editable Message Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Template Teks Pesan WhatsApp:
                </label>
                <textarea
                  rows={8}
                  value={customWaMessage}
                  onChange={(e) => setCustomWaMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm font-sans text-slate-800 focus:border-[#1b3459] focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 leading-relaxed transition"
                  placeholder="Ketik pesan..."
                />
              </div>

              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 text-[11px] text-blue-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <HiOutlineInformationCircle className="h-4 w-4 text-blue-600 shrink-0" />
                  Alur Otomatisasi Status:
                </p>
                <p className="text-blue-700 leading-relaxed">
                  Ketika tombol di bawah diklik, tab WhatsApp akan terbuka dan status pelanggan di SuperApp ini <strong>langsung otomatis ditandai sebagai "Sudah Kirim Pesan"</strong>.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/75">
              <button
                type="button"
                onClick={() => handleSendWa(true)}
                className="text-xs font-medium text-slate-500 hover:text-emerald-700 underline underline-offset-2 transition"
                title="Buka langsung via tautan wa.me"
              >
                Buka via wa.me
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setWaModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleSendWa(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
                >
                  <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
                  <span>Buka WhatsApp & Tandai Terkirim</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Detail Pelanggan ── */}
      {selectedCustomer && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedCustomer(null)}
          />

          <div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-[fadeIn_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/75">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <HiOutlineDocumentText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                    Detail Riwayat Pelanggan
                  </h3>
                  <p className="text-[11px] text-slate-400">Informasi nota, siklus & status reminder</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700 overflow-y-auto">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pelanggan:</span>
                  <span className="font-bold text-slate-900">{selectedCustomer.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Telepon / WA:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedCustomer.customer_phone || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alamat:</span>
                  <span className="text-slate-700 text-right max-w-[200px] truncate">
                    {selectedCustomer.customer_address || "-"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Nota / Invoice:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedCustomer.reference_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sistem Sumber:</span>
                  <span className="uppercase font-semibold text-slate-700">
                    {selectedCustomer.source_system} ({selectedCustomer.outlet})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori Layanan:</span>
                  <span className="font-bold text-slate-800">{selectedCustomer.category_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Layanan:</span>
                  <span className="font-medium text-slate-800">{selectedCustomer.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Selesai:</span>
                  <span className="font-medium text-slate-800">{formatDateIndo(selectedCustomer.tgl_selesai)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Masa Aging:</span>
                  <span className="font-bold text-rose-600">{selectedCustomer.aging_days} Hari Selesai</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Standar Siklus:</span>
                  <span className="font-medium text-slate-800">
                    {selectedCustomer.threshold_days ? `${selectedCustomer.threshold_days} Hari` : "Cross-Selling (Koper)"}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Status Follow-up:</span>
                  <span
                    className={cn(
                      "font-bold",
                      selectedCustomer.is_reminded ? "text-emerald-700" : "text-rose-600"
                    )}
                  >
                    {selectedCustomer.is_reminded
                      ? `Sudah Kirim Pesan (${formatDateTimeIndo(selectedCustomer.reminded_at)})`
                      : "Belum Kirim Pesan"}
                  </span>
                </div>
                {selectedCustomer.is_reminded && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Petugas CS:</span>
                    <span className="font-medium text-slate-700">{selectedCustomer.reminded_by || "CS Cleanox"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end px-5 py-3 border-t border-slate-100 bg-slate-50/75">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-xl bg-[#1b3459] px-4 py-2 text-xs font-bold text-white hover:bg-[#152a48] transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
