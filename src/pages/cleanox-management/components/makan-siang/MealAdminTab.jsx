import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineExclamationTriangle, HiOutlineLockClosed } from "react-icons/hi2";
import { api, BASE_URL } from "../../../../lib/api";
import { EmployeeChip } from "./MealUi";
import {
	buildMealWaText,
	capitalEachWord,
	cn,
	formatDate,
	formatDayHeader,
	formatRp,
	getLastWeekRange,
	getThisWeekRange,
	toDateInput,
} from "./mealUtils";

const MAX_RANGE_DAYS = 31;
const NEXT_TYPE = { undefined: "half_day", half_day: "full_day", full_day: "office", office: undefined };
const CONFLICT_REASON = {
	sudah_diajukan: "Sudah diajukan",
	libur: "Libur",
	cuti_izin: "Cuti/Izin",
};

function countDays(startDate, endDate) {
	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T00:00:00`);
	return Math.round((end - start) / 86400000) + 1;
}

function validateRange(startDate, endDate, todayStr) {
	if (!startDate || !endDate) return "Periode wajib diisi";
	if (endDate < startDate) return "Periode selesai tidak boleh sebelum periode mulai";
	if (endDate > todayStr) return "Tanggal tidak boleh di masa depan";
	if (countDays(startDate, endDate) > MAX_RANGE_DAYS) return `Rentang maksimal ${MAX_RANGE_DAYS} hari`;
	return "";
}

export default function MealAdminTab({ onSubmitted }) {
	const todayStr = useMemo(() => toDateInput(new Date()), []);
	const initialRange = useMemo(() => getThisWeekRange(new Date()), []);

	const [startDate, setStartDate] = useState(initialRange.startDate);
	const [endDate, setEndDate] = useState(initialRange.endDate);
	const [context, setContext] = useState(null);
	const [selectedIds, setSelectedIds] = useState(() => new Set());
	const [plots, setPlots] = useState({});
	const [notes, setNotes] = useState("");
	const [transferMode, setTransferMode] = useState("individual");
	const [recipientId, setRecipientId] = useState(null);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [conflicts, setConflicts] = useState([]);
	const [copied, setCopied] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);

	const rangeError = validateRange(startDate, endDate, todayStr);

	useEffect(() => {
		if (rangeError) {
			setContext(null);
			return undefined;
		}
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError("");
				const qs = new URLSearchParams({ startDate, endDate });
				const data = await api(`/cleanox/meal/plot-context?${qs.toString()}`);
				if (!cancelled) setContext(data);
			} catch (err) {
				if (!cancelled) {
					setContext(null);
					setError(err?.message || "Gagal memuat data plot");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [startDate, endDate, rangeError, reloadKey]);

	const workers = useMemo(() => context?.workers || [], [context]);
	const dates = useMemo(() => context?.dates || [], [context]);
	const rates = useMemo(() => context?.rates || { office: 0, half_day: 0, full_day: 0 }, [context]);

	const workerMap = useMemo(() => new Map(workers.map((w) => [w.employee_id, w])), [workers]);

	const lockMap = useMemo(() => {
		const map = new Map();
		for (const row of context?.existing || []) {
			map.set(`${row.worker_id}|${row.meal_date}`, { kind: "existing", type: row.type });
		}
		for (const row of context?.off_days || []) {
			const key = `${row.worker_id}|${row.off_date}`;
			if (!map.has(key)) map.set(key, { kind: "off" });
		}
		for (const row of context?.leaves || []) {
			const key = `${row.worker_id}|${row.date}`;
			if (!map.has(key)) map.set(key, { kind: "leave", leaveType: row.leave_type });
		}
		return map;
	}, [context]);

	useEffect(() => {
		if (!context) return;
		const dateSet = new Set(context.dates || []);
		const validIds = new Set((context.workers || []).map((w) => w.employee_id));
		setSelectedIds((prev) => new Set([...prev].filter((id) => validIds.has(id))));
		setPlots((prev) => {
			const next = {};
			for (const [wid, byDate] of Object.entries(prev)) {
				if (!validIds.has(Number(wid))) continue;
				const kept = {};
				for (const [d, type] of Object.entries(byDate)) {
					if (dateSet.has(d) && !lockMap.has(`${wid}|${d}`)) kept[d] = type;
				}
				if (Object.keys(kept).length > 0) next[wid] = kept;
			}
			return next;
		});
	}, [context, lockMap]);

	const selectedWorkers = useMemo(
		() => workers.filter((w) => selectedIds.has(w.employee_id)),
		[workers, selectedIds],
	);

	const summaryRows = useMemo(() => {
		return selectedWorkers
			.map((w) => {
				const byDate = plots[w.employee_id] || {};
				let half = 0;
				let full = 0;
				let office = 0;
				for (const type of Object.values(byDate)) {
					if (type === "half_day") half += 1;
					else if (type === "full_day") full += 1;
					else if (type === "office") office += 1;
				}
				return {
					worker_id: w.employee_id,
					full_name: w.full_name,
					bank_name: w.bank_name,
					bank_account_number: w.bank_account_number,
					half_days: half,
					full_days: full,
					office_days: office,
					amount: half * rates.half_day + full * rates.full_day + office * rates.office,
				};
			})
			.filter((r) => r.half_days + r.full_days + r.office_days > 0);
	}, [selectedWorkers, plots, rates.half_day, rates.full_day, rates.office]);

	const plottedDays = summaryRows.reduce((sum, r) => sum + r.half_days + r.full_days + r.office_days, 0);
	const totalAmount = summaryRows.reduce((sum, r) => sum + r.amount, 0);

	const canCombine = summaryRows.length >= 2;
	const isCombined = transferMode === "combined" && canCombine;

	useEffect(() => {
		if (isCombined && !summaryRows.some((r) => r.worker_id === recipientId)) {
			setRecipientId(summaryRows[0]?.worker_id ?? null);
		}
		if (!canCombine && transferMode === "combined") {
			setTransferMode("individual");
		}
	}, [isCombined, canCombine, transferMode, summaryRows, recipientId]);

	const recipientRow = isCombined ? summaryRows.find((r) => r.worker_id === recipientId) || null : null;
	const missingAccountNames = (isCombined ? (recipientRow ? [recipientRow] : []) : summaryRows)
		.filter((r) => !r.bank_account_number)
		.map((r) => capitalEachWord(r.full_name));

	const applyRange = (range) => {
		setStartDate(range.startDate);
		setEndDate(range.endDate);
	};

	const toggleWorker = (id) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const allSelected = workers.length > 0 && selectedIds.size === workers.length;
	const toggleAll = () => {
		setSelectedIds(allSelected ? new Set() : new Set(workers.map((w) => w.employee_id)));
	};

	const cycleCell = (wid, date) => {
		setPlots((prev) => {
			const byDate = { ...(prev[wid] || {}) };
			const nextType = NEXT_TYPE[byDate[date]];
			if (nextType) byDate[date] = nextType;
			else delete byDate[date];
			return { ...prev, [wid]: byDate };
		});
	};

	const fillRow = (wid, type) => {
		setPlots((prev) => {
			const byDate = {};
			if (type) {
				for (const d of dates) {
					if (!lockMap.has(`${wid}|${d}`)) byDate[d] = type;
				}
			}
			return { ...prev, [wid]: byDate };
		});
	};

	const handleCopyWa = useCallback(async () => {
		const text = buildMealWaText({
			periodStart: startDate,
			periodEnd: endDate,
			rows: summaryRows,
			total: totalAmount,
			combinedRecipient: recipientRow || undefined,
		});
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			setError("Gagal menyalin ke clipboard");
		}
	}, [startDate, endDate, summaryRows, totalAmount, recipientRow]);

	const handleSubmit = async () => {
		if (plottedDays === 0 || submitting) return;
		const items = [];
		for (const w of selectedWorkers) {
			for (const [d, type] of Object.entries(plots[w.employee_id] || {})) {
				items.push({ worker_id: w.employee_id, meal_date: d, type });
			}
		}
		setSubmitting(true);
		setError("");
		setConflicts([]);
		try {
			const res = await fetch(`${BASE_URL}/cleanox/meal/requests`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					period_start: startDate,
					period_end: endDate,
					notes: notes.trim() || null,
					items,
					transfer_mode: isCombined ? "combined" : "individual",
					recipient_worker_id: isCombined ? recipientId : null,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				setError(body?.message || "Gagal mengajukan rapel");
				setConflicts(Array.isArray(body?.conflicts) ? body.conflicts : []);
				return;
			}
			setPlots({});
			setNotes("");
			setTransferMode("individual");
			setRecipientId(null);
			setConflicts([]);
			setReloadKey((k) => k + 1);
			onSubmitted?.();
		} catch (err) {
			setError(err?.message || "Gagal mengajukan rapel");
		} finally {
			setSubmitting(false);
		}
	};

	const renderCell = (w, d) => {
		const lock = lockMap.get(`${w.employee_id}|${d}`);
		if (lock) {
			let label = "Libur";
			let title = "Hari libur karyawan";
			if (lock.kind === "existing") {
				label = lock.type === "full_day" ? "F" : lock.type === "office" ? "K" : "H";
				title = "Sudah diajukan";
			} else if (lock.kind === "leave") {
				label = lock.leaveType === "izin" ? "Izin" : "Cuti";
				title = `${label} disetujui`;
			}
			return (
				<button
					type="button"
					disabled
					title={title}
					className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-400"
				>
					{lock.kind === "existing" ? <HiOutlineLockClosed className="h-3 w-3" /> : null}
					{label}
				</button>
			);
		}
		const type = plots[w.employee_id]?.[d];
		return (
			<button
				type="button"
				onClick={() => cycleCell(w.employee_id, d)}
				className={cn(
					"h-9 w-full rounded-lg border text-xs font-bold transition",
					type === "half_day" && "border-amber-200 bg-amber-50 text-amber-700",
					type === "full_day" && "border-blue-200 bg-blue-50 text-blue-700",
					type === "office" && "border-emerald-200 bg-emerald-50 text-emerald-700",
					!type && "border-dashed border-slate-200 text-slate-300 hover:bg-slate-50",
				)}
			>
				{type === "half_day" ? "H" : type === "full_day" ? "F" : type === "office" ? "K" : "–"}
			</button>
		);
	};

	return (
		<div className="space-y-4">
			{error || rangeError ? (
				<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<div className="flex items-start gap-3">
						<HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<p>{error || rangeError}</p>
					</div>
					{conflicts.length > 0 ? (
						<ul className="mt-2 list-disc space-y-0.5 pl-10 text-xs">
							{conflicts.map((c) => (
								<li key={`${c.worker_id}|${c.meal_date}`}>
									{capitalEachWord(workerMap.get(c.worker_id)?.full_name || `ID ${c.worker_id}`)} ·{" "}
									{formatDate(c.meal_date)} · {CONFLICT_REASON[c.reason] || c.reason}
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
				<h2 className="text-base font-bold text-slate-800">Buat pengajuan rapel</h2>
				<p className="mt-0.5 text-xs text-slate-500">Satu pengajuan = satu periode (biasanya Senin–Minggu).</p>

				<div className="mt-4 flex flex-wrap items-end gap-3">
					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Periode mulai</span>
						<input
							type="date"
							value={startDate}
							max={todayStr}
							onChange={(e) => setStartDate(e.target.value)}
							className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</label>
					<label className="text-sm text-slate-600">
						<span className="mb-1 block text-xs font-semibold text-slate-500">Periode selesai</span>
						<input
							type="date"
							value={endDate}
							max={todayStr}
							onChange={(e) => setEndDate(e.target.value)}
							className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</label>
					<div className="flex flex-wrap gap-2 pb-0.5">
						<button
							type="button"
							onClick={() => applyRange(getThisWeekRange(new Date()))}
							className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
						>
							Minggu ini
						</button>
						<button
							type="button"
							onClick={() => applyRange(getLastWeekRange(new Date()))}
							className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
						>
							Minggu lalu
						</button>
						<button
							type="button"
							onClick={() => applyRange({ startDate: todayStr, endDate: todayStr })}
							className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
						>
							1 hari
						</button>
					</div>
				</div>

				<div className="mt-4">
					<p className="mb-2 text-xs font-semibold text-slate-500">Karyawan (klik untuk pilih, bisa lebih dari satu)</p>
					{loading && workers.length === 0 ? (
						<p className="text-sm text-slate-400">Memuat karyawan...</p>
					) : workers.length === 0 ? (
						<p className="text-sm text-slate-400">Belum ada karyawan produksi.</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{workers.map((w) => (
								<EmployeeChip
									key={w.employee_id}
									selected={selectedIds.has(w.employee_id)}
									label={capitalEachWord(w.full_name)}
									onClick={() => toggleWorker(w.employee_id)}
								/>
							))}
							<EmployeeChip
								selected={false}
								label={allSelected ? "Batal pilih semua" : "+ Pilih semua"}
								onClick={toggleAll}
							/>
						</div>
					)}
				</div>

				<label className="mt-4 block text-sm text-slate-600">
					<span className="mb-1 block text-xs font-semibold text-slate-500">Catatan (opsional)</span>
					<textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						rows={2}
						maxLength={1000}
						className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
					/>
				</label>
			</section>

			{selectedWorkers.length > 0 && dates.length > 0 ? (
				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="border-b border-slate-100 px-4 py-3 sm:px-5">
						<h2 className="text-base font-bold text-slate-800">Plot tipe per hari</h2>
						<p className="mt-0.5 text-xs text-slate-500">Klik sel untuk mengganti: kosong → Half → Full → Kantor → kosong.</p>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="border-b border-slate-100 bg-slate-50">
								<tr>
									<th className="sticky left-0 z-[1] min-w-[180px] bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
										Karyawan
									</th>
									{dates.map((d) => (
										<th
											key={d}
											className="min-w-[64px] px-1.5 py-3 text-center text-xs font-semibold text-slate-500"
										>
											{formatDayHeader(d)}
										</th>
									))}
									<th className="min-w-[120px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
										Subtotal
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{selectedWorkers.map((w) => {
									const row = summaryRows.find((r) => r.worker_id === w.employee_id);
									return (
										<tr key={w.employee_id}>
											<td className="sticky left-0 z-[1] bg-white px-4 py-2">
												<div className="text-sm font-semibold text-slate-800">{capitalEachWord(w.full_name)}</div>
												<div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold">
													<button type="button" onClick={() => fillRow(w.employee_id, "half_day")} className="text-amber-700 hover:underline">
														Semua Half
													</button>
													<button type="button" onClick={() => fillRow(w.employee_id, "full_day")} className="text-blue-700 hover:underline">
														Semua Full
													</button>
													<button type="button" onClick={() => fillRow(w.employee_id, "office")} className="text-emerald-700 hover:underline">
														Semua Kantor
													</button>
													<button type="button" onClick={() => fillRow(w.employee_id, null)} className="text-slate-500 hover:underline">
														Kosongkan
													</button>
												</div>
											</td>
											{dates.map((d) => (
												<td key={d} className="px-1.5 py-2">
													{renderCell(w, d)}
												</td>
											))}
											<td className="px-4 py-2 text-right text-sm font-bold text-[#1b3459]">
												{formatRp(row?.amount || 0)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">
						<span>
							<strong className="text-amber-700">H</strong> = Half Day ({formatRp(rates.half_day)})
						</span>
						<span>
							<strong className="text-blue-700">F</strong> = Full Day ({formatRp(rates.full_day)})
						</span>
						<span>
							<strong className="text-emerald-700">K</strong> = Kantor ({formatRp(rates.office)})
						</span>
						<span>Libur / Cuti / Izin / sudah diajukan tidak bisa diplot.</span>
					</div>
				</section>
			) : null}

			{summaryRows.length > 0 ? (
				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
					<h2 className="text-base font-bold text-slate-800">Rincian nominal</h2>
					<p className="mt-0.5 text-xs text-slate-500">Dihitung otomatis dari plot.</p>

					<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{summaryRows.map((r) => (
							<div key={r.worker_id} className="rounded-xl border border-slate-200 p-3">
								<div className="flex items-start justify-between gap-2">
									<p className="text-sm font-semibold text-slate-800">{capitalEachWord(r.full_name)}</p>
									<p className="text-sm font-bold text-[#1b3459]">{formatRp(r.amount)}</p>
								</div>
								<p className="mt-1 text-xs text-slate-500">
									{r.half_days} Half · {r.full_days} Full · {r.office_days} Kantor
								</p>
								<p className="mt-0.5 text-xs text-slate-400">
									{isCombined && r.worker_id !== recipientId
										? `Digabung ke rek. ${capitalEachWord(recipientRow?.full_name || "")}`
										: `${r.bank_name || "Bank -"} · ${r.bank_account_number || "belum diisi"}`}
								</p>
							</div>
						))}
					</div>

					<div className="mt-4">
						<p className="mb-2 text-xs font-semibold text-slate-500">Transfer ke</p>
						<div className="flex flex-wrap items-center gap-4">
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="radio"
									name="meal-transfer-mode"
									value="individual"
									checked={!isCombined}
									onChange={() => setTransferMode("individual")}
								/>
								Rekening masing-masing
							</label>
							<label className={cn("inline-flex items-center gap-2 text-sm text-slate-700", !canCombine && "opacity-50")}>
								<input
									type="radio"
									name="meal-transfer-mode"
									value="combined"
									checked={isCombined}
									disabled={!canCombine}
									onChange={() => setTransferMode("combined")}
								/>
								Gabung ke satu rekening
							</label>
							{isCombined ? (
								<select
									value={recipientId ?? ""}
									onChange={(e) => setRecipientId(Number(e.target.value))}
									className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									{summaryRows.map((r) => (
										<option key={r.worker_id} value={r.worker_id}>
											{capitalEachWord(r.full_name)} · {r.bank_name || "Bank -"}
										</option>
									))}
								</select>
							) : null}
						</div>
					</div>

					{isCombined && recipientRow ? (
						<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
							Finance cukup transfer 1 kali: {formatRp(totalAmount)} ke {capitalEachWord(recipientRow.full_name)} (
							{recipientRow.bank_account_number
								? `${recipientRow.bank_name || "Bank -"} ${recipientRow.bank_account_number}`
								: "rekening belum diisi"}
							). Bagian tiap karyawan tetap tercatat terpisah untuk HR.
						</div>
					) : null}

					{missingAccountNames.length > 0 ? (
						<div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
							Rekening belum lengkap untuk: {missingAccountNames.join(", ")}. Lengkapi di tab Pengaturan.
						</div>
					) : null}
				</section>
			) : null}

			<section className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Karyawan</p>
							<p className="text-xl font-bold text-slate-800">{selectedWorkers.length}</p>
						</div>
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hari diplot</p>
							<p className="text-xl font-bold text-slate-800">{plottedDays}</p>
						</div>
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Jumlah transfer</p>
							<p className="text-xl font-bold text-slate-800">{isCombined ? 1 : summaryRows.length}</p>
						</div>
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total transfer</p>
							<p className="text-xl font-bold text-emerald-700">{formatRp(totalAmount)}</p>
						</div>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleCopyWa}
							disabled={plottedDays === 0}
							className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
						>
							{copied ? "Tersalin ✓" : "Salin format WA"}
						</button>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={plottedDays === 0 || submitting}
							className="rounded-xl bg-[#1b3459] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#152a4a] disabled:opacity-50"
						>
							{submitting ? "Mengajukan..." : "Ajukan ke Finance"}
						</button>
					</div>
				</div>
			</section>
		</div>
	);
}
