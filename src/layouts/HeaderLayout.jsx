import { useEffect, useRef, useState } from "react";
import { assetUrl } from "../lib/api";

export default function HeaderLayout({ user, jobTitle, onLogout, children }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoVisible, setLogoVisible] = useState(true);
  const logoTimeoutRef = useRef(null);

  const logos = [
    { src: "/alora.png", alt: "Alora Group Indonesia" },
    { src: "/ikm.png", alt: "IKM" },
    { src: "/waschen.webp", alt: "Waschen" },
    { src: "/cleanox.png", alt: "Cleanox" },
  ];

  const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "U")}&background=a855f7&color=ffffff&bold=true`;

  const buildAvatarSrc = () => {
    if (user?.employee?.profile_path) return assetUrl(user.employee.profile_path);
    if (user?.avatar) return assetUrl(user.avatar);
    return fallbackSrc;
  };

  const avatarSrc = buildAvatarSrc();

  const capitalizeEachWord = (text) =>
    text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLogoVisible(false);
      if (logoTimeoutRef.current) clearTimeout(logoTimeoutRef.current);
      logoTimeoutRef.current = setTimeout(() => {
        setLogoIndex((prev) => (prev + 1) % logos.length);
        setLogoVisible(true);
      }, 250);
    }, 3500);

    return () => {
      clearInterval(intervalId);
      if (logoTimeoutRef.current) clearTimeout(logoTimeoutRef.current);
    };
  }, [logos.length]);

  return (
    <div className="min-h-screen bg-indigo-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <img
                src={logos[logoIndex].src}
                alt={logos[logoIndex].alt}
                className={`h-16 w-36 lg:h-20 lg:w-44 object-contain transition-opacity duration-300 ${logoVisible ? "opacity-100" : "opacity-0"}`}
              />
              <div>
                <h1 className="text-base lg:text-lg font-bold text-slate-800">Alora Group Indonesia</h1>
                <p className="text-xs text-slate-500">Semua layanan dalam satu dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">Halo, {capitalizeEachWord(user?.name || "User")}</p>
                <p className="text-xs text-slate-500">{capitalizeEachWord(jobTitle)}</p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-11 w-11 rounded-full border-2 border-white shadow-md overflow-hidden"
                >
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="h-full w-full rounded-full object-cover"
                    onError={(e) => { e.currentTarget.src = fallbackSrc; }}
                  />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-xl overflow-hidden">
                    <a href="/profile" className="block px-4 py-3 text-sm hover:bg-purple-50 transition">
                      👤 Lihat Profil
                    </a>
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition"
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
              <img
                src={logos[logoIndex].src}
                className={`h-12 w-28 object-contain transition-opacity duration-300 ${logoVisible ? "opacity-100" : "opacity-0"}`}
                alt={logos[logoIndex].alt}
              />
              <div>
                <h1 className="text-sm font-bold text-slate-800">Alora Group Indonesia</h1>
                <p className="text-xs text-slate-500">Portal App Alora</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="h-10 w-10 rounded-full border-2 border-white shadow overflow-hidden"
              >
                <img
                  src={avatarSrc}
                  className="h-full w-full rounded-full object-cover"
                  alt="Avatar"
                  onError={(e) => { e.currentTarget.src = fallbackSrc; }}
                />
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
              <a href="/profile" className="block px-3 py-2 text-sm hover:bg-purple-50 rounded-xl">
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

      <main className="py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}