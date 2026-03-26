import { useState, useEffect } from "react";
import { api } from "../../../lib/api";

export default function StatsCards() {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    const [loading, setLoading] = useState(true);
    const [salesData, setSalesData] = useState({
        actual_sales: 0,
        target_bulanan: 0,
        percentage: 0,
        sales_growth: 0,
    });

    const [customerData, setCustomerData] = useState({
        actual_customer: 0,
        target_customer: 0,
        percentage: 0,
    });
    const [customerLoading, setCustomerLoading] = useState(true);

    // Data lain (masih dummy untuk sekarang)
    const currentEmployee = 156;
    const thisTime = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    const employeeGrowthMonitoring = 3.9;
    const breakdown = [
        { label: "Alora Group", count: 20, color: "bg-emerald-500" },
        { label: "IKM", count: 90, color: "bg-teal-400" },
        { label: "Waschen", count: 46, color: "bg-cyan-300" },
    ];

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH SALES DATA
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const fetchSalesData = async () => {
            try {
                setLoading(true);
                const res = await api("/apps/smartlink/sales-stats");
                if (res.success && res.data) {
                    setSalesData({
                        actual_sales: res.data.actual_sales || 0,
                        target_bulanan: res.data.target_bulanan || 0,
                        percentage: res.data.percentage || 0,
                        sales_growth: res.data.sales_growth || 0,
                    });
                }
            } catch (error) {
                console.error("Error fetching sales data:", error);
                // Fallback ke dummy data jika error
                setSalesData({
                    actual_sales: 95592110,
                    target_bulanan: 535000000,
                    percentage: 18,
                    sales_growth: 9.5,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSalesData();
    }, []);

    // Format angka ke juta (untuk display)
    const formatRupiah = (value) => {
        return value.toLocaleString('id-ID');
    };

    // Fetch customer data
    useEffect(() => {
        const fetchCustomerData = async () => {
            try {
                setCustomerLoading(true);
                const res = await api("/apps/smartlink/customer-targets");
                if (res.success && res.data) {
                    setCustomerData({
                        actual_customer: res.data.actual_customer || 0,
                        target_customer: res.data.target_customer || 0,
                        percentage: res.data.percentage || 0,
                    });
                }
            } catch (error) {
                console.error("Error fetching customer data:", error);
            } finally {
                setCustomerLoading(false);
            }
        };
        fetchCustomerData();
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Total Karyawan (Data Sementara) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 shadow-sm p-5">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-600 font-semibold">Total Karyawan</p>
                                <p className="text-[10px] text-slate-500">
                                    Per {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })} - Data Sementara
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-slate-800">
                            {currentEmployee.toLocaleString("id-ID")}
                        </span>
                        <span className="text-sm text-slate-500 font-medium">karyawan aktif</span>
                    </div>

                    <div className="space-y-1.5">
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

                    <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                        <p className="text-[10px] text-slate-500">
                            Naik <span className="font-semibold text-emerald-600">+{Math.round(currentEmployee * employeeGrowthMonitoring / 100)} orang</span> dari bulan lalu
                        </p>
                        <span className="text-[10px] text-slate-400">👥 SDM</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Total Sales — DINAMIS dari Smartlink */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 shadow-sm p-5">
                <div className="space-y-3">
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
                                <p className="text-[10px] text-slate-500">
                                    {loading ? "Loading..." : `Total Saat Ini - ${thisTime}`}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${salesData.sales_growth >= 0
                                ? "bg-emerald-100 border-emerald-200"
                                : "bg-rose-100 border-rose-200"
                                }`}>
                                <svg className={`h-3 w-3 ${salesData.sales_growth >= 0 ? "text-emerald-600" : "text-rose-600"
                                    }`} fill="currentColor" viewBox="0 0 20 20">
                                    {salesData.sales_growth >= 0 ? (
                                        // Icon panah atas (hijau untuk positif)
                                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                    ) : (
                                        // Icon panah bawah (merah untuk negatif)
                                        <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                                    )}
                                </svg>
                                <span className={`text-[10px] font-bold ${salesData.sales_growth >= 0 ? "text-emerald-700" : "text-rose-700"
                                    }`}>
                                    {salesData.sales_growth >= 0 ? '+' : ''}{salesData.sales_growth}%
                                </span>
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="animate-pulse space-y-2">
                            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <div className="flex items-baseline justify-between">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs text-slate-500 font-medium">Rp</span>
                                        <span className="text-2xl font-bold text-slate-800">
                                            {formatRupiah(salesData.actual_sales)}
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">juta</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-blue-600">{salesData.percentage}%</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Target {thisTime}: <span className="font-semibold text-slate-700">Rp {formatRupiah(salesData.target_bulanan)}</span> juta
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <div className="relative w-full h-2.5 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-cyan-500 rounded-full shadow-sm transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min(salesData.percentage, 100)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-slate-600">
                                        Sisa <span className="font-bold text-blue-600">Rp {formatRupiah(salesData.target_bulanan - salesData.actual_sales)}</span> lagi! 💰
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Total Customer — DINAMIS dari Smartlink */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-sm p-5">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-600 font-semibold">Total Customer Baru</p>
                                <p className="text-[10px] text-slate-500">
                                    {customerLoading ? "Loading..." : `Total Saat Ini-  ${thisTime}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {customerLoading ? (
                        <div className="animate-pulse space-y-2">
                            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <div className="flex items-baseline justify-between">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-slate-800">
                                            {customerData.actual_customer.toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">pelanggan aktif</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-amber-600">{customerData.percentage}%</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Target 2026: <span className="font-semibold text-slate-700">{customerData.target_customer.toLocaleString('id-ID')}</span> pelanggan
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <div className="relative w-full h-2.5 bg-gradient-to-r from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500 rounded-full shadow-sm transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min(customerData.percentage, 100)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-slate-600">
                                        Sisa <span className="font-bold text-orange-600">{(customerData.target_customer - customerData.actual_customer).toLocaleString('id-ID')}</span> lagi! 🎯
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

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