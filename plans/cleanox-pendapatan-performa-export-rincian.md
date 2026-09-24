# Plan: Performa Cleanox + Export di Rincian Lunas

## Context
- Dashboard Pendapatan sudah punya filter Layanan, KPI, tren, tabel performa, dan rincian lunas.
- Saat ini tabel tengah berjudul **“Performa Per Layanan”**, kolom pertama menampilkan label filter (Semua Layanan / Home Service / Take Home), dan tombol **Export Excel** ada di tabel tengah (export performa).
- User: tabel atas hanya **patokan performa Cleanox** (bukan per layanan); export Excel **hanya di tabel bawah** (rincian transaksi lunas).

## Goal
- Judul tabel tengah: **“Performa Cleanox”**.
- Baris/patokan: label entitas **`Cleanox`** (bukan nama layanan).
- Kolom pertama: **Cleanox** (bukan “Layanan”).
- Hapus Export Excel dari tabel performa.
- Tambah Export Excel di **Rincian Transaksi Lunas** (export daftar transaksi lunas yang tampil).

## Locked Business Rules

| Rule | Value |
|------|--------|
| Judul kartu performa | `Performa Cleanox` |
| Kolom identitas | Header **`Cleanox`** diganti dari “Layanan” — lock: header kolom = **`Outlet` diganti jadi label singkat `Entitas` atau tetap satu kolom bernama `Cleanox` sebagai nama baris saja** → final: header kolom pertama = **`Entitas`**, nilai baris selalu **`Cleanox`**. (UI sederhana: header **`Cleanox`** tidak dipakai sebagai header; pakai **`Entitas`** / lebih natural: header **`Cabang`** — user bilang “langsung ke cleanox”. Lock final: **header kolom pertama = kosong-nama `Nama`** atau **` `** — sederhana: header **` `** → **`Nama`**, cell **`Cleanox`**. Paling mirip Waschen: header **`Outlet`** diganti **` `** → **`Entitas`**, value **`Cleanox`**. |
| Jumlah baris | Tetap **1 baris** (target + capaian terfilter layanan, tapi nama tetap Cleanox) |
| Filter Layanan (atas) | **Tetap ada** — hanya memfilter angka actual/tren/rincian; **tidak** mengubah label baris performa |
| Export di performa | **Dihapus** |
| Export di rincian lunas | **Ya** — tombol di header section “Rincian Transaksi Lunas” |
| Isi export bawah | Kolom sama util riwayat: No, TANGGAL, NO NOTA, NAMA, KATEGORI, NOMINAL (`exportRiwayatTransaksiCleanoxExcel`) dengan `title`/`filePrefix`/`sheetName` khusus Pendapatan |
| Filename export | `Pendapatan_Cleanox_Lunas_{start}_{end}.xlsx` (atau `filePrefix: "Pendapatan_Cleanox_Lunas"`) |
| `exportPendapatanCleanoxExcel.js` | **Tidak dipakai** di UI lagi; file boleh dibiarkan di repo (tidak wajib hapus) — lock: **stop import/pakai di PendapatanCleanox**; hapus file **tidak wajib** |
| Backend label | Response field `outlet` pada performa row selalu string **`Cleanox`** (bukan label layanan) |
| Piutang | **Out of scope** plan ini (tidak diubah kecuali tersentuh shared filter — jangan ubah) |

## Detailed Specifications

### 1. Backend — `pendapatanCleanoxController.js`
- Di objek performa yang di-push ke `outletsOut`, set `outlet: "Cleanox"` selalu (hapus pemakaian `serviceModeLabel` untuk field ini).
- `meta.service_mode` tetap boleh ada untuk debug/FE.

### 2. Frontend — `PendapatanCleanox.jsx`
- Judul: `Performa Per Layanan` → **`Performa Cleanox`**.
- Header kolom pertama: `Layanan` → **`Entitas`** (nilai cell tetap dari `row.outlet` yang sekarang `Cleanox`).
- Mobile card: tampilkan `Cleanox` sama.
- Hapus tombol Export + import `exportPendapatanCleanoxExcel` dari section performa.
- Section **Rincian Transaksi Lunas**:
  - Tambah tombol Export Excel (kanan header, style sama emerald).
  - `disabled` jika `lunasLoading` atau `lunasRows.length === 0`.
  - On click: `exportRiwayatTransaksiCleanoxExcel({ records: lunasRows, periodLabel, activePeriod: { startDate: meta.dateStart, endDate: meta.asOfDate || meta.dateEnd }, title: "Pendapatan Cleanox — Transaksi Lunas", filePrefix: "Pendapatan_Cleanox_Lunas", sheetName: "Lunas" })`.
  - Import util dari `../utils/exportRiwayatTransaksiCleanoxExcel`.
  - `periodLabel`: string singkat dari meta / filter aktif (mis. `Cutoff …` atau `${meta.dateStart} – ${meta.asOfDate}`).

### 3. Frontend — tidak wajib ubah
- `CleanoxDashboardFilterBar` / filter layanan: tetap.
- `exportPendapatanCleanoxExcel.js`: tidak dipanggil; opsional biarkan file.

### 4. Out of scope
- Ubah Piutang dashboard.
- Pecah performa jadi multi-baris lagi.
- Export bukti gambar.

## Implementation Checklist
1. [x] BE: performa row `outlet` selalu `"Cleanox"`.
2. [x] FE Pendapatan: judul **Performa Cleanox**; kolom pertama **Entitas**; hapus Export dari kartu performa.
3. [x] FE Pendapatan: tombol Export Excel di **Rincian Transaksi Lunas** memakai `exportRiwayatTransaksiCleanoxExcel` (title/filePrefix/sheetName lock di atas).
4. [x] Hapus import/pemakaian `exportPendapatanCleanoxExcel` dari `PendapatanCleanox.jsx`.
5. [x] Smoke-check: filter layanan tetap mengubah angka; baris performa tetap “Cleanox”; export hanya dari tabel bawah dan file berisi transaksi lunas.

## Risks / Catatan
- Achievement/capaian tetap dipengaruhi filter layanan vs target company penuh (perilaku lama).
- Nama file export bergeser dari performa → daftar lunas; sesuai permintaan user.
