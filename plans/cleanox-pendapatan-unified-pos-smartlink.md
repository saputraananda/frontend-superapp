# Plan: Pendapatan SuperApp Unified (POS + Smartlink)

## Context
- Cleanox Only list sudah baca `v_transactions_unified` (Smartlink ∪ POS). Agustus 2026: Smartlink ~32 nota / ~Rp 52jt (semua `payment_status=lunas`), POS ada tapi banyak `payment_settled_date` NULL.
- SuperApp **Pendapatan** & **Rincian Lunas** saat ini hanya `tr_transactions` + filter `payment_settled_date IS NOT NULL` → Agustus terlihat kosong.
- Plan lama Riwayat SuperApp sengaja **POS-only / tanpa Smartlink** (fase sebelumnya). Kebutuhan baru: **Pendapatan mencakup semua** (Smartlink + POS), Smartlink via view = sudah lunas.
- Input transaksi historis manual tetap di Cleanox Only (`/cleanox-only/transactions/history/new` → `tr_transactions.is_history_entry=1`), bukan ke Smartlink.

## Goal
- SuperApp Pendapatan (KPI + tren + rincian lunas + export) menghitung omzet dari **POS lunas + Smartlink**, konsisten dengan spirit daily report historis.
- Smartlink tetap dianggap lunas; tanggal omzet Smartlink pakai tanggal layanan (`service_date` / `tgl_terima` di view).
- POS lunas tanpa `payment_settled_date` tetap masuk omzet (fallback tanggal layanan) agar history Agustus tidak hilang.
- Dokumentasikan alur: lihat semua transaksi vs input history vs pendapatan.

## Locked Business Rules

| Rule | Value |
|------|--------|
| Sumber omzet Pendapatan | `v_transactions_unified` di DB Cleanox (bukan `tr_transactions` saja) |
| Include Smartlink | Ya — `source_system = 'smartlink'` |
| Include POS | Ya — `source_system = 'pos'` |
| Syarat masuk omzet | `payment_status = 'lunas'` DAN status bukan `Cancelled` (POS); Smartlink selalu lunas di view |
| Collaboration | Tetap ikut sebagai pencatatan; `final_amount = 0` → tidak menambah nominal |
| Tanggal omzet (`omzet_date`) | **Smartlink:** `DATE(service_date)`. **POS lunas:** `COALESCE(payment_settled_date, DATE(service_date))` |
| Filter periode cutoff | Tetap 26→25 via `asOfDate` / range existing (`computeDateRange` / filter UI) |
| Filter `service_mode` | `all` → POS + Smartlink. `home_service` / `take_home` → **POS saja** yang match mode (Smartlink `jenis_layanan` tidak dipetakan ke home/take_home; jangan hilangkan Smartlink dari `all`) |
| Piutang dashboard | **Tidak diubah** — tetap POS `belum_lunas` only (Smartlink tidak punya piutang) |
| Menu Riwayat Transaksi SuperApp (jika masih ada / redirect) | Boleh tetap POS-only **kecuali** dipanggil dari Pendapatan; Pendapatan rincian memakai mode unified |
| Input history manual | Tetap Cleanox Only history create; **tidak** buat form history di SuperApp pada plan ini |
| Bukti pembayaran Smartlink | Tidak ada di POS proofs → kolom bukti kosong / “—” |
| Kategori pembayaran Smartlink | `mapKategori` / label khusus → **`SMARTLINK`** (jangan fallback `TF BANK`) |
| Kategori POS | Tetap Tunai→TUNAI; BCA/EDC/QRIS→TF BANK; Collaboration→COLLABORATION |
| Dedup Smartlink vs POS history | Out of scope otomatis; SOP: history input hanya untuk transaksi yang **tidak** ada di Smartlink |
| Target (`mst_target_cleanox`) | Tidak diubah; capaian = sum omzet unified |

### Definisi SQL tanggal omzet (konsep)
```sql
CASE
  WHEN v.source_system = 'smartlink' THEN DATE(v.service_date)
  ELSE COALESCE(v.payment_settled_date, DATE(v.service_date))
END AS omzet_date
```

### Filter omzet (konsep)
```sql
WHERE omzet_date BETWEEN ? AND ?
  AND v.payment_status = 'lunas'
  AND (v.source_system = 'smartlink' OR (v.source_system = 'pos' AND v.status <> 'Cancelled'))
  -- + service_mode clause: hanya jika mode ≠ all, batasi ke POS matching
```

## Detailed Specifications

