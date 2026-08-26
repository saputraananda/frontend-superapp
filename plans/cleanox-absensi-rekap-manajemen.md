# Plan: Absensi Cleanox — Rekap ala Absensi Manajemen IKM

## Context
- Halaman `/cleanox-management-system/absensi` (`AbsensiKaryawanCleanox.jsx`) sudah punya tabel riwayat flat, filter tanggal mulai–akhir, status, foto grooming, Edit/Delete.
- Belum ada rekap agregat: tidak ada StatCard, tidak ada Ringkasan Per Karyawan (total masuk kerja), tidak ada periode cutoff.
- Acuan yang disetujui: **Dashboard Absen Manajemen IKM** (`AbsensiManajemen.jsx` + `getManagementAttendance`).
- Sumber data Cleanox tetap `tr_worker_attendance` (bukan tabel IKM). Fitur QC grooming / Edit / Delete tetap dipertahankan.

## Goal
- Samakan **flow periode** dengan IKM Manajemen: mode Cutoff (26→25), Hari Ini, Custom.
- Tambah **rekap**: StatCard ringkasan periode + tabel Ringkasan Per Karyawan (total masuk = `record_count`).
- Perbarui halaman absensi Cleanox yang sudah ada (bukan halaman baru).
- Backend `GET /cleanox/attendance/records` mengembalikan `summary` + `employeeSummary` selain `data`.

## Detailed Specifications

### A. Definisi bisnis (mirror IKM Manajemen)

#### Periode cutoff
- `cutoffStartDay = 26` (hardcoded sama IKM).
- Untuk `cutoffMonth` / `cutoffYear` terpilih:
  - `startDate` = tanggal 26 bulan **sebelum** cutoffMonth
  - `endDate` = tanggal 25 di cutoffMonth
- Default selection: sama helper IKM `getDefaultCutoffSelection(now, 26)`.
- Mode periode FE:
  - `cutoff` (default)
  - `today`
  - `custom` (2 input date)

#### Status lengkap (Cleanox)
Pakai `getRecordStatus(row)` yang sudah ada di controller:
- `Lengkap` = check-in + check-in photo + 4 foto grooming + check-out + check-out photo
- Selain `Lengkap` = belum lengkap untuk aggregate

#### Aggregate summary (periode aktif)
| Field | Arti |
|---|---|
| `totalRecords` | COUNT semua record absensi di periode |
| `totalEmployees` | COUNT DISTINCT worker_id |
| `checkedInCount` | SUM record yang punya `check_in_at` |
| `checkedOutCount` | SUM record yang punya `check_out_at` |
| `completeCount` | SUM record status Lengkap |
| `incompleteCount` | `totalRecords - completeCount` |

#### Employee summary (“total dia masuk kerja”)
Per `worker_id` di periode:
| Field | Arti |
|---|---|
| `employee_id` | worker_id |
| `employee_name` | `full_name` |
| `employee_code` | NIK/kode |
| `jabatan` | `cleanox_role` dari `mst_role` (atau `"-"` jika kosong) |
| `record_count` | **Total masuk kerja** = jumlah record absensi karyawan di periode |
| `complete_count` | jumlah record Lengkap |
| `incomplete_count` | `record_count - complete_count` |

Urutan: `record_count DESC`, limit 500 (sama spirit IKM).

### B. Backend — `backend-superapp`

#### File: `controllers/Cleanox/absensiKaryawanCleanoxController.js`

1. **Helper `isAttendanceComplete(row)`**
   - Return `getRecordStatus(row) === "Lengkap"`.
   - Dipakai untuk aggregate agar satu sumber kebenaran dengan `status_label`.

