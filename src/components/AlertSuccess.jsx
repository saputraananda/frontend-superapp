export default function AlertSuccess({ message, onClose }) {
  return (
    <div className="fixed top-4 sm:top-8 left-4 right-4 sm:left-1/2 sm:right-auto z-50 sm:-translate-x-1/2 max-w-md sm:max-w-lg mx-auto">
      <div className="rounded-2xl sm:rounded-3xl border border-emerald-200/80 bg-white/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(16,185,129,0.2)] animate-fade-in-premium overflow-hidden">
        {/* Gradient bar top */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
        
        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
          {/* Icon */}
          <div className="flex-shrink-0 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full sm:rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="text-emerald-900 font-semibold text-sm sm:text-base leading-snug drop-shadow-sm break-words">
              {message}
            </p>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-full sm:rounded-xl bg-emerald-100/70 p-1.5 sm:p-2 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-900 transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Tutup"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in-premium {
          0% { 
            opacity: 0; 
            transform: translateY(-20px) scale(0.95);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1);
          }
        }
        
        @media (min-width: 640px) {
          @keyframes fade-in-premium {
            0% { 
              opacity: 0; 
              transform: translate(-50%, -20px) scale(0.95);
            }
            100% { 
              opacity: 1; 
              transform: translate(-50%, 0) scale(1);
            }
          }
        }
        
        .animate-fade-in-premium {
          animation: fade-in-premium 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </div>
  );
}