### A. Dokumentasi alur (copy UI singkat, bukan file docs terpisah)
Di subtitle Pendapatan SuperApp ganti teks menjadi intinya:
- “Omzet lunas POS + Smartlink (unified) vs target”
- Rincian: “Smartlink & POS lunas pada periode aktif (tanggal omzet = pelunasan POS jika ada, else tanggal layanan; Smartlink = tanggal layanan)”

Catatan operasional (boleh di helper text kecil):
- Lihat semua transaksi (POS+Smartlink): Cleanox Only → Riwayat Transaksi
- Input history manual: Cleanox Only → Input Transaksi History
- Pendapatan SuperApp: agregasi omzet lunas semua sumber

### B. Backend SuperApp — helper shared tanggal/mode

**File baru (disarankan):** `backend-superapp/controllers/Cleanox/cleanoxOmzetUnified.js`  
atau util di folder yang sama dengan export yang dipakai kedua controller.

Export fungsi:
- `buildOmzetDateExpr(alias = 'v')` → string SQL CASE di atas
- `buildUnifiedOmzetWhere({ serviceMode, dateStart, dateEnd, alias })` → `{ sql, params }`
- `mapKategoriUnified(group, sourceSystem)` — jika `sourceSystem === 'smartlink'` return `'SMARTLINK'`; else reuse logic `mapKategori` + Collaboration

### C. Backend — `pendapatanCleanoxController.js` (`getPendapatanCleanox`)

1. Ganti query `actual_sales` dari `tr_transactions` + `payment_settled_date` menjadi aggregasi dari `v_transactions_unified` memakai `omzet_date` + aturan locked.
2. Ganti query `trend` harian: `GROUP BY omzet_date` dari view yang sama.
3. Pertahankan `mst_target_cleanox`, meta `dateStart` / `dateEnd` / `asOfDate`, `service_mode`.
4. Response shape **tidak diubah** (`outlets`, `trend`, `meta`) agar FE KPI/chart tetap jalan.
5. Opsional di `meta`: `sources: ['pos', 'smartlink']` (nice-to-have; hanya jika tidak merusak FE — lock: **tambahkan** `meta.sources` untuk debug/UI kecil).

### D. Backend — `riwayatTransaksiCleanoxController.js`

Perlu dipakai ulang oleh Pendapatan rincian lunas.

1. Tambah query param:
   - `source` = `pos` (default, backward compatible) \| `unified`
   - `date_by` = `service` \| `settled` \| **`omzet`** (baru)
2. Jika `source=unified`:
   - SELECT dari `v_transactions_unified v`
   - Field tambahan response: `source_system`, `omzet_date`, `is_history_entry` (null/0 untuk smartlink)
   - `payment_settled_date` tetap dari view (smartlink = null)
   - `kategori` via `mapKategoriUnified`
   - Bukti: hanya load `tr_transaction_payment_proofs` untuk baris `source_system='pos'` yang punya `id` / `pos_transaction_id`
3. Jika `date_by=omzet`: filter pakai ekspresi `omzet_date` (bukan settled-only).
4. Default existing callers (`source` omit / `pos`, `date_by=service|settled`) **perilaku lama tetap**.
5. Summary aggregates:
   - `tunai_amount` / `non_tunai_amount` hanya dari kategori TUNAI / TF BANK
   - `SMARTLINK` dan `COLLABORATION` **tidak** masuk bucket tunai/non-tunai (boleh field summary baru opsional `smartlink_amount` — lock: **tambah** `smartlink_amount` di summary)

### E. Frontend SuperApp — `PendapatanCleanox.jsx`

1. Fetch rincian lunas: ubah query ke  
   `payment_status=lunas&date_by=omzet&source=unified&service_mode=...`
2. Kolom tabel:
   - Ganti header “Tgl Pelunasan” → **“Tgl Omzet”** (tampilkan `omzet_date` atau fallback settled/service)
   - Tambah badge/kolom kecil **Sumber**: `POS` / `Smartlink` / `History` (jika `is_history_entry`)
   - Bukti: kosong untuk Smartlink
3. Export Excel: `dateField: 'omzet_date'` (pastikan rows punya field itu); `dateHeader: 'TGL OMZET'`
4. Copy subtitle / deskripsi section sesuai bagian A.
5. `mapKategori` di FE tidak perlu duplikat jika BE sudah kirim `kategori`.