2. **Perluas `listAttendanceRecords`**
   - Query params tetap: `startDate`, `endDate` (`YYYY-MM-DD`).
   - Validasi range: jika `endDate < startDate` → 400 (sudah ada).
   - Opsional mirror IKM: max range **63 hari** → 400 `"Range tanggal maksimal 63 hari"` (cutoff ~30 hari aman; custom ikut batasan sama).
   - Setelah ambil rows + map records (logic existing tetap):
     - Hitung `summary` dari rows (boleh di JS setelah fetch, atau SQL aggregate terpisah — pilih **hitung di JS dari rows yang sama** agar status Lengkap konsisten dengan `getRecordStatus`, tanpa duplikasi SQL CASE panjang untuk 4 foto grooming).
     - Hitung `employeeSummary`: group by `worker_id` dari rows → merge profile dari `employeeMap` + `roleMap`.
   - Response shape baru (backward compatible; FE lama yang hanya baca `data` tetap aman):
     ```text
     {
       success: true,
       startDate, endDate,
       total: <number>,           // tetap = jumlah records
       summary: {
         totalRecords,
         totalEmployees,
         checkedInCount,
         checkedOutCount,
         completeCount,
         incompleteCount
       },
       employeeSummary: [
         {
           employee_id, employee_name, employee_code, jabatan,
           record_count, complete_count, incomplete_count
         }
       ],
       data: [ ...records existing... ]
     }
     ```
   - Empty worker / no rows: tetap return `summary` semua 0 dan `employeeSummary: []`.

3. **Tidak mengubah** endpoint lain (`update`, `delete`, `reviews`, `photos`, list employees).

#### File: `routes/Cleanox/absensiKaryawanCleanoxRoutes.js`
- Tidak perlu route baru; tetap `GET /records` → `listAttendanceRecords`.

### C. Frontend — `frontend-superapp`

#### File: `src/pages/cleanox-management/components/AbsensiKaryawanCleanox.jsx`

**State baru / ganti**
- Hapus state tunggal `startDate`/`endDate` sebagai satu-satunya kontrol periode.
- Tambah:
  - `periodMode` default `"cutoff"`
  - `cutoffMonth`, `cutoffYear` dari `getDefaultCutoffSelection(..., 26)`
  - `customStartDate`, `customEndDate`
  - `summary` (`null` awal), `employeeSummary` (`[]`)
- Derived `activePeriod` + `activePeriodLabel` (copy logic IKM Manajemen; `cutoffStartDay = 26`).
- Fetch memakai `activePeriod.startDate` / `activePeriod.endDate`.
- Setelah response: set `records`, `summary`, `employeeSummary`.

**Helper yang ditambah di file yang sama** (mirror IKM, tidak wajib extract file util terpisah):
- `clamp`, `getDefaultCutoffSelection`, `PERIOD_MONTHS`, `StatCard`, `toneClass`
- `activePeriod` / label cutoff sama rumus IKM

**UI urutan section (dari atas)**
1. Hero Cleanox existing (judul/subtitle boleh update singkat: “Rekap & monitoring absensi per periode cutoff”).
2. **Filter periode** (ganti 2 date-only sederhana):
   - Select mode: `Periode Cutoff` / `Hari Ini` / `Custom`
   - Jika cutoff: select bulan + tahun
   - Jika custom: Tanggal Mulai + Tanggal Akhir
   - Chip/teks “Periode aktif: …”
   - Tombol Reset filter periode (opsional mirror IKM: reset ke default cutoff) — **ikutkan** agar parity.
3. **Stat cards** (grid 2→4):
   - Total Record → `summary.totalRecords`
   - Lengkap → `summary.completeCount`
   - Belum Lengkap → `summary.incompleteCount`
   - Sudah Check-In → `summary.checkedInCount`
   - Style: card putih rounded-2xl border slate (bukan purple IKM); icon tone blue/emerald/rose/amber.
4. **Ringkasan Per Karyawan** (tampil jika `employeeSummary.length > 0`, atau selalu tampil dengan empty state):
   - Kolom: Karyawan | NIK | Jabatan | Total Record | Lengkap | Belum Lengkap
   - `Total Record` = total masuk kerja periode
   - Empty: “Belum ada data ringkasan karyawan untuk periode/filter ini.”
