# Plan: Perbaikan Layout Excel — Sheet Total Lembur/RO + Perizinan

## Context
- Export Report Absensi sudah punya Sheet 2 (Total Lembur) flat 11 kolom dan Sheet 3 (Perizinan & Cuti) dengan `Mulai` / `Selesai` (tanggal saja).
- User mockup Excel (Sep 2026):
  - **Sheet Total Lembur**: header **grup** Lembur | RO | Unpaid + kolom Saldo Lembur + rename Total WOD.
  - **Sheet Perizinan**: ganti Mulai/Selesai → **Tanggal | Jam Mulai | Jam Selesai**.

## Goal
- Sheet 2 Excel mengikuti layout grup mockup (Lembur / RO / Unpaid) + saldo lembur dari ledger OT.
- Sheet 3 Excel tampil tanggal + jam mulai/selesai dari `tr_worker_leaves.start_time` / `end_time`.
- Backend export fields cukup untuk layout baru; UI web ringkasan boleh ikut label ringan (opsional minimal).

## Design Decision (locked)

| # | Keputusan |
|---|-----------|
| 1 | Sheet name tetap `Total Lembur` dan `Perizinan & Cuti`. |
| 2 | Sheet 2: **dua baris header** — baris grup (merge) + baris sub-kolom. |
| 3 | Urutan kolom Sheet 2 (12 kolom): `No \| NIK \| Nama Karyawan \| Jabatan \|` **Lembur**(4) \| **RO**(3) \| **Unpaid**(1). |
| 4 | Sub-kolom **Lembur**: `Jumlah Pengajuan Lembur`, `Total Jam Lembur`, `Total Lembur Dipakai`, `Saldo Lembur`. |
| 5 | Sub-kolom **RO**: `Total WOD`, `Total RO Dipakai`, `Saldo RO`. |
| 6 | Sub-kolom **Unpaid**: `Total Unpaid`. |
| 7 | Mapping data: Jumlah Pengajuan = `lembur_count`; Total Jam Lembur = `total_lembur_hours` (form); Total Lembur Dipakai = `izin_overtime_hours`; Saldo Lembur = last `balance_after` `tr_overtime_ledger` (**terkini**, sama pola Saldo RO); Total WOD = `total_ro_earned_hours`; Total RO Dipakai = `izin_ro_hours`; Saldo RO = `replace_off_hours`; Total Unpaid = `izin_unpaid_hours`. |
| 8 | Merge header grup: Lembur merge 4 kolom; RO merge 3; Unpaid 1 kolom; identity (No–Jabatan) **tidak** di-merge grup (header baris atas kosong / label tetap di baris sub saja — **locked**: baris grup identity = kosong merge per-cell atau teks kosong; sub-header berisi No/NIK/Nama/Jabatan). |
| 9 | Sheet 3: hapus kolom `Mulai` + `Selesai`; ganti `Tanggal`, `Jam Mulai`, `Jam Selesai`. Urutan: `No \| NIK \| Nama \| Tipe \| Tanggal \| Jam Mulai \| Jam Selesai \| Durasi \| RO (jam) \| Lembur (jam) \| Unpaid (jam) \| Keterangan` (12 kolom). |
| 10 | **Tanggal**: jika `start_date === end_date` → format tanggal satu; else → `start – end` (dua tanggal). |
| 11 | **Jam Mulai / Jam Selesai**: dari `start_time` / `end_time` (HH:mm). Null/kosong (cuti full day / tanpa jam) → `-`. |
| 12 | Backend `fetchApprovedLeavesForExport` wajib SELECT `start_time`, `end_time`; response leave sertakan field tersebut. |
| 13 | Backend tambah `fetchOvertimeBalances(employeeIds)` mirror `fetchReplaceOffBalances`; inject `overtime_balance_hours` ke `lemburSummary` (+ `employeeSummary` agar konsisten). |
| 14 | Sheet 1 & 4 tidak diubah. |

