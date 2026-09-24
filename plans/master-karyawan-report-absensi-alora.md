# Plan: Report Absensi Alora di Master Karyawan

## Context
- Modul `master-karyawan` di `frontend-superapp` saat ini sudah memiliki sidebar dan route untuk `Dashboard`, `Data Karyawan`, dan `Cuti & Perizinan`.
- Referensi UI/UX yang harus diikuti adalah `Dashboard Absen Manajemen` IKM di `src/pages/absensi-ikm/components/AbsensiManajemen.jsx`.
- Data absensi Alora berada di database `alora_mobile`, khususnya tabel `tr_worker_attendance`, dan saat ini belum ada endpoint report lintas karyawan di `backend-superapp`.
- Integrasi Alora lintas repo sudah punya pola yang bisa diikuti melalui `backend-superapp/controllers/Alora/leavesAloraController.js`, `backend-superapp/routes/Alora/leavesAloraRoutes.js`, dan mount route `/alora/leaves` di `backend-superapp/index.js`.
- Kebutuhan bisnis yang sudah disepakati: tambah sidebar baru di `master-karyawan` untuk `Report Absensi`, dan tampilannya disamakan dengan dashboard manajemen IKM, tanpa konsep shift.

## Goal
- Menambahkan menu sidebar baru `Report Absensi` di modul `master-karyawan`.
- Menyediakan halaman report absensi Alora yang meniru `Dashboard Absen Manajemen` IKM: filter periode, stat cards, ringkasan per karyawan, tabel detail, status, foto masuk/keluar, pagination, dan export Excel.
- Menyediakan endpoint backend baru di `backend-superapp` yang membaca data absensi dari database `alora_mobile` dan menggabungkannya dengan profil karyawan dari database utama.

## Detailed Specifications

### Frontend `frontend-superapp`

#### 1. Sidebar dan route master karyawan
- Ubah `src/pages/master-karyawan/index.jsx`
  - Tambah item menu baru:
    - path: `/master-karyawan/report-absensi`
    - label: `Report Absensi`
    - deskripsi singkat yang konsisten dengan menu lain.
  - Gunakan ikon yang tetap satu keluarga dengan menu existing.
  - Pastikan judul aktif di header ikut berubah saat route report absensi dibuka.
- Ubah `src/App.jsx`
  - Tambah import halaman baru report absensi Alora.
  - Tambah child route baru di dalam wrapper `MasterKaryawan`:
    - `/master-karyawan/report-absensi`
  - Route baru tetap memakai `ProtectedRoute` yang sama dengan modul `master-karyawan`.

#### 2. Halaman baru report absensi Alora
- Buat file baru `src/pages/master-karyawan/components/ReportAbsensiAlora.jsx`.
- Halaman ini harus meniru struktur besar `src/pages/absensi-ikm/components/AbsensiManajemen.jsx`, dengan penyesuaian data source Alora.
- Struktur UI yang harus ada:
  - Header halaman dengan identitas `Master Karyawan`.
  - Filter periode aktif.
  - Stat cards.
  - Tabel ringkasan per karyawan.
  - Tabel detail riwayat absensi.
  - Pagination bar.
  - Modal preview foto.
  - Pesan error dan loading state.
- Konsep shift tidak dibawa ke halaman ini.
- Konsep tambah, edit, dan hapus absensi tidak dibawa ke tahap ini.
- Tombol aksi toolbar yang dipertahankan pada tahap ini:
  - filter status
  - tombol bersihkan filter status
  - tombol download excel
- Elemen toolbar yang tidak dibawa:
  - tambah absensi
  - form input absensi manual
  - aksi edit record
  - aksi hapus record

#### 3. State dan query parameter frontend
- Halaman `ReportAbsensiAlora.jsx` perlu memiliki state yang setara secara perilaku dengan `AbsensiManajemen.jsx` untuk:
  - periode aktif
  - status filter
  - pencarian
  - pilihan karyawan multi-select
  - filter `onlyIncomplete`
  - sorting tabel
  - pagination
  - summary
  - employee summary
  - records
  - loading
  - error
  - preview foto
