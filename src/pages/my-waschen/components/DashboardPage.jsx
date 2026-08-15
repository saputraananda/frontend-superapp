import { HiOutlineSparkles, HiOutlineSquares2X2 } from "react-icons/hi2";

export default function DashboardPage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-50 p-6">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-xl md:p-12">
        {/* Decorative background blur blobs */}
        <div className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-[#5f1340]/10 blur-3xl" />
        <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-[#3d0728]/10 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          {/* Pulsing Icon Badge */}
          <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5f1340] to-[#3d0728] text-white shadow-lg shadow-[#5f1340]/30">
            <HiOutlineSquares2X2 className="h-10 w-10 animate-pulse" />
            <div className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-[#5f1340]"></span>
            </div>
          </div>

          {/* Subtitle / Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3.5 py-1.5 text-xs font-semibold text-[#5f1340]">
            <HiOutlineSparkles className="h-3.5 w-3.5 text-yellow-500 font-bold" />
            Under Development
          </div>

          {/* Main heading */}
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#313030] md:text-4xl">
            My Waschen <span className="bg-gradient-to-r from-[#3d0728] to-[#5f1340] bg-clip-text text-transparent">POS System</span>
          </h1>

          {/* Description */}
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500">
            Kami sedang merancang sistem Point of Sales (POS) Laundry generasi terbaru yang lebih cepat, andal, dan terintegrasi untuk Alora Group.
          </p>

          {/* Simulated progress indicator */}
          <div className="mt-10 w-full max-w-md">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
              <span>Progress Pengembangan</span>
              <span className="text-[#5f1340] font-bold">Coming Soon</span>
            </div>
            <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#3d0728] to-[#5f1340] w-3/4 animate-pulse" />
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-12 text-xs text-slate-400">
            © {new Date().getFullYear()} PT Waschen Alora Indonesia. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
