# Plan: Report Alora Bugar di Master Karyawan

## Context
- Modul `master-karyawan` di `frontend-superapp` sudah punya sidebar: Dashboard, Data Karyawan, Cuti & Perizinan, Report Absensi.
- Referensi UI yang harus diikuti adalah halaman `ReportAbsensiAlora.jsx` (pola hero, filter periode, stat cards, ringkasan per karyawan, tabel detail, pagination, Download Excel).
- Data Alora Bugar tersimpan di database `alora_mobile`, terutama tabel `tr_worker_bugar_session` (record sesi olahraga) dan opsional profil di `tr_worker_bugar_profile`.
- API bugar di `alora-mobile` saat ini hanya scoped ke karyawan login (`/api/bugar/sessions`, stats, leaderboard); belum ada endpoint admin lintas karyawan di `backend-superapp`.
- Pola integrasi admin Alora sudah ada: `controllers/Alora/attendanceAloraController.js` + `routes/Alora/attendanceAloraRoutes.js` + mount `/alora/attendance` memakai `safeAloraMobileQuery` + enrich `mst_employee`.
- Keputusan scope yang disepakati: fokus ke **record sesi Bugar** dari `alora_mobile` yang muncul di superapp, dan **export Excel ikut dibawa**.

## Goal
- Menambahkan sidebar baru di `master-karyawan` untuk Report Alora Bugar.
- Menampilkan daftar record sesi olahraga lintas karyawan dengan tampilan mirip Report Absensi.
- Menyediakan endpoint backend `/alora/bugar` untuk membaca `tr_worker_bugar_session` dari `alora_mobile` + enrich profil karyawan.
- Menyediakan Download Excel dari record sesuai filter aktif.

## Detailed Specifications

### Frontend `frontend-superapp`

#### 1. Sidebar dan route
- Ubah `src/pages/master-karyawan/index.jsx`
  - Tambah menu:
    - path: `/master-karyawan/report-bugar`
    - label: `Report Alora Bugar`
    - description: `Rekap sesi olahraga Alora Bugar`
    - icon: satu keluarga dengan menu existing (mis. `HiOutlineHeart` atau `HiOutlineFire`)
  - Pastikan `ActiveMenuTitle` mengenali route baru.
- Ubah `src/App.jsx`
  - Import komponen `ReportBugarAlora`
  - Child route: `/master-karyawan/report-bugar` di dalam wrapper `MasterKaryawan`
  - ProtectedRoute sama dengan modul `master-karyawan`

#### 2. Halaman baru report Bugar
- Buat file: `src/pages/master-karyawan/components/ReportBugarAlora.jsx`
- Patokan struktur visual/perilaku: `ReportAbsensiAlora.jsx`
- Struktur UI wajib:
  - Hero header identitas Master Karyawan + judul Report Alora Bugar
  - Filter periode (cutoff 26–25 / hari ini / custom) + multi-select karyawan
  - Filter sport: semua / `run` / `cycle`
  - Filter opsional mode haid: semua / haid saja / non-haid
  - Stat cards
  - Tabel ringkasan per karyawan
  - Tabel detail record sesi
  - Pagination
  - Tombol Download Excel
  - Loading + error state
- Yang tidak dibawa di tahap ini:
  - Create / edit / delete sesi
  - Preview map GPS penuh dari `points_json`
  - Manajemen mode haid / edit profil fisik
- Field detail tabel (kolom):
  - Tanggal selesai (`ended_at`)
  - Karyawan (nama + NIK/code)
  - Jabatan
  - Sport (`run` / `cycle`) badge
  - Durasi
  - Jarak (km)
  - Kalori
  - Pace/kecepatan rata-rata
  - Steps (jika run; jika cycle tampil `-`)
  - Goal focus
  - Haid mode (badge ya/tidak)
- Tidak menampilkan `points_json` di list (berat); cukup `point_count` opsional jika ingin, atau dihilangkan dari UI list.

#### 3. State dan query frontend
- State setara Report Absensi:
  - `periodMode`, cutoff month/year, custom dates
  - `selectedEmployeeIds`, `employeeOptions`
  - `sportFilter` (`"" | "run" | "cycle"`)
  - `haidFilter` (`"" | "1" | "0"`)
  - `pagination`, `sort`
  - `summary`, `employeeSummary`, `records`
  - `loading`, `error`, `exporting`
- Query ke backend:
  - `startDate`, `endDate`
  - `page`, `limit`
  - `employeeIds`
  - `sport`
  - `haidMode` (opsional)
  - `search` (opsional, jika backend mendukung)

#### 4. Response shape yang diharapkan frontend
- `records`
- `summary`
- `employeeSummary`
- `employeeOptions`
- `pagination`
- `period`

Record detail minimal:
- `session_id`
- `employee_id`, `employee_code`, `employee_name`, `jabatan`
- `sport`, `goal_focus`
- `started_at`, `ended_at`
- `duration_sec`, `distance_km`, `calories`, `avg_pace_or_speed`
- `step_count`, `step_source`
- `haid_mode`
- `point_count`

Summary minimal:
- `totalSessions`
- `totalEmployees`
- `totalKm`
- `totalCalories`
- `totalDurationSec`
- `runCount`
- `cycleCount`

Employee summary minimal:
- `employee_id`, `employee_name`, `employee_code`, `jabatan`
- `session_count`
- `total_km`
- `total_calories`
- `total_duration_sec`

#### 5. Export Excel
- Buat `src/pages/master-karyawan/utils/exportReportBugarAloraExcel.js`
- Pola mirip `exportReportAbsensiAloraExcel.js`
- Sheet utama: detail sesi sesuai filter aktif
- Kolom Excel: No, Tanggal, NIK, Nama, Jabatan, Sport, Durasi, Jarak km, Kalori, Pace/Speed, Steps, Goal, Haid Mode
- Nama file: `Report_Alora_Bugar_{start}_{end}.xlsx`
- Tombol Download Excel fetch ulang dengan `limit` besar lalu panggil utility

