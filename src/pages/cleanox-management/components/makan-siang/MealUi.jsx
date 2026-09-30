import { useState } from "react";
import { HiOutlineCheck, HiOutlineCog6Tooth, HiOutlineXMark } from "react-icons/hi2";
import { cn, REQUEST_STATUS_LABEL, toneClass } from "./mealUtils";

export function StatCard({ title, value, subtitle, tone = "blue", Icon }) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm text-left w-full">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
					<p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
					<p className="mt-1 text-xs text-slate-500">{subtitle}</p>
				</div>
				<div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClass(tone))}>
					{Icon ? <Icon className="h-5 w-5" /> : null}
				</div>
			</div>
		</div>
	);
}

const STATUS_STYLE = {
	diajukan: "bg-blue-50 text-blue-700 border-blue-200",
	sebagian_tf: "bg-amber-50 text-amber-700 border-amber-200",
	menunggu_tf: "bg-amber-50 text-amber-700 border-amber-200",
	selesai: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StatusBadge({ status }) {
	const s = String(status || "").toLowerCase();
	const cls = STATUS_STYLE[s] || "bg-slate-50 text-slate-600 border-slate-200";
	const label = s === "menunggu_tf" ? "Menunggu TF" : REQUEST_STATUS_LABEL[s] || status || "-";
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls)}>
			{label}
		</span>
	);
}

const STEPS = [
	{ key: "admin", number: 1, title: "Admin · Plot & ajukan", desc: "Pilih karyawan dan tanggal, lalu ajukan rapel" },
	{ key: "finance", number: 2, title: "Finance · Transfer", desc: "Rekening + nominal per orang, upload bukti TF" },
	{ key: "hr", number: 3, title: "HR · Rekap bulanan", desc: "Total uang makan per karyawan untuk hitung gaji" },
	{ key: "settings", number: null, title: "Karyawan & Tarif", desc: "Tarif uang makan dan rekening karyawan" },
];

export function MealStepper({ active, onChange }) {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{STEPS.map((step) => {
				const isActive = active === step.key;
				return (
					<button
						key={step.key}
						type="button"
						onClick={() => onChange(step.key)}
						className={cn(
							"flex items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition",
							isActive ? "border-[#1b3459] ring-2 ring-[#1b3459]/15" : "border-slate-200 hover:border-slate-300",
						)}
					>
						<span
							className={cn(
								"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
								isActive ? "bg-[#1b3459] text-white" : "bg-slate-100 text-slate-500",
							)}
						>
							{step.number ?? <HiOutlineCog6Tooth className="h-4 w-4" />}
						</span>
						<span>
							<span className={cn("block text-sm font-bold", isActive ? "text-[#1b3459]" : "text-slate-800")}>
								{step.title}
							</span>
							<span className="mt-0.5 block text-xs text-slate-500">{step.desc}</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}

export function EmployeeChip({ selected, label, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
				selected
					? "border-[#1b3459] bg-[#1b3459]/5 text-[#1b3459]"
					: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
			)}
		>
			{selected ? <HiOutlineCheck className="h-4 w-4" /> : null}
			{label}
		</button>
	);
}

export function ProofUploadModal({ open, ...props }) {
	if (!open) return null;
	return <ProofUploadDialog {...props} />;
}

function ProofUploadDialog({ title, subtitle, onClose, onSubmit, submitting }) {
	const [file, setFile] = useState(null);
	const [note, setNote] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = () => {
		if (!file) {
			setError("Bukti TF wajib diunggah");
			return;
		}
		setError("");
		onSubmit({ file, note: note.trim() });
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
			onClick={() => !submitting && onClose()}
			role="presentation"
		>
			<div
				className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
			>
				<div className="flex items-start justify-between gap-3">
					<div>
						<h3 className="text-lg font-bold text-slate-900">{title}</h3>
						{subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={submitting}
						className="rounded-lg border p-1.5"
						aria-label="Tutup"
					>
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>
				<div>
					<label className="text-[11px] font-semibold uppercase text-slate-400">Bukti TF (wajib)</label>
					<input
						type="file"
						accept="image/*"
						onChange={(e) => setFile(e.target.files?.[0] || null)}
						className="mt-1 block w-full text-sm"
						disabled={submitting}
					/>
				</div>
				<div>
					<label className="text-[11px] font-semibold uppercase text-slate-400">Catatan (opsional)</label>
					<textarea
						value={note}
						onChange={(e) => setNote(e.target.value)}
						rows={2}
						maxLength={1000}
						className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						disabled={submitting}
					/>
				</div>
				{error ? <p className="text-sm text-rose-600">{error}</p> : null}
				<div className="flex gap-2 pt-1">
					<button
						type="button"
						disabled={submitting}
						onClick={onClose}
						className="flex-1 rounded-xl border py-2.5 text-sm font-semibold"
					>
						Batal
					</button>
					<button
						type="button"
						disabled={submitting}
						onClick={handleSubmit}
						className="flex-1 rounded-xl bg-[#1b3459] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
					>
						{submitting ? "Menyimpan..." : "Tandai Selesai"}
					</button>
				</div>
			</div>
		</div>
	);
}
