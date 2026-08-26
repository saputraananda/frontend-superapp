import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

const C = {
	headerBg: "1E3A5F",
	titleBg: "0F172A",
	metaBg: "E0F2FE",
	metaText: "0C4A6E",
	altRowBg: "F0F9FF",
	whiteBg: "FFFFFF",
	textDark: "1E293B",
	textGray: "64748B",
	borderColor: "CBD5E1",
};

const border = () => ({
	top: { style: "thin", color: { rgb: C.borderColor } },
	bottom: { style: "thin", color: { rgb: C.borderColor } },
	left: { style: "thin", color: { rgb: C.borderColor } },
	right: { style: "thin", color: { rgb: C.borderColor } },
});

const titleStyle = {
	fill: { fgColor: { rgb: C.titleBg } },
	font: { bold: true, sz: 14, color: { rgb: "FFFFFF" }, name: "Calibri" },
	alignment: { horizontal: "center", vertical: "center" },
};

const metaStyle = {
	fill: { fgColor: { rgb: C.metaBg } },
	font: { sz: 10, color: { rgb: C.metaText }, italic: true, name: "Calibri" },
	alignment: { horizontal: "left", vertical: "center" },
};

const headerStyle = {
	fill: { fgColor: { rgb: C.headerBg } },
	font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
	alignment: { horizontal: "center", vertical: "center", wrapText: true },
	border: border(),
};

const makeCellStyle = (isAlt, align = "left") => ({
	fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
	font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
	alignment: { horizontal: align, vertical: "center", wrapText: false },
	border: border(),
});

const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

function fmtDate(d) {
	if (!d) return "-";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return String(d);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
}

function fmtDuration(totalSec) {
	const sec = Math.max(Number(totalSec) || 0, 0);
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function sportLabel(sport) {
	if (sport === "run") return "Lari";
	if (sport === "cycle") return "Sepeda";
	return sport || "-";
}

function goalLabel(goal) {
	if (goal === "diet") return "Diet";
	if (goal === "maintenance") return "Maintenance";
	return goal || "-";
}

export function exportReportBugarAloraExcel({ records, periodLabel, activePeriod, filters }) {
	const periodStr = activePeriod
		? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
		: "–";

	const filterParts = [];
	if (filters?.sportFilter) filterParts.push(`Olahraga: ${sportLabel(filters.sportFilter)}`);
	if (filters?.haidFilter === "1") filterParts.push("Mode haid: Ya");
	if (filters?.haidFilter === "0") filterParts.push("Mode haid: Tidak");
	if (filters?.selectedEmployeeNames?.length > 0) {
		const names = filters.selectedEmployeeNames;
		filterParts.push(
			names.length <= 3
				? `Karyawan: ${names.join(", ")}`
				: `Karyawan: ${names.slice(0, 3).join(", ")} +${names.length - 3} lainnya`,
		);
	}
	const filterLabel = filterParts.length > 0 ? filterParts.join("  |  ") : "Semua data (tanpa filter)";
	const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

	const TOTAL_COLS = 13;
	const wsData = [];
	const emptyTitle = Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle));
	const emptyMeta = Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle));
	const emptySpacer = Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } }));

	wsData.push([cell("Report Alora Bugar", titleStyle), ...emptyTitle]);
	wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(`Filter: ${filterLabel}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
	wsData.push(emptySpacer);

	const headers = [
		"No",
		"Tanggal",
		"NIK",
		"Nama",
		"Jabatan",
		"Sport",
		"Durasi",
		"Jarak km",
		"Kalori",
		"Pace/Speed",
		"Steps",
		"Goal",
		"Haid Mode",
	];
	wsData.push(headers.map((h) => cell(h, headerStyle)));

	records.forEach((r, idx) => {
		const isAlt = idx % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const csCenter = makeCellStyle(isAlt, "center");

		wsData.push([
			cell(idx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
			cell(fmtDate(r.ended_at), csCenter),
			cell(r.employee_code || "-", csCenter),
			cell(r.employee_name || "-", cs),
			cell(r.jabatan || "-", cs),
			cell(sportLabel(r.sport), csCenter),
			cell(fmtDuration(r.duration_sec), csCenter),
			cell(r.distance_km ?? 0, csCenter),
			cell(r.calories ?? 0, csCenter),
			cell(r.avg_pace_or_speed ?? "-", csCenter),
			cell(r.sport === "run" ? (r.step_count ?? 0) : "-", csCenter),
			cell(goalLabel(r.goal_focus), csCenter),
			cell(r.haid_mode ? "Ya" : "Tidak", csCenter),
		]);
	});

	const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
	ws["!merges"] = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
		{ s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
		{ s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
		{ s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } },
	];
	ws["!cols"] = [
		{ wch: 5 },
		{ wch: 15 },
		{ wch: 12 },
		{ wch: 25 },
		{ wch: 18 },
		{ wch: 12 },
		{ wch: 10 },
		{ wch: 12 },
		{ wch: 10 },
		{ wch: 12 },
		{ wch: 10 },
		{ wch: 14 },
		{ wch: 12 },
	];
	ws["!rows"] = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 }];

	const wb = XLSXStyle.utils.book_new();
	XLSXStyle.utils.book_append_sheet(wb, ws, "Report Alora Bugar");

	const start = activePeriod?.startDate || "start";
	const end = activePeriod?.endDate || "end";
	const fileName = `Report_Alora_Bugar_${start}_${end}.xlsx`;
	const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
	saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName);
}
