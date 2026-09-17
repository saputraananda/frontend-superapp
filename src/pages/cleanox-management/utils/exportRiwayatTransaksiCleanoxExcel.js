import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

const C = {
	headerBg: "1b3459",
	titleBg: "12233c",
	metaBg: "E8EEF5",
	metaText: "1b3459",
	altRowBg: "F1F5F9",
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
	alignment: { horizontal: align, vertical: "center", wrapText: true },
	border: border(),
});

const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

function fmtDateSlash(d) {
	if (!d) return "";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) {
		const raw = String(d).slice(0, 10);
		const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (m) return `${m[3]}/${m[2]}/${m[1]}`;
		return String(d);
	}
	const dd = String(date.getDate()).padStart(2, "0");
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const yyyy = date.getFullYear();
	return `${dd}/${mm}/${yyyy}`;
}

function fmtDateLabel(d) {
	if (!d) return "-";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return String(d);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
}

const TOTAL_COLS = 6;

/**
 * Export riwayat / piutang transaksi POS — kolom sampai NOMINAL saja.
 */
export function exportRiwayatTransaksiCleanoxExcel({
	records,
	periodLabel,
	activePeriod,
	title = "Daily Report Cleanox — Riwayat Transaksi POS",
	filePrefix = "Daily_Report_Cleanox_POS",
	sheetName = "Riwayat",
}) {
	const list = records || [];
	const periodStr = activePeriod
		? `${fmtDateLabel(activePeriod.startDate)} s.d. ${fmtDateLabel(activePeriod.endDate)}`
		: "–";
	const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", {
		dateStyle: "long",
		timeStyle: "short",
	})}`;

	const wsData = [];
	const emptyTitle = Array.from({ length: TOTAL_COLS - 1 }, () => empty(titleStyle));
	const emptyMeta = Array.from({ length: TOTAL_COLS - 1 }, () => empty(metaStyle));
	const emptySpacer = Array.from({ length: TOTAL_COLS }, () =>
		empty({ fill: { fgColor: { rgb: "FFFFFF" } } }),
	);

	wsData.push([cell(title, titleStyle), ...emptyTitle]);
	wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(`Total baris: ${list.length}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
	wsData.push(emptySpacer);

	const headers = ["No", "TANGGAL", "NO NOTA", "NAMA", "KATEGORI", "NOMINAL"];
	wsData.push(headers.map((h) => cell(h, headerStyle)));

	list.forEach((r, i) => {
		const isAlt = i % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const csCenter = makeCellStyle(isAlt, "center");
		const csRight = makeCellStyle(isAlt, "right");
		const amount = r.pricing_pending ? 0 : Number(r.final_amount || 0);

		wsData.push([
			cell(i + 1, {
				...csCenter,
				font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" },
			}),
			cell(fmtDateSlash(r.service_date), csCenter),
			cell(r.transaction_no || "-", cs),
			cell(r.customer_name || "-", cs),
			cell(r.kategori || "-", csCenter),
			cell(amount, csRight),
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
		{ wch: 12 },
		{ wch: 22 },
		{ wch: 24 },
		{ wch: 12 },
		{ wch: 14 },
	];
	ws["!rows"] = [{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 }];

	const wb = XLSXStyle.utils.book_new();
	const start = activePeriod?.startDate || "start";
	const end = activePeriod?.endDate || "end";
	const safeSheet = String(sheetName || "Riwayat").slice(0, 31);
	XLSXStyle.utils.book_append_sheet(wb, ws, safeSheet);
	const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
	saveAs(
		new Blob([buffer], { type: "application/octet-stream" }),
		`${filePrefix}_${start}_${end}.xlsx`,
	);
}