### Backend `backend-superapp`

#### 6. Controller baru
- Buat `controllers/Alora/bugarAloraController.js`
- Export: `getBugarReport`
- Pola organisasi mengikuti `attendanceAloraController.js`:
  - validasi tanggal + range max 63 hari
  - default cutoff 26–25
  - query `safeAloraMobileQuery` ke `tr_worker_bugar_session`
  - enrich karyawan via `safeQuery` ke `mst_employee`
- Filter WHERE:
  - `ended_at` (atau `DATE(ended_at)`) dalam rentang `startDate`–`endDate`
  - `employee_id` / `employeeIds`
  - `sport` jika diisi
  - `haid_mode` jika diisi
  - search employee via lookup main DB lalu IN employee_id (opsional, sama absensi)
- Aggregation:
  - count + pagination list
  - summary global
  - employee summary group by employee_id (limit 500)
  - employeeOptions: distinct employee_id dalam periode tanggal (tanpa filter employeeIds)
- **Tidak** mengembalikan `points_json` di response list (hindari payload besar).

#### 7. Route dan mount
- Buat `routes/Alora/bugarAloraRoutes.js`
  - `GET /` → `getBugarReport` + `requireAuth`
- Mount di `index.js`:
  - `app.use("/alora/bugar", bugarAloraRoutes);`
  - letakkan berdekatan dengan `/alora/attendance` dan `/alora/leaves`

#### 8. Mapping kolom DB
Dari `tr_worker_bugar_session`:
- `id` → `session_id`
- `employee_id`
- `employee_name` (fallback jika enrich gagal)
- `sport`, `goal_focus`
- `started_at`, `ended_at`
- `duration_sec`, `distance_km`, `calories`, `avg_pace_or_speed`
- `step_count`, `step_source`
- `haid_mode`, `point_count`

## Implementation Checklist
1. Inventarisasi exact dependency frontend dari `ReportAbsensiAlora.jsx`, `master-karyawan/index.jsx`, dan `App.jsx`.
2. Inventarisasi exact dependency backend dari `attendanceAloraController.js`, `attendanceAloraRoutes.js`, `index.js`, dan schema `tr_worker_bugar_session`.
3. Buat controller `backend-superapp/controllers/Alora/bugarAloraController.js`.
4. Tambahkan helper validasi tanggal, cutoff 26–25, parser `employeeIds`, dan boolean haid di controller.
5. Tambahkan helper lookup profil karyawan dari DB utama (nama, code, jabatan).
6. Implementasikan query count total sesi Bugar dalam periode/filter.
7. Implementasikan query list record sesi dengan pagination, tanpa `points_json`.
8. Implementasikan query summary global (total sesi, km, kalori, durasi, run/cycle count).
9. Implementasikan query summary per karyawan.
10. Implementasikan query `employeeOptions` dari distinct employee pada periode.
11. Bentuk response `getBugarReport` dengan `records`, `summary`, `employeeSummary`, `employeeOptions`, `pagination`, `period`.
12. Buat `backend-superapp/routes/Alora/bugarAloraRoutes.js`.
13. Daftarkan `GET /alora/bugar` dengan `requireAuth`.
14. Mount route `/alora/bugar` di `backend-superapp/index.js`.
15. Tambahkan import `ReportBugarAlora` di `frontend-superapp/src/App.jsx`.
16. Tambahkan child route `/master-karyawan/report-bugar`.
17. Tambahkan item sidebar `Report Alora Bugar` di `master-karyawan/index.jsx`.
18. Pastikan `ActiveMenuTitle` mengenali route report bugar.
19. Buat halaman `src/pages/master-karyawan/components/ReportBugarAlora.jsx` meniru layout Report Absensi.
20. Tambahkan state periode cutoff/custom/today pada halaman Bugar.
21. Tambahkan state multi-select karyawan, sport filter, dan haid filter.
22. Tambahkan state summary, employeeSummary, records, pagination, loading, error, exporting.
23. Implementasikan fetch ke `/alora/bugar` dengan query parameter sesuai filter.
24. Sinkronkan fetch saat filter/pagination berubah.
25. Tambahkan UI filter section ala Report Absensi + filter sport/haid.
26. Tambahkan UI stat cards berbasis summary Bugar.
27. Tambahkan UI tabel ringkasan per karyawan.
28. Tambahkan UI tabel detail sesi (tanpa aksi CRUD, tanpa map GPS).
29. Tambahkan pagination bar.
30. Buat `src/pages/master-karyawan/utils/exportReportBugarAloraExcel.js`.
31. Hubungkan tombol Download Excel ke utility + fetch limit besar sesuai filter aktif.
32. Rapikan copy UI agar domain Master Karyawan / Alora Bugar konsisten.
33. Uji manual endpoint backend: default cutoff, sport, haidMode, employeeIds, pagination.
34. Uji manual frontend: load awal, filter, pagination, export Excel.
35. Jalankan pengecekan linter pada file frontend/backend yang diubah.

## Risks / Catatan
- `points_json` tidak boleh ikut di list response agar payload tetap ringan.
- Filter periode harus konsisten antara summary, employee summary, detail, dan Excel.
- Nama di session (`employee_name`) bisa stale; prioritas enrich dari `mst_employee`.
- Satuan tampilan: durasi format `xj ym`, jarak km 1–3 desimal, konsisten dengan mobile Bugar.
- Scope v1 hanya report record sesi + Excel; bukan CRUD dan bukan manajemen profil/haid.
