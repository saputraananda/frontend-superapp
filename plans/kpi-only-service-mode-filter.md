# Plan: Filter service_mode pada KPI Cleanox Only

## Context
- Tab **Cleanox Only** menampilkan agregat gabungan home service + take-home.
- Backend `getKpiOnlySummary` / `getKpiOnlyDetail` sudah membedakan sumber stage per `service_mode`, lalu digabung satu `overall` / ranking.
- User: pisah lewat **filter** (pola seperti filter Outlet di Waschen); **tidak ada opsi All**; hanya `home_service` dan `take_home`; ranking karyawan ikut filter.

## Goal
- Di Cleanox Only: dropdown filter **Mode Layanan** = Home Service | Take Home (wajib salah satu).
- Semua blok statistik Cleanox Only (overall, daily, aging, top services, ranking, detail modal) hanya untuk mode terpilih.
- Default filter: `home_service`.

## Detailed Specifications

### Filter values
| UI label | Query value |
|----------|-------------|
| Home Service | `home_service` |
| Take Home | `take_home` |

Tidak ada “Semua” / `all`.

### A. Backend — `backend-superapp/controllers/Cleanox/kpiProduksiController.js`

#### `getKpiOnlySummary`
1. Baca `req.query.service_mode`.
2. Validasi: wajib `home_service` | `take_home`; selain itu → `400` `{ message: 'service_mode harus home_service atau take_home' }`.
3. Setelah load `txRows`, filter:
   ```js
   txRows = txRows.filter((t) => {
     const mode = String(t.service_mode || 'home_service');
     return service_mode === 'take_home' ? mode === 'take_home' : mode !== 'take_home';
   });
   ```
   (Atau filter di SQL `AND ...` untuk efisiensi — prefer SQL:)
   - `take_home`: `AND t.service_mode = 'take_home'`
   - `home_service`: `AND (t.service_mode = 'home_service' OR t.service_mode IS NULL OR t.service_mode = '')`
4. Query items ikut filter mode yang sama (join transactions + kondisi mode).
5. Logic stage takehome vs assignment tetap; karena `txRows` sudah terfilter, `takehomeIds`/`homeIds` otomatis sesuai mode.
6. Response shape **tidak berubah** (`summary`, `overall`, `insights`) — hanya dataset terfilter.

#### `getKpiOnlyDetail`
1. Sama: wajib `service_mode` query.
2. Filter `txRows` / SQL dengan mode yang sama sebelum hitung detail employee.
3. Pastikan credit employee hanya dari transaksi mode terpilih.

#### `getKpiOnlyAvailablePeriods`
- **Opsional:** tidak wajib filter mode (periode bisa dari semua transaksi). Biarkan tanpa `service_mode` agar tahun/bulan tetap tersedia.

### B. Frontend — `frontend-superapp/src/pages/cleanox-management/components/KpiProduksiCleanox.jsx`

#### State
```js
const [serviceMode, setServiceMode] = useState('home_service'); // hanya home_service | take_home
```

#### Saat ganti tab dataSource
- Jika `next === 'only'`: pastikan `serviceMode` default `'home_service'` (atau pertahankan pilihan terakhir — **default reset ke home_service** saat masuk tab Only untuk prediktabilitas).
- Filter Outlet tetap hanya untuk Waschen.

#### UI filter (sejajar baris Tahun/Bulan)
Tampil **hanya** jika `dataSource === 'only'`:
```jsx
<label>Mode Layanan</label>
<select value={serviceMode} onChange={(e) => setServiceMode(e.target.value)}>
  <option value="home_service">Home Service</option>
  <option value="take_home">Take Home</option>
</select>
```
Pola class sama dengan select Outlet.

#### Fetch
- `fetchSummary`: jika `source === 'only'`, append `service_mode=${serviceMode}`.
- `useEffect` dependency: tambah `serviceMode`.
- `DetailModal`: pass `serviceMode`; request `/kpi/only/detail?...&service_mode=`.

#### Copy
- Subtitle Only: sesuaikan singkat, mis. tetap umum atau sebut filter aktif — opsional:  
  `Pantau kinerja produksi Cleanox Only — filter Home Service / Take Home.`

### Tidak diubah
- Tab Waschen / outlet / SLA Waschen.
- Shape response KPI (tetap flat `overall` satu objek).
- Stage keys Pickup → Pengantaran.

## Implementation Checklist
1. [x] `getKpiOnlySummary`: validasi + filter SQL/JS `service_mode`; items ikut filter.
2. [x] `getKpiOnlyDetail`: validasi + filter `service_mode` sama.
3. [x] FE: state `serviceMode` default `home_service`.
4. [x] FE: select Mode Layanan (hanya tab Only), style seperti Outlet.
5. [x] FE: `fetchSummary` + effect kirim `service_mode`; refetch saat ganti filter.
6. [x] FE: DetailModal Only kirim `service_mode`.
7. [ ] Smoke: Home Service vs Take Home beda angka statistik & ranking; tanpa All; Waschen tidak terpengaruh.

## Risks / Catatan
- Transaksi legacy `service_mode` null → treat sebagai `home_service`.
- Ganti filter memicu loading ulang (sama outlet Waschen).
- Periods available tetap gabungan — bulan kosong di satu mode tetap bisa dipilih (overall kosong) — acceptable.
