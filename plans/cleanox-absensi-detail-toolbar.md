# Plan: Detail Riwayat Absensi Cleanox — Toolbar ala IKM Manajemen

## Context
- Halaman Absensi Cleanox sudah punya rekap periode (cutoff/StatCard/Ringkasan Per Karyawan) dari plan sebelumnya.
- Section **Detail Riwayat Absensi** saat ini hanya punya dropdown **Semua Status** (+ Bersihkan).
- Acuan UI IKM Manajemen (toolbar kanan header detail): **Semua Status** | **Download Excel** (hijau) | **Tambah Absensi** (ungu).
- Belum ada endpoint create absensi Cleanox; Edit/Delete sudah ada.
- Kolom Cleanox-specific **Foto Grooming** tetap dipertahankan (bukan dihapus demi parity IKM).

## Goal
- Samakan toolbar aksi Detail Riwayat Absensi dengan IKM Manajemen.
- Tambah export Excel flat untuk data absensi Cleanox periode aktif.
- Tambah flow **Tambah Absensi** (modal + API create) mirror IKM Manajemen (karyawan + tanggal + jam in/out, tanpa foto wajib).

## Detailed Specifications

### A. Backend — `backend-superapp`

#### File: `controllers/Cleanox/absensiKaryawanCleanoxController.js`

1. **`createAttendanceRecord`** (`POST`)
   - Body:
     ```text
     {
       employee_id: number,          // wajib
       attendance_date: YYYY-MM-DD,  // wajib
       check_in_at: string|null,     // datetime-local optional
       check_out_at: string|null     // datetime-local optional
     }
     ```
   - Validasi:
     - `employee_id` → `assertCleanoxCompany3Employee` (harus company 3 + ada di `mst_role`)
     - `attendance_date` valid `YYYY-MM-DD`
     - `check_in_at` / `check_out_at` via `parseDateTimeLocal` (sama Edit); format invalid → 400
     - Jika keduanya terisi: check_out > check_in
     - Duplikat `UNIQUE (worker_id, attendance_date)` → 409 `"Record absensi untuk karyawan dan tanggal ini sudah ada"`
   - Insert ke `tr_worker_attendance`:
     - `worker_id`, `attendance_date`, `check_in_at`, `check_out_at`
     - Foto fields biarkan `NULL` (admin manual; status otomatis belum lengkap)
   - Response `201`: `{ success: true, message: "Data absensi berhasil ditambahkan", data: { id, ... } }` (optional minimal `{ id }`)

2. Export function dari controller; daftarkan di routes.

#### File: `routes/Cleanox/absensiKaryawanCleanoxRoutes.js`
- Tambah: `router.post("/records", requireAuth, createAttendanceRecord);`
- Letakkan sebelum route berparameter `/records/:attendanceId` (aman; method berbeda).

### B. Frontend — `frontend-superapp`

#### File baru: `src/pages/cleanox-management/utils/exportAbsensiCleanoxExcel.js`
- Dependensi: `xlsx-js-style` + `file-saver` (sudah ada di package).
- Fungsi: `exportAbsensiCleanoxExcel({ records, periodLabel, activePeriod, statusFilter })`
- Sheet flat (bukan pivot), kolom:
  - Tanggal, Karyawan, Kode, Jabatan (`cleanox_role`), Absen In, Absen Out, Durasi, Status
  - Opsional ringkas review grooming: `Grooming` = `reviewed_count/4` atau status review — **cukup Status record saja** agar sederhana (tanpa leave resume IKM).
- Filename: `riwayat_absensi_cleanox_YYYYMMDD.xlsx`
- Style ringkas mirror IKM manajemen (header gelap, status warna) — boleh lebih sederhana daripada IKM leave sheet.

#### File: `src/pages/cleanox-management/components/AbsensiKaryawanCleanox.jsx`

1. **Imports**
   - `HiOutlineArrowDownTray`, `HiOutlinePlus`
   - `exportAbsensiCleanoxExcel`
   - `useRef` jika modal tambah butuh dropdown search (sama IKM)

2. **State**
   - `addModal` boolean
   - `employeeOptions` array `{ employee_id, employee_code, employee_name }`
   - Load options sekali saat mount / saat buka modal: `GET /cleanox/attendance/employees` → map ke shape di atas (`full_name` → `employee_name`)

