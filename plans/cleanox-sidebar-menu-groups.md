# Plan: Cleanox Sidebar Menu Groups

## Context
- Sidebar Cleanox di `src/pages/cleanox-management/index.jsx` saat ini memakai `MENU_ITEMS` flat (7 item) di bawah satu label `Menu`.
- Referensi pola grouping sudah ada di `src/pages/master-data-superapp/index.jsx` via `MENU_GROUPS` + section label uppercase.
- Route di `src/App.jsx` sudah lengkap; perubahan hanya struktur data & render sidebar, tanpa ubah path/page.

## Goal
- Mengelompokkan menu sidebar Cleanox menjadi 3 section:
  - **Menu Karyawan**: Data Karyawan, Absensi Karyawan
  - **Menu Analisis**: KPI Produksi, Target Cleanox
  - **Menu Master**: Master Area, Master Kategori, Master Service
- Mempertahankan styling Cleanox yang ada (warna `#1b3459` / `#97bd3f`), collapse desktop, mobile drawer, dan deteksi active title.

## Detailed Specifications

### File yang diubah
- `D:\Alora Group Indonesia\frontend-superapp\src\pages\cleanox-management\index.jsx` (satu-satunya file implementasi)

### File yang TIDAK diubah
- `src/App.jsx` (route tetap)
- Semua component page di `src/pages/cleanox-management/components/*`
- Backend / API

### Struktur data baru
Ganti `MENU_ITEMS` menjadi `MENU_GROUPS`:

```text
MENU_GROUPS = [
  {
    label: "Menu Karyawan",
    items: [
      { to: "/cleanox-management-system", icon: HiOutlineUser, label: "Data Karyawan", description: "Master data karyawan Cleanox", end: true },
      { to: "/cleanox-management-system/absensi", icon: HiOutlineClipboardDocumentCheck, label: "Absensi Karyawan", description: "Lihat absensi dan nilai foto QC", end: false },
    ],
  },
  {
    label: "Menu Analisis",
    items: [
      { to: "/cleanox-management-system/kpi", icon: HiOutlineChartBar, label: "KPI Produksi", description: "Performa karyawan produksi", end: true },
      { to: "/cleanox-management-system/target", icon: HiOutlineChartBar, label: "Target Cleanox", description: "Kelola target bulanan Cleanox", end: true },
    ],
  },
  {
    label: "Menu Master",
    items: [
      { to: "/cleanox-management-system/master-area", icon: HiOutlineMapPin, label: "Master Area", description: "Nilai kebersihan area pekerja", end: false },
      { to: "/cleanox-management-system/category", icon: HiOutlineTag, label: "Master Kategori", description: "Kelola kategori layanan", end: true },
      { to: "/cleanox-management-system/service", icon: HiOutlineBriefcase, label: "Master Service", description: "Kelola layanan Cleanox", end: true },
    ],
  },
]
```

Tambah flat helper:
- `const ALL_MENU_ITEMS = MENU_GROUPS.flatMap((g) => g.items);`

### Component / function changes

1. **`Sidebar`**
   - Hapus label tunggal `Menu`.
   - Render `MENU_GROUPS.map`:
     - Saat `!collapsed`: tampilkan section label uppercase (`text-[10px] font-bold uppercase tracking-widest text-slate-400`) seperti Master Data Superapp.
     - Render `group.items` via `NavItem` (props tetap: `to`, `icon`, `label`, `description`, `end`, `onClose`, `collapsed`).
   - Spacing nav: `space-y-4` antar group; `space-y-0.5` antar item dalam group.
   - Saat `collapsed`: sembunyikan section label (hanya icon items), konsisten dengan Master Data Superapp.

2. **`ActiveMenuTitle`**
   - Ganti sumber pencarian dari `MENU_ITEMS` ke `ALL_MENU_ITEMS`.
   - Pertahankan logika matching:
     - Prioritas `!end && pathname.startsWith(m.to)` dulu (untuk absensi/master-area detail), lalu `end && pathname === m.to`
     - Atau samakan urutan yang sudah terbukti di Cleanox sekarang agar tidak regresi active title.

3. **`NavItem`**
   - Tidak diubah (styling & active state tetap).

4. **Route / page**
   - Tidak ada perubahan path, component, atau role guard.

## Implementation Checklist
1. Buka `src/pages/cleanox-management/index.jsx`.
2. Ganti konstanta `MENU_ITEMS` menjadi `MENU_GROUPS` dengan 3 group label exact: `Menu Karyawan`, `Menu Analisis`, `Menu Master`, dan isi item sesuai spesifikasi di atas (path/icon/description/end tidak berubah).
3. Tambahkan `const ALL_MENU_ITEMS = MENU_GROUPS.flatMap((g) => g.items);` tepat di bawah `MENU_GROUPS`.
4. Di `Sidebar`, hapus blok label tunggal `Menu` (`{!collapsed && (<p ...>Menu</p>)}`).
5. Di `Sidebar` `<nav>`, ganti `MENU_ITEMS.map(...)` menjadi loop `MENU_GROUPS` → section label (jika `!collapsed`) → `group.items.map` ke `NavItem`.
6. Sesuaikan class `<nav>`: `space-y-4` untuk jarak antar group; item dalam group pakai wrapper `space-y-0.5`.
7. Di `ActiveMenuTitle`, ganti referensi `MENU_ITEMS` menjadi `ALL_MENU_ITEMS` dengan logika find active yang sama.
8. Verifikasi manual: desktop expanded menampilkan 3 section label; desktop collapsed menyembunyikan label group; mobile drawer sama; active highlight & topbar title benar untuk tiap route termasuk detail absensi/master-area.

## Risks / Catatan
- Hanya perubahan UI sidebar; risiko regresi utama ada di deteksi active menu untuk nested detail routes (`/absensi/:employeeId`, `/master-area/:employeeId`).
- Tidak ada accordion expand/collapse; pola = section label + list (seperti Master Data Superapp).
- Label group exact: `Menu Karyawan`, `Menu Analisis`, `Menu Master` (bukan tanpa prefix "Menu").
