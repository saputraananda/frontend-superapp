# Plan: Absensi Karyawan Cleanox — IKM Style + QC 4 Foto

## Context
- Cleanox Absensi saat ini: list karyawan → klik nama → detail accordion per tanggal → form penilaian 4 foto + tombol “Simpan penilaian hari ini”.
- Target: seperti Absensi IKM — langsung tabel riwayat absensi, filter tanggal, Download Excel; plus 4 foto QC klikable dengan penilaian ✓/✕ (langsung simpan), badge di thumbnail, dan kolom Foto Check-out.
- Backend review sudah ada (`PUT /cleanox/attendance/records/:attendanceId/reviews`); belum ada endpoint list flat lintas karyawan. Field `check_out_photo_file` sudah ada di DB, belum diekspos di API list.

## Goal
- Halaman `/cleanox-management-system/absensi` menampilkan tabel riwayat absensi langsung (bukan list karyawan).
- Filter hanya **Tanggal Mulai** + **Tanggal Akhir**; aksi toolbar hanya **Download Excel**.
- Status absensi mengikuti logika IKM: `Belum check-in` / `Belum check-out` / `Foto belum lengkap` / `Lengkap`.
- Kolom foto: 4 foto QC (check-in) + 1 foto check-out; style tabel/filter/thumbnail mengikuti IKM.
- Klik 4 foto QC → modal penilaian ✓/✕; ✕ memunculkan catatan; simpan langsung tanpa tombol Simpan; badge ✓/✕ di thumbnail.
- Foto check-out: preview saja (tanpa penilaian QC).

## Detailed Specifications

### A. Backend — `backend-superapp`

#### File: `controllers/Cleanox/absensiKaryawanCleanoxController.js`

1. **Tambah helper status** (mirror IKM `getRecordStatus`):
   - `Belum check-in` jika tidak ada `check_in_at`
   - `Belum check-out` jika ada check-in tapi tidak ada `check_out_at`
   - `Foto belum lengkap` jika check-out ada tapi `check_out_photo_file` kosong, ATAU salah satu dari 4 foto QC kosong
   - `Lengkap` selain itu

2. **Tambah `listAttendanceRecords`**
   - Query params: `startDate`, `endDate` (wajib `YYYY-MM-DD`; default 30 hari terakhir jika kosong — sama spirit default lama)
   - Scope: karyawan Cleanox `company_id = 3` yang ada di `mst_role` (sama filter list employees sekarang)
   - Join/lookup: `tr_worker_attendance` + data employee dari `mst_employee`/`users` + reviews dari `tr_worker_attendance_photo_reviews`
   - Response item (exact shape):
     ```text
     {
       id,
       attendance_date,
       employee_id, employee_code, full_name, username, cleanox_role,
       check_in_at, check_out_at,
       photos: [ { photo_type, label, file, url, review } x4 ],  // full_body, side, back, hand
       check_out_photo: { file, url } | null,
       reviewed_count, review_status,   // tetap ada untuk info QC internal jika perlu
       status_label                    // Belum check-in | Belum check-out | Foto belum lengkap | Lengkap
     }
     ```
   - Order: `attendance_date DESC`, `id DESC`
   - Sertakan `check_out_photo` URL via `/cleanox/attendance/photos/:filename` (sama serve existing)

3. **`upsertAttendancePhotoReviews`**
   - Tetap dipakai; FE akan kirim **1 item** per aksi (bukan batch 4).
   - Pastikan tidak memaksa keempat tipe harus ikut dalam satu request (sudah loop item yang dikirim — verifikasi tidak ada validasi “harus 4”).

4. Endpoint lama `listAttendanceEmployees` / `listEmployeeAttendanceRecords` boleh tetap ada (tidak dihapus di tahap ini) agar tidak break; FE utama tidak memakai list karyawan lagi.

#### File: `routes/Cleanox/absensiKaryawanCleanoxRoutes.js`
- Tambah: `router.get("/records", requireAuth, listAttendanceRecords);`
- Letakkan **sebelum** route berparameter lain yang bisa bentrok (aman di atas `/records/:attendanceId/reviews` yang sudah PUT).

### B. Frontend — `frontend-superapp`

#### File utama (rewrite): `src/pages/cleanox-management/components/AbsensiKaryawanCleanox.jsx`

