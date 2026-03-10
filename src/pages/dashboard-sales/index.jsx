import React, { useMemo, useState } from "react";
import UnderDevelopmentDialog from "../../components/UnderDevelopmentDialog";
import DashboardHeader from "./components/DashboardHeader";
import SalesOverviewCard from "./components/SalesOverviewCard";
import TrafficCard from "./components/TrafficCard";
import MiniStatsCards from "./components/MiniStatsCards";
import CustomerAnalyticsCard from "./components/CustomerAnalyticsCard";
import ComplainSystemCard from "./components/ComplainSystemCard";
import CACRecommendationCard from "./components/CACRecommendationCard";

export default function Dashboard() {
  const [showDevDialog, setShowDevDialog] = useState(true);
  const [period, setPeriod] = useState("May 2024");
  const [outlet, setOutlet] = useState("All Outlets");
  const [channel, setChannel] = useState("All Channels");
  const [shift, setShift] = useState("All Shifts");
  const [rangeTab, setRangeTab] = useState("MONTHLY");

  const salesData = useMemo(() => [
    { x: "May", sales: 120, orders: 90 },
    { x: "May", sales: 240, orders: 180 },
    { x: "May", sales: 200, orders: 210 },
    { x: "May", sales: 260, orders: 190 },
    { x: "May", sales: 230, orders: 240 },
    { x: "May", sales: 320, orders: 280 },
    { x: "May", sales: 270, orders: 340 },
    { x: "May", sales: 360, orders: 210 },
    { x: "May", sales: 210, orders: 90 },
  ], []);

  const trafficBreakdown = useMemo(() => [
    { name: "Inbound", value: 33, color: "#A855F7" },
    { name: "Existing", value: 55, color: "#EC4899" },
    { name: "Vs. Yesterday", value: 12, color: "#F59E0B" },
  ], []);

  const trafficDonut = useMemo(() => [
    { name: "Achieved", value: 88, color: "#EC4899" },
    { name: "Remaining", value: 12, color: "#A855F7" },
  ], []);

  const customerData = useMemo(() => [
    { name: "Loyal", value: 31, color: "#EC4899" },
    { name: "Regular", value: 24, color: "#60A5FA" },
    { name: "One Time", value: 24, color: "#F59E0B" },
    { name: "Other", value: 21, color: "#A855F7" },
  ], []);

  const analyticsTimeData = useMemo(() => [
    { t: 1, v: 78 }, { t: 2, v: 84 }, { t: 3, v: 81 },
    { t: 4, v: 87 }, { t: 5, v: 92 }, { t: 6, v: 95 },
  ], []);

  const pageViewData = useMemo(() => [
    { t: 1, v: 380 }, { t: 2, v: 400 }, { t: 3, v: 390 },
    { t: 4, v: 410 }, { t: 5, v: 420 }, { t: 6, v: 400 },
  ], []);

  const oxennData = useMemo(() => [
    { t: 1, v: 410 }, { t: 2, v: 420 }, { t: 3, v: 450 },
    { t: 4, v: 430 }, { t: 5, v: 470 }, { t: 6, v: 445 },
  ], []);

  const cacDonut = useMemo(() => [
    { name: "Salaries", value: 32, color: "#EC4899" },
    { name: "Operational", value: 39, color: "#60A5FA" },
    { name: "Marketing", value: 32, color: "#F59E0B" },
  ], []);

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <UnderDevelopmentDialog open={showDevDialog} onClose={() => setShowDevDialog(false)} />

      <DashboardHeader
        period={period} setPeriod={setPeriod}
        outlet={outlet} setOutlet={setOutlet}
        channel={channel} setChannel={setChannel}
        shift={shift} setShift={setShift}
      />

      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-5 pb-14">
        <div className="grid grid-cols-12 gap-5">
          <SalesOverviewCard salesData={salesData} rangeTab={rangeTab} setRangeTab={setRangeTab} />
          <TrafficCard trafficDonut={trafficDonut} trafficBreakdown={trafficBreakdown} period={period} />
          <MiniStatsCards pageViewData={pageViewData} oxennData={oxennData} />
          <CustomerAnalyticsCard customerData={customerData} analyticsTimeData={analyticsTimeData} period={period} />
          <ComplainSystemCard />
          <CACRecommendationCard cacDonut={cacDonut} />
        </div>

        <div className="mt-8 text-center text-xs font-semibold text-slate-400">
          © {new Date().getFullYear()} — Dashboard Analytics
        </div>
      </div>
    </div>
  );
}