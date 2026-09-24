# Plan: Filter Outlet → Layanan (Pendapatan & Piutang Cleanox)

## Context
- Dashboard Pendapatan/Piutang Cleanox sudah live; filter saat ini masih **Outlet** (multi-select dari `/outlets`) + tabel **Performa Per Outlet**.
- User: hilangkan outlet; ganti jadi **Layanan**: **Semua Layanan** | **Home Service** | **Take Home**.
- POS sudah punya `tr_transactions.service_mode` ENUM(`home_service`, `take_home`) DEFAULT `home_service` (sama pola KPI Cleanox).

## Goal
- Filter Outlet diganti filter **Layanan** (single-select, 3 opsi) di Pendapatan **dan** Piutang (shared `CleanoxDashboardFilterBar`).
- Actual / tren / rincian / piutang list ter-filter menurut `service_mode`.
- Label UI tabel/export diganti “Outlet” → “Layanan” di tempat yang relevan.

## Locked Business Rules

| Rule | Value |
|------|--------|
| Opsi filter | `all` = Semua Layanan; `home_service` = Home Service; `take_home` = Take Home |
| Default | `all` |
| UI kontrol | **Single-select** (dropdown atau segmented control) — **bukan** multi-checkbox outlet |
| Semantik `NULL`/empty `service_mode` | Dianggap **`home_service`** (sama `kpiProduksiController`) |
| Filter `all` | Tidak menambah WHERE service_mode |
| Filter `home_service` | `AND (t.service_mode = 'home_service' OR t.service_mode IS NULL OR t.service_mode = '')` |
| Filter `take_home` | `AND t.service_mode = 'take_home'` |
| Target (`mst_target_cleanox`) | **Tidak** dipecah per layanan (tidak ada kolom service_mode di target). Tetap **SUM target bulan cutoff** (semua baris target bulan itu, **tanpa** filter outlet). |
| Performa table | Judul **“Performa Per Layanan”**. Kolom pertama label **Layanan** (bukan Outlet). |
| Isi baris performa | **Satu baris** sesuai filter aktif: label `Semua Layanan` / `Home Service` / `Take Home`; `actual_sales` = omzet lunas terfilter; `target_*` = total target company bulan itu; gap/status seperti sekarang. |
| Chart / KPI | Mengikuti actual terfilter; Achievement = capaian terfilter / total target company. |
| Rincian lunas | Query riwayat + filter `service_mode` (param baru di list API **atau** filter client — lock: **param query `service_mode` di BE riwayat** agar konsisten). |
| Piutang | Filter layanan sama di API `/cleanox/piutang-dashboard`; chart/tabel “per outlet” → **“per Layanan”** (satu bar sesuai filter; jika `all` tetap satu agregat “Semua Layanan” atau dua bar HS+TH — lock: **satu bar label sesuai filter**, sama Pendapatan). |
| Export Pendapatan | Header kolom `Outlet` → `Layanan`; nilai = label layanan. |
| Export Piutang | Kolom `Outlet` → `Layanan`; nilai = label mode transaksi (`Home Service` / `Take Home`). |
| Query param API | Ganti `outlets` → **`service_mode`** (`all` \| `home_service` \| `take_home`). Hapus pemakaian `outlets` di pendapatan/piutang-dashboard Cleanox. |

## Detailed Specifications

### 1. Backend — `pendapatanCleanoxController.js`
- Baca `req.query.service_mode` (default `all`).
- Helper SQL clause (copy pola KPI):
  - `all` → `1=1`
  - `home_service` → `(service_mode = 'home_service' OR service_mode IS NULL OR service_mode = '')`
  - `take_home` → `service_mode = 'take_home'`
- Terapkan clause ke query **actual**, **trend**.
- Target: hapus filter `outlet IN (...)`; selalu `SUM` / list → **satu agregat** target bulan (`SUM(nominal)` semua outlet di bulan itu, termasuk null).
- Response `outlets` array (biarkan key JSON untuk minimal churn FE **atau** rename ke `rows` — lock: **tetap key `outlets`** di JSON agar FE ubah minimal, tapi field `outlet` diisi **label layanan** aktif).
- Satu elemen: `{ outlet: "<label layanan>", target_bulanan, persen_target_kumulatif, target_kumulatif_sales, actual_sales, gap_nominal }`.

