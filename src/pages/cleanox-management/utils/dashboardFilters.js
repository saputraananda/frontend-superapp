export function cn(...a) {
	return a.filter(Boolean).join(" ");
}

export function fmtIDR(n) {
	return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(n) || 0);
}

export const SERVICE_MODE_OPTIONS = [
	{ value: "all", label: "Semua Layanan" },
	{ value: "home_service", label: "Home Service" },
	{ value: "take_home", label: "Take Home" },
];

export function serviceModeLabel(value) {
	return SERVICE_MODE_OPTIONS.find((o) => o.value === value)?.label || "Semua Layanan";
}

/** Format local Date → YYYY-MM-DD */
function toISODateLocal(d) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/** Today in Asia/Jakarta (avoids UTC off-by-one near midnight). */
function todayJakartaISO() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Jakarta",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

/**
 * Cutoff perusahaan: label bulan YYYY-MM = tgl 26 (bulan−1) s/d 25 bulan itu.
 * Contoh: 2026-09 → 2026-08-26 … 2026-09-25
 */
export function cutoffRangeForMonthLabel(monthYm) {
	const [ys, ms] = String(monthYm || "").split("-");
	const y = parseInt(ys, 10);
	const m = parseInt(ms, 10);
	if (!y || !m || m < 1 || m > 12) return null;
	const from = new Date(y, m - 2, 26);
	const to = new Date(y, m - 1, 25);
	return { startDate: toISODateLocal(from), endDate: toISODateLocal(to) };
}

function appendPeriodParams(p, { filterType, month, year, startDate, endDate }) {
	if (filterType === "month" && month) {
		const range = cutoffRangeForMonthLabel(month);
		if (range) {
			// Explicit cutoff window — jangan andalkan asOfDate→computeDateRange saja
			p.set("startDate", range.startDate);
			p.set("endDate", range.endDate);
		} else {
			p.set("asOfDate", `${month}-25`);
		}
	} else if (filterType === "year" && year) {
		const yearStart = `${parseInt(year, 10) - 1}-12-26`;
		const yearEnd = `${year}-12-25`;
		const today = todayJakartaISO();
		p.set("startDate", yearStart);
		p.set("endDate", today < yearEnd ? today : yearEnd);
	} else if (filterType === "range" && startDate && endDate) {
		p.set("startDate", startDate);
		p.set("endDate", endDate);
	}
}

export function buildPendapatanParams({ serviceMode, filterType, month, year, startDate, endDate }) {
	const p = new URLSearchParams();
	p.set("service_mode", serviceMode || "all");
	appendPeriodParams(p, { filterType, month, year, startDate, endDate });
	return p.toString();
}

export function buildPiutangParams({ serviceMode, filterType, month, year, startDate, endDate }) {
	const p = new URLSearchParams();
	p.set("service_mode", serviceMode || "all");
	appendPeriodParams(p, { filterType, month, year, startDate, endDate });
	return p.toString();
}

export function getDefaultDashboardFilters() {
	const todayStr = todayJakartaISO();
	const [yy, mm, dd] = todayStr.split("-").map(Number);
	const day = dd;
	let month;
	if (day >= 26) {
		const next = new Date(yy, mm - 1 + 1, 1);
		month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
	} else {
		month = `${yy}-${String(mm).padStart(2, "0")}`;
	}
	return {
		serviceMode: "all",
		filterType: "month",
		month,
		year: String(yy),
		startDate: "",
		endDate: "",
	};
}
