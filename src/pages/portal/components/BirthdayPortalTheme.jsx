import { useEffect } from "react";

// ── Floating decorative elements ───────────────────────────────────────────
const FLOATIES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 3.7) % 100}%`,
  delay: `${(i * 0.45) % 9}s`,
  duration: `${7 + (i % 6) * 1.3}s`,
  symbol: ["🌸", "💗", "🎀", "⭐", "💕", "🌷", "✨", "🩷"][i % 8],
  size: `${13 + (i % 4) * 5}px`,
  opacity: 0.35 + (i % 5) * 0.1,
  drift: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 8)}px`,
}));

// ── CSS injected into <head> ───────────────────────────────────────────────
const BIRTHDAY_CSS = `
  /* ── Main background ── */
  body.bday-portal .min-h-screen {
    background: linear-gradient(160deg, #fff0f7 0%, #ffe4f0 35%, #ffd6e8 70%, #fff5fb 100%) !important;
    position: relative;
  }

  /* ── Header ── */
  body.bday-portal header {
    background: linear-gradient(90deg, #fff5fa 0%, #ffe8f2 50%, #fff5fa 100%) !important;
    border-bottom: 2px solid #ffb3d1 !important;
    box-shadow: 0 2px 12px rgba(255,77,148,0.14) !important;
  }
  body.bday-portal header h1 {
    color: #c94b8c !important;
  }
  body.bday-portal header p {
    color: #e07aaa !important;
  }

  /* ── Stat cards — swap gradient colours ── */
  body.bday-portal .from-emerald-50  { --tw-gradient-from: #fff0f7 !important; }
  body.bday-portal .to-teal-50       { --tw-gradient-to:   #ffe4f0 !important; }
  body.bday-portal .border-emerald-200 { border-color: #ffb3d1 !important; }

  body.bday-portal .from-blue-50     { --tw-gradient-from: #fff5fb !important; }
  body.bday-portal .to-cyan-50       { --tw-gradient-to:   #ffe8f2 !important; }
  body.bday-portal .border-blue-200  { border-color: #ffc1d9 !important; }

  body.bday-portal .from-amber-50    { --tw-gradient-from: #fff0f7 !important; }
  body.bday-portal .to-orange-50     { --tw-gradient-to:   #ffd6e8 !important; }
  body.bday-portal .border-amber-200 { border-color: #ffadd0 !important; }

  /* ── Stat icon badge backgrounds ── */
  body.bday-portal .from-emerald-400.to-teal-500,
  body.bday-portal .from-blue-400.to-cyan-500,
  body.bday-portal .from-amber-400.to-orange-500 {
    background: linear-gradient(135deg, #ff6bab, #ff4d94) !important;
  }

  /* ── Stat progress bar ── */
  body.bday-portal .from-blue-400.via-cyan-400.to-cyan-500,
  body.bday-portal .from-amber-400.via-orange-400.to-orange-500 {
    background: linear-gradient(to right, #ff9ec4, #ff6bab, #ff4d94) !important;
  }
  body.bday-portal .text-blue-600,
  body.bday-portal .text-amber-600  { color: #e0569a !important; }
  body.bday-portal .text-emerald-600 { color: #c94b8c !important; }

  /* ── White cards (tasks, youtube, weather, apps) ── */
  body.bday-portal .bg-white.rounded-xl {
    background: linear-gradient(145deg, #fff8fb 0%, #fff0f7 100%) !important;
    border-color: #ffcce5 !important;
  }
  body.bday-portal .bg-slate-50 {
    background-color: #fff5fa !important;
  }
  body.bday-portal .border-slate-100,
  body.bday-portal .border-slate-200 {
    border-color: #ffcce5 !important;
  }

  /* ── Chatbot button ── */
  body.bday-portal .bg-gradient-to-br.from-purple-600 {
    background: linear-gradient(135deg, #ff4d94, #c94b8c) !important;
  }

  /* ── Floating petal animation ── */
  @keyframes bday-petal-fall {
    0%   { transform: translateY(-40px) translateX(0) rotate(0deg);   opacity: 0;   }
    10%  { opacity: 1; }
    90%  { opacity: 0.8; }
    100% { transform: translateY(110vh) translateX(var(--drift)) rotate(540deg); opacity: 0; }
  }
  .bday-petal {
    position: fixed;
    top: -40px;
    pointer-events: none;
    animation: bday-petal-fall linear infinite;
    z-index: 1;
    user-select: none;
  }

  /* ── Banner shimmer ── */
  @keyframes bday-banner-shimmer {
    0%   { background-position: 0% center; }
    100% { background-position: 200% center; }
  }
  @keyframes bday-name-glow {
    0%, 100% { text-shadow: 0 0 12px rgba(255,77,148,0.5); }
    50%       { text-shadow: 0 0 28px rgba(255,77,148,0.9), 0 0 48px rgba(255,150,200,0.5); }
  }
  @keyframes bday-bear-swing {
    0%, 100% { transform: rotate(-5deg) scale(1);    }
    50%       { transform: rotate(5deg)  scale(1.06); }
  }
  @keyframes bday-badge-pop {
    0%   { transform: scale(0.85); opacity: 0; }
    70%  { transform: scale(1.06); }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes bday-ticker {
    0%   { transform: translateX(100%);  }
    100% { transform: translateX(-100%); }
  }
`;

