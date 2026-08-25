# Plan: Absensi Cleanox Superapp — Default Cutoff Selaras cleanox-app

## Context
- Acuan cutoff di cleanox-app (Kasbon / Izin-Cuti): **26 → 25**.
  - Jika hari ≤ 25: mulai tgl 26 bulan lalu → tgl 25 bulan ini.
  - Jika hari > 25: mulai tgl 26 bulan ini → tgl 25 bulan depan.
- `cleanox-app` **tidak disentuh** (riwayat, kalender tugas, absensi mobile tetap).
- Halaman absensi superapp: `AbsensiKaryawanCleanox.jsx`.
- Observasi saat ini:
  - **FE sudah** punya mode `cutoff` default + helper `getDefaultCutoffSelection(..., 26)` (rumus sama cleanox-app / PerizinanCleanox).
  - **Backend belum selaras**: `defaultDateRange()` di `absensiKaryawanCleanoxController.js` masih **30 hari terakhir** jika `startDate`/`endDate` kosong.

## Goal
- Default periode absensi Cleanox di superapp = **cutoff aktif 26–25** (sama spirit cleanox-app).
- Tidak mengubah cleanox-app sama sekali.
- Tidak mengubah Riwayat / Kalender mobile.

## Detailed Specifications

### A. Backend — `backend-superapp` only

#### File: `controllers/Cleanox/absensiKaryawanCleanoxController.js`

1. Ganti `defaultDateRange()` agar mengembalikan **cutoff aktif 26–25**, bukan rolling 30 hari.
   - Helper mirror cleanox-app / Perizinan:
     ```text
     if today.date <= 25:
       start = tahun-bulan_lalu-26
       end   = tahun-bulan_ini-25
     else:
       start = tahun-bulan_ini-26
       end   = tahun-bulan_depan-25
     ```
   - Return `{ startDate, endDate }` format `YYYY-MM-DD` via `toDateOnly`.

2. Pemakaian: `listAttendanceRecords` dan `listEmployeeAttendanceRecords` yang sudah fallback ke `defaultDateRange()` otomatis ikut cutoff (jika query tanpa tanggal).

3. Validasi max 63 hari **tetap** (cutoff ~30–31 hari aman).

### B. Frontend — verifikasi saja (tidak rewrite besar)

#### File: `src/pages/cleanox-management/components/AbsensiKaryawanCleanox.jsx`

- **Tidak wajib ubah** jika sudah:
  - `periodMode` default `"cutoff"`
  - `getDefaultCutoffSelection(now, 26)` → start 26 / end 25
  - Fetch memakai `activePeriod.startDate/endDate`
- Checklist verifikasi rumus vs cleanox-app Kasbon `getCutoffRange()` (hari ≤25 vs >25).
- Hanya ubah jika ditemukan mismatch label/range; jika match → no-op FE.

### C. Out of scope
- Semua file di `cleanox-app` (mobile attendance, riwayat, calendar, leave, kasbon)
- Ubah UI mode Hari Ini / Custom (boleh tetap ada)
- Schema / migrasi

## Implementation Checklist
1. Di `absensiKaryawanCleanoxController.js`, tulis ulang `defaultDateRange()` ke cutoff aktif 26–25 (sama aturan cleanox-app Kasbon/Leave).
2. Pastikan `listAttendanceRecords` + `listEmployeeAttendanceRecords` tetap memakai fallback itu (tanpa ubah signature endpoint).
3. Verifikasi FE `AbsensiKaryawanCleanox.jsx`: default cutoff 26–25 match cleanox-app; **hanya patch jika mismatch**.
4. Smoke test manual superapp: buka Absensi → Periode aktif = 26 bulan lalu – 25 bulan ini (atau cutoff berikutnya jika hari > 25); ganti bulan cutoff; pastikan cleanox-app tidak berubah.

## Risks / Catatan
- FE sudah cutoff dari pekerjaan sebelumnya; fokus utama plan ini = **backend default**.
- Client yang memanggil `/cleanox/attendance/records` tanpa tanggal akan beralih dari “30 hari” ke “cutoff aktif” — intentional.
- Jangan sentuh `cleanox-app`.
