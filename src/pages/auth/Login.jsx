import { useEffect, useState, useRef } from "react";
import { api } from "../../lib/api";
import AlertSuccess from "../../components/AlertSuccess";

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const thisDay = DAYS_ID[new Date().getDay()];
const HERO_PHRASES = [
    { text: `Selamat Hari ${thisDay}!`, highlight: thisDay, color: "text-emerald-500" },
    { text: "Task Pribadi? Tercatat Otomatis!", highlight: "Tercatat Otomatis", color: "text-indigo-500" },
    { text: "Data Karyawan? Semua Ada!", highlight: "Semua Ada", color: "text-sky-500" },
    { text: "Revenue? Komplit & Real-time!", highlight: ["Komplit", "Real-time"], color: "text-amber-500" },
    { text: "Data Aset? Lengkap & Terkelola!", highlight: ["Lengkap", "Terkelola"], color: "text-violet-500" },
    { text: "Absensi IKM? Terpantau!", highlight: "Terpantau", color: "text-rose-500" },
    { text: "Laporan Leader? Satu Klik!", highlight: "Satu Klik", color: "text-orange-500" },
];

export default function Login({ onLogin }) {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [err, setErr] = useState("");
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [mounted, setMounted] = useState(false);
    const [shake, setShake] = useState(false);
    const cardRef = useRef(null);

    // Hero typewriter state
    const [phraseIdx, setPhraseIdx] = useState(0);
    const [heroText, setHeroText] = useState("");
    const [heroFading, setHeroFading] = useState(false);

    // PRECISE values - akronim dari 7 nilai perusahaan
    const PRECISE_VALUES = [
        { letter: "P", word: "Professionalism" },
        { letter: "R", word: "Resilience" },
        { letter: "E", word: "Empathy" },
        { letter: "C", word: "Collaboration" },
        { letter: "I", word: "Innovation" },
        { letter: "S", word: "Sustainability" },
        { letter: "E", word: "Excellence" },
    ];
    // 0 = tampilkan akronim PRECISE penuh, 1..7 = highlight per huruf + tampilkan kata
    const [valueStep, setValueStep] = useState(0);

    // Logo perusahaan untuk floating background
    const COMPANY_LOGOS = [
        { src: "/alora.png", alt: "Alora Group Indonesia" },
        { src: "/ikm.png", alt: "IKM" },
        { src: "/waschen.webp", alt: "Waschen" },
        { src: "/cleanox.png", alt: "Cleanox" },
    ];

    // Konfigurasi posisi & animasi setiap logo (deterministik, tidak random tiap render)
    const FLOATING_LOGOS = [
        { logo: 0, top: "8%", left: "6%", size: 64, duration: 14, delay: 0, opacity: 0.18 },
        { logo: 1, top: "18%", left: "88%", size: 52, duration: 16, delay: 1.2, opacity: 0.22 },
        { logo: 2, top: "72%", left: "4%", size: 70, duration: 18, delay: 0.6, opacity: 0.25 },
        { logo: 3, top: "82%", left: "90%", size: 58, duration: 15, delay: 2, opacity: 0.22 },
        { logo: 0, top: "45%", left: "92%", size: 44, duration: 13, delay: 3, opacity: 0.20 },
        { logo: 2, top: "38%", left: "3%", size: 50, duration: 17, delay: 1.8, opacity: 0.22 },
        { logo: 1, top: "60%", left: "94%", size: 60, duration: 19, delay: 2.5, opacity: 0.24 },
        { logo: 3, top: "12%", left: "48%", size: 46, duration: 12, delay: 0.4, opacity: 0.18 },
        { logo: 0, top: "88%", left: "52%", size: 54, duration: 16, delay: 1.5, opacity: 0.22 },
    ];

    useEffect(() => {
        document.title = "Login | Alora Group Indonesia";
        const t = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(t);
    }, []);

    // Rotating PRECISE: step 0 = akronim, step 1-7 = highlight tiap huruf
    useEffect(() => {
        const id = setInterval(() => {
            setValueStep((i) => (i + 1) % (PRECISE_VALUES.length + 1));
        }, 2000);
        return () => clearInterval(id);
    }, []);

    // Parallax mouse tracking on the card
    useEffect(() => {
        const handler = (e) => {
            if (!cardRef.current) return;
            const rect = cardRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
            const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
            setMousePos({ x, y });
        };
        window.addEventListener("mousemove", handler);
        return () => window.removeEventListener("mousemove", handler);
    }, []);

    useEffect(() => {
        if (err) {
            setShake(true);
            const t = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(t);
        }
    }, [err]);

    // Hero typewriter effect
    useEffect(() => {
        const phrase = HERO_PHRASES[phraseIdx].text;
        let charIdx = 0;
        setHeroText("");
        setHeroFading(false);
        let pauseTimer, fadeTimer;

        const typeTimer = setInterval(() => {
            charIdx++;
            setHeroText(phrase.slice(0, charIdx));
            if (charIdx >= phrase.length) {
                clearInterval(typeTimer);
                pauseTimer = setTimeout(() => {
                    setHeroFading(true);
                    fadeTimer = setTimeout(() => {
                        setPhraseIdx((i) => (i + 1) % HERO_PHRASES.length);
                    }, 400);
                }, 2500);
            }
        }, 35);

        return () => {
            clearInterval(typeTimer);
            clearTimeout(pauseTimer);
            clearTimeout(fadeTimer);
        };
    }, [phraseIdx]);

    function handleKeyDown(e) {
        if (e.getModifierState && e.getModifierState("CapsLock")) {
            setCapsLock(true);
        } else {
            setCapsLock(false);
        }
    }

    async function submit(e) {
        e.preventDefault();
        setErr("");
        setProcessing(true);

        try {
            const data = await api("/auth/login", {
                method: "POST",
                body: JSON.stringify({ identifier, password }),
            });

            const userToStore = {
                ...data.user,
                employee: data.user.employee || data.employee || null,
            };

            localStorage.setItem("user", JSON.stringify(userToStore));
            onLogin(userToStore);
            setSuccess("Login berhasil! Mengalihkan ke portal...");

            setTimeout(() => {
                window.location.href = "/portal";
            }, 600);
        } catch (error) {
            setErr(error.message || "Login gagal. Periksa kembali kredensial Anda.");
        } finally {
            setProcessing(false);
        }
    }

    const tiltX = mousePos.y * -4;
    const tiltY = mousePos.x * 4;

    // Render PRECISE display
    const renderPreciseDisplay = () => {
        if (valueStep === 0) {
            // Tampilkan akronim PRECISE
            return (
                <span key="acronym" className="animate-value-in inline-flex items-center gap-0.5 font-bold tracking-wider text-indigo-700">
                    {PRECISE_VALUES.map((v, i) => (
                        <span key={i}>{v.letter}</span>
                    ))}
                </span>
            );
        }
        // Highlight 1 huruf + tampilkan kata penuh
        const activeIdx = valueStep - 1;
        const active = PRECISE_VALUES[activeIdx];
        return (
            <span key={`word-${valueStep}`} className="animate-value-in inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 font-bold tracking-wider">
                    {PRECISE_VALUES.map((v, i) => (
                        <span
                            key={i}
                            className={
                                i === activeIdx
                                    ? "text-indigo-700 inline-block"
                                    : "text-slate-400/70"
                            }
                            style={
                                i === activeIdx
                                    ? { transform: "scale(1.25)", transition: "transform .3s" }
                                    : undefined
                            }
                        >
                            {v.letter}
                        </span>
                    ))}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-semibold text-indigo-700">
                    <span className="underline decoration-indigo-400 decoration-2 underline-offset-2">
                        {active.letter}
                    </span>
                    {active.word.slice(1)}
                </span>
            </span>
        );
    };

    // Render hero headline with highlighted keywords
    const renderHeroText = () => {
        const phrase = HERO_PHRASES[phraseIdx];
        const keywords = phrase.highlight
            ? (Array.isArray(phrase.highlight) ? phrase.highlight : [phrase.highlight])
            : [];
        if (keywords.length === 0) return <>{heroText}</>;
        const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        const regex = new RegExp(`(${escaped.join("|")})`, "g");
        const parts = heroText.split(regex);
        return (
            <>
                {parts.map((part, i) =>
                    keywords.includes(part) ? (
                        <span key={i} className={`${phrase.color} font-bold`}>{part}</span>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </>
        );
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-sky-100">
            {/* Custom keyframes & animations */}
            <style>{`
                @keyframes float-slow {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(20px, -30px) scale(1.05); }
                }
                @keyframes float-slower {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-25px, 20px) scale(0.95); }
                }
                @keyframes float-mid {
                    0%, 100% { transform: translate(-50%, 0) scale(1); }
                    50% { transform: translate(-50%, -25px) scale(1.08); }
                }
                @keyframes float-logo {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(15px, -20px) rotate(3deg); }
                    50% { transform: translate(-10px, -35px) rotate(-2deg); }
                    75% { transform: translate(-20px, -15px) rotate(2deg); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-8px); }
                    40%, 80% { transform: translateX(8px); }
                }
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes value-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes blob-shift {
                    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                }
                .animate-float-slow { animation: float-slow 14s ease-in-out infinite; }
                .animate-float-slower { animation: float-slower 18s ease-in-out infinite; }
                .animate-float-mid { animation: float-mid 12s ease-in-out infinite; }
                .animate-shake { animation: shake 0.5s ease-in-out; }
                .animate-fade-up { animation: fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .animate-value-in { animation: value-in 0.5s ease-out both; }
                .animate-blob { animation: blob-shift 16s ease-in-out infinite; }
                .shimmer-text {
                    background: linear-gradient(90deg, #4338ca 0%, #0284c7 25%, #059669 50%, #0284c7 75%, #4338ca 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer 6s linear infinite;
                }
                .stagger-1 { animation-delay: 0.1s; }
                .stagger-2 { animation-delay: 0.2s; }
                .stagger-3 { animation-delay: 0.3s; }
            `}</style>

            {success && (
                <AlertSuccess message={success} onClose={() => setSuccess("")} />
            )}

            {/* Decorative animated background */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(15,23,42,.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,.8) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                        maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
                        WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
                    }}
                />
                {/* Animated blobs */}
                <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-400/25 blur-3xl animate-float-slow animate-blob" />
                <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-sky-400/25 blur-3xl animate-float-slower animate-blob" />
                <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/25 blur-3xl animate-float-mid" />

                {/* Floating company logos */}
                {FLOATING_LOGOS.map((item, i) => {
                    const logo = COMPANY_LOGOS[item.logo];
                    return (
                        <div
                            key={i}
                            className="absolute"
                            style={{
                                top: item.top,
                                left: item.left,
                                width: `${item.size}px`,
                                height: `${item.size}px`,
                                opacity: item.opacity,
                                animation: `float-logo ${item.duration}s ease-in-out infinite`,
                                animationDelay: `${item.delay}s`,
                                filter: "grayscale(20%)",
                            }}
                        >
                            <img
                                src={logo.src}
                                alt={logo.alt}
                                className="h-full w-full object-contain drop-shadow-md"
                                draggable={false}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-14">
                <div className="w-full">
                    {/* Top badge with rotating PRECISE values */}
                    <div
                        className={`mx-auto mb-8 flex w-fit items-center gap-3 rounded-full border border-white/40 bg-white/40 px-5 py-2 text-sm text-slate-700 shadow-sm backdrop-blur-md transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
                            }`}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        {renderPreciseDisplay()}
                    </div>

                    <div className="grid items-center gap-10 lg:grid-cols-2">
                        {/* Left Section */}
                        <section className={`text-center lg:text-left ${mounted ? "animate-fade-up" : "opacity-0"}`}>
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/50 px-3 py-1 text-xs font-medium text-indigo-700 backdrop-blur-sm mb-5">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Powered by Team Alora
                            </div>

                            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                                Selamat Datang di{" "}
                                <span className="shimmer-text">Alora SuperApp</span>
                            </h1>

                            {/* Rotating typewriter tagline */}
                            <p
                                className="mt-4 text-xl sm:text-2xl font-medium min-h-[2rem]"
                                style={{
                                    opacity: heroFading ? 0 : 1,
                                    transform: heroFading ? "translateY(-8px)" : "translateY(0)",
                                    transition: "opacity 0.4s ease, transform 0.4s ease",
                                }}
                            >
                                {renderHeroText()}
                                {heroText.length < HERO_PHRASES[phraseIdx].text.length && (
                                    <span className="inline-block w-0.5 h-[0.8em] bg-indigo-500 ml-0.5 align-middle animate-pulse" />
                                )}
                            </p>

                            {/* <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg max-w-xl mx-auto lg:mx-0">
                                Satu aplikasi untuk semua kebutuhan digital Anda. Nikmati
                                kemudahan, kecepatan, dan keamanan dalam satu genggaman.
                            </p> */}
                        </section>

                        {/* Right: Glass card with login form */}
                        <aside
                            className={`relative ${mounted ? "animate-fade-up stagger-2" : "opacity-0"} ${shake ? "animate-shake" : ""}`}
                            ref={cardRef}
                            style={{
                                transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
                                transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                            }}
                        >
                            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-indigo-400/40 via-sky-400/40 to-emerald-300/40 blur-xl animate-pulse" style={{ animationDuration: "4s" }} />

                            <div className="relative rounded-[2rem] border border-white/50 bg-white/40 p-6 shadow-2xl shadow-indigo-900/10 backdrop-blur-2xl sm:p-8">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                            Masuk ke Portal Alora
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Login langsung di sini, cepat dan praktis.
                                        </p>
                                    </div>

                                    <span className="relative inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-700 backdrop-blur-sm">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        </span>
                                        v1.0
                                    </span>
                                </div>

                                <form onSubmit={submit} className="mt-6 space-y-4">
                                    {/* Identifier field */}
                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                                            <svg className={`h-3.5 w-3.5 transition-colors ${focusedField === "id" ? "text-indigo-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Email atau Username
                                        </label>
                                        <div className="relative mt-1">
                                            <input
                                                type="text"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
                                                onFocus={() => setFocusedField("id")}
                                                onBlur={() => setFocusedField(null)}
                                                className="w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none backdrop-blur-md transition-all duration-200 focus:border-indigo-300 focus:bg-white/80 focus:ring-4 focus:ring-indigo-200/50"
                                                placeholder="contoh: nama@alora.id atau username"
                                                autoComplete="username"
                                                required
                                            />
                                            {identifier && (
                                                <span className="absolute inset-y-0 right-3 flex items-center text-emerald-500 animate-fade-up">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Password field */}
                                    <div className="group">
                                        <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                                            <svg className={`h-3.5 w-3.5 transition-colors ${focusedField === "pwd" ? "text-indigo-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Password
                                        </label>
                                        <div className="relative mt-1">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onKeyUp={handleKeyDown}
                                                onFocus={() => setFocusedField("pwd")}
                                                onBlur={() => { setFocusedField(null); setCapsLock(false); }}
                                                className="w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none backdrop-blur-md transition-all duration-200 focus:border-indigo-300 focus:bg-white/80 focus:ring-4 focus:ring-indigo-200/50"
                                                placeholder="••••••••"
                                                autoComplete="current-password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                className="absolute inset-y-0 right-3 flex items-center px-1 text-slate-400 hover:text-indigo-600 transition-all duration-200 hover:scale-110"
                                                tabIndex={-1}
                                                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                            >
                                                {showPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>

                                        {capsLock && focusedField === "pwd" && (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 animate-fade-up">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                Caps Lock aktif
                                            </div>
                                        )}
                                    </div>

                                    {/* Remember & Forgot Password */}
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700 select-none group">
                                            <span className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={remember}
                                                    onChange={(e) => setRemember(e.target.checked)}
                                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border-2 border-slate-300 bg-white/60 transition-all checked:border-indigo-600 checked:bg-indigo-600 focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1"
                                                />
                                                <svg
                                                    className="pointer-events-none absolute left-0 top-0 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={3}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                            <span className="group-hover:text-slate-900 transition-colors">Ingat saya</span>
                                        </label>

                                        <a
                                            href="#"
                                            className="relative text-xs font-medium text-indigo-700 hover:text-indigo-800 transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-indigo-700 after:transition-all hover:after:w-full"
                                        >
                                            Lupa password?
                                        </a>
                                    </div>

                                    {/* Error message */}
                                    {err && (
                                        <div className="flex items-start gap-2 rounded-2xl border border-red-200/70 bg-red-50/70 p-3 text-xs text-red-700 backdrop-blur-md animate-fade-up">
                                            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{err}</span>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-[length:200%_100%] bg-left px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all duration-500 hover:-translate-y-0.5 hover:bg-right hover:shadow-xl hover:shadow-indigo-900/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                                        {processing ? (
                                            <>
                                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                <span>Memproses...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Login</span>
                                                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </>
                                        )}
                                    </button>

                                    <div className="rounded-2xl border border-white/50 bg-white/35 p-4 text-xs text-slate-600 text-center backdrop-blur-md transition-all hover:bg-white/50">
                                        Belum punya akun?{" "}
                                        <a
                                            href="https://wa.me/6287770597000"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-800 transition-colors"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                            </svg>
                                            Hubungi Admin
                                        </a>
                                    </div>
                                </form>

                                <footer className="mt-6 flex flex-col items-center justify-center gap-2 border-t border-white/40 pt-4 text-center text-xs text-slate-500">
                                    <span>
                                        Alora Group Indonesia © {new Date().getFullYear()} • All rights reserved
                                    </span>
                                </footer>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}