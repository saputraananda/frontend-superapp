# Plan: Hilangkan Penilaian Foto (Absensi + Kebersihan) — View-Only

## Context
- Admin Cleanox saat ini bisa menilai foto grooming (absensi) dan foto area kebersihan (Master Area) dengan score + catatan.
- Upload foto tetap terjadi di mobile / tabel foto; penilaian tersimpan di tabel review terpisah.
- Keputusan: **tidak ada penilaian lagi** — admin hanya melihat foto. **Database tidak diubah** (tidak drop/migrate tabel review); fitur penilaian cukup tidak dipakai di UI (dan tidak dipanggil dari FE).

## Goal
- Absensi: klik 4 foto grooming = **preview saja** (sama pola Foto Out); hilangkan ✓/✕, badge review, dan call `PUT .../reviews`.
- Kebersihan (Master Area): tetap bisa lihat riwayat + foto area; hilangkan form score, alasan, tombol simpan penilaian, badge “Belum/Sebagian/Selesai” berbasis review.
- Sidebar copy tidak menyebut “nilai” foto.
- Tidak ada perubahan schema / migrasi Prisma / drop table.

## Detailed Specifications

### Asumsi (dari RESEARCH + instruksi user)
- Halaman Master Area **tetap ada** (lihat foto), bukan dihapus dari menu.
- Endpoint review di backend **boleh tetap ada** (idle); FE tidak memanggil.
- Mobile: tidak wajib diubah di checklist ini (upload tetap; status review kosong = tidak dinilai). Opsional follow-up jika perlu bersihkan teks “belum dinilai”.

### A. Absensi — `AbsensiKaryawanCleanox.jsx`

1. **Hapus komponen / state penilaian**
   - Hapus `ReviewBadgeOverlay`, `PhotoReviewModal`, state `reviewModal`, `handleReviewSaved`.
   - Hapus prop `reviewScore` dari `PhotoThumb` (atau biarkan unused → lebih baik hapus).

2. **Klik foto grooming = preview only**
   - Pakai modal viewer yang sama dengan Foto Out (`PhotoViewerModal` / set `viewerOut` digeneralisasi jadi `photoViewer`).
   - Desktop + mobile: `onOpen` → buka viewer dengan `{ url: photo.url, label: photo.label }` — **tidak** buka `PhotoReviewModal`.

3. **Copy**
   - Hero/subtitle: hilangkan frasa “nilai 4 foto grooming…” → misalnya “Rekap & monitoring absensi — lihat foto grooming check-in.”

4. **Tidak ubah**
   - Filter tanggal, Semua Status, Aksi Edit/Delete, kolom Foto Out, status Belum check-out, dll.

### B. Sidebar — `cleanox-management/index.jsx`
- Absensi Karyawan description: dari “nilai foto grooming” → “Lihat absensi dan foto grooming”.
- Master Area description: dari “Nilai kebersihan area pekerja” → “Lihat foto kebersihan area pekerja”.

### C. Master Area list — `MasterAreaKebersihanCleanox.jsx`
1. Hapus/abaikan UI yang bergantung penilaian:
   - Teks “X hari menunggu penilaian lengkap”
   - `ReviewBadge` status Belum/Sebagian/Selesai (atau ganti indikator sederhana: ada/tidak ada laporan foto, tanpa review)
2. Hero/subtitle: “lihat foto kebersihan…”, bukan “nilai foto”.
3. Navigasi ke detail tetap (untuk lihat foto per tanggal).

### D. Master Area detail — `MasterAreaKebersihanDetailCleanox.jsx`
1. Di panel expand tanggal (`AttendancePhotoList` equivalent / area list):
   - **Hapus**: tombol score Sesuai/Cukup/Tidak, textarea alasan, tombol “Simpan penilaian hari ini”, badge hasil review, teks “Terakhir dinilai…”, state `draft`/`saving` review, call `PUT /cleanox/kebersihan/reports/:id/reviews`.
   - **Pertahankan**: thumbnail foto area, klik → lightbox/preview, label nama area, empty state “Belum ada foto”.
2. Di baris tanggal: hapus `ReviewBadge` + “x/y area” berbasis `reviewed_count`; ganti opsional dengan “x foto tersedia” (count `has_photo`) jika mudah, atau cukup tanggal + check-in info yang sudah ada.
3. Copy halaman: “klik tanggal untuk melihat foto”, bukan “untuk menilai”.

### E. Backend / Database — **tidak diubah di checklist ini**
- Tidak drop `tr_worker_attendance_photo_reviews` / `tr_worker_kebersihan_area_reviews`.
- Tidak hapus route `PUT .../reviews` (biarkan idle).
- Tidak wajib ubah response list (FE abaikan field `review`); opsional nanti membersihkan join review.

### F. Di luar scope
- Migrasi / hapus kolom / hapus tabel review
- Hapus menu Master Area dari sidebar
- Ubah flow upload mobile
- KPI / scoring produksi yang tidak terkait foto review

## Implementation Checklist
1. Di `AbsensiKaryawanCleanox.jsx`: hapus `ReviewBadgeOverlay`, `PhotoReviewModal`, state `reviewModal`, dan `handleReviewSaved`.
2. Di file yang sama: generalisasi viewer state (mis. `photoViewer`) untuk Foto Out dan Foto Grooming; wire klik 4 foto grooming ke preview-only.
3. Di file yang sama: hapus prop/pemakaian `reviewScore` pada `PhotoThumb`; update subtitle hero tanpa kata “nilai”.
4. Di `cleanox-management/index.jsx`: update description Absensi Karyawan dan Master Area (tanpa “nilai”).
5. Di `MasterAreaKebersihanCleanox.jsx`: hapus ringkasan pending penilaian + `ReviewBadge` review_summary; sesuaikan copy hero/list agar view-only.
6. Di `MasterAreaKebersihanDetailCleanox.jsx`: strip seluruh UI/logic penilaian (draft score, save reviews, badge review, tombol simpan); sisakan list foto + lightbox.
7. Di detail kebersihan: update copy baris tanggal / header agar “lihat foto”, bukan “menilai”; sesuaikan indikator reviewed_count jika masih tampil.
8. Verifikasi manual: absensi klik foto = preview tanpa ✓/✕; Master Area buka detail = foto saja tanpa form score; tidak ada request `.../reviews` di Network; DB tidak ada migrasi baru.

## Risks / Catatan
- Data review lama tetap di DB tetapi tidak ditampilkan — sesuai permintaan “gadipakai”.
- Endpoint review tetap bisa dipanggil manual (API) — aman untuk idle; akses admin UI sudah tertutup.
- Jika nanti ingin hapus tabel review, itu scope terpisah + migrasi eksplisit.
