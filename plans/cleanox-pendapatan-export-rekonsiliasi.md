# Plan: Export Pendapatan — blok REKONSILIASI di kanan

## Context
- Export Pendapatan (Rincian Transaksi Lunas) memakai `exportRiwayatTransaksiCleanoxExcel.js` dengan 6 kolom kiri: No, TGL PELUNASAN, NO NOTA, NAMA, KATEGORI, NOMINAL.
- Template referensi `DAILY REPORT - CLEANOX 2026.xlsx` punya blok kanan **REKONSILIASI | DATA TUNAI | DATA NON TUNAI | GAP** (aggregate per tanggal).
- Util yang sama dipakai Riwayat & Piutang; mereka harus **tetap 6 kolom** (default).
- User: **hanya penambahan** di hasil export Pendapatan; jangan ubah UI/API/Piutang/perilaku lain.

## Goal
- Tambah blok 4 kolom di **kanan** file Excel export Pendapatan saja.
- Kolom kiri tetap utuh.
- Riwayat & Piutang tidak berubah output-nya.

## Locked Business Rules

| Rule | Value |
|------|--------|
| Scope menu | **Pendapatan** saja |
| Yang diubah | Hasil file Excel saja (util + 1 flag di call site Pendapatan) |
| Kolom kiri | Tetap: No, `dateHeader`, NO NOTA, NAMA, KATEGORI, NOMINAL |
| Kolom kanan (baru) | REKONSILIASI, DATA TUNAI, DATA NON TUNAI, GAP |
| Spacer | 1 kolom kosong antara NOMINAL dan REKONSILIASI |
| Baris REKONSILIASI | 1 baris per **tanggal unik** dari `dateField` record (bukan 1:1 transaksi) |
| Tanggal agregasi | Field yang sama dengan kolom kiri: `dateField` (Pendapatan = `payment_settled_date`) |
| Format tanggal REKONSILIASI | `DD/MM/YYYY` via `fmtDateSlash` |
| DATA TUNAI | Sum `final_amount` di mana `kategori === "TUNAI"` per tanggal |
| DATA NON TUNAI | Sum `final_amount` di mana `kategori === "TF BANK"` per tanggal |
| `kategori === "-"` / lain | Tidak masuk tunai maupun non-tunai |
| `pricing_pending` | Amount dihitung `0` (sama aturan kolom NOMINAL) |
| GAP | Selalu number `0` (belum ada data rekon bank) |
| Urutan tanggal | Ascending by date key `YYYY-MM-DD` |
| Tinggi sheet | `max(list.length, aggregates.length)` baris data; sel kosong di sisi yang lebih pendek |
| Opt-in flag | `includeRekonsiliasi: false` (default) — hanya Pendapatan set `true` |
| Style | Palette SuperApp existing (`headerBg 1b3459`, dll); header rekon pakai `headerStyle` yang sama |
| SUMMARY / PENGELUARAN | **Tidak** ditambah |
| Backend / UI tabel | **Tidak** diubah |
| Piutang / Riwayat call site | **Tidak** diubah |

### Layout kolom (saat `includeRekonsiliasi === true`)

| Index | Header |
|-------|--------|
| 0 | No |
| 1 | dateHeader (Pendapatan: TGL PELUNASAN) |
| 2 | NO NOTA |
| 3 | NAMA |
| 4 | KATEGORI |
| 5 | NOMINAL |
| 6 | (spacer kosong) |
| 7 | REKONSILIASI |
| 8 | DATA TUNAI |
| 9 | DATA NON TUNAI |
| 10 | GAP |

`TOTAL_COLS` efektif = `11` jika flag on; `6` jika flag off.

Title/meta/spacer merges: span `0 .. TOTAL_COLS - 1` (full lebar sheet efektif).

## Detailed Specifications

### 1. File: `frontend-superapp/src/pages/cleanox-management/utils/exportRiwayatTransaksiCleanoxExcel.js`

**Helpers baru (local):**
- `toDateKey(value)` → `YYYY-MM-DD` atau `null` (reuse pola dari `service_date_key` / slice string / Date).
- `buildRekonsiliasiAggregates(list, dateField)`:
  - Loop records; skip jika `toDateKey(r[dateField])` null.
  - Amount = `r.pricing_pending ? 0 : Number(r.final_amount || 0)`.
  - Accumulasi Map: `{ tunai, nonTunai }` by date key + kategori.
  - Return sorted array: `{ dateKey, dateLabel: fmtDateSlash(dateKey), tunai, nonTunai, gap: 0 }`.

