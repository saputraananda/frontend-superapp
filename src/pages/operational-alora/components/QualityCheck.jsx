import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { HiOutlineCheckBadge, HiOutlineClock } from "react-icons/hi2";
import { ikmOperationalConfig } from "./companyRegistry";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export default function QualityCheckOC() {
  const outletContext = useOutletContext() || {};
  const companyConfig = outletContext.companyConfig || ikmOperationalConfig;
  const selectedCompany = outletContext.selectedCompany || null;

  useEffect(() => {
    const companyName = selectedCompany?.company_name || "Operasional";
    document.title = `Quality Check ${companyName} | Alora App`;
  }, [selectedCompany]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className={cn("mb-5 flex h-20 w-20 items-center justify-center rounded-2xl", companyConfig.heroShellClass)}>
        <HiOutlineCheckBadge className={cn("h-10 w-10", companyConfig.heroIconClass)} />
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-600 mb-3">
        <HiOutlineClock className="h-3.5 w-3.5" />
        Segera Hadir
      </span>
      <h2 className="text-xl font-extrabold text-slate-800 mb-2">Quality Check</h2>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
        Fitur kontrol kualitas proses laundry sedang dalam pengembangan. Akan mencakup
        inspeksi hasil cucian, tracking defect, dan scoring kualitas per outlet.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs text-left">
        {[
          "Inspeksi Hasil Cucian",
          "Tracking Defect",
          "Quality Scoring",
          "Laporan Komplain",
        ].map((f) => (
          <div
            key={f}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <span className="text-xs text-slate-500">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
