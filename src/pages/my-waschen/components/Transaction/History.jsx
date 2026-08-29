import { useCallback, useState } from "react";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineArrowPathRoundedSquare,
  HiOutlineTrash,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";
import HistoryTransaction from "./HistoryTransaction";
import RequestRefundTransaction from "./RequestRefundTransaction";
import RequestDeleteTransaction from "./RequestDeleteTransaction";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const TABS = [
  { id: "history", label: "Riwayat Transaksi", icon: HiOutlineClipboardDocumentList, accent: "text-[#5f1340]" },
  { id: "refund", label: "Request Refund", icon: HiOutlineArrowPathRoundedSquare, accent: "text-sky-600" },
  { id: "delete", label: "Request Delete", icon: HiOutlineTrash, accent: "text-rose-600" },
];

async function fetchMeta() {
  const [sumRes, outletRes, empRes, wsRes] = await Promise.all([
    api("/waschen/transactions/summary"),
    api("/waschen/outlets"),
    api("/waschen/employees"),
    api("/waschen/work-statuses?isFilterTab=1&isActive=1"),
  ]);
  return {
    summary: sumRes.data || null,
    outlets: outletRes.data || [],
    employees: empRes.data || [],
    workStatuses: wsRes.data || [],
  };
}

export default function History() {
  const [tab, setTab] = useState("history");
  const [summary, setSummary] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workStatuses, setWorkStatuses] = useState([]);
  const [metaReady, setMetaReady] = useState(false);

  const applyMeta = useCallback((meta) => {
    setSummary(meta.summary);
    setOutlets(meta.outlets);
    setEmployees(meta.employees);
    setWorkStatuses(meta.workStatuses);
  }, []);

  const loadMeta = useCallback(() => {
    fetchMeta()
      .then(applyMeta)
      .catch(() => {
        /* optional meta */
      });
  }, [applyMeta]);

  // Load sekali saat mount via event-style kickoff (bukan sync setState di effect body)
  if (!metaReady) {
    setMetaReady(true);
    loadMeta();
  }

  const badgeFor = (id) => {
    if (!summary) return null;
    if (id === "history") return summary.activeCount;
    if (id === "refund") return summary.refundTotal;
    if (id === "delete") return summary.deleteTotal;
    return null;
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[100rem] mx-auto overflow-x-hidden">
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Riwayat Transaksi</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Pantau nota, approve refund, dan approve pengajuan hapus
          </p>
        </div>
      </PageHero>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const count = badgeFor(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition",
                active
                  ? "border-white bg-white text-[#5f1340] shadow-md"
                  : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-white hover:border-slate-300"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? t.accent : "text-slate-400")} />
              <span>{t.label}</span>
              {count != null && (
                <span
                  className={cn(
                    "ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active ? "bg-[#5f1340]/10 text-[#5f1340]" : "bg-slate-200 text-slate-600"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "history" && (
        <HistoryTransaction
          outlets={outlets}
          workStatuses={workStatuses}
          onChanged={loadMeta}
        />
      )}
      {tab === "refund" && (
        <RequestRefundTransaction
          employees={employees}
          onChanged={loadMeta}
        />
      )}
      {tab === "delete" && (
        <RequestDeleteTransaction
          employees={employees}
          onChanged={loadMeta}
        />
      )}
    </div>
  );
}
