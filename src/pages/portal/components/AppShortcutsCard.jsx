const shortcuts = [
    {
        id: 1,
        name: "Alora SuperApp",
        description: "Satu portal aplikasi untuk manajemen Alora",
        gradient: "from-[#1a0533] via-[#4b1a8c] to-[#7c3aed]",
        hoverGradient: "hover:from-[#12022a] hover:via-[#3b1270] hover:to-[#6d28d9]",
        iconBg: "bg-white/20",
        icon: (
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
        ),
        href: "https://central.waschenalora.com",
    },
    {
        id: 2,
        name: "IKM Mobile",
        description: "Aplikasi Tim Produksi IKM",
        gradient: "from-[#020c1b] via-[#0a2a4a] to-[#0ea5e9]",
        hoverGradient: "hover:from-[#010810] hover:via-[#071e35] hover:to-[#0284c7]",
        iconBg: "bg-white/20",
        icon: (
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-5 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
            </svg>
        ),
        href: "https://absensi.ikmalora.com",
    },
    {
        id: 3,
        name: "Cleanox Tracking System",
        description: "Sistem pemantauan Cleanox",
        gradient: "from-[#022c0a] via-[#065f1e] to-[#16a34a]",
        hoverGradient: "hover:from-[#011a06] hover:via-[#044a17] hover:to-[#15803d]",
        iconBg: "bg-white/20",
        icon: (
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
        ),
        href: "https://central.cleanoxindonesia.com",
    },
];

export default function AppShortcutsCard() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {shortcuts.map((app) => (
                <a
                    key={app.id}
                    href={app.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 bg-gradient-to-r ${app.gradient} ${app.hoverGradient} rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 group`}
                >
                    {/* Icon */}
                    <div className={`h-11 w-11 rounded-xl ${app.iconBg} flex items-center justify-center flex-shrink-0`}>
                        {app.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">
                            {app.name}
                        </p>
                        <p className="text-[11px] text-white/70 leading-tight mt-0.5 truncate">
                            {app.description}
                        </p>
                    </div>

                    {/* Chevron */}
                    <svg
                        className="h-4 w-4 text-white/60 flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-150"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            ))}
        </div>
    );
}
