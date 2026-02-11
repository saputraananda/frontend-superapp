export default function AlertSuccess({ message, onClose }) {
  return (
    <div className="fixed top-8 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white/60 px-8 py-4 shadow-2xl backdrop-blur-xl flex items-center gap-4 animate-fade-in-premium">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-emerald-900 font-semibold text-base drop-shadow">{message}</span>
      <button
        onClick={onClose}
        className="ml-6 rounded-full bg-emerald-100/70 p-2 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-900 transition"
        aria-label="Tutup"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <style>{`
        @keyframes fade-in-premium {
          from { opacity: 0; transform: translateY(-16px) scale(0.98);}
          to { opacity: 1; transform: translateY(0) scale(1);}
        }
        .animate-fade-in-premium {
          animation: fade-in-premium 0.5s cubic-bezier(.4,2,.6,1) both;
        }
      `}</style>
    </div>
  );
}