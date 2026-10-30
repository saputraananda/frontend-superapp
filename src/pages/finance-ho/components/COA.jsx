import { useState, useEffect, useMemo } from "react";
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlinePencilSquare,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineXMark,
  HiOutlineSparkles,
  HiOutlineNumberedList,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const TYPE_CONFIG = {
  ASET: { label: "Aset", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  KEWAJIBAN: { label: "Kewajiban", color: "bg-rose-50 text-rose-700 border-rose-200" },
  EKUITAS: { label: "Ekuitas", color: "bg-purple-50 text-purple-700 border-purple-200" },
  PENDAPATAN: { label: "Pendapatan", color: "bg-blue-50 text-blue-700 border-blue-200" },
  BEBAN: { label: "Beban", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function COA() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState(null);

  // Load data akun
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await api("/finance-ho/accounts");
      setAccounts(res.data || []);
    } catch (err) {
      console.error("Gagal load akun:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Filter akun
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchSearch =
        !search ||
        acc.code.toLowerCase().includes(search.toLowerCase()) ||
        acc.name.toLowerCase().includes(search.toLowerCase());
      const matchType = !selectedType || acc.type === selectedType;
      return matchSearch && matchType;
    });
  }, [accounts, search, selectedType]);

  // Handle seed default
  const handleSeedDefault = async () => {
    setSeeding(true);
    setMessage(null);
    try {
      const res = await api("/finance-ho/accounts/seed-default", { method: "POST" });
      setMessage({ type: "success", text: res.message || "Akun standar berhasil dimuat!" });
      loadAccounts();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Gagal memuat akun standar." });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-300/30 bg-gradient-to-r from-[#059669] to-[#6EE7B7] p-6 shadow-sm">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-teal-200/25 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 border border-white/30 text-white shadow-inner backdrop-blur-xs">
              <HiOutlineNumberedList className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl drop-shadow-xs">
                Daftar Akun (Chart of Accounts)
              </h1>
              <p className="text-xs sm:text-sm text-emerald-50 mt-0.5 font-medium drop-shadow-xs">
                Bagan akun keuangan HO Finance untuk pencatatan transaksi jurnal umum
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {accounts.length === 0 && (
              <button
                type="button"
                onClick={handleSeedDefault}
                disabled={seeding || loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 hover:bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 transition shadow-sm disabled:opacity-50"
              >
                <HiOutlineSparkles className="h-4 w-4 text-emerald-600" />
                {seeding ? "Memuat..." : "Muat Akun Standar"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingAccount(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-emerald-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-800 transition shadow-md shadow-emerald-950/10 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4 stroke-[2.5]" />
              Tambah Akun Baru
            </button>
          </div>
        </div>
      </section>

      {/* Alert Message */}
      {message && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl p-3 text-xs font-medium",
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          )}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 hover:opacity-70"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama akun..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedType("")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0",
              selectedType === ""
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Semua ({accounts.length})
          </button>
          {["ASET", "KEWAJIBAN", "EKUITAS", "PENDAPATAN", "BEBAN"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0",
                selectedType === t
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {TYPE_CONFIG[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-32">Kode Akun</th>
                <th className="py-3 px-4 min-w-[200px]">Nama Akun</th>
                <th className="py-3 px-4 w-36">Kategori</th>
                <th className="py-3 px-4 w-32">Saldo Normal</th>
                <th className="py-3 px-4 w-28">Status</th>
                <th className="py-3 px-4 min-w-[150px]">Keterangan</th>
                <th className="py-3 px-4 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    Memuat data akun...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">Tidak ada akun yang ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {accounts.length === 0
                        ? "Mulai dengan membuat akun baru atau klik 'Muat Akun Standar'."
                        : "Coba ubah kata kunci pencarian atau filter kategori."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const typeCfg = TYPE_CONFIG[acc.type] || {
                    label: acc.type,
                    color: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {acc.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {acc.name}
                        {acc.is_header === 1 && (
                          <span className="ml-2 text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            Header
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                            typeCfg.color
                          )}
                        >
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-block font-semibold text-[11px]",
                            acc.normal_balance === "DEBIT" ? "text-emerald-700" : "text-blue-700"
                          )}
                        >
                          {acc.normal_balance}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold",
                            acc.is_active === 1
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {acc.is_active === 1 ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-[200px]">
                        {acc.memo || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccount(acc);
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Edit Akun"
                        >
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Akun */}
      {modalOpen && (
        <ModalFormAkun
          account={editingAccount}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            loadAccounts();
          }}
        />
      )}
    </div>
  );
}

// Modal Form Akun (Bisa Tambah Baru atau Edit)
export function ModalFormAkun({ account, onClose, onSuccess }) {
  const isEdit = Boolean(account && account.id);

  const [code, setCode] = useState(account?.code || "");
  const [name, setName] = useState(account?.name || "");
  const [type, setType] = useState(account?.type || "ASET");
  const [normalBalance, setNormalBalance] = useState(
    account?.normal_balance || "DEBIT"
  );
  const [memo, setMemo] = useState(account?.memo || "");
  const [isActive, setIsActive] = useState(account?.is_active ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Otomatis ubah normalBalance saat type berubah (jika tambah baru)
  const handleTypeChange = (newType) => {
    setType(newType);
    if (!isEdit) {
      if (["ASET", "BEBAN"].includes(newType)) {
        setNormalBalance("DEBIT");
      } else {
        setNormalBalance("KREDIT");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Kode akun wajib diisi.");
      return;
    }
    if (!name.trim()) {
      setError("Nama akun wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api(`/finance-ho/accounts/${account.id}`, {
          method: "PUT",
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            type,
            normal_balance: normalBalance,
            is_active: isActive ? 1 : 0,
            memo: memo.trim(),
          }),
        });
      } else {
        const res = await api("/finance-ho/accounts", {
          method: "POST",
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            type,
            normal_balance: normalBalance,
            memo: memo.trim(),
          }),
        });
        if (onSuccess) onSuccess(res.data);
        return;
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "Gagal menyimpan akun.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800">
            {isEdit ? "Edit Akun" : "Tambah Akun Baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Kategori Akun */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Kategori Akun <span className="text-rose-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ASET">Aset (Harta)</option>
              <option value="KEWAJIBAN">Kewajiban (Utang)</option>
              <option value="EKUITAS">Ekuitas (Modal)</option>
              <option value="PENDAPATAN">Pendapatan</option>
              <option value="BEBAN">Beban (Biaya)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Kode Akun */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Kode Akun <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Misal: 1-1001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Saldo Normal */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Saldo Normal <span className="text-rose-500">*</span>
              </label>
              <select
                value={normalBalance}
                onChange={(e) => setNormalBalance(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="DEBIT">DEBIT</option>
                <option value="KREDIT">KREDIT</option>
              </select>
            </div>
          </div>

          {/* Nama Akun */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Nama Akun <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Misal: Kas Operasional, Bank BCA, Beban Sewa..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Keterangan / Memo (Opsional)
            </label>
            <textarea
              rows="2"
              placeholder="Catatan tambahan tentang akun ini..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Aktif jika mode edit */}
          {isEdit && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active"
                checked={Boolean(isActive)}
                onChange={(e) => setIsActive(e.target.checked ? 1 : 0)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <label htmlFor="is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Akun Aktif (bisa digunakan dalam jurnal)
              </label>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 active:scale-95"
            >
              {saving ? "Menyimpan..." : isEdit ? "Perbarui Akun" : "Simpan Akun"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

