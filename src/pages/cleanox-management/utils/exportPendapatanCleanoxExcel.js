import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

const C = {
	headerBg: "6D28D9",
	titleBg: "4C1D95",
	metaBg: "EDE9FE",
	metaText: "4C1D95",
	altRowBg: "F5F3FF",
	whiteBg: "FFFFFF",
	textDark: "1E1B4B",
	borderColor: "DDD6FE",
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
	font: { bold: true, sz: 11, color: { rgb: "FFFFFF" }, name: "Calibri" },
	alignment: { horizontal: "center", vertical: "center", wrapText: true },
	border: border(),
};

const makeCellStyle = (isAlt, align = "left") => ({
	fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
	font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
	alignment: { horizontal: align, vertical: "center" },
	border: border(),
});

const makeCurrencyStyle = (isAlt) => ({
	...makeCellStyle(isAlt, "right"),
	numFmt: "#,##0",
});

const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

/**
 * Export performa pendapatan Cleanox (kolom tabel Performa Per Layanan).
 */
export function exportPendapatanCleanoxExcel({ rows, meta }) {
	const TOTAL_COLS = 6;
	const list = rows || [];
	const periodStr =
		meta?.dateStart && meta?.dateEnd
			? `${meta.dateStart} s.d. ${meta.asOfDate || meta.dateEnd}`
			: "–";
	const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", {
		dateStyle: "long",
		timeStyle: "short",
	})}`;

	const wsData = [];
	const emptyTitle = Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle));
	const emptyMeta = Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle));

	wsData.push([cell("Performa Pendapatan Cleanox", titleStyle), ...emptyTitle]);
	wsData.push([cell(`Periode: ${periodStr}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
	wsData.push(Array.from({ length: TOTAL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })));

	const headers = [
		"Layanan",
		"Target Bulanan",
		"Target s.d Hari Ini",
		"Capaian s.d Hari Ini",
		"Gap",
		"Status",
	];
	wsData.push(headers.map((h) => cell(h, headerStyle)));

	list.forEach((row, i) => {
		const isAlt = i % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const gap = Number(row.gap) || 0;
		wsData.push([
			cell(row.outlet ?? "-", cs),
			cell(Number(row.target_bulanan) || 0, makeCurrencyStyle(isAlt)),
			cell(Number(row.target_kumulatif) || 0, makeCurrencyStyle(isAlt)),
			cell(Number(row.capaian) || 0, makeCurrencyStyle(isAlt)),
			cell(gap, makeCurrencyStyle(isAlt)),
			cell(row.status ?? "-", makeCellStyle(isAlt, "center")),
		]);
	});

	const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
	ws["!merges"] = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
		{ s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
		{ s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
	];
	ws["!cols"] = [
		{ wch: 28 },
		{ wch: 16 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 14 },
		{ wch: 14 },
	];

	const wb = XLSXStyle.utils.book_new();
	XLSXStyle.utils.book_append_sheet(wb, ws, "Performa");
	const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
	const start = (meta?.dateStart || "start").replaceAll("-", "");
	const end = (meta?.dateEnd || meta?.asOfDate || "end").replaceAll("-", "");
	saveAs(
		new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
		`Pendapatan_Cleanox_${start}_${end}.xlsx`,
	);
}
