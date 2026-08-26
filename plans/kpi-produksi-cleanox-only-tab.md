# Plan: KPI Produksi — Tab Cleanox by Waschen + Cleanox Only

## Context
- Halaman Super App `KPI Produksi Cleanox` (`KpiProduksiCleanox.jsx`) saat ini hanya satu sumber: **Cleanox by Waschen** via `GET /kpi/*` → `cleanoxPool` → tabel `tr_rekap_transaksi_reguler_waschen`.
- Cleanox Only (POS) sudah ada di DB yang sama (`DB_NAME_CLEANOX=cleanox_pos`) pada tabel `tr_transactions`, `tr_transaction_items`, `tr_worker_assignments`, `tr_takehome_progress`.
- Kebutuhan: tab baru di page yang sama, **style UI mirip**, periode cutoff **sama (26–25)**, data Only mencakup **home_service + take_home**, **tanpa filter outlet** di tab Only, **widget SLA Only ditunda**.

## Goal
- Menambah tab sumber: **Cleanox by Waschen** | **Cleanox Only** pada page KPI yang sama.
- Tab Waschen: perilaku & API tetap seperti sekarang (termasuk outlet + SLA).
- Tab Only: agregasi KPI style yang sama (statistik tahap, harian, aging, top layanan, leaderboard/detail) dari data POS; tanpa outlet; tanpa blok SLA.
- Tidak menambah menu/route sidebar baru; tetap `/cleanox-management-system/kpi`.

## Detailed Specifications

### Keputusan mapping (dikunci di plan)
Label UI tetap 4 tahap Waschen: `Pickup`, `Cuci & Jemur`, `Packing`, `Pengantaran` (keys: `pickup`, `cuci_jemur`, `packing`, `pengantaran`).

**Take-home** (`tr_takehome_progress`):
| UI key | Sumber |
|---|---|
| pickup | `diambil_by` / `diambil_at` |
| cuci_jemur | `dicuci_by` / `dicuci_at` |
| packing | `packing_by` / `packing_at` |
| pengantaran | `pengantaran_by` / `pengantaran_at` jika ada; jika belum ada `pengantaran_*` tapi ada `diantar_*`, hitung sebagai pengantaran (fallback) |

Catatan: stage operasional `diantar` tidak punya kartu sendiri; hanya fallback untuk `pengantaran` dan boleh dipakai di aging intermediate `packing → delivery` jika `pengantaran_at` kosong (`diantar_at` sebagai proxy end).

**Home service** (`tr_worker_assignments`, status ≠ `Rejected`/`Cancelled`/`Replaced`):
| UI key | Sumber |
|---|---|
| pickup | `arrival_at` (fallback `started_at` jika `arrival_at` null) |
| cuci_jemur | `before_photo_at` |
| packing | `after_photo_at` |
| pengantaran | `completed_at` (atau `assignment_status = 'Done'`) |

**Periode Only:** `DATE(t.service_date) BETWEEN date_start AND date_end` — `date_start`/`date_end` dari cutoff FE yang sama (`cutoffStart`/`cutoffEnd` / custom).

**Filter transaksi Only:** `t.status <> 'Cancelled'`.

**Unit overall Only:**
- `total_items` = jumlah transaksi non-cancelled di periode.
- `*_done` = jumlah transaksi yang stage-nya terisi (take_home via progress; home_service via **minimal 1** assignment yang punya timestamp mapped).

**Leaderboard Only:**
- Take-home: parse JSON `*_by` (skip kosong / `"Admin"`), credit ke key UI mapped.
- Home service: credit `employee_name` per stage yang timestamp-nya terisi (1 credit per assignment per stage).
- Shape response sama: `{ name, pickup, cuci_jemur, packing, pengantaran, total, rank }`.

**Top services Only:** dari `tr_transaction_items` + `mst_services.name` + `line_total`; cycle hours: `pickup`-mapped start → `pengantaran`-mapped end per transaksi (ambil min start / max end dari progress atau assignments).

**Aging Only:** hitung jam antar timestamp mapped per transaksi (ambil earliest start / latest end antar assignment untuk home_service; langsung dari progress untuk take_home). Stages aging keys tetap: `pickup_to_cuci_jemur`, `cuci_jemur_to_packing`, `packing_to_delivery`, `pickup_to_delivery`.

**Daily stage Only:** bucket per `toLocalDateKey` dari timestamp mapped (sama pola Waschen).

**SLA Only:** tidak dihitung; response `insights.sla = null`; FE tidak render blok SLA di tab Only.

**Outlet Only:** tidak ada query/filter outlet; FE sembunyikan dropdown Outlet.

### Backend — file

