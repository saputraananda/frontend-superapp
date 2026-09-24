# Plan: Pecah Label Kategori Pembayaran (Rekonsiliasi Tunai/Non-tunai Tetap)

## Context
- Kolom **Kategori** di Pendapatan/Riwayat SuperApp memakai `mapKategori` yang menggabungkan BCA/BSI/EDC/QRIS → label **`TF BANK`**, sehingga tampilan didominasi “TF BANK” meski omzet sudah menghitung semua metode lunas.
- Tunai hanya 2 bucket rekonsiliasi (DATA TUNAI / DATA NON TUNAI) — ini **tetap** dibutuhkan.
- Keputusan user: **kategori dipecah per metode**; **Tunai vs Non-tunai di rekonsiliasi tetap**.

## Goal
- Kolom `kategori` (API + UI tabel + kolom Excel KATEGORI) menampilkan metode asli: `TUNAI`, `BCA`, `BSI`, `EDC`, `QRIS`, `COLLABORATION`, `SMARTLINK`, dll.
- Bucket rekonsiliasi Excel + summary `tunai_amount` / `non_tunai_amount` tetap 2 kelompok (Tunai vs Non-tunai).
- Tidak mengubah filter omzet (tetap semua `lunas`).

## Locked Business Rules

| Rule | Value |
|------|--------|
| Nilai `kategori` (display) | Uppercase dari `mst_payment_method.group` (contoh: Tunai→`TUNAI`, BCA→`BCA`, BSI→`BSI`). Kosong → `-` |
| Smartlink | Tetap `SMARTLINK` via `mapKategoriUnified` |
| Collaboration | `COLLABORATION` |
| Legacy `TF BANK` | Tidak lagi dihasilkan oleh mapper baru; helper rekonsiliasi tetap mengenali `TF BANK` jika ada data lama di cache/export |
| Rekonsiliasi **DATA TUNAI** | Hanya `kategori === 'TUNAI'` |
| Rekonsiliasi **DATA NON TUNAI** | Semua kategori lain yang beromzet kecuali `TUNAI`, `-`, dan `COLLABORATION` (termasuk `BCA`/`BSI`/`EDC`/`QRIS`/`SMARTLINK`/`TF BANK` legacy) |
| Summary API `tunai_amount` | Sum amount di mana kategori `TUNAI` |
| Summary API `non_tunai_amount` | Sum amount di mana `isNonTunaiReconKategori(kategori)` true (sama aturan rekonsiliasi; **tidak** double-count dengan `smartlink_amount` — lock: **Smartlink tetap hanya di `smartlink_amount`**, **tidak** masuk `non_tunai_amount` summary API; di Excel rekonsiliasi Smartlink **masuk** NON TUNAI) |
| Summary `smartlink_amount` | Tetap terpisah seperti sekarang |
| Omzet / filter lunas | Tidak diubah |

**Klarifikasi summary vs Excel (locked):**
- **API summary** `non_tunai_amount`: POS non-tunai saja (BCA/BSI/EDC/QRIS/…), exclude SMARTLINK & COLLABORATION & TUNAI — konsisten perilaku lama (smartlink punya field sendiri).
- **Excel rekonsiliasi** DATA NON TUNAI: semua non-TUNAI termasuk SMARTLINK (dan legacy TF BANK); exclude hanya TUNAI / COLLABORATION / `-`.

## Detailed Specifications

### 1. Backend — `cleanoxOmzetUnified.js`

**Ubah `mapKategori(group)`:**
```js
// sebelum: Tunai→TUNAI; bca/bsi/edc/qris→TF BANK; else→TF BANK
// sesudah:
export function mapKategori(group) {
  const g = String(group || "").trim();
  if (!g) return "-";
  return g.toUpperCase();
}
```

**Tambah helper:**
- `isTunaiKategori(kategori)` → `String(kategori).toUpperCase() === 'TUNAI'`
- `isNonTunaiSummaryKategori(kategori)` → true untuk BCA/BSI/EDC/QRIS/TF BANK (dan group POS non-tunai lain); false untuk TUNAI, SMARTLINK, COLLABORATION, `-`, kosong  
  Implementasi aman:  
  `!isTunai && k !== 'SMARTLINK' && k !== 'COLLABORATION' && k !== '-'` && k length > 0  
  (setiap group POS baru otomatis non-tunai di summary kecuali Tunai/Collaboration)
