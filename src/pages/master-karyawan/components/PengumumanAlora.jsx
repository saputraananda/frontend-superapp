import BroadcastBanner from "../../portal/components/BroadcastBanner";
import { HiOutlineSpeakerWave } from "react-icons/hi2";

export default function PengumumanAlora() {
    return (
        <div className="space-y-5 p-4 md:p-6">
            <div>
                <div className="mb-1 inline-flex items-center gap-2 text-blue-600">
                    <HiOutlineSpeakerWave className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
                </div>
                <h1 className="text-xl font-black text-slate-800">Pengumuman Alora</h1>
                <p className="mt-1 text-sm text-slate-500 max-w-2xl leading-relaxed">
                    Kelola pengumuman untuk karyawan Alora Mobile. Aktif = tampil di aplikasi; nonaktif = tidak tampil.
                </p>
            </div>
            <BroadcastBanner adminMode />
        </div>
    );
}
