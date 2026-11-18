import XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";

const C = {
	headerBg: "1E3A5F",
	titleBg: "0F172A",
	metaBg: "E0F2FE",
	metaText: "0C4A6E",
	altRowBg: "F8FAFC",
	whiteBg: "FFFFFF",
	textDark: "1E293B",
	textGray: "64748B",
	borderColor: "CBD5E1",
	// Highlight Hari Sabtu (Soft Amber / Pastel Yellow)
	satBg: "FEF3C7",
	satText: "92400E",
	satBorder: "FCD34D",
	// Highlight Hari Minggu (Soft Rose / Red)
	sunBg: "FFE4E6",
	sunText: "9F1239",
	sunBorder: "FDA4AF",
	// Lembur & Status badge colors
	lemburViolet: "5B21B6",
	lemburVioletLight: "EDE9FE",
	status_lengkap_bg: "D1FAE5",
	status_lengkap_text: "065F46",
	status_incomplete_bg: "FEF3C7",
	status_incomplete_text: "92400E",
};

const border = (color = C.borderColor) => ({
	top: { style: "thin", color: { rgb: color } },
	bottom: { style: "thin", color: { rgb: color } },
	left: { style: "thin", color: { rgb: color } },
	right: { style: "thin", color: { rgb: color } },
});

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

const headerStyle = (bg = C.headerBg) => ({
	fill: { fgColor: { rgb: bg } },
	font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
	alignment: { horizontal: "center", vertical: "center", wrapText: true },
	border: border(),
});

const cell = (v, s) => ({ v, t: typeof v === "number" ? "n" : "s", s });
const empty = (s) => ({ v: "", t: "s", s });

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtDayDate(dateStr) {
	if (!dateStr) return "-";
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return String(dateStr);
	const dayName = DAYS_ID[d.getDay()];
	const dateNum = String(d.getDate()).padStart(2, "0");
	const monthName = MONTHS_SHORT_ID[d.getMonth()];
	const year = d.getFullYear();
	return `${dayName}, ${dateNum} ${monthName} ${year}`;
}

function fmtDateOnly(d) {
	if (!d) return "-";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return String(d);
	return `${date.getDate()} ${MONTHS_SHORT_ID[date.getMonth()]} ${date.getFullYear()}`;
}

