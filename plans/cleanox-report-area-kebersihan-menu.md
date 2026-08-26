# Plan: Master Area → Report Area Kebersihan (Menu Karyawan)

## Context
- Item sidebar **Master Area** saat ini ada di **Menu Master** (`/cleanox-management-system/master-area`).
- Halaman list: `MasterAreaKebersihanCleanox.jsx` — judul hero/document title masih “Master Area Kebersihan”.
- Detail file `MasterAreaKebersihanDetailCleanox.jsx` masih berisi copy “Master Area”; route detail di `App.jsx` sudah di-redirect ke list.
- Backend API tetap `/cleanox/kebersihan` — **tidak perlu diubah** (ini report monitoring, bukan CRUD master area entity).
- Permintaan: rename menjadi **Report Area Kebersihan**, dan pindahkan ke **Menu Karyawan** (bukan Menu Master).

## Goal
- Label menu: **Report Area Kebersihan**.
- Posisi menu: di **Menu Karyawan** (setelah Cuti & Perizinan, atau setelah Absensi — **pilih: setelah Perizinan** sebagai item terakhir Menu Karyawan).
- Menu Master hanya tersisa: Master Kategori, Master Service.
- Judul UI halaman (hero + `document.title` + topbar via menu label) mengikuti nama baru.
- Path URL diselaraskan: `/cleanox-management-system/report-area-kebersihan` + redirect dari path lama `/master-area`.

## Detailed Specifications

### A. Sidebar — `src/pages/cleanox-management/index.jsx`

1. Pindahkan item area dari group Menu Master ke Menu Karyawan.
2. Ubah fields item:
   - `to`: `/cleanox-management-system/report-area-kebersihan`
   - `label`: `Report Area Kebersihan`
   - `description`: `Laporan kebersihan pagi & sore`
   - `icon`: tetap `HiOutlineMapPin` (atau `HiOutlineClipboardDocumentList` jika ingin beda dari map pin — **pilih tetap MapPin**)
   - `end`: `false`
3. Urutan Menu Karyawan setelah perubahan:
   1. Data Karyawan
   2. Absensi Karyawan
   3. Cuti & Perizinan
   4. **Report Area Kebersihan**
4. Menu Master tersisa: Master Kategori, Master Service saja.

`ActiveMenuTitle` memakai `ALL_MENU_ITEMS` — otomatis ikut label baru selama item ada di `MENU_GROUPS`.

### B. Routing — `src/App.jsx`

1. Ubah route aktif:
   - `path="/cleanox-management-system/report-area-kebersihan"` → `<MasterAreaKebersihanCleanox />`
2. Redirect legacy (agar bookmark/link lama tidak putus):
   - `/cleanox-management-system/master-area` → `<Navigate to="/cleanox-management-system/report-area-kebersihan" replace />`
   - `/cleanox-management-system/master-area/:employeeId` → redirect ke path baru yang sama
   - Opsional: `/cleanox-management-system/report-area-kebersihan/:employeeId` → redirect ke list (mirror pola absensi)
3. Import component **tetap** dari file existing `MasterAreaKebersihanCleanox` (tidak wajib rename file di tahap ini).

### C. Page copy — list

#### File: `src/pages/cleanox-management/components/MasterAreaKebersihanCleanox.jsx`
- `document.title` → `Report Area Kebersihan | Alora Group Indonesia`
- Hero `h1` → `Report Area Kebersihan`
- Subtitle boleh tetap tentang riwayat kebersihan pagi & sore (sesuaikan kata “report” jika perlu, tanpa ubah logic fetch).

### D. Page copy — detail (jika file masih ada)

#### File: `src/pages/cleanox-management/components/MasterAreaKebersihanDetailCleanox.jsx`
- Update string UI yang masih “Master Area”:
  - `document.title`
  - Tombol kembali → navigate ke `/cleanox-management-system/report-area-kebersihan`, label `Kembali ke Report Area Kebersihan`
  - Hero title jika masih “Detail Master Area” → `Detail Report Area Kebersihan`
- Tidak menghidupkan ulang route detail jika sudah di-redirect; cukup sync copy agar tidak stale.

### E. Tidak di-scope
- Rename file component / controller backend (`masterAreaKebersihan*`)
- Ubah API path `/cleanox/kebersihan`
- Ubah logic filter/tabel/foto
- CRUD master daftar area (`mst_kebersihan_areas`) — ini report, bukan master data

## Implementation Checklist
1. Di `index.jsx`, pindahkan item area ke **Menu Karyawan** (setelah Perizinan); set `label` = `Report Area Kebersihan`, `description` = `Laporan kebersihan pagi & sore`, `to` = `/cleanox-management-system/report-area-kebersihan`.
2. Di `index.jsx`, hapus item Master Area dari **Menu Master** (sisakan Category + Service).
3. Di `App.jsx`, daftarkan route baru `/cleanox-management-system/report-area-kebersihan` ke `MasterAreaKebersihanCleanox`.
4. Di `App.jsx`, tambah redirect dari `/master-area` dan `/master-area/:employeeId` ke path report baru; tambah redirect `report-area-kebersihan/:employeeId` → list.
5. Di `MasterAreaKebersihanCleanox.jsx`, update `document.title` + hero title menjadi Report Area Kebersihan.
6. Di `MasterAreaKebersihanDetailCleanox.jsx`, update title/copy/navigate path ke report-area-kebersihan.
7. Verifikasi manual: sidebar Menu Karyawan berisi 4 item dengan label baru; Menu Master tanpa Master Area; topbar title benar; buka path lama `/master-area` redirect ke path baru; data report tetap load.

## Risks / Catatan
- Hanya perubahan navigasi/label; risiko fungsional rendah.
- Link eksternal/bookmark ke `/master-area` ditangani redirect.
- File/component tetap bernama `MasterArea*` sementara — OK; rename file bisa follow-up terpisah jika diinginkan.
