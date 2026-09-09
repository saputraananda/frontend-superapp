const Glyph = ({ d }) => (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d={d} />
    </svg>
);

const units = [
    {
        company: "Waschen Laundry",
        note: "Layanan laundry ritel",
        ring: "ring-pink-200/70",
        chip: "bg-pink-100 text-pink-700",
        wash: "from-pink-500/10",
        dot: "bg-pink-500",
        apps: [
            {
                name: "My Waschen",
                what: "Kasir & transaksi harian outlet",
                host: "pos.mywaschen.com",
                icon: <Glyph d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zM7.17 14.75l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49L19.13 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.44C5.09 14.37 5 14.67 5 15c0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25z" />,
            },
            {
                name: "Waschen Mobile",
                what: "Absensi, payroll & data karyawan",
                host: "app.mywaschen.com",
                icon: <Glyph d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
            },
        ],
    },
    {
        company: "Cleanox Indonesia",
        note: "Produksi bahan pembersih",
        ring: "ring-emerald-200/70",
        chip: "bg-emerald-100 text-emerald-700",
        wash: "from-emerald-500/10",
        dot: "bg-emerald-500",
        apps: [
            {
                name: "Cleanox System",
                what: "Manajemen produksi & distribusi",
                host: "app.cleanoxindonesia.com",
                icon: <Glyph d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 12H7v-2h10v2zm0-4H7V9h10v2zm-3-4H7V5h7v2z" />,
            },
            {
                name: "Cleanox Tracking",
                what: "Pemantauan armada & pengiriman",
                host: "central.cleanoxindonesia.com",
                icon: <Glyph d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />,
            },
        ],
    },
    {
        company: "IKM Alora",
        note: "Laundry linen rumah sakit",
        ring: "ring-sky-200/70",
        chip: "bg-sky-100 text-sky-700",
        wash: "from-sky-500/10",
        dot: "bg-sky-500",
        apps: [
            {
                name: "IKM Mobile",
                what: "Absensi & operasional tim produksi",
                host: "absensi.ikmalora.com",
                icon: <Glyph d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-5 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />,
            },
            {
                name: "Linen Monitoring System",
                what: "Serah terima linen antar rumah sakit",
                host: "linen.ikmalora.com",
                icon: <Glyph d="M15.5 2h-7L6 5.5V22h12V5.5L15.5 2zM12 4.2l1.3 1.8h-2.6L12 4.2zM16 20H8V7.6h8V20zm-6-9h4v1.6h-4V11zm0 3.4h4V16h-4v-1.6z" />,
            },
        ],
    },
];

export default function AppShortcutsCard() {
    return (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-white ring-1 ring-slate-200 p-5 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    Ekosistem Alora Group
                </h2>
            </div>

            {/* Unit bisnis */}
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {units.map((unit) => (
                    <div
                        key={unit.company}
                        className={`relative overflow-hidden rounded-2xl bg-white p-4 ring-1 ${unit.ring}`}
                    >
                        <span
                            className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${unit.wash} to-transparent`}
                        />

                        <div className="relative flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${unit.dot}`} />
                            <h3 className="text-sm font-bold text-slate-900">{unit.company}</h3>
                        </div>
                        <p className="relative mt-0.5 pl-3.5 text-xs text-slate-400">{unit.note}</p>

                        <ul className="relative mt-3 space-y-1">
                            {unit.apps.map((app) => (
                                <li key={app.host}>
                                    <a
                                        href={`https://${app.host}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                    >
                                        <span
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unit.chip} transition-transform duration-200 group-hover:scale-105`}
                                        >
                                            {app.icon}
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-slate-800">
                                                {app.name}
                                            </span>
                                            <span className="block truncate text-xs text-slate-500">
                                                {app.what}
                                            </span>
                                            <span className="mt-1 block truncate font-mono text-[10px] text-slate-400">
                                                {app.host}
                                            </span>
                                        </span>

                                        <svg
                                            className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:text-slate-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H9m8 0v8" />
                                        </svg>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}