// ── Component ──────────────────────────────────────────────────────────────
export default function BirthdayPortalTheme() {
  // Inject CSS + body class on mount, clean up on unmount
  useEffect(() => {
    document.body.classList.add("bday-portal");

    const styleEl = document.createElement("style");
    styleEl.id = "bday-portal-css";
    styleEl.textContent = BIRTHDAY_CSS;
    document.head.appendChild(styleEl);

    return () => {
      document.body.classList.remove("bday-portal");
      document.getElementById("bday-portal-css")?.remove();
    };
  }, []);

  return (
    <>
      {/* ── Floating petals (fixed layer, behind everything) ── */}
      {FLOATIES.map((f) => (
        <span
          key={f.id}
          className="bday-petal"
          style={{
            left: f.left,
            fontSize: f.size,
            opacity: f.opacity,
            animationDuration: f.duration,
            animationDelay: f.delay,
            "--drift": f.drift,
          }}
        >
          {f.symbol}
        </span>
      ))}

      {/* ── Birthday banner ── */}
      <div
        style={{
          background: "linear-gradient(90deg, #ff4d94, #ff6bab, #c94b8c, #ff4d94, #ff6bab, #c94b8c)",
          backgroundSize: "200% auto",
          animation: "bday-banner-shimmer 4s linear infinite",
          borderRadius: "20px",
          padding: "2px",
          marginBottom: "24px",
          boxShadow: "0 8px 32px rgba(255,77,148,0.3), 0 2px 8px rgba(255,77,148,0.2)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #fff0f7 0%, #ffe4f0 50%, #ffd6e8 100%)",
            borderRadius: "18px",
            padding: "24px 28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Corner decorations */}
          {["top-3 left-4", "top-3 right-4", "bottom-3 left-4", "bottom-3 right-4"].map((pos, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                fontSize: "20px",
                opacity: 0.5,
                ...Object.fromEntries(
                  pos.split(" ").map((p) => {
                    const [side, val] = p.split("-");
                    return [side, `${val * 4}px`];
                  })
                ),
              }}
            >
              {["🌸", "🎀", "💗", "✨"][i]}
            </span>
          ))}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            {/* Loopy mascot */}
            <div
              style={{
                animation: "bday-bear-swing 2.4s ease-in-out infinite",
                filter: "drop-shadow(0 6px 16px rgba(255,77,148,0.45))",
                flexShrink: 0,
              }}
            >
              <img
                src="/loopy.png"
                alt="Loopy"
                style={{
                  width: "110px",
                  height: "110px",
                  objectFit: "contain",
                  borderRadius: "50%",
                  border: "3px solid #ffb3d1",
                  background: "rgba(255,240,247,0.6)",
                }}
              />
            </div>

            {/* Main text */}
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "3px",
                  color: "#c94b8c",
                  textTransform: "uppercase",
                  margin: "0 0 4px",
                }}
              >
                🎀 Special Day — Team Alora 🎀
              </p>

              <h2
                style={{
                  fontSize: "clamp(18px, 4vw, 26px)",
                  fontWeight: 900,
                  margin: "0 0 2px",
                  background: "linear-gradient(90deg, #ff4d94, #c94b8c, #ff6bab)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "bday-name-glow 2.5s ease-in-out infinite",
                  lineHeight: 1.2,
                }}
              >
                Happy Birthday, Ghassany! 🎂
              </h2>

              <p
                style={{
                  fontSize: "clamp(13px, 2.5vw, 15px)",
                  fontWeight: 600,
                  color: "#7a3060",
                  margin: "0 0 10px",
                }}
              >
                Semoga Allah selalu melimpahkan keberkahan untukmu 🌸
              </p>

              {/* Badges */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { icon: "🎁", text: "Sehat Selalu" },
                  { icon: "💝", text: "Bahagia Dunia Akhirat" },
                  { icon: "⭐", text: "Sukses & Berkah" },
                  { icon: "🌷", text: "Doa Terbaik Untukmu" },
                ].map((b, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 12px",
                      background: "rgba(255,255,255,0.7)",
                      border: "1.5px solid #ffb3d1",
                      borderRadius: "99px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#c94b8c",
                      animation: `bday-badge-pop 0.5s ${i * 0.12}s both`,
                    }}
                  >
                    {b.icon} {b.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Loopy kanan — mirror */}
            <div
              style={{
                animation: "bday-bear-swing 2.8s 0.4s ease-in-out infinite",
                filter: "drop-shadow(0 6px 16px rgba(255,77,148,0.45))",
                flexShrink: 0,
                transform: "scaleX(-1)",
              }}
            >
              <img
                src="/loopy.png"
                alt="Loopy"
                style={{
                  width: "110px",
                  height: "110px",
                  objectFit: "contain",
                  borderRadius: "50%",
                  border: "3px solid #ffb3d1",
                  background: "rgba(255,240,247,0.6)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}