import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

const C = {
	headerIdentitasBg: "1E3A5F", // Dark Navy
	headerKehadiranBg: "334155", // Slate Blue
	headerBlueBg: "CFE2F3",      // Soft Blue Master Gaji
	headerBlueText: "0C4A6E",
	blueBorder: "93C5FD",
	titleBg: "0F172A",
	metaBg: "E0F2FE",
	metaText: "0C4A6E",
	altRowBg: "F8FAFC",
	whiteBg: "FFFFFF",
	textDark: "1E293B",
	textGray: "64748B",
	borderColor: "CBD5E1",
	// Highlight Kolom Biru Data
	cellBlueBgAlt: "EBF3FB",
	cellBlueBgWhite: "F2F7FC",
	// Colors for Metrics
	kehadiranText: "047857",     // Emerald
	lemburText: "6D28D9",        // Violet
	unpaidText: "BE123C",        // Rose
	// Total Row
	totalBg: "E2E8F0",
};

const border = (color = C.borderColor) => ({
	top: { style: "thin", color: { rgb: color } },
	bottom: { style: "thin", color: { rgb: color } },
	left: { style: "thin", color: { rgb: color } },
	right: { style: "thin", color: { rgb: color } },
});

const cell = (v, s = {}) => ({ v, s });
const empty = (s = {}) => ({ v: "", s });

function fmtDateOnly(isoStr) {
	if (!isoStr) return "-";
	const [y, m, d] = String(isoStr).slice(0, 10).split("-");
	const monthNames = [
		"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
	];
	return `${d} ${monthNames[Number(m)] || m} ${y}`;
}