3. **Toolbar Detail Riwayat** (kanan header section, urutan exact seperti IKM / screenshot):
   - Select **Semua Status** (sudah ada)
   - Tombol Bersihkan jika statusFilter aktif (sudah ada)
   - Tombol **Download Excel**:
     - Class: `border-emerald-200 bg-emerald-50 text-emerald-700`
     - Icon `HiOutlineArrowDownTray`
     - On click: export `displayedRecords` (atau refetch full period lalu filter status — **pilih: export `displayedRecords` + meta periode/statusFilter** karena list Cleanox sudah full tanpa pagination server)
   - Tombol **Tambah Absensi**:
     - Class: `border-purple-200 bg-purple-50 text-purple-700`
     - Icon `HiOutlinePlus`
     - On click: `setAddModal(true)`

4. **Header copy** (samakan spirit IKM):
   - Title: `Detail Riwayat Absensi`
   - Subtitle: `Lihat detail tanggal masuk, jam absen in/out, foto grooming, dan status kelengkapan.`
   - Tetap boleh tampilkan count record di bawah/subtitle sekunder jika sudah ada — atau ganti ke subtitle IKM-style di atas; **pilih: subtitle IKM-style + count kecil tetap**.

5. **`AddAbsensiCleanoxModal`**
   - Fields mirror IKM:
     - Pilih karyawan (searchable dropdown dari `employeeOptions`)
     - Tanggal kerja (`type="date"`, default hari ini)
     - Absen In / Absen Out (`datetime-local`, optional)
   - Submit: `POST /cleanox/attendance/records` body `{ employee_id, attendance_date, check_in_at, check_out_at }`
   - On success: tutup modal + `setRefreshKey(k => k+1)` (refresh summary + detail)
   - Error inline di modal
   - Escape / backdrop close

6. **Render**
   - `{addModal && <AddAbsensiCleanoxModal ... />}`

### C. Tidak di-scope
- Kolom Koordinat IKM (Cleanox tidak expose di list sekarang)
- Hapus kolom Foto Grooming
- Multi-select filter karyawan / onlyIncomplete di toolbar detail
- Leave resume di Excel
- Upload foto saat Tambah Absensi
- Sortable column headers IKM (`SortTh`) — opsional nanti; **tidak wajib di checklist ini**

## Implementation Checklist
1. Di `absensiKaryawanCleanoxController.js`, implementasi `createAttendanceRecord` (validasi employee Cleanox, tanggal, jam, duplikat 409, INSERT tanpa foto).
2. Export `createAttendanceRecord`; daftarkan `POST /records` di `absensiKaryawanCleanoxRoutes.js`.
3. Buat `src/pages/cleanox-management/utils/exportAbsensiCleanoxExcel.js` (flat sheet + download).
4. Di `AbsensiKaryawanCleanox.jsx`, import icon Download/Plus + util export; state `addModal` + `employeeOptions`.
5. Fetch `GET /cleanox/attendance/employees` untuk opsi karyawan (saat mount atau saat buka modal).
6. Tambah tombol **Download Excel** di toolbar Detail (style emerald IKM); wire ke util dengan `displayedRecords` + periode aktif.
7. Tambah tombol **Tambah Absensi** di toolbar Detail (style purple IKM); buka modal.
8. Implement `AddAbsensiCleanoxModal` (karyawan searchable, tanggal, jam in/out, POST create, refresh on success).
9. Samakan subtitle header Detail Riwayat dengan copy IKM-style (tetap sebut foto grooming).
10. Verifikasi manual: filter status + Bersihkan, Excel download isi sesuai filter, Tambah Absensi sukses muncul di detail+ringkasan, duplikat tanggal tampil error 409, Edit/Delete tetap jalan.

## Risks / Catatan
- Record manual tanpa foto akan berstatus belum lengkap — itu expected (sama spirit IKM tanpa foto).
- Unique `(worker_id, attendance_date)` wajib di-handle di UI error message.
- Export memakai data FE yang sudah di-load; pastikan periode cutoff tidak terpotong pagination (Cleanox list saat ini full-fetch — OK).
- Tombol purple “Tambah Absensi” mengikuti IKM; brand Cleanox shell tetap navy di hero.