- Query parameter request frontend ke backend harus mendukung:
  - `startDate`
  - `endDate`
  - `page`
  - `limit`
  - `search`
  - `employeeIds`
  - `onlyIncomplete`
  - `status`
- Periode default harus mengikuti pola yang paling konsisten dengan halaman Alora existing:
  - cutoff 26 sampai 25
  - menggunakan helper range yang setara dengan `PerizinanAlora`

#### 4. Struktur data frontend yang diharapkan dari backend
- Response endpoint report absensi Alora harus menyediakan blok data berikut agar halaman baru bisa semirip mungkin dengan dashboard manajemen IKM:
  - `records`
  - `summary`
  - `employeeSummary`
  - `employeeOptions`
  - `pagination`
- Setiap record detail minimal memuat:
  - `attendance_id`
  - `employee_id`
  - `employee_code`
  - `employee_name`
  - `jabatan`
  - `work_date`
  - `check_in_time`
  - `check_out_time`
  - `check_in_photo_url`
  - `check_out_photo_url`
  - `clock_in_latitude`
  - `clock_in_longitude`
  - `clock_out_latitude`
  - `clock_out_longitude`
  - `clock_in_location_name`
  - `clock_out_location_name`
  - `status_label`
- Blok `summary` minimal memuat:
  - `totalRecords`
  - `totalEmployees`
  - `checkedInCount`
  - `checkedOutCount`
  - `completeCount`
  - `incompleteCount`
- Setiap item `employeeSummary` minimal memuat:
  - `employee_id`
  - `employee_name`
  - `employee_code`
  - `jabatan`
  - `record_count`
  - `complete_count`
  - `incomplete_count`
- `employeeOptions` dipakai untuk filter multi-select karyawan.

#### 5. Status record report absensi
- Label status harus meniru pola dashboard manajemen IKM dan tetap tanpa shift.
- Definisi status yang dipakai:
  - `Belum check-in` jika belum ada `clock_in`
  - `Belum check-out` jika ada `clock_in` tetapi belum ada `clock_out`
  - `Foto belum lengkap` jika ada check-in/check-out tetapi salah satu foto belum tersedia
  - `Lengkap` jika check-in, check-out, foto masuk, dan foto keluar tersedia
- Frontend harus memakai label ini untuk:
  - badge status
  - filter status
  - export Excel
  - ringkasan data incomplete

#### 6. Export Excel
- Buat file baru `src/pages/master-karyawan/utils/exportReportAbsensiAloraExcel.js`.
- Utility export harus meniru pola `src/pages/absensi-ikm/utils/exportManajemenAbsensiExcel.js`, tetapi hanya memakai field yang tersedia pada report Alora.
- Tombol `Download Excel` di halaman baru harus memanggil utility ini dengan data hasil fetch aktif, bukan data statis.
- Nama worksheet, judul periode, dan filter aktif harus mencerminkan konteks `Report Absensi Alora`.

### Backend `backend-superapp`

#### 7. Controller baru report absensi Alora
- Buat file baru `controllers/Alora/attendanceAloraController.js`.
- Controller ini harus mengikuti pola organisasi `leavesAloraController.js`:
  - validasi query parameter
  - default periode
  - query ke `alora_mobile`
  - join enrichment dengan data karyawan dari database utama
  - response terstruktur untuk frontend
- Helper yang perlu ada di controller:
  - parser tanggal ISO
  - parser integer positif
  - parser daftar `employeeIds`
  - helper range cutoff 26-25
  - helper status label record
  - helper profil karyawan dari DB utama
  - helper pagination response
  - helper penyusunan employee options
- Controller utama yang perlu diexport:
  - `getAttendanceReport`

#### 8. Sumber data backend
- Query utama report diambil dari `tr_worker_attendance` pada database `alora_mobile` via `safeAloraMobileQuery`.
- Enrichment data karyawan diambil dari database utama via `safeQuery`, mengikuti pola `leavesAloraController.js`.
- Kolom yang perlu dipakai dari `tr_worker_attendance`:
  - `id`
  - `employee_id`
  - `attendance_date`
  - `clock_in`
  - `clock_out`
  - `foto_masuk_path`
  - `foto_keluar_path`
  - `clock_in_latitude`
  - `clock_in_longitude`
  - `clock_out_latitude`
  - `clock_out_longitude`
  - `clock_in_location_name`
  - `clock_out_location_name`