export function exportPayrollBiruExcel({
	payrollData = [],
	period = {},
	summary = {},
	periodLabel,
}) {
	const wb = XLSXStyle.utils.book_new();

	const titleStyle = {
		fill: { fgColor: { rgb: C.titleBg } },
		font: { bold: true, sz: 13, color: { rgb: "FFFFFF" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
	};

	const metaStyle = {
		fill: { fgColor: { rgb: C.metaBg } },
		font: { sz: 9.5, color: { rgb: C.metaText }, italic: true, name: "Calibri" },
		alignment: { horizontal: "left", vertical: "center" },
	};

	// Group Headers (Row 5)
	const grpIdentitasStyle = {
		fill: { fgColor: { rgb: C.headerIdentitasBg } },
		font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
		border: border(),
	};

	const grpKehadiranStyle = {
		fill: { fgColor: { rgb: C.headerKehadiranBg } },
		font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
		border: border(),
	};

	const grpBlueStyle = {
		fill: { fgColor: { rgb: C.headerBlueBg } },
		font: { bold: true, sz: 10, color: { rgb: C.headerBlueText }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
		border: border(C.blueBorder),
	};

	// Sub-headers (Row 6)
	const subIdentitasStyle = {
		fill: { fgColor: { rgb: "F1F5F9" } },
		font: { bold: true, sz: 9.5, color: { rgb: C.textDark }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center", wrapText: true },
		border: border(),
	};

	const subKehadiranStyle = {
		fill: { fgColor: { rgb: "F8FAFC" } },
		font: { bold: true, sz: 9.5, color: { rgb: C.textDark }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center", wrapText: true },
		border: border(),
	};

	const subBlueStyle = {
		fill: { fgColor: { rgb: C.headerBlueBg } },
		font: { bold: true, sz: 9.5, color: { rgb: C.headerBlueText }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center", wrapText: true },
		border: border(C.blueBorder),
	};

	const periodStr = period?.startDate && period?.endDate
		? `${fmtDateOnly(period.startDate)} s.d. ${fmtDateOnly(period.endDate)} (${period.totalWorkingDays || 25} Hari Kerja)`
		: "-";
	const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

	const COLS = 13;

	const wsData = [
		// Row 1: Title
		[
			cell("REKAPITULASI PAYROLL ALORA (ABSENSI, LEMBUR & POTONGAN)", titleStyle),
			...Array.from({ length: COLS - 1 }, () => empty(titleStyle)),
		],
		// Row 2: Period Meta
		[
			cell(`Periode Cutoff: ${periodLabel || periodStr}  |  Total Karyawan: ${payrollData.length} Orang`, metaStyle),
			...Array.from({ length: COLS - 1 }, () => empty(metaStyle)),
		],
		// Row 3: Export Timestamp
		[
			cell(exportedAt, metaStyle),
			...Array.from({ length: COLS - 1 }, () => empty(metaStyle)),
		],
		// Row 4: Spacer
		Array.from({ length: COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })),
		// Row 5: Group Headers (Persis seperti tampilan web)
		[
			cell("IDENTITAS KARYAWAN", grpIdentitasStyle),
			empty(grpIdentitasStyle),
			empty(grpIdentitasStyle),
			empty(grpIdentitasStyle),
			empty(grpIdentitasStyle),
			cell("KEHADIRAN & LEMBUR", grpKehadiranStyle),
			empty(grpKehadiranStyle),
			empty(grpKehadiranStyle),
			empty(grpKehadiranStyle),
			cell("KOLOM POTONGAN MASTER GAJI (EXPORT BIRU)", grpBlueStyle),
			empty(grpBlueStyle),
			empty(grpBlueStyle),
			empty(grpBlueStyle),
		],
		// Row 6: Column Sub-Headers
		[
			cell("No", subIdentitasStyle),
			cell("NIK", subIdentitasStyle),
			cell("Nama Karyawan", subIdentitasStyle),
			cell("Departemen", subIdentitasStyle),
			cell("Jabatan", subIdentitasStyle),
			cell("Kehadiran", subKehadiranStyle),
			cell("OFF", subKehadiranStyle),
			cell("Lembur Reguler", subKehadiranStyle),
			cell("Unpaid Leave", subKehadiranStyle),
			cell("Pot per Jam\n(Jam)", subBlueStyle),
			cell("Konsumsi (Telat)\n(Berapa Kali)", subBlueStyle),
			cell("Konsumsi (Unpaid)\n(Hari)", subBlueStyle),
			cell("Transport (Unpaid)\n(Hari)", subBlueStyle),
		],
	];

	const merges = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
		{ s: { r: 2, c: 0 }, e: { r: 2, c: COLS - 1 } },
		{ s: { r: 3, c: 0 }, e: { r: 3, c: COLS - 1 } },
		// Group Merges on Row 5 (index 4)
		{ s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }, // Identitas Karyawan (A5:E5)
		{ s: { r: 4, c: 5 }, e: { r: 4, c: 8 } }, // Kehadiran & Lembur (F5:I5)
		{ s: { r: 4, c: 9 }, e: { r: 4, c: 12 } }, // Kolom Potongan Master Gaji (J5:M5)
	];

	let totalKehadiran = 0;
	let totalOff = 0;
	let totalLembur = 0;
	let totalUnpaidLeave = 0;
	let totalPotPerJam = 0;
	let totalKonsumsiTelat = 0;
	let totalKonsumsiUnpaid = 0;
	let totalTransportUnpaid = 0;

	payrollData.forEach((row, idx) => {
		const isAlt = idx % 2 === 1;
		const baseBg = isAlt ? C.altRowBg : C.whiteBg;

		const cellBase = {
			fill: { fgColor: { rgb: baseBg } },
			font: { sz: 9.5, color: { rgb: C.textDark }, name: "Calibri" },
			border: border(),
		};
		const cellCenter = { ...cellBase, alignment: { horizontal: "center", vertical: "center" } };
		const cellLeft = { ...cellBase, alignment: { horizontal: "left", vertical: "center" } };

		// Blue column data style
		const blueBg = isAlt ? C.cellBlueBgAlt : C.cellBlueBgWhite;
		const cellBlueNum = {
			fill: { fgColor: { rgb: blueBg } },
			font: { sz: 9.5, bold: true, color: { rgb: C.headerBlueText }, name: "Calibri" },
			alignment: { horizontal: "center", vertical: "center" },
			border: border(C.blueBorder),
		};

		const keh = Number(row.kehadiran) || 0;
		const off = Number(row.off) || 0;
		const lmb = Number(row.lembur_reguler) || 0;
		const unp = Number(row.unpaid_leave) || 0;
		const potJam = Number(row.pot_per_jam) || 0;
		const konsTelat = Number(row.konsumsi_telat) || 0;
		const konsUnpaid = Number(row.konsumsi_unpaid) || 0;
		const transUnpaid = Number(row.transportasi_unpaid) || 0;

		totalKehadiran += keh;
		totalOff += off;
		totalLembur += lmb;
		totalUnpaidLeave += unp;
		totalPotPerJam += potJam;
		totalKonsumsiTelat += konsTelat;
		totalKonsumsiUnpaid += konsUnpaid;
		totalTransportUnpaid += transUnpaid;

		wsData.push([
			cell(idx + 1, cellCenter),
			cell(row.employee_code || "-", cellCenter),
			cell(row.employee_name || "-", { ...cellLeft, font: { ...cellLeft.font, bold: true } }),
			cell(row.department_name || "-", cellLeft),
			cell(row.jabatan || "-", cellLeft),
			// Kehadiran & Lembur
			cell(keh, { ...cellCenter, font: { ...cellCenter.font, bold: true, color: { rgb: C.kehadiranText } } }),
			cell(off, cellCenter),
			cell(lmb > 0 ? lmb.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "-", lmb > 0 ? { ...cellCenter, font: { ...cellCenter.font, bold: true, color: { rgb: C.lemburText } } } : cellCenter),
			cell(unp > 0 ? unp : 0, unp > 0 ? { ...cellCenter, font: { ...cellCenter.font, bold: true, color: { rgb: C.unpaidText } } } : cellCenter),
			// Kolom Biru Master Gaji
			cell(potJam > 0 ? potJam.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : 0, potJam > 0 ? { ...cellBlueNum, font: { ...cellBlueNum.font, color: { rgb: C.unpaidText } } } : cellBlueNum),
			cell(konsTelat > 0 ? konsTelat : 0, konsTelat > 0 ? { ...cellBlueNum, font: { ...cellBlueNum.font, color: { rgb: "92400E" } } } : cellBlueNum),
			cell(konsUnpaid > 0 ? konsUnpaid : 0, cellBlueNum),
			cell(transUnpaid > 0 ? transUnpaid : 0, cellBlueNum),
		]);
	});

	// Baris Total di Bawah
	const totalRowIdx = wsData.length;
	const totalStyle = {
		fill: { fgColor: { rgb: C.totalBg } },
		font: { bold: true, sz: 10, color: { rgb: "0F172A" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
		border: border("94A3B8"),
	};
	const totalBlueStyle = {
		fill: { fgColor: { rgb: C.headerBlueBg } },
		font: { bold: true, sz: 10, color: { rgb: C.headerBlueText }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
		border: border(C.blueBorder),
	};

	wsData.push([
		cell("TOTAL", totalStyle),
		empty(totalStyle),
		empty(totalStyle),
		empty(totalStyle),
		empty(totalStyle),
		cell(totalKehadiran, { ...totalStyle, font: { ...totalStyle.font, color: { rgb: C.kehadiranText } } }),
		cell(totalOff, totalStyle),
		cell(totalLembur > 0 ? totalLembur.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "-", { ...totalStyle, font: { ...totalStyle.font, color: { rgb: C.lemburText } } }),
		cell(totalUnpaidLeave, { ...totalStyle, font: { ...totalStyle.font, color: { rgb: C.unpaidText } } }),
		cell(totalPotPerJam.toLocaleString("id-ID", { maximumFractionDigits: 2 }), totalBlueStyle),
		cell(totalKonsumsiTelat, totalBlueStyle),
		cell(totalKonsumsiUnpaid, totalBlueStyle),
		cell(totalTransportUnpaid, totalBlueStyle),
	]);

	merges.push({ s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 4 } });

	const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
	ws["!merges"] = merges;
	ws["!cols"] = [
		{ wch: 6 },  // No
		{ wch: 14 }, // NIK
		{ wch: 30 }, // Nama Karyawan
		{ wch: 24 }, // Departemen
		{ wch: 24 }, // Jabatan
		{ wch: 12 }, // Kehadiran
		{ wch: 10 }, // OFF
		{ wch: 16 }, // Lembur Reguler
		{ wch: 14 }, // Unpaid Leave
		{ wch: 16 }, // Pot per Jam
		{ wch: 18 }, // Konsumsi (Telat)
		{ wch: 18 }, // Konsumsi (Unpaid)
		{ wch: 18 }, // Transport (Unpaid)
	];
	ws["!rows"] = [
		{ hpt: 30 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 }, { hpt: 28 },
	];
	ws["!rows"][totalRowIdx] = { hpt: 24 };

	XLSXStyle.utils.book_append_sheet(wb, ws, "Rekap Payroll");

	const start = period?.startDate || "start";
	const end = period?.endDate || "end";
	const fileName = `Rekap_Payroll_Alora_${start}_${end}.xlsx`;
	const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
	saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName);
}
