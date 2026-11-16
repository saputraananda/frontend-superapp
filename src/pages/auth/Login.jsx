import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import AlertSuccess from "../../components/AlertSuccess";
import LaundryRoomScene from "./LaundryRoomScene";

// Warna brand Waschen Alora
const INK = "#3B1F2B";
const PURPLE = "#6B2D77";

// Kunci localStorage untuk mengisi otomatis email/username bila "Ingat saya" dicentang
const REMEMBER_KEY = "login.rememberIdentifier";

function readRemembered() {
    try {
        return localStorage.getItem(REMEMBER_KEY) || "";
    } catch {
        return "";
    }
}

const inputClass =
    "h-12 w-full rounded-[14px] border-2 border-[#3B1F2B] bg-white px-3.5 text-base font-normal text-[#3B1F2B] outline-none transition placeholder:text-[#A8949E] " +
    "focus:border-[#6B2D77] focus:ring-4 focus:ring-[#E3CDEA]";

export default function Login({ onLogin }) {
    const [identifier, setIdentifier] = useState(readRemembered);
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(() => Boolean(readRemembered()));
    const [err, setErr] = useState("");
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        document.title = "Login | Alora Group Indonesia";
    }, []);

    useEffect(() => {
        if (err) {
            setShake(true);
            const t = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(t);
        }
    }, [err]);

    function handleKey(e) {
        setCapsLock(Boolean(e.getModifierState && e.getModifierState("CapsLock")));
    }

    async function submit(e) {
        e.preventDefault();
        setErr("");
        setProcessing(true);

        try {
            const data = await api("/auth/login", {
                method: "POST",
                body: JSON.stringify({ identifier, password, remember }),
            });

            const userToStore = {
                ...data.user,
                employee: data.user.employee || data.employee || null,
            };

            localStorage.setItem("user", JSON.stringify(userToStore));
            try {
                if (remember) localStorage.setItem(REMEMBER_KEY, identifier);
                else localStorage.removeItem(REMEMBER_KEY);
            } catch {
                /* penyimpanan browser diblokir: abaikan */
            }
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

    return (
        <div
            className="flex min-h-screen flex-wrap items-center justify-center gap-x-14 gap-y-6 bg-[#F6F0F7] px-4 py-8 sm:px-10 lg:px-16"
            style={{ fontFamily: "'Poppins', system-ui, sans-serif", color: INK }}
        >
            <style>{`
                @keyframes login-shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-8px); }
                    40%, 80% { transform: translateX(8px); }
                }
                .login-shake { animation: login-shake 0.5s ease-in-out; }
                @media (prefers-reduced-motion: reduce) { .login-shake { animation: none; } }
            `}</style>

            {success && <AlertSuccess message={success} onClose={() => setSuccess("")} />}

            {/* Ilustrasi ruang laundry */}
            <section className="w-full min-w-0 max-w-[860px] flex-[1_1_520px]">
                <LaundryRoomScene />
            </section>

            {/* Kartu login */}
            <main
                className={`w-full max-w-[430px] flex-[0_1_430px] rounded-[26px] border-[3px] border-[#3B1F2B] bg-white px-6 py-7 shadow-[10px_10px_0_#E8C9A8] sm:px-9 sm:py-9 ${
                    shake ? "login-shake" : ""
                }`}
            >
                <h1 className="leading-tight">
                    <span className="block text-[15px] font-semibold text-[#6A5560] sm:text-base">Selamat Datang di</span>
                    <span className="relative mt-0.5 inline-block pb-2 text-[30px] font-bold sm:text-[34px]">
                        Alora <span className="text-[#6B2D77]">SuperApp</span>
                        <svg aria-hidden="true" className="absolute bottom-0 left-0 h-2.5 w-full" viewBox="0 0 200 10" preserveAspectRatio="none" fill="none">
                            <path d="M3 7 Q100 1 197 6" stroke="#F57C00" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </svg>
                    </span>
                </h1>

                <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-sm font-semibold">
                        Email atau username
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className={`${inputClass} pr-14`}
                            placeholder="Masukkan Username"
                            autoComplete="username"
                            required
                        />
                    </label>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="login-password" className="text-sm font-semibold">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyUp={handleKey}
                                onKeyDown={handleKey}
                                onBlur={() => setCapsLock(false)}
                                className={`${inputClass} pr-14`}
                                placeholder="Masukkan password"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                aria-pressed={showPassword}
                                className="absolute right-1 top-1 flex h-10 w-11 items-center justify-center rounded-[10px] text-[#6B2D77] transition hover:bg-[#F3EAF6] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#6B2D77]"
                            >
                                {showPassword ? (
                                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 6.1A10 10 0 0 1 12 6c5 0 9 4.5 10 6-.4.7-1.4 2-2.9 3.3M6.5 7.6C4.4 8.9 2.7 10.9 2 12c1 1.5 5 6 10 6 1.6 0 3-.4 4.3-1" />
                                        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                                    </svg>
                                ) : (
                                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 12c1-1.5 5-6 10-6s9 4.5 10 6c-1 1.5-5 6-10 6S3 13.5 2 12z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {capsLock && (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-[#B85C00]">
                                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                                </svg>
                                Caps Lock aktif
                            </p>
                        )}
                    </div>

                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-[18px] w-[18px] cursor-pointer"
                            style={{ accentColor: PURPLE }}
                        />
                        Ingat saya
                    </label>

                    {err && (
                        <div role="alert" className="flex items-start gap-2 rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <svg aria-hidden="true" className="mt-0.5 flex-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 8v4m0 4h.01" />
                            </svg>
                            <span>{err}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={processing}
                        className="mt-1 flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#6B2D77] text-[17px] font-semibold text-white transition hover:bg-[#58235F] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#6B2D77] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {processing ? (
                            <>
                                <svg aria-hidden="true" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Memproses...
                            </>
                        ) : (
                            "Masuk"
                        )}
                    </button>
                </form>

                <p className="mt-4 text-[13px] text-[#6A5560]">
                    Belum punya akun?{" "}
                    <a
                        href="https://wa.me/6287770597000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#6B2D77] underline decoration-[1.5px] underline-offset-[3px] hover:text-[#3B1F2B]"
                    >
                        Chat admin di WhatsApp
                    </a>
                </p>

                <footer className="mt-4 border-t-[1.5px] border-[#EFE6EA] pt-3 text-center text-xs text-[#6A5560]">
                    Alora Group Indonesia © {new Date().getFullYear()}
                </footer>
            </main>
        </div>
    );
}