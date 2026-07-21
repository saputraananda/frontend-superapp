import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../lib/api";
import { HiOutlineXMark, HiOutlinePencilSquare } from "react-icons/hi2";

export default function EditWorkspaceModal({ open, onClose, onSuccess, workspace }) {
  const [form, setForm] = useState({ title: "", desc: "", company_ids: [], employee_ids: [], position_ids: [] });
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);

  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);

  // Visibility Tabs & Search states
  const [activeTab, setActiveTab] = useState("company"); // "company" | "position" | "employee"
  const [companySearch, setCompanySearch] = useState("");
  const [positionSearch, setPositionSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  useEffect(() => {
    if (open && workspace) {
      let initialCompanyIds = [];
      if (workspace.company_id) {
        initialCompanyIds = String(workspace.company_id).split(",").map(Number).filter(Boolean);
      }

      let initialEmployeeIds = [];
      if (workspace.employee_ids) {
        initialEmployeeIds = String(workspace.employee_ids).split(",").map(Number).filter(Boolean);
      }

      let initialPositionIds = [];
      if (workspace.position_ids) {
        initialPositionIds = String(workspace.position_ids).split(",").map(Number).filter(Boolean);
      }

      const initialIsPublic = initialCompanyIds.length === 0 && initialEmployeeIds.length === 0 && initialPositionIds.length === 0;

      setForm({
        title: workspace.title || "",
        desc: workspace.desc || "",
        company_ids: initialCompanyIds,
        employee_ids: initialEmployeeIds,
        position_ids: initialPositionIds,
      });
      setIsPublic(initialIsPublic);
      setError("");
      setActiveTab("company");
      setCompanySearch("");
      setPositionSearch("");
      setEmployeeSearch("");
      setCurrentEmployeeId(null);

      // Fetch active companies, employees, positions, and profile
      const loadData = async () => {
        try {
          const [compRes, empRes, posRes, profileRes] = await Promise.all([
            api("/api/pm2/companies"),
            api("/api/pm2/employees"),
            api("/positions"),
            api("/employees/profile").catch(() => null)
          ]);
          setCompanies(compRes?.data || []);
          setEmployees(empRes?.data || []);
          setPositions(posRes?.positions || []);
          
          const myEmpId = profileRes?.employee?.employee_id;
          if (myEmpId) {
            setCurrentEmployeeId(myEmpId);
          }
        } catch (err) {
          console.error("Gagal memuat data visibilitas:", err);
        }
      };
      loadData();
    }
  }, [open, workspace]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Nama workspace wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api(`/api/pm2/workspaces/${workspace.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title,
          desc: form.desc,
          company_ids: isPublic ? null : form.company_ids,
          employee_ids: isPublic ? null : form.employee_ids,
          position_ids: isPublic ? null : form.position_ids,
        }),
      });
      window.dispatchEvent(new Event("pm2_workspaces_updated"));
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Gagal mengedit workspace");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !workspace) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <HiOutlinePencilSquare className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-800">Edit Workspace</h2>
            <p className="text-[11px] text-slate-400">Perbarui nama atau deskripsi workspace</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">
              Nama Workspace <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Contoh: Alora Group Indonesia"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition placeholder:text-slate-300"
              autoFocus
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">
              Deskripsi <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              placeholder="Jelaskan tujuan workspace ini..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition resize-none placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">
              Pengaturan Visibilitas <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => {
                    setIsPublic(e.target.checked);
                    if (e.target.checked) {
                      setForm((f) => ({ ...f, company_ids: [], employee_ids: [], position_ids: [] }));
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">Semua Perusahaan (Publik)</span>
              </label>

              {!isPublic && (
                <div className="border-t border-slate-200/60 pt-3.5 space-y-3.5">
                  {/* Tabs Selector */}
                  <div className="flex border-b border-slate-200 gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab("company")}
                      className={`pb-2 text-xs font-bold transition-all border-b-2 -mb-px px-1 flex items-center gap-1.5 ${
                        activeTab === "company"
                          ? "border-indigo-600 text-indigo-600 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Perusahaan <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${form.company_ids.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{form.company_ids.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("position")}
                      className={`pb-2 text-xs font-bold transition-all border-b-2 -mb-px px-1 flex items-center gap-1.5 ${
                        activeTab === "position"
                          ? "border-indigo-600 text-indigo-600 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Posisi <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${form.position_ids.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{form.position_ids.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("employee")}
                      className={`pb-2 text-xs font-bold transition-all border-b-2 -mb-px px-1 flex items-center gap-1.5 ${
                        activeTab === "employee"
                          ? "border-indigo-600 text-indigo-600 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Karyawan <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${form.employee_ids.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{form.employee_ids.length}</span>
                    </button>
                  </div>

                  {/* Tab contents */}
                  <div className="space-y-2">
                    {activeTab === "company" && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          placeholder="Cari perusahaan..."
                          className="w-full rounded-xl border border-slate-255 bg-white px-3.5 py-2 text-xs outline-none focus:border-indigo-400 transition"
                        />
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto shadow-inner">
                          {companies
                            .filter((c) => c.company_name.toLowerCase().includes(companySearch.toLowerCase()))
                            .map((c) => {
                              const isChecked = form.company_ids.includes(c.id);
                              return (
                                <label key={c.id} className="flex items-center gap-2 cursor-pointer select-none py-1 hover:bg-slate-50 rounded px-2 transition">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setForm((f) => ({ ...f, company_ids: [...f.company_ids, c.id] }));
                                      } else {
                                        setForm((f) => ({ ...f, company_ids: f.company_ids.filter((id) => id !== c.id) }));
                                      }
                                    }}
                                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                  />
                                  <span className="text-xs text-slate-600 font-semibold">{c.company_name}</span>
                                </label>
                              );
                            })}
                          {companies.filter((c) => c.company_name.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && (
                            <div className="text-center text-[11px] text-slate-400 py-4 italic">Tidak ada perusahaan yang cocok</div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "position" && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={positionSearch}
                          onChange={(e) => setPositionSearch(e.target.value)}
                          placeholder="Cari posisi..."
                          className="w-full rounded-xl border border-slate-255 bg-white px-3.5 py-2 text-xs outline-none focus:border-indigo-400 transition"
                        />
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto shadow-inner">
                          {positions
                            .filter((p) => p.position_name.toLowerCase().includes(positionSearch.toLowerCase()))
                            .map((p) => {
                              const isChecked = form.position_ids.includes(p.position_id);
                              return (
                                <label key={p.position_id} className="flex items-center gap-2 cursor-pointer select-none py-1 hover:bg-slate-50 rounded px-2 transition">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setForm((f) => ({ ...f, position_ids: [...f.position_ids, p.position_id] }));
                                      } else {
                                        setForm((f) => ({ ...f, position_ids: f.position_ids.filter((id) => id !== p.position_id) }));
                                      }
                                    }}
                                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                  />
                                  <span className="text-xs text-slate-600 font-semibold">{p.position_name}</span>
                                </label>
                              );
                            })}
                          {positions.filter((p) => p.position_name.toLowerCase().includes(positionSearch.toLowerCase())).length === 0 && (
                            <div className="text-center text-[11px] text-slate-400 py-4 italic">Tidak ada posisi yang cocok</div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "employee" && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          placeholder="Cari karyawan..."
                          className="w-full rounded-xl border border-slate-255 bg-white px-3.5 py-2 text-xs outline-none focus:border-indigo-400 transition"
                        />
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto shadow-inner">
                          {employees
                            .filter((emp) => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
                            .sort((a, b) => {
                              const isALocked = a.id === workspace.creator_id || a.id === currentEmployeeId;
                              const isBLocked = b.id === workspace.creator_id || b.id === currentEmployeeId;
                              if (isALocked && !isBLocked) return -1;
                              if (!isALocked && isBLocked) return 1;
                              return 0;
                            })
                            .map((emp) => {
                              const isChecked = form.employee_ids.includes(emp.id);
                              const isLocked = emp.id === workspace.creator_id || emp.id === currentEmployeeId;
                              return (
                                <label key={emp.id} className={`flex items-center gap-2 cursor-pointer select-none py-1 hover:bg-slate-50 rounded px-2 transition ${isLocked ? 'opacity-80 cursor-not-allowed' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked || isLocked}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                      if (isLocked) return;
                                      if (e.target.checked) {
                                        setForm((f) => ({ ...f, employee_ids: [...f.employee_ids, emp.id] }));
                                      } else {
                                        setForm((f) => ({ ...f, employee_ids: f.employee_ids.filter((id) => id !== emp.id) }));
                                      }
                                    }}
                                    className="rounded border-slate-355 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-50"
                                  />
                                  <span className="text-xs text-slate-600 font-semibold truncate">
                                    {emp.full_name} <span className="text-slate-400 font-normal text-[10px]">({emp.department_name || "Tanpa Departemen"})</span>
                                  </span>
                                </label>
                              );
                            })}
                          {employees.filter((emp) => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                            <div className="text-center text-[11px] text-slate-400 py-4 italic">Tidak ada karyawan yang cocok</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95 shadow-md shadow-indigo-600/20"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
