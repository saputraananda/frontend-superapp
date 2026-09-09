const MESSAGE =
    "Halaman portal ALSA sedang dalam masa renovasi. Mohon maaf atas ketidaknyamanan yang mungkin terjadi selama perjalanan Anda. Terima kasih atas pengertiannya. ❤️";

export default function BadgeMaintenance() {
    return (
        <div
            role="status"
            className="flex items-center gap-3 overflow-hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
        >
            <style>{`
                @keyframes badge-marquee {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-50%); }
                }
                .badge-marquee-track {
                    display: flex;
                    width: max-content;
                    animation: badge-marquee 24s linear infinite;
                }
                .badge-marquee:hover .badge-marquee-track { animation-play-state: paused; }
                @media (prefers-reduced-motion: reduce) {
                    .badge-marquee-track { animation: none; }
                }
            `}</style>

            <svg className="h-5 w-5 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.7 19l-9.1-15.7c-.7-1.2-2.5-1.2-3.2 0L1.3 19c-.7 1.2.2 2.7 1.6 2.7h18.2c1.4 0 2.3-1.5 1.6-2.7zM12 18c-.7 0-1.2-.6-1.2-1.2s.6-1.2 1.2-1.2 1.2.6 1.2 1.2S12.7 18 12 18zm1-4h-2V9h2v5z" />
            </svg>

            <div className="badge-marquee min-w-0 flex-1 overflow-hidden">
                <div className="badge-marquee-track">
                    {/* digandakan supaya loop tidak terlihat terputus */}
                    {[0, 1].map((i) => (
                        <span
                            key={i}
                            aria-hidden={i === 1 || undefined}
                            className="whitespace-nowrap pr-16 text-sm font-medium text-rose-700"
                        >
                            {MESSAGE}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
