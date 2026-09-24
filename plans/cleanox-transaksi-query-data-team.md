# Cleanox POS — Query & Sumber Data Transaksi (untuk Tim Data)

Dokumen observasi dari implementasi SuperApp + Cleanox POS (DB Cleanox via `safeCleanoxQuery`).

## 1. Pintu masuk data

| Layer | Keterangan |
|--------|------------|
| Database | DB Cleanox POS (`tr_transactions`, dll.) — **bukan** Smartlink Waschen |
| Backend SuperApp | `backend-superapp` → `safeCleanoxQuery` |
| API SuperApp | `/cleanox/riwayat-transaksi`, `/cleanox/pendapatan`, `/cleanox/piutang-dashboard` |
| UI SuperApp | Cleanox Management → Pendapatan / Piutang (rincian lunas memakai riwayat) |
| POS Cleanox | `cleanox-app` menulis transaksi ke tabel yang sama |

**Tanggal filter utama:** `DATE(service_date)` (tanggal layanan), **bukan** `created_at`.

**Cutoff billing (default mode Bulan):** tanggal **26 bulan sebelumnya → 25 bulan label** (sama Waschen).

---

## 2. Tabel inti

### `tr_transactions` (transaksi POS)

Kolom penting untuk hitungan:

| Kolom | Arti singkat |
|--------|----------------|
| `transaction_no` | No nota (NO NOTA) |
| `service_date` | Tanggal layanan (filter periode) |
| `final_amount` | Nominal akhir |
| `status` | `Scheduled`, `Assigned`, `In_Progress`, `Completed`, `Cancelled`, … |
| `payment_status` | `lunas` / `belum_lunas` (NULL/'' diperlakukan belum lunas di beberapa API) |
| `payment_settled_date` | Tanggal pelunasan (jika ada) |
| `payment_method_id` | → `mst_payment_method` |
| `service_mode` | `home_service` / `take_home` |
| `is_history_entry` | `1` = **input history** (catatan historis di POS); `0`/NULL = transaksi operasional biasa |
| `customer_name`, `customer_phone` | Snapshot customer |

### Relasi terkait

| Tabel | Dipakai untuk |
|--------|----------------|
| `mst_payment_method` | Label/group → kategori TUNAI / TF BANK |
| `tr_transaction_payment_proofs` | Bukti transfer (`photo_file`) |
| `mst_target_cleanox` | Target omzet bulanan (dashboard Pendapatan) |

---

## 3. Transaksi “berjalan” vs “history”

### Definisi di POS (`is_history_entry`)

| Jenis | Flag | Perilaku di POS / Mobile |
|--------|------|---------------------------|
| Transaksi operasional (agenda/worker) | `COALESCE(is_history_entry, 0) = 0` | Muncul di mobile tasks / mobile riwayat worker; bisa diubah layanan (aturan POS) |
| Entry **history** | `is_history_entry = 1` | Input khusus history di POS; **tidak** bisa ubah layanan; **diexclude** dari query mobile tasks & mobile riwayat |

### Perilaku SuperApp saat ini (penting untuk Tim Data)

API SuperApp **Pendapatan / Piutang / list riwayat** saat ini **belum memfilter** `is_history_entry`.

Artinya angka dashboard SuperApp = **semua baris** di `tr_transactions` yang lolos filter tanggal/status/pembayaran/mode — **termasuk** history entry, kecuali dibatalkan (`Cancelled`) sesuai rule masing-masing endpoint.

Jika Tim Data ingin memisahkan:

```sql
-- Hanya transaksi operasional (bukan history entry)
AND COALESCE(t.is_history_entry, 0) = 0

-- Hanya input history
AND COALESCE(t.is_history_entry, 0) = 1
```

---

## 4. Di mana data di-hit (API → query)

### A. List / rincian transaksi (termasuk rincian lunas Pendapatan)

| Item | Nilai |
|------|--------|
| Endpoint | `GET /cleanox/riwayat-transaksi` |
| File | `controllers/Cleanox/riwayatTransaksiCleanoxController.js` → `listRiwayatTransaksi` |
| Dipakai UI | Rincian Transaksi Lunas (Pendapatan) dengan `payment_status=lunas` |

**Query utama (inti):**

```sql
SELECT
  t.id,
  t.transaction_no,
  t.customer_name,
  t.customer_phone,
  t.service_date,
  t.final_amount,
  t.status,
  t.payment_status,
  DATE_FORMAT(t.payment_settled_date, '%Y-%m-%d') AS payment_settled_date,
  t.notes,
  t.created_at,
  pm.`group` AS payment_method_group,
  pm.label AS payment_method_label
FROM tr_transactions t
LEFT JOIN mst_payment_method pm ON pm.id = t.payment_method_id
WHERE DATE(t.service_date) >= ?   -- startDate
  AND DATE(t.service_date) <= ?   -- endDate
  -- default: AND t.status <> 'Cancelled'
  -- opsional: AND t.status = ?
  -- opsional lunas: AND t.payment_status = 'lunas'
  -- opsional belum lunas: AND (payment_status = 'belum_lunas' OR NULL OR '')
  -- opsional service_mode home_service / take_home
ORDER BY t.service_date ASC, t.transaction_no ASC;
```