### Approaches
1. **Grouped header Excel + OT saldo + leave times** (dipilih).
2. Hanya rename kolom flat tanpa grup — ditolak (mockup eksplisit merge grup).
3. Saldo Lembur = Total Jam Lembur − Dipakai (aritmetika form) — ditolak; pakai ledger OT terkini agar selaras pemakaian izin.

## Detailed Specifications

### A. Backend — `attendanceAloraController.js`
1. `fetchOvertimeBalances(employeeIds)` → `Map<empId, number>` last `balance_after` from `tr_overtime_ledger`.
2. `buildLemburSummaryRow` / `lemburSummary` / `employeeSummary`: tambah `overtime_balance_hours`.
3. `fetchApprovedLeavesForExport`: SELECT `start_time`, `end_time`.
4. Mapping leave export: `start_time`, `end_time` (string HH:mm atau raw; format di FE/export util).

### B. Frontend — `exportReportAbsensiAloraExcel.js`

#### B1. Sheet 2 header builder
- Setelah meta rows, push **group row** lalu **sub-header row**.
- Merges tambahan (selain meta):
  - Grup Lembur: columns index untuk 4 sub-kolom (0-based setelah No..Jabatan → cols 4–7).
  - Grup RO: cols 8–10.
  - Unpaid: col 11 (no merge needed, atau single cell “Unpaid”).
- Style grup: bold, center, fill beda ringan per grup (Lembur / RO / Unpaid) — boleh reuse `headerStyle` dengan fill variant lokal kecil.
- Data row order match mapping keputusan #7.
- `LEMBUR_COLS = 12`; update empty-state & col widths.

#### B2. Sheet 3
- Helper `leaveTanggalLabel(start, end)`, `leaveTimeLabel(t)`.
- Headers & cells sesuai keputusan #9–11.
- `IZIN_COLS = 12`.

### C. Frontend — `ReportAbsensiAlora.jsx` (ringan)
- Opsional label UI: “Saldo Lembur” jika `overtime_balance_hours` sudah ada — **locked v1**: cukup tampilkan Saldo Lembur di ringkasan jika kolom sudah ada space; minimal update: tidak wajib ubah UI web jika hanya Excel — **locked**: UI ringkasan **tambah Saldo Lembur** (angka) di samping Total Lembur / Total RO agar parity; tidak perlu header grup di HTML table.

### D. Out of scope
- Mengubah aturan funding izin mobile.
- Menulis OT ledger dari form lembur.
- Sheet baru.
- Menghitung Saldo Lembur dari form minus dipakai (bukan ledger).

## Implementation Checklist
1. [x] Backend: `fetchOvertimeBalances` + inject `overtime_balance_hours` ke `employeeSummary` dan `lemburSummary`.
2. [x] Backend: `fetchApprovedLeavesForExport` SELECT `start_time`, `end_time`; pass ke payload leave.
3. [x] Excel Sheet 2: builder header grup + sub-kolom 12 kolom + merges + data mapping mockup.
4. [x] Excel Sheet 3: kolom Tanggal / Jam Mulai / Jam Selesai; hapus Mulai/Selesai tanggal-only.
5. [x] UI `ReportAbsensiAlora.jsx`: tambah kolom Saldo Lembur di ringkasan karyawan.
6. [ ] Smoke-check: export Sheet 2 header merge sesuai mockup; Saldo Lembur & Saldo RO terisi; Sheet 3 izin partial tampil jam; cuti full day jam `-`; Sheet 1/4 utuh.

## Risks / Catatan
- Total Jam Lembur (form) vs Saldo Lembur (OT ledger) bisa tidak selisih-bersih — label harus “Saldo Lembur” (ledger), bukan “sisa form”.
- `start_time`/`end_time` di MySQL bisa bertipe TIME/DATETIME — normalisasi HH:mm di export util.
- Merge cells Excel: pastikan `sheetFromAoa` / `buildMetaHeader` merges digabung array merges grup.

## Approval gate
Implementasi hanya setelah user menyetujui plan ini dan mengirim `ENTER EXECUTE MODE`.
