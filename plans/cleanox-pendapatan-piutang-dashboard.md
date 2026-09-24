# Plan: Dashboard Pendapatan & Piutang Cleanox (mirror Waschen)

## Context
- Intent sebelumnya miss: Piutang/Riwayat dibangun sebagai **list transaksi**, padahal patokan user adalah **Waschen Sales Analytics** (`/dashboard`) — section **Pendapatan** & **Piutang**.
- Patokan: aturan filter, hitungan cutoff 26–25, KPI, chart, tabel, dan export **semirip mungkin**; sumber data **Cleanox POS** (`tr_transactions` + `mst_target_cleanox`), bukan Smartlink Waschen.
- Tambahan khusus Pendapatan Cleanox: di **bawah** dashboard, **rincian transaksi sudah lunas** + **bukti pembayaran (gambar/zoom)** — reuse pola yang sudah ada di Riwayat/bukti.
- Alternatif yang disetujui arahnya: **mirror UI/logic Waschen + API Cleanox baru** (bukan refactor `/dashboard` Waschen).

## Goal
- Menu **Pendapatan** (menggantikan posisi “Riwayat Transaksi”) = dashboard ala `PenjualanSection` + rincian lunas + bukti.
- Menu **Piutang** = dashboard ala `PiutangSection` (KPI aging, chart, daftar, export).
- Hitungan target/gap/achievement & aging mengikuti rumus Waschen sejauh data Cleanox memungkinkan.
- Export: Pendapatan → tabel performa (kolom seperti gambar); Piutang → daftar customer seperti `exportPiutangExcel`.

## Locked Business Rules

### Shared (sama Waschen)
| Rule | Value |
|------|--------|
| Periode default | Mode **Bulan**; cutoff billing **26 → 25** via `computeDateRange(asOfDate)` identik Waschen |
| Filter UI | Outlet multi-select + **Bulan / Rentang / Tahun** (pola `FilterBar` dashboard-sales) |
| Month filter | Kirim `asOfDate={YYYY-MM}-25` |
| Year filter | `startDate=(Y-1)-12-26`, `endDate=min(today, Y-12-25)` |
| Range filter | `startDate` + `endDate` |
| Cap asOf | Cap ke **kemarin** seperti `getPenjualan` (data hari ini bisa incomplete) |
| Shell app | Tetap **Cleanox Management** (bukan `/dashboard` Waschen) |
| Role | `appRoles["/cleanox-management-system"]` |
| Tip “30% Cleanox” | **Tidak ditampilkan** (data sudah 100% Cleanox) |

### Pendapatan Cleanox
| Rule | Value |
|------|--------|
| Menu label | `Pendapatan` |
| Description | `Dashboard omzet POS vs target` |
| Route | `/cleanox-management-system/pendapatan` |
| Redirect | `/cleanox-management-system/riwayat-transaksi` → `/pendapatan` (replace) |
| Icon | `HiOutlineChartBar` (atau `HiOutlineBanknotes` — lock: **HiOutlineChartBar**; Piutang tetap Banknotes) |
| Actual (capaian) | `SUM(final_amount)` dari `tr_transactions` di mana `payment_status = 'lunas'` AND `status <> 'Cancelled'` AND `DATE(service_date)` dalam `[dateStart, effectiveAsOf]` (atau range penuh jika mode range/year) |
| Target sumber | `mst_target_cleanox` untuk **tahun/bulan = bulan label cutoff** (= bulan dari `dateEnd` siklus, sama label “September” saat asOf 25 Sep) |
| Outlet filter vs target | Filter outlet membatasi baris target (`outlet IN (...)`); jika “Semua”, semua target bulan itu |
| Outlet vs actual POS | **`tr_transactions` tidak punya kolom outlet** → **actual selalu diatribusikan ke satu baris performa `"Cleanox"`**; baris target outlet Waschen lain tetap tampil (target mereka, `actual_sales = 0`) agar tabel mirip Waschen; KPI **Total Pendapatan** = total actual POS (bukan jumlah per-outlet yang double-count) |
| Target kumulatif / gap | Rumus sama Waschen: `target_kumulatif = (hari_berjalan/hari_siklus) * target_bulanan`; `gap = actual - target_kumulatif`; status Over Target / Tertinggal |
| Achievement % KPI | `(totalCapaian / totalTargetBulanan) * 100` (totalTarget = sum target baris terfilter) |
| Chart | Tren harian `SUM(final_amount)` lunas per `DATE(service_date)`; mode Tahun → agregat bulanan (sama FE Waschen) |
| Rincian bawah | Tabel transaksi **lunas** periode aktif: No Nota, Customer, Tgl Layanan, Kategori, Status, Pembayaran, **Bukti** (thumbnail + modal scroll-zoom), Nominal — reuse endpoint riwayat + komponen bukti |
| Export Pendapatan | Excel **Performa**: kolom Outlet, Target Bulanan, Target s.d Hari Ini, Capaian s.d Hari Ini, Gap, Status (+ meta periode); filename `Pendapatan_Cleanox_{dateStart}_{dateEnd}.xlsx` |
| Export rincian lunas | **Out of scope** di tombol utama (bukti gambar tidak masuk Excel); list di UI saja |