**Bukti bayar (batch):**

```sql
SELECT id, transaction_id, photo_file, sort_order
FROM tr_transaction_payment_proofs
WHERE transaction_id IN (...)
ORDER BY sort_order ASC, id ASC;
```

File disk: `CLEANOX_BASE_DIR/transaction-payment-proofs/`  
Serve: `GET /cleanox/riwayat-transaksi/payment-proofs/:filename`

**Summary di response (dihitung di Node, bukan SQL):**  
`total_transactions`, `total_amount`, `lunas_count`, `belum_lunas_count`, `tunai_amount`, `non_tunai_amount`  
(Kategori TUNAI jika `pm.group` = tunai; selain itu TF BANK.)

---

### B. Dashboard Pendapatan (KPI + tren + performa)

| Item | Nilai |
|------|--------|
| Endpoint | `GET /cleanox/pendapatan` |
| File | `controllers/Cleanox/pendapatanCleanoxController.js` → `getPendapatanCleanox` |

**Capaian (omzet lunas):**

```sql
SELECT COALESCE(SUM(t.final_amount), 0) AS actual_sales
FROM tr_transactions t
WHERE DATE(t.service_date) >= ?          -- dateStart cutoff
  AND DATE(t.service_date) <= ?          -- effectiveAsOf (cap kemarin)
  AND t.payment_status = 'lunas'
  AND t.status <> 'Cancelled'
  -- + filter service_mode opsional
;
```

**Tren harian:**

```sql
SELECT DATE_FORMAT(DATE(t.service_date), '%Y-%m-%d') AS date,
       COALESCE(SUM(t.final_amount), 0) AS sales
FROM tr_transactions t
WHERE DATE(t.service_date) >= ?
  AND DATE(t.service_date) <= ?
  AND t.payment_status = 'lunas'
  AND t.status <> 'Cancelled'
  -- + service_mode
GROUP BY DATE_FORMAT(DATE(t.service_date), '%Y-%m-%d')
ORDER BY date ASC;
```

**Target:**

```sql
SELECT COALESCE(SUM(nominal), 0) AS nominal
FROM mst_target_cleanox
WHERE tahun = ? AND bulan = ?;   -- bulan = bulan dateEnd cutoff (label billing)
```

**Hitungan FE/BE (bukan SQL):**  
- Target kumulatif s.d hari ini = `(hari_berjalan / hari_siklus) * target_bulanan`  
- Gap = actual − target kumulatif  
- Achievement % = actual / target_bulanan  

Rincian baris lunas di UI = panggilan terpisah ke **endpoint A** (`payment_status=lunas`).

---

### C. Dashboard Piutang

| Item | Nilai |
|------|--------|
| Endpoint | `GET /cleanox/piutang-dashboard` |
| File | `controllers/Cleanox/piutangDashboardCleanoxController.js` |

```sql
SELECT
  t.service_mode,
  t.customer_name AS customer_nama,
  t.customer_phone AS customer_telepon,
  t.transaction_no AS no_nota,
  DATE_FORMAT(DATE(t.service_date), '%Y-%m-%d') AS tgl_terima,
  DATE_FORMAT(DATE(t.service_date), '%Y-%m-%d') AS tgl_selesai,  -- due = service_date
  COALESCE(t.final_amount, 0) AS piutang,
  CASE
    WHEN DATE(t.service_date) < CURDATE() THEN 'Terlambat'
    WHEN DATE(t.service_date) = CURDATE() THEN 'Jatuh Tempo'
    ELSE 'Belum Jatuh Tempo'
  END AS status,
  CASE
    WHEN DATE(t.service_date) > CURDATE() THEN 0
    ELSE DATEDIFF(CURDATE(), DATE(t.service_date))
  END AS aging
FROM tr_transactions t
WHERE DATE(t.service_date) >= ?
  AND DATE(t.service_date) <= ?
  AND t.status <> 'Cancelled'
  AND (t.payment_status = 'belum_lunas' OR t.payment_status IS NULL OR t.payment_status = '')
  -- + service_mode opsional
ORDER BY DATE(t.service_date) ASC, t.customer_name ASC, t.transaction_no ASC;
```

---

## 5. Query siap pakai untuk Tim Data

### 5.1 Semua transaksi periode (operasional + history)