- `isNonTunaiReconKategori(kategori)` → true untuk Excel:  
  `!isTunai && k !== 'COLLABORATION' && k !== '-'` && k length > 0  
  (**termasuk** SMARTLINK)

`mapKategoriUnified` tetap: smartlink → `SMARTLINK`; else `mapKategori(group)`.

### 2. Backend — `riwayatTransaksiCleanoxController.js` — `buildListResponse`

Ganti aggregasi:
```js
if (isTunaiKategori(kategori)) tunaiAmount += amount;
else if (isNonTunaiSummaryKategori(kategori)) nonTunaiAmount += amount;
else if (kategori === 'SMARTLINK') smartlinkAmount += amount;
```
(Import helper dari `cleanoxOmzetUnified.js`.)

Response field `kategori` otomatis pecah karena mapper baru — UI Pendapatan/Riwayat tidak perlu ubah render (tetap `row.kategori`).

### 3. Frontend — `exportRiwayatTransaksiCleanoxExcel.js` — `buildRekonsiliasiAggregates`

Ganti:
```js
if (kategori === "TUNAI") bucket.tunai += amount;
else if (kategori === "TF BANK") bucket.nonTunai += amount;
```
menjadi memakai aturan rekonsiliasi:
- TUNAI → tunai
- else if non-tunai recon (termasuk SMARTLINK, BCA, …; exclude COLLABORATION) → nonTunai

**Opsi implementasi (lock):** duplikasi helper kecil di util FE (copy fungsi `isTunaiKategori` / `isNonTunaiReconKategori`) **atau** inline check yang sama. Tidak ada shared package — **inline/copy di file export** agar FE tidak depend ke backend.

Header Excel `DATA TUNAI` / `DATA NON TUNAI` **tidak diubah**.

### 4. Out of scope
- Mengubah filter omzet / unified view
- Menambah kolom rekonsiliasi per-bank (BCA vs QRIS terpisah di blok kanan)
- Mengubah Piutang
- Backfill `payment_settled_date`

## Implementation Checklist
1. [x] Update `mapKategori` di `backend-superapp/controllers/Cleanox/cleanoxOmzetUnified.js` agar return `group.toUpperCase()` (bukan collapse ke TF BANK).
2. [x] Tambah `isTunaiKategori`, `isNonTunaiSummaryKategori`, `isNonTunaiReconKategori` di file yang sama; pastikan `mapKategoriUnified` tidak berubah perilakunya untuk smartlink.
3. [x] Update aggregasi `tunai_amount` / `non_tunai_amount` / `smartlink_amount` di `buildListResponse` (`riwayatTransaksiCleanoxController.js`) memakai helper summary.
4. [x] Update `buildRekonsiliasiAggregates` di `exportRiwayatTransaksiCleanoxExcel.js` agar NON TUNAI memakai aturan pecah kategori (termasuk SMARTLINK; exclude COLLABORATION).
5. [ ] Smoke-check API/UI: baris BCA/QRIS/EDC/Tunai menampilkan kategori masing-masing (bukan semua TF BANK).
6. [ ] Smoke-check export: kolom KATEGORI pecah; blok DATA TUNAI / DATA NON TUNAI masih terisi benar (Tunai vs sisanya).
7. [ ] Pastikan Collaboration tetap label `COLLABORATION` dan tidak menggelembungkan bucket rekonsiliasi (amount 0).

## Risks / Catatan
- Export lama / dokumentasi yang mengasumsikan KATEGORI hanya TUNAI|TF BANK perlu disesuaikan operasional.
- Group baru di DB (mis. BSI) otomatis tampil di kategori dan masuk non-tunai summary/recon — sesuai “pakai database”.
- Caller lain yang mengimpor `mapKategori` dan mengharapkan `TF BANK` akan mendapat nilai pecah — cek Grep impor `mapKategori` (riwayat controller export); tidak ada FE yang hardcode expect TF BANK di filter.
