# Plan: Report Absensi Multi-Sheet + Lembur Form (Tanpa Gabung Approval)

## Context
- SuperApp punya **Report Absensi** (rekap + Excel 1 sheet) dan **Sesi Lembur & RO** / form lembur sebagai **approval terpisah**.
- User (Sep 2026):
  - **Approval tetap dipisah** (bukan digabung ke report).
  - Sumber jam lembur di report = **form pengajuan** di Alora Mobile (`tr_worker_lembur_ro`), **bukan** sesi clock (`tr_attendance_sessions`).
  - Di report: **per tanggal** terlihat jam lembur (dan info RO).
  - Excel: **4 sheet** — (1) Absensi, (2) Total lembur per orang (+ saldo RO), (3) Perizinan & cuti, (4) Sakit SKD / non-SKD.

## Goal
- Perkaya Report Absensi (API + UI) dengan jam lembur form yang **disetujui** per `employee_id` + `work_date`.
- Tampilkan saldo RO karyawan (ledger) pada ringkasan / sheet total.
- Export Excel multi-sheet sesuai 4 kategori di atas.
- **Tidak** mengubah flow approval (sesi / form / leave tetap di menu masing-masing).

## Design Decision (locked)

| # | Keputusan |
|---|-----------|
| 1 | Approval **tidak digabung** ke Report Absensi. Menu Sesi / Lembur form / Perizinan tetap. |
| 2 | Jam lembur report = `tr_worker_lembur_ro` dengan `request_type = 'lembur'` dan `status = 'disetujui'` saja. Sesi clock **diabaikan** untuk kolom/sheet lembur. |
| 3 | Per baris absensi (tanggal + karyawan): field `lembur_hours` = `SUM(duration_hours)` form lembur disetujui pada tanggal yang sama. Jika tidak ada → `0` / tampil `—`. |
| 4 | Saldo RO = `balance_after` terkini dari `tr_replace_off_ledger` per karyawan (bukan kolom wajib tiap baris tanggal). Tampil di **employee summary** UI + **Sheet 2** Excel. Opsional di Sheet 1: kolom `ro_earned_hours` hari itu dari attendance WOD yang sudah final (`mode_request` gated / `duration_hours` WOD clock-out) — **locked v1**: Sheet 1 hanya tambah **Lembur (jam)**; RO earned harian **tidak** wajib di Sheet 1; Sheet 2 berisi total lembur periode + **saldo RO terkini**. |
| 5 | Sheet 3: leave `disetujui`, `leave_type IN ('izin','cuti')`, overlap periode cutoff report. |
| 6 | Sheet 4: leave `disetujui`, `leave_type = 'sakit'`; kolom tipe **SKD** jika `doctor_note_path`/`doctor_note_file` ada, else **Non-SKD**. |
| 7 | Periode cutoff Report Absensi yang sudah ada (26–25) dipakai untuk semua sheet. |
| 8 | Export tetap client-side (`xlsx-js-style`) seperti sekarang; data tambahan diambil dari response API yang diperkaya (satu fetch export dengan `limit` besar, sama pola existing). |

### Approaches (dipilih #1)
1. **Enrich `getAttendanceReport` + multi-sheet Excel** (dipilih) — satu endpoint, UI & export pakai data yang sama.
2. Endpoint export khusus server-side XLSX — lebih berat, out of pattern.
3. Gabung approval ke report — ditolak user.

## Detailed Specifications

### A. Backend — `backend-superapp/controllers/Alora/attendanceAloraController.js`

#### A1. Lookup lembur form (helper internal)
- Query batch untuk `pageEmployeeIds` (atau semua employee di export page):
  ```sql
  SELECT employee_id, work_date, SUM(duration_hours) AS lembur_hours
  FROM tr_worker_lembur_ro
  WHERE request_type = 'lembur' AND status = 'disetujui'
    AND work_date >= ? AND work_date <= ?
    AND employee_id IN (...)
  GROUP BY employee_id, work_date
  ```
- Map key `${employee_id}|${work_date}` → hours.

#### A2. Saldo RO batch
- Untuk distinct employee di result / summary:
  - Ambil last `balance_after` per employee dari `tr_replace_off_ledger` (subquery / window / loop batch seperti pola balance di session controller).
- Sertakan di `employeeSummary[]`: `replace_off_hours` (number).
- Sertakan `lembur_summary[]` (baru) untuk Sheet 2:
  - `employee_id`, `employee_code`, `employee_name`, `jabatan`
  - `total_lembur_hours` = sum form disetujui dalam range
  - `lembur_count` = jumlah pengajuan disetujui
  - `replace_off_hours` = saldo RO terkini

#### A3. Leave bundles untuk export
- Query leave overlap range untuk employee yang relevan (atau semua yang punya leave di range + yang muncul di attendance — **locked**: semua leave `disetujui` dengan `start_date <= endDate AND end_date >= startDate`, filter employee opsional sama filter report):
  - `leaves_izin_cuti`: `leave_type IN ('izin','cuti')`
  - `leaves_sakit`: `leave_type = 'sakit'` + `sakit_type`: `'SKD' | 'Non-SKD'`