```sql
SELECT
  t.transaction_no,
  t.service_date,
  t.customer_name,
  t.final_amount,
  t.status,
  t.payment_status,
  t.service_mode,
  COALESCE(t.is_history_entry, 0) AS is_history_entry,
  CASE WHEN COALESCE(t.is_history_entry, 0) = 1 THEN 'HISTORY' ELSE 'OPERASIONAL' END AS jenis
FROM tr_transactions t
WHERE DATE(t.service_date) BETWEEN '2026-08-26' AND '2026-09-25'  -- contoh cutoff
  AND t.status <> 'Cancelled'
ORDER BY t.service_date, t.transaction_no;
```

### 5.2 Hanya transaksi operasional (mirip mobile)

```sql
SELECT *
FROM tr_transactions t
WHERE DATE(t.service_date) BETWEEN ? AND ?
  AND t.status <> 'Cancelled'
  AND COALESCE(t.is_history_entry, 0) = 0;
```

### 5.3 Hanya entry history

```sql
SELECT *
FROM tr_transactions t
WHERE DATE(t.service_date) BETWEEN ? AND ?
  AND t.status <> 'Cancelled'
  AND COALESCE(t.is_history_entry, 0) = 1;
```

### 5.4 Omzet lunas = mirror SuperApp Pendapatan (termasuk history jika ada)

```sql
SELECT COALESCE(SUM(t.final_amount), 0) AS omzet_lunas
FROM tr_transactions t
WHERE DATE(t.service_date) BETWEEN ? AND ?   -- s.d. asOf (biasanya cap kemarin)
  AND t.payment_status = 'lunas'
  AND t.status <> 'Cancelled';
```

### 5.5 Omzet lunas **tanpa** history (rekomendasi analisis “transaksi terjadi”)

```sql
SELECT COALESCE(SUM(t.final_amount), 0) AS omzet_lunas_operasional
FROM tr_transactions t
WHERE DATE(t.service_date) BETWEEN ? AND ?
  AND t.payment_status = 'lunas'
  AND t.status <> 'Cancelled'
  AND COALESCE(t.is_history_entry, 0) = 0;
```

### 5.6 Piutang = mirror SuperApp

```sql
SELECT COALESCE(SUM(t.final_amount), 0) AS total_piutang
FROM tr_transactions t
WHERE DATE(t.service_date) BETWEEN ? AND ?
  AND t.status <> 'Cancelled'
  AND (t.payment_status = 'belum_lunas' OR t.payment_status IS NULL OR t.payment_status = '');
```

### 5.7 Bandingkan operasional vs history (satu periode)

```sql
SELECT
  CASE WHEN COALESCE(is_history_entry, 0) = 1 THEN 'HISTORY' ELSE 'OPERASIONAL' END AS jenis,
  COUNT(*) AS jumlah_trx,
  SUM(CASE WHEN payment_status = 'lunas' THEN final_amount ELSE 0 END) AS omzet_lunas,
  SUM(CASE WHEN payment_status = 'lunas' THEN 0 ELSE final_amount END) AS nominal_belum_lunas
FROM tr_transactions
WHERE DATE(service_date) BETWEEN ? AND ?
  AND status <> 'Cancelled'
GROUP BY CASE WHEN COALESCE(is_history_entry, 0) = 1 THEN 'HISTORY' ELSE 'OPERASIONAL' END;
```

---

## 6. Flow ringkas

```
POS Cleanox (create trx / history entry)
    → INSERT/UPDATE tr_transactions (+ payment_proofs)
         ↓
DB Cleanox
         ↓
SuperApp Backend (safeCleanoxQuery)
    → /cleanox/pendapatan     → SUM lunas + target
    → /cleanox/piutang-dashboard → list belum lunas
    → /cleanox/riwayat-transaksi → detail baris (+ bukti)
         ↓
UI Cleanox Management (Pendapatan / Piutang)
```

Mobile worker **exclude** history (`is_history_entry = 0`); SuperApp dashboard **belum exclude**.

---

## 7. Catatan untuk Tim Data

1. **Sumber tunggal omzet SuperApp Cleanox Management** = `tr_transactions` di DB Cleanox, filter `service_date`.  
2. **History entry** tetap di tabel yang sama; bedakan dengan `is_history_entry`.  
3. Untuk laporan “transaksi yang terjadi” (operasional), tambahkan `COALESCE(is_history_entry,0)=0`.  
4. Untuk audit input history saja, filter `= 1`.  
5. Target omzet = `mst_target_cleanox` (tahun/bulan label cutoff), bukan pecah per layanan.  
6. Due date piutang SuperApp saat ini = `service_date` (tidak ada `tgl_selesai` terpisah di query ini).

---

*Dokumen observasi — selaras kode SuperApp Cleanox pendapatan/piutang/riwayat per sesi pengembangan terkait.*
