# Plan: Riwayat Transaksi POS di SuperApp + Export Daily Report

## Context
- Cleanox Only sudah punya **Riwayat Transaksi** (`PosTransactionsPage` + `GET /pos-transactions` dari `v_transactions_unified`: POS + Smartlink).
- SuperApp **belum** punya menu/API riwayat transaksi POS.
- Template referensi isi kolom: `DAILY REPORT - CLEANOX 2026.xlsx` (TANGGAL, NO NOTA, NAMA, KATEGORI, NOMINAL, REKON…, SUMMARY, REKONSILIASI).
- Keputusan user:
  - Tampil di **SuperApp** dengan filter **cutoff** (sedikit beda dari Cleanox Only).
  - **Fokus POS saja** (tanpa Smartlink) untuk fase ini.
  - **Isi kolom** mengikuti template Daily Report; **warna/style Excel** mengikuti SuperApp (`1b3459` / `12233c` seperti export absensi/makan siang), **bukan** warna peach template.
  - **NO NOTA** = `transaction_no` (bukan 6-digit manual).

## Goal
- Menu SuperApp Cleanox: daftar riwayat transaksi **POS** dengan filter periode cutoff/today/custom.
- Tombol **Download Excel** menghasilkan file berkolom seperti Daily Report, styled SuperApp.
- Query hanya `tr_transactions` (POS), bukan arsip Smartlink.

## Locked Business Rules

| Rule | Value |
|------|--------|
| Sumber data | `tr_transactions` (+ join payment method / customer snapshot) — **POS only** |
| Smartlink / unified view | Out of scope fase ini |
| Filter periode UI | Mode **cutoff** (default, start day 26), **today**, **custom** — pola Absensi Cleanox |
| Field tanggal filter | `DATE(service_date)` dalam `[startDate, endDate]` |
| Status default | Exclude `Cancelled`; filter status opsional di UI |
| NO NOTA | `transaction_no` apa adanya (mis. `CLX…`) |
| TANGGAL (kolom Excel & sort) | `service_date` (tanggal layanan) |
| TANGGAL TRANSFER | `payment_settled_date` jika ada, else kosong |
| NAMA | `customer_name` |
| KATEGORI | Map `mst_payment_method.group`: `Tunai` → `TUNAI`; `BCA` / `EDC` / `QRIS` → `TF BANK`; belum ada metode → `-` |
| NOMINAL / REVENUE | `final_amount` (number); jika `pricing_pending` tampilkan 0 + catatan di REMARKS |
| GAP | `0` (belum ada data rekon bank) |
| REKON CODE / REKON REKENING | Kosong `""` (belum ada di POS) |
| REMARKS | `notes` transaksi; jika pricing pending prepend `"Pending harga. "` |
| PERSENTASE | `0` (atau blank string `""` — lock: number `0`) |
| Blok SUMMARY (kanan) | Per tanggal unik dalam periode: tanggal + sum `final_amount` hari itu |
| Blok REKONSILIASI | Per tanggal: DATA TUNAI = sum KATEGORI TUNAI; DATA NON TUNAI = sum TF BANK; GAP = 0 |
| PENGELUARAN APPROV / AKTUAL / SETORAN TUNAI / SELISIH | Kosong (tidak ada data POS) |
| Sheet Excel | Satu sheet: nama = label periode singkat (mis. `Cutoff_Sep_2026` atau `Riwayat`) |
| Style Excel | Palette SuperApp: `headerBg 1b3459`, `titleBg 12233c`, `metaBg E8EEF5`, `altRowBg F1F5F9` — **jangan** copy FCE5CD/FFE599/FFFF00 dari template |
| Detail transaksi / edit pembayaran | Out of scope (list + export saja) |
| Role akses | Sama `appRoles["/cleanox-management-system"]` |

### Mapping kolom Excel (urutan kiri → kanan)

