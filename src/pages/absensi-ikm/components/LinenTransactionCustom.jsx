import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineFunnel, HiOutlineXMark,
  HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineMagnifyingGlass,
  HiOutlineExclamationTriangle, HiOutlineCheckCircle, HiOutlineDocumentText,
  HiOutlinePencilSquare, HiOutlineTrash, HiOutlinePlus, HiOutlineClock,
  HiOutlineUser, HiOutlineArrowDownTray, HiOutlineChevronDown,
  HiOutlineTruck, HiOutlinePrinter
} from "react-icons/hi2";
import { api, BASE_URL } from "../../../lib/api";
import { exportSerahTerimaLinenExcel } from "../utils/exportSerahTerimaLinenExcel";
import { exportRekapCuciLinenKhusus } from "../utils/exportRekapCuciLinenKhusus";
import exportSuratJalanKurangKirimCustom from "../utils/exportSerahTerimaLinenKhususExcel";

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

function parseJSONMaybe(val) {
  if (!val) return null;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function getLogChanges(log, employeeMap) {
  const changes = [];
  const detailsObj = parseJSONMaybe(log.details || log.change_summary || log.changes);

  if (detailsObj && typeof detailsObj === "object") {
    if (detailsObj.pickup_date) changes.push(`Tanggal Pickup: ${detailsObj.pickup_date}`);
    if (detailsObj.delivery_date) changes.push(`Tanggal Pengantaran: ${detailsObj.delivery_date}`);
    if (detailsObj.notes_pickup) changes.push(`Catatan Pickup: ${detailsObj.notes_pickup}`);
    if (detailsObj.notes_delivery) changes.push(`Catatan Pengantaran: ${detailsObj.notes_delivery}`);
    if (detailsObj.status) changes.push(`Status: ${detailsObj.status}`);

    if (detailsObj.user_pickup) {
      const empId = Number(detailsObj.user_pickup);
      const name = employeeMap.get(empId) || `ID #${empId}`;
      changes.push(`Petugas Pickup: ${name}`);
    }
    if (detailsObj.user_delivery) {
      const empId = Number(detailsObj.user_delivery);
      const name = employeeMap.get(empId) || `ID #${empId}`;
      changes.push(`Petugas Pengantaran: ${name}`);
    }
    if (detailsObj.hospital_staff_pickup) changes.push(`Petugas RS (Pickup): ${detailsObj.hospital_staff_pickup}`);
    if (detailsObj.hospital_staff_delivery) changes.push(`Petugas RS (Pengantaran): ${detailsObj.hospital_staff_delivery}`);

    if (Array.isArray(detailsObj.items)) {
      detailsObj.items.forEach(item => {
        const linenName = item.item_name || item.linen_name || item.name || `Item #${item.hospital_linen_id || ""}`;
        if (item.qty_kotor !== undefined) changes.push(`Linen Custom Kotor ${linenName}: ${item.qty_kotor}`);
        if (item.qty_bersih !== undefined) changes.push(`Linen Custom Bersih ${linenName}: ${item.qty_bersih}`);
      });
    }

    if (Array.isArray(detailsObj.item_changes)) {
      detailsObj.item_changes.forEach(item => {
        const linenName = item.item_name || item.linen_name || `Item #${item.hospital_linen_id || ""}`;
        if (item.old_qty_kotor !== undefined || item.new_qty_kotor !== undefined) {
          changes.push(`Linen Custom Kotor ${linenName}: ${item.old_qty_kotor ?? "-"} -> ${item.new_qty_kotor ?? "-"}`);
        }
        if (item.old_qty_bersih !== undefined || item.new_qty_bersih !== undefined) {
          changes.push(`Linen Custom Bersih ${linenName}: ${item.old_qty_bersih ?? "-"} -> ${item.new_qty_bersih ?? "-"}`);
        }
      });
    }

    if (changes.length > 0) return changes;
  }

  const snapshot = parseJSONMaybe(log.snapshot || log.new_values);
  const oldSnapshot = parseJSONMaybe(log.old_snapshot || log.old_values);

  if (snapshot && oldSnapshot) {
    // Header comparisons
    const fields = [
      "user_pickup", "user_delivery",
      "hospital_staff_pickup", "hospital_staff_delivery",
      "hospital_assistant_pickup", "hospital_assistant_delivery",
      "pickup_date", "delivery_date",
      "notes_pickup", "notes_delivery", "status"
    ];
    fields.forEach(f => {
      const oldVal = oldSnapshot.header?.[f] ?? oldSnapshot?.[f];
      const newVal = snapshot.header?.[f] ?? snapshot?.[f];
      if (oldVal !== newVal) {
        const desc = formatHeaderFieldChange(f, oldVal, newVal, employeeMap);
        if (desc) changes.push(desc);
      }
    });

    // Details comparison
    const oldDetails = oldSnapshot.details || [];
    const newDetails = snapshot.details || [];

    const oldMap = new Map(oldDetails.map(i => [i.item_name || `ID-${i.id}`, i]));
    const newMap = new Map(newDetails.map(i => [i.item_name || `ID-${i.id}`, i]));

    const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
    allKeys.forEach(key => {
      const oldItem = oldMap.get(key) || {};
      const newItem = newMap.get(key) || {};
      const linenName = newItem.item_name || oldItem.item_name || key;

      if (Number(oldItem.qty_kotor || 0) !== Number(newItem.qty_kotor || 0)) {
        changes.push(`Linen Custom Kotor ${linenName}: ${oldItem.qty_kotor || 0} -> ${newItem.qty_kotor || 0}`);
      }
      if (Number(oldItem.qty_bersih || 0) !== Number(newItem.qty_bersih || 0)) {
        changes.push(`Linen Custom Bersih ${linenName}: ${oldItem.qty_bersih || 0} -> ${newItem.qty_bersih || 0}`);
      }
      if (parseFloat(oldItem.length_cm || 0) !== parseFloat(newItem.length_cm || 0) || parseFloat(oldItem.width_cm || 0) !== parseFloat(newItem.width_cm || 0)) {
        changes.push(`Dimensi ${linenName}: ${oldItem.length_cm || 0}x${oldItem.width_cm || 0} cm -> ${newItem.length_cm || 0}x${newItem.width_cm || 0} cm`);
      }
      if (Number(oldItem.accessory_qty || 0) !== Number(newItem.accessory_qty || 0)) {
        changes.push(`Aksesoris ${linenName}: ${oldItem.accessory_qty || 0} -> ${newItem.accessory_qty || 0}`);
      }
    });

    if (changes.length > 0) return changes;
  }

  if (log.description || log.notes) {
    changes.push(log.description || log.notes);
  }

  const action = normalizeAction(log);
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

// Helper to get signature URL
function getSignatureUrl(sig) {
  if (!sig) return null;
  if (sig.startsWith("data:") || sig.startsWith("http://") || sig.startsWith("https://") || sig.startsWith("blob:")) {
    return sig;
  }
  const filename = sig.split("/").pop();
  const base = (BASE_URL || "").replace(/\/$/, "");
  return `${base}/ikm/linen-transactions-custom/signature-proxy?name=${encodeURIComponent(filename)}`;
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
  const [details, setDetails] = useState([]); // Array of { hospital_linen_id, item_name, category, qty_kotor, qty_bersih, length_cm, width_cm, area_m2, notes, ownership_type }
  const [hospitalCustomLinens, setHospitalCustomLinens] = useState([]);

  // Signature States for Verification Indicators
  const [sigValetPickup, setSigValetPickup] = useState(null);
  const [sigHospitalPickup, setSigHospitalPickup] = useState(null);
  const [sigAssistantPickup, setSigAssistantPickup] = useState(null);
  const [sigValetDelivery, setSigValetDelivery] = useState(null);
  const [sigHospitalDelivery, setSigHospitalDelivery] = useState(null);
  const [sigAssistantDelivery, setSigAssistantDelivery] = useState(null);

  // Accordion / Collapsible Section States (Default closed)
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);

  // Tab Navigation & Kurang Kirim Deliveries State
  const [activeTab, setActiveTab] = useState("info");
  const [kurangKirimDeliveries, setKurangKirimDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  // Calculate if there is a gap (kurang kirim) between kotor and bersih
  const hasGap = useMemo(() => {
    if (!details || details.length === 0) return false;
    return details.some(d => {
      const kotor = Number(d.qty_kotor || 0);
      const bersih = d.qty_bersih !== null && d.qty_bersih !== "" ? Number(d.qty_bersih) : null;
      if (bersih === null) return kotor > 0;
      return kotor > bersih;
    });
  }, [details]);

  // Set default values when open or mode changes
  useEffect(() => {
    if (!open) return;
    setActiveTab("info");
    setKurangKirimDeliveries([]);
    setSelectedDelivery(null);
    setShowItemDetails(false);
    setShowAuditLogs(false);
    setShowSignatures(false);
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
        const res = await api("/ikm/linen-transactions-custom/employees");
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
        const res = await api(`/ikm/linen-transactions-custom/${transactionId}`);
        if (res.success) {
          const { header, details: det, auditLogs, kurangKirimDeliveries } = res.data;
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
          setDetails(det.map(d => ({
            ...d,
            qty_kotor: d.qty_kotor ?? 0,
            qty_bersih: d.qty_bersih ?? null,
            length_cm: d.length_cm ?? null,
            width_cm: d.width_cm ?? null,
            area_m2: d.area_m2 ?? null,
            accessory_qty: d.accessory_qty ?? 0,
            notes: d.notes || ""
          })));
          setAuditLogs(auditLogs || []);
          setKurangKirimDeliveries(kurangKirimDeliveries || []);
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

  // Load Custom Linens for Selected Hospital
  useEffect(() => {
    if (!open || !hospitalId) {
      setHospitalCustomLinens([]);
      return;
    }
    const loadCustomLinens = async () => {
      try {
        const res = await api(`/ikm/linen-transactions-custom/hospitals/${hospitalId}/linens`);
        if (res.success) {
          setHospitalCustomLinens(res.data);
        }
      } catch (err) {
        console.error("Gagal memuat linen custom rumah sakit:", err);
      }
    };
    loadCustomLinens();
  }, [open, hospitalId]);

  if (!open) return null;

  const selectedHospitalName = hospitals.find(h => Number(h.id) === Number(hospitalId))?.hospital_name || "-";

  const handleDetailFieldChange = (index, field, value) => {
    const updated = [...details];
    updated[index][field] = value;
    setDetails(updated);
  };

  const handleDetailRowUpdate = (index, updatedRow) => {
    const updated = [...details];
    updated[index] = updatedRow;
    setDetails(updated);
  };

  const handleAddRow = () => {
    setDetails([
      ...details,
      {
        hospital_linen_id: null,
        item_name: "",
        category: "LAINNYA",
        qty_kotor: 1,
        qty_bersih: null,
        length_cm: null,
        width_cm: null,
        area_m2: null,
        accessory_qty: 0,
        notes: ""
      }
    ]);
  };

  const handleDeleteRow = (index) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode !== "create" && !formNumber.trim()) return setError("Nomor Formulir wajib diisi.");
    if (!hospitalId) return setError("Silakan pilih Rumah Sakit.");
    if (!userPickup) return setError("Silakan pilih Petugas IKM Pickup.");
    if (!pickupDate) return setError("Silakan masukkan Tanggal Pickup.");

    if (details.length === 0) return setError("Mohon masukkan minimal 1 baris item.");

    // Validate details manually inputted names
    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      if (!d.hospital_linen_id && !d.item_name?.trim()) {
        return setError(`Nama barang pada baris ke-${i + 1} tidak boleh kosong (pilih dari master atau ketik nama barang).`);
      }
    }

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
          hospital_linen_id: d.hospital_linen_id ? Number(d.hospital_linen_id) : null,
          item_name: d.item_name || 'Linen Custom',
          category: d.category || 'LAINNYA',
          qty_kotor: Number(d.qty_kotor || 0),
          qty_bersih: d.qty_bersih !== "" && d.qty_bersih !== null ? Number(d.qty_bersih) : null,
          length_cm: d.length_cm !== "" && d.length_cm !== null ? parseFloat(d.length_cm) : null,
          width_cm: d.width_cm !== "" && d.width_cm !== null ? parseFloat(d.width_cm) : null,
          area_m2: d.area_m2 !== "" && d.area_m2 !== null ? parseFloat(d.area_m2) : null,
          accessory_qty: d.accessory_qty !== "" && d.accessory_qty !== null ? Number(d.accessory_qty) : 0,
          notes: d.notes
        }))
      };

      if (mode !== "create") {
        payload.form_number = formNumber;
      }
      let res;
      if (mode === "create") {
        res = await api("/ikm/linen-transactions-custom", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      } else {
        res = await api(`/ikm/linen-transactions-custom/${transactionId}`, {
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
                {mode === "create" ? "Tambah Transaksi Linen Custom IKM" : "Edit Transaksi Linen Custom IKM"}
              </h3>
              <p className="text-xs text-slate-400">Kelola dan pantau catatan serah terima linen custom rumah sakit</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="shrink-0 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all",
              activeTab === "info"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <HiOutlineDocumentText className="h-4 w-4" />
            <span>Info Transaksi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suratJalan")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all",
              activeTab === "suratJalan"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <HiOutlineTruck className="h-4 w-4" />
            <span>Riwayat Surat Jalan</span>
            {kurangKirimDeliveries.length > 0 && (
              <span className={cn(
                "rounded-full text-[10px] px-2 py-0.5 font-bold",
                activeTab === "suratJalan" ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-700"
              )}>
                {kurangKirimDeliveries.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: Info Transaksi Form */}
        {activeTab === "info" && (
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
                          <span>Petugas IKM <strong className="text-rose-500">*</strong></span>
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
                  <div
                    onClick={() => setShowItemDetails(prev => !prev)}
                    className={cn(
                      "flex items-center justify-between bg-slate-50 px-4 py-2.5 cursor-pointer hover:bg-slate-100/80 transition select-none",
                      showItemDetails && "border-b border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <HiOutlineDocumentText className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Item Detail Linen Custom</span>
                      {details.length > 0 && (
                        <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5">
                          {details.length} item
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!hospitalId && (
                        <span className="text-xs text-rose-500 italic">Pilih Rumah Sakit terlebih dahulu</span>
                      )}
                      <div className="text-slate-400 p-0.5">
                        {showItemDetails ? (
                          <HiOutlineChevronDown className="h-4 w-4" />
                        ) : (
                          <HiOutlineChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {showItemDetails && (
                    hospitalId ? (
                      <div className="overflow-x-auto animate-fade-in flex flex-col">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 w-10">No</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Linen Khusus</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">P (M)</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">L (M)</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">Luas (M2)</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-orange-500 w-24">Kotor</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-600 w-24">Bersih</th>
                              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Catatan</th>
                              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 w-12">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {details.map((detail, idx) => {
                              const isCustomLinenSelected = !!detail.hospital_linen_id;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-3 py-2 text-center text-xs text-slate-400 tabular-nums">{idx + 1}</td>

                                  {/* Nama Linen Khusus */}
                                  <td className="px-2 py-2">
                                    <div className="flex flex-col gap-1">
                                      {hospitalCustomLinens.length > 0 && (
                                        <select
                                          value={detail.hospital_linen_id || ""}
                                          onChange={(e) => {
                                            const hli = e.target.value;
                                            if (hli === "") {
                                              handleDetailRowUpdate(idx, { ...detail, hospital_linen_id: null, item_name: "" });
                                            } else {
                                              const selectedLinen = hospitalCustomLinens.find(l => Number(l.hospital_linen_id) === Number(hli));
                                              if (selectedLinen) {
                                                handleDetailRowUpdate(idx, {
                                                  ...detail,
                                                  hospital_linen_id: Number(hli),
                                                  item_name: selectedLinen.linen_display_name,
                                                  category: selectedLinen.category_id === 32 ? "GORDEN" : selectedLinen.category_id === 33 ? "VITRASE" : "LAINNYA",
                                                  ownership_type: selectedLinen.ownership_type
                                                });
                                              }
                                            }
                                          }}
                                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-indigo-400 font-semibold"
                                        >
                                          <option value="">-- Pilih / Input Manual --</option>
                                          {hospitalCustomLinens.map(l => (
                                            <option key={l.hospital_linen_id} value={l.hospital_linen_id}>{l.linen_display_name}</option>
                                          ))}
                                        </select>
                                      )}
                                      {!isCustomLinenSelected && (
                                        <input
                                          type="text"
                                          placeholder="Nama barang..."
                                          value={detail.item_name || ""}
                                          onChange={(e) => handleDetailFieldChange(idx, "item_name", e.target.value)}
                                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-indigo-400 font-semibold"
                                        />
                                      )}
                                    </div>
                                  </td>

                                  {/* P (M) */}
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="P (M)"
                                      value={detail.length_cm ?? ""}
                                      onChange={(e) => {
                                        const p = e.target.value === "" ? null : Number(e.target.value);
                                        const l = detail.width_cm;
                                        const a = p !== null && l !== null ? p * l : null;
                                        handleDetailRowUpdate(idx, { ...detail, length_cm: p, area_m2: a });
                                      }}
                                      className="w-full text-center rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-indigo-400 font-semibold tabular-nums"
                                    />
                                  </td>

                                  {/* L (M) */}
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="L (M)"
                                      value={detail.width_cm ?? ""}
                                      onChange={(e) => {
                                        const l = e.target.value === "" ? null : Number(e.target.value);
                                        const p = detail.length_cm;
                                        const a = p !== null && l !== null ? p * l : null;
                                        handleDetailRowUpdate(idx, { ...detail, width_cm: l, area_m2: a });
                                      }}
                                      className="w-full text-center rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-indigo-400 font-semibold tabular-nums"
                                    />
                                  </td>

                                  {/* Luas (M2) */}
                                  <td className="px-2 py-2 text-center text-xs font-bold tabular-nums">
                                    <span className="font-bold text-slate-500 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg inline-block tabular-nums">
                                      {detail.area_m2 ? Number(detail.area_m2).toFixed(2) : "—"}
                                    </span>
                                  </td>

                                  {/* Kotor */}
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      required
                                      value={detail.qty_kotor}
                                      onChange={(e) => handleDetailFieldChange(idx, "qty_kotor", e.target.value === "" ? "" : Number(e.target.value))}
                                      className="w-full text-center rounded-lg border border-orange-200 bg-orange-50/50 py-1.5 px-2 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 font-bold text-orange-700"
                                    />
                                  </td>

                                  {/* Bersih */}
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="—"
                                      value={detail.qty_bersih ?? ""}
                                      onChange={(e) => handleDetailFieldChange(idx, "qty_bersih", e.target.value === "" ? null : Number(e.target.value))}
                                      className="w-full text-center rounded-lg border border-emerald-200 bg-emerald-50/50 py-1.5 px-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 font-bold text-emerald-700"
                                    />
                                  </td>

                                  {/* Catatan */}
                                  <td className="px-2 py-2">
                                    <input
                                      type="text"
                                      value={detail.notes || ""}
                                      onChange={(e) => handleDetailFieldChange(idx, "notes", e.target.value)}
                                      placeholder="Catatan..."
                                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                    />
                                  </td>

                                  {/* Aksi delete */}
                                  <td className="px-2 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(idx)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition mx-auto"
                                    >
                                      <HiOutlineTrash className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-start">
                          <button
                            type="button"
                            onClick={handleAddRow}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition shadow-sm"
                          >
                            <HiOutlinePlus className="h-4 w-4" />
                            <span>Tambah Baris Baru</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-rose-500 italic">
                        Silakan pilih Rumah Sakit terlebih dahulu untuk melihat item linen.
                      </div>
                    )
                  )}
                </div>

                {/* ── SECTION 5: Tanda Tangan Serah Terima ─────────────────────────── */}
                {mode !== "create" && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div
                      onClick={() => setShowSignatures(prev => !prev)}
                      className={cn(
                        "flex items-center justify-between bg-slate-50 px-4 py-2.5 cursor-pointer hover:bg-slate-100/80 transition select-none",
                        showSignatures && "border-b border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                          <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tanda Tangan Serah Terima</span>
                        <span className="rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5">
                          {[sigValetPickup, sigHospitalPickup, sigAssistantPickup, sigValetDelivery, sigHospitalDelivery, sigAssistantDelivery].filter(Boolean).length} / 6 Terverifikasi
                        </span>
                      </div>
                      <div className="text-slate-400 p-0.5">
                        {showSignatures ? (
                          <HiOutlineChevronDown className="h-4 w-4" />
                        ) : (
                          <HiOutlineChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {showSignatures && (
                      <div className="p-4 space-y-5 animate-fade-in bg-white">
                        
                        {/* Proses 1: Pengambilan Linen Kotor */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-700 font-bold text-xs">1</span>
                            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Pengambilan Linen Kotor</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            
                            {/* 1. Petugas IKM */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-center flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Petugas IKM</span>
                                <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                                  {userPickup ? employeeMap.get(Number(userPickup)) || `Karyawan #${userPickup}` : "—"}
                                </span>
                              </div>
                              <div className="h-24 w-full rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-1 shadow-inner">
                                {sigValetPickup ? (
                                  <img src={getSignatureUrl(sigValetPickup)} alt="TTD Petugas IKM Pickup" className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Belum Tanda Tangan</span>
                                )}
                              </div>
                              <div className="flex justify-center">
                                {renderSignatureStatus(sigValetPickup)}
                              </div>
                            </div>

                            {/* 2. Petugas RS */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-center flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Petugas RS</span>
                                <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                                  {hospitalStaffPickup || "—"}
                                </span>
                              </div>
                              <div className="h-24 w-full rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-1 shadow-inner">
                                {sigHospitalPickup ? (
                                  <img src={getSignatureUrl(sigHospitalPickup)} alt="TTD Petugas RS Pickup" className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Belum Tanda Tangan</span>
                                )}
                              </div>
                              <div className="flex justify-center">
                                {renderSignatureStatus(sigHospitalPickup)}
                              </div>
                            </div>

                            {/* 3. Perawat RS */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-center flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Perawat RS</span>
                                <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                                  {hospitalAssistantPickup || "—"}
                                </span>
                              </div>
                              <div className="h-24 w-full rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-1 shadow-inner">
                                {sigAssistantPickup ? (
                                  <img src={getSignatureUrl(sigAssistantPickup)} alt="TTD Perawat RS Pickup" className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Belum Tanda Tangan</span>
                                )}
                              </div>
                              <div className="flex justify-center">
                                {renderSignatureStatus(sigAssistantPickup)}
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Proses 2: Pengiriman Linen Bersih */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 font-bold text-xs">2</span>
                            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Pengiriman Linen Bersih</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            
                            {/* 1. Petugas IKM */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-center flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Petugas IKM</span>
                                <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                                  {userDelivery ? employeeMap.get(Number(userDelivery)) || `Karyawan #${userDelivery}` : "—"}
                                </span>
                              </div>
                              <div className="h-24 w-full rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-1 shadow-inner">
                                {sigValetDelivery ? (
                                  <img src={getSignatureUrl(sigValetDelivery)} alt="TTD Petugas IKM Delivery" className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Belum Tanda Tangan</span>
                                )}
                              </div>
                              <div className="flex justify-center">
                                {renderSignatureStatus(sigValetDelivery)}
                              </div>
                            </div>

                            {/* 2. Petugas RS */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-center flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Petugas RS</span>
                                <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                                  {hospitalStaffDelivery || "—"}
                                </span>
                              </div>
                              <div className="h-24 w-full rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-1 shadow-inner">
                                {sigHospitalDelivery ? (
                                  <img src={getSignatureUrl(sigHospitalDelivery)} alt="TTD Petugas RS Delivery" className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Belum Tanda Tangan</span>
                                )}
                              </div>
                              <div className="flex justify-center">
                                {renderSignatureStatus(sigHospitalDelivery)}
                              </div>
                            </div>

                            {/* 3. Perawat RS */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-center flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Perawat RS</span>
                                <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                                  {hospitalAssistantDelivery || "—"}
                                </span>
                              </div>
                              <div className="h-24 w-full rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-1 shadow-inner">
                                {sigAssistantDelivery ? (
                                  <img src={getSignatureUrl(sigAssistantDelivery)} alt="TTD Perawat RS Delivery" className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Belum Tanda Tangan</span>
                                )}
                              </div>
                              <div className="flex justify-center">
                                {renderSignatureStatus(sigAssistantDelivery)}
                              </div>
                            </div>

                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* ── SECTION 6: Riwayat Audit ─────────────────────────────── */}
                {mode !== "create" && auditLogs.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                    <div
                      onClick={() => setShowAuditLogs(prev => !prev)}
                      className={cn(
                        "flex items-center justify-between bg-slate-50 px-4 py-2.5 cursor-pointer hover:bg-slate-100/80 transition select-none",
                        showAuditLogs && "border-b border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
                          <HiOutlineClock className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Riwayat Perubahan</span>
                        <span className="rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5">{auditLogs.length}</span>
                      </div>
                      <div className="text-slate-400 p-0.5">
                        {showAuditLogs ? (
                          <HiOutlineChevronDown className="h-4 w-4" />
                        ) : (
                          <HiOutlineChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    {showAuditLogs && (
                      <div className="max-h-[350px] overflow-y-auto p-4 space-y-4 divide-y divide-slate-100 bg-white animate-fade-in">
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
                    )}
                  </div>
                )}

              </div>
            )}

          </form>
        )}

        {/* TAB 2: Riwayat Surat Jalan */}
        {activeTab === "suratJalan" && (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1.5 pb-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                <p className="text-sm text-slate-500">Memuat riwayat surat jalan...</p>
              </div>
            )}

            {!loading && (
              kurangKirimDeliveries.length > 0 ? (
                selectedDelivery ? (
                  /* Detail View of Selected Surat Jalan */
                  <div className="space-y-4 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setSelectedDelivery(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5"
                    >
                      <HiOutlineChevronLeft className="h-4 w-4" />
                      <span>Kembali ke Daftar Surat Jalan</span>
                    </button>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold shrink-0">
                            <HiOutlineTruck className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">
                              Surat Jalan: <span className="font-mono text-indigo-600">{selectedDelivery.surat_jalan_number || "—"}</span>
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Tanggal Pengiriman: <span className="font-semibold text-slate-600">{fmtLogDateTime(selectedDelivery.delivery_date)}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => exportSuratJalanKurangKirimCustom(selectedDelivery, selectedDelivery.details || [])}
                          className="rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <HiOutlinePrinter className="h-4 w-4" />
                          <span>Cetak Surat Jalan</span>
                        </button>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Petugas Valet</span>
                          <span className="font-semibold text-slate-700">{selectedDelivery.valet_name || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Penerima RS / Staff</span>
                          <span className="font-semibold text-slate-700">{selectedDelivery.recipient_name || selectedDelivery.hospital_staff || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">No. Kendaraan</span>
                          <span className="font-semibold text-slate-700">{selectedDelivery.vehicle_number || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Catatan</span>
                          <span className="font-semibold text-slate-700">{selectedDelivery.notes || "-"}</span>
                        </div>
                      </div>

                      {/* Items Table */}
                      {selectedDelivery.details && selectedDelivery.details.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-10">No</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase">Nama Linen</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-500 uppercase w-24">Jumlah (Pcs)</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-500 uppercase w-28">Dimensi (cm)</th>
                                <th className="px-3 py-2 text-center font-bold text-slate-500 uppercase w-24">Luas (m²)</th>
                                <th className="px-3 py-2 font-bold text-slate-500 uppercase">Catatan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {selectedDelivery.details.map((item, idx) => {
                                const qty = item.qty_delivered || 0;
                                const name = item.item_name || 'Linen Custom';
                                return (
                                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 text-center text-slate-400 tabular-nums">{idx + 1}</td>
                                    <td className="px-3 py-2 font-semibold text-slate-800">{name}</td>
                                    <td className="px-3 py-2 text-center font-bold text-emerald-600 tabular-nums">{qty}</td>
                                    <td className="px-3 py-2 text-center font-semibold text-slate-650 tabular-nums">
                                      {item.length_cm ? `${item.length_cm} cm` : "—"} x {item.width_cm ? `${item.width_cm} cm` : "—"}
                                    </td>
                                    <td className="px-3 py-2 text-center font-semibold text-slate-600 tabular-nums">{item.area_m2 ? Number(item.area_m2).toFixed(2) : "—"}</td>
                                    <td className="px-3 py-2 text-slate-500 italic">{item.notes || "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Summary List View of Compact Cards */
                  <div className="space-y-3">
                    {kurangKirimDeliveries.map((delivery, index) => {
                      const totalPcs = delivery.details ? delivery.details.reduce((sum, item) => sum + Number(item.qty_delivered || 0), 0) : 0;
                      return (
                        <div
                          key={delivery.id || index}
                          onClick={() => setSelectedDelivery(delivery)}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex flex-wrap items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition">
                              <HiOutlineTruck className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-800">
                                  Surat Jalan: <span className="font-mono text-indigo-600">{delivery.surat_jalan_number || "—"}</span>
                                </h4>
                                {totalPcs > 0 && (
                                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                                    {totalPcs} Pcs
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Tanggal: <span className="font-semibold text-slate-600">{fmtLogDateTime(delivery.delivery_date)}</span> • Valet: <span className="font-semibold text-slate-700">{delivery.valet_name || "-"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportSuratJalanKurangKirim(delivery, delivery.details || []);
                              }}
                              className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition inline-flex items-center gap-1 shadow-sm"
                            >
                              <HiOutlinePrinter className="h-3.5 w-3.5" />
                              <span>Cetak</span>
                            </button>
                            <div className="flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition pl-1">
                              <span>Detail</span>
                              <HiOutlineChevronRight className="h-4 w-4 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : hasGap ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-8 text-center space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 border border-amber-200">
                    <HiOutlineClock className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-amber-900">Pengiriman Linen akan segera di proses oleh Team Valet</h4>
                  <p className="text-xs text-amber-700 max-w-md mx-auto">
                    Terdapat selisih kotor dan bersih (kurang kirim) pada transaksi ini, namun surat jalan pengiriman kurang kirim belum diterbitkan oleh tim valet.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-8 text-center space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200">
                    <HiOutlineCheckCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Tidak ada proses kurang kirim dalam transaksi ini</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Jumlah linen bersih telah lengkap memenuhi jumlah linen kotor (tidak ada selisih kurang kirim).
                  </p>
                </div>
              )
            )}
          </div>
        )}

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
      const res = await api(`/ikm/linen-transactions-custom/${transaction.id}`, { method: "DELETE" });
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
              Apakah Anda yakin ingin menghapus transaksi linen custom untuk rumah sakit <strong className="text-slate-800">{transaction.hospital_name}</strong>?
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
export default function LinenTransactionCustom() {
  const [data, setData] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadExcel = async (rowId) => {
    setDownloadingId(rowId);
    try {
      const res = await api(`/ikm/linen-transactions-custom/${rowId}`);
      if (res.success) {
        // Map details format to suit exportSerahTerimaLinenExcel
        const mappedDetails = res.data.details.map(d => ({
          ...d,
          linen_display_name: d.item_name || d.linen_display_name,
          ownership_type: d.ownership_type || "-"
        }));

        await exportSerahTerimaLinenExcel({
          ...res.data,
          details: mappedDetails
        });
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
  const [kurangKirimOnly, setKurangKirimOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });

  // Modals Controller State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("edit"); // 'create', 'edit'
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
    document.title = "Serah Terima Linen Custom IKM | Alora Group Indonesia";
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

      const res = await api(`/ikm/linen-transactions-custom/rekap/cuci?${q.toString()}`);
      if (res.success) {
        await exportRekapCuciLinenKhusus(res, activePeriod.startDate, activePeriod.endDate, ownershipType);
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
        const res = await api("/ikm/linen-transactions-custom/hospitals");
        if (res.success) {
          setHospitals(res.data);
        }
      } catch {
        showToast("error", "Gagal memuat daftar rumah sakit");
      }
    };
    loadHospitals();
  }, []);

  // Load Transactions List
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (activePeriod.startDate) q.append("startDate", activePeriod.startDate);
      if (activePeriod.endDate) q.append("endDate", activePeriod.endDate);
      if (hospitalFilter) q.append("hospital_id", hospitalFilter);
      if (kurangKirimOnly) q.append("kurang_kirim_only", "true");
      if (search?.trim()) q.append("search", search.trim());
      q.append("page", String(page));
      q.append("limit", String(limit));

      const res = await api(`/ikm/linen-transactions-custom?${q.toString()}`);
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
  }, [activePeriod, hospitalFilter, kurangKirimOnly, search, page, limit]);

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

        {/* Create / Edit Form Modal */}
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
                <h1 className="text-xl font-bold text-white sm:text-2xl font-sans">Serah Terima Linen Khusus</h1>
                <p className="text-sm text-white/70">Monitoring data penerimaan linen custom kotor &amp; pengiriman linen custom bersih</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Download Button */}
              <button
                onClick={() => handleExportRekap("MILIK_RS")}
                disabled={exportingRekap}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0"
              >
                <HiOutlineArrowDownTray className="h-4 w-4" />
                {exportingRekap ? "Mengekspor..." : "Unduh Rekap"}
              </button>

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
              <h2 className="text-base font-bold text-slate-800">Daftar Transaksi Linen Custom</h2>
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
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Linen Custom Kotor</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Linen Custom Bersih</th>
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
                      Tidak ada data transaksi linen custom yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => {
                    const number = (page - 1) * limit + idx + 1;
                    const hasKurang = Number(row.total_kotor || 0) - Number(row.total_bersih || 0) !== 0;
                    const selisih = Number(row.total_kotor || 0) - Number(row.total_bersih || 0);
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
                          {selisih > 0 ? selisih : 0}
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
