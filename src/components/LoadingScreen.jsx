import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 10) + 3;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <img
        src="/alora.png"
        alt="Alora Group Indonesia"
        className="h-20 object-contain mb-8 select-none"
        draggable={false}
      />

      <div className="w-48 sm:w-64">
        <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          Memuat... {progress}%
        </p>
      </div>
    </div>
  );
}