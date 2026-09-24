# Plan: Pengumuman di Master Karyawan (reuse BroadcastBanner)

## Context

- Pengumuman disimpan di `waschen.tr_broadcast`, API `backend-superapp` `/broadcast`.
- Alora Mobile sudah membaca pengumuman aktif via `GET /api/broadcast` → kartu Home.
- Sesi sebelumnya mengaktifkan `<BroadcastBanner />` di Portal — user minta **dikembalikan ke comment** (struktur depan Portal tidak diubah).
- Input pengumuman harus di **sidebar Master Karyawan**, bukan di Portal.
- **Siapa akses:** semua user yang boleh buka modul Master Karyawan (bukan hanya Supervisor+).
- **Reuse:** komponen `BroadcastBanner.jsx` yang sudah ada (form buat, carousel, nonaktifkan).

## Goal

1. Portal kembali seperti semula: `BroadcastBanner` di-comment, tidak tampil di halaman depan.
2. Menu sidebar **Pengumuman** di Master Karyawan → halaman admin reuse `BroadcastBanner`.
3. User Master Karyawan bisa buat & nonaktifkan pengumuman; yang aktif tetap muncul di Alora Mobile.

## Detailed Specifications

### Out of scope

- Ubah struktur layout Portal (StatsCards, AppShortcuts, dll.).
- Pindah file `BroadcastBanner.jsx` ke folder shared (cukup import dari `portal/components`).
- Halaman list tabel admin baru (ganti carousel) — reuse penuh `BroadcastBanner`.
- Ubah backend `broadcastController.js` (POST/PATCH sudah cukup untuk karyawan login session).
- Ubah Alora Mobile API/Home (sudah selesai di plan sebelumnya).

---

### A. Revert Portal — kembalikan comment

**File:** `frontend-superapp/src/pages/portal/index.jsx`

1. Hapus baris render aktif:
   ```jsx
   <BroadcastBanner />
   ```
2. Ganti dengan comment seperti sebelumnya:
   ```jsx
   {/* <BroadcastBanner /> */}
   ```
3. Hapus import yang tidak terpakai:
   ```jsx
   import BroadcastBanner from "./components/BroadcastBanner";
   ```
   (import dihapus agar tidak unused; komponen tetap ada untuk Master Karyawan)

**Tidak mengubah** urutan/komponen lain di Portal.

---

### B. Adaptasi `BroadcastBanner` — prop `adminMode`

**File:** `frontend-superapp/src/pages/portal/components/BroadcastBanner.jsx`

Tambah prop opsional pada export default:

```jsx
export default function BroadcastBanner({ adminMode = false }) { ... }
```

Perubahan perilaku ketika `adminMode === true`:

| Aspek | Portal (default) | Master Karyawan (`adminMode`) |
|-------|------------------|-------------------------------|
| `canCreate` | `canSupervisorUp(employee)` | **selalu `true`** |
| Early return kosong | `sorted.length === 0 && !canCreate` → `null` | **tidak return null** — tampil empty state + tombol Tambah |
| Loading | `return null` | Tampil placeholder ringan: teks `"Memuat pengumuman…"` dalam `bb-root` |
| Filter dismiss | Filter `dismissed` sessionStorage | **Jangan filter dismiss** — admin lihat semua aktif |
| Tombol X dismiss slide | Tampil | **Sembunyikan** (`onDismiss` tidak dipakai) |
| `canDeactivate` pada slide | `canCreate` | **`true`** (semua user Master Karyawan) |
| Judul header | `"Announcement"` | **`"Pengumuman"`** |
| Subtitle modal create | tetap | Tambah keterangan singkat: *"Tampil untuk semua karyawan login Alora Mobile"* (opsional, 1 baris di `bb-modal-sub`) |

Perilaku yang **tetap sama** di kedua mode:

- `GET /broadcast` (hanya aktif + belum expired)
- `POST /broadcast` via `AddBroadcastModal`
- `PATCH /broadcast/:id` `{ is_active: 0 }` via tombol Nonaktifkan
- Carousel, auto-slide, countdown expired

Signature `BroadcastSlide` — tambah prop `hideDismiss` (boolean):

- Portal: `hideDismiss={false}`
- Admin: `hideDismiss={true}`

---

### C. Halaman Master Karyawan — `PengumumanAlora.jsx`

**File baru:** `frontend-superapp/src/pages/master-karyawan/components/PengumumanAlora.jsx`

Struktur mengikuti header halaman lain (contoh `PerizinanAlora.jsx`):

