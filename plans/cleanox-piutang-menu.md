# Plan: Menu Piutang Cleanox (SuperApp)

## Context
- Sudah ada **Riwayat Transaksi** (POS, cutoff, list, bukti, export) di Menu Analisis.
- User ingin menu **Piutang** di sidebar **tepat di bawah** Riwayat Transaksi.
- Fokus: transaksi POS yang masih **belum lunas**; **Cancelled tidak ikut**.
- Cutoff & UI mirip Riwayat, tapi scoped ke piutang saja.

## Goal
- Menu + page `Piutang` terpisah.
- List hanya `payment_status = belum_lunas` + exclude `Cancelled`.
- Periode cutoff/today/custom sama pola Riwayat (`service_date`).
- UI mirip Riwayat (hero, filter, stats, tabel, bukti zoom, export Excel 6 kolom).

## Locked Business Rules

| Rule | Value |
|------|--------|
| Menu posisi | Menu Analisis, **langsung di bawah** “Riwayat Transaksi” |
| Route | `/cleanox-management-system/piutang` |
| Label | `Piutang` |
| Description | `Transaksi POS belum lunas per cutoff` |
| Icon | `HiOutlineBanknotes` (atau `HiOutlineCurrencyDollar` — lock: **HiOutlineBanknotes**) |
| Sumber data | `tr_transactions` POS only (sama API layer Riwayat) |
| Filter pembayaran | **Fixed** `belum_lunas` (tidak ada dropdown “Lunas / Semua”) |
| Status Cancelled | **Selalu exclude** (`status <> 'Cancelled'`); dropdown status opsional untuk Scheduled/Assigned/In_Progress/Completed saja, tanpa opsi Cancelled |
| Periode | Mode cutoff (default) / today / custom; filter `DATE(service_date)` |
| Kolom tabel | Sama Riwayat: No Nota, Customer, Tgl Layanan, Kategori, Status, Pembayaran (selalu badge Belum lunas), Bukti, Nominal |
| Bukti | Semua thumbnail + modal scroll-zoom (reuse pola Riwayat) |
| Stats | Total piutang (count), Total nominal, (opsional hilangkan card Lunas/Belum lunas terpisah karena semua belum lunas) — lock: **3 card**: Total Transaksi, Total Nominal Piutang, Rata-rata Nominal (atau tanpa rata-rata: **2 card** Total Transaksi + Total Nominal) → lock final: **2 card** saja |
| Export Excel | Ya; kolom sama (No–NOMINAL); filename `Piutang_Cleanox_POS_${start}_${end}.xlsx`; judul sheet/meta “Piutang” |
| Upload/edit pelunasan dari SuperApp | **Out of scope** (read-only list) |
| Role | Sama `appRoles["/cleanox-management-system"]` |

## Detailed Specifications

### 1. Backend — reuse API Riwayat
**Tidak wajib endpoint baru** jika Riwayat sudah support:
- `GET /cleanox/riwayat-transaksi?startDate&endDate&payment_status=belum_lunas`
- Frontend Piutang **selalu** mengirim `payment_status=belum_lunas`.
- Pastikan tanpa query `status`, Cancelled sudah ter-exclude (sudah ada di `listRiwayatTransaksi`).

**Opsional hardening (lock: lakukan):**
- Jika `payment_status=belum_lunas`, treat `NULL` / empty payment_status as belum lunas:
  ```sql
  AND (t.payment_status = 'belum_lunas' OR t.payment_status IS NULL OR t.payment_status = '')
  ```
  Hanya saat filter `belum_lunas` (jangan ubah perilaku `lunas`).

Bukti + serve path: tetap pakai endpoint yang sudah ada (`payment_proofs` + `/payment-proofs/:filename`).

### 2. Frontend — page baru
**File:** `src/pages/cleanox-management/components/PiutangCleanox.jsx`

- Copy struktur dari `RiwayatTransaksiCleanox.jsx` lalu sesuaikan:
  - Title: `Piutang Cleanox` / subtitle fokus belum lunas.
  - `document.title = "Piutang Cleanox | Alora Group Indonesia"`.
  - Hapus UI filter pembayaran (dropdown Lunas/Belum/Semua).
  - Fetch selalu `payment_status=belum_lunas`.
  - StatCard: hanya Total Transaksi + Total Nominal (dari `summary.total_transactions` / `summary.total_amount`).
  - Tabel + bukti zoom: sama.
  - Export: panggil util export dengan title/filename Piutang (lihat §3).
  - Chip periode + cutoff helpers: sama.

### 3. Frontend — export
**Opsi A (lock):** Extend `exportRiwayatTransaksiCleanoxExcel.js` agar menerima optional:
- `title` (default Daily Report…)
- `filePrefix` (default `Daily_Report_Cleanox_POS`)
- `sheetName` (default `Riwayat`)

Piutang memanggil:
```js
exportRiwayatTransaksiCleanoxExcel({
  records,
  periodLabel,
  activePeriod,
  title: "Piutang Cleanox — Transaksi Belum Lunas",
  filePrefix: "Piutang_Cleanox_POS",
  sheetName: "Piutang",
});
```

### 4. Frontend — menu + route
**`index.jsx` (cleanox-management):**
- Setelah item Riwayat Transaksi, insert:
  ```js
  {
    to: "/cleanox-management-system/piutang",
    icon: HiOutlineBanknotes,
    label: "Piutang",
    description: "Transaksi POS belum lunas per cutoff",
    end: true,
  }
  ```
- Pastikan `HiOutlineBanknotes` sudah di-import (sudah dipakai di menu Kasbon — cek; jika bentrok nama di group lain, import sekali di top).

**`App.jsx`:**
- Import `PiutangCleanox`.
- Route: `<Route path="/cleanox-management-system/piutang" element={<PiutangCleanox />} />` (sebelum `/:id`).

### 5. Out of scope
- Mark lunas / ubah pembayaran dari SuperApp
- Aging days / jatuh tempo
- Smartlink
- Notifikasi WA penagihan

## Implementation Checklist
1. [x] Harden filter `belum_lunas` di `listRiwayatTransaksi` agar `NULL`/empty dihitung belum lunas.
2. [x] Extend `exportRiwayatTransaksiCleanoxExcel.js` (opsional `title` / `filePrefix` / `sheetName`).
3. [x] Buat `PiutangCleanox.jsx` (UI mirip Riwayat, fixed belum lunas, 2 stat cards, tanpa dropdown pembayaran).
4. [x] Tambah menu Piutang di bawah Riwayat di `cleanox-management/index.jsx`.
5. [x] Daftarkan route di `App.jsx`.
6. [x] Smoke-check: sidebar Piutang → cutoff → hanya belum lunas, Cancelled tidak muncul; bukti zoom; export filename Piutang_*.

## Risks / Catatan
- Duplikasi UI dengan Riwayat: acceptable untuk v1; extract shared component **tidak** wajib di plan ini.
- Data “belum lunas” dengan `payment_status` null historis: ditangani hardening SQL di checklist 1.
