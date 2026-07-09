import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineBuildingStorefront, HiOutlineMapPin, HiOutlinePhone, HiOutlineEnvelope } from "react-icons/hi2";

export default function InfoOutletPage() {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await api("/api/outlets/admin/all");
        setOutlets((res.data || []).filter(o => o.is_active === 1 && o.deleted_at === null));
      } catch (err) {
        console.error("Error loading active outlets:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Informasi Outlet</h1>
        <p className="text-sm text-slate-500">Profil operasional, kontak, NPWP, dan koordinat maps outlet PT Waschen Alora Indonesia</p>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : outlets.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
          <HiOutlineBuildingStorefront className="h-12 w-12 mx-auto stroke-1" />
          <p className="mt-2 text-sm">Tidak ada profil outlet aktif ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outlets.map((o) => (
            <div key={o.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                  <HiOutlineBuildingStorefront className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base leading-tight">{o.name}</h3>
                  <span className="text-[10px] bg-slate-100 font-mono text-slate-500 px-2 py-0.5 rounded-full">{o.outlet_code}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 text-sm text-slate-600">
                <div className="flex gap-2">
                  <HiOutlineMapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-normal">{o.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <HiOutlinePhone className="h-4 w-4 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500">{o.phone || "-"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <HiOutlineEnvelope className="h-4 w-4 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500">{o.email || "-"}</p>
                </div>
                <div className="border-t border-slate-100 pt-3 flex flex-wrap justify-between text-[11px] text-slate-400">
                  <span>NPWP: <span className="font-semibold text-slate-600">{o.npwp || "-"}</span></span>
                  {o.latitude && o.longitude && (
                    <span className="font-mono text-[9px] bg-slate-50 px-1.5 py-0.5 rounded">
                      Loc: {parseFloat(o.latitude).toFixed(4)}, {parseFloat(o.longitude).toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
