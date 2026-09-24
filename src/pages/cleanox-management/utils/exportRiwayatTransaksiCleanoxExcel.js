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

function toDateKey(value) {
	if (!value) return null;
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return null;
		const y = value.getFullYear();
		const m = String(value.getMonth() + 1).padStart(2, "0");
		const d = String(value.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	const raw = String(value).trim();
	const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
	const date = new Date(raw);
	if (Number.isNaN(date.getTime())) return null;
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function isTunaiKategori(kategori) {
	return String(kategori || "")
		.trim()
		.toUpperCase() === "TUNAI";
}

/** Excel rekonsiliasi NON TUNAI: includes SMARTLINK; excludes COLLABORATION / TUNAI / empty. */
function isNonTunaiReconKategori(kategori) {
	const k = String(kategori || "")
		.trim()
		.toUpperCase();
	if (!k || k === "-" || isTunaiKategori(k)) return false;
	if (k === "COLLABORATION") return false;
	return true;
}

function buildRekonsiliasiAggregates(list, dateField) {
	const map = new Map();
	for (const r of list || []) {
		const dateKey = toDateKey(r?.[dateField]);
		if (!dateKey) continue;
		const amount = r.pricing_pending ? 0 : Number(r.final_amount || 0);
		if (!map.has(dateKey)) map.set(dateKey, { tunai: 0, nonTunai: 0 });
		const bucket = map.get(dateKey);
		const kategori = String(r.kategori || "").trim().toUpperCase();
		if (isTunaiKategori(kategori)) bucket.tunai += amount;
		else if (isNonTunaiReconKategori(kategori)) bucket.nonTunai += amount;
	}
	return Array.from(map.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([dateKey, { tunai, nonTunai }]) => ({
			dateKey,
			dateLabel: fmtDateSlash(dateKey),
			tunai,
			nonTunai,
			gap: 0,
		}));
}

/**
 * Export riwayat / piutang / pendapatan transaksi POS.
 * Default: 6 kolom sampai NOMINAL. Opsional blok REKONSILIASI di kanan.
 * @param {object} options
 * @param {'service_date'|'payment_settled_date'} [options.dateField='service_date']
 * @param {string} [options.dateHeader='TANGGAL']
 * @param {boolean} [options.includeRekonsiliasi=false]
 */
export function exportRiwayatTransaksiCleanoxExcel({
	records,
	periodLabel,
	activePeriod,
	title = "Daily Report Cleanox — Riwayat Transaksi POS",
	filePrefix = "Daily_Report_Cleanox_POS",
	sheetName = "Riwayat",
	dateField = "service_date",
	dateHeader = "TANGGAL",
	includeRekonsiliasi = false,
}) {
	const list = records || [];
	const leftCols = 6;
	const totalCols = includeRekonsiliasi ? 11 : 6;
	const periodStr = activePeriod
		? `${fmtDateLabel(activePeriod.startDate)} s.d. ${fmtDateLabel(activePeriod.endDate)}`
		: "–";
	const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", {
		dateStyle: "long",
		timeStyle: "short",
	})}`;

	const wsData = [];
	const emptyTitle = Array.from({ length: totalCols - 1 }, () => empty(titleStyle));
	const emptyMeta = Array.from({ length: totalCols - 1 }, () => empty(metaStyle));
	const emptySpacer = Array.from({ length: totalCols }, () =>
		empty({ fill: { fgColor: { rgb: "FFFFFF" } } }),
	);

	wsData.push([cell(title, titleStyle), ...emptyTitle]);
	wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(`Total baris: ${list.length}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
	wsData.push(emptySpacer);

	const leftHeaders = ["No", dateHeader, "NO NOTA", "NAMA", "KATEGORI", "NOMINAL"];
	const headerRow = leftHeaders.map((h) => cell(h, headerStyle));
	if (includeRekonsiliasi) {
		headerRow.push(empty({ fill: { fgColor: { rgb: C.whiteBg } } }));
		for (const h of ["REKONSILIASI", "DATA TUNAI", "DATA NON TUNAI", "GAP"]) {
			headerRow.push(cell(h, headerStyle));
		}
	}
	wsData.push(headerRow);

	const aggregates = includeRekonsiliasi
		? buildRekonsiliasiAggregates(list, dateField)
		: [];
	const rowCount = includeRekonsiliasi
		? Math.max(list.length, aggregates.length)
		: list.length;

	for (let i = 0; i < rowCount; i += 1) {
		const isAlt = i % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const csCenter = makeCellStyle(isAlt, "center");
		const csRight = makeCellStyle(isAlt, "right");
		const blank = empty(cs);

		let row;
		if (i < list.length) {
			const r = list[i];
			const amount = r.pricing_pending ? 0 : Number(r.final_amount || 0);
			const dateValue = r?.[dateField] ?? null;
			row = [
				cell(i + 1, {
					...csCenter,
					font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" },
				}),
				cell(fmtDateSlash(dateValue), csCenter),
				cell(r.transaction_no || "-", cs),
				cell(r.customer_name || "-", cs),
				cell(r.kategori || "-", csCenter),
				cell(amount, csRight),
			];
		} else {
			row = Array.from({ length: leftCols }, () => blank);
		}

		if (includeRekonsiliasi) {
			row.push(empty({ fill: { fgColor: { rgb: C.whiteBg } } }));
			if (i < aggregates.length) {
				const a = aggregates[i];
				row.push(
					cell(a.dateLabel, csCenter),
					cell(a.tunai, csRight),
					cell(a.nonTunai, csRight),
					cell(a.gap, csRight),
				);
			} else {
				row.push(blank, blank, blank, blank);
			}
		}

		wsData.push(row);
	}

	const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
	ws["!merges"] = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
		{ s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
		{ s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
		{ s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } },
	];
	ws["!cols"] = [
		{ wch: 5 },
		{ wch: 12 },
		{ wch: 22 },
		{ wch: 24 },
		{ wch: 12 },
		{ wch: 14 },
	];
	if (includeRekonsiliasi) {
		ws["!cols"].push(
			{ wch: 3 },
			{ wch: 14 },
			{ wch: 14 },
			{ wch: 16 },
			{ wch: 12 },
		);
	}
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
