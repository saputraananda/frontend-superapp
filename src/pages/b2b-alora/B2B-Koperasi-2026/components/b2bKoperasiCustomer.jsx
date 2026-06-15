import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../../../lib/api";
import {
  HiOutlineUserGroup, HiOutlineCurrencyDollar,
  HiOutlineArrowPath, HiOutlineFunnel, HiOutlineStar,
  HiOutlineMagnifyingGlass, HiOutlineDocumentText,
  HiOutlineXMark, HiOutlineChatBubbleLeftRight,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }
function fmtRp(v) { return "Rp " + (Number(v) || 0).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtNum(v) { return (Number(v) || 0).toLocaleString("id-ID"); }
function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}
function waLink(phone) {
  if (!phone) return null;
  let n = String(phone).replace(/[\s\-()]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (!n.startsWith("62") && !n.startsWith("+")) n = "62" + n;
  return `https://wa.me/${n.replace("+", "")}`;
}
function payBadge(p) {
  if (!p) return "bg-slate-100 text-slate-600";
  const low = p.toLowerCase();
  if (low.includes("belum")) return "bg-red-50 text-red-700";
  if (low.includes("lunas")) return "bg-emerald-50 text-emerald-700";
  return "bg-sky-50 text-sky-700";
}

function StatCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <div onClick={onClick}
      className={cn("rounded-2xl border p-4 sm:p-5 transition cursor-pointer",
        accent.border, accent.bg, "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]")}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent.iconBg)}>
          <Icon className={cn("h-4 w-4", accent.iconText)} />
        </div>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-extrabold text-slate-800 truncate">{value}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ── Customer Detail Modal ── */
