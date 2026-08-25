# Plan: Kasbon & Pinjaman Cleanox (Mobile Worker + Approval Superapp)

## Context
- Cleanox belum punya kasbon/pinjaman. Acuan: IKM (`frontend-ikm` KasbonPage + `frontend-superapp` KasbonPinjaman + tabel `tr_kasbon` / `tr_kasbon_payment`).
- Pola dual-surface Cleanox yang sudah ada: leave (`mobile-leave` di cleanox-app + `/cleanox/leaves` di backend-superapp).
- Keputusan user:
  - Mobile worker di **cleanox-app** + approval di **Cleanox management superapp**
  - Cutoff **26→25** sama IKM
  - Pinjaman + pencatatan cicilan sama IKM
  - Approval: **semua user yang bisa akses Cleanox management** (tanpa whitelist employee seperti IKM 42/43/45)

## Goal
- Worker bisa ajukan/edit/hapus (saat `pengajuan`) kasbon & pinjaman + lihat riwayat + cicilan pinjaman.
- Admin Cleanox superapp bisa list/filter per cutoff, ubah status (`pengajuan→proses→disetujui/ditolak`), set `amount_approved`, catat/hapus pembayaran pinjaman.
- Data tersimpan di DB Cleanox (bukan DB IKM).

## Detailed Specifications

### A. Database — `cleanox-app` (Prisma)

#### Model: `tr_worker_kasbon`
| Field | Type | Notes |
|---|---|---|
| `id` | Int `@id @default(autoincrement())` | |
| `worker_id` | Int | karyawan Cleanox |
| `type` | String `@db.VarChar(20)` | `kasbon` \| `pinjaman` |
| `submission_date` | DateTime `@db.Date` | |
| `amount_requested` | Decimal `@db.Decimal(15, 2)` | |
| `amount_approved` | Decimal? `@db.Decimal(15, 2)` | set saat disetujui |
| `purpose` | String `@db.VarChar(1000)` | |
| `notes` | String? `@db.VarChar(1000)` | |
| `proof_file` | String? `@db.VarChar(255)` | |
| `proof_path` | String? `@db.VarChar(500)` | |
| `status` | String `@default("pengajuan")` `@db.VarChar(20)` | `pengajuan` \| `proses` \| `disetujui` \| `ditolak` |
| `process_note` | String? `@db.VarChar(1000)` | |
| `process_by` | Int? | |
| `process_by_name` | String? `@db.VarChar(255)` | |
| `process_at` | DateTime? `@db.DateTime(0)` | |
| `approved_note` | String? `@db.VarChar(1000)` | |
| `approved_by` | Int? | |
| `approved_by_name` | String? `@db.VarChar(255)` | |
| `approved_at` | DateTime? `@db.DateTime(0)` | |
| `rejection_note` | String? `@db.VarChar(1000)` | |
| `created_at` / `updated_at` | Timestamp | |

Indexes: `worker_id`, `status`, `type`, `submission_date`, relation `payments`.

#### Model: `tr_worker_kasbon_payment`
| Field | Type | Notes |
|---|---|---|
| `id` | Int `@id` | |
| `kasbon_id` | Int | FK → `tr_worker_kasbon.id` `onDelete: Cascade` |
| `payment_date` | DateTime `@db.Date` | |
| `amount` | Decimal `@db.Decimal(15, 2)` | |
| `payment_method` | String `@db.VarChar(50)` | default `potong_gaji` (nilai: `potong_gaji`, `transfer`, `tunai`, `lainnya`) |
| `notes` | String? `@db.VarChar(1000)` | |
| `recorded_by` | Int? | |
| `recorded_by_name` | String? `@db.VarChar(255)` | |
| `created_at` | Timestamp | |

#### Migration
- File: `prisma/migrations/YYYYMMDDHHMMSS_worker_kasbon/migration.sql` (+ update `schema.prisma`)
- Env storage: `CLEANOX_KASBON_DIR` (fallback: sibling dari attendance dir / `src/assets/worker-kasbon`)

### B. Mobile API — `cleanox-app`

#### Files
- `api/mobile/controllers/mobileKasbon.controller.js`
- `api/mobile/routes/mobileKasbon.routes.js`
- Register di `server.js`: `app.use('/api/mobile-kasbon', mobileKasbonRoutes)`