#### 1. `D:\Alora Group Indonesia\backend-superapp\controllers\Cleanox\kpiProduksiController.js`
- Pertahankan semua handler Waschen existing tanpa ubah kontrak default.
- Tambah konstanta/helper Only:
  - `ONLY_CANCELLED_STATUS = 'Cancelled'`
  - `mapTakehomeStageToKpi(stage)` / reverse mapping object
  - `getHomeServiceStageTimestamps(assignmentRow)` → `{ pickup, cuci_jemur, packing, pengantaran }`
  - `getTakehomeStageTimestamps(progressRow)` → timestamps + by-lists untuk 4 key UI (dengan fallback diantar→pengantaran)
  - Reuse helper existing: `parseJson`, `parseDate`, `toLocalDateKey`, `diffHours`, `summarizeHours`, `normalizeServiceName`
- Tambah exports:
  - `getKpiOnlySummary`
  - `getKpiOnlyDetail`
  - `getKpiOnlyAvailablePeriods`
- **Tidak** menambah `getKpiOnlyOutlets`, `getSlaItems` Only, `exportSlaItems` Only di fase ini.

##### `getKpiOnlySummary(req, res)`
- Query params wajib: `date_start`, `date_end`.
- Abaikan `outlet` jika terkirim.
- Query A — transaksi + mode:
  ```sql
  SELECT t.id, t.transaction_no, t.customer_name, t.service_date, t.service_mode,
         t.status, t.final_amount
  FROM tr_transactions t
  WHERE DATE(t.service_date) BETWEEN DATE(?) AND DATE(?)
    AND t.status <> 'Cancelled'
  ```
- Query B — takehome progress untuk `id IN (...)` mode take_home.
- Query C — assignments untuk `id IN (...)` mode home_service:
  ```sql
  SELECT id, transaction_id, employee_name, assignment_status,
         started_at, arrival_at, before_photo_at, after_photo_at, completed_at
  FROM tr_worker_assignments
  WHERE transaction_id IN (?)
    AND assignment_status NOT IN ('Rejected', 'Cancelled', 'Replaced')
  ```
- Query D — items + service name untuk top services:
  ```sql
  SELECT i.transaction_id, i.line_total, COALESCE(s.name, 'Tanpa Nama Item') AS service_name
  FROM tr_transaction_items i
  INNER JOIN tr_transactions t ON t.id = i.transaction_id
  LEFT JOIN mst_services s ON s.id = i.service_id
  WHERE DATE(t.service_date) BETWEEN DATE(?) AND DATE(?)
    AND t.status <> 'Cancelled'
  ```
- Agregasi in-memory → response shape **identik** Waschen summary:
  ```json
  {
    "summary": [ { "name", "pickup", "cuci_jemur", "packing", "pengantaran", "total", "rank" } ],
    "overall": { "total_items", "pickup_done", "cuci_jemur_done", "packing_done", "pengantaran_done" },
    "insights": {
      "daily_stage": [...],
      "aging_processing_hours": [...],
      "top_services": [...],
      "sla": null
    }
  }
  ```

##### `getKpiOnlyDetail(req, res)`
- Params wajib: `employee_name`, `date_start`, `date_end`.
- Kumpulkan item kerja di mana employee terlibat di salah satu stage mapped (takehome JSON contains name ATAU assignment.employee_name match + stage timestamp ada).
- Response shape mirip Waschen detail:
  ```json
  {
    "employee_name": "...",
    "items": [
      {
        "id", "invoice", "outlet": null, "customer_name", "item_name",
        "jumlah": null, "satuan_item": null, "status", "tgl_terima", "tgl_selesai": null,
        "stage", "date"
      }
    ]
  }
  ```
  - `invoice` = `transaction_no`
  - `tgl_terima` = `service_date`
  - `item_name` = daftar nama service di transaksi (GROUP_CONCAT / join items) atau `"Transaksi Cleanox Only"`
  - `outlet` selalu `null`

##### `getKpiOnlyAvailablePeriods(req, res)`
- Mirip Waschen periods logic, tapi dari `service_date` + **tanpa** filter `nama_item LIKE cleanox/karpet`.
- Tetap pakai aturan cutoff bulan: day >= 26 masuk periode bulan berikutnya (copy logika CASE dari `getAvailablePeriods` Waschen, ganti kolom ke `service_date`).
- Pastikan periode aktif Jakarta ikut di-push jika belum ada di rows.
- Response: `{ periods: [ { yr, mo } ] }`.

#### 2. `D:\Alora Group Indonesia\backend-superapp\routes\Cleanox\kpiProduksiRoutes.js`
Tambah route (tetap `requireAuth`):
- `GET /only/summary` → `getKpiOnlySummary`
- `GET /only/detail` → `getKpiOnlyDetail`
- `GET /only/available-periods` → `getKpiOnlyAvailablePeriods`

Mount tetap `app.use("/kpi", ...)` → path penuh:
- `/kpi/only/summary`
- `/kpi/only/detail`
- `/kpi/only/available-periods`

#### 3. `D:\Alora Group Indonesia\backend-superapp\db\pool.js`
- **Tidak diubah** — Only memakai `cleanoxPool` yang sama.

#### 4. `D:\Alora Group Indonesia\backend-superapp\index.js`
- **Tidak diubah** (mount `/kpi` sudah ada).

