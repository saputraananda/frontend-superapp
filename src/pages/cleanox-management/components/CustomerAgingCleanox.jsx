import { useEffect, useMemo, useState } from "react";
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

function buildWhatsAppUrl(phone, message) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "628" + digits.slice(1);
  const encoded = encodeURIComponent(message || "");
  return `https://wa.me/${digits}?text=${encoded}`;
}

export default function CustomerAgingCleanox() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, reminder: 0, safe: 0, crossSelling: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  useEffect(() => {
    document.title = "Aging & Reminder Layanan Cleanox | SuperApp";
    loadCategories();
  }, []);

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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
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
  }, [statusFilter, categoryFilter, sortBy, page, pageSize]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  // Generate Default WA CRM Template
  const generateWaMessage = (item) => {
    if (!item) return "";
    const customerName = item.customer_name || "Pelanggan Setia";
    const serviceName = item.service_name || item.category_label || "layanan";
    const tglSelesaiFormatted = formatDateIndo(item.tgl_selesai);

    if (item.is_cross_selling) {
      return (
        `Halo Kak ${customerName}! 👋\n\n` +
        `Terima kasih telah mempercayakan perawatan barang di Cleanox.\n` +
        `Sebagai informasi, Cleanox saat ini juga menyediakan layanan pembersihan & perawatan khusus Koper, Kasur, Sofa, hingga Interior Mobil agar selalu bersih dan higienis.\n\n` +
        `Apakah ada perlengkapan atau koper yang ingin dibersihkan untuk agenda bepergian Kakak selanjutnya? Kami siap membantu jemput & antar! ✨`
      );
    }

    return (
      `Halo Kak ${customerName}! 👋\n\n` +
      `Terima kasih sebelumnya telah mempercayakan perawatan *${serviceName}* di Cleanox.\n\n` +
      `Berdasarkan catatan pengerjaan terakhir pada *${tglSelesaiFormatted}* (sudah sekitar *${item.aging_days} hari* yang lalu).\n` +
      `Untuk menjaga kebersihan, kenyamanan, serta higienitas secara optimal (standar siklus: *${item.threshold_days} hari*), saat ini sudah memasuki waktu yang tepat untuk perawatan berkala kembali.\n\n` +
      `Apakah ada yang bisa kami bantu jadwalkan penjemputan / pengerjaan ulang di minggu ini Kak? Kami siap melayani! 😊🙏`
    );
  };

  const handleOpenWaModal = (item) => {
    setWaTargetItem(item);
    setCustomWaMessage(generateWaMessage(item));
    setWaModalOpen(true);
  };

  const handleSendWa = () => {
    if (!waTargetItem) return;
    const url = buildWhatsAppUrl(waTargetItem.normalized_phone || waTargetItem.customer_phone, customWaMessage);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setWaModalOpen(false);
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
      "Status",
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
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/50">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b3459] to-[#12233c] text-white shadow-md shadow-[#1b3459]/20">
              <HiOutlineBellAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                Aging & Reminder Layanan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Pantau siklus kebersihan berkala pelanggan & kirimkan follow-up reminder tepat waktu
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Total Pelanggan */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Riwayat
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HiOutlineUserGroup className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {stats.total.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">Pelanggan tercatat</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>

        {/* Card 2: Perlu Reminder */}
        <div
          onClick={() => {
            setStatusFilter("reminder");
            setPage(1);
          }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
            statusFilter === "reminder" ? "border-rose-400 ring-2 ring-rose-400/20" : "border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Perlu Reminder
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <HiOutlineBellAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {stats.reminder.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">Jatuh tempo / lewat batas</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500" />
        </div>

        {/* Card 3: Masa Aman / Safe */}
        <div
          onClick={() => {
            setStatusFilter("safe");
            setPage(1);
          }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
            statusFilter === "safe" ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Masa Aman (Safe)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <HiOutlineShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {stats.safe.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">Dalam masa siklus aman</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500" />
        </div>

        {/* Card 4: Cross Selling Koper */}
        <div
          onClick={() => {
            setStatusFilter("cross_selling");
            setPage(1);
          }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md",
            statusFilter === "cross_selling" ? "border-purple-400 ring-2 ring-purple-400/20" : "border-slate-200/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">
              Cross-Selling
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <HiOutlineSparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600">
              {stats.crossSelling.toLocaleString("id-ID")}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">Pernah cuci koper (add-on)</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-purple-500" />
        </div>
      </div>

      {/* ── Filters & Controls Bar ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        {/* Quick Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
            <HiOutlineFunnel className="h-3.5 w-3.5" />
            Filter Status:
          </span>
          {[
            { id: "all", label: "Semua Status", count: stats.total },
            { id: "reminder", label: "🔔 Perlu Reminder", count: stats.reminder, color: "text-rose-600" },
            { id: "safe", label: "🛡️ Aman (Safe)", count: stats.safe, color: "text-emerald-600" },
            { id: "cross_selling", label: "✨ Cross-Selling (Koper)", count: stats.crossSelling, color: "text-purple-600" },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-[#1b3459] text-white shadow-sm"
                    : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    active ? "bg-white/20 text-white" : "bg-white text-slate-700 shadow-sm"
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
            <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau filter status layanan.</p>
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
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 pl-3 pr-4 sm:pr-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {data.map((item, idx) => {
                  const rowNumber = (pagination.page - 1) * pagination.pageSize + idx + 1;
                  const isReminder = item.status === "reminder";
                  const isSafe = item.status === "safe";
                  const isCross = item.status === "cross_selling";

                  return (
                    <tr
                      key={`${item.reference_no}__${item.category_key}__${idx}`}
                      className="transition-colors hover:bg-slate-50/80 group"
                    >
                      {/* No */}
                      <td className="py-3.5 pl-4 pr-2 sm:pl-6 text-center font-medium text-slate-400 text-xs">
                        {rowNumber}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs uppercase border border-slate-200">
                            {item.customer_name ? item.customer_name.slice(0, 2) : "C"}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomer(item)}
                              className="font-semibold text-slate-900 hover:text-[#1b3459] hover:underline text-left truncate block max-w-[160px] sm:max-w-[200px]"
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
                      <td className="py-3.5 px-3 max-w-[200px]">
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
                              isReminder ? "text-rose-600" : isSafe ? "text-emerald-600" : "text-purple-600"
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

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isReminder && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Reminder (+{item.days_diff}h)
                          </span>
                        )}
                        {isSafe && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <HiOutlineCheck className="h-3 w-3 text-emerald-600" />
                            Safe (sisa {item.days_diff}h)
                          </span>
                        )}
                        {isCross && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                            <HiOutlineSparkles className="h-3 w-3 text-purple-600" />
                            Cross-Selling
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Button WA */}
                          <button
                            type="button"
                            onClick={() => handleOpenWaModal(item)}
                            title="Kirim pesan WhatsApp reminder"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          {/* Button Info */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(item)}
                            title="Lihat detail info"
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

        {/* ── Pagination Footer ── */}
        {!loading && pagination.totalRecords > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-xs text-slate-500">
              Menampilkan{" "}
              <span className="font-semibold text-slate-800">
                {(pagination.page - 1) * pagination.pageSize + 1}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-slate-800">
                {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)}
              </span>{" "}
              dari <span className="font-semibold text-slate-800">{pagination.totalRecords}</span> riwayat
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
              >
                <option value={10}>10 / halaman</option>
                <option value={15}>15 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <HiOutlineChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-slate-700">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <HiOutlineChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── WhatsApp Message Modal ── */}
      {waModalOpen && waTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
                </div>
                <span>Kirim Reminder via WhatsApp</span>
              </div>
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Target info */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pelanggan:</span>
                <span className="font-bold text-slate-800">{waTargetItem.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. WhatsApp:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {waTargetItem.customer_phone || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Layanan:</span>
                <span className="font-medium text-slate-800">{waTargetItem.service_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Aging:</span>
                <span className="font-semibold text-rose-600">
                  {waTargetItem.aging_days} Hari Lalu ({formatDateIndo(waTargetItem.tgl_selesai)})
                </span>
              </div>
            </div>

            {/* Editable Message Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Template Pesan (Dapat Disesuaikan):</span>
                <button
                  type="button"
                  onClick={() => setCustomWaMessage(generateWaMessage(waTargetItem))}
                  className="text-[11px] font-medium text-blue-600 hover:underline"
                >
                  Reset Template
                </button>
              </label>
              <textarea
                rows={7}
                value={customWaMessage}
                onChange={(e) => setCustomWaMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 focus:outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendWa}
                disabled={!waTargetItem.customer_phone}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
              >
                <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
                <span>Buka WhatsApp Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Detail Modal ── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b3459] text-white">
                  <HiOutlineDocumentText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                    Detail Riwayat Pelanggan
                  </h3>
                  <p className="text-[11px] text-slate-400">Informasi nota & siklus layanan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pelanggan:</span>
                  <span className="font-bold text-slate-900 text-right">{selectedCustomer.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. WhatsApp / HP:</span>
                  <span className="font-mono font-semibold text-slate-800 text-right">
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

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori Layanan:</span>
                  <span className="font-bold text-[#1b3459]">{selectedCustomer.category_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Layanan Spesifik:</span>
                  <span className="font-medium text-slate-800 text-right">{selectedCustomer.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Nota / Invoice:</span>
                  <span className="font-mono text-slate-700">{selectedCustomer.reference_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sistem Sumber:</span>
                  <span className="uppercase font-semibold text-slate-600">
                    {selectedCustomer.source_system}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tgl Selesai:</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateIndo(selectedCustomer.tgl_selesai)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aging Pengerjaan:</span>
                  <span className="font-extrabold text-rose-600">
                    {selectedCustomer.aging_days} Hari
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batas Standar Siklus:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedCustomer.threshold_days ? `${selectedCustomer.threshold_days} Hari` : "Cross-Selling (Koper)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedCustomer;
                  setSelectedCustomer(null);
                  handleOpenWaModal(target);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
                <span>Follow-up WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
