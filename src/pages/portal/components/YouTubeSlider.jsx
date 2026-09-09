import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

const CHANNEL_URL = "https://www.youtube.com/@Cocokids_WorldFun";
const PER_PAGE = 8;

export default function YouTubeSlider() {
    const [videos, setVideos] = useState([]);
    const [page, setPage] = useState(0);

    useEffect(() => {
        api("/youtube/videos")
            .then((r) => setVideos(r.data || []))
            .catch(() => setVideos([]));
    }, []);

    if (!videos.length) return null;

    const totalPages = Math.ceil(videos.length / PER_PAGE);
    const pageVideos = videos.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-2.5">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-red-100 shrink-0">
                        <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Channel YouTube Kami</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Cocokids World Fun For Kids</p>
                    </div>
                </div>

                <a
                    href={CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold text-blue-600 hover:underline"
                >
                    Lihat Semua →
                </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pageVideos.map((v, i) => (
                    <a
                        key={`${v.id}-${i}`}
                        href={`https://www.youtube.com/watch?v=${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                    >
                        <div className="relative w-full h-0 pb-[56.25%] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            <img
                                src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                                alt={v.title}
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="flex items-center justify-center h-11 w-11 rounded-full bg-red-600 shadow-lg">
                                    <svg className="h-5 w-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6 4l10 6-10 6V4Z" />
                                    </svg>
                                </span>
                            </div>
                            {v.duration && (
                                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                    {v.duration}
                                </span>
                            )}
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {v.title}
                        </h4>
                        {(v.views || v.published) && (
                            <p className="mt-1 text-xs text-slate-500">
                                {[v.views, v.published].filter(Boolean).join(" • ")}
                            </p>
                        )}
                    </a>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page === 0}
                        aria-label="Halaman sebelumnya"
                        className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition flex items-center justify-center"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setPage(i)}
                            aria-label={`Halaman ${i + 1}`}
                            aria-current={i === page ? "page" : undefined}
                            className={`h-8 min-w-8 px-2 rounded-lg text-sm font-semibold transition ${i === page
                                ? "bg-blue-600 text-white"
                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page === totalPages - 1}
                        aria-label="Halaman selanjutnya"
                        className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition flex items-center justify-center"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
