import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AlertSuccess from "../components/AlertSuccess";

export default function Profile() {
  const [masterData, setMasterData] = useState({});
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api("/employees/profile"),
      api("/employees/master-data"),
    ]).then(([profileRes, masterRes]) => {
      setFormData(profileRes.employee);
      setMasterData(masterRes);
      setLoading(false);
    }).catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/employees/profile", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setSuccess("Profil berhasil diperbarui!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100 py-10">
      {success && <AlertSuccess message={success} onClose={() => setSuccess("")} />}

      <div className="mx-auto max-w-4xl px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Profil Saya</h1>
            <p className="text-sm text-slate-600">Kelola informasi profil Anda</p>
          </div>
          <a
            href="/portal"
            className="rounded-xl bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white/80"
          >
            ← Kembali
          </a>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/60 bg-white/50 p-8 backdrop-blur-xl shadow-xl">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Personal Info */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Informasi Pribadi</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-700">Nama Lengkap *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  className="mt-1 w-full rounded-xl border border-white bg-white/50 px-4 py-2 text-sm text-slate-500 outline-none"
                  disabled
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Jenis Kelamin</label>
                <select
                  name="gender"
                  value={formData.gender || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Tempat Lahir</label>
                <input
                  type="text"
                  name="birth_place"
                  value={formData.birth_place || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Tanggal Lahir</label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">No. Telepon</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-700">Alamat</label>
                <textarea
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">No. KTP</label>
                <input
                  type="text"
                  name="ktp_number"
                  value={formData.ktp_number || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">No. KK</label>
                <input
                  type="text"
                  name="family_card_number"
                  value={formData.family_card_number || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Agama</label>
                <select
                  name="religion_id"
                  value={formData.religion_id || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  {masterData.religions?.map((r) => (
                    <option key={r.religion_id} value={r.religion_id}>
                      {r.religion_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Status Pernikahan</label>
                <select
                  name="marital_status"
                  value={formData.marital_status || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </section>

          {/* Employment Info */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Informasi Pekerjaan</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-700">Perusahaan</label>
                <select
                  name="company_id"
                  value={formData.company_id || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  {masterData.companies?.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Department</label>
                <select
                  name="department_id"
                  value={formData.department_id || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  {masterData.departments?.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Posisi</label>
                <select
                  name="position_id"
                  value={formData.position_id || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  {masterData.positions?.map((p) => (
                    <option key={p.position_id} value={p.position_id}>
                      {p.position_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Status Kepegawaian</label>
                <select
                  name="employment_status_id"
                  value={formData.employment_status_id || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  {masterData.employmentStatuses?.map((e) => (
                    <option key={e.employment_status_id} value={e.employment_status_id}>
                      {e.employment_status_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Tanggal Bergabung</label>
                <input
                  type="date"
                  name="join_date"
                  value={formData.join_date || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Tanggal Akhir Kontrak</label>
                <input
                  type="date"
                  name="contract_end_date"
                  value={formData.contract_end_date || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Pendidikan Terakhir</label>
                <select
                  name="education_level_id"
                  value={formData.education_level_id || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  {masterData.educationLevels?.map((e) => (
                    <option key={e.education_level_id} value={e.education_level_id}>
                      {e.education_level_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Nama Sekolah/Universitas</label>
                <input
                  type="text"
                  name="school_name"
                  value={formData.school_name || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>
            </div>
          </section>

          {/* Financial Info */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Informasi Keuangan</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-700">Bank</label>
                <select
                  name="bank_id"
                  value={formData.bank_id || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                >
                  <option value="">Pilih</option>
                  {masterData.banks?.map((b) => (
                    <option key={b.bank_id} value={b.bank_id}>
                      {b.bank_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">No. Rekening</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">No. BPJS Kesehatan</label>
                <input
                  type="text"
                  name="bpjs_health_number"
                  value={formData.bpjs_health_number || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">No. BPJS Ketenagakerjaan</label>
                <input
                  type="text"
                  name="bpjs_employment_number"
                  value={formData.bpjs_employment_number || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-700">No. NPWP</label>
                <input
                  type="text"
                  name="npwp_number"
                  value={formData.npwp_number || ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
                />
              </div>
            </div>
          </section>

          {/* Emergency Contact */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Kontak Darurat</h2>
            <div>
              <label className="text-xs font-medium text-slate-700">Nama & No. Telepon</label>
              <input
                type="text"
                name="emergency_contact"
                value={formData.emergency_contact || ""}
                onChange={handleChange}
                placeholder="Contoh: Bapak Deny (082198765432)"
                className="mt-1 w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
              />
            </div>
          </section>

          {/* Notes */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Catatan</h2>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-xl border border-white bg-white/70 px-4 py-2 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-200/60"
              placeholder="Tambahkan catatan tambahan..."
            />
          </section>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <a
              href="/portal"
              className="rounded-xl bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white/80"
            >
              Batal
            </a>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}