5. **Detail Riwayat Absensi** (existing):
   - Pertahankan: filter status, tabel desktop, mobile card, foto in/out/grooming, durasi, status, Edit/Delete, modals.
   - Header section boleh tetap; count tetap dari `displayedRecords`.

**Out of scope (tidak ditambah di plan ini)**
- Multi-select filter karyawan IKM
- Checkbox “hanya belum lengkap”
- Pagination server-side / Tambah Absensi
- Download Excel
- Stat Sakit/Izin/Cuti (itu Dashboard Absensi IKM biasa, bukan Manajemen)
- Halaman/route baru
- Perubahan schema / migrasi Prisma

### D. Style / brand
- Shell tetap Cleanox (hero navy `#1b3459`).
- Filter/stat/tabel ringkasan: pola layout IKM Manajemen, warna netral slate (hindari purple gradient IKM).
- Detail table existing tidak diubah kolomnya.

## Implementation Checklist
1. Di `absensiKaryawanCleanoxController.js`, tambah helper `isAttendanceComplete(row)` berbasis `getRecordStatus(row) === "Lengkap"`.
2. Di `listAttendanceRecords`, setelah map `data`, hitung `summary` dari rows (totalRecords, totalEmployees, checkedInCount, checkedOutCount, completeCount, incompleteCount).
3. Di `listAttendanceRecords`, bangun `employeeSummary` group-by `worker_id` dengan field `employee_id`, `employee_name`, `employee_code`, `jabatan` (= cleanox_role), `record_count`, `complete_count`, `incomplete_count`; sort `record_count DESC`.
4. Di `listAttendanceRecords`, kembalikan response yang menyertakan `summary` + `employeeSummary` (empty cases juga).
5. Tambah validasi max range 63 hari di `listAttendanceRecords` (mirror IKM Manajemen).
6. Di `AbsensiKaryawanCleanox.jsx`, tambah helpers periode: `clamp`, `getDefaultCutoffSelection`, `PERIOD_MONTHS`, `StatCard`, `toneClass`.
7. Ganti state tanggal menjadi `periodMode` + cutoff month/year + custom dates; derived `activePeriod` / `activePeriodLabel`.
8. Ubah fetch: query `startDate`/`endDate` dari `activePeriod`; set juga `summary` dan `employeeSummary` dari response.
9. Rebuild section filter UI: mode cutoff/today/custom + bulan/tahun + periode aktif + reset default cutoff.
10. Tambah section 4 StatCard di bawah filter.
11. Tambah section tabel Ringkasan Per Karyawan (kolom sama IKM Manajemen; jabatan = cleanox_role).
12. Pastikan section Detail Riwayat Absensi (status filter, tabel, mobile, Edit/Delete, foto) tetap berfungsi tanpa regresi.
13. Update subtitle hero singkat agar menyebut rekap per periode cutoff.
14. Verifikasi manual: default cutoff 26–25, ganti bulan cutoff ubah aggregate, Hari Ini & Custom, Total Record per karyawan = jumlah baris detail orang itu, Lengkap/Belum Lengkap konsisten status badge.

## Risks / Catatan
- Menghitung complete di JS (bukan SQL CASE) lebih aman karena kelengkapan Cleanox melibatkan 4 foto grooming + check-in/out photo; pastikan pakai row mentah sebelum/atau setara `getRecordStatus`.
- `employeeSummary` hanya karyawan yang **punya record** di periode (sama IKM Manajemen); karyawan 0 absen tidak muncul di ringkasan.
- Range 63 hari: cutoff standar aman; jika user custom > 63 hari harus dapat error jelas di UI (`fetchError`).
- Jangan hapus fitur QC/foto grooming/Edit/Delete yang sudah ada.
