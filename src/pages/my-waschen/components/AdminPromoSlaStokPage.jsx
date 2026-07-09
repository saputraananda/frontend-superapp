import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineTag, HiOutlineClock, HiOutlineArchiveBox } from "react-icons/hi2";

export default function AdminPromoSlaStokPage() {
  const [promos, setPromos] = useState([]);
  const [services, setServices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("promos");

  async function loadData() {
    try {
      setLoading(true);
      const promoRes = await api("/api/promos");
      const serviceRes = await api("/api/services");
      const inventoryRes = await api("/api/inventory/items");
      setPromos(promoRes.data || []);
      setServices(serviceRes.data || []);
      setInventory(inventoryRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Promo, SLA & Stok Minimum</h1>
        <p className="text-sm text-slate-500">Konfigurasi program promo, Service Level Agreement (SLA), dan batas aman stok inventaris</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("promos")}
          className={`pb-3 font-semibold text-sm transition-all ${activeTab === "promos" ? "border-b-2 border-violet-500 text-violet-600" : "text-slate-500"}`}
        >
          Program Promo
        </button>
        <button
          onClick={() => setActiveTab("sla")}
          className={`pb-3 font-semibold text-sm transition-all ${activeTab === "sla" ? "border-b-2 border-violet-500 text-violet-600" : "text-slate-500"}`}
        >
          SLA Layanan
        </button>
        <button
          onClick={() => setActiveTab("stok")}
          className={`pb-3 font-semibold text-sm transition-all ${activeTab === "stok" ? "border-b-2 border-violet-500 text-violet-600" : "text-slate-500"}`}
        >
          Batas Stok Minimum
        </button>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {activeTab === "promos" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">Kode Promo</th>
                    <th className="p-4 font-semibold">Nama Program</th>
                    <th className="p-4 font-semibold">Tipe</th>
                    <th className="p-4 font-semibold text-right">Nilai Promo</th>
                    <th className="p-4 font-semibold text-right">Min. Trx</th>
                    <th className="p-4 font-semibold">Masa Berlaku</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {promos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-violet-600 uppercase">{p.code}</td>
                      <td className="p-4 font-semibold text-slate-800">{p.name}</td>
                      <td className="p-4 uppercase text-xs font-semibold">{p.type}</td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        {p.type === "percent" ? `${p.value}%` : formatRupiah(p.value)}
                      </td>
                      <td className="p-4 text-right">{formatRupiah(p.min_trx_amount)}</td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(p.valid_from).toLocaleDateString("id-ID")} s/d {new Date(p.valid_until).toLocaleDateString("id-ID")}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {p.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "sla" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">Kode</th>
                    <th className="p-4 font-semibold">Nama Layanan</th>
                    <th className="p-4 font-semibold">SLA Regular</th>
                    <th className="p-4 font-semibold">SLA Express</th>
                    <th className="p-4 font-semibold">Durasi Hari</th>
                    <th className="p-4 font-semibold text-right">Harga</th>
                    <th className="p-4 font-semibold">Kind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-semibold text-slate-500">{s.service_code}</td>
                      <td className="p-4 font-bold text-slate-800">{s.name}</td>
                      <td className="p-4">{s.sla_regular_hours ? `${s.sla_regular_hours} Jam` : "-"}</td>
                      <td className="p-4">{s.sla_express_hours ? `${s.sla_express_hours} Jam` : "-"}</td>
                      <td className="p-4">{s.durasi_hari} Hari</td>
                      <td className="p-4 text-right font-bold text-violet-600">{formatRupiah(s.price)}</td>
                      <td className="p-4 uppercase text-xs font-semibold text-slate-400">{s.service_kind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "stok" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">Kode Item</th>
                    <th className="p-4 font-semibold">Nama Item</th>
                    <th className="p-4 font-semibold">Kategori</th>
                    <th className="p-4 font-semibold text-right">Min. Stok Default</th>
                    <th className="p-4 font-semibold">Unit</th>
                    <th className="p-4 font-semibold">Tipe Tracking</th>
                    <th className="p-4 font-semibold text-right">Harga Default</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono text-xs text-slate-500">{i.item_code}</td>
                      <td className="p-4 font-bold text-slate-800">{i.name}</td>
                      <td className="p-4 font-medium">{i.category_name}</td>
                      <td className="p-4 text-right font-semibold text-amber-600">{i.min_stock_default}</td>
                      <td className="p-4">{i.unit}</td>
                      <td className="p-4 text-xs font-semibold text-slate-500 uppercase">{i.tracking_type}</td>
                      <td className="p-4 text-right font-bold text-slate-800">{formatRupiah(i.default_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