### Piutang Cleanox
| Rule | Value |
|------|--------|
| Menu label | `Piutang` (posisi tetap di bawah Pendapatan) |
| Description | `Receivables POS belum lunas` |
| Route | `/cleanox-management-system/piutang` (tetap) |
| Sumber baris | `tr_transactions` dengan `(payment_status = 'belum_lunas' OR NULL OR '')` AND `status <> 'Cancelled'` |
| Filter periode | `DATE(service_date)` dalam range cutoff/range/year (setara filter `tgl_terima` Waschen) |
| Mapping field | `no_nota` ← `transaction_no`; `customer_nama/telepon` ← customer_*; `tgl_terima` ← `DATE(service_date)`; `piutang` ← `final_amount`; `outlet` ← **`"Cleanox"`** (fixed; tidak ada outlet POS) |
| Jatuh tempo / aging | Tidak ada `tgl_selesai` POS → **lock: `tgl_selesai` (due) = `DATE(service_date)`** — status: `service_date < CURDATE()` → Terlambat; `=` → Jatuh Tempo; `>` → Belum Jatuh Tempo; aging = `DATEDIFF(CURDATE(), service_date)` jika ≥0 else 0 (identik cabang CASE Waschen) |
| KPI | Total Piutang, Belum Jatuh Tempo, Jatuh Tempo, Terlambat (sum nominal per status) |
| Chart | Bar “Piutang per Outlet” — v1 **satu bar Cleanox** (atau breakdown status; lock: **satu kategori outlet Cleanox** agar chart tidak kosong) |
| Tabel | (1) ringkas per outlet (1 row Cleanox); (2) Daftar Customer Piutang + search + status filter + pagination 10 + WA link |
| Export | Mirror `exportPiutangExcel`: title “Daftar Customer Piutang”, kolom `#`, Customer, No. Telepon, Outlet, No Nota, Tgl Terima, Jatuh Tempo, Aging, Jumlah Piutang, Status + footer summary; filename `piutang_cleanox_{dateStart}.xlsx`; style violet Waschen (semirip) |
| Bukti di Piutang | **Out of scope** (fokus receivables list seperti Waschen) |

### Menu Analisis (urutan lock)
1. KPI Produksi  
2. Target Cleanox  
3. **Pendapatan** (ex Riwayat)  
4. **Piutang**

## Detailed Specifications

### 1. Backend — `computeDateRange` shared helper (opsional file)
**File (baru, opsional):** `backend-superapp/utils/billingCycle.js`  
- Export `computeDateRange(asOfDate)` copy dari `salesController.js` agar Pendapatan/Piutang Cleanox tidak drift.  
- Jika tidak diekstrak: **duplikasi fungsi identik** di kedua controller Cleanox (lock: **duplikasi OK**, jangan refactor salesController).

### 2. Backend — Pendapatan
**File baru:** `backend-superapp/controllers/Cleanox/pendapatanCleanoxController.js`  
**Function:** `getPendapatanCleanox`

**Query params:** sama `getPenjualan`: `asOfDate` | `startDate`+`endDate`, `outlets` (ulang / array).

**Response shape (lock, mirror penjualan yang dipakai FE):**
```json
{
  "outlets": [
    {
      "outlet": "Cleanox",
      "target_bulanan": 0,
      "persen_target_kumulatif": 0,
      "target_kumulatif_sales": 0,
      "actual_sales": 0,
      "gap_nominal": 0
    }
  ],
  "trend": [{ "date": "YYYY-MM-DD", "sales": 0 }],
  "meta": { "asOfDate": "...", "dateStart": "...", "dateEnd": "..." }
}
```
- Tidak perlu `trendWaschen` / `cleanox_sales` (FE Cleanox tidak pakai adjustment 30%).
- Baris `outlets`:  
  - Satu row `outlet: "Cleanox"` dengan `actual_sales` = total lunas POS di periode efektif.  
  - Plus satu row per target `mst_target_cleanox` yang `outlet` tidak null dan lolos filter outlet, dengan `actual_sales: 0`, target dari DB.  
  - Jika ada target `outlet IS NULL`, gabungkan nominalnya ke row `"Cleanox"` (jangan dobel row null).  
- `target_bulanan` / kumulatif / gap dihitung di SQL atau JS dengan rumus Waschen (`DATEDIFF` prorata `as_of` vs `date_start`/`date_end`).  
- `trend`: group by `DATE(service_date)` sum `final_amount` (hanya lunas, non-Cancelled), rentang `dateStart`…`effectiveAsOf`.