function fmtTime(d) {
	if (!d) return "-";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return String(d);
	return new Intl.DateTimeFormat("id-ID", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(date);
}

function calcDuration(checkIn, checkOut) {
	if (!checkIn || !checkOut) return "-";
	const diff = new Date(checkOut) - new Date(checkIn);
	if (diff <= 0) return "-";
	const h = Math.floor(diff / 3_600_000);
	const m = Math.floor((diff % 3_600_000) / 60_000);
	return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function getDaysInRange(startDate, endDate) {
	const dates = [];
	const curr = new Date(startDate);
	const end = new Date(endDate);
	while (curr <= end) {
		dates.push(curr.toISOString().slice(0, 10));
		curr.setDate(curr.getDate() + 1);
	}
	return dates;
}

function sanitizeSheetName(rawName, empCode, usedNames) {
	let name = String(rawName || "Karyawan")
		.replace(/[\\/?*[\]:]/g, "")
		.trim();
	const code = String(empCode || "").trim();
	let candidate = code ? `${code} - ${name}` : name;
	if (candidate.length > 28) {
		candidate = candidate.slice(0, 28);
	}
	let unique = candidate;
	let counter = 2;
	while (usedNames.has(unique.toLowerCase())) {
		const suffix = ` (${counter})`;
		unique = candidate.slice(0, 31 - suffix.length) + suffix;
		counter++;
	}
	usedNames.add(unique.toLowerCase());
	return unique;
}

function buildAoaSheet(wsData, merges, cols, rowHeights = {}) {
	const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
	ws["!merges"] = merges;
	ws["!cols"] = cols;
	const rows = [
		{ hpt: 30 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 26 },
	];
	Object.entries(rowHeights).forEach(([idx, hpt]) => {
		rows[Number(idx)] = { hpt };
	});
	ws["!rows"] = rows;
	return ws;
}

export function exportReportAbsensiMultiSheetExcel({
	records = [],
	lemburSummary = [],
	employeeSummary = [],
	periodLabel,
	activePeriod,
	filters,
}) {
	const wb = XLSXStyle.utils.book_new();
	const usedSheetNames = new Set();

	const periodStr = activePeriod
		? `${fmtDateOnly(activePeriod.startDate)} s.d. ${fmtDateOnly(activePeriod.endDate)}`
		: "–";
	const exportedAt = `Diekspor: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`;

	// Index attendance records by `${employee_id}|${work_date}`
	const recordsMap = new Map();
	records.forEach((r) => {
		const empId = Number(r.employee_id);
		const workDate = String(r.work_date || "").slice(0, 10);
		if (empId && workDate) {
			recordsMap.set(`${empId}|${workDate}`, r);
		}
	});

	// Build map for lembur summary per employee
	const lemburMap = new Map();
	lemburSummary.forEach((l) => {
		lemburMap.set(Number(l.employee_id), l);
	});

	// List of all dates in the active period
	const allDates = (activePeriod?.startDate && activePeriod?.endDate)
		? getDaysInRange(activePeriod.startDate, activePeriod.endDate)
		: [];

	// Determine unique employees to export
	const empList = (employeeSummary && employeeSummary.length > 0)
		? employeeSummary
		: lemburSummary.map((l) => ({
			employee_id: l.employee_id,
			employee_code: l.employee_code,
			employee_name: l.employee_name,
			jabatan: l.jabatan,
			department_name: l.department_name,
			record_count: 0,
			complete_count: 0,
			incomplete_count: 0,
			total_lembur_hours: l.total_lembur_hours,
			lembur_count: l.lembur_count,
		}));

	// Sort employees alphabetically by name
	empList.sort((a, b) => String(a.employee_name || "").localeCompare(String(b.employee_name || ""), "id"));

	// =========================================================================
	// SHEET 1: RINGKASAN KARYAWAN (MASTER SUMMARY ALL EMPLOYEES)
	// =========================================================================
	const SUM_COLS = 11;
	const sumData = [
		[
			cell("REKAPITULASI KEHADIRAN & LEMBUR KARYAWAN — ALORA GROUP", titleStyle),
			...Array.from({ length: SUM_COLS - 1 }, () => empty(titleStyle)),
		],
		[
			cell(`Periode: ${periodLabel || periodStr}  |  Total Karyawan: ${empList.length} Orang`, metaStyle),
			...Array.from({ length: SUM_COLS - 1 }, () => empty(metaStyle)),
		],
		[
			cell(exportedAt, metaStyle),
			...Array.from({ length: SUM_COLS - 1 }, () => empty(metaStyle)),
		],
		Array.from({ length: SUM_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })),
		[
			"No",
			"NIK",
			"Nama Karyawan",
			"Departemen",
			"Jabatan",
			"Total Hadir",
			"Lengkap",
			"Belum Lengkap",
			"Pengajuan Lembur (Approval)",
			"Total Jam Lembur (Approval)",
			"Total WOD / RO Earned (Jam)",
		].map((h) => cell(h, headerStyle())),
	];

	const sumMerges = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: SUM_COLS - 1 } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: SUM_COLS - 1 } },
		{ s: { r: 2, c: 0 }, e: { r: 2, c: SUM_COLS - 1 } },
		{ s: { r: 3, c: 0 }, e: { r: 3, c: SUM_COLS - 1 } },
	];

	empList.forEach((emp, idx) => {
		const isAlt = idx % 2 === 1;
		const rowBg = isAlt ? C.altRowBg : C.whiteBg;
		const cs = { fill: { fgColor: { rgb: rowBg } }, font: { sz: 10, color: { rgb: C.textDark }, name: "Calibri" }, border: border() };
		const csCenter = { ...cs, alignment: { horizontal: "center", vertical: "center" } };
		const csNumBold = { ...csCenter, font: { ...cs.font, bold: true } };

		const l = lemburMap.get(Number(emp.employee_id)) || {};
		const totalLemburHours = Number(emp.total_lembur_hours != null ? emp.total_lembur_hours : l.total_lembur_hours) || 0;
		const lemburCount = Number(emp.lembur_count != null ? emp.lembur_count : l.lembur_count) || 0;
		const roHours = Number(emp.total_ro_earned_hours != null ? emp.total_ro_earned_hours : l.total_ro_earned_hours) || 0;

		sumData.push([
			cell(idx + 1, csCenter),
			cell(emp.employee_code || "-", csCenter),
			cell(emp.employee_name || "-", cs),
			cell(emp.department_name || "-", cs),
			cell(emp.jabatan || "-", cs),
			cell(Number(emp.record_count) || 0, csCenter),
			cell(Number(emp.complete_count) || 0, { ...csCenter, font: { ...csCenter.font, bold: true, color: { rgb: "065F46" } } }),
			cell(Number(emp.incomplete_count) || 0, { ...csCenter, font: { ...csCenter.font, color: { rgb: emp.incomplete_count > 0 ? "B91C1C" : C.textGray } } }),
			cell(lemburCount, csCenter),
			cell(totalLemburHours > 0 ? totalLemburHours.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "-", totalLemburHours > 0 ? { ...csNumBold, font: { ...csNumBold.font, color: { rgb: C.lemburViolet } } } : csCenter),
			cell(roHours > 0 ? roHours.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "-", csCenter),
		]);
	});

	const wsSummary = buildAoaSheet(
		sumData,
		sumMerges,
		[
			{ wch: 6 },
			{ wch: 12 },
			{ wch: 28 },
			{ wch: 20 },
			{ wch: 22 },
			{ wch: 12 },
			{ wch: 12 },
			{ wch: 14 },
			{ wch: 24 },
			{ wch: 24 },
			{ wch: 24 },
		],
		{ 4: 28 }
	);
	usedSheetNames.add("ringkasan karyawan");
	XLSXStyle.utils.book_append_sheet(wb, wsSummary, "Ringkasan Karyawan");

	// =========================================================================
	// SHEET 2 s/d N: DETAIL INDIVIDUAL PER KARYAWAN
	// =========================================================================
	const DETAIL_COLS = 9;

	empList.forEach((emp) => {
		const empId = Number(emp.employee_id);
		const sheetName = sanitizeSheetName(emp.employee_name, emp.employee_code, usedSheetNames);

		const profileCardStyle = {
			fill: { fgColor: { rgb: C.metaBg } },
			font: { bold: true, sz: 10, color: { rgb: C.metaText }, name: "Calibri" },
			alignment: { horizontal: "left", vertical: "center" },
		};

		const detailData = [
			[
				cell(`RINCIAN KEHADIRAN & LEMBUR: ${String(emp.employee_name || "").toUpperCase()}`, titleStyle),
				...Array.from({ length: DETAIL_COLS - 1 }, () => empty(titleStyle)),
			],
			[
				cell(`NIK: ${emp.employee_code || "-"}  |  Departemen: ${emp.department_name || "-"}  |  Jabatan: ${emp.jabatan || "-"}`, profileCardStyle),
				...Array.from({ length: DETAIL_COLS - 1 }, () => empty(profileCardStyle)),
			],
			[
				cell(`Periode Cutoff: ${periodLabel || periodStr}  |  ${exportedAt}`, metaStyle),
				...Array.from({ length: DETAIL_COLS - 1 }, () => empty(metaStyle)),
			],
			Array.from({ length: DETAIL_COLS }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } })),
			[
				"No",
				"Hari & Tanggal",
				"Jam Masuk",
				"Jam Keluar",
				"Durasi Kerja",
				"Mode / Lokasi",
				"Status Absensi",
				"Jam Lembur (Approval)",
				"Keterangan / Pekerjaan Lembur",
			].map((h) => cell(h, headerStyle("1E3A5F"))),
		];

		const detailMerges = [
			{ s: { r: 0, c: 0 }, e: { r: 0, c: DETAIL_COLS - 1 } },
			{ s: { r: 1, c: 0 }, e: { r: 1, c: DETAIL_COLS - 1 } },
			{ s: { r: 2, c: 0 }, e: { r: 2, c: DETAIL_COLS - 1 } },
			{ s: { r: 3, c: 0 }, e: { r: 3, c: DETAIL_COLS - 1 } },
		];

		let totalHadirInPeriod = 0;
		let totalLemburHoursInPeriod = 0;

		allDates.forEach((dateStr, dIdx) => {
			const dObj = new Date(dateStr);
			const dayOfWeek = dObj.getDay();
			const isSaturday = dayOfWeek === 6;
			const isSunday = dayOfWeek === 0;

			const rec = recordsMap.get(`${empId}|${dateStr}`);

			// Styling rule:
			// Saturday => Highlight Soft Amber
			// Sunday => Highlight Soft Rose
			// Weekday => Alternating row
			let rowBg = dIdx % 2 === 1 ? C.altRowBg : C.whiteBg;
			let textColor = C.textDark;
			let borderColor = C.borderColor;
			let isBold = false;

			if (isSaturday) {
				rowBg = C.satBg; // FEF3C7
				textColor = C.satText; // 92400E
				borderColor = C.satBorder;
				isBold = true;
			} else if (isSunday) {
				rowBg = C.sunBg; // FFE4E6
				textColor = C.sunText; // 9F1239
				borderColor = C.sunBorder;
				isBold = true;
			}

			const rowBorder = border(borderColor);
			const cellBase = {
				fill: { fgColor: { rgb: rowBg } },
				font: { sz: 9.5, color: { rgb: textColor }, bold: isBold, name: "Calibri" },
				border: rowBorder,
			};
			const cellLeft = { ...cellBase, alignment: { horizontal: "left", vertical: "center" } };
			const cellCenter = { ...cellBase, alignment: { horizontal: "center", vertical: "center" } };

			const lemburHours = Number(rec?.lembur_hours) || 0;
			if (lemburHours > 0) totalLemburHoursInPeriod += lemburHours;
			if (rec?.check_in_time) totalHadirInPeriod += 1;

			const lemburCellStyle = lemburHours > 0
				? {
					...cellCenter,
					fill: { fgColor: { rgb: isSaturday ? C.satBg : C.lemburVioletLight } },
					font: { ...cellCenter.font, bold: true, color: { rgb: C.lemburViolet } },
				}
				: cellCenter;

			let statusDisplay = rec?.status_label || (isSunday ? "Hari Libur" : isSaturday ? "Sabtu" : "Tidak Hadir");
			let statusStyle = cellCenter;

			if (rec) {
				if (rec.late_compensation_type === "pending_overtime") {
					const h = rec.late_compensation_hours || (rec.late_minutes ? Math.round((Number(rec.late_minutes) / 60) * 100) / 100 : 1);
					statusDisplay = `${rec.status_label || "Hadir"} (Perlu Potong Lembur ${h}j)`;
					statusStyle = {
						...cellCenter,
						font: { ...cellCenter.font, bold: true, color: { rgb: "B91C1C" } },
					};
				} else if (rec.is_late_waived) {
					const h = rec.late_compensation_hours || (rec.late_minutes ? Math.round((Number(rec.late_minutes) / 60) * 100) / 100 : 0);
					const typeLabel = rec.late_compensation_type === "replace_off" ? "RO" : "Lembur";
					statusDisplay = `${rec.status_label || "Hadir"} (Ditutup ${h}j ${typeLabel})`;
					statusStyle = {
						...cellCenter,
						font: { ...cellCenter.font, color: { rgb: "0369A1" } },
					};
				} else if (rec.is_late || (rec.late_minutes && Number(rec.late_minutes) > 0)) {
					statusDisplay = `${rec.status_label || "Hadir"} (Terlambat ${rec.late_minutes}m)`;
					statusStyle = {
						...cellCenter,
						font: { ...cellCenter.font, color: { rgb: "C2410C" } },
					};
				}
			}

			detailData.push([
				cell(dIdx + 1, cellCenter),
				cell(fmtDayDate(dateStr), cellLeft),
				cell(rec ? fmtTime(rec.check_in_time) : "-", cellCenter),
				cell(rec ? fmtTime(rec.check_out_time) : "-", cellCenter),
				cell(rec ? calcDuration(rec.check_in_time, rec.check_out_time) : "-", cellCenter),
				cell(rec?.mode_label || (rec ? "Harian" : "-"), cellCenter),
				cell(statusDisplay, statusStyle),
				cell(lemburHours > 0 ? lemburHours.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "-", lemburCellStyle),
				cell(rec?.lembur_description?.trim() || "-", cellLeft),
			]);
		});

		// Summary row at the bottom of the sheet
		const summaryRowIdx = detailData.length;
		const summaryStyle = {
			fill: { fgColor: { rgb: "E2E8F0" } },
			font: { bold: true, sz: 10, color: { rgb: "0F172A" }, name: "Calibri" },
			alignment: { horizontal: "center", vertical: "center" },
			border: border("94A3B8"),
		};
		detailData.push([
			cell("TOTAL PERIODE", { ...summaryStyle, alignment: { horizontal: "center", vertical: "center" } }),
			empty(summaryStyle),
			empty(summaryStyle),
			empty(summaryStyle),
			empty(summaryStyle),
			cell(`Total Hadir: ${totalHadirInPeriod} Hari`, summaryStyle),
			empty(summaryStyle),
			cell(`${totalLemburHoursInPeriod.toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jam`, { ...summaryStyle, font: { ...summaryStyle.font, color: { rgb: C.lemburViolet } } }),
			cell(`Total Lembur Disetujui: ${totalLemburHoursInPeriod.toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jam`, { ...summaryStyle, alignment: { horizontal: "left", vertical: "center" } }),
		]);
		detailMerges.push(
			{ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 4 } },
			{ s: { r: summaryRowIdx, c: 5 }, e: { r: summaryRowIdx, c: 6 } }
		);

		const wsDetail = buildAoaSheet(
			detailData,
			detailMerges,
			[
				{ wch: 5 },  // No
				{ wch: 22 }, // Hari & Tanggal
				{ wch: 12 }, // Jam Masuk
				{ wch: 12 }, // Jam Keluar
				{ wch: 14 }, // Durasi Kerja
				{ wch: 15 }, // Mode / Lokasi
				{ wch: 18 }, // Status Absensi
				{ wch: 22 }, // Jam Lembur (Approval)
				{ wch: 45 }, // Keterangan / Pekerjaan Lembur
			],
			{ 4: 28, [summaryRowIdx]: 24 }
		);

		XLSXStyle.utils.book_append_sheet(wb, wsDetail, sheetName);
	});

	// Save and trigger file download
	const start = activePeriod?.startDate || "start";
	const end = activePeriod?.endDate || "end";
	const fileName = `Report_Absensi_Detail_Per_Karyawan_${start}_${end}.xlsx`;
	const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
	saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName);
}

