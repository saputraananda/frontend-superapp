# Plan: Tanggal Pelunasan — POS List + Pendapatan Super App

## Context
- Daily Report / cashflow memakai **tanggal pelunasan**, sementara UI/export sering menampilkan **`service_date`** (tanggal layanan) → bingung.
- Field DB sudah ada: `tr_transactions.payment_settled_date`.
- API list POS & `/cleanox/riwayat-transaksi` sudah mengembalikan `payment_settled_date`.
- Detail transaksi POS sudah menampilkan tanggal pelunasan → **tidak diubah**.

## Goal
- **POS list** (`PosTransactionsPage`): hapus kolom Orang; **tambah** kolom Tanggal Pelunasan; Tanggal Layanan + filter layanan **tetap**.
- **Super App Pendapatan**: KPI, trend, tabel rincian lunas, dan export Excel memakai **`payment_settled_date`** (bukan `service_date`).
- Halaman/komponen **Riwayat Transaksi** terpisah (jika masih ada) **tetap** by `service_date` — tidak diganti.

## Locked Decisions
| Area | Keputusan |
|------|-----------|
| Detail POS | No change |
| List POS — Tanggal Layanan | Tetap kolom + filter `service_date` |
| List POS — Orang | Hapus kolom (`total_people`) |
| List POS — Worker | Tetap |
| List POS — Pelunasan | Kolom baru setelah Tanggal Layanan; tampil date-only; kosong → `-` |
| Pendapatan KPI/trend | Filter & GROUP BY `payment_settled_date` |
| Pendapatan syarat row | `payment_status = 'lunas'` AND `status <> 'Cancelled'` AND `payment_settled_date IS NOT NULL` AND tanggal pelunasan dalam range |
| Lunas tanpa `payment_settled_date` | Tidak masuk capaian/trend/tabel/export Pendapatan |
| Endpoint riwayat | Tambah query opsional `date_by=service\|settled` (default `service`) agar caller lain tidak berubah |
| Pendapatan fetch rincian | Panggil `/cleanox/riwayat-transaksi` dengan `date_by=settled` + `payment_status=lunas` |
| Export dari Pendapatan | Kolom tanggal = `payment_settled_date`; header **TGL PELUNASAN** (bukan generik TANGGAL / Tgl Layanan) |
| Piutang | Out of scope |
| Backfill NULL settled | Out of scope (hanya tampil/filter; tidak isi data lama di plan ini) |

## Approach (dipilih)
**Query param `date_by` pada riwayat-transaksi** + ganti field di `pendapatanCleanoxController` + UI/export Pendapatan + UI list POS.

Alternatif ditolak:
- Mengubah default riwayat-transaksi ke settled → berisiko jika ada consumer lain / halaman Riwayat.
- Duplikasi query list di controller pendapatan → duplikasi bukti pembayaran & mapping.

## Detailed Specifications

### A. Cleanox POS — list
**File:** `cleanox-app/src/web/pages/PosTransactionsPage.jsx`

1. Header: hapus `<th>Orang</th>`; sisipkan `<th>Tanggal Pelunasan</th>` tepat setelah Tanggal Layanan.
2. Body: hapus `<td>{row.total_people}</td>`; sisipkan sel pelunasan.
3. Format pelunasan: date-only `id-ID` (sama spirit `formatPaymentSettledLabel` di detail) — helper lokal kecil di file yang sama (atau util shared jika sudah ada; **jangan** mengubah detail page).
4. Nilai null/empty → `-`.
5. `colSpan` empty/loading state: sesuaikan (tetap 9 kolom: No, Customer, Tgl Layanan, Tgl Pelunasan, Item, Worker, Status, Total, action — Orang hilang, Pelunasan masuk → **tetap 9**).
6. Filter label “Tanggal layanan dari/sampai”: **tidak diganti**.
7. API list: **tidak perlu ubah** (field sudah di response).

### B. Backend Super App — Pendapatan KPI
**File:** `backend-superapp/controllers/Cleanox/pendapatanCleanoxController.js`

1. Query `actual_sales`: ganti  
   `DATE(t.service_date) >= ? AND DATE(t.service_date) <= ?`  
   menjadi  
   `t.payment_settled_date >= ? AND t.payment_settled_date <= ?`  
   (+ tetap `payment_status = 'lunas'`, `status <> 'Cancelled'`, service_mode clause).
2. Query `trend`: GROUP BY `DATE_FORMAT(t.payment_settled_date, '%Y-%m-%d')` dengan WHERE yang sama pada `payment_settled_date`.
3. Tambah eksplisit `AND t.payment_settled_date IS NOT NULL` (redundant dengan range comparison di MySQL untuk NULL, tapi dokumentatif).
4. Update komentar file jika menyebut service_date sebagai basis omzet.
5. Target/`mst_target_cleanox` / cutoff 26–25: **tidak diubah** (hanya axis tanggal omzet yang diganti).

### C. Backend Super App — Riwayat Transaksi (param opsional)
**File:** `backend-superapp/controllers/Cleanox/riwayatTransaksiCleanoxController.js`

