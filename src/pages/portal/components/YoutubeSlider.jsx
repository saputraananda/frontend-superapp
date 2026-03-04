import { useState } from "react";

export default function YouTubeSlider({ videos }) {
    const [videoIndex, setVideoIndex] = useState(0);

    const prevVideo = () => {
        setVideoIndex((i) => (i - 1 + videos.length) % videos.length);
    };

    const nextVideo = () => {
        setVideoIndex((i) => (i + 1) % videos.length);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-800">Cek video terbaru kami!</h3>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={prevVideo}
                        aria-label="Video sebelumnya"
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={nextVideo}
                        aria-label="Video selanjutnya"
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-3">
                <div className="relative w-full h-0 pb-[56.25%] rounded-lg overflow-hidden">
                    <iframe
                        key={videos[videoIndex]?.id}
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${videos[videoIndex]?.id}`}
                        title={videos[videoIndex]?.title || "YouTube video"}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                        Tonton update terbaru dari{" "}
                        <span className="text-blue-600 font-medium">Aurora Labs</span> di YouTube!
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {videos.map((v, i) => (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => setVideoIndex(i)}
                                aria-label={`Pilih video ${i + 1}`}
                                className={`h-1.5 rounded-full transition ${i === videoIndex ? "bg-blue-600 w-4" : "bg-slate-300 w-1.5"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}