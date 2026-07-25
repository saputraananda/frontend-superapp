import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineFunnel, HiOutlineXMark,
  HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineMagnifyingGlass,
  HiOutlineExclamationTriangle, HiOutlineCheckCircle, HiOutlineDocumentText,
  HiOutlinePencilSquare, HiOutlineTrash, HiOutlinePlus, HiOutlineClock,
  HiOutlineUser, HiOutlineArrowDownTray, HiOutlineChevronDown
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { exportSerahTerimaLinenExcel } from "../utils/exportSerahTerimaLinenExcel";
import { exportRekapCuciLinenSewa } from "../utils/exportRekapCuciLinenSewa";

function cn(...c) { return c.filter(Boolean).join(" "); }

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(d);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDatetimeLocalInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const CUTOFF_START_DAY = 26;

function getDefaultCutoffSelection(now = new Date()) {
  const startDay = CUTOFF_START_DAY;
  const endDay = startDay - 1;
  let cutoffMonth = now.getMonth() + 1;
  let cutoffYear = now.getFullYear();
  if (now.getDate() > endDay) {
    cutoffMonth += 1;
    if (cutoffMonth > 12) { cutoffMonth = 1; cutoffYear += 1; }
  }
  const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
  const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
  return {
    cutoffMonth,
    cutoffYear,
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
}

const PERIOD_MONTHS = [
  { value: 1, label: "Januari" }, { value: 2, label: "Februari" },
  { value: 3, label: "Maret" }, { value: 4, label: "April" },
  { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
  { value: 7, label: "Juli" }, { value: 8, label: "Agustus" },
  { value: 9, label: "September" }, { value: 10, label: "Oktober" },
  { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

const yearOptions = [2025, 2026, 2027];

function generatePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
        toast.type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {toast.type === "error"
        ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
        : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

// ─── Format Audit Log Helpers ────────────────────────────────────────────────
function fmtLogDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return v;

  const dayName = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(d);
  const day = d.getDate();
  const month = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(d);
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${dayName}, ${day} ${month} ${year}, ${hours}:${minutes} WIB`;
}

function normalizeAction(log) {
  let action = log.action;
  if (action === "CREATE") return "PICKUP_KOTOR";
  if (action === "UPDATE") {
    const oldStatus = log.old_values?.header?.status;
    if (oldStatus === "SELESAI") return "KURANG_KIRIM";
    const newStatus = log.new_values?.header?.status;
    if (newStatus === "SELESAI") return "DELIVERY_BERSIH";
    return "PICKUP_KOTOR";
  }
  return action;
}

function formatHeaderFieldChange(field, oldVal, newVal, employeeMap) {
  const getEmpName = (id) => employeeMap.get(Number(id)) || `Karyawan #${id}`;

  const displayOld = oldVal === null || oldVal === undefined || oldVal === "" ? "—" : oldVal;
  const displayNew = newVal === null || newVal === undefined || newVal === "" ? "—" : newVal;

  switch (field) {
    case "user_pickup":
      return `Petugas Pickup: "${oldVal ? getEmpName(oldVal) : "—"}" menjadi "${newVal ? getEmpName(newVal) : "—"}"`;
    case "user_delivery":
      return `Petugas Delivery: "${oldVal ? getEmpName(oldVal) : "—"}" menjadi "${newVal ? getEmpName(newVal) : "—"}"`;
    case "hospital_staff_pickup":
      return `Petugas RS Pickup: "${displayOld}" menjadi "${displayNew}"`;
    case "hospital_staff_delivery":
      return `Petugas RS Delivery: "${displayOld}" menjadi "${displayNew}"`;
    case "hospital_assistant_pickup":
      return `Perawat RS Pickup: "${displayOld}" menjadi "${displayNew}"`;
    case "hospital_assistant_delivery":
      return `Perawat RS Delivery: "${displayOld}" menjadi "${displayNew}"`;
    case "pickup_date":
      return `Tanggal Pickup: "${displayOld}" menjadi "${displayNew}"`;
    case "delivery_date":
      return `Tanggal Pengantaran: "${displayOld}" menjadi "${displayNew}"`;
    case "notes_pickup":
      return `Catatan Pickup: "${displayOld}" menjadi "${displayNew}"`;
    case "notes_delivery":
      return `Catatan Delivery: "${displayOld}" menjadi "${displayNew}"`;
    default:
      return null;
  }
}

function getLogChanges(log, employeeMap) {
  const changes = [];
  const action = normalizeAction(log);

  if (action === "PICKUP_KOTOR" && (!log.old_values || !log.old_values.header)) {
    changes.push("Membuat transaksi kotor");
    return changes;
  }

  const oldHeader = log.old_values?.header || {};
  const newHeader = log.new_values?.header || {};

  // 1. Check header fields
  const fields = [
    "user_pickup", "user_delivery",
    "hospital_staff_pickup", "hospital_staff_delivery",
    "hospital_assistant_pickup", "hospital_assistant_delivery",
    "pickup_date", "delivery_date",
    "notes_pickup", "notes_delivery"
  ];

  fields.forEach(field => {
    const oldVal = oldHeader[field];
    const newVal = newHeader[field];
    if (oldVal !== newVal) {
      const changeText = formatHeaderFieldChange(field, oldVal, newVal, employeeMap);
      if (changeText) changes.push(changeText);
    }
  });

  // 2. Check detail items
  const oldDetails = log.old_values?.details || [];
  const newDetails = log.new_values?.details || [];

  const oldMap = new Map(oldDetails.map(d => [d.hospital_linen_id, d]));

  newDetails.forEach(n => {
    const o = oldMap.get(n.hospital_linen_id);
    const linenName = n.linen_display_name || `Linen #${n.hospital_linen_id}`;

    // Check qty_kotor changes
    const oldKotor = o ? Number(o.qty_kotor) : 0;
    const newKotor = Number(n.qty_kotor);
    if (oldKotor !== newKotor) {
      changes.push(`Linen Kotor ${linenName} ${oldKotor} menjadi ${newKotor}`);
    }

    // Check qty_bersih changes
    const oldBersih = o ? o.qty_bersih : null;
    const newBersih = n.qty_bersih;

    if (oldBersih !== newBersih) {
      if (oldBersih === null || oldBersih === undefined || oldBersih === 0) {
        changes.push(`Linen Bersih ${linenName} — menjadi ${newBersih}`);
      } else {
        changes.push(`Linen Bersih ${linenName} ${oldBersih} menjadi ${newBersih}`);
      }
    }
  });

  if (changes.length === 0) {
    if (action === "PICKUP_KOTOR") {
      changes.push("Mengubah transaksi kotor");
    } else if (action === "DELIVERY_BERSIH") {
      changes.push("Mengubah transaksi bersih");
    } else {
      changes.push("Menyesuaikan kurang kirim");
    }
  }

  return changes;
}

// Helper to render signature verification badge/status
const renderSignatureStatus = (sigPath) => {
  if (sigPath) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-455 italic font-medium ml-2 select-none shrink-0">
        <svg className="h-3.5 w-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-slate-400 font-sans">Tanda Tangan Digital Terverifikasi</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-455 italic font-medium ml-2 select-none shrink-0">
      <svg className="h-3.5 w-3.5 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span className="text-slate-400 font-sans">Tanda Tangan Belum Terverifikasi</span>
    </span>
  );
};

// ─── Transaction Edit / Create Modal (React Portal) ───────────────────────────
function FormModal({ open, mode, transactionId, hospitals, onClose, onSubmitSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map(emp => [Number(emp.employee_id), emp.full_name]));
  }, [employees]);

  const categorizedLogs = useMemo(() => {
    const groups = {
      PICKUP_KOTOR: [],
      DELIVERY_BERSIH: [],
      KURANG_KIRIM: [],
      ADMIN: []
    };

    const sortedLogs = [...auditLogs].sort((a, b) => a.id - b.id);

    sortedLogs.forEach(log => {
      const action = normalizeAction(log);
      const changes = getLogChanges(log, employeeMap);
      changes.forEach(changeText => {
        groups[action]?.push({
          id: `${log.id}-${changeText}`,
          dateStr: fmtLogDateTime(log.created_at),
          fullName: log.full_name || log.username || "System",
          changeText
        });
      });
    });

    return groups;
  }, [auditLogs, employeeMap]);

  // Form Fields
  const [hospitalId, setHospitalId] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [userPickup, setUserPickup] = useState("");
  const [userDelivery, setUserDelivery] = useState("");
  const [hospitalStaffPickup, setHospitalStaffPickup] = useState("");
  const [hospitalStaffDelivery, setHospitalStaffDelivery] = useState("");
  const [hospitalAssistantPickup, setHospitalAssistantPickup] = useState("");
  const [hospitalAssistantDelivery, setHospitalAssistantDelivery] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState("PROSES");
  const [notesPickup, setNotesPickup] = useState("");
  const [notesDelivery, setNotesDelivery] = useState("");
  const [details, setDetails] = useState([]); // Array of { hospital_linen_id, linen_display_name, ownership_type, qty_kotor, qty_bersih, notes }

  // Signature States for Verification Indicators
  const [sigValetPickup, setSigValetPickup] = useState(null);
  const [sigHospitalPickup, setSigHospitalPickup] = useState(null);
  const [sigAssistantPickup, setSigAssistantPickup] = useState(null);
  const [sigValetDelivery, setSigValetDelivery] = useState(null);
  const [sigHospitalDelivery, setSigHospitalDelivery] = useState(null);
  const [sigAssistantDelivery, setSigAssistantDelivery] = useState(null);

  // Set default values when open or mode changes
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setHospitalId("");
      setFormNumber("");
      setUserPickup("");
      setUserDelivery("");
      setHospitalStaffPickup("");
      setHospitalStaffDelivery("");
      setHospitalAssistantPickup("");
      setHospitalAssistantDelivery("");
      setPickupDate("");
      setDeliveryDate("");
      setStatus("PROSES");
      setNotesPickup("");
      setNotesDelivery("");
      setDetails([]);
      setAuditLogs([]);
      setSigValetPickup(null);
      setSigHospitalPickup(null);
      setSigAssistantPickup(null);
      setSigValetDelivery(null);
      setSigHospitalDelivery(null);
      setSigAssistantDelivery(null);
    }
  }, [open, mode]);

  // Load Employees list (For dropdowns)
  useEffect(() => {
    if (!open) return;
    const fetchEmployees = async () => {
      try {
        const res = await api("/ikm/linen-transactions/employees");
        if (res.success) setEmployees(res.data);
      } catch (err) {
        console.error("Gagal memuat karyawan:", err.message);
      }
    };
    fetchEmployees();
  }, [open]);

  // Load Form Data in EDIT mode
  useEffect(() => {
    if (!open || !transactionId || mode === "create") return;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api(`/ikm/linen-transactions/${transactionId}`);
        if (res.success) {
          const { header, details, auditLogs } = res.data;
          setHospitalId(header.hospital_id || "");
          setFormNumber(header.form_number || "");
          setUserPickup(header.user_pickup || "");
          setUserDelivery(header.user_delivery || "");
          setHospitalStaffPickup(header.hospital_staff_pickup || "");
          setHospitalStaffDelivery(header.hospital_staff_delivery || "");
          setHospitalAssistantPickup(header.hospital_assistant_pickup || "");
          setHospitalAssistantDelivery(header.hospital_assistant_delivery || "");
          setPickupDate(toDatetimeLocalInput(header.pickup_date));
          setDeliveryDate(toDatetimeLocalInput(header.delivery_date));
          setStatus(header.status || "PROSES");
          setNotesPickup(header.notes_pickup || "");
          setNotesDelivery(header.notes_delivery || "");
          setDetails(details || []);
          setAuditLogs(auditLogs || []);
          setSigValetPickup(header.signature_valet_pickup || null);
          setSigHospitalPickup(header.signature_hospital_pickup || null);
          setSigAssistantPickup(header.signature_assistant_pickup || null);
          setSigValetDelivery(header.signature_valet_delivery || null);
          setSigHospitalDelivery(header.signature_hospital_delivery || null);
          setSigAssistantDelivery(header.signature_assistant_delivery || null);
        } else {
          throw new Error(res.message || "Gagal memuat rincian transaksi");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, transactionId, mode]);

  // Fetch active linens when selected hospital changes (Only in CREATE mode)
  useEffect(() => {
    if (mode !== "create" || !hospitalId) {
      if (mode === "create") setDetails([]);
      return;
    }

    const loadLinens = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api(`/ikm/linen-transactions/hospitals/${hospitalId}/linens`);
        if (res.success) {
          setDetails(
            res.data.map(l => ({
              hospital_linen_id: l.hospital_linen_id,
              linen_display_name: l.linen_display_name,
              ownership_type: l.ownership_type,
              qty_kotor: 0,
              qty_bersih: null,
              notes: ""
            }))
          );
        } else {
          throw new Error(res.message || "Gagal memuat item linen RS");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLinens();
  }, [hospitalId, mode]);

  if (!open) return null;

  const selectedHospitalName = hospitals.find(h => Number(h.id) === Number(hospitalId))?.hospital_name || "-";

  const handleQtyChange = (index, field, value) => {
    const updated = [...details];
    const val = value === "" ? "" : Number(value);
    updated[index][field] = val;
    setDetails(updated);
  };

  const handleItemNoteChange = (index, value) => {
    const updated = [...details];
    updated[index].notes = value;
    setDetails(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode !== "create" && !formNumber.trim()) return setError("Nomor Formulir wajib diisi.");
    if (!hospitalId) return setError("Silakan pilih Rumah Sakit.");
    if (!userPickup) return setError("Silakan pilih Petugas IKM Pickup.");
    if (!pickupDate) return setError("Silakan masukkan Tanggal Pickup.");

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        hospital_id: Number(hospitalId),
        user_pickup: Number(userPickup),
        user_delivery: userDelivery ? Number(userDelivery) : null,
        hospital_staff_pickup: hospitalStaffPickup || null,
        hospital_staff_delivery: hospitalStaffDelivery || null,
        hospital_assistant_pickup: hospitalAssistantPickup || null,
        hospital_assistant_delivery: hospitalAssistantDelivery || null,
        pickup_date: pickupDate.replace("T", " ") + ":00",
        delivery_date: deliveryDate ? deliveryDate.replace("T", " ") + ":00" : null,
        status,
        notes_pickup: notesPickup || null,
        notes_delivery: notesDelivery || null,
        details: details.map(d => ({
          hospital_linen_id: d.hospital_linen_id,
          qty_kotor: Number(d.qty_kotor || 0),
          qty_bersih: d.qty_bersih !== "" && d.qty_bersih !== null ? Number(d.qty_bersih) : null,
          notes: d.notes
        }))
      };

      if (mode !== "create") {
        payload.form_number = formNumber;
      }
      let res;
      if (mode === "create") {
        res = await api("/ikm/linen-transactions", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      } else {
        res = await api(`/ikm/linen-transactions/${transactionId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      }

      if (res.success) {
        onSubmitSuccess(mode === "create" ? "Transaksi berhasil ditambahkan" : "Transaksi berhasil diperbarui");
        onClose();
      } else {
        throw new Error(res.message || "Gagal menyimpan transaksi");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <HiOutlineDocumentText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {mode === "create" ? "Tambah Transaksi Linen IKM" : "Edit Transaksi Linen IKM"}
              </h3>
              <p className="text-xs text-slate-400">Kelola dan pantau catatan serah terima linen rumah sakit</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-1.5 pb-4">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
              <HiOutlineExclamationTriangle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}


          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <p className="text-sm text-slate-500">Memuat rincian transaksi...</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-5">

              {/* ── SECTION 1: Info Transaksi ─────────────────────────────── */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2.5 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <HiOutlineDocumentText className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Info Transaksi</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Hospital */}
                  <label className="text-sm text-slate-600">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Rumah Sakit <strong className="text-rose-500">*</strong></span>
                    {mode === "create" ? (
                      <select
                        value={hospitalId}
                        onChange={(e) => setHospitalId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">Pilih Rumah Sakit</option>
                        {hospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.hospital_name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800">
                        {selectedHospitalName}
                      </div>
                    )}
                  </label>

                  {/* Form Number */}
                  <label className="text-sm text-slate-600">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Nomor Formulir</span>
                    {mode === "create" ? (
                      <div className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-400 italic select-none">
                        Dibuat otomatis oleh sistem
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formNumber}
                        disabled
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono font-semibold text-slate-700 outline-none"
                      />
                    )}
                  </label>

                  {/* Status */}
                  <label className="text-sm text-slate-600">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="PROSES">⏳ PROSES — Kotor Diterima</option>
                      <option value="SELESAI">✅ SELESAI — Bersih Dikirim</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* ── SECTION 2: Serah Terima — split dua kolom ────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Pickup card */}
                <div className="rounded-2xl border border-orange-200 bg-orange-50/30 overflow-hidden">
                  <div className="flex items-center gap-2.5 bg-orange-50 border-b border-orange-200 px-4 py-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <HiOutlineUser className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Linen Kotor — Pickup</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <label className="block text-sm text-slate-600">
                      <span className="mb-1 flex items-center text-xs font-semibold text-slate-500">
                        <span>Petugas IKM <strong className="text-rose-505">*</strong></span>
                        {mode !== "create" && renderSignatureStatus(sigValetPickup)}
                      </span>
                      <select
                        value={userPickup}
                        onChange={(e) => setUserPickup(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Pilih Petugas IKM</option>
                        {employees.map(emp => (
                          <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm text-slate-600">
                      <span className="mb-1 flex items-center text-xs font-semibold text-slate-500">
                        <span>Petugas RS</span>
                        {mode !== "create" && renderSignatureStatus(sigHospitalPickup)}
                      </span>
                      <input
                        type="text"
                        value={hospitalStaffPickup}
                        onChange={(e) => setHospitalStaffPickup(e.target.value)}
                        placeholder="Nama petugas RS saat pickup..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label className="block text-sm text-slate-600">
                      <span className="mb-1 flex items-center text-xs font-semibold text-slate-500">
                        <span>Perawat RS</span>
                        {mode !== "create" && renderSignatureStatus(sigAssistantPickup)}
                      </span>
                      <input
                        type="text"
                        value={hospitalAssistantPickup}
                        onChange={(e) => setHospitalAssistantPickup(e.target.value)}
                        placeholder="Nama perawat RS saat pickup..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                    <label className="block text-sm text-slate-600">
                      <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Pickup <strong className="text-rose-500">*</strong></span>
                      <input
                        type="datetime-local"
                        required
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </label>
                  </div>
                </div>

                {/* Delivery card */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 overflow-hidden">
                  <div className="flex items-center gap-2.5 bg-emerald-50 border-b border-emerald-200 px-4 py-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <HiOutlineUser className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Linen Bersih — Pengiriman</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <label className="block text-sm text-slate-600">
                      <span className="mb-1 flex items-center text-xs font-semibold text-slate-500">
                        <span>Petugas IKM</span>
                        {mode !== "create" && renderSignatureStatus(sigValetDelivery)}
                      </span>
                      <select
                        value={userDelivery}
                        onChange={(e) => setUserDelivery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="">Pilih Petugas IKM (Opsional)</option>
                        {employees.map(emp => (
                          <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm text-slate-600">
                      <span className="mb-1 flex items-center text-xs font-semibold text-slate-500">
                        <span>Petugas RS</span>
                        {mode !== "create" && renderSignatureStatus(sigHospitalDelivery)}
                      </span>
                      <input
                        type="text"
                        value={hospitalStaffDelivery}
                        onChange={(e) => setHospitalStaffDelivery(e.target.value)}
                        placeholder="Nama petugas RS saat delivery..."
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                    <label className="block text-sm text-slate-600">
                      <span className="mb-1 flex items-center text-xs font-semibold text-slate-500">
                        <span>Perawat RS</span>
                        {mode !== "create" && renderSignatureStatus(sigAssistantDelivery)}
                      </span>
                      <input
                        type="text"
                        value={hospitalAssistantDelivery}
                        onChange={(e) => setHospitalAssistantDelivery(e.target.value)}
                        placeholder="Nama perawat RS saat delivery..."
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                    <label className="block text-sm text-slate-600">
                      <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Pengantaran</span>
                      <input
                        type="datetime-local"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: Catatan ────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Catatan Pickup</span>
                  <textarea
                    value={notesPickup}
                    onChange={(e) => setNotesPickup(e.target.value)}
                    placeholder="Tulis catatan saat pickup..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-y"
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Catatan Delivery</span>
                  <textarea
                    value={notesDelivery}
                    onChange={(e) => setNotesDelivery(e.target.value)}
                    placeholder="Tulis catatan saat delivery..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-y"
                  />
                </label>
              </div>

              {/* ── SECTION 4: Item Detail Linen ─────────────────────────── */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <HiOutlineDocumentText className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Item Detail Linen</span>
                    {details.length > 0 && (
                      <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5">
                        {details.length} item
                      </span>
                    )}
                  </div>
                  {!hospitalId && (
                    <span className="text-xs text-rose-500 italic">Pilih Rumah Sakit terlebih dahulu</span>
                  )}
                </div>

                {hospitalId && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 w-10">No</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Linen</th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 w-16">Tipe</th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-orange-500 w-24">Kotor (Pcs)</th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-600 w-24">Bersih (Pcs)</th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 w-20">Selisih</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {details.map((detail, idx) => {
                          const kotor = Number(detail.qty_kotor || 0);
                          const bersih = detail.qty_bersih !== null && detail.qty_bersih !== "" ? Number(detail.qty_bersih) : null;
                          const selisih = bersih !== null ? kotor - bersih : null;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3 py-2 text-center text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-800 min-w-[140px]">{detail.linen_display_name}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase",
                                  detail.ownership_type === "SEWA"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-teal-50 text-teal-700 border-teal-200"
                                )}>
                                  {detail.ownership_type === "SEWA" ? "Sewa" : "RS"}
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  required
                                  value={detail.qty_kotor}
                                  onChange={(e) => handleQtyChange(idx, "qty_kotor", e.target.value)}
                                  className="w-full text-center rounded-lg border border-orange-200 bg-orange-50/50 py-1.5 px-2 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 font-bold text-orange-700"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="—"
                                  value={detail.qty_bersih ?? ""}
                                  onChange={(e) => handleQtyChange(idx, "qty_bersih", e.target.value)}
                                  className="w-full text-center rounded-lg border border-emerald-200 bg-emerald-50/50 py-1.5 px-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 font-bold text-emerald-700"
                                />
                              </td>
                              <td className={cn(
                                "px-3 py-2 text-center text-xs font-bold tabular-nums",
                                selisih === null ? "text-slate-300"
                                  : selisih > 0 ? "text-rose-600"
                                    : selisih < 0 ? "text-blue-600"
                                      : "text-slate-400"
                              )}>
                                {selisih === null ? "—" : selisih === 0 ? "✓" : selisih > 0 ? `+${selisih}` : selisih}
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={detail.notes || ""}
                                  onChange={(e) => handleItemNoteChange(idx, e.target.value)}
                                  placeholder="Catatan item..."
                                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                        {details.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400 italic">
                              Rumah sakit ini belum dikonfigurasi memiliki item linen aktif.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── SECTION 5: Riwayat Audit ─────────────────────────────── */}
              {mode !== "create" && auditLogs.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                  <div className="flex items-center gap-2.5 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
                      <HiOutlineClock className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Riwayat Perubahan</span>
                    <span className="rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5">{auditLogs.length}</span>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto p-4 space-y-4 divide-y divide-slate-100 bg-white">
                    {/* Render Group 1: PICKUP_KOTOR */}
                    {categorizedLogs.PICKUP_KOTOR.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Pickup Linen Kotor</h4>
                        <div className="space-y-1.5 pl-1">
                          {categorizedLogs.PICKUP_KOTOR.map((item) => (
                            <div key={item.id} className="text-[11px] flex flex-wrap items-center gap-1.5 leading-relaxed">
                              <span className="text-slate-400 font-medium">{item.dateStr}</span>
                              <span className="text-slate-300 font-bold">•</span>
                              <span className="text-slate-700 font-bold">{item.fullName}</span>
                              <span className="text-slate-300 font-bold">•</span>
                              <span className="text-slate-600 font-medium">{item.changeText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render Group 2: DELIVERY_BERSIH */}
                    {categorizedLogs.DELIVERY_BERSIH.length > 0 && (
                      <div className="space-y-2 pt-4 first:pt-0">
                        <h4 className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Pengantaran Linen Bersih</h4>
                        <div className="space-y-1.5 pl-1">
                          {categorizedLogs.DELIVERY_BERSIH.map((item) => (
                            <div key={item.id} className="text-[11px] flex flex-wrap items-center gap-1.5 leading-relaxed">
                              <span className="text-slate-400 font-medium">{item.dateStr}</span>
                              <span className="text-slate-300 font-bold">•</span>
                              <span className="text-slate-700 font-bold">{item.fullName}</span>
                              <span className="text-slate-300 font-bold">•</span>
                              <span className="text-slate-600 font-medium">{item.changeText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render Group 3: KURANG_KIRIM */}
                    {categorizedLogs.KURANG_KIRIM.length > 0 && (
                      <div className="space-y-2 pt-4 first:pt-0">
                        <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Linen Kurang Kirim</h4>
                        <div className="space-y-1.5 pl-1">
                          {categorizedLogs.KURANG_KIRIM.map((item) => (
                            <div key={item.id} className="text-[11px] flex flex-wrap items-center gap-1.5 leading-relaxed">
                              <span className="text-slate-400 font-medium">{item.dateStr}</span>
                              <span className="text-slate-300 font-bold">•</span>
                              <span className="text-slate-700 font-bold">{item.fullName}</span>
                              <span className="text-slate-300 font-bold">•</span>
                              <span className="text-slate-600 font-medium">{item.changeText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render Group 4: ADMIN */}
                    {categorizedLogs.ADMIN.length > 0 && (
                      <div className="space-y-2 pt-4 first:pt-0">
                        <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Perubahan Oleh Admin</h4>
                        <div className="space-y-1.5 pl-1">
                          {categorizedLogs.ADMIN.map((item) => (
                            <div key={item.id} className="text-[11px] flex flex-wrap items-center gap-1.5 leading-relaxed">
                              <span className="text-slate-400 font-medium">{item.dateStr}</span>
                              <span className="text-slate-300 font-bold">•</span>
                              <span className="text-slate-700 font-bold">{item.fullName}</span>
                              <span className="text-slate-300 font-bold">•</span>
                              <span className="text-slate-600 font-medium">{item.changeText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Tutup
          </button>
          {!submitting && (
            <button
              type="button"
              disabled={submitting || loading || !hospitalId}
              onClick={handleSubmit}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
            >
              {submitting && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Simpan
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Delete Confirmation Modal (React Portal) ────────────────────────────────
function DeleteModal({ open, transaction, onClose, onDeleteConfirm }) {
  const [deleting, setDeleting] = useState(false);

  if (!open || !transaction) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      const res = await api(`/ikm/linen-transactions/${transaction.id}`, { method: "DELETE" });
      if (res.success) {
        onDeleteConfirm("Transaksi berhasil dihapus");
        onClose();
      } else {
        throw new Error(res.message || "Gagal menghapus transaksi");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
            <HiOutlineExclamationTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Konfirmasi Hapus Transaksi</h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus transaksi linen untuk rumah sakit <strong className="text-slate-800">{transaction.hospital_name}</strong>?
              Tindakan ini permanen dan akan menghapus semua rincian item beserta data audit log terkait.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50 inline-flex items-center gap-1"
          >
            {deleting && <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />}
            Hapus
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function LinenTransaction() {
  const [data, setData] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadExcel = async (rowId) => {
    setDownloadingId(rowId);
    try {
      const res = await api(`/ikm/linen-transactions/${rowId}`);
      if (res.success) {
        await exportSerahTerimaLinenExcel(res.data);
        showToast("success", "File Excel berhasil diunduh");
      } else {
        throw new Error(res.message || "Gagal memuat rincian transaksi");
      }
    } catch (err) {
      showToast("error", "Gagal mengunduh Excel: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filters State
  const defaultCutoff = getDefaultCutoffSelection();
  const [periodMode, setPeriodMode] = useState("cutoff");
  const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
  const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
  const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);

  const [hospitalFilter, setHospitalFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [kurangKirimOnly, setKurangKirimOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });

  // Modals Controller State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("view"); // 'create', 'edit', 'view'
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Dynamic cutoff / active range dates
  const activePeriod = useMemo(() => {
    if (periodMode === "today") {
      const today = todayISO();
      return { startDate: today, endDate: today };
    }
    if (periodMode === "custom") {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    // cutoff
    const start = new Date(cutoffYear, cutoffMonth - 2, CUTOFF_START_DAY);
    const end = new Date(cutoffYear, cutoffMonth - 1, CUTOFF_START_DAY - 1);
    return {
      startDate: toDateInput(start),
      endDate: toDateInput(end),
    };
  }, [periodMode, cutoffMonth, cutoffYear, customStartDate, customEndDate]);

  // Trigger Toast
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Set Document Title
  useEffect(() => {
    document.title = "Serah Terima Linen IKM | Alora Group Indonesia";
  }, []);

  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [exportingRekap, setExportingRekap] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDownloadDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleExportRekap = async (ownershipType) => {
    setDownloadDropdownOpen(false);
    setExportingRekap(true);
    try {
      const q = new URLSearchParams();
      if (activePeriod.startDate) q.append("startDate", activePeriod.startDate);
      if (activePeriod.endDate) q.append("endDate", activePeriod.endDate);
      if (hospitalFilter) q.append("hospital_id", hospitalFilter);
      q.append("ownership_type", ownershipType);

      const res = await api(`/ikm/linen-transactions/rekap/cuci?${q.toString()}`);
      if (res.success) {
        await exportRekapCuciLinenSewa(res, activePeriod.startDate, activePeriod.endDate, ownershipType);
        showToast("success", `File rekap ${ownershipType === "SEWA" ? "Linen Sewa" : "Linen RS"} berhasil diunduh`);
      } else {
        throw new Error(res.message || "Gagal mengambil data rekap");
      }
    } catch (err) {
      showToast("error", "Gagal mengunduh Rekap: " + err.message);
    } finally {
      setExportingRekap(false);
    }
  };

  // Fetch Hospitals
  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const res = await api("/ikm/linen-transactions/hospitals");
        if (res.success) {
          setHospitals(res.data);
        }
      } catch {
        showToast("error", "Gagal memuat daftar rumah sakit");
      }
    };
    loadHospitals();
  }, []);

  // Fetch Rooms when Hospital selection changes (Cascading)
  useEffect(() => {
    setRoomFilter("");
    setRooms([]);
    if (!hospitalFilter) return;

    const loadRooms = async () => {
      try {
        const res = await api(`/ikm/linen-transactions/hospitals/${hospitalFilter}/rooms`);
        if (res.success) {
          setRooms(res.data);
        }
      } catch {
        showToast("error", "Gagal memuat ruangan rumah sakit");
      }
    };
    loadRooms();
  }, [hospitalFilter]);

  // Load Transactions List
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (activePeriod.startDate) q.append("startDate", activePeriod.startDate);
      if (activePeriod.endDate) q.append("endDate", activePeriod.endDate);
      if (hospitalFilter) q.append("hospital_id", hospitalFilter);
      if (roomFilter) q.append("room_id", roomFilter);
      if (kurangKirimOnly) q.append("kurang_kirim_only", "true");
      if (search?.trim()) q.append("search", search.trim());
      q.append("page", String(page));
      q.append("limit", String(limit));

      const res = await api(`/ikm/linen-transactions?${q.toString()}`);
      if (res.success) {
        setData(res.data);
        setPagination(res.pagination || { page, limit, total: res.data.length, totalPages: 1 });
      } else {
        throw new Error(res.message || "Gagal memuat transaksi");
      }
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }, [activePeriod, hospitalFilter, roomFilter, kurangKirimOnly, search, page, limit]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const handleTriggerCreate = () => {
    setSelectedTransactionId(null);
    setFormModalMode("create");
    setFormModalOpen(true);
  };

  const handleActionSuccess = (message) => {
    showToast("success", message);
    loadTransactions();
  };

  return (
    <main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Toast Notification */}
        <Toast toast={toast} />

        {/* Create / Edit / View Form Modal */}
        <FormModal
          open={formModalOpen}
          mode={formModalMode}
          transactionId={selectedTransactionId}
          hospitals={hospitals}
          onClose={() => {
            setFormModalOpen(false);
            setSelectedTransactionId(null);
          }}
          onSubmitSuccess={handleActionSuccess}
        />

        {/* Delete Confirmation Modal */}
        <DeleteModal
          open={deleteModalOpen}
          transaction={deleteTarget}
          onClose={() => {
            setDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          onDeleteConfirm={handleActionSuccess}
        />

        {/* Header Banner */}
        <section className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 p-5 shadow-sm sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-blue-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                <HiOutlineDocumentText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl font-sans">Serah Terima Linen</h1>
                <p className="text-sm text-white/70">Monitoring data penerimaan linen kotor &amp; pengiriman linen bersih</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Download Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                  disabled={exportingRekap}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0"
                >
                  <HiOutlineArrowDownTray className="h-4 w-4" />
                  {exportingRekap ? "Mengekspor..." : "Unduh Rekap"}
                  <HiOutlineChevronDown className="h-4 w-4 opacity-70" />
                </button>

                {downloadDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      onClick={() => handleExportRekap("SEWA")}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition font-semibold"
                    >
                      <HiOutlineDocumentText className="h-4 w-4 text-blue-500" />
                      Rekap Cuci Linen Sewa
                    </button>
                    <button
                      onClick={() => handleExportRekap("MILIK_RS")}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition font-semibold"
                    >
                      <HiOutlineDocumentText className="h-4 w-4 text-emerald-500" />
                      Rekap Cuci Linen RS
                    </button>
                  </div>
                )}
              </div>

              {/* Tambah Transaksi Trigger */}
              <button
                onClick={handleTriggerCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0"
              >
                <HiOutlinePlus className="h-4 w-4" /> Tambah Transaksi
              </button>
            </div>
          </div>
        </section>

        {/* Filter Panel */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
            Filter
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Period Mode Selector */}
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
              <select
                value={periodMode}
                onChange={(e) => { setPeriodMode(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="cutoff">Periode Cutoff</option>
                <option value="today">Hari Ini</option>
                <option value="custom">Custom Tanggal</option>
              </select>
            </label>

            {/* Sub-Filters depending on Period Mode */}
            {periodMode === "cutoff" && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
                <select
                  value={cutoffMonth}
                  onChange={(e) => { setCutoffMonth(Number(e.target.value)); setPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  {PERIOD_MONTHS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </label>
            )}
            {periodMode === "custom" && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => { setCustomStartDate(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            )}
            {periodMode === "today" && <div />}

            {periodMode === "cutoff" && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
                <select
                  value={cutoffYear}
                  onChange={(e) => { setCutoffYear(Number(e.target.value)); setPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
              </label>
            )}
            {periodMode === "custom" && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => { setCustomEndDate(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            )}
            {periodMode === "today" && <div />}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Hospital Filter */}
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Rumah Sakit</span>
              <select
                value={hospitalFilter}
                onChange={(e) => { setHospitalFilter(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Semua Rumah Sakit</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.hospital_name}</option>
                ))}
              </select>
            </label>

            {/* Cascading Room Filter */}
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Ruangan / Unit</span>
              <select
                value={roomFilter}
                disabled={!hospitalFilter}
                onChange={(e) => { setRoomFilter(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {!hospitalFilter ? "Pilih RS Terlebih Dahulu" : "Semua Ruangan (Nilai Total)"}
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.room_name}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Active Period Info Banner */}
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
            <span className="font-semibold">Periode aktif:</span>
            <span>{fmtDate(activePeriod.startDate)} — {fmtDate(activePeriod.endDate)}</span>
          </div>

          {/* Search, Action Filters & Page Size */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari RS, tanggal, status, nomor form..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cari
              </button>
            </form>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 transition px-3.5 py-2.5 rounded-xl border border-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={kurangKirimOnly}
                  onChange={(e) => { setKurangKirimOnly(e.target.checked); setPage(1); }}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-700">Hanya Linen Kurang Kirim</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Per halaman:</span>
                <select
                  value={limit}
                  disabled
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  <option value="25">25</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Data Table Section */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HiOutlineDocumentText className="h-5 w-5 text-blue-500" />
              <h2 className="text-base font-bold text-slate-800">Daftar Transaksi Linen</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
              {pagination.total.toLocaleString("id-ID")} data
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap w-16">No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Rumah Sakit</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Tanggal Pickup</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Tanggal Pengantaran</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Linen Kotor</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Linen Bersih</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Linen Kurang Kirim</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="border-t border-slate-100 animate-pulse">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <td key={i} className="px-4 py-3.5"><div className="h-3.5 rounded bg-slate-200 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                      Tidak ada data transaksi linen yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => {
                    const number = (page - 1) * limit + idx + 1;
                    const hasKurang = row.kurang_kirim !== 0;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setSelectedTransactionId(row.id);
                          setFormModalMode("edit");
                          setFormModalOpen(true);
                        }}
                        className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5 text-center text-xs font-medium text-slate-400 tabular-nums">{number}</td>
                        <td className="px-4 py-3.5 text-xs font-bold text-slate-800">{row.hospital_name}</td>
                        <td className="px-4 py-3.5 text-center text-xs text-slate-500">{fmtDate(row.pickup_date)}</td>
                        <td className="px-4 py-3.5 text-center text-xs text-slate-500">{fmtDate(row.delivery_date) || "-"}</td>
                        <td className="px-4 py-3.5 text-center text-xs font-medium text-slate-700 tabular-nums">{row.total_kotor}</td>
                        <td className="px-4 py-3.5 text-center text-xs font-medium text-slate-700 tabular-nums">{row.total_bersih}</td>
                        <td className={cn(
                          "px-4 py-3.5 text-center text-xs font-bold tabular-nums",
                          hasKurang ? "text-rose-600 bg-rose-50/30" : "text-slate-400"
                        )}>
                          {row.kurang_kirim}
                        </td>

                        {/* Aksi options */}
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTransactionId(row.id);
                                setFormModalMode("edit");
                                setFormModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition"
                              title="Edit"
                            >
                              <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={downloadingId === row.id}
                              onClick={() => handleDownloadExcel(row.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 transition disabled:opacity-50"
                              title="Unduh Excel"
                            >
                              {downloadingId === row.id ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                              ) : (
                                <HiOutlineArrowDownTray className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(row);
                                setDeleteModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-rose-300 hover:text-rose-600 transition"
                              title="Hapus"
                            >
                              <HiOutlineTrash className="h-3.5 w-3.5" />
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

          {/* Pagination controls */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-5 py-4 bg-slate-50/50 gap-4 text-xs font-semibold text-slate-500">
              <div>
                Menampilkan <span className="font-bold text-slate-800">{data.length}</span> dari{" "}
                <span className="font-bold text-slate-800">{pagination.total}</span> data
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <HiOutlineChevronLeft className="h-4 w-4" />
                </button>

                {generatePages(page, pagination.totalPages).map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof p === "number" && setPage(p)}
                    disabled={p === "..."}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl border transition",
                      p === page
                        ? "border-blue-600 bg-blue-600 text-white font-bold"
                        : p === "..."
                          ? "border-transparent bg-transparent cursor-default"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <HiOutlineChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
