import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineCalendarDays, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { api } from "../../../lib/api";

function formatDateOnly(value) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
		new Date(`${String(value).slice(0, 10)}T00:00:00`)
	);
}

const MUTATION_LABEL = {
	granted: "Grant otomatis",
	used: "Cuti dipakai",
	hr_adjust: "Penyesuaian HR",
	restored: "Pengembalian",
};

export default function AnnualLeaveAlora() {
	const [employeeSearch, setEmployeeSearch] = useState("");
	const [employeeOptions, setEmployeeOptions] = useState([]);
	const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
	const [loadingEmployees, setLoadingEmployees] = useState(false);
	const [loadingBalance, setLoadingBalance] = useState(false);
	const [error, setError] = useState("");
	const [data, setData] = useState(null);
	const [adjustDays, setAdjustDays] = useState("");
	const [adjustNote, setAdjustNote] = useState("");
	const [adjusting, setAdjusting] = useState(false);

	useEffect(() => {
		document.title = "Saldo Cuti | Alora Group Indonesia";
		setLoadingEmployees(true);
		api("/hr/employees?limit=500&status=active")
			.then((res) => {
				setEmployeeOptions(Array.isArray(res.data) ? res.data : res.employees || []);
			})
			.catch(() => setEmployeeOptions([]))
			.finally(() => setLoadingEmployees(false));
	}, []);

	const filteredEmployees = useMemo(() => {
		const keyword = employeeSearch.trim().toLowerCase();
		if (!keyword) return employeeOptions.slice(0, 50);
		return employeeOptions
			.filter((emp) => {
				const name = String(emp.full_name || "").toLowerCase();
				const code = String(emp.employee_code || "").toLowerCase();
				const id = String(emp.employee_id || "");
				return name.includes(keyword) || code.includes(keyword) || id.includes(keyword);
			})
			.slice(0, 50);
	}, [employeeOptions, employeeSearch]);

	const fetchBalance = useCallback(async (employeeId) => {
		if (!employeeId) return;
		setLoadingBalance(true);
		setError("");
		try {
			const qs = new URLSearchParams({ employeeId: String(employeeId) });
			const response = await api(`/alora/annual-leave/balance?${qs.toString()}`);
			setData(response);
		} catch (err) {
			setError(err.message || "Gagal memuat saldo cuti");
			setData(null);
		} finally {
			setLoadingBalance(false);
		}
	}, []);

	useEffect(() => {
		if (selectedEmployeeId) fetchBalance(selectedEmployeeId);
		else setData(null);
	}, [selectedEmployeeId, fetchBalance]);

	const handleAdjust = async (e) => {
		e.preventDefault();
		if (!selectedEmployeeId) return;
		const days = Number(adjustDays);
		if (!Number.isFinite(days) || days === 0) {
			setError("Nilai hari adjust wajib diisi (positif atau negatif)");
			return;
		}
		if (!adjustNote.trim()) {
			setError("Catatan adjust wajib diisi");
			return;
		}
		setAdjusting(true);
		setError("");
		try {
			await api(`/alora/annual-leave/${selectedEmployeeId}/adjust`, {
				method: "PUT",
				body: JSON.stringify({ days, note: adjustNote.trim() }),
			});
			setAdjustDays("");
			setAdjustNote("");
			await fetchBalance(selectedEmployeeId);
		} catch (err) {
			setError(err.message || "Gagal menyesuaikan saldo");
		} finally {
			setAdjusting(false);
		}
	};

	const balance = data?.balance;
	const ledger = data?.ledger || [];

	return (
		<div className="space-y-5 p-4 sm:p-6">
			<div>
				<div className="mb-1 inline-flex items-center gap-2 text-emerald-600">
					<HiOutlineCalendarDays className="h-5 w-5" />
					<span className="text-xs font-bold uppercase tracking-wider">Master Karyawan</span>
				</div>
				<h1 className="text-xl font-black text-slate-800">Saldo Cuti Tahunan</h1>
				<p className="mt-1 text-sm text-slate-500">12 hari per siklus setelah 1 tahun kerja</p>
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
					{error}
				</div>
			)}

			<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
				<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
					Pilih Karyawan
				</label>
				<input
					type="text"
					value={employeeSearch}
					onChange={(e) => setEmployeeSearch(e.target.value)}
					placeholder="Cari nama, kode, atau ID karyawan…"
					className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
				/>
				<select
					value={selectedEmployeeId}
					onChange={(e) => setSelectedEmployeeId(e.target.value)}
					className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
					disabled={loadingEmployees}
				>
					<option value="">— Pilih karyawan —</option>
					{filteredEmployees.map((emp) => (
						<option key={emp.employee_id} value={emp.employee_id}>
							{emp.full_name} ({emp.employee_code || emp.employee_id})
						</option>
					))}
				</select>
			</section>

			{loadingBalance && (
				<p className="text-sm text-slate-400 text-center py-6">Memuat saldo cuti…</p>
			)}

			{!loadingBalance && data && (
				<>
					<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<p className="text-xs font-semibold uppercase text-slate-400">Tanggal Masuk</p>
							<p className="mt-1 text-lg font-bold text-slate-800">{formatDateOnly(balance?.join_date)}</p>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<p className="text-xs font-semibold uppercase text-slate-400">Status</p>
							<p className={`mt-1 text-lg font-bold ${balance?.eligible ? "text-emerald-600" : "text-amber-600"}`}>
								{balance?.eligible ? "Berhak cuti" : "Belum 1 tahun"}
							</p>
						</div>
						<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
							<p className="text-xs font-semibold uppercase text-emerald-600">Saldo Tersedia</p>
							<p className="mt-1 text-2xl font-black text-emerald-800">{balance?.balance_days ?? 0} hari</p>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<p className="text-xs font-semibold uppercase text-slate-400">Siklus Aktif</p>
							<p className="mt-1 text-sm font-semibold text-slate-700">
								{balance?.cycle_start
									? `${formatDateOnly(balance.cycle_start)} – ${formatDateOnly(balance.cycle_end)}`
									: balance?.next_anniversary
										? `Berhak dari ${formatDateOnly(balance.next_anniversary)}`
										: "-"}
							</p>
						</div>
					</section>

					{balance?.eligible && (
						<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<h2 className="text-sm font-bold text-slate-800 mb-3">Penyesuaian HR (Transisi)</h2>
							<form onSubmit={handleAdjust} className="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
								<input
									type="number"
									step="0.5"
									value={adjustDays}
									onChange={(e) => setAdjustDays(e.target.value)}
									placeholder="± hari"
									className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
								/>
								<input
									type="text"
									value={adjustNote}
									onChange={(e) => setAdjustNote(e.target.value)}
									placeholder="Catatan wajib"
									className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
								/>
								<button
									type="submit"
									disabled={adjusting}
									className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
								>
									{adjusting ? "Menyimpan…" : "Simpan"}
								</button>
							</form>
						</section>
					)}

					<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div className="border-b border-slate-100 px-4 py-3">
							<h2 className="text-sm font-bold text-slate-800">Histori Ledger (10 terakhir)</h2>
						</div>
						<table className="w-full text-sm">
							<thead className="bg-slate-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tanggal</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Jenis</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Hari</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Saldo</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Catatan</th>
								</tr>
							</thead>
							<tbody>
								{ledger.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-4 py-8 text-center text-slate-400">
											Belum ada mutasi
										</td>
									</tr>
								) : (
									ledger.map((row) => (
										<tr key={row.id} className="border-t border-slate-100">
											<td className="px-4 py-3">{formatDateOnly(row.created_at)}</td>
											<td className="px-4 py-3">{MUTATION_LABEL[row.mutation_type] || row.mutation_type}</td>
											<td className="px-4 py-3 font-semibold">{Number(row.days)}</td>
											<td className="px-4 py-3">{Number(row.balance_after)}</td>
											<td className="px-4 py-3 text-slate-500">{row.note || "-"}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</section>
				</>
			)}
		</div>
	);
}
