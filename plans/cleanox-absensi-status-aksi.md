# Plan: Absensi Cleanox — Filter Semua Status + Kolom Aksi

## Context
- Halaman Absensi Cleanox sudah berupa tabel riwayat flat + filter tanggal + Foto Grooming (4 foto + review) + Foto Out + Status.
- Klarifikasi terbaru: yang kurang hanya **filter Semua Status** dan **kolom Aksi (Edit / Delete)**; **Download Excel tidak diperlukan** (hapus).
- Tidak menambah: Tambah Absensi, Shift, Koordinat, stat cards, ringkasan karyawan.

## Goal
- Tambah dropdown filter status ala IKM (`Semua Status` + opsi dari data).
- Tambah kolom **Aksi** dengan tombol **Edit** (jam in/out) dan **Delete** (konfirmasi hapus), style mirip IKM.
- Hapus tombol **Download Excel** dan util export terkait jika tidak dipakai lagi.
- Backend baru untuk update jam dan delete record absensi Cleanox.

## Detailed Specifications

### A. Backend — `backend-superapp`

#### File: `controllers/Cleanox/absensiKaryawanCleanoxController.js`

1. **`updateAttendanceRecord`** (`PUT`)
   - Param: `attendanceId`
   - Body: `{ check_in_at: string|null, check_out_at: string|null }` (ISO / datetime-local compatible; parse ke `Date`)
   - Validasi: record exists; worker adalah karyawan Cleanox company_id 3
   - Jika keduanya terisi: `check_out_at` harus > `check_in_at`
   - Update hanya `check_in_at`, `check_out_at`, `updated_at`
   - Response: `{ success, message, data: { id, check_in_at, check_out_at, status_label } }` (hitung ulang `status_label` via `getRecordStatus` setelah update — query ulang row)

2. **`deleteAttendanceRecord`** (`DELETE`)
   - Param: `attendanceId`
   - Validasi ownership Cleanox sama seperti update
   - Hapus row `tr_worker_attendance` (reviews cascade via FK)
   - Response: `{ success, message }`

#### File: `routes/Cleanox/absensiKaryawanCleanoxRoutes.js`
- `router.put("/records/:attendanceId", requireAuth, updateAttendanceRecord);`
- `router.delete("/records/:attendanceId", requireAuth, deleteAttendanceRecord);`
- Pastikan tidak bentrok dengan `PUT /records/:attendanceId/reviews` (path lebih spesifik `/reviews` tetap aman di Express).

### B. Frontend — `frontend-superapp`

#### File: `src/pages/cleanox-management/components/AbsensiKaryawanCleanox.jsx`

1. **Hapus Download Excel**
   - Hapus tombol Download Excel di header tabel
   - Hapus import `exportAbsensiCleanoxExcel` dan `HiOutlineArrowDownTray` jika tidak dipakai

2. **Filter Semua Status**
   - State: `statusFilter` (default `""`)
   - Di header kanan “Detail Riwayat Absensi” (ganti posisi Excel):
     - `<select>`: option `Semua Status` + unique `status_label` dari `records`
     - Tombol “Bersihkan” muncul jika `statusFilter` terisi (style IKM)
   - Derived: `displayedRecords = statusFilter ? records.filter(r => r.status_label === statusFilter) : records`
   - Tabel desktop + mobile card memakai `displayedRecords`

3. **Kolom Aksi (desktop)**
   - Tambah header `Aksi` di kanan Status
   - Per row: tombol **Edit** (border putih/slate + icon pencil) dan **Delete** (rose soft + trash) — class mirip IKM
   - Update `SkeletonRow` / `colSpan` empty state ke 9 kolom

4. **Aksi mobile**
   - Di `MobileAttendanceCard`: tambah dua tombol Edit / Delete di bawah (seperti IKM mobile)

5. **`EditAttendanceModal`**
   - Props: `item`, `onClose`, `onSaved`
   - Fields: `datetime-local` untuk Absen In / Absen Out (prefill dari `check_in_at` / `check_out_at`)
   - Info: nama, kode, tanggal (tanpa ShiftBadge)
   - Submit: `PUT /cleanox/attendance/records/:id` body `{ check_in_at, check_out_at }`
   - On success: `onSaved()` → refetch list atau patch row lokal + tutup modal

6. **`DeleteAttendanceModal`**
   - Konfirmasi hapus (style IKM: warning rose)
   - Confirm: `DELETE /cleanox/attendance/records/:id`
   - On success: hapus row dari state / refetch

7. **Helper**
   - `toDateTimeLocalInput(value)` untuk prefill datetime-local (copy pola IKM)

#### File opsional cleanup
- Hapus `src/pages/cleanox-management/utils/exportAbsensiCleanoxExcel.js` (tidak dipakai lagi).

### C. Tidak di-scope
- Tambah Absensi
- Kolom Shift / Koordinat
- Stat cards / ringkasan karyawan
- Download Excel
- Perubahan schema foto / review grooming

## Implementation Checklist
1. Tambah `updateAttendanceRecord` di `absensiKaryawanCleanoxController.js` (validasi Cleanox + jam out > jam in + update timestamps).
2. Tambah `deleteAttendanceRecord` di controller yang sama (validasi + delete).
3. Daftarkan `PUT /records/:attendanceId` dan `DELETE /records/:attendanceId` di `absensiKaryawanCleanoxRoutes.js`; export function baru dari controller.
4. Di `AbsensiKaryawanCleanox.jsx`, hapus tombol Download Excel + import export util / icon unduh.
5. Hapus file `utils/exportAbsensiCleanoxExcel.js`.
6. Tambah state `statusFilter` + `displayedRecords` + select “Semua Status” + tombol Bersihkan di header tabel (style IKM).
7. Ganti pemakaian `records` di tabel/mobile menjadi `displayedRecords` (fetch tetap pakai `records`).
8. Tambah kolom header/cell **Aksi** (Edit + Delete) di tabel desktop; sesuaikan colSpan skeleton/empty.
9. Tambah tombol Edit/Delete di mobile card.
10. Implement `EditAttendanceModal` + wire ke `PUT /cleanox/attendance/records/:id`; refresh data setelah sukses.
11. Implement `DeleteAttendanceModal` + wire ke `DELETE /cleanox/attendance/records/:id`; refresh/hapus row setelah sukses.
12. Verifikasi manual: filter status, bersihkan filter, edit jam, delete, pastikan Download Excel hilang, foto grooming/review tetap jalan.

## Risks / Catatan
- Delete permanen + cascade reviews — modal konfirmasi wajib.
- Edit jam dapat mengubah `status_label` (mis. isi check-out → dari “Belum check-out” ke status lain); setelah update wajib refresh/patch status.
- Path route `PUT /records/:id` vs `PUT /records/:id/reviews` — urutan daftar route tidak kritis selama path beda; tetap daftarkan keduanya dengan jelas.