**Routes:** `backend-superapp/routes/Cleanox/pendapatanCleanoxRoutes.js`  
- `GET /` → `getPendapatanCleanox` + `requireAuth`  
**Mount:** `index.js` → `app.use("/cleanox/pendapatan", ...)`

### 3. Backend — Piutang Cleanox (dashboard)
**File baru:** `backend-superapp/controllers/Cleanox/piutangDashboardCleanoxController.js`  
**Function:** `getPiutangDashboardCleanox`  
(Jangan bentrok nama dengan list lama; list riwayat tetap untuk bukti lunas.)

**Query params:** mirror `getPiutang`: `asOfDate` | range, `outlet` (abaikan untuk actual; terima untuk parity, no-op atau filter no-op).

**Response shape (mirror Waschen piutang FE):**
```json
{
  "piutang": [
    {
      "outlet": "Cleanox",
      "customer_nama": "",
      "customer_telepon": "",
      "no_nota": "",
      "tgl_terima": "YYYY-MM-DD",
      "tgl_selesai": "YYYY-MM-DD",
      "piutang": 0,
      "status": "Terlambat|Jatuh Tempo|Belum Jatuh Tempo",
      "aging": 0
    }
  ],
  "summary": {
    "total": 0,
    "belum_jatuh_tempo": 0,
    "jatuh_tempo": 0,
    "terlambat": 0
  },
  "per_outlet": [{ "outlet": "Cleanox", "total": 0 }],
  "meta": { "dateStart": "...", "dateEnd": "..." }
}
```
- Summary = sum `final_amount` per status bucket.  
- `per_outlet`: satu agregat Cleanox.

**Routes:** `routes/Cleanox/piutangDashboardCleanoxRoutes.js` → mount `app.use("/cleanox/piutang-dashboard", ...)`  
(Path lock: **`/cleanox/piutang-dashboard`** agar tidak bentrok jika ada route lain.)

### 4. Backend — Riwayat (tetap)
- Tetap `GET /cleanox/riwayat-transaksi` + payment-proofs untuk **rincian lunas** di page Pendapatan (`payment_status=lunas`).
- Tidak mengubah kontrak kecuali sudah ada hardening `belum_lunas`.

### 5. Frontend — shared filter (Cleanox)
**File baru:** `src/pages/cleanox-management/components/dashboard/CleanoxDashboardFilterBar.jsx`  
- Copy perilaku dari `dashboard-sales/components/FilterBar.jsx` (Bulan/Rentang/Tahun + outlet).  
- Outlet list: sama sumber Target Cleanox → `api("/outlets")` atau hardcode mirror `OUTLETS` Waschen **tanpa** entry yang tidak relevan; lock: **fetch `GET /outlets`** seperti `TargetCleanox.jsx`, plus opsi “Semua”.  
- State filter diangkat ke page parent (Pendapatan / Piutang).

**File baru (opsional utils):** `src/pages/cleanox-management/utils/dashboardFilters.js` — `buildPendapatanParams` / `buildPiutangParams` mirror `buildParams` di PenjualanSection / PiutangSection.

### 6. Frontend — Pendapatan page
**File baru:** `src/pages/cleanox-management/components/PendapatanCleanox.jsx`

Struktur page (urut):
1. `document.title = "Pendapatan Cleanox | Alora Group Indonesia"`
2. `CleanoxDashboardFilterBar`
3. KPI 4 cards — **tanpa** tip 30%; `actual = Number(o.actual_sales)` langsung (tidak `getAdjustedSales`)
4. AreaChart Recharts (copy layout `PenjualanSection`)
5. Tabel Performa Per Outlet (kolom sama Waschen; status Over Target / Tertinggal)
6. Tombol **Export Excel** → `exportPendapatanCleanoxExcel`
7. Section **Rincian Transaksi Lunas**: fetch `GET /cleanox/riwayat-transaksi?startDate&endDate&payment_status=lunas` (map `meta.dateStart` / `meta.asOfDate` atau end range); tabel + `AuthenticatedImage` + scroll-zoom (extract/reuse dari `RiwayatTransaksiCleanox.jsx` — lock: **copy komponen bukti yang dibutuhkan ke file shared** `components/PaymentProofViewer.jsx` atau inline copy minimal di Pendapatan; **jangan** biarkan Riwayat jadi dependency runtime jika file Riwayat dihapus)

**Hapus / redirect Riwayat:**
- Menu: ganti item Riwayat → Pendapatan.  
- `App.jsx`: route pendapatan; route riwayat `Navigate` ke pendapatan.  
- File `RiwayatTransaksiCleanox.jsx`: **tetap di repo** untuk referensi bukti selama extract, atau hapus setelah extract selesai — lock: **setelah extract bukti, biarkan file ada tapi tidak di-route** (tidak wajib delete).