**Signature:** tambah param opsional:
```js
includeRekonsiliasi = false,
```

**Logic body:**
1. `const leftCols = 6`.
2. `const totalCols = includeRekonsiliasi ? 11 : 6`.
3. Title/meta/emptySpacer pakai `totalCols` (bukan konstanta hardcode 6).
4. Hapus ketergantungan pada `const TOTAL_COLS = 6` sebagai satu-satunya lebar — ganti jadi `leftCols` + `totalCols` lokal di function.
5. Header row:
   - Base: `["No", dateHeader, "NO NOTA", "NAMA", "KATEGORI", "NOMINAL"]`.
   - Jika flag: append `["", "REKONSILIASI", "DATA TUNAI", "DATA NON TUNAI", "GAP"]` (spacer string kosong + 4 header); style header untuk 4 kolom rekon = `headerStyle`; spacer cell kosong tanpa wajib border tebal (boleh `empty` plain white atau `headerStyle` kosong — lock: **spacer = empty white, tanpa border header**; 4 kolom rekon pakai `headerStyle`).
6. Data:
   - `aggregates = includeRekonsiliasi ? buildRekonsiliasiAggregates(list, dateField) : []`.
   - `rowCount = Math.max(list.length, aggregates.length)` (jika flag off: `list.length` saja — equivalent karena aggregates=[]).
   - Untuk `i` in `0 .. rowCount-1`:
     - Left: jika `i < list.length` isi transaksi; else 6 empty styled cells (alt by `i`).
     - Jika flag: spacer empty + jika `i < aggregates.length` isi `[dateLabel, tunai, nonTunai, gap]` (date center, money right, gap right number 0); else 4 empty.
7. `!cols`: base 6 widths existing; jika flag tambah `{ wch: 3 }` spacer + `{ wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }` untuk rekon.
8. Merges title/meta tetap 5 baris atas, `c: totalCols - 1`.
9. Default `includeRekonsiliasi = false` → output **identik** perilaku sekarang untuk Riwayat/Piutang.

**JSDoc:** update komentar — sebutkan flag opsional blok REKONSILIASI.

### 2. File: `frontend-superapp/src/pages/cleanox-management/components/PendapatanCleanox.jsx`

Pada call `exportRiwayatTransaksiCleanoxExcel({...})` di tombol Export Excel Rincian Transaksi Lunas, tambah **satu** prop:
```js
includeRekonsiliasi: true,
```
Tidak ubah props lain (`dateField`, `dateHeader`, title, filePrefix, sheetName, records, dll).

### 3. Out of scope
- Backend / endpoint baru.
- Perubahan UI tabel Pendapatan.
- Export Piutang / Riwayat.
- Blok SUMMARY / PENGELUARAN.
- Warna peach template Excel manual.
- File `exportPendapatanCleanoxExcel.js` (tetap tidak dipakai).

## Implementation Checklist
1. [x] Di `exportRiwayatTransaksiCleanoxExcel.js`: tambah helper `toDateKey` dan `buildRekonsiliasiAggregates`.
2. [x] Tambah param `includeRekonsiliasi = false`; hitung `totalCols` 6 vs 11.
3. [x] Sesuaikan title/meta/spacer/merges/`!cols` agar memakai `totalCols`.
4. [x] Header + data rows: jika flag on, tulis spacer + 4 kolom REKONSILIASI (aggregate per `dateField`); tinggi baris = `max(list, aggregates)`.
5. [x] Di `PendapatanCleanox.jsx`: set `includeRekonsiliasi: true` pada call export.
6. [ ] Smoke-check: export Pendapatan → kiri 6 kolom utuh, kanan ada REKONSILIASI; export Riwayat/Piutang tetap 6 kolom saja.

## Risks / Catatan
- Record tanpa `payment_settled_date` tidak masuk agregasi rekon (tanggal null di-skip); tetap bisa muncul di kiri jika ada di list — ok by design.
- Util shared: default flag false menjaga Riwayat/Piutang aman.
- GAP selalu 0 sampai ada proses rekon bank di sistem.