### 2. Backend — `piutangDashboardCleanoxController.js`
- Param `service_mode` sama.
- WHERE + clause layanan.
- Field response `outlet` per row = label dari `service_mode` transaksi (`Home Service` / `Take Home`).
- `per_outlet`: satu agregat `{ outlet: <label filter>, total }` (jika `all` → label `Semua Layanan`).

### 3. Backend — `listRiwayatTransaksi` (rincian lunas)
**File:** `riwayatTransaksiCleanoxController.js`  
- Tambah query `service_mode` opsional dengan clause sama (abaikan jika kosong/`all`).
- Pendapatan FE kirim `service_mode` saat fetch rincian lunas.

### 4. Frontend — `dashboardFilters.js`
- Hapus `outlets` dari filter state helpers.
- Tambah `serviceMode` default `'all'`.
- `buildPendapatanParams` / `buildPiutangParams`: set `service_mode` (skip atau kirim `all` — lock: **kirim selalu** `service_mode=` nilai aktif).
- Export helper label: `SERVICE_MODE_OPTIONS = [{ value:'all', label:'Semua Layanan' }, { value:'home_service', label:'Home Service' }, { value:'take_home', label:'Take Home' }]`.

### 5. Frontend — `CleanoxDashboardFilterBar.jsx`
- Hapus `OutletCheckbox`, fetch `/outlets`, props `outlet`/`setOutlet`.
- Props baru: `serviceMode`, `setServiceMode`.
- UI: label **Layanan** + `<select>` 3 opsi (atau segmented control mirip Bulan/Rentang/Tahun).
- Tetap periode Bulan / Rentang / Tahun.

### 6. Frontend — `PendapatanCleanox.jsx` & `PiutangCleanox.jsx`
- State `serviceMode` menggantikan `outlet`.
- Pass ke FilterBar + buildParams.
- Teks: “Performa Per Outlet” → **“Performa Per Layanan”**; “Piutang per Outlet” / “Detail Piutang per Outlet” → **“… per Layanan”**.
- Export rows: field `outlet` tetap dipakai di util (berisi label layanan) — cukup ubah header Excel.

### 7. Frontend — export utils
- `exportPendapatanCleanoxExcel.js`: header `Outlet` → `Layanan`.
- `exportPiutangCleanoxExcel.js`: header `Outlet` → `Layanan`; `buildFilterLabel` tampilkan label layanan bukan daftar outlet.

### 8. Out of scope
- Target master per Home Service / Take Home (tetap target company).
- Mengubah Waschen `/dashboard` outlet filter.
- Multi-select layanan.

## Implementation Checklist
1. [x] Update `getPendapatanCleanox`: param `service_mode`, clause SQL, drop outlets; performa 1 row label layanan; target company sum.
2. [x] Update `getPiutangDashboardCleanox`: param + clause `service_mode`; label layanan di row/`per_outlet`.
3. [x] Update `listRiwayatTransaksi`: optional `service_mode` filter.
4. [x] Update `dashboardFilters.js` (options + buildParams tanpa outlets).
5. [x] Rewrite filter UI di `CleanoxDashboardFilterBar.jsx` → dropdown Layanan.
6. [x] Update `PendapatanCleanox.jsx` (state, labels, rincian lunas + `service_mode`).
7. [x] Update `PiutangCleanox.jsx` (state, labels chart/tabel).
8. [x] Update export Pendapatan & Piutang (header/filter label Layanan).
9. [x] Smoke-check: Semua / Home Service / Take Home mengubah KPI, chart, performa, rincian lunas, dan list piutang.

## Risks / Catatan
- Target tidak per layanan → memfilter Home Service saja tetap membandingkan ke **full** target company (achievement bisa tampak rendah). Dicatat sebagai perilaku v1 yang disengaja.
- Key JSON `outlets` / field `outlet` tetap dipakai secara internal berisi label layanan (hindari rename API besar); hanya label UI/Excel yang “Layanan”.
