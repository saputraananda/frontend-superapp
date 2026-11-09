import { useCallback, useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlineUserGroup } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { cardCls, ghostBtnCls, inputCls, primaryBtnCls, useToast } from "./helpers";
import { PageShell, Spinner, StatusBadge } from "./ui";

export default function LoManagement() {
  const { toast, showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRows = useCallback(async () => {
    const res = await api("/academy/lo");
    setRows(res.data);
  }, []);

  useEffect(() => {
    Promise.all([api("/academy/lo/options"), api("/academy/lo")])
      .then(([options, assignments]) => {
        setEmployees(options.employees);
        setOutlets(options.outlets);
        setRows(assignments.data);
      })
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const assign = async (e) => {
    e.preventDefault();
    try {
      await api("/academy/lo", {
        method: "POST",
        body: JSON.stringify({ employee_id: Number(employeeId), outlet_id: Number(outletId) }),
      });
      setEmployeeId("");
      setOutletId("");
      await loadRows();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const toggle = async (row) => {
    try {
      await api(`/academy/lo/${row.id}`, { method: "PUT", body: JSON.stringify({ is_active: !row.is_active }) });
      await loadRows();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <PageShell
      icon={HiOutlineUserGroup}
      title="Manajemen LO"
      subtitle="Leader Officer yang menilai skill matrix di tiap cabang"
      toast={toast}
    >
      <form onSubmit={assign} className={`${cardCls} grid gap-3 md:grid-cols-[1fr_1fr_auto]`}>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} aria-label="Karyawan" className={inputCls}>
          <option value="">Pilih karyawan</option>
          {employees.map((employee) => (
            <option key={employee.employee_id} value={employee.employee_id}>
              {employee.full_name}
            </option>
          ))}
        </select>
        <select value={outletId} onChange={(e) => setOutletId(e.target.value)} aria-label="Cabang" className={inputCls}>
          <option value="">Pilih cabang</option>
          {outlets.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!employeeId || !outletId} className={primaryBtnCls}>
          <HiOutlinePlus className="h-4 w-4" /> Tugaskan
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Cabang</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-xs text-slate-400">
                    Belum ada LO yang ditugaskan
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <span className="block font-bold text-slate-800">{row.full_name}</span>
                      {row.employee_inactive && <span className="text-xs text-rose-600">Sudah tidak aktif sebagai karyawan</span>}
                    </td>
                    <td className="px-6 py-4">{row.outlet_name}</td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge active={row.is_active} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button type="button" onClick={() => toggle(row)} className={ghostBtnCls}>
                        {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
