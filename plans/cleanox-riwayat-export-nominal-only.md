# Plan: Export Riwayat Transaksi — kolom sampai NOMINAL saja

## Context
- Export `exportRiwayatTransaksiCleanoxExcel.js` saat ini meniru Daily Report penuh: No, TANGGAL, NO NOTA, NAMA, KATEGORI, NOMINAL, lalu REKON CODE, REVENUE, GAP, REKON REKENING, TANGGAL TRANSFER, REMARKS, PERSENTASE, plus blok SUMMARY / REKONSILIASI / PENGELUARAN.
- User: **export Excel SuperApp cukup sampai NOMINAL**; sisanya tidak perlu.

## Goal
- Sederhanakan export Excel menjadi hanya kolom: **No, TANGGAL, NO NOTA, NAMA, KATEGORI, NOMINAL**.
- Hapus kolom rekon, remarks, persentase, dan seluruh blok SUMMARY / REKONSILIASI / PENGELUARAN.
- Style SuperApp (navy) tetap.

## Locked Business Rules

| Rule | Value |
|------|--------|
| Kolom export | Hanya: `No` \| `TANGGAL` \| `NO NOTA` \| `NAMA` \| `KATEGORI` \| `NOMINAL` |
| TANGGAL | `service_date` → `DD/MM/YYYY` |
| NO NOTA | `transaction_no` |
| NAMA | `customer_name` |
| KATEGORI | dari field `kategori` record (TUNAI / TF BANK / -) |
| NOMINAL | `final_amount` (number); jika `pricing_pending` → `0` |
| REKON CODE … PERSENTASE | **Dihapus** |
| SUMMARY / REKONSILIASI / PENGELUARAN | **Dihapus** |
| Title / meta rows | Tetap (judul + periode + total baris + diekspor) |
| Filename | Tetap `Daily_Report_Cleanox_POS_${start}_${end}.xlsx` |
| Sheet name | `Riwayat` |
| UI list / API | Tidak diubah |

## Detailed Specifications

### File: `frontend-superapp/src/pages/cleanox-management/utils/exportRiwayatTransaksiCleanoxExcel.js`

1. Set `TOTAL_COLS = 6`.
2. Hapus helper yang hanya dipakai blok aggregate:
   - `fmtDateSlashShort` (jika tidak dipakai lagi)
   - `toDateKey`
   - `buildDailyAggregates`
3. Header row:
   `["No", "TANGGAL", "NO NOTA", "NAMA", "KATEGORI", "NOMINAL"]`
4. Data row per record:
   - No = index+1
   - TANGGAL = `fmtDateSlash(r.service_date)`
   - NO NOTA = `r.transaction_no`
   - NAMA = `r.customer_name`
   - KATEGORI = `r.kategori`
   - NOMINAL = `r.pricing_pending ? 0 : Number(r.final_amount || 0)`
5. Hapus loop `rowCount = max(list, aggregates)` — cukup `list.forEach`.
6. `!cols` hanya 6 lebar kolom.
7. Merges title/meta tetap span `TOTAL_COLS - 1` (0..5).

### Out of scope
- Perubahan API / page filter / StatCard
- Menambah kembali kolom rekon di masa depan

## Implementation Checklist
1. [x] Edit `exportRiwayatTransaksiCleanoxExcel.js`: kurangi ke 6 kolom (No–NOMINAL); hapus aggregate helpers & kolom kanan.
2. [x] Pastikan title/meta/merges/cols konsisten dengan 6 kolom.
3. [x] Smoke-check: Download Excel dari Riwayat Transaksi → file hanya berisi No, TANGGAL, NO NOTA, NAMA, KATEGORI, NOMINAL.

## Risks / Catatan
- Filename tetap memakai prefix Daily Report agar konsisten dengan menu; isi sudah disederhanakan.
