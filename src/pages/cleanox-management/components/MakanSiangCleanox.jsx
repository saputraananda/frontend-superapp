import { useEffect, useState } from "react";
import { MealStepper } from "./makan-siang/MealUi";
import MealAdminTab from "./makan-siang/MealAdminTab";
import MealFinanceTab from "./makan-siang/MealFinanceTab";
import MealHrTab from "./makan-siang/MealHrTab";
import MealSettingsTab from "./makan-siang/MealSettingsTab";

export default function MakanSiangCleanox() {
	const [tab, setTab] = useState("admin");
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		document.title = "Uang Makan Cleanox | Alora Group Indonesia";
	}, []);

	return (
		<div className="min-h-full bg-slate-50 py-6">
			<div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
					<div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
					<div className="relative p-5 sm:p-6 lg:p-8">
						<p className="text-xs font-semibold uppercase tracking-wider text-white/60">Cleanox · Uang Makan</p>
						<h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
							Pengajuan Uang Makan Tim Cleanox
						</h1>
						<p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
							Satu form rapel untuk banyak karyawan dan banyak tanggal. Nominal dihitung otomatis dari tipe dan tarif.
						</p>
					</div>
				</section>

				<MealStepper active={tab} onChange={setTab} />

				{tab === "admin" ? (
					<MealAdminTab
						onSubmitted={() => {
							setRefreshKey((k) => k + 1);
							setTab("finance");
						}}
					/>
				) : null}
				{tab === "finance" ? <MealFinanceTab refreshKey={refreshKey} /> : null}
				{tab === "hr" ? <MealHrTab refreshKey={refreshKey} /> : null}
				{tab === "settings" ? <MealSettingsTab /> : null}
			</div>
		</div>
	);
}
