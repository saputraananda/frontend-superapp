import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineGift, HiOutlineCheckCircle } from "react-icons/hi2";

export default function BirthdayPage() {
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/birthday/upcoming");
      setUpcoming(res.data || []);
    } catch (err) {
      console.error("Error loading upcoming birthdays:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSendPromo = async (customer) => {
    try {
      setSendingId(customer.id);
      setSuccessMsg("");
      
      const discount = prompt("Masukkan persentase diskon ulang tahun (%):", "15");
      if (discount === null) return;
      
      const days = prompt("Masa berlaku kode promo (jumlah hari dari hari ini):", "30");
      if (days === null) return;
      
      const expDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const message = `Selamat ulang tahun Kak ${customer.name}! Semoga sehat selalu. Dapatkan diskon spesial ${discount}% laundry di outlet kami menggunakan kode promo ulang tahun yang dikirim via WhatsApp!`;

      await api("/api/birthday/send-promo", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customer.id,
          campaign_type: "discount",
          message,
          discount_pct: parseFloat(discount) || 15.00,
          valid_until: expDate
        })
      });
      
      setSuccessMsg(`Promo ulang tahun berhasil dikirim ke Kak ${customer.name}!`);
      setTimeout(() => setSuccessMsg(""), 5000);
      loadData();
    } catch (err) {
      console.error("Error sending birthday promo:", err);
      alert("Gagal mengirim promo: " + err.message);
    } finally {
      setSendingId(null);
    }
  };

  const getMonthName = (m) => {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return months[m - 1] || m;
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Birthday Automation Program</h1>
        <p className="text-sm text-slate-500">Kirim diskon promo ulang tahun dan ucapan selamat ulang tahun otomatis kepada pelanggan loyal</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-bounce">
          <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat data ulang tahun...</p>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineGift className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Tidak ada pelanggan ulang tahun bulan ini & depan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Nama Pelanggan</th>
                  <th className="p-4 font-semibold">No. Telepon</th>
                  <th className="p-4 font-semibold">Tanggal Lahir</th>
                  <th className="p-4 font-semibold">Bulan</th>
                  <th className="p-4 font-semibold">Hari</th>
                  <th className="p-4 font-semibold">Segmentasi</th>
                  <th className="p-4 font-semibold">Total Transaksi</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcoming.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.name}</td>
                    <td className="p-4">{row.phone}</td>
                    <td className="p-4 text-xs text-slate-500">{row.birth_date ? new Date(row.birth_date).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="p-4 font-medium text-violet-600">{getMonthName(row.birth_month)}</td>
                    <td className="p-4 font-medium">{row.birth_day}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.segment === "loyal" ? "bg-emerald-50 text-emerald-700" : row.segment === "churned" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                        {row.segment || "one_time"}
                      </span>
                    </td>
                    <td className="p-4">{row.total_transactions} Kali</td>
                    <td className="p-4 text-right">
                      <button
                        disabled={sendingId !== null}
                        onClick={() => handleSendPromo(row)}
                        className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition ml-auto disabled:opacity-50"
                      >
                        <HiOutlineGift className="h-3.5 w-3.5" />
                        {sendingId === row.id ? "Mengirim..." : "Kirim Promo"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
