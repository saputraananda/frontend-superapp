import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { HiOutlineClock, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { ikmOperationalConfig } from "./companyRegistry";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export default function ComplainOC() {
  const outletContext = useOutletContext() || {};
  const companyConfig = outletContext.companyConfig || ikmOperationalConfig;
  const selectedCompany = outletContext.selectedCompany || null;

  useEffect(() => {
    const companyName = selectedCompany?.company_name || "Operasional";
    document.title = `Complain ${companyName} | Alora App`;
  }, [selectedCompany]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className={cn("mb-5 flex h-20 w-20 items-center justify-center rounded-2xl", companyConfig.heroShellClass)}>
        <HiOutlineExclamationTriangle className={cn("h-10 w-10", companyConfig.heroIconClass)} />
      </div>
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-600">
        <HiOutlineClock className="h-3.5 w-3.5" />
        Segera Hadir
      </span>
      <h2 className="mb-2 text-xl font-extrabold text-slate-800">Complain</h2>
      <p className="max-w-sm text-sm leading-relaxed text-slate-500">
        Fitur monitoring komplain operasional sedang dalam pengembangan. Halaman ini akan
        mencakup daftar komplain, status tindak lanjut, prioritas kasus, dan ringkasan
        performa penanganan per outlet.
      </p>
      <div className="mt-6 grid w-full max-w-xs grid-cols-2 gap-3 text-left">
        {[
          "Daftar Komplain",
          "Status Follow Up",
          "Prioritas Kasus",
          "SLA Penanganan",
        ].map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            <div className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-500">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}