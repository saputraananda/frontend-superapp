// frontend/src/pages/aset-management/components/ApprovalSection.jsx
import { useState } from "react";
import { api } from "../../../lib/api";
import { cn, toTitleCase } from "./constants";
import { ApprovalBadge } from "./UIComponents";
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlinePaperAirplane,
    HiOutlineClipboardDocumentCheck,
} from "react-icons/hi2";

export default function ApprovalSection({ aset, employee, onRefresh, showToast }) {
    const [remarks, setRemarks] = useState("");
    const [loading, setLoading] = useState(false);

    const jobLevel = Number(employee?.job_level_id);
    const isStaff = jobLevel >= 4;
    const isSupervisorUp = jobLevel <= 3;
    const isDirector = jobLevel === 1;
    const status = aset?.approval_status;

    const doAction = async (endpoint, successMsg) => {
        setLoading(true);
        try {
            await api(`/aset/${aset.id}/${endpoint}`, {
                method: "POST",
                body: JSON.stringify({ remarks: remarks.trim() || null }),
            });
            showToast("success", successMsg);
            setRemarks("");
            onRefresh();
        } catch (err) {
            showToast("error", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <HiOutlineClipboardDocumentCheck className="h-4 w-4" />
                    Approval Status
                </h4>
                <ApprovalBadge status={status} />
            </div>

            {/* Approval History */}
            {aset.approvals?.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Riwayat Approval</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {aset.approvals.map((a) => (
                            <div key={a.id} className="flex items-start gap-2 rounded-lg bg-white border border-slate-100 p-2.5">
                                <div className={cn(
                                    "mt-0.5 h-2 w-2 rounded-full flex-shrink-0",
                                    a.action.includes("approve") ? "bg-emerald-500" :
                                    a.action.includes("reject") ? "bg-rose-500" : "bg-blue-500"
                                )} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-700">{toTitleCase(a.actor_name)}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {a.action === "submit" && "Mengajukan"}
                                            {a.action === "approve_spv" && "SPV Approve"}
                                            {a.action === "approve_bod" && "BoD Approve"}
                                            {a.action === "reject_spv" && "SPV Reject"}
                                            {a.action === "reject_bod" && "BoD Reject"}
                                        </span>
                                    </div>
                                    {a.remarks && <p className="text-[11px] text-slate-500 mt-0.5">{a.remarks}</p>}
                                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(a.created_at).toLocaleString("id-ID")}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {(((status === "draft" || status === "rejected") && isStaff) ||
              (status === "pending_spv" && isSupervisorUp) ||
              (status === "pending_bod" && isDirector)) && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                    <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Catatan (opsional)..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none placeholder:text-slate-400"
                    />
                    <div className="flex gap-2">
                        {/* Submit (staff → pending_spv) */}
                        {(status === "draft" || status === "rejected") && (
                            <button onClick={() => doAction("submit", "Aset berhasil disubmit")} disabled={loading}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                                <HiOutlinePaperAirplane className="h-3.5 w-3.5" />
                                Submit untuk Approval
                            </button>
                        )}

                        {/* SPV Approve */}
                        {status === "pending_spv" && isSupervisorUp && (
                            <>
                                <button onClick={() => doAction("approve-spv", "Disetujui Supervisor")} disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                                    <HiOutlineCheckCircle className="h-3.5 w-3.5" /> Approve
                                </button>
                                <button onClick={() => doAction("reject", "Aset ditolak")} disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition">
                                    <HiOutlineXCircle className="h-3.5 w-3.5" /> Reject
                                </button>
                            </>
                        )}

                        {/* BoD Approve */}
                        {status === "pending_bod" && isDirector && (
                            <>
                                <button onClick={() => doAction("approve-bod", "Aset disetujui & resmi terdata")} disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                                    <HiOutlineCheckCircle className="h-3.5 w-3.5" /> Approve Final
                                </button>
                                <button onClick={() => doAction("reject", "Aset ditolak")} disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition">
                                    <HiOutlineXCircle className="h-3.5 w-3.5" /> Reject
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}