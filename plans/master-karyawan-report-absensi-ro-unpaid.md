# Plan: Report Absensi Excel — Total RO + Unpaid + Kolom Funding Izin

## Context
- Excel Report Absensi SuperApp sudah 4 sheet; **Sheet 2 Total Lembur** = form lembur disetujui + Saldo RO terkini saja.
- Sheet 3 Perizinan & Cuti: funding izin digabung teks `funding_summary` (`RO Xj + Lembur Yj + Unpaid Zj`).
- User (Sep 2026): **satu sheet** ringkasan (tetap Sheet 2), scope **periode cutoff**; Total Lembur form **tetap benar**; tampilkan juga **Total RO** + **Total Unpaid**; Sheet Perizinan pecah jam funding; pola “pemakaian / sisa → unpaid” terlihat jelas.

## Goal
- Perkaya Sheet 2 (satu sheet) dengan Total RO + pemakaian RO/Lembur untuk izin + Total Unpaid dalam cutoff.
- Sheet 3: kolom numerik terpisah `RO (jam)`, `Lembur (jam)`, `Unpaid (jam)`.
- UI ringkasan karyawan Report Absensi selaras dengan kolom agregat baru (bukan hanya Excel).
- Tidak mengubah flow approval / funding izin di mobile.

## Design Decision (locked)

| # | Keputusan |
|---|-----------|
| 1 | Tetap **satu** sheet ringkasan: nama sheet Excel tetap `Total Lembur` (bukan sheet baru “Total RO”). |
| 2 | Periode semua agregat Sheet 2 (kecuali Saldo RO terkini) = **cutoff report** (`startDate`–`endDate`) yang sama. |
| 3 | **Total jam lembur** = tetap `SUM(duration_hours)` form `tr_worker_lembur_ro` `request_type='lembur'` + `status='disetujui'` di cutoff (**tidak diubah**). |
| 4 | **Total RO (earned)** = `SUM(hours)` dari `tr_replace_off_ledger` `mutation_type='earned'` yang masuk cutoff. Tanggal entry: jika ada `attendance_id`, pakai `attendance_date` / `work_date` absensi terkait; else `DATE(CONVERT_TZ(created_at,'+00:00','+07:00'))` atau `DATE(created_at)` sesuai kolom DB existing — **locked**: prefer join attendance bila `attendance_id` not null; fallback `DATE(created_at)`. |
| 5 | **RO dipakai izin** = `SUM(funding_ro_hours)` leave `status='disetujui'` + `leave_type='izin'` overlap cutoff. |
| 6 | **Lembur dipakai izin** = `SUM(funding_overtime_hours)` leave sama filter (izin disetujui overlap). |
| 7 | **Total Unpaid** = `SUM(funding_unpaid_hours)` leave sama filter. |
| 8 | **Saldo RO (terkini)** tetap last `balance_after` ledger (lifetime), label Excel tidak berubah. |
| 9 | Sheet 3: ganti kolom tunggal “Sumber funding” → tiga kolom **`RO (jam)`**, **`Lembur (jam)`**, **`Unpaid (jam)`** (angka; `0` jika null/cuti). Cuti: ketiga kolom `0` atau `-` — **locked**: tampil `0`. Hapus ketergantungan teks `funding_summary` di Excel (field API boleh tetap untuk UI lain). |
| 10 | Karyawan tanpa form lembur tetapi punya RO earned / izin funding tetap muncul di Sheet 2 jika salah satu metrik > 0 — **locked**: union employee dari (lembur form OR RO earned OR izin funding unpaid/ro/ot > 0) dalam cutoff. |
| 11 | Sheet 1 & 4: tidak berubah. |

### Approaches
1. **Enrich `lemburSummary` + pecah kolom leave export** (dipilih).
2. Sheet terpisah Total RO — ditolak user (satu sheet).
3. Hanya ubah Excel client tanpa backend — ditolak (agregat harus server).

## Detailed Specifications

### A. Backend — `backend-superapp/controllers/Alora/attendanceAloraController.js`

#### A1. Helper `fetchRoEarnedByEmployee(employeeIds, startDate, endDate)`
- Return `Map<employeeId, number>`.
- Query batch earned RO in range (join attendance bila perlu).
- Contoh logika SQL (sesuaikan nama kolom absensi yang sudah dipakai di repo):
  - Sum `l.hours` where `l.mutation_type = 'earned'` and effective_date between start/end.

#### A2. Helper `fetchIzinFundingTotalsByEmployee(employeeIds, startDate, endDate)`
- Dari `tr_worker_leaves`: `status='disetujui'`, `leave_type='izin'`, `start_date <= endDate AND end_date >= startDate`.
- Group by `employee_id`:
  - `izin_ro_hours` = SUM(`funding_ro_hours`)
  - `izin_overtime_hours` = SUM(`funding_overtime_hours`)
  - `izin_unpaid_hours` = SUM(`funding_unpaid_hours`)
- Filter `employeeIds` opsional sama pola export existing.

