import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineSparkles,
  HiOutlineBriefcase,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const MOCK_SERVICES = [
  { id: 1, name: "Reguler Kiloan - Cuci Lipat", category: "Kiloan", price: 7000, duration: "2 Hari", status: "Aktif" },
  { id: 2, name: "Reguler Kiloan - Cuci Setrika", category: "Kiloan", price: 10000, duration: "2 Hari", status: "Aktif" },
  { id: 3, name: "Express Kiloan - Cuci Setrika (1 Hari)", category: "Kiloan", price: 15000, duration: "1 Hari", status: "Aktif" },
  { id: 4, name: "Super Express Kiloan - Cuci Setrika (6 Jam)", category: "Kiloan", price: 25000, duration: "6 Jam", status: "Aktif" },
  { id: 5, name: "Bed Cover Besar", category: "Satuan", price: 35000, duration: "3 Hari", status: "Aktif" },
  { id: 6, name: "Jas Pria / Blazer", category: "Dry Clean", price: 40000, duration: "3 Hari", status: "Aktif" },
  { id: 7, name: "Sepatu Sports / Sneakers", category: "Special", price: 45000, duration: "4 Hari", status: "Aktif" },
];

export default function MasterService() {
  const navigate = useNavigate();
  const [services, setServices] = useState(MOCK_SERVICES);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Master Service Cleanox | Alora Group Indonesia";
  }, []);

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Hero header */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-indigo-300/10 blur-3xl" />

          <div className="relative p-5 sm:p-6 lg:p-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Master Layanan Cleanox
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Daftar jenis layanan, durasi pengerjaan, dan tarif dasar operasional untuk unit Cleanox.
              </p>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#97bd3f]/10 text-[#1b3459]">
                <HiOutlineMagnifyingGlass className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Pencarian Layanan</p>
                <p className="text-xs text-slate-500">Cari berdasarkan nama layanan atau kategori</p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#97bd3f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#86aa34] transition-colors"
            >
              <HiOutlinePlus className="h-3.5 w-3.5" />
              Tambah Layanan
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Masukkan nama layanan..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:bg-white focus:ring-2 focus:ring-[#1b3459]/10"
              />
            </div>
          </div>
        </section>

        {/* Services Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-800">Daftar Layanan Cleanox</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-10">
                    No
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nama Layanan
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Kategori
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Estimasi Waktu
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Harga Dasar
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((item, idx) => (
                  <tr key={item.id} className="transition-colors hover:bg-[#97bd3f]/5">
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {item.name}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {item.duration}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[#1b3459] font-bold">
                      Rp {item.price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#97bd3f]/15 border border-[#97bd3f]/25 px-2.5 py-0.5 text-xs font-semibold text-[#1b3459]">
                        <HiOutlineCheckCircle className="h-3.5 w-3.5" />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