### F. Frontend — export util (jika perlu)
**File:** `exportRiwayatTransaksiCleanoxExcel.js`  
- Pastikan reconciliasi tetap hanya TUNAI / TF BANK; baris SMARTLINK amount 0 ke bucket atau diabaikan (amount ikut total sheet kiri, tidak masuk tunai/non-tunai) — perilaku existing `kategori` check sudah aman jika kategori bukan TUNAI/TF BANK.
- Support `dateField: 'omzet_date'`.

### G. Cleanox-app (opsional hardening, bukan blocker SuperApp)
- Tidak wajib ubah view untuk plan ini (view sudah hardcode smartlink `payment_status='lunas'`).
- **Out of scope plan ini:** backfill massal `payment_settled_date` POS (sudah ditangani fallback `COALESCE`).
- Input history: tidak ada perubahan kode; hanya klarifikasi di copy SuperApp.

### H. Out of scope
- Form input history di SuperApp
- Mengubah Piutang agar include Smartlink
- Auto-dedup nota Smartlink vs POS
- Mengubah KPI Produksi / dashboard sales Waschen yang pakai smartlink table lain
- Memaksa filter home/take_home memetakan Smartlink

## Implementation Checklist
1. [x] Buat helper `backend-superapp/controllers/Cleanox/cleanoxOmzetUnified.js` berisi `buildOmzetDateExpr`, `buildUnifiedOmzetWhere`, `mapKategoriUnified` (+ re-export/reuse Collaboration dari pola existing `mapKategori`).
2. [x] Update `getPendapatanCleanox` di `pendapatanCleanoxController.js`: actual_sales dari `v_transactions_unified` + `omzet_date` + aturan lunas/cancelled/service_mode.
3. [x] Update query trend harian di `getPendapatanCleanox` agar `GROUP BY` `omzet_date` dari sumber yang sama.
4. [x] Tambah `meta.sources: ['pos','smartlink']` pada response pendapatan.
5. [x] Update `listRiwayatTransaksi`: param `source` (`pos`\|`unified`, default `pos`) dan `date_by` termasuk `omzet`.
6. [x] Implement branch `source=unified`: SELECT `v_transactions_unified`, map row + `source_system` + `omzet_date`, kategori via `mapKategoriUnified`.
7. [x] Load payment proofs hanya untuk baris POS; Smartlink `payment_proofs: []`.
8. [x] Update summary riwayat: tambah `smartlink_amount`; tunai/non-tunai tidak menghitung SMARTLINK/COLLABORATION.
9. [x] Pastikan default `source=pos` + `date_by=service|settled` tidak regresi perilaku lama.
10. [x] Update `PendapatanCleanox.jsx` fetch rincian: `source=unified&date_by=omzet`.
11. [x] Update UI rincian: kolom Tgl Omzet, badge Sumber, copy subtitle/deskripsi, bukti “—” untuk Smartlink.
12. [x] Update export rincian pendapatan: `dateField: 'omzet_date'`, `dateHeader: 'TGL OMZET'`.
13. [x] Sesuaikan `exportRiwayatTransaksiCleanoxExcel.js` bila perlu agar `omzet_date` terbaca di `toDateKey`.
14. [x] Verifikasi manual filter bulan Agustus (cutoff 26 Jul–25 Agu): actual_sales > 0 dan memuat Smartlink + POS lunas.
15. [x] Verifikasi `service_mode=all` vs `home_service`: all include Smartlink; home_service hanya POS home (Smartlink tidak ikut).
16. [ ] Verifikasi Collaboration tetap muncul jika ada dengan nominal 0 dan kategori COLLABORATION.
17. [x] Verifikasi Piutang tidak berubah (tetap POS belum_lunas).
18. [x] Smoke-check Cleanox Only history create path tidak rusak (tidak ada perubahan wajib).

## Risks / Catatan
- **Double count:** history POS yang menduplikasi nota Smartlink akan menggandakan omzet — mitigasi SOP, bukan kode.
- **Smartlink `final_amount`:** view pakai `max(total_tagihan)`; jika banyak null di item rows, nominal bisa undercount — cek sample Agustus (~52jt sudah terbaca); jika undercount, follow-up terpisah (bukan blocker jika angka masuk akal).
- **Performa:** `v_transactions_unified` UNION + GROUP BY bisa berat untuk range panjang; index di Smartlink `tgl_terima` / POS `payment_settled_date` + `service_date` idealnya sudah ada; monitor latency.
- **Perubahan makna “bulan”:** tetap cutoff 26–25; edukasi UI bahwa ini bukan kalender 1–31.
- Regresi: caller lain ke `/cleanox/riwayat-transaksi` harus tetap default POS-only.
