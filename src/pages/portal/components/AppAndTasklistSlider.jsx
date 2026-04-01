import { useState, useRef } from "react";
import { HiOutlineSquares2X2 } from "react-icons/hi2";

const IconClipboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
);

const tabs = [
  { id: "apps", label: "Aplikasi Untuk Kamu", icon: <HiOutlineSquares2X2 className="h-4 w-4" /> },
  { id: "tasklist", label: "To Do List Kamu", icon: <IconClipboard /> },
];

export default function AppAndTasklistSlider({ children }) {
  const [activeTab, setActiveTab] = useState("apps");
  const [direction, setDirection] = useState("right");
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef(null);

  const switchTab = (tabId) => {
    if (tabId === activeTab || animating) return;
    setDirection(tabId === "tasklist" ? "right" : "left");
    setAnimating(true);
    setTimeout(() => {
      setActiveTab(tabId);
      setTimeout(() => setAnimating(false), 50);
    }, 200);
  };

  // children[0] = ApplicationsSection, children[1] = PersonalTasklistCard
  const panels = Array.isArray(children) ? children : [children];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tab header */}
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-3 flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
            }`}
          >
            <span className={activeTab === tab.id ? "text-blue-600" : "text-slate-400"}>{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Slider content */}
      <div ref={containerRef} className="relative overflow-hidden">
        <div
          className={`transition-all duration-300 ease-in-out ${
            animating
              ? direction === "right"
                ? "-translate-x-4 opacity-0"
                : "translate-x-4 opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          {activeTab === "apps" && panels[0]}
          {activeTab === "tasklist" && panels[1]}
        </div>
      </div>
    </div>
  );
}