| Col | Header | Sumber |
|-----|--------|--------|
| A | (opsional kosong / no urut) | Index 1..n — lock: **No** urut mulai 1 |
| B | TANGGAL | `service_date` formatted `DD/MM/YYYY` |
| C | NO NOTA | `transaction_no` |
| D | NAMA | `customer_name` |
| E | KATEGORI | mapped payment group |
| F | NOMINAL | `final_amount` |
| G | REKON CODE | `""` |
| H | REVENUE | `final_amount` |
| I | GAP | `0` |
| J | REKON REKENING | `""` |
| K | TANGGAL TRANSFER | `payment_settled_date` `DD/MM/YY` atau `""` |
| L | REMARKS | notes / pending |
| M | PERSENTASE | `0` |
| N–O | SUMMARY | tanggal + total harian (sejajar baris 1..n tanggal unik, bukan per transaksi) |
| R–U | REKONSILIASI | tanggal, tunai, non tunai, gap |
| V–Y | PENGELUARAN… | kosong header tetap ada |

Layout: header row 1; data transaksi mulai row 2 di kolom A–M; blok SUMMARY/REKONSILIASI di kolom N+ mulai row 1 header + row 2+ aggregate (pola template JULY).

## Detailed Specifications

### 1. Backend — `backend-superapp`

**File baru:** `controllers/Cleanox/riwayatTransaksiCleanoxController.js`

**Exports:**
- `listRiwayatTransaksi(req, res)`
- Query params: `startDate`, `endDate` (wajib `YYYY-MM-DD`), `search` (opsional), `status` (opsional), `payment_status` (opsional: `lunas` \| `belum_lunas`)
- Validasi: tanggal valid; `endDate >= startDate`
- SQL (konsep):

```sql
SELECT
  t.id,
  t.transaction_no,
  t.customer_name,
  t.customer_phone,
  t.service_date,
  t.final_amount,
  t.pricing_pending,
  t.status,
  t.payment_status,
  DATE_FORMAT(t.payment_settled_date, '%Y-%m-%d') AS payment_settled_date,
  t.notes,
  t.created_at,
  pm.`group` AS payment_method_group,
  pm.label AS payment_method_label
FROM tr_transactions t
LEFT JOIN mst_payment_method pm ON pm.id = t.payment_method_id
WHERE DATE(t.service_date) >= ?
  AND DATE(t.service_date) <= ?
  AND t.status <> 'Cancelled'   -- kecuali filter status eksplisit mengoverride
ORDER BY t.service_date ASC, t.transaction_no ASC
```

- Jika `status` query diisi: filter `t.status = ?` (boleh termasuk Cancelled jika user pilih).
- Jika `search`: LIKE pada `transaction_no`, `customer_name`, `customer_phone`.
- Jika `payment_status`: filter `t.payment_status`.
- Response:

```js
{
  data: [ /* rows normalized numbers/booleans */ ],
  summary: {
    total_transactions: number,
    total_amount: number,
    lunas_count: number,
    belum_lunas_count: number,
    tunai_amount: number,
    non_tunai_amount: number,
  }
}
```

- Helper lokal `mapKategori(group)` → `TUNAI` \| `TF BANK` \| `-`.
- Pakai `safeCleanoxQuery` dari `db/pool.js`.
- Tanpa pagination server dulu: return semua baris dalam periode (cutoff ≤ ~1 bulan; jika > 5000 rows, tetap return tapi frontend boleh warn — lock: no pagination v1).

**File baru:** `routes/Cleanox/riwayatTransaksiCleanoxRoutes.js`
- `GET /` → `requireAuth`, `listRiwayatTransaksi`

**Ubah:** `index.js`
- `import riwayatTransaksiCleanoxRoutes from "./routes/Cleanox/riwayatTransaksiCleanoxRoutes.js"`
- `app.use("/cleanox/riwayat-transaksi", riwayatTransaksiCleanoxRoutes)`

### 2. Frontend — `frontend-superapp`

**File baru:** `src/pages/cleanox-management/components/RiwayatTransaksiCleanox.jsx`

UI pola Absensi/Makan Siang Cleanox:
- Container `min-h-full bg-slate-50`
- Hero `rounded-3xl` gradient `from-[#1b3459] via-[#12233c] to-[#0f1f37]`
  - Judul: `Riwayat Transaksi POS`
  - Subtitle: fokus transaksi POS per periode cutoff; export Daily Report
  - Chip periode aktif
