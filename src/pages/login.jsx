import { useState } from "react";
import { api } from "../lib/api";
import { Link } from "react-router-dom";
import AlertSuccess from "../components/AlertSuccess";

export default function Login({ onLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [err, setErr] = useState("");
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState("");

    async function submit(e) {
        e.preventDefault();
        setErr("");
        setProcessing(true);

        try {
            const data = await api("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            // Simpan user ke localStorage
            localStorage.setItem("user", JSON.stringify(data.user));

            // Panggil callback onLogin
            onLogin(data.user);

            // Redirect ke portal
            window.location.href = "/portal";
        } catch (error) {
            setErr(error.message || "Login failed");
        } finally {
            setProcessing(false);
        }
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-sky-100">
            {success && (
                <AlertSuccess message={success} onClose={() => setSuccess("")} />
            )}
            {/* Decorative background */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(15,23,42,.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,.8) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                    }}
                />
                <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-sky-400/20 blur-3xl" />
                <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/20 blur-3xl" />
            </div>

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-14">
                <div className="w-full">
                    {/* Top badge */}
                    <div className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-white/40 bg-white/40 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur-md">
                        <span className="font-medium">Professionalism • Resilience • Empathy • Collaboration • Innovation • Sustainability • Excellence</span>
                    </div>

                    <div className="grid items-center gap-10 lg:grid-cols-2">
                        {/* Left Section */}
                        <section className="text-center lg:text-left">
                            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                                Selamat Datang di{" "}
                                <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
                                    Alora SuperApp
                                </span>
                            </h1>

                            <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
                                Satu aplikasi untuk semua kebutuhan digital Anda. Nikmati
                                kemudahan, kecepatan, dan keamanan dalam satu genggaman!
                            </p>
                        </section>

                        {/* Right: Glass card with login form */}
                        <aside className="relative">
                            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-indigo-400/30 via-sky-400/30 to-emerald-300/30 blur-xl" />

                            <div className="relative rounded-[2rem] border border-white/40 bg-white/35 p-6 shadow-xl backdrop-blur-xl sm:p-8">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            Masuk ke Portal Alora
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Login langsung di sini, cepat dan praktis.
                                        </p>
                                    </div>

                                    <span className="rounded-full border border-white/50 bg-white/40 px-3 py-1 text-xs font-medium text-slate-700">
                                        v1.0
                                    </span>
                                </div>

                                <form onSubmit={submit} className="mt-6 space-y-4">
                                    {/* Email */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-700">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="mt-1 w-full rounded-2xl border border-white/50 bg-white/45 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none backdrop-blur-md transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/50"
                                            placeholder="nama@email.com"
                                            autoComplete="username"
                                            required
                                        />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-700">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="mt-1 w-full rounded-2xl border border-white/50 bg-white/45 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none backdrop-blur-md transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/50"
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                            required
                                        />
                                    </div>

                                    {/* Remember & Forgot Password */}
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={remember}
                                                onChange={(e) => setRemember(e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            Remember me
                                        </label>

                                        <a
                                            href="#"
                                            className="text-xs font-medium text-indigo-700 hover:text-indigo-800"
                                        >
                                            Lupa password?
                                        </a>
                                    </div>

                                    {/* Error message */}
                                    {err && (
                                        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-3 text-xs text-red-600 backdrop-blur-md">
                                            {err}
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {processing ? "Memproses..." : "Login"}
                                        <span className="transition group-hover:translate-x-0.5">
                                            →
                                        </span>
                                    </button>

                                    {/* Register hint */}
                                    <div className="rounded-2xl border border-white/40 bg-white/30 p-4 text-xs text-slate-600 text-center backdrop-blur-md">
                                        Belum punya akun?{" "}
                                        <a
                                            href="/register"
                                            className="font-semibold text-indigo-700 hover:text-indigo-800"
                                        >
                                            Register
                                        </a>
                                    </div>
                                </form>

                                <footer className="mt-6 flex flex-col items-center justify-center gap-2 border-t border-white/40 pt-4 text-center text-xs text-slate-500">
                                    <span>Alora Group Indonesia © {new Date().getFullYear()}</span>
                                </footer>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}