- Data karyawan utama minimal harus mengisi:
  - nama
  - employee code
  - jabatan
  - department

#### 9. Query behavior backend
- Endpoint harus mendukung:
  - filter rentang tanggal
  - filter employee tunggal atau multi employee
  - pencarian
  - filter hanya record incomplete
  - filter berdasarkan `status_label`
  - pagination
  - sorting default berdasarkan tanggal absensi terbaru
- Batas range tanggal perlu dikendalikan seperti pola report lain agar request tetap aman.
- Bila `status` dikirim, backend perlu memfilter berdasarkan hasil label status yang dihitung dari record.
- Employee summary dan summary global harus dihitung dari dataset periode aktif yang sama.

#### 10. URL foto absensi
- Karena data Alora menyimpan path file foto, controller harus menyiapkan URL yang bisa dipakai frontend untuk preview.
- Jika `backend-superapp` belum punya route aman untuk serve file absensi Alora, maka perlu dibuat route tambahan khusus file absensi Alora.
- Jika dipilih pola base URL environment seperti leave photo, maka perlu environment variable terpisah untuk foto absensi Alora.
- Keputusan implementasi harus tetap menjaga agar frontend menerima field siap pakai:
  - `check_in_photo_url`
  - `check_out_photo_url`

#### 11. Route backend baru
- Buat file baru `routes/Alora/attendanceAloraRoutes.js`.
- Tambahkan endpoint:
  - `GET /alora/attendance`
- Route harus memakai `requireAuth`.
- Mount route baru di `backend-superapp/index.js` berdekatan dengan route Alora lain agar konsisten:
  - `app.use("/alora/attendance", attendanceAloraRoutes);`

### Reuse dan alignment dengan referensi IKM

#### 12. Bagian `AbsensiManajemen.jsx` yang harus dijadikan patokan
- Pola komponen yang perlu dicerminkan di halaman baru:
  - stat cards
  - employee summary table
  - detail table
  - filter section
  - pagination bar
  - photo thumbnail preview
  - status badge
- Perilaku yang harus dicerminkan:
  - fetch saat filter berubah
  - filter status langsung mempengaruhi tampilan
  - employee summary ditampilkan di atas detail table
  - detail table memakai status badge yang sama secara perilaku
  - export mengambil data sesuai filter aktif
- Hal yang sengaja tidak ikut:
  - create manual attendance
  - update attendance
  - delete attendance