- Section filter: mode cutoff / today / custom; search; status; payment status; Reset
- Helper cutoff: copy `getDefaultCutoffSelection` / `toDateInput` dari Absensi (boleh inline duplicate kecil, tidak wajib extract shared util)
- StatCard: Total Transaksi, Total Nominal, Lunas, Belum Lunas (dari `summary` API)
- Tabel list: No Nota, Customer, Tgl Layanan, Kategori, Status, Payment, Nominal
- Tombol **Download Excel** (`HiOutlineArrowDownTray`) memanggil util export dengan `data` + `periodLabel` + `activePeriod`
- `document.title = "Riwayat Transaksi POS | Alora Group Indonesia"`
- Fetch: `api(\`/cleanox/riwayat-transaksi?${qs}\`)` saat `activePeriod` berubah

**File baru:** `src/pages/cleanox-management/utils/exportRiwayatTransaksiCleanoxExcel.js`
- Import `xlsx-js-style`, `file-saver`
- Palette C sama seperti `exportMakanSiangCleanoxExcel.js` (`1b3459`, `12233c`, …)
- Title row: `Daily Report Cleanox — Riwayat Transaksi POS`
- Meta row: periode label, generated at
- Header kolom sesuai mapping di atas
- Data rows dari records
- Blok SUMMARY & REKONSILIASI dihitung client-side dari records (group by tanggal layanan)
- Filename: `Daily_Report_Cleanox_POS_${start}_${end}.xlsx`
- Function export: `exportRiwayatTransaksiCleanoxExcel({ records, periodLabel, activePeriod })`

**Ubah:** `src/pages/cleanox-management/index.jsx`
- Tambah item di **Menu Analisis**:
  - `to: "/cleanox-management-system/riwayat-transaksi"`
  - icon: `HiOutlineClipboardDocumentList` atau `HiOutlineBanknotes` (pakai `HiOutlineDocumentText` / `HiOutlineQueueList` — lock: `HiOutlineDocumentText`)
  - label: `Riwayat Transaksi`
  - description: `Riwayat POS & export Daily Report`

**Ubah:** `src/App.jsx`
- Import `RiwayatTransaksiCleanox`
- Route: `<Route path="/cleanox-management-system/riwayat-transaksi" element={<RiwayatTransaksiCleanox />} />` di dalam layout Cleanox Management (sejajar absensi/lembur)

### 3. Out of scope
- Integrasi Smartlink / `v_transactions_unified`
- Input/edit REKON CODE, GAP bank, pengeluaran, setoran tunai
- Deep-link ke Cleanox Only detail transaksi
- Multi-sheet per bulan seperti file Excel manual 2026
- Warna header peach/kuning template
- Perubahan cleanox-app POS UI

## Implementation Checklist
1. [x] Buat `backend-superapp/controllers/Cleanox/riwayatTransaksiCleanoxController.js` dengan `listRiwayatTransaksi`, mapping kategori, summary aggregates, query POS-only by `service_date` range.
2. [x] Buat `backend-superapp/routes/Cleanox/riwayatTransaksiCleanoxRoutes.js` — `GET /` + `requireAuth`.
3. [x] Mount route di `backend-superapp/index.js` sebagai `/cleanox/riwayat-transaksi`.
4. [x] Buat `frontend-superapp/src/pages/cleanox-management/utils/exportRiwayatTransaksiCleanoxExcel.js` — kolom Daily Report + style SuperApp + SUMMARY/REKONSILIASI computed.
5. [x] Buat `frontend-superapp/src/pages/cleanox-management/components/RiwayatTransaksiCleanox.jsx` — hero, cutoff filter, stats, tabel, download Excel.
6. [x] Tambah menu item Riwayat Transaksi di `cleanox-management/index.jsx` (Menu Analisis).
7. [x] Daftarkan route di `frontend-superapp/src/App.jsx`.
8. [x] Smoke-check: buka menu → filter cutoff → data POS muncul → Download Excel → buka file, cek NO NOTA = `transaction_no`, header warna navy SuperApp, Smartlink tidak ikut.

## Risks / Catatan
- `transaction_no` format CLX ≠ 6-digit template lama — by design.
- Kolom rekon kosong sampai ada proses rekon di sistem; export tetap menyertakan header agar kompatibel proses keuangan.
- Periode cutoff panjang + banyak transaksi: response bisa besar; pantau; pagination ditunda.
- Pastikan `DATE_FORMAT` / `dateStrings` pool Cleanox konsisten agar tidak off-by-one pada `payment_settled_date` / `service_date`.