### 7. Frontend — Piutang page (replace list)
**File:** rewrite `src/pages/cleanox-management/components/PiutangCleanox.jsx`  
- Hapus UI list-cutoff lama.  
- Implementasi mirror `PiutangSection.jsx` + `CleanoxDashboardFilterBar`.  
- API: `GET /cleanox/piutang-dashboard?...`  
- Export: `exportPiutangCleanoxExcel.js` (copy dari `dashboard-sales/utils/exportPiutangExcel.js`, sesuaikan filename/prefix Cleanox).

### 8. Frontend — export Pendapatan
**File baru:** `src/pages/cleanox-management/utils/exportPendapatanCleanoxExcel.js`  
- Lib: `xlsx-js-style` + `file-saver` (sudah ada di SuperApp).  
- Sheet `"Performa"`.  
- Meta: judul “Performa Pendapatan Cleanox”, periode, diekspor.  
- Header: Outlet | Target Bulanan | Target s.d Hari Ini | Capaian s.d Hari Ini | Gap | Status.  
- Row values dari array performa yang sama dengan tabel (setelah hitungan gap/status di FE).

### 9. Frontend — menu + routes
**`cleanox-management/index.jsx`:**
- Replace Riwayat item → Pendapatan (`to: .../pendapatan`, icon ChartBar, description locked).  
- Update Piutang description → `Receivables POS belum lunas`.

**`App.jsx`:**
- Import `PendapatanCleanox`.  
- `<Route path=".../pendapatan" element={<PendapatanCleanox />} />`  
- `<Route path=".../riwayat-transaksi" element={<Navigate to=".../pendapatan" replace />} />`  
- Piutang route tetap `PiutangCleanox` (konten baru).

### 10. Plan lama
- `plans/cleanox-piutang-menu.md`: anggap superseded oleh plan ini (catatan di Risks); tidak wajib rewrite checklist lama.

### 11. Out of scope
- Mengubah `/dashboard` Waschen / bagi hasil 30%.  
- Mark lunas / upload bukti dari SuperApp.  
- Aging custom SLA selain due = `service_date`.  
- Attribution actual POS ke outlet Waschen (butuh kolom outlet di POS — belum ada).  
- Export gambar bukti ke Excel.

## Implementation Checklist
1. [x] Tambah `pendapatanCleanoxController.js` (`getPendapatanCleanox`) + routes + mount `/cleanox/pendapatan`.
2. [x] Tambah `piutangDashboardCleanoxController.js` (`getPiutangDashboardCleanox`) + routes + mount `/cleanox/piutang-dashboard`.
3. [x] Buat `CleanoxDashboardFilterBar.jsx` (+ helper `buildParams` di `dashboardFilters.js`).
4. [x] Buat `exportPendapatanCleanoxExcel.js` (kolom Performa).
5. [x] Buat `exportPiutangCleanoxExcel.js` (mirror Waschen piutang export).
6. [x] Extract/reuse viewer bukti pembayaran ke helper yang bisa dipakai Pendapatan (dari pola Riwayat).
7. [x] Buat `PendapatanCleanox.jsx`: filter + KPI + chart + tabel performa + export + rincian lunas + bukti.
8. [x] Rewrite `PiutangCleanox.jsx` jadi dashboard (KPI + bar + tabel + search/status/paging + export).
9. [x] Update menu Analisis di `cleanox-management/index.jsx` (Pendapatan menggantikan Riwayat; Piutang description).
10. [x] Update `App.jsx`: route pendapatan, redirect riwayat → pendapatan, pastikan piutang mengarah ke page baru.
11. [x] Smoke-check: Pendapatan cutoff → KPI/chart/tabel/export performa + rincian lunas + zoom bukti; Piutang → KPI aging + list + export Excel; Waschen `/dashboard` tidak berubah.

## Risks / Catatan
- **Tidak ada outlet di POS:** tabel “Performa Per Outlet” akan didominasi actual di row Cleanox; row outlet Waschen dari target bisa tampak Tertinggal dengan capaian 0 — ini trade-off v1 yang disengaja sampai ada atribut outlet di transaksi.
- **Due date = service_date:** aging Piutang Cleanox lebih “ketat” dibanding Waschen (`tgl_selesai`); dokumentasikan ke user operasional.
- **Target bulan kalender vs cutoff:** mapping target memakai bulan `dateEnd` siklus (25); pastikan input Target Cleanox selaras dengan praktik Waschen.
- Plan `cleanox-piutang-menu.md` (list-only) **digantikan** arah produk oleh plan ini.
- Duplikasi UI dengan `dashboard-sales` diterima di v1 (tidak wajib shared package).
