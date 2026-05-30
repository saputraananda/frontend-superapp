import XLSXStyle from "xlsx-js-style";

function formatDateOnly(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
}

function formatDateTime(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function calcDuration(checkIn, checkOut) {
	if (!checkIn || !checkOut) return null;
	const diff = new Date(checkOut) - new Date(checkIn);
	if (diff <= 0) return null;
	const h = Math.floor(diff / 3_600_000);
	const m = Math.floor((diff % 3_600_000) / 60_000);
	return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export function exportManagementAbsensiExcel({ records, periodLabel }) {
	const rows = records.map((r, i) => ({
		"No": i + 1,
		"Tanggal": formatDateOnly(r.work_date),
		"NIK": r.employee_code || "",
		"Nama Karyawan": r.employee_name || "",
		"Jabatan": r.jabatan || "",
		"Jam Absen In": formatDateTime(r.check_in_time),
		"Jam Absen Out": formatDateTime(r.check_out_time),
		"Durasi": calcDuration(r.check_in_time, r.check_out_time) || "-",
		"Lokasi In": r.check_in_lat ? `${r.check_in_lat}, ${r.check_in_lng}` : "-",
		"Lokasi Out": r.check_out_lat ? `${r.check_out_lat}, ${r.check_out_lng}` : "-",
		"Status": r.status_label || "-",
	}));

	const ws = XLSXStyle.utils.json_to_sheet(rows);
	const colWidths = [
		{ wch: 5 }, { wch: 14 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
		{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 15 },
	];
	ws["!cols"] = colWidths;

	const wb = XLSXStyle.utils.book_new();
	XLSXStyle.utils.book_append_sheet(wb, ws, "Absensi Manajemen");

	// Header style
	const headerRange = XLSXStyle.utils.decode_range(ws["!ref"] || "A1:K1");
	for (let R = headerRange.s.r; R <= headerRange.e.r; ++R) {
		for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
			const cell = ws[XLSXStyle.utils.encode_cell({ r: R, c: C })];
			if (cell) {
				cell.s = {
					font: { bold: true, color: { rgb: "FFFFFF" } },
					fill: { fgColor: { rgb: "1E3A8A" } },
					alignment: { horizontal: "center" },
				};
			}
		}
	}

	const buf = XLSXStyle.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
	const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const timestamp = new Date().toISOString().slice(0, 10);
	a.download = `Absensi_Manajemen_${timestamp}.xlsx`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}