#### Auth
- `authenticate` + `requireMobileWorker` (`company_id === 3`) — mirror leave.

#### Endpoints
| Method | Path | Behavior |
|---|---|---|
| `GET` | `/my-submissions?startDate&endDate` | List milik `req.user.employee_id` di range tanggal; default FE kirim cutoff 26–25 |
| `GET` | `/:id` | Detail milik sendiri + `payments[]` + `total_paid` + `remaining` (pinjaman) |
| `POST` | `/` | Multipart: `type`, `submission_date`, `purpose`, `amount_requested`, `notes?`, `proof_doc?` → status `pengajuan` |
| `PUT` | `/:id` | Edit hanya jika owner + status `pengajuan`; boleh ganti bukti / `remove_proof` |
| `DELETE` | `/:id` | Cancel/hapus hanya jika owner + status `pengajuan` |
| `GET` | `/proofs/:filename` | Serve proof dengan auth |

Upload: multer memory + compress image (atau terima PDF jika perlu — **pilih: image saja dulu seperti leave doctor note**, max 5MB; mirror IKM mobile yang kirim foto). Field name `proof_doc`.

### C. Superapp API — `backend-superapp`

#### Files
- `controllers/Cleanox/kasbonCleanoxController.js`
- `routes/Cleanox/kasbonCleanoxRoutes.js`
- Register: `app.use("/cleanox/kasbon", kasbonCleanoxRoutes)` di `index.js`
- Upload middleware: `uploadCleanoxKasbon` di `middleware/upload.js` (dir dari `CLEANOX_KASBON_DIR` / assets kasbon cleanox), gambar+PDF 10MB opsional admin create

#### Auth
- `requireAuth` saja — **tanpa** `restrictKasbonAccess` whitelist. Akses halaman sudah digate `appRoles["/cleanox-management-system"]`.

#### Endpoints
| Method | Path | Behavior |
|---|---|---|
| `GET` | `/` | List + filter `type`, `status`, `startDate`, `endDate`, `search`, `employeeId`, pagination; join nama dari `mst_employee`; stats aggregate; `total_paid`/`remaining` untuk pinjaman disetujui; cutoff accum map per employee (opsional mirror IKM) |
| `GET` | `/employee-options` | Karyawan Cleanox company_id=3 + ada di `mst_role` |
| `GET` | `/employee-summary` | Ringkasan per karyawan di periode (kasbon_total, pinjaman_total, paid, remaining) |
| `GET` | `/:id` | Detail + payments |
| `POST` | `/` | Admin create manual (opsional parity IKM) — **ikutkan** agar toolbar Tambah bisa dipakai |
| `PUT` | `/:id` | Update field dasar (admin) |
| `PUT` | `/:id/status` | Transisi status + notes + `amount_approved` wajib saat `disetujui` |
| `DELETE` | `/:id` | Hapus record (+ file proof) |
| `POST` | `/:id/payment` | Hanya `type=pinjaman` + `status=disetujui` |
| `DELETE` | `/:id/payment/:paymentId` | Hapus cicilan |
| `GET` | `/proofs/:filename` | Serve proof |

Status transition rules (sama IKM):
- Dari `pengajuan` → `proses` \| `disetujui` \| `ditolak`
- Dari `proses` → `disetujui` \| `ditolak`
- `disetujui`/`ditolak` tidak mundur di UI admin (kecuali edit data terpisah — tidak unlock status mundur)

### D. Mobile FE — `cleanox-app`

#### Files
- Baru: `src/mobile/pages/MobileWorkerKasbonPage.jsx` (konsep UI mirror IKM KasbonPage: tab Form / Riwayat, tipe kasbon|pinjaman, cutoff default history, expand payments)
- Update: `src/mobile/routes.jsx` → `/mobile-worker/kasbon`
- Update: `src/mobile/pages/MobileWorkerHomePage.jsx` → tambah menu item **Kasbon & Pinjam** (setelah Izin/Cuti), icon Banknote/Wallet, `requiresMorningUnlock: false`

