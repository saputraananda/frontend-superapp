import { useEffect, useMemo, useState } from "react";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { capitalEachWord, formatDateTime, toDateInput } from "./mealUtils";

export default function MealSettingsTab() {
	const todayStr = useMemo(() => toDateInput(new Date()), []);
	const [rates, setRates] = useState([]);
	const [drafts, setDrafts] = useState({});
	const [savingCode, setSavingCode] = useState("");
	const [workers, setWorkers] = useState([]);
	const [banks, setBanks] = useState([]);
	const [editingId, setEditingId] = useState(null);
	const [bankDraft, setBankDraft] = useState({ bank_name: "", bank_account_number: "" });
	const [savingBankId, setSavingBankId] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError("");
				const qs = new URLSearchParams({ startDate: todayStr, endDate: todayStr });
				const [rateData, contextData, bankData] = await Promise.all([
					api("/cleanox/meal/rates"),
					api(`/cleanox/meal/plot-context?${qs.toString()}`),
					api("/cleanox/meal/banks"),
				]);
				if (cancelled) return;
				const rows = rateData?.rows || [];
				setRates(rows);
				setDrafts(Object.fromEntries(rows.map((r) => [r.code, String(r.amount)])));
				setWorkers(contextData?.workers || []);
				setBanks(bankData?.rows || []);
			} catch (err) {
				if (!cancelled) setError(err?.message || "Gagal memuat data");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [todayStr]);

	const handleSave = async (code) => {
		const amount = Number(drafts[code]);
		if (!Number.isInteger(amount) || amount < 0) {
			setError("Nominal tarif harus bilangan bulat ≥ 0");
			return;
		}
		setSavingCode(code);
		setError("");
		setMessage("");
		try {
			const data = await api(`/cleanox/meal/rates/${code}`, {
				method: "PUT",
				body: JSON.stringify({ amount }),
			});
			const rows = data?.rows || [];
			setRates(rows);
			setDrafts(Object.fromEntries(rows.map((r) => [r.code, String(r.amount)])));
			setMessage("Tarif diperbarui");
		} catch (err) {
			setError(err?.message || "Gagal menyimpan tarif");
		} finally {
			setSavingCode("");
		}
	};

	const startEdit = (w) => {
		setEditingId(w.employee_id);
		setBankDraft({ bank_name: w.bank_name || "", bank_account_number: w.bank_account_number || "" });
		setError("");
		setMessage("");
	};

	const cancelEdit = () => {
		setEditingId(null);
	};

	const handleSaveBank = async (employeeId) => {
		setSavingBankId(employeeId);
		setError("");
		setMessage("");
		try {
			const data = await api(`/cleanox/meal/bank-accounts/${employeeId}`, {
				method: "PUT",
				body: JSON.stringify(bankDraft),
			});
			if (data?.worker) {
				setWorkers((prev) => prev.map((w) => (w.employee_id === employeeId ? data.worker : w)));
			}
			setEditingId(null);
			setMessage("Rekening diperbarui");
		} catch (err) {
			setError(err?.message || "Gagal menyimpan rekening");
		} finally {
			setSavingBankId(null);
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
			{message ? (
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
			) : null}

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
				<h2 className="text-base font-bold text-slate-800">Tarif uang makan</h2>
				<p className="mt-0.5 text-xs text-slate-500">
					Perubahan tarif berlaku untuk pengajuan baru; nominal pengajuan lama tidak berubah.
				</p>
				<div className="mt-4 divide-y divide-slate-100">
					{loading && rates.length === 0 ? (
						<p className="py-4 text-sm text-slate-400">Memuat tarif...</p>
					) : (
						rates.map((rate) => (
							<div key={rate.code} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="text-sm font-semibold text-slate-800">{rate.label}</p>
									<p className="text-xs text-slate-400">
										{rate.updated_by_name
											? `Terakhir diubah ${rate.updated_by_name} · ${formatDateTime(rate.updated_at)}`
											: "Tarif default"}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<div className="relative">
										<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
										<input
											type="number"
											min={0}
											step={1000}
											value={drafts[rate.code] ?? ""}
											onChange={(e) => setDrafts((prev) => ({ ...prev, [rate.code]: e.target.value }))}
											className="w-40 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
										/>
									</div>
									<button
										type="button"
										onClick={() => handleSave(rate.code)}
										disabled={savingCode === rate.code || String(rate.amount) === drafts[rate.code]}
										className="rounded-xl bg-[#1b3459] px-4 py-2 text-sm font-semibold text-white hover:bg-[#152a4a] disabled:opacity-50"
									>
										{savingCode === rate.code ? "Menyimpan..." : "Simpan"}
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</section>

			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="border-b border-slate-100 px-5 py-4">
					<h2 className="text-base font-bold text-slate-800">Rekening karyawan produksi</h2>
					<p className="mt-0.5 text-xs text-slate-500">
						Bank & No. Rekening bisa diubah di sini (disimpan di Cleanox). Jika belum diisi, memakai data Master Karyawan superapp.
					</p>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="border-b border-slate-100 bg-slate-50">
							<tr>
								{["Nama", "NIK", "Jabatan", "Bank", "No. Rekening", "Aksi"].map((h) => (
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
							{workers.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
										{loading ? "Memuat karyawan..." : "Belum ada karyawan produksi."}
									</td>
								</tr>
							) : (
								workers.map((w) => {
									const isEditing = editingId === w.employee_id;
									const isSaving = savingBankId === w.employee_id;
									const draftBankMissing =
										bankDraft.bank_name && !banks.some((b) => b.bank_name === bankDraft.bank_name);
									return (
										<tr key={w.employee_id} className="hover:bg-slate-50/80">
											<td className="px-4 py-3 font-semibold text-slate-800">{capitalEachWord(w.full_name)}</td>
											<td className="px-4 py-3 text-slate-600">{w.employee_code || "-"}</td>
											<td className="px-4 py-3 text-slate-600">{w.jabatan || "-"}</td>
											{isEditing ? (
												<>
													<td className="px-4 py-3">
														<select
															value={bankDraft.bank_name}
															onChange={(e) => setBankDraft((prev) => ({ ...prev, bank_name: e.target.value }))}
															className="w-44 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
														>
															{draftBankMissing ? (
																<option value={bankDraft.bank_name}>{bankDraft.bank_name}</option>
															) : null}
															<option value="">Pilih bank</option>
															{banks.map((b) => (
																<option key={b.bank_id} value={b.bank_name}>
																	{b.bank_name}
																</option>
															))}
														</select>
													</td>
													<td className="px-4 py-3">
														<input
															type="text"
															inputMode="numeric"
															value={bankDraft.bank_account_number}
															onChange={(e) =>
																setBankDraft((prev) => ({ ...prev, bank_account_number: e.target.value }))
															}
															className="w-44 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
														/>
													</td>
													<td className="whitespace-nowrap px-4 py-3">
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => handleSaveBank(w.employee_id)}
																disabled={isSaving}
																className="rounded-xl bg-[#1b3459] px-4 py-2 text-sm font-semibold text-white hover:bg-[#152a4a] disabled:opacity-50"
															>
																{isSaving ? "Menyimpan..." : "Simpan"}
															</button>
															<button
																type="button"
																onClick={cancelEdit}
																disabled={isSaving}
																className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
															>
																Batal
															</button>
														</div>
													</td>
												</>
											) : (
												<>
													<td className="px-4 py-3 text-slate-600">{w.bank_name || "-"}</td>
													<td className="px-4 py-3">
														{w.bank_account_number ? (
															<span className="text-slate-700">{w.bank_account_number}</span>
														) : (
															<span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
																Belum diisi
															</span>
														)}
														{w.bank_source === "cleanox" ? (
															<p className="mt-0.5 text-[11px] text-slate-400">
																{`Diubah ${w.bank_updated_by_name || "-"} · ${formatDateTime(w.bank_updated_at)}`}
															</p>
														) : w.bank_source === "superapp" ? (
															<p className="mt-0.5 text-[11px] text-slate-400">Dari Master Karyawan</p>
														) : null}
													</td>
													<td className="whitespace-nowrap px-4 py-3">
														<button
															type="button"
															onClick={() => startEdit(w)}
															disabled={editingId !== null}
															className="rounded-xl bg-[#1b3459] px-4 py-2 text-sm font-semibold text-white hover:bg-[#152a4a] disabled:opacity-50"
														>
															Edit
														</button>
													</td>
												</>
											)}
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
