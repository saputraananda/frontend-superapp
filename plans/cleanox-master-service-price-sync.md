# Plan: Selaraskan Harga Master Service Superapp → mst_service_prices

## Context
- Master Service di Superapp (`/cleanox-management-system/service`) menulis harga hanya ke `mst_services.price` via `backend-superapp` `masterServicesController.js`.
- Cleanox POS (`PosPricesPage` / transaksi) membaca harga dari `mst_service_prices` (`sp.price`, `sp.coret_price`).
- Akibatnya layanan yang dibuat dari Superapp muncul di POS (nama/kategori/satuan) tapi kolom Harga / Harga Coret tampil `—`.
- Controller Superapp Cleanox saat ini **tidak mereferensikan** `mst_service_prices` sama sekali.
- Pola yang sudah benar ada di cleanox-app: `api/web/controllers/posMaster.controller.js` → `upsertServicePrice()`.

## Goal
- Setiap create/update Master Service di Superapp ikut menulis (upsert) baris di `mst_service_prices` agar harga kebawa ke POS.
- Layanan lama yang sudah ada di `mst_services` tapi belum punya baris harga ikut di-backfill.
- Delete service di Superapp tidak gagal karena FK `mst_service_prices` (`ON DELETE NO ACTION`).

## Detailed Specifications

### Scope in
1. Backend Superapp: sync harga ke `mst_service_prices` pada create, update, delete.
2. Backfill one-shot untuk service yang sudah ada tanpa baris harga.
3. (Opsional ringan) Frontend Superapp: field opsional `coret_price` agar setara POS — **hanya jika disetujui**; default plan = **tidak menambah UI coret**, `coret_price` tetap `NULL` saat sync dari Superapp.

### Scope out
- Tidak mengubah cleanox-app `posMaster` / `PosPricesPage` (sudah benar).
- Tidak mengubah schema Prisma / migrasi baru (tabel sudah ada).
- Tidak menyamakan env `DB_NAME_CLEANOX` (`cleanox_pos` vs `cleanox_pos_prod`) di plan ini — hanya verifikasi manual di Risks.

### File yang diubah
1. `backend-superapp/controllers/Cleanox/masterServicesController.js`
   - Tambah helper internal `upsertServicePrice(serviceId, price, coretPrice = null)`:
     - SQL mirror pola cleanox-app:
       ```sql
       INSERT INTO mst_service_prices (service_id, price, coret_price, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))
       ON DUPLICATE KEY UPDATE
         price = VALUES(price),
         coret_price = VALUES(coret_price),
         updated_at = CURRENT_TIMESTAMP(0)
       ```
     - Pakai `safeCleanoxQuery`.
     - `price` dinormalisasi ke 2 desimal (`Number(Number(price).toFixed(2))`).
   - Ubah `createService`:
     - Setelah `INSERT INTO mst_services ...`, ambil `insertId` dari hasil query.
     - Catatan: `safeCleanoxQuery` mengembalikan hasil `mysql2` `[result, fields]`; `result.insertId` dipakai sebagai `serviceId`.
     - Panggil `upsertServicePrice(insertId, price, null)` (atau `req.body.coret_price` jika nanti frontend kirim).
     - Idealnya dalam urutan yang aman: insert service dulu, lalu upsert price; jika upsert gagal, return 500 (dan log). Transaction penuh opsional; jika `safeCleanoxQuery` tidak expose connection transaction dengan mudah, gunakan dua query berurutan seperti pola saat ini + pastikan upsert selalu dipanggil.
   - Ubah `updateService`:
     - Setelah `UPDATE mst_services SET ... price = ? ...`, panggil `upsertServicePrice(id, price, coretPrice)`.
     - Jika body punya `coret_price` (number atau null), ikutkan; jika field tidak dikirim, **pertahankan** `coret_price` existing:
       - Implementasi aman: baca `coret_price` existing dulu bila `req.body.coret_price === undefined`, lalu upsert dengan nilai existing; jika dikirim `null`/angka, pakai nilai baru.
       - Untuk scope minimum tanpa UI coret: selalu upsert `price` saja dan **jangan overwrite `coret_price` jadi null** — gunakan:
         ```sql
         ON DUPLICATE KEY UPDATE
           price = VALUES(price),
           updated_at = CURRENT_TIMESTAMP(0)
         ```
         untuk path update tanpa `coret_price` di body; atau pada insert set `coret_price = NULL`.
       - Keputusan exact (scope minimum yang disetujui):
         - **create**: `INSERT ... price, coret_price NULL`
         - **update**: upsert update kolom `price` saja (jangan set `coret_price = NULL` jika sebelumnya sudah diisi dari POS).
   - Ubah `deleteService`:
     - Sebelum `DELETE FROM mst_services`, jalankan `DELETE FROM mst_service_prices WHERE service_id = ?`.
     - (Opsional konsisten) juga bersihkan `mst_service_promos` untuk `service_id` yang sama agar FK promo tidak memblokir — cek apakah Superapp delete pernah gagal; jika ada FK promo, hapus `mst_service_promos` dulu juga.
   - Ubah `initDb` (opsional tapi direkomendasikan):
     - Setelah ensure table `mst_services`, jalankan backfill sekali:
       ```sql
       INSERT INTO mst_service_prices (service_id, price, created_at, updated_at)
       SELECT s.id, s.price, COALESCE(s.created_at, CURRENT_TIMESTAMP(0)), COALESCE(s.updated_at, CURRENT_TIMESTAMP(0))
       FROM mst_services s
       LEFT JOIN mst_service_prices sp ON sp.service_id = s.id
       WHERE sp.id IS NULL
       ```
     - Ini memperbaiki baris seperti `test cuci` tanpa script manual.