#### Behavior
- Form: type, tanggal, purpose, amount, notes, proof camera/gallery
- History: filter date range default `getCutoffRange()` 26–25; status badge; edit/delete hanya `pengajuan`; pinjaman disetujui tampil remaining + list payment
- Styling Cleanox (bukan purple IKM) — ikuti shell mobile Cleanox existing (hijau/navy brand)

### E. Superapp FE — `frontend-superapp`

#### Files
- Baru: `src/pages/cleanox-management/components/KasbonPinjamanCleanox.jsx`
  - Layout mirror IKM KasbonPinjaman tapi shell Cleanox (navy `#1b3459`): filter periode cutoff/today/custom, StatCards, tabel, status modal, detail drawer (tracking + pembayaran), Tambah/Edit/Delete, Download Excel
- Baru (opsional util): `src/pages/cleanox-management/utils/exportKasbonCleanoxExcel.js` (adaptasi dari `exportKasbonExcel.js`)
- Update: `src/pages/cleanox-management/index.jsx` — Menu Karyawan tambah item:
  - `to: /cleanox-management-system/kasbon-pinjaman`
  - `label: Kasbon & Pinjaman`
  - `description: Approval kasbon dan pinjaman karyawan`
  - icon `HiOutlineBanknotes`
  - posisi: setelah Report Area Kebersihan
- Update: `src/App.jsx` — route di dalam ProtectedRoute Cleanox management

#### Approval access
- **Tidak** ada filter `canAccessKasbon` whitelist di sidebar Cleanox (beda dari IKM). Semua yang sudah masuk Cleanox management bisa melihat menu & approve.

### F. Tidak di-scope
- Integrasi payroll otomatis potong gaji
- Notifikasi push
- Rename/reuse tabel IKM
- Whitelist employee ID
- Kasbon di bottom nav (cukup entry Home menu, seperti Izin/Cuti)

## Implementation Checklist
1. Tambah model Prisma `tr_worker_kasbon` + `tr_worker_kasbon_payment` di `cleanox-app/prisma/schema.prisma`.
2. Buat migration SQL `worker_kasbon` dan pastikan `migration_lock.toml` konsisten.
3. Buat `api/mobile/controllers/mobileKasbon.controller.js` (CRUD worker-scoped + serve proof + payments read).
4. Buat `api/mobile/routes/mobileKasbon.routes.js` + daftarkan `/api/mobile-kasbon` di `server.js`.
5. Buat `controllers/Cleanox/kasbonCleanoxController.js` di backend-superapp (list/summary/status/payment/create/update/delete/proof).
6. Buat `routes/Cleanox/kasbonCleanoxRoutes.js` + `uploadCleanoxKasbon` di middleware upload; mount `/cleanox/kasbon` di `index.js`.
7. Buat `MobileWorkerKasbonPage.jsx` (form + riwayat cutoff + edit/hapus pengajuan + expand pembayaran).
8. Daftarkan route `/mobile-worker/kasbon` di `src/mobile/routes.jsx`.
9. Tambah menu Home **Kasbon & Pinjam** di `MobileWorkerHomePage.jsx`.
10. Buat `KasbonPinjamanCleanox.jsx` (+ util export Excel) dengan periode cutoff, StatCard, approval status, cicilan pinjaman.
11. Tambah menu sidebar Cleanox **Kasbon & Pinjaman** di Menu Karyawan + route di `App.jsx`.
12. Verifikasi E2E: worker ajukan → muncul di superapp → proses → setujui (isi amount) → catat cicilan → worker lihat remaining; cutoff 26–25; user non-whitelist tetap bisa approve selama akses Cleanox management; worker tidak bisa edit setelah status berubah.

## Risks / Catatan
- Dua service menulis/membaca DB Cleanox yang sama (`cleanox-app` mobile API + `backend-superapp`) — pastikan env `CLEANOX_KASBON_DIR` konsisten di kedua sisi agar proof file terbaca.
- `amount_approved` boleh ≤ atau ≠ `amount_requested` (admin menentukan) — mirror IKM, jangan hard-force equal.
- Decimal uang: simpan Decimal(15,2); FE kirim integer rupiah tanpa koma.
- Scope besar: kerjakan berurutan schema → mobile API → superapp API → mobile FE → superapp FE.
