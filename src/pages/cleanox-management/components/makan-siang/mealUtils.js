import { BASE_URL } from "../../../../lib/api";

export function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

export function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

export function toDateInput(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function getDefaultCutoffSelection(now = new Date(), cutoffStartDay = 26) {
	const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
	const endDay = startDay - 1;

	let cutoffMonth = now.getMonth() + 1;
	let cutoffYear = now.getFullYear();

	if (now.getDate() > endDay) {
		cutoffMonth += 1;
		if (cutoffMonth > 12) {
			cutoffMonth = 1;
			cutoffYear += 1;
		}
	}

	const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
	const end = new Date(cutoffYear, cutoffMonth - 1, endDay);

	return {
		cutoffMonth,
		cutoffYear,
		cutoffStartDay: startDay,
		startDate: toDateInput(start),
		endDate: toDateInput(end),
	};
}

export function getCutoffRange(cutoffMonth, cutoffYear, cutoffStartDay = 26) {
	const startDay = clamp(Number(cutoffStartDay) || 26, 2, 28);
	const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
	const end = new Date(cutoffYear, cutoffMonth - 1, startDay - 1);
	return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

export function toneClass(tone) {
	if (tone === "emerald") return "bg-emerald-50 border-emerald-100 text-emerald-700";
	if (tone === "amber") return "bg-amber-50 border-amber-100 text-amber-700";
	if (tone === "rose") return "bg-rose-50 border-rose-100 text-rose-700";
	return "bg-blue-50 border-blue-100 text-blue-700";
}

export function capitalEachWord(value) {
	if (!value) return "";
	return String(value)
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
}

export function formatDateTime(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

export function formatRp(n) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(Number(n) || 0);
}

export function resolveAssetUrl(url) {
	if (!url) return null;
	if (/^https?:\/\//i.test(url)) return url;
	const base = (BASE_URL || "").replace(/\/$/, "");
	return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export const PERIOD_MONTHS = [
	{ value: 1, label: "Januari" },
	{ value: 2, label: "Februari" },
	{ value: 3, label: "Maret" },
	{ value: 4, label: "April" },
	{ value: 5, label: "Mei" },
	{ value: 6, label: "Juni" },
	{ value: 7, label: "Juli" },
	{ value: 8, label: "Agustus" },
	{ value: 9, label: "September" },
	{ value: 10, label: "Oktober" },
	{ value: 11, label: "November" },
	{ value: 12, label: "Desember" },
];

export const TYPE_LABEL = { half_day: "Half Day", full_day: "Full Day" };

export const REQUEST_STATUS_LABEL = {
	diajukan: "Diajukan",
	sebagian_tf: "Sebagian TF",
	selesai: "Selesai",
};

function parseDateInput(value) {
	const [y, m, d] = String(value).split("-").map(Number);
	return new Date(y, m - 1, d);
}

export function getThisWeekRange(today = new Date()) {
	const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const mondayOffset = (base.getDay() + 6) % 7;
	const monday = new Date(base);
	monday.setDate(base.getDate() - mondayOffset);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	const end = sunday > base ? base : sunday;
	return { startDate: toDateInput(monday), endDate: toDateInput(end) };
}

export function getLastWeekRange(today = new Date()) {
	const thisWeek = getThisWeekRange(today);
	const monday = parseDateInput(thisWeek.startDate);
	monday.setDate(monday.getDate() - 7);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	return { startDate: toDateInput(monday), endDate: toDateInput(sunday) };
}

export function formatDayHeader(dateStr) {
	const date = parseDateInput(dateStr);
	const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date);
	return `${weekday} ${date.getDate()}`;
}

export function buildMealWaText({ periodStart, periodEnd, rows, total }) {
	const lines = [
		"*Pengajuan Uang Makan Cleanox*",
		`Periode: ${formatDate(periodStart)} - ${formatDate(periodEnd)}`,
		"",
	];
	rows.forEach((row, idx) => {
		const half = Number(row.half_days || 0);
		const full = Number(row.full_days || 0);
		lines.push(
			`${idx + 1}. ${capitalEachWord(row.full_name)} — ${half + full} hari (${half} Half, ${full} Full) — ${formatRp(row.amount)}`,
		);
		const account = row.bank_account_number
			? `${row.bank_name || "Bank -"} ${row.bank_account_number}`
			: "Rekening belum diisi";
		lines.push(`   ${account}`);
	});
	lines.push("");
	lines.push(`Total: ${formatRp(total)} (${rows.length} karyawan)`);
	return lines.join("\n");
}