Ganti halaman list karyawan menjadi halaman riwayat absensi bergaya IKM.

**State**
- `startDate`, `endDate` (default: 30 hari terakhir atau bulan berjalan — pakai 30 hari terakhir agar konsisten backend default)
- `records`, `loading`, `fetchError`
- `photoModal`: `{ attendanceId, photo, draftScore, draftReason, saving, error } | null`
- `viewerOut`: `{ url, label } | null` untuk preview foto check-out saja

**Filter UI (style IKM)**
- Section card putih `rounded-2xl border border-slate-200`
- 2 input `type="date"`: Tanggal Mulai, Tanggal Akhir
- Teks “Periode aktif: … sampai …”
- **Tidak** ada: filter status “Semua Status”, checkbox belum lengkap, shift, Tambah Absensi, Edit, Delete
- Tombol **Download Excel** (style hijau seperti IKM)

**Tabel desktop (style IKM: `min-w-full text-sm`, thead slate-50, uppercase header)**
| Kolom | Isi |
|---|---|
| Tanggal | `attendance_date` format id-ID |
| Karyawan | `full_name` bold + `employee_code` |
| Absen In | datetime |
| Foto QC | 4 `PhotoThumb` (Satu Badan / Samping / Belakang / Tangan) dengan overlay badge ✓/✕ jika sudah direview |
| Absen Out | datetime atau “-” |
| Foto Out | thumbnail check-out; klik → preview only |
| Durasi | hitung dari check_in_at → check_out_at (helper mirip IKM `calcDuration`) |
| Status | badge seperti IKM (`Belum check-out` amber, dll.) |

**Mobile**
- Card list mirip IKM `MobileAttendanceCard` (tanpa Edit/Delete): tanggal, nama, status, absen in/out, 4 thumbs + foto out.

**Komponen foto**
- `PhotoThumb`: thumbnail rounded-lg border; relative wrapper; jika `review.score === 1` badge pojok ✓ hijau; jika `0` badge ✕ merah; onClick buka modal penilaian (hanya untuk 4 foto QC).
- `PhotoReviewModal`:
  - Overlay gelap + foto besar (AuthenticatedImage / fetch credentials seperti detail lama)
  - Tombol ✓ (Sesuai) dan ✕ (Tidak sesuai) — icon/checklist & silang, style jelas
  - Jika ✕ dipilih: tampilkan textarea **Catatan** (wajib)
  - **Tanpa tombol Simpan**:
    - Pilih ✓ → langsung `PUT /cleanox/attendance/records/:id/reviews` dengan `{ reviews: [{ photo_type, score: 1, reason: "" }] }`, update local row, tutup modal
    - Pilih ✕ → set draft score 0 + tampil catatan; auto-save saat `reason.trim()` tidak kosong setelah debounce 500ms **atau** onBlur (pilih debounce + blur, mana yang pertama valid), lalu update local + tutup modal / biarkan terbuka singkat dengan indikator tersimpan
  - Escape / klik backdrop menutup tanpa save jika belum valid
- `PhotoViewerModal` (check-out): sama pola IKM view-only

**Hero / page chrome**
- Pertahankan header Cleanox (gradient navy) singkat: judul “Absensi Karyawan Cleanox” + subtitle singkat; di bawahnya filter + tabel bergaya IKM agar konsisten shell Cleanox + konten IKM.

**Fetch**
- `GET /cleanox/attendance/records?startDate=&endDate=`
- Refetch saat tanggal berubah

#### File baru: `src/pages/cleanox-management/utils/exportAbsensiCleanoxExcel.js`
- Export flat sheet (bukan pivot shift IKM): kolom Tanggal, Karyawan, Kode, Absen In, Absen Out, Durasi, Status, ringkasan review 4 foto (Sesuai/Tidak sesuai/Belum), Catatan (gabungan reason jika ada).
- Pakai `xlsx-js-style` seperti IKM; filename `riwayat_absensi_cleanox_YYYYMMDD.xlsx`.

#### Routing — `src/App.jsx`
- `/cleanox-management-system/absensi` tetap → `AbsensiKaryawanCleanox` (halaman baru).
- `/cleanox-management-system/absensi/:employeeId` → redirect ke `/cleanox-management-system/absensi` (atau tetap mount detail lama tapi unused). **Pilih: Redirect** agar tidak ada dead UX.