function CustomerDetailModal({ modal, onClose }) {
  if (!modal.open) return null;
  const c = modal.customer || {};
  const txs = modal.transactions || [];
  const s = modal.txSummary || {};
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Detail: {c.nama || c.id_konsumen}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
            <HiOutlineXMark className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {modal.loading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : (
            <>
              {/* Customer info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {[
                  ["ID Konsumen", c.id_konsumen],
                  ["Nama", c.nama],
                  ["Instansi", c.instansi || "—"],
                  ["Telepon", c.nomor_telpon || "—"],
                  ["Outlet", c.outlet || "—"],
                  ["Member", c.member || "Non-Member"],
                  ["Sapaan", c.sapaan || "—"],
                  ["Jenis Kelamin", c.jenis_kelamin || "—"],
                  ["Tanggal Lahir", c.tanggal_lahir ? fmtDate(c.tanggal_lahir) : "—"],
                  ["Agama", c.agama || "—"],
                  ["Alamat", c.alamat || "—"],
                  ["Blok", c.blok || "—"],
                  ["Terdaftar Sejak", c.terdaftar_sejak ? fmtDate(c.terdaftar_sejak) : "—"],
                ].map(([label, val]) => (
                  <div key={label} className="flex gap-2 py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-500 w-32 shrink-0">{label}</span>
                    <span className="text-slate-800">{val}</span>
                  </div>
                ))}
              </div>

              {/* Financial cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["Total Transaksi", fmtNum(c.total_jumlah_transaksi)],
                  ["Total Nominal", fmtRp(c.total_nominal_transaksi)],
                  ["Saldo ePayment", fmtRp(c.saldo_epayment)],
                  ["Kuota / Sisa", `${c.kuota || 0} / ${fmtRp(c.sisa_nominal)}`],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1">{label}</p>
                    <p className="text-sm font-bold text-slate-800">{val}</p>
                  </div>
                ))}
              </div>

              {/* Transaction summary */}
              {s.total_nota > 0 && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <h4 className="text-xs font-bold text-sky-800 mb-2">Ringkasan Transaksi KMP</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-slate-500">Nota:</span> <b className="text-slate-800">{s.total_nota}</b></div>
                    <div><span className="text-slate-500">Item:</span> <b className="text-slate-800">{s.total_items}</b></div>
                    <div><span className="text-slate-500">Tagihan:</span> <b className="text-emerald-600">{fmtRp(s.total_tagihan)}</b></div>
                    <div><span className="text-slate-500">Grand Total:</span> <b className="text-emerald-600">{fmtRp(s.grand_total)}</b></div>
                  </div>
                </div>
              )}

              {/* Transactions table */}
              {txs.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Riwayat Transaksi ({txs.length} item)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-2 font-semibold text-slate-500">No. Nota</th>
                          <th className="text-left py-2 px-2 font-semibold text-slate-500">Outlet</th>
                          <th className="text-left py-2 px-2 font-semibold text-slate-500">Item</th>
                          <th className="text-center py-2 px-2 font-semibold text-slate-500">Qty</th>
                          <th className="text-right py-2 px-2 font-semibold text-slate-500">Total</th>
                          <th className="text-center py-2 px-2 font-semibold text-slate-500">Bayar</th>
                          <th className="text-left py-2 px-2 font-semibold text-slate-500">Tgl Terima</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txs.map((r, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-sky-50">
                            <td className="py-2 px-2 font-medium text-slate-700">{r.no_nota || "—"}</td>
                            <td className="py-2 px-2 text-slate-600">{r.outlet || "—"}</td>
                            <td className="py-2 px-2 text-slate-600 max-w-[180px] truncate">{r.nama_item || "—"}</td>
                            <td className="py-2 px-2 text-center">{r.jumlah} {r.satuan_item || ""}</td>
                            <td className="py-2 px-2 text-right font-bold text-slate-800">{fmtRp(r.total)}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", payBadge(r.pembayaran))}>
                                {r.pembayaran || "—"}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-slate-400 whitespace-nowrap">{r.tgl_terima ? String(r.tgl_terima).slice(0, 16) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Phone link */}
              {c.nomor_telpon && (
                <div className="border-t border-slate-100 pt-3">
                  <a href={waLink(c.nomor_telpon)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition">
                    <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
                    Chat WhatsApp: {c.nomor_telpon}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */
export default function B2bKoperasiCustomer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [list, setList] = useState({ data: [], pagination: { page: 1, totalPages: 1, total: 0 }, loading: false, meta: {} });
  const [filters, setFilters] = useState({ search: "", member: "" });
  const [searchInput, setSearchInput] = useState("");
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState({ col: "total_nominal_transaksi", dir: "desc" });
  const debounceRef = useRef(null);

  const [custModal, setCustModal] = useState({ open: false, loading: false, customer: {}, transactions: [], txSummary: {} });

  const fetchStats = useCallback(async () => {
    setLoading(true); setErr("");
    try { const res = await api("/b2b/kmp/customers/stats"); setData(res.data || null); }
    catch (e) { setErr(e.message || "Gagal memuat data"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchList = useCallback(async (page = 1, f = filters, s = sort, lm = limit) => {
    setList(p => ({ ...p, loading: true }));
    try {
      const params = new URLSearchParams({ page, limit: lm === "all" ? "all" : String(lm), sort: s.col, order: s.dir });
      if (f.search) params.set("search", f.search);
      if (f.member) params.set("member", f.member);
      const res = await api(`/b2b/kmp/customers?${params}`);
      setList({ data: res.data || [], pagination: res.pagination || {}, loading: false, meta: res.meta || {} });
    } catch { setList(p => ({ ...p, loading: false })); }
  }, [filters, sort, limit]);

  useEffect(() => { fetchList(1, filters, sort, limit); /* eslint-disable-next-line */ }, []);

  /* Auto-search debounce */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const f = { ...filters, search: searchInput };
      setFilters(f);
      fetchList(1, f, sort, limit);
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line
  }, [searchInput]);

  const applyFilters = () => { const f = { ...filters, search: searchInput }; setFilters(f); fetchList(1, f, sort, limit); };
  const resetFilters = () => {
    const f = { search: "", member: "" };
    setFilters(f); setSearchInput("");
    fetchList(1, f, sort, limit);
  };
  const handleLimitChange = (v) => {
    const newLimit = v === "all" ? "all" : Number(v);
    setLimit(newLimit);
    fetchList(1, filters, sort, newLimit);
  };
  const toggleSort = (col) => {
    const newSort = sort.col === col ? { col, dir: sort.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" };
    setSort(newSort);
    fetchList(1, filters, newSort, limit);
  };
  const SortIcon = ({ col }) => (
    <span className="ml-1 text-[10px]">{sort.col === col ? (sort.dir === "desc" ? "▼" : "▲") : "⇅"}</span>
  );

  /* Customer detail modal */
  const openCustomerDetail = async (idKonsumen) => {
    setCustModal({ open: true, loading: true, customer: {}, transactions: [], txSummary: {} });
    try {
      const res = await api(`/b2b/kmp/customers/detail/${idKonsumen}`);
      setCustModal({ open: true, loading: false, customer: res.data.customer || {}, transactions: res.data.transactions || [], txSummary: res.data.tx_summary || {} });
    } catch { setCustModal(p => ({ ...p, loading: false })); }
  };
  const closeCustModal = () => setCustModal(p => ({ ...p, open: false }));

  /* Loading / Error */
  if (loading) return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="h-16 bg-slate-100 rounded-2xl animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">{[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      </div>
    </div>
  );
  if (err) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 font-semibold mb-2">{err}</p>
        <button onClick={fetchStats} className="text-sm text-blue-600 hover:underline">Coba lagi</button>
      </div>
    </div>
  );

  const s = data?.summary || {};

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── Header ── */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-sky-800 to-cyan-600 p-5 shadow-sm sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                <HiOutlineUserGroup className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">Customer Koperasi Merah Putih</h1>
                <p className="text-sm text-white/70">Daftar customer KMP</p>
              </div>
            </div>
            <button onClick={fetchStats}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0">
              <HiOutlineArrowPath className="h-4 w-4" /> Refresh
            </button>
          </div>
        </section>

        {/* ── Stat Cards (3 cards) ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={HiOutlineUserGroup} label="Total Customer" value={fmtNum(s.total_customer)}
            sub="Customer KMP aktif"
            accent={{ border: "border-slate-200", bg: "bg-white", iconBg: "bg-sky-100", iconText: "text-sky-600" }}
            onClick={() => {}}
          />
          <StatCard icon={HiOutlineDocumentText} label="Total Transaksi" value={fmtNum(s.total_transaksi)}
            sub={`Rata-rata: ${fmtNum(Math.round(s.avg_transaksi || 0))}`}
            accent={{ border: "border-emerald-200", bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconText: "text-emerald-600" }}
            onClick={() => {}}
          />
          <StatCard icon={HiOutlineCurrencyDollar} label="Total Nominal" value={fmtRp(s.total_nominal)}
            sub={`Rata-rata: ${fmtRp(Math.round(s.avg_nominal || 0))}`}
            accent={{ border: "border-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-100", iconText: "text-amber-600" }}
            onClick={() => {}}
          />
        </section>

        {/* ── Top Customers ── */}
        <section>
          {/* Top 10 Customers */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineStar className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">Top 10 Customer</h2>
            </div>
            {data?.top_customers?.length > 0 ? (
              <div className="space-y-2">
                {data.top_customers.map((c, i) => (
                  <div key={i} onClick={() => openCustomerDetail(c.id_konsumen)}
                    className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 transition">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      i < 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                    )}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{c.nama || "—"}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.instansi || c.outlet || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-600">{fmtRp(c.total_nominal_transaksi)}</p>
                      <p className="text-[10px] text-slate-400">{c.total_jumlah_transaksi} transaksi</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 italic">Belum ada data</p>}
          </div>
        </section>

        {/* ── Customer Table ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineFunnel className="h-5 w-5 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-800">Daftar Customer KMP</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Cari nama / ID / telepon / instansi..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none w-full" />
            </div>
            <select value={filters.member} onChange={e => { const f = { ...filters, member: e.target.value }; setFilters(f); fetchList(1, f, sort, limit); }}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
              <option value="">Semua Member</option>
              {(list.meta.members || []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">Reset</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">ID</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("nama")}>
                    Nama<SortIcon col="nama" />
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Instansi</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">Member</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Telepon</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("total_jumlah_transaksi")}>
                    Transaksi<SortIcon col="total_jumlah_transaksi" />
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("total_nominal_transaksi")}>
                    Nominal<SortIcon col="total_nominal_transaksi" />
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("transaksi_terakhir")}>
                    Terakhir<SortIcon col="transaksi_terakhir" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.loading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading...</td></tr>
                ) : list.data.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada data customer KMP</td></tr>
                ) : list.data.map((r) => (
                  <tr key={r.id_konsumen || r.id}
                    onClick={() => openCustomerDetail(r.id_konsumen)}
                    className="border-b border-slate-100 hover:bg-sky-50 transition cursor-pointer">
                    <td className="py-2 px-3 font-mono text-slate-500">{r.id_konsumen || "—"}</td>
                    <td className="py-2 px-3">
                      <div className="max-w-[180px]">
                        <p className="font-semibold text-slate-800 truncate">{r.nama || "—"}</p>
                        {r.blok && <p className="text-[10px] text-slate-400">Blok {r.blok}</p>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-600 max-w-[150px] truncate">{r.instansi || "—"}</td>
                    <td className="py-2 px-3 text-center">
                      {r.member ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-semibold">{r.member}</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 px-3">
                      {r.nomor_telpon ? (
                        <a href={waLink(r.nomor_telpon)} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 hover:underline text-xs">
                          <HiOutlineChatBubbleLeftRight className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[110px]">{r.nomor_telpon}</span>
                        </a>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-700">{fmtNum(r.total_jumlah_transaksi)}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">{fmtRp(r.total_nominal_transaksi)}</td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{fmtDate(r.transaksi_terakhir)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">{list.pagination.total || 0} customer</span>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={e => handleLimitChange(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">ALL</option>
              </select>
              {list.pagination.totalPages > 1 && (
                <div className="flex gap-1">
                  <button disabled={list.pagination.page <= 1}
                    onClick={() => fetchList(list.pagination.page - 1, filters, sort, limit)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
                  <span className="px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {list.pagination.page} / {list.pagination.totalPages}
                  </span>
                  <button disabled={list.pagination.page >= list.pagination.totalPages}
                    onClick={() => fetchList(list.pagination.page + 1, filters, sort, limit)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Customer Detail Modal ── */}
      <CustomerDetailModal modal={custModal} onClose={closeCustModal} />
    </div>
  );
}