```jsx
import BroadcastBanner from "../../portal/components/BroadcastBanner";
import { HiOutlineSpeakerWave } from "react-icons/hi2";

export default function PengumumanAlora() {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 inline-flex items-center gap-2 text-blue-600">
          <HiOutlineSpeakerWave className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
        </div>
        <h1 className="text-xl font-black text-slate-800">Pengumuman</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola pengumuman untuk karyawan Alora Mobile. Aktif = tampil di aplikasi; nonaktif = tidak tampil.
        </p>
      </div>
      <BroadcastBanner adminMode />
    </div>
  );
}
```

Tidak perlu state/fetch tambahan — semua di dalam `BroadcastBanner`.

---

### D. Sidebar menu — `index.jsx`

**File:** `frontend-superapp/src/pages/master-karyawan/index.jsx`

1. Import icon: `HiOutlineSpeakerWave` dari `react-icons/hi2`.
2. Tambah item di `MENU_ITEMS` (setelah **Cuti & Perizinan**, sebelum Report Absensi):

```js
{
  to: "/master-karyawan/pengumuman",
  icon: HiOutlineSpeakerWave,
  label: "Pengumuman",
  description: "Kelola pengumuman Alora Mobile",
  end: false,
},
```

`ActiveMenuTitle` otomatis resolve label dari `MENU_ITEMS` — tidak perlu ubah logic.

---

### E. Routing — `App.jsx`

**File:** `frontend-superapp/src/App.jsx`

1. Import:
   ```jsx
   import PengumumanAlora from "./pages/master-karyawan/components/PengumumanAlora";
   ```
2. Tambah nested route di dalam blok Master Karyawan (setelah `perizinan`):

```jsx
<Route path="/master-karyawan/pengumuman" element={<PengumumanAlora />} />
```

Route `/master-karyawan/:id` tetap di luar nested layout — path `pengumuman` tidak bentrok karena didefinisikan sebelum catch `:id`.

Akses: inherit `ProtectedRoute` + `appRoles["/master-karyawan"]` — sama dengan menu lain.

---

### F. Backend & Alora Mobile — tidak diubah

- `tr_broadcast` + `/broadcast` API tetap.
- Alora Mobile `GET /api/broadcast` + kartu Home tetap membaca pengumuman aktif.
- Setelah nonaktifkan dari Master Karyawan → hilang dari mobile (filter `is_active = 1`).

---

## Implementation Checklist

1. [ ] `portal/index.jsx`: comment `{/* <BroadcastBanner /> */}` dan hapus import `BroadcastBanner`.
2. [ ] `BroadcastBanner.jsx`: tambah prop `adminMode = false` pada komponen utama.
3. [ ] `BroadcastBanner.jsx`: `canCreate = adminMode || canSupervisorUp(employee)`.
4. [ ] `BroadcastBanner.jsx`: saat `adminMode`, loading tampil teks "Memuat pengumuman…" (bukan `return null`).
5. [ ] `BroadcastBanner.jsx`: saat `adminMode`, jangan filter `dismissed` sessionStorage.
6. [ ] `BroadcastBanner.jsx`: `BroadcastSlide` tambah prop `hideDismiss`; sembunyikan tombol X jika true.
7. [ ] `BroadcastBanner.jsx`: pass `hideDismiss={adminMode}` dan `canDeactivate={canCreate}` ke slide.
8. [ ] `BroadcastBanner.jsx`: judul header `adminMode ? "Pengumuman" : "Announcement"`.
9. [ ] Buat `master-karyawan/components/PengumumanAlora.jsx` dengan header + `<BroadcastBanner adminMode />`.
10. [ ] `master-karyawan/index.jsx`: import `HiOutlineSpeakerWave`, tambah item menu Pengumuman di `MENU_ITEMS`.
11. [ ] `App.jsx`: import `PengumumanAlora`, route `/master-karyawan/pengumuman`.
12. [ ] Smoke: Portal tidak menampilkan Announcement.
13. [ ] Smoke: Master Karyawan → Pengumuman → buat pengumuman → muncul di Alora Mobile Home.
14. [ ] Smoke: Nonaktifkan dari Master Karyawan → hilang dari mobile.
15. [ ] Smoke: User Staff dengan akses Master Karyawan bisa buat & nonaktifkan (bukan hanya Supervisor+).

## Risks / Catatan

- **Backend POST/PATCH** tidak cek job level — hanya session employee. Akses tulis mengikuti siapa yang boleh buka modul Master Karyawan di SuperApp.
- **Reuse carousel** bukan tabel admin — pengumuman nonaktif tidak terlihat di halaman (hanya hilang dari list aktif). Sesuai requirement aktif/nonaktif untuk tampilan mobile.
- **Import lintas folder** `master-karyawan` → `portal/components` — acceptable untuk reuse; refactor ke `components/shared` bisa dilakukan nanti jika perlu.
- Plan `alora-home-pengumuman-broadcast.md` (aktifkan Portal) **tidak lagi berlaku** untuk input SuperApp; input pindah ke Master Karyawan.
