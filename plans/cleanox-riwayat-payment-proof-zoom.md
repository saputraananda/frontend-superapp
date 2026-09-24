# Plan: Bukti Pembayaran di Riwayat Transaksi SuperApp + Scroll Zoom

## Context
- Halaman `RiwayatTransaksiCleanox` menampilkan list POS; **belum** ada kolom bukti pembayaran.
- Bukti ada di DB `tr_transaction_payment_proofs` + file di `cleanox-app/src/assets/transaction-payment-proofs/` (via `UPLOAD_BASE_DIR`).
- Cleanox Only sudah serve: `GET /pos-transactions/payment-proof/:filename`.
- SuperApp belum serve file bukti POS; pola referensi foto: Absensi (`AuthenticatedImage` + `PhotoViewerModal`).
- Keputusan user:
  - Hanya **bukti pembayaran**.
  - Zoom: **scroll wheel** zoom in/out di modal.
  - Jika >1 bukti: **tampilkan semua** thumbnail.

## Goal
- Kolom **Bukti** di tabel Riwayat menampilkan semua thumbnail bukti pembayaran transaksi.
- Klik thumbnail → modal full-size dengan **scroll zoom in/out**.
- Backend list mengirim metadata bukti + endpoint serve file via SuperApp auth.

## Locked Business Rules

| Rule | Value |
|------|--------|
| Sumber | `tr_transaction_payment_proofs` saja (bukan customer photo / evidence kerja) |
| Upload dari SuperApp | **Tidak** (read-only tampilan) |
| Tampil di tabel | **Semua** bukti per row (urutan `sort_order ASC, id ASC`) |
| Tanpa bukti | Tampil `-` atau placeholder kosong |
| Max bukti | 10 (sudah di POS); UI tampil semua yang ada |
| URL serve | `/cleanox/riwayat-transaksi/payment-proofs/:filename` + `requireAuth` |
| Path disk | `CLEANOX_PAYMENT_PROOF_DIR` env, fallback `CLEANOX_BASE_DIR/transaction-payment-proofs` |
| Zoom | Wheel scroll di modal: scale naik/turun; clamp **0.5 – 4**; reset scale saat ganti foto / tutup |
| Tutup modal | Escape, klik overlay, tombol X |
| Navigasi multi-bukti di modal | Optional: klik thumbnail lain di baris = buka foto itu; **tidak wajib** prev/next di modal v1 |
| Export Excel | **Tidak** diubah (tetap 6 kolom tanpa gambar) |
| Out of scope | Upload/hapus bukti, evidence before/after, Smartlink |

### Response shape tambahan per transaksi

```js
payment_proofs: [
  {
    id: number,
    photo_file: string,
    url: "/cleanox/riwayat-transaksi/payment-proofs/<basename>",
  },
]
```

## Detailed Specifications

### 1. Backend — `middleware/upload.js`
- Tambah export:
  ```js
  export const CLEANOX_PAYMENT_PROOF_DIR = process.env.CLEANOX_PAYMENT_PROOF_DIR
    ? path.resolve(process.env.CLEANOX_PAYMENT_PROOF_DIR)
    : CLEANOX_BASE
      ? path.join(CLEANOX_BASE, "transaction-payment-proofs")
      : null;
  ```
- Jika dir ada di env/base: `mkdirSync` recursive jika belum ada (konsisten folder lain). **Jangan** create di dalam list query.

### 2. Backend — `controllers/Cleanox/riwayatTransaksiCleanoxController.js`
- Import `fs`, `path`, `CLEANOX_PAYMENT_PROOF_DIR`.
- Helper `buildPaymentProofUrl(photoFile)` → `/cleanox/riwayat-transaksi/payment-proofs/${encodeURIComponent(basename)}`.
- Setelah fetch rows transaksi:
  - Kumpulkan `ids`.
  - Jika `ids.length > 0`:
    ```sql
    SELECT id, transaction_id, photo_file, sort_order
    FROM tr_transaction_payment_proofs
    WHERE transaction_id IN (?)
    ORDER BY sort_order ASC, id ASC
    ```
  - Group by `transaction_id` → map ke array `payment_proofs` di tiap item `data`.
