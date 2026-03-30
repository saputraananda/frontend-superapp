import React, { useState, useMemo, useRef, useEffect } from "react";
import UnderDevelopmentDialog from "../../components/UnderDevelopmentDialog";
import Sidebar from "./components/Sidebar";
import FilterBar from "./components/FilterBar";
import PenjualanSection from "./sections/PenjualanSection";
import PiutangSection from "./sections/PiutangSection";
import KomplainSection from "./sections/KomplainSection";
import MembershipSection from "./sections/MembershipSection";
import CustomerSection from "./sections/CustomerSection";
import CleanoxByWaschenSection from "./sections/CleanoxByWaschenSection";
import { getEmployeeFromLocal, canSupervisorUp } from "../project-management/role";
import { api } from "../../lib/api";

const SECTIONS = {
  penjualan:          PenjualanSection,
  cleanox_by_waschen: CleanoxByWaschenSection,
  piutang:            PiutangSection,
  komplain:           KomplainSection,
  membership:         MembershipSection,
  customer:           CustomerSection,
};

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

function capitalizeEachWord(text) {
  if (!text) return "";
  return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const SECTION_LABELS = {
  penjualan:          "Dashboard Penjualan",
  cleanox_by_waschen: "Dashboard Cleanox By Waschen",
  piutang:            "Dashboard Piutang",
  komplain:           "Dashboard Komplain",
  membership:         "Dashboard Membership",
  customer:           "Dashboard Customer",
};

export default function Dashboard() {
  const [showDevDialog, setShowDevDialog] = useState(false);
  const [activeSection, setActiveSection] = useState("penjualan");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    document.title = `${SECTION_LABELS[activeSection] ?? "Sales Dashboard"} | Alora Group Indonesia`;
  }, [activeSection]);

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [outlet, setOutlet] = useState("all");
  const [filterType, setFilterType] = useState("month");
  const [month, setMonth] = useState("2026-03");
  const [year, setYear] = useState("2026");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const employee = useMemo(() => getEmployeeFromLocal(), []);
  const isSupervisorUp = useMemo(() => canSupervisorUp(employee), [employee]);
  const isDirektur = useMemo(
    () => canSupervisorUp(employee) && employee?.job_level_id == 1,
    [employee]
  );

  // Handle resize for mobile detection
  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function handleLogout() {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  const ActiveSection = SECTIONS[activeSection];
  const filters = { outlet, filterType, month, year, startDate, endDate };

  return (
    <div className="flex min-h-screen bg-[#f4f6f9]">
      <UnderDevelopmentDialog open={showDevDialog} onClose={() => setShowDevDialog(false)} />

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        active={activeSection}
        onSelect={setActiveSection}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : sidebarOpen ? 240 : 64 }}
      >
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 transition shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Title */}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">{SECTION_LABELS[activeSection] ?? "Sales Dashboard"}</h1>
            <p className="text-xs text-slate-400">Waschen Alora Indonesia</p>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3" ref={dropdownRef}>
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-slate-900">
                {capitalizeEachWord(employee?.full_name || "User")}
              </div>
              <div className="text-xs text-slate-500">
                {isDirektur ? "Direktur" : isSupervisorUp ? "Supervisor" : "Staff"}
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown((v) => !v)}
                className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-white text-sm font-bold shadow-sm hover:bg-slate-700 transition"
              >
                {initials(employee?.full_name)}
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <a
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
                    onClick={() => setShowDropdown(false)}
                  >
                    👤 Lihat Profil
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shared Filter Bar */}
        <FilterBar
          outlet={outlet} setOutlet={setOutlet}
          filterType={filterType} setFilterType={setFilterType}
          month={month} setMonth={setMonth}
          year={year} setYear={setYear}
          startDate={startDate} setStartDate={setStartDate}
          endDate={endDate} setEndDate={setEndDate}
        />

        {/* Section content */}
        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-5 pb-14 overflow-x-hidden min-w-0">
          <ActiveSection filters={filters} />
        </div>

        <div className="text-center text-xs font-semibold text-slate-400 py-4">
          © {new Date().getFullYear()} — Waschen Alora Indonesia
        </div>
      </div>
    </div>
  );
}