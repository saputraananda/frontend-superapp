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

	// Waschen accent
	waschenHeaderBg: "7C3AED",
	waschenTitleBg: "5B21B6",
	waschenMetaBg: "F5F3FF",
	waschenMetaText: "5B21B6",
	waschenBorder: "DDD6FE",
};

const border = (color = C.borderColor) => ({
	top: { style: "thin", color: { rgb: color } },
	bottom: { style: "thin", color: { rgb: color } },
	left: { style: "thin", color: { rgb: color } },
	right: { style: "thin", color: { rgb: color } },
});

const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

const makeCellStyle = (isAlt, align = "left", bColor = C.borderColor) => ({
	fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
	font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
	alignment: { horizontal: align, vertical: "center", wrapText: true },
	border: border(bColor),
});

const makeCurrencyStyle = (isAlt, bColor = C.borderColor) => ({
	fill: { fgColor: { rgb: isAlt ? C.altRowBg : C.whiteBg } },
	font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" },
	alignment: { horizontal: "right", vertical: "center" },
	numFmt: "#,##0",
	border: border(bColor),
});

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
	return String(kategori || "").trim().toUpperCase() === "TUNAI";
}

function isNonTunaiReconKategori(kategori) {
	const k = String(kategori || "").trim().toUpperCase();
	if (!k || k === "-" || isTunaiKategori(k)) return false;
	if (k === "COLLABORATION") return false;
	return true;
}

function buildRekonsiliasiAggregates(list, dateField, activePeriod) {
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

	let dateKeys = [];
	if (activePeriod?.startDate && activePeriod?.endDate) {
		const cur = new Date(`${activePeriod.startDate}T12:00:00`);
		const end = new Date(`${activePeriod.endDate}T12:00:00`);
		if (!Number.isNaN(cur.getTime()) && !Number.isNaN(end.getTime()) && cur <= end) {
			while (cur <= end) {
				const y = cur.getFullYear();
				const m = String(cur.getMonth() + 1).padStart(2, "0");
				const d = String(cur.getDate()).padStart(2, "0");
				dateKeys.push(`${y}-${m}-${d}`);
				cur.setDate(cur.getDate() + 1);
			}
		}
	}

	if (dateKeys.length > 0) {
		const set = new Set(dateKeys);
		for (const k of map.keys()) {
			if (!set.has(k)) dateKeys.push(k);
		}
		dateKeys.sort((a, b) => a.localeCompare(b));
	} else {
		dateKeys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
	}

	return dateKeys.map((dateKey) => {
		const bucket = map.get(dateKey) || { tunai: 0, nonTunai: 0 };
		return {
			dateKey,
			dateLabel: fmtDateSlash(dateKey),
			tunai: bucket.tunai,
			nonTunai: bucket.nonTunai,
			gap: 0,
		};
	});
}

/**
 * Buat Worksheet Cleanox Only
 */
function createCleanoxOnlySheet({
	records,
	periodLabel,
	activePeriod,
	dateField = "omzet_date",
	dateHeader = "TGL OMZET",
	includeRekonsiliasi = true,
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

	const titleStyle = {
		fill: { fgColor: { rgb: C.titleBg } },
		font: { bold: true, sz: 13, color: { rgb: "FFFFFF" }, name: "Calibri" },
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

	const wsData = [];
	const emptyTitle = Array.from({ length: totalCols - 1 }, () => empty(titleStyle));
	const emptyMeta = Array.from({ length: totalCols - 1 }, () => empty(metaStyle));
	const emptySpacer = Array.from({ length: totalCols }, () =>
		empty({ fill: { fgColor: { rgb: "FFFFFF" } } }),
	);

	wsData.push([cell("Pendapatan Cleanox — Cleanox Only (Lunas)", titleStyle), ...emptyTitle]);
	wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(`Total Transaksi: ${list.length} baris`, metaStyle), ...emptyMeta]);
	wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
	wsData.push(emptySpacer);

	const leftHeaders = ["No", dateHeader, "NO NOTA", "NAMA CUSTOMER", "KATEGORI", "NOMINAL"];
	const headerRow = leftHeaders.map((h) => cell(h, headerStyle));
	if (includeRekonsiliasi) {
		headerRow.push(empty({ fill: { fgColor: { rgb: C.whiteBg } } }));
		for (const h of ["REKONSILIASI", "DATA TUNAI", "DATA NON TUNAI", "GAP"]) {
			headerRow.push(cell(h, headerStyle));
		}
	}
	wsData.push(headerRow);

	const aggregates = includeRekonsiliasi
		? buildRekonsiliasiAggregates(list, dateField, activePeriod)
		: [];
	const rowCount = includeRekonsiliasi
		? Math.max(list.length, aggregates.length)
		: list.length;

	for (let i = 0; i < rowCount; i += 1) {
		const isAlt = i % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const csCenter = makeCellStyle(isAlt, "center");
		const csCurrency = makeCurrencyStyle(isAlt);
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
				cell(amount, csCurrency),
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
					cell(a.tunai, csCurrency),
					cell(a.nonTunai, csCurrency),
					cell(a.gap, csCurrency),
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
		{ wch: 26 },
		{ wch: 14 },
		{ wch: 16 },
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
	ws["!rows"] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 }];
	return ws;
}