#### File detail lama
- `AbsensiKaryawanDetailCleanox.jsx`: tidak dipakai di route aktif; biarkan file (tidak wajib hapus di checklist ini) atau biarkan unused.

### C. Style parity checklist (IKM)
- Table header uppercase `text-xs font-semibold tracking-wider text-slate-500`
- Row hover `hover:bg-blue-50/30` (atau soft slate jika bentrok brand — prefer samakan IKM)
- StatusBadge: mapping warna sama IKM (`Belum check-out` amber, `Lengkap` emerald, `Foto belum lengkap` slate/amber, `Belum check-in` slate)
- Download Excel button: `border-emerald-200 bg-emerald-50 text-emerald-700`
- Photo thumb: `h-10 w-10 rounded-lg border`, hover scale ringan
- Badge review di thumb: absolute pojok kanan atas, circle kecil `h-4 w-4` ✓/✕

### D. Tidak di-scope
- Tombol Edit / Delete / Tambah Absensi
- Filter status dropdown, shift, checkbox “hanya belum lengkap”
- Penilaian QC pada foto check-out
- Perubahan schema Prisma / migrasi baru
- Stat cards sakit/izin/cuti IKM

## Implementation Checklist
1. Di `absensiKaryawanCleanoxController.js`, tambah helper `getRecordStatus(row)` dengan label IKM-equivalent (termasuk cek 4 foto QC + `check_out_photo_file`).
2. Di controller yang sama, ekspansi builder foto: tetap `buildPhotosFromRow` untuk 4 tipe; tambah helper `buildCheckOutPhoto(row)` → `{ file, url } | null`.
3. Implement `listAttendanceRecords`: validasi `startDate`/`endDate`, query attendance + employee Cleanox + reviews, map ke response shape di spesifikasi, return `{ success, startDate, endDate, total, data }`.
4. Export `listAttendanceRecords` dari controller; daftarkan `GET /records` di `absensiKaryawanCleanoxRoutes.js`.
5. Verifikasi `upsertAttendancePhotoReviews` menerima 1 item review (tanpa wajib 4); sesuaikan hanya jika ada validasi yang memaksa batch.
6. Buat `src/pages/cleanox-management/utils/exportAbsensiCleanoxExcel.js` (export flat + download file).
7. Rewrite `AbsensiKaryawanCleanox.jsx`: state filter tanggal + fetch `GET /cleanox/attendance/records`.
8. Di file yang sama, bangun UI filter tanggal + periode aktif + tombol Download Excel (style IKM); tanpa Edit/Delete/Tambah/filter status.
9. Bangun tabel desktop kolom: Tanggal, Karyawan, Absen In, Foto QC (4 thumb + badge), Absen Out, Foto Out, Durasi, Status.
10. Bangun mobile card equivalent (tanpa aksi edit/delete).
11. Implement `PhotoThumb` + overlay badge ✓/✕ dari `photo.review.score`.
12. Implement `PhotoReviewModal` untuk 4 foto QC: ✓ langsung save score=1; ✕ tampil catatan lalu auto-save score=0+reason; update row lokal setelah sukses.
13. Implement preview-only modal untuk Foto Out (check-out).
14. Wire Download Excel ke util baru dengan records + periode aktif.
15. Di `App.jsx`, ubah route `/cleanox-management-system/absensi/:employeeId` menjadi `<Navigate to="/cleanox-management-system/absensi" replace />`.
16. Verifikasi manual: filter tanggal, status Belum check-out, 4 foto + foto out, klik foto → penilaian tanpa tombol simpan, badge muncul, excel download, tidak ada navigasi ke detail karyawan.

## Risks / Catatan
- Auto-save saat ✕ bergantung catatan terisi; debounce/blur harus jelas di UI (placeholder “Wajib diisi — tersimpan otomatis”).
- Foto diload dengan credentials (`AuthenticatedImage` pattern) — URL IKM publik berbeda; jangan pakai `<img src>` mentah untuk Cleanox auth photos.
- Endpoint baru harus efisien: N+1 reviews dihindari dengan satu query `IN (attendance_ids)`.
- Style IKM + shell Cleanox: filter/tabel samakan IKM; hero Cleanox boleh tetap agar konsisten modul.