1. Baca `req.query.date_by`:
   - `'settled'` → filter & ORDER BY `payment_settled_date`
   - selain itu / kosong → perilaku sekarang (`service_date`) — **default**
2. Jika `date_by=settled`:
   - `WHERE t.payment_settled_date >= ? AND t.payment_settled_date <= ?`
   - `AND t.payment_settled_date IS NOT NULL`
   - `ORDER BY t.payment_settled_date ASC, t.transaction_no ASC`
3. Response shape tidak berubah (tetap include `service_date` dan `payment_settled_date`).
4. Update komentar JSDoc endpoint.

### D. Frontend Super App — Pendapatan UI
**File:** `frontend-superapp/src/pages/cleanox-management/components/PendapatanCleanox.jsx`

1. Fetch rincian lunas: tambah query `date_by=settled` ke `/cleanox/riwayat-transaksi`.
2. Header tabel: ganti **Tgl Layanan** → **Tgl Pelunasan**.
3. Sel tanggal: `formatDate(row.payment_settled_date)` (bukan `service_date`).
4. Copy/deskripsi section jika menyebut “tanggal layanan” → sesuaikan ke pelunasan (teks singkat saja).
5. Export onClick: teruskan opsi agar util memakai `payment_settled_date` (lihat E).

### E. Frontend Super App — Export Excel
**File:** `frontend-superapp/src/pages/cleanox-management/utils/exportRiwayatTransaksiCleanoxExcel.js`

1. Tambah parameter opsional, contoh:
   - `dateField = 'service_date'` (default — backward compatible)
   - `dateHeader = 'TANGGAL'` (default)
2. Untuk Pendapatan: panggil dengan `dateField: 'payment_settled_date'`, `dateHeader: 'TGL PELUNASAN'`.
3. Row cell: `fmtDateSlash(r[dateField])` (atau resolve aman jika null → `""`).
4. Caller lain (jika ada) tanpa argumen baru → perilaku lama.

### F. Out of scope (jangan kerjakan)
- `PosTransactionDetailPage.jsx` perubahan apapun
- `RiwayatTransaksiCleanox.jsx` (halaman terpisah) — tetap `service_date`
- Piutang / backfill `payment_settled_date` NULL
- Ubah filter tanggal di list POS ke settled

## Implementation Checklist
1. [ ] `PosTransactionsPage.jsx`: hapus kolom header + cell **Orang** (`total_people`).
2. [ ] `PosTransactionsPage.jsx`: tambah helper format date-only pelunasan (null → `-`).
3. [ ] `PosTransactionsPage.jsx`: tambah header **Tanggal Pelunasan** setelah Tanggal Layanan.
4. [ ] `PosTransactionsPage.jsx`: render `row.payment_settled_date` di kolom baru; pastikan `colSpan` konsisten.
5. [ ] Verifikasi manual mental: filter layanan + kolom Tanggal Layanan tidak berubah.
6. [ ] `pendapatanCleanoxController.js`: ganti WHERE/GROUP BY actual_sales ke `payment_settled_date`.
7. [ ] `pendapatanCleanoxController.js`: ganti WHERE/GROUP BY trend ke `payment_settled_date`.
8. [ ] `pendapatanCleanoxController.js`: pastikan kondisi `lunas` + non-Cancelled + service_mode tetap.
9. [ ] `riwayatTransaksiCleanoxController.js`: parse `date_by`; default `service`.
10. [ ] `riwayatTransaksiCleanoxController.js`: cabang `settled` — filter + order by `payment_settled_date`.
11. [ ] `PendapatanCleanox.jsx`: tambah `date_by=settled` pada fetch rincian lunas.
12. [ ] `PendapatanCleanox.jsx`: kolom tabel Tgl Pelunasan + `formatDate(payment_settled_date)`.
13. [ ] `exportRiwayatTransaksiCleanoxExcel.js`: param `dateField` / `dateHeader` dengan default lama.
14. [ ] `PendapatanCleanox.jsx`: export panggil dengan `dateField: 'payment_settled_date'`, `dateHeader: 'TGL PELUNASAN'`.
15. [ ] Smoke-check: halaman yang memakai export tanpa param baru (jika ada) tetap header TANGGAL = service_date.
16. [ ] Catat verifikasi: transaksi lunas + `payment_settled_date` NULL tidak muncul di Pendapatan.

## Risks / Catatan
- **Capaian turun** vs sebelumnya jika banyak lunas tanpa `payment_settled_date` (contoh Diana/Niko/Andy) — expected until data dilengkapi.
- Transaksi dilunasi di bulan berbeda dari layanan pindah bucket periode (ini yang diinginkan untuk cashflow).
- `fmtDateSlash` dengan `new Date(d)` raw ISO midnight UTC bisa off-by-one; untuk `payment_settled_date` string `YYYY-MM-DD` path regex di util sudah aman — pastikan value dari API tetap date-only string.

## Approval
Menunggu persetujuan user + sinyal `ENTER EXECUTE MODE` sebelum implementasi.
