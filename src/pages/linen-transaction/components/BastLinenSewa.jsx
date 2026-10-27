import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineArrowDownTray, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineDocumentText, HiOutlineExclamationTriangle, HiOutlineEye, HiOutlineFunnel, HiOutlineMagnifyingGlass, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";
import exportBastLinenSewa from "../utils/exportBastLinenSewa";
import { api } from "../../../lib/api";
import EmployeeSearchSelect from "./EmployeeSearchSelect";
import HospitalSearchSelect from "./HospitalSearchSelect";

function nowLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toInputDateTime(value) {
  const s = String(value || "").trim().replace(" ", "T");
  const match = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (match) return match[1];
  const day = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return day ? `${day[1]}T00:00` : nowLocal();
}

function showDateTime(value) {
  const s = String(value || "").replace("T", " ");
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/);
  if (!match) return s.slice(0, 16);
  return match[4] ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : `${match[3]}/${match[2]}/${match[1]}`;
}

function toTitleCase(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isTitleCase(str) {
  const raw = String(str || "").trim();
  return raw !== "" && raw === toTitleCase(raw);
}

function SignaturePad({ label, role, caption, value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = value;
  }, [value]);

  const point = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = event.touches ? event.touches[0] : event;
    return {
      x: ((src.clientX - rect.left) / rect.width) * canvas.width,
      y: ((src.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = point(event);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (event) => {
    if (!drawing.current) return;
    event.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          {role && <p className="text-xs font-bold uppercase tracking-wide text-slate-800">{role}</p>}
        </div>
        <button type="button" className="rounded-md bg-slate-200/80 px-2 py-1 text-[10px] font-bold text-slate-700" onClick={() => onChange("")}>
          Hapus
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={240}
        className="h-44 w-full touch-none cursor-crosshair rounded-lg border-2 border-dashed border-slate-200 bg-slate-50"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      {caption && <p className="mt-3 border-t border-slate-800 pt-2 text-center text-xs font-bold text-slate-800">{caption}</p>}
    </div>
  );
}

function entriesFromDetails(row) {
  const next = {};
  for (const d of row.details || []) {
    const key = d.room_id ? String(d.room_id) : (row.room_id ? String(row.room_id) : "all");
    if (!next[d.hospital_linen_id]) next[d.hospital_linen_id] = {};
    next[d.hospital_linen_id][key] = {
      pengiriman: Number(d.qty_pengiriman) ? String(d.qty_pengiriman) : "",
      penarikan: Number(d.qty_penarikan) ? String(d.qty_penarikan) : "",
      notes: d.notes || "",
    };
  }
  return next;
}

function scopeValue(entries, linenId, roomId, field) {
  const bucket = entries[linenId] || {};
  if (roomId) return bucket[roomId]?.[field] ?? "";
  if (field === "notes") return bucket.all?.notes || "";
  let sum = 0;
  let any = false;
  for (const val of Object.values(bucket)) {
    const n = val?.[field];
    if (n !== "" && n != null) { sum += Number(n) || 0; any = true; }
  }
  return any ? String(sum) : "";
}

function writeEntry(prev, linenId, roomId, field, raw) {
  const key = roomId || "all";
  const bucket = { ...(prev[linenId] || {}) };
  const current = { pengiriman: "", penarikan: "", notes: "", ...(bucket[key] || {}) };
  if (field === "notes" || roomId) {
    bucket[key] = { ...current, [field]: raw };
    return { ...prev, [linenId]: bucket };
  }
  let others = 0;
  for (const [k, val] of Object.entries(bucket)) {
    if (k === "all") continue;
    others += Number(val?.[field]) || 0;
  }
  const typed = raw === "" ? 0 : Number(raw) || 0;
  const allVal = Math.max(0, typed - others);
  bucket.all = { ...current, [field]: allVal ? String(allVal) : "" };
  return { ...prev, [linenId]: bucket };
}

function detailsFromEntries(entries) {
  const details = [];
  for (const [linenId, bucket] of Object.entries(entries)) {
    for (const [key, val] of Object.entries(bucket || {})) {
      const kirim = Number(val?.pengiriman) || 0;
      const tarik = Number(val?.penarikan) || 0;
      if (!kirim && !tarik) continue;
      details.push({
        hospital_linen_id: Number(linenId),
        room_id: key === "all" ? null : Number(key),
        qty_pengiriman: kirim,
        qty_penarikan: tarik,
        notes: val.notes || "",
      });
    }
  }
  return details;
}

export default function BastLinenSewa() {
  const [hospitals, setHospitals] = useState([]);
  const [hospitalId, setHospitalId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [linenSearch, setLinenSearch] = useState("");
  const [bastDate, setBastDate] = useState(nowLocal);
  const [employees, setEmployees] = useState([]);
  const [senderId, setSenderId] = useState("");
  const [senderManual, setSenderManual] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderPosition, setSenderPosition] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPosition, setReceiverPosition] = useState("");
  const [gaHeadName, setGaHeadName] = useState("");
  const [gaHeadPosition, setGaHeadPosition] = useState("");
  const [sigSender, setSigSender] = useState("");
  const [sigReceiver, setSigReceiver] = useState("");
  const [sigGa, setSigGa] = useState("");
  const [linens, setLinens] = useState([]);
  const [entries, setEntries] = useState({});
  const [history, setHistory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("history");

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    document.title = "Berita Acara Serah Terima Linen Sewa | Alora Group Indonesia";
    api("/ikm/linen-transactions/hospitals")
      .then((res) => { if (res.success) setHospitals(res.data || []); })
      .catch(() => showToast("error", "Gagal memuat rumah sakit"));
    api("/ikm/linen-transactions/employees")
      .then((res) => { if (res.success) setEmployees(res.data || []); })
      .catch(() => showToast("error", "Gagal memuat petugas"));
    api("/ikm/bast-linen-sewa/me")
      .then((res) => { if (res.success) setSenderName(res.data?.sender_name || ""); })
      .catch(() => {});
  }, []);

  const loadHistory = useCallback(async (hid) => {
    if (!hid) { setHistory([]); return; }
    const q = new URLSearchParams({ hospital_id: String(hid) });
    if (startDate) q.set("start_date", startDate);
    if (endDate) q.set("end_date", endDate);
    const res = await api(`/ikm/bast-linen-sewa?${q}`);
    if (res.success) setHistory(res.data || []);
  }, [startDate, endDate]);

  const loadLinens = useCallback(async (hid, rid, bastId) => {
    if (!hid) { setLinens([]); setRooms([]); return; }
    setLoading(true);
    try {
      const q = new URLSearchParams({ hospital_id: hid });
      if (rid) q.set("room_id", rid);
      if (bastId) q.set("bast_id", bastId);
      const res = await api(`/ikm/bast-linen-sewa/linens?${q}`);
      if (res.success) {
        setRooms(res.rooms || []);
        setLinens(res.data || []);
      }
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hospitalId) return;
    loadHistory(hospitalId).catch((err) => showToast("error", err.message));
  }, [hospitalId, loadHistory]);


  useEffect(() => {
    if (!hospitalId || activeTab !== "form") return;
    loadLinens(hospitalId, roomId, editingId);
  }, [hospitalId, roomId, editingId, loadLinens, activeTab]);

  const setQty = (id, field, raw) => {
    setEntries((prev) => writeEntry(prev, id, roomId, field, raw));
  };

  const resetForm = async (keepHospital = true) => {
    setEditingId(null);
    setRoomId("");
    setEntries({});
    setBastDate(nowLocal());
    setSenderId("");
    setSenderManual(false);
    setSenderPosition("");
    setReceiverName("");
    setReceiverPosition("");
    setGaHeadName("");
    setGaHeadPosition("");
    setSigSender("");
    setSigReceiver("");
    setSigGa("");
    if (!keepHospital) setHospitalId("");
    try {
      const res = await api("/ikm/bast-linen-sewa/me");
      if (res.success) setSenderName(res.data?.sender_name || "");
    } catch { /* nama tetap */ }
  };

  const openPreview = async (id) => {
    try {
      const res = await api(`/ikm/bast-linen-sewa/${id}`);
      if (!res.success) return;
      setPreview({
        ...res.data,
        lines: (res.data.details || []).map((row) => ({
          id: row.id,
          nama: row.linen_name || "Linen",
          ukuran: row.ukuran || row.size_name || "",
          bahan: row.bahan || row.material_name || "",
          warna: row.warna || row.color_name || "",
          kirim: Number(row.qty_pengiriman) || 0,
          tarik: Number(row.qty_penarikan) || 0,
        })),
      });
    } catch (err) {
      showToast("error", err.message || "Gagal membuka pratinjau");
    }
  };

  const savePreview = async () => {
    if (!preview) return;
    setPreviewSaving(true);
    try {
      const res = await api(`/ikm/bast-linen-sewa/${preview.id}/lines`, {
        method: "PATCH",
        body: JSON.stringify({
          lines: preview.lines.map((line) => ({ id: line.id, ukuran: line.ukuran, bahan: line.bahan, warna: line.warna })),
        }),
      });
      showToast("success", res.message || "Keterangan linen diperbarui");
    } catch (err) {
      showToast("error", err.message || "Gagal menyimpan keterangan linen");
    } finally {
      setPreviewSaving(false);
    }
  };

  const downloadBast = async (id) => {
    try {
      const res = await api(`/ikm/bast-linen-sewa/${id}`);
      if (!res.success || !exportBastLinenSewa(res.data)) showToast("error", "Gagal membuka laporan. Izinkan pop-up browser.");
    } catch (err) {
      showToast("error", err.message || "Gagal mengunduh berita acara");
    }
  };

  const startEdit = async (id) => {
    try {
      const res = await api(`/ikm/bast-linen-sewa/${id}`);
      if (!res.success) return;
      const row = res.data;
      setEditingId(row.id);
      setEntries(entriesFromDetails(row));
      setHospitalId(String(row.hospital_id));
      setRoomId(row.room_id ? String(row.room_id) : "");
      setBastDate(toInputDateTime(row.bast_date));
      setSenderName(row.sender_name || "");
      setSenderId("");
      setSenderPosition(row.sender_position || "");
      setReceiverName(row.receiver_name || row.rs_inspector_name || "");
      setReceiverPosition(row.receiver_position || "");
      setGaHeadName(row.ga_head_name || "");
      setGaHeadPosition(row.ga_head_position || "");
      setSigSender("");
      setSigReceiver("");
      setSigGa("");
      setActiveTab("form");
    } catch (err) {
      showToast("error", err.message);
    }
  };

  const save = async () => {
    if (!hospitalId) return showToast("error", "Pilih rumah sakit");
    if (!senderName.trim()) return showToast("error", "Nama pengirim wajib diisi");
    if (!isTitleCase(senderName)) return showToast("error", "Nama pengirim harus Capital Each Word");
    if (!senderPosition.trim()) return showToast("error", "Jabatan pengirim wajib diisi");
    if (!receiverName.trim()) return showToast("error", "Nama penerima wajib diisi");
    if (!isTitleCase(receiverName)) return showToast("error", "Nama penerima harus Capital Each Word");
    if (!receiverPosition.trim()) return showToast("error", "Jabatan penerima wajib diisi");
    const hasGa = Boolean(gaHeadName.trim() || gaHeadPosition.trim());
    if (hasGa && !gaHeadName.trim()) return showToast("error", "Nama yang mengetahui wajib diisi jika jabatan diisi");
    if (hasGa && !isTitleCase(gaHeadName)) return showToast("error", "Nama yang mengetahui harus Capital Each Word");
    if (hasGa && !gaHeadPosition.trim()) return showToast("error", "Jabatan yang mengetahui wajib diisi jika nama diisi");
    const details = detailsFromEntries(entries);
    if (!details.length) return showToast("error", "Isi minimal satu pengiriman atau penarikan");
    setSaving(true);
    try {
      const body = {
        hospital_id: Number(hospitalId),
        room_id: roomId ? Number(roomId) : null,
        bast_date: bastDate,
        sender_name: senderName.trim(),
        sender_position: senderPosition.trim(),
        receiver_name: receiverName.trim(),
        receiver_position: receiverPosition.trim(),
        ga_head_name: gaHeadName.trim(),
        ga_head_position: gaHeadPosition.trim(),
        signature_sender: sigSender || null,
        signature_receiver: sigReceiver || null,
        signature_ga: sigGa || null,
        details,
      };
      const res = editingId
        ? await api(`/ikm/bast-linen-sewa/${editingId}`, { method: "PUT", body: JSON.stringify(body) })
        : await api("/ikm/bast-linen-sewa", { method: "POST", body: JSON.stringify(body) });
      showToast("success", res.message || "BAST tersimpan");
      await resetForm(true);
      setActiveTab("history");
      await loadHistory(hospitalId);
      await loadLinens(hospitalId, "", null);
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      const res = await api(`/ikm/bast-linen-sewa/${deleteId}`, { method: "DELETE" });
      showToast("success", res.message || "BAST dihapus");
      setDeleteId(null);
      if (editingId === deleteId) await resetForm(true);
      await loadHistory(hospitalId);
      await loadLinens(hospitalId, roomId, editingId === deleteId ? null : editingId);
    } catch (err) {
      showToast("error", err.message);
    }
  };

  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400";
  const visibleLinens = linens.filter((row) => String(row.linen_name || "").toLowerCase().includes(linenSearch.trim().toLowerCase()));
  const selectedRoom = rooms.find((room) => String(room.id) === String(roomId));
  const rsStockLabel = selectedRoom ? `Stok di ${selectedRoom.room_name}` : "Stok di RS";
  const hospitalName = hospitals.find((item) => String(item.id) === String(hospitalId))?.hospital_name || "";
  const closeForm = () => { resetForm(true); setActiveTab("history"); };

  useEffect(() => {
    if (!senderName || senderId || !employees.length) return;
    const hit = employees.find((emp) => toTitleCase(emp.full_name) === toTitleCase(senderName));
    if (hit) setSenderId(String(hit.employee_id));
  }, [employees, senderName, senderId]);

  return (
    <main className="min-h-screen bg-indigo-50 py-6 text-slate-800 sm:py-10" style={{ colorScheme: "light" }}>
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${toast.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      <section className="relative rounded-3xl border border-[#1ea59e]/30 bg-gradient-to-br from-[#126776] via-[#157f8a] to-[#1ea59e] p-5 shadow-sm sm:p-6">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[#1ea59e]/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
              <HiOutlineDocumentText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-sans text-xl font-bold text-white sm:text-2xl">Berita Acara Serah Terima Linen Sewa</h1>
              <p className="text-sm text-white/70">Pengiriman menambah stok, penarikan mengurangi stok linen sewa</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!hospitalId) return showToast("error", "Pilih rumah sakit");
              resetForm(true);
              setActiveTab("form");
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-white/25"
          >
            <HiOutlinePlus className="h-4 w-4" /> Tambah BAST
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
          Filter
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Rumah Sakit</span>
            <HospitalSearchSelect
              value={hospitalId}
              hospitals={hospitals}
              allowClear={false}
              placeholder="Pilih rumah sakit"
              onChange={(id) => { setHospitalId(id); setRoomId(""); setLinenSearch(""); if (activeTab === "form") closeForm(); }}
            />
          </div>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <HiOutlineDocumentText className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-bold text-slate-800">Daftar Berita Acara</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
            {history.length.toLocaleString("id-ID")} data
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-16 whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">No</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nomor</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pengirim</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Penerima</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Kirim</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Tarik</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!hospitalId && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">Pilih rumah sakit terlebih dahulu.</td></tr>
              )}
              {hospitalId && history.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">Tidak ada data berita acara yang ditemukan.</td></tr>
              )}
              {history.map((row, idx) => (
                <tr key={row.id} onClick={() => startEdit(row.id)} className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3.5 text-center text-xs font-medium tabular-nums text-slate-400">{idx + 1}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-700">{row.bast_number}</td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{showDateTime(row.bast_date)}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-700">{row.sender_name}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-700">{row.receiver_name}</td>
                  <td className="px-4 py-3.5 text-center text-xs font-medium tabular-nums text-slate-700">{row.total_pengiriman}</td>
                  <td className="px-4 py-3.5 text-center text-xs font-medium tabular-nums text-slate-700">{row.total_penarikan}</td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => openPreview(row.id)} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600" aria-label="Pratinjau berita acara">
                        <HiOutlineEye className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => downloadBast(row.id)} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600" aria-label="Unduh berita acara">
                        <HiOutlineArrowDownTray className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => startEdit(row.id)} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600" title="Edit">
                        <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setDeleteId(row.id)} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-rose-300 hover:text-rose-600" title="Hapus">
                        <HiOutlineTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      {activeTab === "form" && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={closeForm}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex shrink-0 items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <HiOutlineDocumentText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{editingId ? "Edit Berita Acara Serah Terima Linen Sewa" : "Tambah Berita Acara Serah Terima Linen Sewa"}</h3>
              <p className="text-xs text-slate-400">{hospitalName}. Pengiriman menambah stok, penarikan mengurangi stok.</p>
            </div>
          </div>
          <button type="button" onClick={closeForm} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1.5 pb-4 text-slate-800">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <HiOutlineDocumentText className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Info BAST</span>
          </div>
          <div className="space-y-4 p-4">
          <label className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center">
            <span className="w-28 shrink-0 text-xs font-semibold text-slate-500">Tanggal</span>
            <input type="datetime-local" value={bastDate} onChange={(e) => setBastDate(e.target.value)} className={`${fieldClass} sm:max-w-xs`} />
          </label>
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Yang menyerahkan</p>
                <p className="text-sm font-semibold text-slate-800">Pihak Kedua · IKM</p>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="text-sm text-slate-600">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Nama Pengirim</span>
                  {senderManual || (senderName && !senderId) ? (
                    <div className="flex items-center gap-2">
                      <input value={senderName} onChange={(e) => setSenderName(e.target.value)} onBlur={() => setSenderName(toTitleCase(senderName))} placeholder="Ketik nama pengirim" autoFocus={senderManual} className={fieldClass} />
                      <button type="button" onClick={() => { setSenderManual(false); setSenderId(""); setSenderName(""); }} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Pilih daftar</button>
                    </div>
                  ) : (
                    <>
                      <EmployeeSearchSelect
                        value={senderId}
                        employees={employees}
                        accent="orange"
                        placeholder="Pilih pengirim"
                        onChange={(id) => {
                          setSenderId(id);
                          const emp = employees.find((item) => String(item.employee_id) === String(id));
                          setSenderName(emp ? toTitleCase(emp.full_name) : "");
                        }}
                      />
                      <button type="button" onClick={() => { setSenderManual(true); setSenderId(""); setSenderName(""); }} className="mt-1.5 text-xs font-semibold text-indigo-600 hover:underline">+ Isi manual (tidak ada di daftar)</button>
                    </>
                  )}
                </div>
                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Jabatan Pengirim</span>
                  <input value={senderPosition} onChange={(e) => setSenderPosition(e.target.value)} placeholder="Contoh: Staff Operasional" className={fieldClass} />
                </label>
              </div>
            </div>
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Yang menerima</p>
                <p className="text-sm font-semibold text-slate-800">Pihak Pertama · Rumah Sakit</p>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Nama Penerima</span>
                  <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} onBlur={() => setReceiverName(toTitleCase(receiverName))} placeholder="Contoh: Siti Aminah" className={fieldClass} />
                </label>
                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Jabatan Penerima</span>
                  <input value={receiverPosition} onChange={(e) => setReceiverPosition(e.target.value)} placeholder="Contoh: Kepala Unit Rumah Tangga" className={fieldClass} />
                </label>
              </div>
            </div>
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Mengetahui</p>
                <p className="text-sm font-semibold text-slate-800">Pejabat yang mengetahui <span className="text-xs font-normal text-slate-400">(opsional)</span></p>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Nama</span>
                  <input value={gaHeadName} onChange={(e) => setGaHeadName(e.target.value)} onBlur={() => setGaHeadName(toTitleCase(gaHeadName))} placeholder="Contoh: Budi Santoso" className={fieldClass} />
                </label>
                <label className="block text-sm text-slate-600">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Jabatan</span>
                  <input value={gaHeadPosition} onChange={(e) => setGaHeadPosition(e.target.value)} placeholder="Contoh: Kepala Divisi GA" className={fieldClass} />
                </label>
              </div>
            </div>
          </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <HiOutlineDocumentText className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Item Detail Linen</span>
          </div>
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-3 sm:flex-row">
            <div className="relative min-w-[200px]">
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={!hospitalId} className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100">
                <option value="">Seluruh Unit</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.room_name}</option>)}
              </select>
              <HiOutlineChevronDown className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-slate-400" />
            </div>
            <div className="relative flex-1">
              <HiOutlineMagnifyingGlass className="absolute inset-y-0 left-3 my-auto h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Cari nama linen..." value={linenSearch} onChange={(e) => setLinenSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              {linenSearch && <button type="button" onClick={() => setLinenSearch("")} className="absolute inset-y-0 right-3 my-auto text-slate-400">✕</button>}
            </div>
          </div>
          <div className="max-h-[75vh] overflow-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 [&_th]:sticky [&_th]:top-0 [&_th]:bg-slate-50">
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400 shadow-[0_1px_0_#e2e8f0]">
                <th className="w-12 px-4 py-3.5 text-center">No</th>
                <th className="px-4 py-3.5">Nama Linen</th>
                <th className="px-4 py-3.5 text-center">Stok di IKM</th>
                <th className="px-4 py-3.5 text-center">{rsStockLabel}</th>
                <th className="w-28 px-4 py-3.5 text-center">Pengiriman</th>
                <th className="w-28 px-4 py-3.5 text-center">Penarikan</th>
                <th className="px-4 py-3.5">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!hospitalId && <tr><td colSpan={7} className="px-4 py-16 text-center text-sm font-semibold text-slate-400">Pilih rumah sakit terlebih dahulu</td></tr>}
              {hospitalId && loading && <tr><td colSpan={7} className="px-4 py-16 text-center text-sm font-semibold text-slate-400">Memuat linen sewa...</td></tr>}
              {hospitalId && !loading && visibleLinens.length === 0 && <tr><td colSpan={7} className="px-4 py-16 text-center text-sm font-semibold text-slate-400">{linenSearch ? `Tidak ada linen yang cocok dengan "${linenSearch}"` : "Tidak ada linen sewa"}</td></tr>}
              {hospitalId && !loading && visibleLinens.map((row, index) => {
                const kirim = Number(scopeValue(entries, row.hospital_linen_id, roomId, "pengiriman")) || 0;
                const tarik = Number(scopeValue(entries, row.hospital_linen_id, roomId, "penarikan")) || 0;
                const over = tarik > Number(row.stock_rs) + kirim;
                return (
                  <tr key={row.hospital_linen_id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-800">{row.linen_name}</p></td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{row.stock_ikm ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{row.stock_rs ?? 0}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <input type="number" min="0" placeholder="0" value={scopeValue(entries, row.hospital_linen_id, roomId, "pengiriman")} onChange={(e) => setQty(row.hospital_linen_id, "pengiriman", e.target.value)} className="w-16 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-center text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
                    </td>
                    <td className="px-3 py-2.5">
                      <input type="number" min="0" placeholder="0" value={scopeValue(entries, row.hospital_linen_id, roomId, "penarikan")} onChange={(e) => setQty(row.hospital_linen_id, "penarikan", e.target.value)} className={`w-16 rounded-lg border py-1.5 text-center text-xs font-semibold outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 ${over ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-700"}`} />
                    </td>
                    <td className="px-3 py-2.5">
                      <input value={scopeValue(entries, row.hospital_linen_id, roomId, "notes")} placeholder="Catatan item..." onChange={(e) => setQty(row.hospital_linen_id, "notes", e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${gaHeadName.trim() && gaHeadPosition.trim() ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <SignaturePad label="Yang menyerahkan," role="Pihak Kedua" caption={senderPosition} value={sigSender} onChange={setSigSender} />
          <SignaturePad label="Yang menerima," role="Pihak Pertama" caption={receiverPosition} value={sigReceiver} onChange={setSigReceiver} />
          {gaHeadName.trim() && gaHeadPosition.trim() && <SignaturePad label="Mengetahui," name={gaHeadName} caption={gaHeadPosition} value={sigGa} onChange={setSigGa} />}
        </div>
        <p className="mt-2 text-xs text-slate-400">Tanda tangan boleh dikosongkan dan dilengkapi nanti. Kanvas kosong saat edit mempertahankan tanda tangan yang sudah tersimpan.</p>

        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Tutup
          </button>
          <button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Simpan
          </button>
        </div>
      </div>
      </div>,
      document.body
      )}

      {preview && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-800">{preview.bast_number}</p>
                <p className="text-sm text-slate-500">{showDateTime(preview.bast_date)} · {preview.hospital_name}</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} className="text-sm text-slate-500">Tutup</button>
            </div>
            <p className="mt-3 text-xs text-slate-500">Ukuran, bahan, dan warna yang kosong bisa diisi di sini. Simpan agar laporan berikutnya memakai isian ini.</p>
            <table className="mt-3 w-full text-sm text-slate-800">
              <thead className="text-center text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-center">Nama Linen</th>
                  <th className="px-2 py-2 text-center">Ukuran</th>
                  <th className="px-2 py-2 text-center">Bahan</th>
                  <th className="px-2 py-2 text-center">Warna</th>
                  <th className="px-2 py-2 text-center">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((line) => (
                  <tr key={line.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-center font-medium">{line.nama}</td>
                    {["ukuran", "bahan", "warna"].map((field) => (
                      <td key={field} className="px-2 py-2 text-center">
                        <input value={line[field]} maxLength={100} onChange={(e) => setPreview((prev) => prev && ({ ...prev, lines: prev.lines.map((item) => item.id === line.id ? { ...item, [field]: e.target.value } : item) }))} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm text-slate-800 outline-none focus:border-indigo-400" />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center font-semibold">{line.kirim || line.tarik}{line.kirim && line.tarik ? ` / ${line.tarik}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end">
              <button type="button" disabled={previewSaving} onClick={savePreview} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{previewSaving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {deleteId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <HiOutlineExclamationTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Konfirmasi Hapus BAST</h3>
                <p className="mt-1 text-xs text-slate-500">Hapus berita acara ini? Stok linen sewa akan dikembalikan.</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button type="button" onClick={() => setDeleteId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Batal</button>
              <button type="button" onClick={remove} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700">Hapus</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
