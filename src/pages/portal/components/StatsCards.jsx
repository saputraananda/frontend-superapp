export default function StatsCards() {
    // Data Total Karyawan
    const currentEmployee = 34;
    const employeeGrowth = 3.9;

    // Data Total Sales (dalam juta rupiah)
    const targetSales = 535_000_000; // 500 juta
    const currentSales = 95_592_110; // 
    const salesPercentage = Math.round((currentSales / targetSales) * 100);
    const salesGrowth = 9.5;

    // Data Total Customer
    const targetCustomer = 7700;
    const currentCustomer = 3974;
    const customerPercentage = Math.round((currentCustomer / targetCustomer) * 100);
    const customerGrowth = 12.5;

    // Data Total Karyawan — monitoring only
    const employeeGrowthMonitoring = 3.9; // % growth dari bulan lalu
    const breakdown = [
        { label: "Alora Group", count: 34, color: "bg-emerald-500" },
        { label: "IKM", count: 70, color: "bg-teal-400" },
        { label: "Waschen", count: 50, color: "bg-cyan-300" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Karyawan */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 shadow-sm p-5">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-600 font-semibold">Total Karyawan</p>
                                <p className="text-[10px] text-slate-500">Per {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })} - Dummy Data</p>
                            </div>
                        </div>
                        {/* Growth badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 border border-emerald-200">
                            <svg className="h-3 w-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[10px] font-bold text-emerald-700">+{employeeGrowth}%</span>
                        </span>
                    </div>

                    {/* Angka utama */}
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-slate-800">
                            {currentEmployee.toLocaleString("id-ID")}
                        </span>
                        <span className="text-sm text-slate-500 font-medium">karyawan aktif</span>
                    </div>

                    {/* Breakdown bar — stacked */}
                    <div className="space-y-1.5">
                        {/* Legend */}
                        <div className="flex items-center gap-3">
                            {breakdown.map((b) => (
                                <div key={b.label} className="flex items-center gap-1">
                                    <span className={`h-2 w-2 rounded-full ${b.color}`} />
                                    <span className="text-[10px] text-slate-500">
                                        {b.label}
                                        <span className="font-semibold text-slate-700 ml-0.5">{b.count}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer info */}
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                        <p className="text-[10px] text-slate-500">
                            Naik <span className="font-semibold text-emerald-600">+{Math.round(currentEmployee * employeeGrowthMonitoring / 100)} orang</span> dari bulan lalu
                        </p>
                        <span className="text-[10px] text-slate-400">👥 SDM</span>
                    </div>

                </div>
            </div>

            {/* Total Sales */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 shadow-sm p-5">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-sm">
                                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-600 font-semibold">Total Sales</p>
                                <p className="text-[10px] text-slate-500">Target Bulan Ini - Dummy Data</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 border border-emerald-200">
                                <svg className="h-3 w-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[10px] font-bold text-emerald-700">+{salesGrowth}%</span>
                            </span>
                        </div>
                    </div>

                    {/* Numbers */}
                    <div className="space-y-1">
                        <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs text-slate-500 font-medium">Rp</span>
                                <span className="text-2xl font-bold text-slate-800">
                                    {currentSales.toLocaleString('id-ID')}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">juta</span>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-blue-600">{salesPercentage}%</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Target: <span className="font-semibold text-slate-700">Rp {targetSales.toLocaleString('id-ID')}</span> juta
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                        <div className="relative w-full h-2.5 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-cyan-500 rounded-full shadow-sm transition-all duration-1000 ease-out"
                                style={{ width: `${salesPercentage}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                            </div>
                        </div>

                        {/* Motivational Message */}
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-slate-600">
                                Sisa <span className="font-bold text-blue-600">Rp {(targetSales - currentSales).toLocaleString('id-ID', { minimumFractionDigits: 0 })}</span> lagi! 💰
                            </p>
                            {/* <span className="text-[10px] text-blue-600 font-semibold">
                                {salesPercentage < 25 ? "Gas terus!" : 
                                 salesPercentage < 50 ? "Keep selling! 💪" : 
                                 salesPercentage < 75 ? "Luar biasa! 🔥" : 
                                 salesPercentage < 90 ? "Hampir target! 🚀" : 
                                 "Top performer! 🎉"}
                            </span> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Total Customer */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-sm p-5">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-600 font-semibold">Total Customer</p>
                                <p className="text-[10px] text-slate-500">Target 2026 - Dummy Data</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 border border-emerald-200">
                                <svg className="h-3 w-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[10px] font-bold text-emerald-700">+{customerGrowth}%</span>
                            </span>
                        </div>
                    </div>

                    {/* Numbers */}
                    <div className="space-y-1">
                        <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-800">
                                    {currentCustomer.toLocaleString('id-ID')}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">pelanggan</span>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-amber-600">{customerPercentage}%</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Target: <span className="font-semibold text-slate-700">{targetCustomer.toLocaleString('id-ID')}</span> pelanggan
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                        <div className="relative w-full h-2.5 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500 rounded-full shadow-sm transition-all duration-1000 ease-out"
                                style={{ width: `${customerPercentage}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                            </div>
                        </div>

                        {/* Motivational Message */}
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-slate-600">
                                Sisa <span className="font-bold text-orange-600">{(targetCustomer - currentCustomer).toLocaleString('id-ID')}</span> lagi! 🎯
                            </p>
                            {/* <span className="text-[10px] text-amber-600 font-semibold">
                                {customerPercentage < 25 ? "Ayo mulai!" : 
                                 customerPercentage < 50 ? "Terus semangat! 💪" : 
                                 customerPercentage < 75 ? "Hampir setengah! 🔥" : 
                                 customerPercentage < 90 ? "Tinggal sedikit lagi! 🚀" : 
                                 "Hampir sampai! 🎉"}
                            </span> */}
                        </div>
                    </div>
                </div>

                {/* Shimmer animation */}
                <style jsx>{`
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .animate-shimmer {
                        animation: shimmer 2s infinite;
                    }
                `}</style>
            </div>
        </div>
    );
}