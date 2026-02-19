import { useState } from "react";

export default function HeaderLayout({
  user,
  jobTitle,
  onLogout,
  children,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const avatarSrc =
    user?.avatar || "https://ui-avatars.com/api/?name=" + (user?.name || "U");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <img
                src="/alora.png"
                alt="Alora Group Indonesia"
                className="h-16 lg:h-20"
              />
              <div>
                <h1 className="text-base lg:text-lg font-bold text-slate-800">
                  Alora Group Indonesia
                </h1>
                <p className="text-xs text-slate-500">
                  Semua layanan dalam satu dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">
                  Halo, {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-500">{jobTitle}</p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-11 w-11 rounded-full border border-white shadow-md overflow-hidden"
                >
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="h-full w-full rounded-full"
                  />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-xl overflow-hidden">
                    <a
                      href="/profile"
                      className="block px-4 py-3 text-sm hover:bg-purple-50"
                    >
                      👤 Lihat Profil
                    </a>
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <img src="/alora.png" className="h-12" />
              <div>
                <h1 className="text-sm font-bold text-slate-800">
                  Alora Group Indonesia
                </h1>
                <p className="text-xs text-slate-500">Portal App Alora</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="h-10 w-10 rounded-full border overflow-hidden"
              >
                <img src={avatarSrc} className="h-full w-full rounded-full" />
              </button>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/70 border"
              >
                ☰
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div className="md:hidden pb-3 border-t mt-2 pt-3 space-y-2">
              <a
                href="/profile"
                className="block px-3 py-2 text-sm hover:bg-purple-50 rounded-xl"
              >
                👤 Lihat Profil
              </a>
              <button
                onClick={onLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}