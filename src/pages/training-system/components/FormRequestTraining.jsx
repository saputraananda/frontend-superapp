import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../../lib/api";
import {
  HiOutlineUser,
  HiOutlineBuildingOffice,
  HiOutlineCalendar,
  HiOutlineBookOpen,
  HiOutlineChevronDown,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineArrowLeft,
  HiOutlineClock
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function FormRequestTraining() {
  const navigate = useNavigate();
  const location = useLocation();
  const editId = location.state?.editId || null;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [requesterId, setRequesterId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split("T")[0]);
  const [topic, setTopic] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [trainingType, setTrainingType] = useState("Refreshment");
  const [trainingMethod, setTrainingMethod] = useState("Internal");
  const [reasonsAndImpact, setReasonsAndImpact] = useState("");
  const [currentCompetency, setCurrentCompetency] = useState("");
  const [targetCompetency, setTargetCompetency] = useState("");
  const [trainingTarget, setTrainingTarget] = useState("");
  const [priorityMaterial, setPriorityMaterial] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  // Relational arrays
  const [selectedMentors, setSelectedMentors] = useState([]); // Array of employee objects
  const [selectedTrainees, setSelectedTrainees] = useState([]); // Array of employee objects
  const [selectedVendors, setSelectedVendors] = useState([]); // Array of vendor objects

  // Custom text input for vendors (if external and typing manually)
  const [customVendorText, setCustomVendorText] = useState("");

  // Master lists
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);

  // Check user level
  const [currentUser, setCurrentUser] = useState(null);
  const [requesterEmployee, setRequesterEmployee] = useState(null);

  // Load masters & initial data
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      try {
        // Fetch masters
        const empsData = await api("/employees");
        setEmployees(Array.isArray(empsData) ? empsData : []);

        const masterData = await api("/employees/master-data");
        setDepartments(masterData.departments || []);
        setCompanies(masterData.companies || []);

        const vData = await api("/vendors");
        setVendorsList(vData.vendors || []);

        // Get logged in user from localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setCurrentUser(parsed);
          const loggedEmp = parsed.employee;
          if (loggedEmp) {
            setRequesterId(loggedEmp.employee_id);
            setDepartmentId(loggedEmp.department_id || "");
            setRequesterEmployee(loggedEmp);
          }
        }

        // If edit mode
        if (editId) {
          const detail = await api(`/training/${editId}`);
          const t = detail.training;
          setRequesterId(t.requester_id);
          setDepartmentId(t.department_id);
          setRequestDate(t.request_date);
          setTopic(t.topic);
          setCompanyId(t.company_id);
          setTrainingType(t.training_type);
          setTrainingMethod(t.training_method);
          setReasonsAndImpact(t.reasons_and_impact);
          setCurrentCompetency(t.current_competency);
          setTargetCompetency(t.target_competency);
          setTrainingTarget(t.training_target);
          setPriorityMaterial(t.priority_material);
          setContactPersonId(t.contact_person_id || "");
          setSupervisorId(t.supervisor_id || "");
          
          setSelectedTrainees(detail.trainees || []);
          setSelectedMentors(detail.mentors || []);

          // Vendors mapping
          const mappedVendors = (detail.vendors || []).map(v => ({
            id: v.vendor_id || `custom-${Date.now()}-${Math.random()}`,
            vendor_id: v.vendor_id,
            vendor_name: v.vendor_name || v.nama_vendor,
            nama_vendor: v.nama_vendor || v.vendor_name
          }));
          setSelectedVendors(mappedVendors);
        }
      } catch (err) {
        console.error("Form initialization error:", err);
        setError("Gagal memuat data formulir");
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [editId]);

  // Sync department and supervisor flag when requester changes
  useEffect(() => {
    if (requesterId) {
      const selected = employees.find(e => Number(e.employee_id) === Number(requesterId));
      if (selected) {
        setRequesterEmployee(selected);
        // Only set department if creating a new one (not editing)
        if (!editId) {
          setDepartmentId(selected.department_id || "");
        }
      }
    }
  }, [requesterId, employees, editId]);

  // Check if supervisor selection is required (Requester is job level 4 - Staff)
  // Let's resolve the requester's job level from employee list.
  // Wait, the API returns list of employees, does it contain job_level_id?
  // Let's check `requesterEmployee?.job_level_id` or find requester in employees list.
  // Wait! Let's check if the API returns employees with job_level_id. In listEmployees controller:
  // e.employee_id, e.full_name, e.email, e.position_id, e.department_id, p.position_name, d.department_name.
  // Oh! listEmployees doesn't select job_level_id!
  // Wait, does requesterEmployee from localstorage have job_level_id?
  // Yes! The login and /auth/me routes select `e.*` which contains `job_level_id`.
  // But if the requester selects a different employee, how do we know their job level?
  // We can fetch details of the selected requester!
  // Or let's fetch the selected employee's full details. Let's write a small helper to fetch job level
  // or default to staff if we don't know, or let's assume we can fetch and query the level, or let's select from employees where e.employee_id matches.
  // Wait, we can fetch the selected employee's job level using a simple local search or if we don't have it, fetch it.
  // Wait, to keep things fast, we can default to showing supervisor field if requester job_level_id is Staff or if job_level_id is undefined (to be safe),
  // OR we can make a query to get selected employee details.
  // Let's query details when requester changes!
  const [requesterJobLevel, setRequesterJobLevel] = useState("Staff");
  useEffect(() => {
    const fetchRequesterLevel = async () => {
      if (!requesterId) return;
      try {
        const emp = await api(`/employees/master-data`); // we can get master employee data?
        // Wait, `/employees` doesn't have details, but we can call a quick search or details route if it exists.
        // Wait, does `/employees/:id` exist? No, `/employees` route does not have individual GET by default.
        // Wait! In `trainingController` we implemented `getEmployeeDetails`.
        // Let's check if we can query from a generic route. Wait! `/employees/profile` gets profile of logged-in employee.
        // But what about other employees?
        // Let's check if there is an endpoint `/employees/:id` or if we can see.
        // Wait, `employeeRoutes.js` lists:
        // `router.get("/", listEmployees)`
        // `router.get("/profile", getProfile)`
        // `router.put("/profile", updateProfile)`
        // `router.get("/master-data", getMasterData)`
        // No `/employees/:id`!
        // Wait! Let's check if `hr/employees` or similar exists.
        // In `backend/index.js`, we saw:
        // `app.use("/hr", masterKarRoutes)`
        // `app.use("/employees", employeeRoutes)`
        // Let's check if `/hr/employees` or similar exists. Let's see `/hr` routes.
        // That's okay, is there a simpler way?
        // Yes, we can fetch all employees details or we can just query the job level of the selected employee in the backend!
        // In our backend `createRequest` and `updateRequest` controller, we already do:
        // `const requester = await getEmployeeDetails(requester_id);`
        // `const requireSupervisor = jobLevel === 4;`
        // So the backend automatically checks and decides!
        // On the frontend, we can query or let's just show the supervisor selector for anyone whose level isn't explicitly known to be Manager/Director,
        // or let's check `requesterId === currentUser?.employee?.employee_id` and use `currentUser?.employee?.job_level_id`.
        // If it is a different employee, we can check if they are in the list. Wait, listEmployees returns position_name.
        // If the position_name contains "Director", "Manager", "Supervisor", "Leader", they are supervisors/managers. If not, they are staff.
        // This is a very clean frontend heuristic!
        // Let's write a heuristic:
        const requesterDetails = employees.find(e => Number(e.employee_id) === Number(requesterId));
        if (requesterDetails) {
          const pos = (requesterDetails.position || "").toLowerCase();
          const isStaff = !pos.includes("supervisor") && !pos.includes("manager") && !pos.includes("director") && !pos.includes("head") && !pos.includes("lead");
          setRequesterJobLevel(isStaff ? "Staff" : "Supervisor");
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRequesterLevel();
  }, [requesterId, employees, currentUser]);

  const requireSupervisor = requesterJobLevel === "Staff";

  // Submit form handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requesterId || !departmentId || !topic || !companyId || !trainingType || !trainingMethod) {
      setError("Silakan lengkapi kolom wajib pengisian");
      return;
    }

    if (selectedTrainees.length === 0) {
      setError("Minimal harus memilih 1 karyawan yang akan di training");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      requester_id: Number(requesterId),
      department_id: Number(departmentId),
      request_date: requestDate,
      topic,
      company_id: Number(companyId),
      training_type: trainingType,
      training_method: trainingMethod,
      reasons_and_impact: reasonsAndImpact,
      current_competency: currentCompetency,
      target_competency: targetCompetency,
      training_target: trainingTarget,
      priority_material: priorityMaterial,
      contact_person_id: contactPersonId ? Number(contactPersonId) : null,
      supervisor_id: requireSupervisor && supervisorId ? Number(supervisorId) : null,
      mentors: trainingMethod === "Internal" ? selectedMentors.map(m => m.employee_id) : [],
      trainees: selectedTrainees.map(t => t.employee_id),
      vendors: trainingMethod === "Eksternal" ? selectedVendors.map(v => ({
        vendor_id: v.vendor_id || null,
        vendor_name: v.vendor_name || v.nama_vendor
      })) : []
    };

    try {
      if (editId) {
        await api(`/training/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await api("/training", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      navigate("/training-management-system/request");
    } catch (err) {
      console.error("Form submit error:", err);
      setError(err.message || "Gagal menyimpan pengajuan training");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Back button */}
        <button
          onClick={() => navigate("/training-management-system/request")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <HiOutlineArrowLeft className="h-4 w-4" /> Kembali ke Daftar
        </button>

        {/* Header card */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-amber-500/10 mb-8"
          style={{ background: "linear-gradient(135deg, #E8823A, #D4A12A)" }}
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <h1 className="text-2xl font-bold">{editId ? "Ubah Pengajuan Training" : "Buat Pengajuan Training"}</h1>
          <p className="text-sm text-white/80 mt-1">Lengkapi form pengajuan training di bawah ini dengan lengkap.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Data Pengaju & General */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/50 space-y-6">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Informasi Pengaju</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Nama Pengaju */}
              <SearchableSelect
                label="Nama Pengaju"
                required
                options={employees.map(e => ({ id: e.employee_id, name: e.full_name, sub: e.position }))}
                value={requesterId}
                onChange={setRequesterId}
                placeholder="Cari karyawan..."
              />

              {/* 2. Departemen */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">
                  Departemen <span className="text-rose-500">*</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition"
                  required
                >
                  <option value="">Pilih Departemen</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Tanggal Pengajuan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">
                  Tanggal Pengajuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              {/* 4.1 Company */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">
                  Perusahaan Penyelenggara/Di-training <span className="text-rose-500">*</span>
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition"
                  required
                >
                  <option value="">Pilih Perusahaan</option>
                  {companies.map((comp) => (
                    <option key={comp.company_id} value={comp.company_id}>
                      {comp.company_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Topik Training */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Topik Training <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Contoh: Sosialisasi SOP Linen Lipat, Excel Intermediate"
                className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition w-full"
                required
              />
            </div>
          </div>

          {/* Section 2: Detail Training */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/50 space-y-6">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Metode & Jenis Training</h2>

            {/* 5. Jenis Training */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-500">
                Jenis Training <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    value: "Refreshment",
                    title: "Refreshment",
                    desc: "Menguatkan pemahaman kerja atau sosialisasi SOP"
                  },
                  {
                    value: "Upskilling",
                    title: "Upskilling",
                    desc: "Meningkatkan skill karyawan untuk efisiensi kerja"
                  },
                  {
                    value: "Corrective Training",
                    title: "Corrective Training",
                    desc: "Memperbaiki kesalahan kerja atau ketidaksesuaian SOP"
                  }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition text-left",
                      trainingType === opt.value
                        ? "border-amber-500 bg-amber-50/30"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="trainingType"
                      value={opt.value}
                      checked={trainingType === opt.value}
                      onChange={() => setTrainingType(opt.value)}
                      className="sr-only"
                    />
                    <span className="font-bold text-sm text-slate-800">{opt.title}</span>
                    <span className="text-xs text-slate-400 mt-1 leading-relaxed">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 6. Metode Training */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Metode Training <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-4">
                {["Internal", "Eksternal"].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setTrainingMethod(method)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-sm font-semibold border transition",
                      trainingMethod === method
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Mentors (Internal only) */}
            {trainingMethod === "Internal" && (
              <SearchableMultiSelect
                label="Karyawan yang Direkomendasikan Menjadi Mentor (Opsional)"
                options={employees.map(e => ({ id: e.employee_id, name: e.full_name, sub: e.position }))}
                selected={selectedMentors}
                onChange={setSelectedMentors}
                placeholder="Cari mentor..."
              />
            )}

            {/* 8. Vendors (External only) */}
            {trainingMethod === "Eksternal" && (
              <div className="space-y-4">
                <SearchableMultiSelect
                  label="Rekomendasi Vendor / Lembaga Penyelenggara (Opsional)"
                  options={vendorsList.map(v => ({ id: v.id, name: v.nama_vendor, sub: v.kategori }))}
                  selected={selectedVendors}
                  onChange={setSelectedVendors}
                  placeholder="Cari vendor..."
                />
                
                {/* Custom vendor text input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Tambahkan Vendor Custom (Jika tidak ada di daftar)
                    </label>
                    <input
                      type="text"
                      value={customVendorText}
                      onChange={(e) => setCustomVendorText(e.target.value)}
                      placeholder="Ketik nama vendor baru..."
                      className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (customVendorText.trim() !== "") {
                        const newCustom = {
                          id: `custom-${Date.now()}`,
                          nama_vendor: customVendorText.trim(),
                          vendor_name: customVendorText.trim()
                        };
                        setSelectedVendors([...selectedVendors, newCustom]);
                        setCustomVendorText("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition"
                  >
                    Tambah
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Uraian Kebutuhan */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/50 space-y-6">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Tujuan & Kebutuhan Training</h2>

            {/* 9. Alasan Pengajuan Training dan Dampaknya */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Alasan Pengajuan Training & Dampak Terhadap Kinerja <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reasonsAndImpact}
                onChange={(e) => setReasonsAndImpact(e.target.value)}
                placeholder="Jelaskan alasan detail pengajuan training dan dampaknya terhadap produktivitas..."
                rows={3}
                className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition w-full resize-none"
                required
              />
            </div>

            {/* 10. Kompetensi Karyawan Saat Ini */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Kompetensi Karyawan Saat Ini <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={currentCompetency}
                onChange={(e) => setCurrentCompetency(e.target.value)}
                placeholder="Deskripsikan skill/kompetensi yang dimiliki karyawan saat ini..."
                rows={3}
                className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition w-full resize-none"
                required
              />
            </div>

            {/* 11. Kompetensi yang ingin ditingkatkan */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Kompetensi yang Ingin Ditingkatkan <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={targetCompetency}
                onChange={(e) => setTargetCompetency(e.target.value)}
                placeholder="Sebutkan skill/kompetensi baru yang diharapkan dimiliki setelah training..."
                rows={3}
                className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition w-full resize-none"
                required
              />
            </div>

            {/* 12. Target Setelah Training */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Target Setelah Training <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={trainingTarget}
                onChange={(e) => setTrainingTarget(e.target.value)}
                placeholder="Target performa spesifik, misalnya: penurunan defect 5%, peningkatan kecepatan lipat linen..."
                rows={3}
                className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition w-full resize-none"
                required
              />
            </div>

            {/* 13. Materi yang paling prioritas */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Materi yang Paling Prioritas <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={priorityMaterial}
                onChange={(e) => setPriorityMaterial(e.target.value)}
                placeholder="Sebutkan materi utama yang harus dibahas secara mendalam..."
                rows={3}
                className="rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 transition w-full resize-none"
                required
              />
            </div>
          </div>

          {/* Section 4: Target Peserta & Narahubung */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/50 space-y-6">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Peserta & Narahubung</h2>

            {/* 14. Nama Karyawan yang akan di training */}
            <SearchableMultiSelect
              label="Nama Karyawan Yang Akan Di-training (Min. 1)"
              required
              options={employees.map(e => ({ id: e.employee_id, name: e.full_name, sub: e.position }))}
              selected={selectedTrainees}
              onChange={setSelectedTrainees}
              placeholder="Cari karyawan..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 15. Narahubung */}
              <SearchableSelect
                label="Narahubung (Opsional)"
                options={employees.map(e => ({ id: e.employee_id, name: e.full_name, sub: e.position }))}
                value={contactPersonId}
                onChange={setContactPersonId}
                placeholder="Cari kontak person..."
              />


            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-12">
            <button
              type="button"
              onClick={() => navigate("/training-management-system/request")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-amber-500/30 transition disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              {loading && <HiOutlineClock className="h-4 w-4 animate-spin" />}
              {editId ? "Simpan Perubahan" : "Kirim Pengajuan"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

// ── Searchable Dropdown Single-Select Component ──────────────────────────────
function SearchableSelect({ label, required, options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const selectedOption = options.find(opt => Number(opt.id) === Number(value));

  const filtered = options.filter(opt =>
    (opt.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (opt.sub || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-1.5 relative" ref={wrapRef}>
      <label className="text-xs font-semibold text-slate-500">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between rounded-xl border border-slate-300 bg-white shadow-sm px-3.5 py-2.5 text-sm text-slate-800 cursor-pointer hover:border-slate-400 transition"
      >
        <span className={selectedOption ? "text-slate-800" : "text-slate-400"}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <HiOutlineChevronDown className="h-4 w-4 text-slate-400" />
      </div>

      {open && (
        <div className="absolute top-[100%] left-0 w-full bg-white border border-slate-200 shadow-xl rounded-2xl mt-1.5 z-50 p-2 space-y-2 max-h-64 flex flex-col">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
            <HiOutlineMagnifyingGlass className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="text-xs outline-none w-full"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 p-2.5 text-center">Tidak ditemukan</p>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex flex-col px-3 py-2 text-xs rounded-xl cursor-pointer transition",
                    Number(opt.id) === Number(value)
                      ? "bg-amber-500 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span className="font-bold">{opt.name}</span>
                  <span className={cn("text-[10px] mt-0.5", Number(opt.id) === Number(value) ? "text-white/80" : "text-slate-400")}>
                    {opt.sub}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Searchable Multi-Select Component ───────────────────────────────────────
function SearchableMultiSelect({ label, required, options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const filtered = options.filter(opt =>
    (opt.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (opt.sub || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (opt) => {
    const isSelected = selected.some(item => Number(item.employee_id || item.id) === Number(opt.id));
    if (isSelected) {
      onChange(selected.filter(item => Number(item.employee_id || item.id) !== Number(opt.id)));
    } else {
      // Map to relational format
      onChange([...selected, {
        employee_id: opt.id,
        id: opt.id,
        full_name: opt.name,
        nama_vendor: opt.name,
        vendor_id: opt.id,
        vendor_name: opt.name
      }]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 relative" ref={wrapRef}>
      <label className="text-xs font-semibold text-slate-500">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      
      {/* Selected Items Badges */}
      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-300 bg-white shadow-sm hover:border-slate-400 transition cursor-pointer min-h-[44px] items-center"
           onClick={() => setOpen(!open)}>
        {selected.length === 0 ? (
          <span className="text-slate-400 text-sm ml-1.5">{placeholder}</span>
        ) : (
          selected.map((item) => (
            <div
              key={item.employee_id || item.id}
              onClick={(e) => {
                e.stopPropagation();
                onChange(selected.filter(i => Number(i.employee_id || i.id) !== Number(item.employee_id || item.id)));
              }}
              className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-2 py-1 text-xs font-bold"
            >
              <span>{item.full_name || item.nama_vendor || item.vendor_name}</span>
              <HiOutlineXMark className="h-3 w-3 shrink-0 cursor-pointer hover:text-rose-600" />
            </div>
          ))
        )}
      </div>

      {open && (
        <div className="absolute top-[100%] left-0 w-full bg-white border border-slate-200 shadow-xl rounded-2xl mt-1.5 z-50 p-2 space-y-2 max-h-64 flex flex-col">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
            <HiOutlineMagnifyingGlass className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="text-xs outline-none w-full"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 p-2.5 text-center">Tidak ditemukan</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.some(item => Number(item.employee_id || item.id) === Number(opt.id));
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleSelect(opt)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer transition hover:bg-slate-100",
                      isSelected ? "text-amber-600 bg-amber-50/50 font-bold" : "text-slate-700"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">{opt.name}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</span>
                    </div>
                    {isSelected && <HiOutlineCheck className="h-4 w-4 text-amber-500 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