### Frontend — file

#### 5. `D:\Alora Group Indonesia\frontend-superapp\src\pages\cleanox-management\components\KpiProduksiCleanox.jsx`
- State baru: `dataSource` = `"waschen" | "only"` (default `"waschen"`).
- UI tab di bawah hero / di atas filter card (style pill mirip tab yang sudah dipakai di cleanox-app dashboard / konsisten warna `#1b3459`):
  - label: `Cleanox by Waschen`, `Cleanox Only`
- Saat `dataSource === "only"`:
  - Sembunyikan dropdown Outlet; set `selectedOutlet` ke `""` saat switch ke only.
  - Init periods dari `GET /kpi/only/available-periods` (bukan `/kpi/available-periods`).
  - Summary dari `GET /kpi/only/summary?date_start&date_end` (tanpa outlet).
  - Detail employee dari `GET /kpi/only/detail?...`.
  - **Jangan** render section SLA (`insights.sla` / klik SLA).
  - Jangan call `/kpi/outlets`, `/kpi/sla-items`, export SLA.
- Saat `dataSource === "waschen"`:
  - Perilaku existing penuh (outlets, periods waschen, summary, SLA, dll.).
- Saat ganti tab: reset `selectedEmployee`, `slaCategory`; refetch periods + summary sesuai sumber; pertahankan year/month jika masih valid di periods baru, else ambil `periods[0]`.
- Copy hero subtitle boleh dinamis singkat per tab; layout statistik/widget/leaderboard **tidak diubah strukturnya**.
- Modal detail: toleransi `outlet: null` (tampil `-` jika kosong).

#### 6. File yang TIDAK diubah
- `frontend-superapp/src/App.jsx` (route KPI tetap)
- `frontend-superapp/src/pages/cleanox-management/index.jsx` (menu tetap satu KPI)
- Prisma / migrasi (tidak ada schema baru)

### Response / kontrak FE yang harus tetap kompatibel
- `overall`, `summary`, `insights.daily_stage`, `insights.aging_processing_hours`, `insights.top_services` — keys sama.
- `insights.sla` Only = `null` → FE sudah punya cabang `insights.sla && (...)` (pastikan tidak error).

## Implementation Checklist
1. [ ] Di `kpiProduksiController.js`, tambah helper mapping take-home → 4 key KPI (termasuk fallback `diantar` → `pengantaran`).
2. [ ] Di `kpiProduksiController.js`, tambah helper mapping home-service assignment timestamps → 4 key KPI.
3. [ ] Implement `getKpiOnlyAvailablePeriods` (cutoff logic pada `service_date`) + export.
4. [ ] Implement `getKpiOnlySummary` (query transaksi/progress/assignments/items + agregasi overall/daily/aging/top_services/summary; `sla: null`).
5. [ ] Implement `getKpiOnlyDetail` (items per employee, shape mirip Waschen, `outlet: null`).
6. [ ] Update `kpiProduksiRoutes.js`: daftarkan `GET /only/summary`, `/only/detail`, `/only/available-periods` dengan `requireAuth`.
7. [ ] Di `KpiProduksiCleanox.jsx`, tambah state `dataSource` + UI tab Waschen / Only.
8. [ ] Wire init fetch periods/outlets bergantung `dataSource` (Only: periods only-endpoint; Waschen: periods + outlets).
9. [ ] Wire `fetchSummary` ke `/kpi/only/summary` vs `/kpi/summary`; hilangkan param outlet di Only.
10. [ ] Sembunyikan filter Outlet saat `dataSource === "only"`; clear outlet on switch.
11. [ ] Sembunyikan seluruh blok SLA + disable SLA modal/export saat Only.
12. [ ] Wire detail employee modal ke `/kpi/only/detail` saat Only; tampilkan outlet sebagai `-` jika null.
13. [ ] Pastikan ganti tab mereset selection modal dan me-refetch data dengan cutoff yang sama.
14. [ ] Smoke-check manual: tab Waschen masih outlet+SLA; tab Only tanpa outlet/SLA; periode cutoff 26–25; home_service + take_home masuk angka.

## Risks / Catatan
- Home service tidak punya stage produksi asli 4 kolom; mapping ke timestamp assignment adalah **proksi** agar UI Waschen bisa dipakai — dokumentasikan di PR/commit.
- Take-home punya 5 stage; `diantar` digabung/fallback ke `pengantaran` agar tetap 4 kartu.
- `total_items` Only = jumlah transaksi (bukan baris item), sedangkan Waschen = baris rekap item — angka antar-tab tidak apple-to-apple; diterima di fase ini.
- Pool DB: `cleanox_pos` via `cleanoxPool`; tidak ada `cleanox_prod` di env repo.
- SLA Only sengaja out of scope; jangan implement stub palsu di FE.
- Performa: beberapa query IN-list; OK untuk volume POS saat ini (sama pola in-memory Waschen).
