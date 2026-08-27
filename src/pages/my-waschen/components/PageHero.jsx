const HERO_STYLE = {
  backgroundImage: `
    radial-gradient(rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px),
    radial-gradient(rgba(255, 255, 255, 0.04) 1.5px, transparent 1.5px),
    linear-gradient(to right, #420a2c, #5f1340, #340722)
  `,
  backgroundSize: "28px 28px, 14px 14px, 100% 100%",
  backgroundPosition: "0 0, 14px 14px, 0 0",
};

/**
 * Hero header berpola dot-grid untuk halaman My Waschen.
 * Default: title kiri + aksi kanan (responsive).
 */
export default function PageHero({ children, className = "" }) {
  return (
    <section
      className={[
        "bg-gradient-to-r from-[#420a2c] via-[#5f1340] to-[#340722]",
        "border border-[#5f1340]/40 rounded-2xl sm:rounded-3xl",
        "p-4 sm:p-6 md:p-8 text-white",
        "shadow-xl shadow-[#5f1340]/20",
        "relative overflow-hidden",
        "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6",
        "group",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={HERO_STYLE}
    >
      {children}
    </section>
  );
}