#### A3. Bangun `lemburSummary` (saat `includeExport=1`)
Urutan kolom data (field JSON):
```json
{
  "employee_id": 1,
  "employee_code": "...",
  "employee_name": "...",
  "jabatan": "...",
  "total_lembur_hours": 12,
  "lembur_count": 3,
  "total_ro_earned_hours": 8,
  "izin_ro_hours": 2,
  "izin_overtime_hours": 1.5,
  "izin_unpaid_hours": 0.5,
  "replace_off_hours": 5.5
}
```
- Merge employees: union dari `fetchLemburRowsForExport` + keys RO earned + keys funding izin (yang punya salah satu jam > 0 atau punya lembur form).
- Sort: `total_lembur_hours` DESC, lalu nama.

#### A4. `leavesIzinCuti` enrichment
- Selain `funding_summary` (boleh tetap), wajib kirim angka:
  - `funding_ro_hours`, `funding_overtime_hours`, `funding_unpaid_hours` (Number, default 0).
- Ambil dari row leave yang sudah di-select (kolom sudah ada di `fetchApprovedLeavesForExport`).

#### A5. `employeeSummary` (UI, tanpa wajib `includeExport`)
- Tambah field yang sama untuk karyawan yang sudah ada di summary page: `total_ro_earned_hours`, `izin_ro_hours`, `izin_overtime_hours`, `izin_unpaid_hours` (batch untuk `summaryEmployeeIds` + range).
- Jangan pecah pagination report hanya untuk ini.

### B. Frontend — `exportReportAbsensiAloraExcel.js`

#### Sheet 2 — `Total Lembur`
Header kolom (urutan locked):
1. No  
2. NIK  
3. Nama Karyawan  
4. Jabatan  
5. Total jam lembur  
6. Jumlah pengajuan  
7. Total RO (earned)  
8. RO dipakai izin  
9. Lembur dipakai izin  
10. Total Unpaid  
11. Saldo RO (terkini)  

- Title meta: sesuaikan teks singkat, mis. `Total Lembur & RO per Karyawan (periode cutoff)`.
- Empty row colspan menyesuaikan jumlah kolom baru.
- `hoursNumLabel` untuk semua kolom jam.

#### Sheet 3 — `Perizinan & Cuti`
Header:
`No | NIK | Nama | Tipe | Mulai | Selesai | Durasi | RO (jam) | Lembur (jam) | Unpaid (jam) | Keterangan`  
- Hapus kolom “Sumber funding”.
- Izin: isi dari field numerik; cuti: `0`.

### C. Frontend — `ReportAbsensiAlora.jsx`
- Tabel **Ringkasan Per Karyawan**: tambah kolom ringkas minimal:
  - Total RO (earned)
  - Total Unpaid  
  - (Opsional tampil compact) RO/Lembur dipakai izin — **locked v1 UI**: tampilkan **Total RO**, **Total Unpaid** selain Total Lembur + Saldo RO; detail dipakai izin cukup di Excel Sheet 2 agar tabel tidak terlalu lebar.
- Export: tidak perlu ubah wiring selain field baru ikut `lemburSummary` / leave (sudah lewat response).

### D. Out of scope
- Sheet Excel baru.
- Mengubah cara hitung Total jam lembur (form).
- Menulis OT ledger dari form lembur (mismatch ledger vs form tetap seperti sekarang; “Lembur dipakai izin” = funding OT ledger, bukan form).
- Server-side XLSX.
- Ubah mobile izin funding rules.

## Implementation Checklist
1. [x] Backend: tambah `fetchRoEarnedByEmployee(employeeIds, startDate, endDate)` di `attendanceAloraController.js`.
2. [x] Backend: tambah `fetchIzinFundingTotalsByEmployee(employeeIds, startDate, endDate)`.
3. [x] Backend: saat bangun `employeeSummary`, inject `total_ro_earned_hours`, `izin_ro_hours`, `izin_overtime_hours`, `izin_unpaid_hours`.
4. [x] Backend: saat `includeExport=1`, rebuild `lemburSummary` sebagai union karyawan + field A3; sort sesuai spek.
5. [x] Backend: di mapping `leavesIzinCuti`, sertakan `funding_ro_hours`, `funding_overtime_hours`, `funding_unpaid_hours` numerik.
6. [x] Frontend Excel: update Sheet 2 headers + cells ke 11 kolom sesuai spek; sesuaikan empty-state & column widths.
7. [x] Frontend Excel: update Sheet 3 — ganti “Sumber funding” jadi 3 kolom jam.
8. [x] Frontend `ReportAbsensiAlora.jsx`: tambah kolom Total RO + Total Unpaid di ringkasan karyawan (desktop table; mirror mobile card jika ada).
9. [ ] Smoke-check: karyawan dengan WOD/RO earned muncul Total RO; izin dengan RO+OT+unpaid terlihat di Sheet 3 terpisah dan ter-agregat di Sheet 2; Total jam lembur form tidak berubah; Saldo RO terkini tetap; Sheet 1/4 utuh.

## Risks / Catatan
- **Mismatch produk**: Total jam lembur (form) ≠ sumber “Lembur dipakai izin” (OT ledger). Label kolom harus jelas: `Lembur dipakai izin` bukan “Total lembur form”.
- RO earned tanpa `attendance_id` mengandalkan `created_at` — bisa beda tipis vs tanggal kerja; dokumentasikan di meta sheet.
- Union Sheet 2 bisa menambah baris karyawan yang tidak punya absensi di Sheet 1 — **OK** (sama catatan plan multi-sheet sebelumnya).

## Approval gate
Implementasi hanya setelah user menyetujui plan ini dan mengirim `ENTER EXECUTE MODE`.