2. `frontend-superapp/src/pages/cleanox-management/components/MasterService.jsx`
   - **Tidak diubah** pada scope minimum (harga sudah dikirim di `payload.price`).
   - Tidak menambah field Harga Coret di UI pada plan ini.

### Perilaku yang diharapkan setelah fix
| Aksi Superapp | `mst_services.price` | `mst_service_prices.price` | POS Prices UI |
|---------------|----------------------|----------------------------|---------------|
| Create layanan + harga | terisi | terisi (sama) | tampil Rp … |
| Update harga | terisi | ter-update | tampil harga baru |
| Create tanpa menyentuh coret | — | `coret_price` NULL | Harga Coret `—` (normal) |
| Update harga setelah POS isi coret | terisi | price update, coret tetap | Harga Coret tetap |

### Function / symbol names (exact)
- File: `backend-superapp/controllers/Cleanox/masterServicesController.js`
- Baru: `upsertServicePrice(serviceId, price)` (internal, tidak di-export) — atau `upsertServicePrice(serviceId, price, { coretPrice, updateCoret })` jika perlu.
- Diubah: `createService`, `updateService`, `deleteService`, `initDb`.

## Implementation Checklist
1. [x] Buka `backend-superapp/controllers/Cleanox/masterServicesController.js`.
2. [x] Tambah helper `upsertServicePrice(serviceId, price)` yang `INSERT ... ON DUPLICATE KEY UPDATE` ke `mst_service_prices` (kolom `price` wajib; `coret_price` hanya di-set saat create sebagai `NULL`, tidak di-null-kan saat update).
3. [x] Ubah `createService`: tangkap `insertId` dari hasil `INSERT INTO mst_services`, lalu panggil `upsertServicePrice(insertId, price)`.
4. [x] Ubah `updateService`: setelah update `mst_services`, panggil `upsertServicePrice(id, price)` dengan SQL update yang **hanya** mengubah `price` (+ `updated_at`), tidak menimpa `coret_price` existing.
5. [x] Ubah `deleteService`: hapus dulu `mst_service_prices` (dan `mst_service_promos` jika perlu) untuk `service_id`, baru `DELETE FROM mst_services`.
6. [x] Tambah backfill di `initDb`: insert ke `mst_service_prices` untuk semua `mst_services` yang belum punya baris harga (copy dari `s.price`).
7. [x] Pastikan tidak ada perubahan di frontend MasterService (payload `price` sudah ada).
8. [ ] Verifikasi manual: buat layanan baru di Superapp → cek POS Prices harga muncul; edit harga di Superapp → POS ikut; layanan lama (`test cuci`) setelah restart/init backfill → harga muncul dari `mst_services.price`.
9. [ ] Verifikasi: hapus layanan uji yang punya baris `mst_service_prices` tidak error 500.

## Risks / Catatan
- **Env DB beda**: Superapp lokal `DB_NAME_CLEANOX=cleanox_pos`, cleanox-app `cleanox_pos_prod`. Sync kode hanya efektif jika keduanya mengarah ke DB yang sama saat uji. Verifikasi `DB_NAME_CLEANOX` sebelum test end-to-end.
- **Harga Coret**: tidak dikelola di Superapp pada scope ini; tetap bisa diisi lewat POS.
- **Delete + FK**: tanpa hapus `mst_service_prices` / `mst_service_promos` dulu, delete bisa gagal setelah sync aktif.
- **Tidak ada migrasi Prisma**: backfill runtime di `initDb` cukup; hindari migrasi ganda di dua repo.
- **Dual write**: `mst_services.price` tetap diisi (kompatibilitas Superapp list + legacy); source of truth POS tetap `mst_service_prices`.
