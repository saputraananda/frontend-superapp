import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineBuildingStorefront, HiOutlineWrenchScrewdriver } from "react-icons/hi2";

export default function KelolaLayananOutletPage() {
  const [outlets, setOutlets] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const outletRes = await api("/api/master/outlets");
      const serviceRes = await api("/api/services");
      
      const activeOutlets = outletRes.data || [];
      setOutlets(activeOutlets);
      if (activeOutlets.length > 0) {
        setSelectedOutlet(String(activeOutlets[0].id));
      }
      setServices(serviceRes.data || []);
    } catch (err) {
      console.error("Error loading services per outlet:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredServices = services.filter(s => String(s.outlet_id) === String(selectedOutlet));

  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kelola Layanan Outlet</h1>
          <p className="text-sm text-slate-500">Lihat dan tinjau daftar menu layanan laundry yang aktif untuk outlet terpilih</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-100 shrink-0">
          <HiOutlineBuildingStorefront className="h-5 w-5 text-slate-400" />
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="text-sm font-semibold text-slate-700 focus:outline-none"
          >
            {outlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
          <HiOutlineWrenchScrewdriver className="h-12 w-12 mx-auto stroke-1" />
          <p className="mt-2 text-sm">Tidak ada layanan aktif dikonfigurasi untuk outlet ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((s) => (
            <div key={s.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <span className="text-[10px] bg-violet-50 font-mono text-violet-600 px-2 py-0.5 rounded-full uppercase font-bold">{s.service_code}</span>
                <span className="text-[10px] bg-slate-100 font-semibold text-slate-500 px-2 py-0.5 rounded-full capitalize">{s.category_name}</span>
              </div>
              <h3 className="font-bold text-slate-800 text-base">{s.name}</h3>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-semibold uppercase">{s.unit_type}</span>
                <span className="font-extrabold text-violet-600 text-lg">{formatRupiah(s.price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