- Field minimal per leave: id, employee_id, employee_code/name (dari map), leave_type, start_date, end_date, duration_type, reason/description jika ada, funding summary untuk izin, sakit_type, doctor_note flag.

#### A4. Response JSON tambahan
```json
{
  "records": [ { "...existing", "lembur_hours": 2.5 } ],
  "employeeSummary": [ { "...existing", "replace_off_hours": 8, "total_lembur_hours": 12 } ],
  "lemburSummary": [ /* Sheet 2 rows */ ],
  "leavesIzinCuti": [ /* Sheet 3 */ ],
  "leavesSakit": [ /* Sheet 4 */ ]
}
```
- Saat pagination table biasa: tetap enrich `lembur_hours` per record; bundle leave/lemburSummary boleh dihitung untuk **filter range penuh** (tidak hanya page) agar export akurat — **locked**: pada request export (`limit` besar / `page=1`) backend selalu isi keempat bundle; pada request UI biasa (`limit` kecil) cukup `lembur_hours` + optional `replace_off_hours` di summary (bundle leave boleh diisi selalu jika murah, atau hanya jika `includeExport=1` query flag).
- **Locked flag**: `includeExport=1` → wajib isi `lemburSummary`, `leavesIzinCuti`, `leavesSakit` untuk seluruh filter (tanpa batasi page employees saja). UI table fetch tanpa flag; export fetch dengan flag.

### B. Frontend — `ReportAbsensiAlora.jsx`
- Kolom tabel baru: **Lembur (jam)** setelah Durasi / Mode.
- Di ringkasan per karyawan (jika ada card/table summary): tampilkan **Total lembur** + **Saldo RO**.
- `handleExport`: panggil API dengan `includeExport=1` + limit besar (pola existing), lalu lempar ke util Excel dengan records + tiga bundle.

### C. Frontend — `exportReportAbsensiAloraExcel.js`
- Rename perilaku: tetap fungsi export yang sama, multi-sheet.
- **Sheet 1 — Absensi**: kolom existing + `Lembur (jam)`.
- **Sheet 2 — Total Lembur**: No, NIK, Nama, Jabatan, Total jam lembur, Jumlah pengajuan, Saldo RO (jam).
- **Sheet 3 — Perizinan & Cuti**: No, NIK, Nama, Tipe (Izin/Cuti), Mulai, Selesai, Durasi tipe, Sumber funding (izin), Keterangan.
- **Sheet 4 — Sakit**: No, NIK, Nama, Tipe SKD/Non-SKD, Mulai, Selesai, Keterangan.
- Nama sheet Excel ≤ 31 chars: `Absensi`, `Total Lembur`, `Perizinan & Cuti`, `Sakit`.
- File name tetap `Report_Absensi_Alora_{start}_{end}.xlsx`.

### D. Out of scope
- Memindahkan / menghapus menu Approval Sesi Lembur atau Approval form.
- Menghitung lembur dari `tr_attendance_sessions`.
- Server-side generate XLSX.
- Sheet mutasi ledger RO harian detail.
- Ubah Alora Mobile form lembur.

## Implementation Checklist
1. [ ] Backend: helper batch sum `tr_worker_lembur_ro` disetujui per employee+date; inject `lembur_hours` ke tiap record report.
2. [ ] Backend: batch saldo RO terkini; tambah ke `employeeSummary` + bangun `lemburSummary`.
3. [ ] Backend: query leave izin/cuti & sakit (+ SKD flag); response `leavesIzinCuti` / `leavesSakit` saat `includeExport=1`.
4. [ ] Backend: parse query `includeExport`; dokumentasikan di response filters.
5. [ ] Frontend Report: kolom **Lembur (jam)** di tabel desktop + mobile card.
6. [ ] Frontend Report: tampilkan total lembur + saldo RO di ringkasan karyawan (jika UI summary ada).
7. [ ] Frontend export: fetch `includeExport=1`; pass bundle ke util.
8. [ ] Util Excel: 4 sheet sesuai spek; Sheet 1 tambah kolom Lembur.
9. [ ] Smoke-check: karyawan dengan form lembur disetujui muncul jam di tanggal yang sama; Sheet 2 total benar; Sheet 3/4 leave benar; approval menus tidak berubah; sesi clock tidak menambah kolom lembur.

## Risks / Catatan
- Form lembur vs absensi beda row: absensi tanpa punch tetap bisa punya lembur di tanggal itu — Sheet 1 hanya baris attendance; lembur tanpa absensi tetap masuk **agregat Sheet 2** (dan tidak punya baris Sheet 1). **Locked**: OK.
- Saldo RO “terkini” bisa berubah setelah periode cutoff — label Excel: “Saldo RO (terkini)”.
- Data sesi clock historis tetap mempengaruhi `final_status` via resolver existing; tidak dihapus.

## Approval gate
Implementasi hanya setelah user menyetujui plan ini dan mengirim `ENTER EXECUTE MODE`.
