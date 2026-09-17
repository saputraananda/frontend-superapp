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

function appendPeriodParams(p, { filterType, month, year, startDate, endDate }) {
	if (filterType === "month" && month) {
		p.set("asOfDate", `${month}-25`);
	} else if (filterType === "year" && year) {
		const yearStart = `${parseInt(year, 10) - 1}-12-26`;
		const yearEnd = `${year}-12-25`;
		const today = new Date().toISOString().split("T")[0];
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
	const today = new Date();
	let month;
	if (today.getDate() >= 26) {
		const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
		month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
	} else {
		month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
	}
	return {
		serviceMode: "all",
		filterType: "month",
		month,
		year: String(today.getFullYear()),
		startDate: "",
		endDate: "",
	};
}
