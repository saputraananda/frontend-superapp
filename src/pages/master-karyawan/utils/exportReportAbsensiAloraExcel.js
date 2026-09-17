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
	status_lengkap_bg: "D1FAE5",
	status_lengkap_text: "065F46",
	status_belum_out_bg: "FEF3C7",
	status_belum_out_text: "92400E",
	status_belum_in_bg: "FFE4E6",
	status_belum_in_text: "9F1239",
	status_foto_bg: "FFEDD5",
	status_foto_text: "9A3412",
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

const makeStatusStyle = (statusLabel, isAlt) => {
	const map = {
		Lengkap: { bg: C.status_lengkap_bg, text: C.status_lengkap_text },
		"Belum check-out": { bg: C.status_belum_out_bg, text: C.status_belum_out_text },
		"Belum check-in": { bg: C.status_belum_in_bg, text: C.status_belum_in_text },
		"Foto belum lengkap": { bg: C.status_foto_bg, text: C.status_foto_text },
	};
	const colors = map[statusLabel] || { bg: isAlt ? C.altRowBg : C.whiteBg, text: C.textDark };
	return {
		fill: { fgColor: { rgb: colors.bg } },
		font: { bold: true, sz: 10, color: { rgb: colors.text }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center" },
		border: border(),
	};
};

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

function fmtTime(d) {
	if (!d) return "-";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return String(d);
	return new Intl.DateTimeFormat("id-ID", {
		hour: "2-digit",
		minute: "2-digit",
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

function lateLabel(row) {
	if (row.late_category === "planned") return "Terlambat Terencana";
	if (row.late_category === "unexpected") return "Tidak Terencana";
	const hasLate =
		(row.late_minutes != null && Number(row.late_minutes) > 0)
		|| Boolean(String(row.late_reason || "").trim());
	if (hasLate) return "Terlambat";
	return "-";
}

function lateHoursLabel(row) {
	if (row.late_minutes == null || row.late_minutes <= 0) return "-";
	const hours = Number(row.late_minutes) / 60;
	return hours.toLocaleString("id-ID", {
		maximumFractionDigits: 2,
		minimumFractionDigits: hours < 1 ? 1 : 0,
	});
}

function lateReasonLabel(row) {
	return row.late_reason?.trim() || "-";
}

function approvalStatusLabelForAbsensi(row) {
	const mode = String(row?.attendance_mode || "").toLowerCase();
	if (mode !== "wfa" && mode !== "wod") return "-";
	if (row?.approval_status === "disetujui" || row?.mode_request_id) return "Disetujui";
	return "Belum Disetujui";
}

function lemburHoursLabel(row) {
	const n = Number(row.lembur_hours);
	if (!Number.isFinite(n) || n <= 0) return "-";
	return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function hoursNumLabel(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) return "-";
	return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function leaveTypeLabel(type) {
	const t = String(type || "").toLowerCase();
	if (t === "izin") return "Izin";
	if (t === "cuti") return "Cuti";
	if (t === "sakit") return "Sakit";
	return type || "-";
}

function durationTypeLabel(value) {
	const t = String(value || "").toLowerCase();
	if (t === "full_day") return "Seharian";
	if (t === "half_day") return "Setengah hari";
	if (t === "half_day_morning") return "Setengah hari (pagi)";
	if (t === "half_day_afternoon") return "Setengah hari (sore)";
	if (t === "partial") return "Partial";
	if (t === "hourly") return "Per jam";
	return value || "-";
}

function leaveTanggalLabel(startDate, endDate) {
	const start = startDate ? fmtDate(startDate) : "-";
	const end = endDate ? fmtDate(endDate) : "-";
	if (!startDate && !endDate) return "-";
	if (String(startDate || "").slice(0, 10) === String(endDate || "").slice(0, 10)) return start;
	return `${start} – ${end}`;
}

function leaveTimeLabel(value) {
	if (value == null || value === "") return "-";
	if (typeof value === "string") {
		const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
		if (m) return `${String(m[1]).padStart(2, "0")}:${m[2]}`;
	}
	return String(value);
}

function groupHeaderStyle(bg) {
	return {
		fill: { fgColor: { rgb: bg } },
		font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" },
		alignment: { horizontal: "center", vertical: "center", wrapText: true },
		border: border(),
	};
}

function buildMetaHeader(totalCols, { title, periodLabel, periodStr, filterLabel, exportedAt }) {
	const emptyTitle = Array.from({ length: totalCols - 1 }, () => empty(titleStyle));
	const emptyMeta = Array.from({ length: totalCols - 1 }, () => empty(metaStyle));
	const emptySpacer = Array.from({ length: totalCols }, () => empty({ fill: { fgColor: { rgb: "FFFFFF" } } }));
	return {
		rows: [
			[cell(title, titleStyle), ...emptyTitle],
			[cell(`Periode: ${periodLabel || periodStr}`, metaStyle), ...emptyMeta],
			[cell(`Filter: ${filterLabel}`, metaStyle), ...emptyMeta],
			[cell(exportedAt, metaStyle), ...emptyMeta],
			emptySpacer,
		],
		merges: [
			{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
			{ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
			{ s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
			{ s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
			{ s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } },
		],
	};
}

function sheetFromAoa(wsData, merges, cols, extraRowHeights = {}) {
	const ws = XLSXStyle.utils.aoa_to_sheet(wsData);
	ws["!merges"] = merges;
	ws["!cols"] = cols;
	const rows = [
		{ hpt: 32 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 24 },
	];
	Object.entries(extraRowHeights).forEach(([idx, hpt]) => {
		rows[Number(idx)] = { hpt };
	});
	ws["!rows"] = rows;
	return ws;
}

export function exportReportAbsensiAloraExcel({
	records,
	lemburSummary = [],
	leavesIzinCuti = [],
	leavesSakit = [],
	periodLabel,
	activePeriod,
	filters,
}) {
	const periodStr = activePeriod
		? `${fmtDate(activePeriod.startDate)} s.d. ${fmtDate(activePeriod.endDate)}`
		: "–";

	const filterParts = [];
	if (filters?.onlyIncomplete) filterParts.push("Hanya data belum lengkap");
	if (filters?.statusFilter) filterParts.push(`Status: ${filters.statusFilter}`);
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
	const metaCommon = { periodLabel, periodStr, filterLabel, exportedAt };

	// —— Sheet 1: Absensi ——
	const ABSEN_COLS = 17;
	const absenMeta = buildMetaHeader(ABSEN_COLS, { title: "Report Absensi Alora", ...metaCommon });
	const absenData = [...absenMeta.rows];
	absenData.push([
		"No",
		"Tanggal",
		"NIK",
		"Nama Karyawan",
		"Jabatan",
		"Jam Absen In",
		"Jam Absen Out",
		"Durasi",
		"Mode",
		"Lokasi Konteks",
		"Status",
		"Final Status",
		"Approval",
		"Lembur (jam)",
		"Kategori Terlambat",
		"Durasi Terlambat (jam)",
		"Alasan Terlambat",
	].map((h) => cell(h, headerStyle)));

	records.forEach((r, idx) => {
		const isAlt = idx % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const csCenter = makeCellStyle(isAlt, "center");
		absenData.push([
			cell(idx + 1, { ...csCenter, font: { sz: 10, color: { rgb: C.textGray }, name: "Calibri" } }),
			cell(fmtDate(r.work_date), csCenter),
			cell(r.employee_code || "-", csCenter),
			cell(r.employee_name || "-", cs),
			cell(r.jabatan || "-", cs),
			cell(fmtTime(r.check_in_time), csCenter),
			cell(fmtTime(r.check_out_time), csCenter),
			cell(calcDuration(r.check_in_time, r.check_out_time), csCenter),
			cell(r.mode_label || "Harian", csCenter),
			cell(r.location_context || "-", csCenter),
			cell(r.status_label || "-", makeStatusStyle(r.status_label, isAlt)),
			cell(r.final_status || "-", cs),
			cell(approvalStatusLabelForAbsensi(r), csCenter),
			cell(lemburHoursLabel(r), csCenter),
			cell(lateLabel(r), csCenter),
			cell(lateHoursLabel(r), csCenter),
			cell(lateReasonLabel(r), cs),
		]);
	});

	const wsAbsen = sheetFromAoa(absenData, absenMeta.merges, [
		{ wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 18 },
		{ wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
		{ wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 12 },
		{ wch: 18 }, { wch: 12 }, { wch: 36 },
	]);

	// —— Sheet 2: Total Lembur (grouped headers) ——
	const LEMBUR_COLS = 12;
	const lemburMeta = buildMetaHeader(LEMBUR_COLS, {
		title: "Total Lembur & RO per Karyawan (periode cutoff)",
		...metaCommon,
	});
	const groupRowIdx = lemburMeta.rows.length; // 5
	const subRowIdx = groupRowIdx + 1; // 6
	const styleLemburGroup = groupHeaderStyle("5B21B6");
	const styleRoGroup = groupHeaderStyle("0369A1");
	const styleUnpaidGroup = groupHeaderStyle("B45309");
	const identityHeaderEmpty = empty(headerStyle);

	const lemburData = [...lemburMeta.rows];
	lemburData.push([
		identityHeaderEmpty,
		identityHeaderEmpty,
		identityHeaderEmpty,
		identityHeaderEmpty,
		cell("Lembur", styleLemburGroup),
		empty(styleLemburGroup),
		empty(styleLemburGroup),
		empty(styleLemburGroup),
		cell("RO", styleRoGroup),
		empty(styleRoGroup),
		empty(styleRoGroup),
		cell("Unpaid", styleUnpaidGroup),
	]);
	lemburData.push([
		cell("No", headerStyle),
		cell("NIK", headerStyle),
		cell("Nama Karyawan", headerStyle),
		cell("Jabatan", headerStyle),
		cell("Jumlah Pengajuan Lembur", headerStyle),
		cell("Total Jam Lembur", headerStyle),
		cell("Total Lembur Dipakai", headerStyle),
		cell("Saldo Lembur", headerStyle),
		cell("Total WOD", headerStyle),
		cell("Total RO Dipakai", headerStyle),
		cell("Saldo RO", headerStyle),
		cell("Total Unpaid", headerStyle),
	]);

	const lemburMerges = [
		...lemburMeta.merges,
		{ s: { r: groupRowIdx, c: 4 }, e: { r: groupRowIdx, c: 7 } },
		{ s: { r: groupRowIdx, c: 8 }, e: { r: groupRowIdx, c: 10 } },
	];

	lemburSummary.forEach((r, idx) => {
		const isAlt = idx % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const csCenter = makeCellStyle(isAlt, "center");
		lemburData.push([
			cell(idx + 1, csCenter),
			cell(r.employee_code || "-", csCenter),
			cell(r.employee_name || "-", cs),
			cell(r.jabatan || "-", cs),
			cell(Number(r.lembur_count) || 0, csCenter),
			cell(hoursNumLabel(r.total_lembur_hours), csCenter),
			cell(hoursNumLabel(r.izin_overtime_hours), csCenter),
			cell(hoursNumLabel(r.overtime_balance_hours), csCenter),
			cell(hoursNumLabel(r.total_ro_earned_hours), csCenter),
			cell(hoursNumLabel(r.izin_ro_hours), csCenter),
			cell(hoursNumLabel(r.replace_off_hours), csCenter),
			cell(hoursNumLabel(r.izin_unpaid_hours), csCenter),
		]);
	});
	if (lemburSummary.length === 0) {
		const cs = makeCellStyle(false, "center");
		lemburData.push([
			cell("Tidak ada data lembur/RO/izin funding pada periode ini", cs),
			empty(cs), empty(cs), empty(cs), empty(cs), empty(cs),
			empty(cs), empty(cs), empty(cs), empty(cs), empty(cs), empty(cs),
		]);
	}
	const wsLembur = sheetFromAoa(
		lemburData,
		lemburMerges,
		[
			{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 18 },
			{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
			{ wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
		],
		{ [groupRowIdx]: 22, [subRowIdx]: 28 },
	);

	// —— Sheet 3: Perizinan & Cuti ——
	const IZIN_COLS = 12;
	const izinMeta = buildMetaHeader(IZIN_COLS, { title: "Perizinan & Cuti (disetujui)", ...metaCommon });
	const izinData = [...izinMeta.rows];
	izinData.push(
		[
			"No",
			"NIK",
			"Nama Karyawan",
			"Tipe",
			"Tanggal",
			"Jam Mulai",
			"Jam Selesai",
			"Durasi",
			"RO (jam)",
			"Lembur (jam)",
			"Unpaid (jam)",
			"Keterangan",
		].map((h) => cell(h, headerStyle)),
	);
	leavesIzinCuti.forEach((r, idx) => {
		const isAlt = idx % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const csCenter = makeCellStyle(isAlt, "center");
		const isIzin = String(r.leave_type || "").toLowerCase() === "izin";
		izinData.push([
			cell(idx + 1, csCenter),
			cell(r.employee_code || "-", csCenter),
			cell(r.employee_name || "-", cs),
			cell(leaveTypeLabel(r.leave_type), csCenter),
			cell(leaveTanggalLabel(r.start_date, r.end_date), csCenter),
			cell(leaveTimeLabel(r.start_time), csCenter),
			cell(leaveTimeLabel(r.end_time), csCenter),
			cell(durationTypeLabel(r.duration_type), csCenter),
			cell(isIzin ? hoursNumLabel(r.funding_ro_hours) : hoursNumLabel(0), csCenter),
			cell(isIzin ? hoursNumLabel(r.funding_overtime_hours) : hoursNumLabel(0), csCenter),
			cell(isIzin ? hoursNumLabel(r.funding_unpaid_hours) : hoursNumLabel(0), csCenter),
			cell(r.reason || "-", cs),
		]);
	});
	if (leavesIzinCuti.length === 0) {
		const cs = makeCellStyle(false, "center");
		izinData.push([
			cell("Tidak ada data perizinan/cuti disetujui", cs),
			empty(cs), empty(cs), empty(cs), empty(cs), empty(cs),
			empty(cs), empty(cs), empty(cs), empty(cs), empty(cs), empty(cs),
		]);
	}
	const wsIzin = sheetFromAoa(izinData, izinMeta.merges, [
		{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 22 }, { wch: 12 },
		{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 36 },
	]);

	// —— Sheet 4: Sakit ——
	const SAKIT_COLS = 7;
	const sakitMeta = buildMetaHeader(SAKIT_COLS, { title: "Sakit SKD / Non-SKD (disetujui)", ...metaCommon });
	const sakitData = [...sakitMeta.rows];
	sakitData.push(
		["No", "NIK", "Nama Karyawan", "Tipe", "Mulai", "Selesai", "Keterangan"].map((h) => cell(h, headerStyle)),
	);
	leavesSakit.forEach((r, idx) => {
		const isAlt = idx % 2 === 1;
		const cs = makeCellStyle(isAlt);
		const csCenter = makeCellStyle(isAlt, "center");
		sakitData.push([
			cell(idx + 1, csCenter),
			cell(r.employee_code || "-", csCenter),
			cell(r.employee_name || "-", cs),
			cell(r.sakit_type || "Non-SKD", csCenter),
			cell(fmtDate(r.start_date), csCenter),
			cell(fmtDate(r.end_date), csCenter),
			cell(r.reason || "-", cs),
		]);
	});
	if (leavesSakit.length === 0) {
		const cs = makeCellStyle(false, "center");
		sakitData.push([cell("Tidak ada data sakit disetujui", cs), empty(cs), empty(cs), empty(cs), empty(cs), empty(cs), empty(cs)]);
	}
	const wsSakit = sheetFromAoa(sakitData, sakitMeta.merges, [
		{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 36 },
	]);

	const wb = XLSXStyle.utils.book_new();
	XLSXStyle.utils.book_append_sheet(wb, wsAbsen, "Absensi");
	XLSXStyle.utils.book_append_sheet(wb, wsLembur, "Total Lembur");
	XLSXStyle.utils.book_append_sheet(wb, wsIzin, "Perizinan & Cuti");
	XLSXStyle.utils.book_append_sheet(wb, wsSakit, "Sakit");

	const start = activePeriod?.startDate || "start";
	const end = activePeriod?.endDate || "end";
	const fileName = `Report_Absensi_Alora_${start}_${end}.xlsx`;
	const buffer = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
	saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName);
}
