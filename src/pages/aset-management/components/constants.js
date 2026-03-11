        // frontend/src/pages/aset-management/components/constants.js
    export function cn(...c) { return c.filter(Boolean).join(" "); }
    
    export const toTitleCase = (str) =>
        str?.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";
    
    export const SUB_KATEGORI = ["Aset Fasilitas", "Aset Operasional", "Aset Kantor", "Aset IT"];
    export const SATUAN = ["Unit", "Pcs", "Set", "Buah", "Pasang", "Lembar", "Roll", "Box", "Lusin", "Rim", "Pak", "Batang", "Meter", "Kg", "Liter"];
    export const KONDISI = ["Baik", "Rusak Ringan", "Rusak Berat", "Dalam Perbaikan", "Tidak Layak Pakai"];
    
    export const KONDISI_COLOR = {
        "Baik": "bg-emerald-100 text-emerald-700 border-emerald-200",
        "Rusak Ringan": "bg-amber-100 text-amber-700 border-amber-200",
        "Rusak Berat": "bg-rose-100 text-rose-700 border-rose-200",
        "Dalam Perbaikan": "bg-blue-100 text-blue-700 border-blue-200",
        "Tidak Layak Pakai": "bg-slate-200 text-slate-600 border-slate-300",
    };
    
    export const SUBKAT_COLOR = {
        "Aset Fasilitas": "bg-cyan-100 text-cyan-700",
        "Aset Operasional": "bg-violet-100 text-violet-700",
        "Aset Kantor": "bg-amber-100 text-amber-700",
        "Aset IT": "bg-blue-100 text-blue-700",
    };
    
    export const APPROVAL_STATUS = {
        draft: { label: "Draft", color: "bg-slate-100 text-slate-600 border-slate-200" },
        pending_spv: { label: "Menunggu Supervisor", color: "bg-amber-50 text-amber-700 border-amber-200" },
        pending_bod: { label: "Menunggu Direktur", color: "bg-orange-50 text-orange-700 border-orange-200" },
        approved: { label: "Disetujui", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        rejected: { label: "Ditolak", color: "bg-rose-50 text-rose-700 border-rose-200" },
    };
    
    export const MAINTENANCE_TIPE = [
        { value: "perawatan_rutin", label: "Perawatan Rutin" },
        { value: "perbaikan", label: "Perbaikan" },
        { value: "penggantian_part", label: "Penggantian Part" },
        { value: "kalibrasi", label: "Kalibrasi" },
        { value: "lainnya", label: "Lainnya" },
    ];
    
    export const MAINTENANCE_STATUS = [
        { value: "dijadwalkan", label: "Dijadwalkan" },
        { value: "dalam_proses", label: "Dalam Proses" },
        { value: "selesai", label: "Selesai" },
        { value: "dibatalkan", label: "Dibatalkan" },
    ];
    
    export const PEMINJAMAN_STATUS = [
        { value: "dipinjam", label: "Dipinjam" },
        { value: "dikembalikan", label: "Dikembalikan" },
        { value: "terlambat", label: "Terlambat" },
        { value: "hilang", label: "Hilang" },
    ];
    
    export const PENGHAPUSAN_TIPE = [
        { value: "disposal", label: "Disposal" },
        { value: "hilang", label: "Hilang" },
        { value: "rusak_total", label: "Rusak Total" },
        { value: "donasi", label: "Donasi" },
        { value: "jual", label: "Jual" },
        { value: "lainnya", label: "Lainnya" },
    ];
    
    export const inputCls = cn(
        "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
        "outline-none transition-all placeholder:text-slate-400",
        "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
        "disabled:bg-slate-100 disabled:text-slate-400"
    );
    
    export const EMPTY_FORM = {
        kode_aset: "", nama_aset: "", company_id: "", sub_kategori: "",
        brand: "", model: "", no_seri: "", lokasi_nama: "",
        lokasi_lat: "", lokasi_lng: "", jumlah: 1, satuan: "Unit",
        pic_employee_id: "", kondisi: "Baik",
        is_active: true,
    };