## Implementation Checklist
1. Inventarisasi exact dependency frontend untuk halaman baru dengan membandingkan `src/pages/absensi-ikm/components/AbsensiManajemen.jsx`, `src/pages/master-karyawan/index.jsx`, `src/App.jsx`, dan `src/pages/master-karyawan/components/PerizinanAlora.jsx`.
2. Inventarisasi exact dependency backend dengan membandingkan `controllers/Alora/leavesAloraController.js`, `routes/Alora/leavesAloraRoutes.js`, `backend-superapp/index.js`, dan pola query report pada `controllers/IKM/absensiManajemenIKMController.js`.
3. Buat controller baru `backend-superapp/controllers/Alora/attendanceAloraController.js`.
4. Tambahkan helper validasi query dan helper cutoff range 26-25 di controller baru.
5. Tambahkan helper lookup profil karyawan dari database utama di controller baru.
6. Tambahkan helper pembentukan URL foto absensi Alora di controller baru.
7. Tambahkan helper perhitungan `status_label` non-shift di controller baru.
8. Implementasikan query count total record report absensi Alora dari `tr_worker_attendance`.
9. Implementasikan query list record detail absensi Alora dengan pagination untuk periode aktif.
10. Implementasikan query summary global report absensi Alora untuk stat cards.
11. Implementasikan query summary per karyawan untuk tabel ringkasan karyawan.
12. Implementasikan query opsi karyawan untuk filter multi-select berdasarkan dataset/periode aktif yang sama.
13. Bentuk response akhir endpoint `getAttendanceReport` dengan blok `records`, `summary`, `employeeSummary`, `employeeOptions`, dan `pagination`.
14. Buat file route `backend-superapp/routes/Alora/attendanceAloraRoutes.js`.
15. Daftarkan endpoint `GET /alora/attendance` dengan `requireAuth`.
16. Mount route baru Alora attendance di `backend-superapp/index.js`.
17. Verifikasi apakah backend sudah punya cara aman untuk expose file foto absensi Alora; jika belum, tambahkan route/file-serving strategy yang konsisten dengan arsitektur repo.
18. Tambahkan import halaman baru di `frontend-superapp/src/App.jsx`.
19. Tambahkan child route `/master-karyawan/report-absensi` di wrapper route `MasterKaryawan`.
20. Ubah `frontend-superapp/src/pages/master-karyawan/index.jsx` untuk menambah sidebar item `Report Absensi`.
21. Pastikan `ActiveMenuTitle` di layout `master-karyawan` mengenali route report absensi baru.
22. Buat file halaman `frontend-superapp/src/pages/master-karyawan/components/ReportAbsensiAlora.jsx`.
23. Salin struktur layout visual dari `AbsensiManajemen.jsx` ke halaman baru dengan penyesuaian copy `Master Karyawan` dan `Report Absensi Alora`.
24. Tambahkan state filter periode cutoff/custom pada halaman baru.
25. Tambahkan state `search`, `statusFilter`, `selectedEmployeeIds`, dan `onlyIncomplete` pada halaman baru.
26. Tambahkan state `summary`, `employeeSummary`, `records`, `pagination`, `loading`, `error`, dan preview foto pada halaman baru.
27. Implementasikan fungsi fetch frontend ke endpoint `/alora/attendance` menggunakan query parameter yang sesuai.
28. Implementasikan sinkronisasi fetch saat filter, pagination, atau search berubah.
29. Tambahkan UI section filter yang mengikuti struktur dashboard manajemen IKM.
30. Tambahkan UI stat cards yang mengikuti struktur dashboard manajemen IKM dengan sumber data Alora.
31. Tambahkan UI tabel ringkasan per karyawan yang mengikuti struktur dashboard manajemen IKM.
32. Tambahkan UI tabel detail riwayat absensi yang mengikuti struktur dashboard manajemen IKM.
33. Tambahkan preview thumbnail foto masuk dan foto keluar dengan modal preview.
34. Tambahkan badge status menggunakan label yang sama dengan dashboard manajemen IKM.
35. Tambahkan pagination bar yang perilakunya setara dengan dashboard manajemen IKM.
36. Buat utility `frontend-superapp/src/pages/master-karyawan/utils/exportReportAbsensiAloraExcel.js`.
37. Hubungkan tombol `Download Excel` ke utility export baru dengan data sesuai filter aktif.
38. Pastikan halaman baru tidak menampilkan aksi create, edit, dan delete.
39. Lakukan pengecekan konsistensi copy, route label, dan istilah UI agar tetap berada dalam domain `Master Karyawan`.
40. Uji manual endpoint backend untuk kombinasi filter dasar: default cutoff, status, employeeIds, onlyIncomplete, dan pagination.
41. Uji manual halaman frontend untuk load awal, ganti filter, ganti halaman, preview foto, dan export Excel.
42. Jalankan pengecekan linter pada file frontend dan backend yang diubah setelah implementasi dilakukan.

## Risks / Catatan
- Struktur foto absensi Alora mungkin belum punya jalur URL siap pakai di `backend-superapp`, sehingga serving file bisa menjadi sub-pekerjaan tersendiri.
- Query summary, detail, dan employee options harus memakai definisi filter yang konsisten agar angka stat cards, ringkasan per karyawan, dan tabel detail tidak saling berbeda.
- Meniru `AbsensiManajemen.jsx` terlalu literal berisiko membawa logika create/edit/delete yang sebenarnya tidak dibutuhkan di tahap ini; implementasi nanti harus menahan scope hanya pada report.
- Jika data absensi Alora sangat besar, query employee summary dan employee options perlu dijaga agar tidak menyebabkan response berat pada periode panjang.
- Status `Foto belum lengkap` harus didefinisikan konsisten sejak backend agar frontend, export, dan filter tidak menghasilkan label yang berbeda-beda.
