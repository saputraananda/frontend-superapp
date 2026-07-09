import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineCog6Tooth } from "react-icons/hi2";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await api("/api/settings");
        setSettings(res.data || []);
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) =>
      prev.map((item) => (item.setting_key === key ? { ...item, setting_value: value } : item))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccess(false);
      const payload = settings.map((s) => ({ key: s.setting_key, value: s.setting_value }));
      await api("/api/settings", {
        method: "POST",
        body: JSON.stringify({ settings: payload })
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Settings</h1>
        <p className="text-sm text-slate-500">Konfigurasi bisnis dan parameter operasional sistem</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        {settings.length === 0 ? (
          <p className="text-sm text-slate-400">Tidak ada konfigurasi ditemukan di database. Menggunakan pengaturan default.</p>
        ) : (
          <div className="space-y-4">
            {settings.map((item) => (
              <div key={item.id} className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 block">
                  {item.description || item.setting_key}
                </label>
                {item.data_type === "boolean" ? (
                  <select
                    value={item.setting_value}
                    onChange={(e) => handleChange(item.setting_key, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                  >
                    <option value="true">Aktif (True)</option>
                    <option value="false">Nonaktif (False)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={item.setting_value}
                    onChange={(e) => handleChange(item.setting_key, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                  />
                )}
                <span className="text-[10px] text-slate-400 block font-mono">Key: {item.setting_key}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 justify-end border-t border-slate-100 pt-4">
          {success && (
            <span className="text-sm text-emerald-600 font-semibold animate-pulse">
              Pengaturan berhasil disimpan!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </form>
    </div>
  );
}