- Export baru `servePaymentProof(req, res)`:
  - Mirror kasbon `serveProof`: basename aman, resolve path di `CLEANOX_PAYMENT_PROOF_DIR`, cek prefix dir, `sendFile`, Cache-Control private.
  - 500 jika dir belum dikonfigurasi; 404 jika file tidak ada.

### 3. Backend — `routes/Cleanox/riwayatTransaksiCleanoxRoutes.js`
- `GET /payment-proofs/:filename` → `requireAuth`, `servePaymentProof` (**daftar sebelum** route lain yang bentrok; saat ini hanya `/` jadi aman).
- Tetap `GET /` → `listRiwayatTransaksi`.

### 4. Backend — `.env` (local)
- Tambah baris (path absolut ke folder cleanox-app):
  ```
  CLEANOX_PAYMENT_PROOF_DIR=D:\Alora Group Indonesia\cleanox-app\src\assets\transaction-payment-proofs
  ```
- Jika ada `.env.example`, dokumentasikan key yang sama (tanpa path machine-specific wajib; deskripsi saja).

### 5. Frontend — `RiwayatTransaksiCleanox.jsx`
- Tambah helpers lokal (copy pola Absensi, cukup di file ini — jangan extract shared util wajib):
  - `AuthenticatedImage` (fetch blob + credentials).
  - `PhotoThumb` (button thumbnail).
  - `PaymentProofViewerModal`:
    - Props: `{ url, label }` | null, `onClose`.
    - State `scale` (default 1).
    - `onWheel` pada container gambar: `preventDefault`, `deltaY < 0` → zoom in, else zoom out; `setScale(clamp(prev * factor, 0.5, 4))`.
    - Style gambar: `transform: scale(scale)`, `transformOrigin: center center`, `max-h`/`max-w` seperti Absensi.
    - Reset `scale` ke 1 saat `item` berubah / unmount.
    - Portal + overlay + Escape + X (sama Absensi).
- State `photoViewer`.
- Kolom tabel baru **Bukti** (setelah Nominal atau sebelum Nominal — lock: **setelah Pembayaran, sebelum Nominal**):
  - Flex wrap gap: map `row.payment_proofs` → `PhotoThumb` `h-10 w-10`.
  - `onOpen` → `setPhotoViewer({ url: proof.url, label: \`Bukti #${i+1} · ${row.transaction_no}\` })`.
  - Jika array kosong: `-`.
- Update `colSpan` empty/loading rows (+1).
- Render `<PaymentProofViewerModal item={photoViewer} onClose={...} />` di root page.

### 6. Out of scope
- Export Excel gambar
- Upload bukti dari SuperApp
- Zoom pinch touch (v1: wheel saja; touch optional nice-to-have **tidak** dikerjakan kecuali trivial)

## Implementation Checklist
1. [x] Tambah `CLEANOX_PAYMENT_PROOF_DIR` di `backend-superapp/middleware/upload.js` (+ mkdir jika base aktif).
2. [x] Tambah `CLEANOX_PAYMENT_PROOF_DIR=...` di `backend-superapp/.env` (path ke `transaction-payment-proofs` cleanox-app).
3. [x] Extend `listRiwayatTransaksi`: batch query proofs → `payment_proofs[]` per row.
4. [x] Implement `servePaymentProof` + route `GET /payment-proofs/:filename` di routes riwayat.
5. [x] Update `RiwayatTransaksiCleanox.jsx`: kolom Bukti (semua thumbnail), `AuthenticatedImage`/`PhotoThumb`, modal scroll-zoom.
6. [x] Smoke-check: transaksi dengan 0 / 1 / ≥2 bukti; klik → scroll zoom in/out; Escape tutup; file 404 tidak crash UI.

## Risks / Catatan
- Tanpa `CLEANOX_PAYMENT_PROOF_DIR` / `CLEANOX_BASE_DIR` yang benar, thumbnail error (placeholder) meski metadata ada di DB.
- Produksi: path disk harus sama dengan folder upload cleanox-app di server.
- List besar + banyak bukti: batch query 1x cukup; blob fetch per thumb bisa banyak request — acceptable untuk cutoff bulanan.
