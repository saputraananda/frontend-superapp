import { useCallback, useEffect, useMemo, useState } from "react";
import {
	HiOutlineBanknotes,
	HiOutlineCheckCircle,
	HiOutlineChevronDown,
	HiOutlineClipboardDocument,
	HiOutlineClock,
	HiOutlineDocumentCheck,
	HiOutlineExclamationTriangle,
	HiOutlineTrash,
} from "react-icons/hi2";
import { api, apiUpload } from "../../../../lib/api";
import { ProofUploadModal, StatCard, StatusBadge } from "./MealUi";
import {
	buildMealWaText,
	capitalEachWord,
	cn,
	formatDate,
	formatDateTime,
	formatRp,
	getCutoffRange,
	getDefaultCutoffSelection,
	groupTransfersByRecipient,
	PERIOD_MONTHS,
	resolveAssetUrl,
} from "./mealUtils";

export default function MealFinanceTab({ refreshKey }) {
	const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date(), 26), []);
	const [status, setStatus] = useState("");
	const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
	const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);

	const [records, setRecords] = useState([]);
	const [summary, setSummary] = useState({ diajukan: 0, sebagian_tf: 0, selesai: 0, total_amount: 0 });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [reloadKey, setReloadKey] = useState(0);

	const [openId, setOpenId] = useState(null);
	const [details, setDetails] = useState({});
	const [detailLoading, setDetailLoading] = useState(false);

	const [proofTarget, setProofTarget] = useState(null);
	const [submittingProof, setSubmittingProof] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleting, setDeleting] = useState(false);
	const [copiedKey, setCopiedKey] = useState("");

	const yearOptions = useMemo(() => {
		const base = new Date().getFullYear();
		return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
	}, []);

	const range = useMemo(() => getCutoffRange(cutoffMonth, cutoffYear, 26), [cutoffMonth, cutoffYear]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError("");
				const qs = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate, limit: "100" });
				if (status) qs.set("status", status);
				const data = await api(`/cleanox/meal/requests?${qs.toString()}`);
				if (cancelled) return;
				setRecords(data?.records || []);
				setSummary(data?.summary || { diajukan: 0, sebagian_tf: 0, selesai: 0, total_amount: 0 });
			} catch (err) {
				if (!cancelled) {
					setRecords([]);
					setError(err?.message || "Gagal memuat pengajuan");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [range.startDate, range.endDate, status, refreshKey, reloadKey]);

	const loadDetail = useCallback(async (id) => {
		setDetailLoading(true);
		try {
			const data = await api(`/cleanox/meal/requests/${id}`);
			setDetails((prev) => ({ ...prev, [id]: data }));
		} catch (err) {
			setError(err?.message || "Gagal memuat detail pengajuan");
		} finally {
			setDetailLoading(false);
		}
	}, []);

	const toggleOpen = (id) => {
		if (openId === id) {
			setOpenId(null);
			return;
		}
		setOpenId(id);
		if (!details[id]) loadDetail(id);
	};

	const copyText = async (key, text) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedKey(key);
			setTimeout(() => setCopiedKey(""), 2000);
		} catch {
			setError("Gagal menyalin ke clipboard");
		}
	};

	const handleProofSubmit = async ({ file, note }) => {
		if (!proofTarget) return;
		setSubmittingProof(true);
		setError("");
		try {
			const fd = new FormData();
			fd.append("proof_doc", file);
			if (note) fd.append("process_note", note);
			await apiUpload(`/cleanox/meal/transfers/${proofTarget.id}/complete`, { method: "PUT", body: fd });
			const requestId = proofTarget.request_id;
			setProofTarget(null);
			await loadDetail(requestId);
			setReloadKey((k) => k + 1);
		} catch (err) {
			setError(err?.message || "Gagal menyimpan bukti TF");
		} finally {
			setSubmittingProof(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setDeleting(true);
		setError("");
		try {
			await api(`/cleanox/meal/requests/${deleteTarget.id}`, { method: "DELETE" });
			setDetails((prev) => {
				const next = { ...prev };
				delete next[deleteTarget.id];
				return next;
			});
			if (openId === deleteTarget.id) setOpenId(null);
			setDeleteTarget(null);
			setReloadKey((k) => k + 1);
		} catch (err) {
			setError(err?.message || "Gagal menghapus pengajuan");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="space-y-4">
			{error ? (
				<div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
					<p>{error}</p>
				</div>
			) : null}

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
						<select
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							<option value="">Semua</option>
							<option value="diajukan">Diajukan</option>
							<option value="sebagian_tf">Sebagian TF</option>
							<option value="selesai">Selesai</option>
						</select>
					</label>
					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
						<select
							value={cutoffMonth}
							onChange={(e) => setCutoffMonth(Number(e.target.value))}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							{PERIOD_MONTHS.map((m) => (
								<option key={m.value} value={m.value}>
									{m.label}
								</option>
							))}
						</select>
					</label>
					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
						<select
							value={cutoffYear}
							onChange={(e) => setCutoffYear(Number(e.target.value))}
							className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							{yearOptions.map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
					</label>
				</div>
				<p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
					Periode: <strong>{formatDate(range.startDate)}</strong> sampai <strong>{formatDate(range.endDate)}</strong>
				</p>
			</section>

			<section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
				<StatCard title="Diajukan" value={summary.diajukan} subtitle="Belum ada transfer" tone="blue" Icon={HiOutlineDocumentCheck} />
				<StatCard title="Sebagian TF" value={summary.sebagian_tf} subtitle="Sebagian sudah ditransfer" tone="amber" Icon={HiOutlineClock} />
				<StatCard title="Selesai" value={summary.selesai} subtitle="Semua sudah ditransfer" tone="emerald" Icon={HiOutlineCheckCircle} />
				<StatCard title="Total Nominal" value={formatRp(summary.total_amount)} subtitle="Semua pengajuan periode ini" tone="emerald" Icon={HiOutlineBanknotes} />
			</section>

			<section className="space-y-3">
				{loading ? (
					<div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm">
						Memuat pengajuan...
					</div>
				) : records.length === 0 ? (
					<div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm">
						Belum ada pengajuan pada periode ini.
					</div>
				) : (
					records.map((rec) => {
						const isOpen = openId === rec.id;
						const detail = details[rec.id];
						const transfers = detail?.transfers || [];
						const groups = groupTransfersByRecipient(transfers);
						const isCombinedRecord = detail?.record?.transfer_mode === "combined";
						return (
							<div key={rec.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
								<button
									type="button"
									onClick={() => toggleOpen(rec.id)}
									className="flex w-full flex-col gap-3 px-4 py-4 text-left hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between sm:px-5"
								>
									<div>
										<div className="flex flex-wrap items-center gap-2">
											<span className="text-sm font-bold text-slate-800">{rec.request_no || `#${rec.id}`}</span>
											<StatusBadge status={rec.status} />
										</div>
										<p className="mt-1 text-xs text-slate-500">
											{formatDate(rec.period_start)} - {formatDate(rec.period_end)} · oleh {rec.created_by_name || "-"} ·{" "}
											{formatDateTime(rec.created_at)}
										</p>
									</div>
									<div className="flex items-center gap-4">
										<div className="text-right">
											<p className="text-sm font-bold text-[#1b3459]">{formatRp(rec.total_amount)}</p>
											<p className="text-xs text-slate-400">
												{rec.transfers_done}/{rec.transfers_total} TF · {rec.total_days} hari
											</p>
										</div>
										<HiOutlineChevronDown
											className={cn("h-5 w-5 text-slate-400 transition", isOpen && "rotate-180")}
										/>
									</div>
								</button>

								{isOpen ? (
									<div className="border-t border-slate-100">
										{!detail && detailLoading ? (
											<p className="px-5 py-6 text-center text-sm text-slate-400">Memuat detail...</p>
										) : detail ? (
											<>
												<div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
													<p className="text-xs text-slate-500">
														{detail.record?.notes ? `Catatan: ${detail.record.notes}` : "Tanpa catatan"}
													</p>
													<div className="flex gap-2">
														<button
															type="button"
															onClick={() =>
																copyText(
																	`wa-${rec.id}`,
																	buildMealWaText({
																		periodStart: rec.period_start,
																		periodEnd: rec.period_end,
																		rows: transfers,
																		total: rec.total_amount,
																		combinedRecipient: isCombinedRecord
																			? {
																					full_name: groups[0]?.recipient_name,
																					bank_name: groups[0]?.bank_name,
																					bank_account_number: groups[0]?.bank_account_number,
																				}
																			: undefined,
																	}),
																)
															}
															className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
														>
															{copiedKey === `wa-${rec.id}` ? "Tersalin ✓" : "Salin format WA"}
														</button>
														{rec.transfers_done === 0 ? (
															<button
																type="button"
																onClick={() => setDeleteTarget(rec)}
																className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
															>
																<HiOutlineTrash className="h-3.5 w-3.5" />
																Hapus pengajuan
															</button>
														) : null}
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="min-w-full text-sm">
														<thead className="border-y border-slate-100 bg-slate-50">
															<tr>
																{["Karyawan", "Hari", "Bank", "No. Rekening", "Nominal", "Status", "Aksi"].map((h) => (
																	<th
																		key={h}
																		className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
																	>
																		{h}
																	</th>
																))}
															</tr>
														</thead>
														<tbody className="divide-y divide-slate-100">
															{groups.map((g) => (
																<tr key={g.key} className="hover:bg-slate-50/80">
																	<td className="px-4 py-3">
																		{g.is_combined ? (
																			<>
																				<div className="font-semibold text-slate-800">
																					Gabungan ke rek. {capitalEachWord(g.recipient_name)}
																				</div>
																				<ul className="mt-1 space-y-0.5">
																					{g.members.map((m) => (
																						<li key={m.id} className="text-xs text-slate-500">
																							{capitalEachWord(m.full_name)} — {m.half_days} Half · {m.full_days} Full · {m.office_days} Kantor —{" "}
																							{formatRp(m.amount)}
																						</li>
																					))}
																				</ul>
																			</>
																		) : (
																			<>
																				<div className="font-semibold text-slate-800">{capitalEachWord(g.lead.full_name)}</div>
																				<div className="text-xs text-slate-400">{g.lead.employee_code || "-"}</div>
																			</>
																		)}
																	</td>
																	<td className="whitespace-nowrap px-4 py-3 text-slate-600">
																		{g.half_days} Half · {g.full_days} Full · {g.office_days} Kantor
																	</td>
																	<td className="whitespace-nowrap px-4 py-3 text-slate-600">{g.bank_name || "-"}</td>
																	<td className="whitespace-nowrap px-4 py-3">
																		{g.bank_account_number ? (
																			<span className="inline-flex items-center gap-1.5 text-slate-700">
																				{g.bank_account_number}
																				<button
																					type="button"
																					onClick={() => copyText(`rek-${g.key}`, g.bank_account_number)}
																					className="text-slate-400 hover:text-[#1b3459]"
																					title="Salin nomor rekening"
																				>
																					<HiOutlineClipboardDocument className="h-4 w-4" />
																				</button>
																				{copiedKey === `rek-${g.key}` ? (
																					<span className="text-[11px] text-emerald-600">Tersalin</span>
																				) : null}
																			</span>
																		) : (
																			<span className="text-xs font-semibold text-rose-600">Rekening belum diisi</span>
																		)}
																	</td>
																	<td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1b3459]">
																		{formatRp(g.amount)}
																	</td>
																	<td className="whitespace-nowrap px-4 py-3">
																		<StatusBadge status={g.status} />
																	</td>
																	<td className="whitespace-nowrap px-4 py-3">
																		{g.status === "menunggu_tf" ? (
																			<button
																				type="button"
																				onClick={() =>
																					setProofTarget({
																						...g.lead,
																						full_name: g.is_combined
																							? `Gabungan ke ${g.recipient_name}`
																							: g.lead.full_name,
																						amount: g.amount,
																					})
																				}
																				className="rounded-lg bg-[#1b3459] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#152a4a]"
																			>
																				Upload Bukti TF
																			</button>
																		) : (
																			<div>
																				{g.proof_url ? (
																					<a
																						href={resolveAssetUrl(g.proof_url)}
																						target="_blank"
																						rel="noreferrer"
																						className="text-xs font-semibold text-[#1b3459] underline"
																					>
																						Lihat bukti
																					</a>
																				) : null}
																				<p className="text-[11px] text-slate-400">
																					Diproses {formatDateTime(g.processed_at)} · {g.processed_by_name || "-"}
																				</p>
																			</div>
																		)}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											</>
										) : null}
									</div>
								) : null}
							</div>
						);
					})
				)}
			</section>

			<ProofUploadModal
				open={Boolean(proofTarget)}
				title="Upload bukti transfer"
				subtitle={
					proofTarget
						? `${capitalEachWord(proofTarget.full_name)} · ${formatRp(proofTarget.amount)}`
						: ""
				}
				submitting={submittingProof}
				onClose={() => setProofTarget(null)}
				onSubmit={handleProofSubmit}
			/>

			{deleteTarget ? (
				<div
					className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
					onClick={() => !deleting && setDeleteTarget(null)}
					role="presentation"
				>
					<div
						className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
					>
						<h3 className="text-base font-bold text-slate-800">Hapus pengajuan?</h3>
						<p className="mt-2 text-sm text-slate-500">
							{deleteTarget.request_no} · {formatDate(deleteTarget.period_start)} - {formatDate(deleteTarget.period_end)} ·{" "}
							{formatRp(deleteTarget.total_amount)}
						</p>
						<div className="mt-4 flex gap-2">
							<button
								type="button"
								disabled={deleting}
								onClick={() => setDeleteTarget(null)}
								className="flex-1 rounded-xl border py-2.5 text-sm font-semibold"
							>
								Batal
							</button>
							<button
								type="button"
								disabled={deleting}
								onClick={handleDelete}
								className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
							>
								{deleting ? "Menghapus..." : "Hapus"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