/**
 * Buat Worksheet Cleanox by Waschen
 */
function createCleanoxByWaschenSheet({
	records,
	kpi,
	periodLabel,
	activePeriod,
}) {
	const list = records || [];
	const totalCols = 12;
	const periodStr = activePeriod
		? `${fmtDateLabel(activePeriod.startDate)} s.d. ${fmtDateLabel(activePeriod.endDate)}`
		: "–";
	const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", {
		dateStyle: "long",
		timeStyle: "short",
	})}`;

	const titleStyle = {
		fill: { fgColor: { rgb: C.waschenTitleBg } },
		font: { bold: true, sz: 13, color: { rgb: "FFFFFF" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
	};
	const metaStyle = {
		fill: { fgColor: { rgb: C.waschenMetaBg } },
		font: { sz: 10, color: { rgb: C.waschenMetaText }, italic: true, name: "Calibri" },
		alignment: { horizontal: "left", vertical: "center" },
	};
	const kpiHeaderStyle = {
		fill: { fgColor: { rgb: "EDE9FE" } },
		font: { bold: true, sz: 10, color: { rgb: "5B21B6" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
		border: border(C.waschenBorder),
	};
	const kpiValueStyle = {
		fill: { fgColor: { rgb: "FFFFFF" } },
		font: { bold: true, sz: 11, color: { rgb: "1E1B4B" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
		border: border(C.waschenBorder),
	};
	const headerStyle = {
		fill: { fgColor: { rgb: C.waschenHeaderBg } },
		font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center", wrapText: true },
		border: border(C.waschenBorder),
	};

	const wsData = [];
	const emptyTitle = Array.from({ length: totalCols - 1 }, () => empty(titleStyle));
	const emptyMeta = Array.from({ length: totalCols - 1 }, () => empty(metaStyle));
	const emptySpacer = Array.from({ length: totalCols }, () =>
		empty({ fill: { fgColor: { rgb: "FFFFFF" } } }),
	);

	wsData.push([cell("Pendapatan Cleanox — Cleanox by Waschen (Bagi Hasil 70%)", titleStyle), ...emptyTitle]);
	wsData.push([cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta]);
	wsData.push([cell(`Total Nota Waschen: ${list.length} nota  |  Skema Bagi Hasil: 70% Cleanox - 30% Waschen`, metaStyle), ...emptyMeta]);
	wsData.push([cell(exportedAt, metaStyle), ...emptyMeta]);
	wsData.push(emptySpacer);

	// Mini KPI summary row
	const totalOmzet = Number(kpi?.total_omzet || 0);
	const jatah70 = Number(kpi?.jatah_70 || Math.round(totalOmzet * 0.7));
	const jatah30 = Number(kpi?.jatah_30 || Math.round(totalOmzet * 0.3));
	const totalNota = Number(kpi?.total_nota || list.length);

	wsData.push([
		cell("Total Nota", kpiHeaderStyle),
		cell("Tagihan Bruto (100%)", kpiHeaderStyle),
		cell("Jatah Cleanox (70%)", kpiHeaderStyle),
		cell("Jatah Waschen (30%)", kpiHeaderStyle),
		...Array.from({ length: totalCols - 4 }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })),
	]);
	wsData.push([
		cell(totalNota, kpiValueStyle),
		cell(totalOmzet, { ...kpiValueStyle, numFmt: "#,##0" }),
		cell(jatah70, { ...kpiValueStyle, numFmt: "#,##0", font: { bold: true, sz: 11, color: { rgb: "D97706" }, name: "Calibri" } }),
		cell(jatah30, { ...kpiValueStyle, numFmt: "#,##0", font: { bold: true, sz: 11, color: { rgb: "7C3AED" }, name: "Calibri" } }),
		...Array.from({ length: totalCols - 4 }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })),
	]);
	wsData.push(emptySpacer);

	const headers = [
		"No",
		"Outlet Waschen",
		"No. Nota",
		"Nama Customer",
		"Pembuat Nota",
		"Tgl Terima",
		"Tgl Selesai",
		"Waktu Bayar",
		"Tagihan Bruto",
		"Jatah Cleanox (70%)",
		"Jatah Waschen (30%)",
		"Daftar Item",
	];
	wsData.push(headers.map((h) => cell(h, headerStyle)));

	list.forEach((d, i) => {
		const isAlt = i % 2 === 1;
		const cs = makeCellStyle(isAlt, "left", C.waschenBorder);
		const csCenter = makeCellStyle(isAlt, "center", C.waschenBorder);
		const csCurrency = makeCurrencyStyle(isAlt, C.waschenBorder);

		const nominal = Number(d.nominal_bayar) || 0;
		const j70 = Math.round(nominal * 0.70);
		const j30 = Math.round(nominal * 0.30);

		wsData.push([
			cell(i + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
			cell(d.outlet || "-", cs),
			cell(d.no_nota || "-", cs),
			cell(d.customer_nama || "-", cs),
			cell(d.pembuat_nota || "-", csCenter),
			cell(d.tgl_terima ? fmtDateSlash(d.tgl_terima) : "-", csCenter),
			cell(d.tgl_selesai ? fmtDateSlash(d.tgl_selesai) : "-", csCenter),
			cell(d.waktu_pembayaran ? fmtDateSlash(d.waktu_pembayaran) : "-", csCenter),
			cell(nominal, csCurrency),
			cell(j70, { ...csCurrency, font: { bold: true, sz: 10, color: { rgb: "D97706" }, name: "Calibri" } }),
			cell(j30, { ...csCurrency, font: { bold: true, sz: 10, color: { rgb: "7C3AED" }, name: "Calibri" } }),
			cell(d.daftar_item || "-", cs),
		]);
	});

	const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
	ws["!merges"] = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
		{ s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
		{ s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
		{ s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } },
		{ s: { r: 7, c: 0 }, e: { r: 7, c: totalCols - 1 } },
	];
	ws["!cols"] = [
		{ wch: 5 },
		{ wch: 22 },
		{ wch: 20 },
		{ wch: 24 },
		{ wch: 18 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 14 },
		{ wch: 16 },
		{ wch: 18 },
		{ wch: 18 },
		{ wch: 30 },
	];
	ws["!rows"] = [
		{ hpt: 30 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 },
		{ hpt: 20 }, { hpt: 22 }, { hpt: 6 }, { hpt: 24 }
	];
	return ws;
}

/**
 * Export Excel Total Pendapatan Cleanox (2 Sheet: Cleanox Only + Cleanox by Waschen)
 */
export function exportTotalPendapatanCleanoxExcel({
	cleanoxRecords = [],
	waschenRecords = [],
	waschenKpi = {},
	periodLabel = "",
	activePeriod = null,
	filePrefix = "Pendapatan_Total_Cleanox",
}) {
	const wb = XLSXStyle.utils.book_new();

	// Sheet 1: Cleanox Only
	const wsCleanox = createCleanoxOnlySheet({
		records: cleanoxRecords,
		periodLabel,
		activePeriod,
		dateField: "omzet_date",
		dateHeader: "TGL OMZET",
		includeRekonsiliasi: true,
	});
	XLSXStyle.utils.book_append_sheet(wb, wsCleanox, "Cleanox Only");

	// Sheet 2: Cleanox by Waschen
	const wsWaschen = createCleanoxByWaschenSheet({
		records: recordsFilter(waschenRecords),
		kpi: waschenKpi,
		periodLabel,
		activePeriod,
	});
	XLSXStyle.utils.book_append_sheet(wb, wsWaschen, "Cleanox by Waschen");

	const start = activePeriod?.startDate || "start";
	const end = activePeriod?.endDate || "end";
	const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
	saveAs(
		new Blob([buffer], { type: "application/octet-stream" }),
		`${filePrefix}_${start}_${end}.xlsx`,
	);
}

function recordsFilter(arr) {
	return Array.isArray(arr) ? arr : [];
}
