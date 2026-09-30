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
				const [rateData, contextData] = await Promise.all([
					api("/cleanox/meal/rates"),
					api(`/cleanox/meal/plot-context?${qs.toString()}`),
				]);
				if (cancelled) return;
				const rows = rateData?.rows || [];
				setRates(rows);
				setDrafts(Object.fromEntries(rows.map((r) => [r.code, String(r.amount)])));
				setWorkers(contextData?.workers || []);
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
					<p className="mt-0.5 text-xs text-slate-500">Perubahan rekening dilakukan di Master Karyawan superapp.</p>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="border-b border-slate-100 bg-slate-50">
							<tr>
								{["Nama", "NIK", "Jabatan", "Bank", "No. Rekening"].map((h) => (
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
									<td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
										{loading ? "Memuat karyawan..." : "Belum ada karyawan produksi."}
									</td>
								</tr>
							) : (
								workers.map((w) => (
									<tr key={w.employee_id} className="hover:bg-slate-50/80">
										<td className="px-4 py-3 font-semibold text-slate-800">{capitalEachWord(w.full_name)}</td>
										<td className="px-4 py-3 text-slate-600">{w.employee_code || "-"}</td>
										<td className="px-4 py-3 text-slate-600">{w.jabatan || "-"}</td>
										<td className="px-4 py-3 text-slate-600">{w.bank_name || "-"}</td>
										<td className="px-4 py-3">
											{w.bank_account_number ? (
												<span className="text-slate-700">{w.bank_account_number}</span>
											) : (
												<span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
													Belum diisi
												</span>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
