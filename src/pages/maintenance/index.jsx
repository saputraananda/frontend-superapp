import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeaderLayout from "../../layouts/HeaderLayout";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MaintenancePage({ user, onLogout }) {
  const navigate = useNavigate();
  const [dots, setDots] = useState(".");

  // Animasi titik-titik
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const jobTitle =
    user?.employee?.job_level_name ||
    user?.employee?.position ||
    user?.role ||
    "Employee";

  return (
    <HeaderLayout user={user} jobTitle={jobTitle} onLogout={onLogout}>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">

        {/* Card */}
        <div
          className={cn(
            "w-full max-w-lg rounded-3xl bg-white border border-slate-200",
            "shadow-[0_20px_60px_rgba(17,24,39,0.08)]",
            "px-8 py-12 flex flex-col items-center text-center"
          )}
        >
          {/* Animated Icon */}
          <div className="relative mb-6">
            <div className="flex items-center justify-center h-24 w-24 rounded-full bg-amber-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.598-2.362A3.012 3.012 0 0 1 15 12c0-.318-.05-.63-.144-.927M6.974 14.012a3.012 3.012 0 0 1 2.963-2.895M6.974 14.012a3 3 0 1 0-4.243 4.243"
                />
              </svg>
            </div>
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
          </div>

          {/* Badge */}
          <div className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 mb-5">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Under Maintenance
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-3">
            Sedang dalam Pemeliharaan
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-2">
            Halaman ini sedang dalam proses pemeliharaan dan pengembangan sistem.
            Kami sedang bekerja keras untuk memberikan pengalaman yang lebih baik.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            Mohon bersabar dan coba kembali beberapa saat lagi{dots}
          </p>

          {/* Info Box */}
          <div className="w-full rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 mb-8 text-left space-y-2">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">
              Yang sedang kami lakukan:
            </p>
            {[
              "Pembaruan sistem dan infrastruktur",
              "Peningkatan performa dan keamanan",
              "Penambahan fitur baru",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-200 shrink-0">
                  <svg
                    className="h-3 w-3 text-amber-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-amber-800">{item}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => navigate(-1)}
              className={cn(
                "flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5",
                "text-sm font-semibold text-slate-600",
                "hover:bg-slate-50 transition",
                "focus:outline-none focus:ring-2 focus:ring-slate-300/50"
              )}
            >
              ← Kembali
            </button>
            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5",
                "text-sm font-semibold text-white transition",
                "bg-amber-500 hover:bg-amber-600",
                "focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              )}
            >
              🔄 Coba Lagi
            </button>
            <button
              onClick={() => navigate("/portal")}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5",
                "text-sm font-semibold text-white transition",
                "bg-gradient-to-r from-violet-500 to-purple-600",
                "hover:from-violet-600 hover:to-purple-700",
                "shadow-[0_8px_20px_rgba(139,92,246,0.25)]",
                "focus:outline-none focus:ring-2 focus:ring-violet-400/30"
              )}
            >
              🏠 Ke Portal
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-xs text-slate-400 text-center">
          Butuh bantuan segera? Hubungi tim IT di{" "}
          <a
            href="mailto:it@aloragroup.id"
            className="text-violet-500 hover:underline font-medium"
          >
            it@aloragroup.id
          </a>
        </p>

      </div>
    </HeaderLayout>
  );
}