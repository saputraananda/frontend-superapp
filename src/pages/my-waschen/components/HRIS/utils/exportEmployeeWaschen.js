// =============================================================================
// Export karyawan Waschen (company 5) ke file Excel (.xlsx) dengan ExcelJS.
//
// Workbook berisi 2 sheet:
//   1. "Data Lengkap"  — seluruh field mst_employee + JOIN master + posisi Waschen.
//   2. "Khusus Bank"   — kolom yang diminta bank.
//
// Berbeda dengan export IKM: file dokumen (KTP, NPWP, dll) TIDAK di-embed sebagai
// gambar, hanya hyperlink "Lihat" ke file-nya supaya tinggi baris tetap normal.
// =============================================================================

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { api } from "../../../../../lib/api";
import { formatName } from "../../../utils/FormatName";

const ALORA_ASSET_HOST = "https://api.waschenalora.com";

// ── Helper format ────────────────────────────────────────────────────────────
function fmtDate(v) {
	if (!v) return "";
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return String(v);
	return d.toISOString().slice(0, 10);
}

function fmtGender(v) {
	if (v === "L") return "Laki-laki";
	if (v === "P") return "Perempuan";
	return v || "";
}

function fmtMarital(v) {
	if (!v) return "";
	const s = String(v).toUpperCase();
	if (s === "SINGLE" || s === "BELUM" || s === "BELUM MENIKAH") return "Belum Menikah";
	if (s === "MARRIED" || s === "MENIKAH") return "Menikah";
	if (s === "DIVORCED" || s === "CERAI") return "Cerai";
	if (s === "WIDOWED" || s === "JANDA" || s === "DUDA") return "Janda/Duda";
	return v;
}

function fmtLeader(v) {
	if (v === null || v === undefined || v === "") return "";
	return Number(v) === 1 ? "Leader" : "Staff";
}

// Sama dengan assetOn() di karyawan-ikm/[id].jsx untuk dokumen Waschen.
function buildDocUrl(filePath) {
	if (!filePath) return null;
	const p = String(filePath);
	if (/^https?:\/\//i.test(p)) return p;
	let clean = p.replace(/^\/+/, "");
	if (!clean.startsWith("assets/")) clean = `assets/${clean}`;
	return `${ALORA_ASSET_HOST}/${clean}`;
}

// Isi cell dokumen: hyperlink "Lihat" jika ada file, "-" jika kosong.
function setDocCell(cell, filePath) {
	const url = buildDocUrl(filePath);
	if (!url) {
		cell.value = "-";
		return;
	}
	cell.value = { text: "Lihat", hyperlink: url };
	cell.font = { color: { argb: "FF2563EB" }, underline: true };
}

const DOC_COLUMNS = [
	{ header: "Pas Foto",              key: "profile",  pathKey: "profile_path"     },
	{ header: "File KTP",              key: "ktp",      pathKey: "ktp_path"         },
	{ header: "File KK",               key: "kk",       pathKey: "kk_path"          },
	{ header: "File NPWP",             key: "npwp",     pathKey: "npwp_path"        },
	{ header: "File BPJS Kesehatan",   key: "bpjs",     pathKey: "bpjs_path"        },
	{ header: "File BPJS TK",          key: "bpjs_tk",  pathKey: "bpjs_tk_path"     },
	{ header: "File Ijazah",           key: "ijazah",   pathKey: "ijazah_path"      },
	{ header: "File Sertifikat",       key: "sert",     pathKey: "sertifikat_path"  },
	{ header: "File Rekomendasi Kerja", key: "rekom",   pathKey: "rekomkerja_path"  },
];

function styleHeader(ws, fillArgb, borderArgb) {
	const header = ws.getRow(1);
	header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
	header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
	header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
	header.height = 30;
	header.eachCell((cell) => {
		cell.border = {
			top: { style: "thin", color: { argb: borderArgb } },
			bottom: { style: "thin", color: { argb: borderArgb } },
			left: { style: "thin", color: { argb: borderArgb } },
			right: { style: "thin", color: { argb: borderArgb } },
		};
	});
}

function styleDataRow(row, idx) {
	row.alignment = { vertical: "middle", wrapText: true };
	row.eachCell({ includeEmpty: true }, (cell) => {
		cell.border = {
			top: { style: "thin", color: { argb: "FFE2E8F0" } },
			bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
			left: { style: "thin", color: { argb: "FFE2E8F0" } },
			right: { style: "thin", color: { argb: "FFE2E8F0" } },
		};
		if (idx % 2 === 1) {
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
		}
	});
}

// ── Sheet 1: Data Lengkap ────────────────────────────────────────────────────
function buildSheetDataLengkap(workbook, employees) {
	const ws = workbook.addWorksheet("Data Lengkap", {
		views: [{ state: "frozen", xSplit: 3, ySplit: 1 }],
	});

	ws.columns = [
		{ header: "No",                          key: "no",                     width: 5  },
		{ header: "NIK Karyawan",                key: "employee_code",          width: 15 },
		{ header: "Nama Lengkap",                key: "full_name",              width: 30 },
		{ header: "Jenis Kelamin",               key: "gender",                 width: 14 },
		{ header: "Tempat Lahir",                key: "birth_place",            width: 18 },
		{ header: "Tanggal Lahir",               key: "birth_date",             width: 14 },
		{ header: "Golongan Darah",              key: "blood_type",             width: 16 },
		{ header: "Alamat",                      key: "address",                width: 40 },
		{ header: "No. KTP",                     key: "ktp_number",             width: 22 },
		{ header: "No. KK",                      key: "family_card_number",     width: 22 },
		{ header: "No. HP",                      key: "phone_number",           width: 16 },
		{ header: "Email Perusahaan",            key: "email",                  width: 28 },
		{ header: "Email Pribadi",               key: "private_email",          width: 28 },
		{ header: "Status Pernikahan",           key: "marital_status",         width: 16 },
		{ header: "Nama Ibu Kandung",            key: "mother_name",            width: 25 },
		{ header: "Agama",                       key: "religion_name",          width: 12 },
		{ header: "Cabang/Outlet",               key: "outlet_name",            width: 18 },
		{ header: "Posisi Waschen",              key: "waschen_role",           width: 18 },
		{ header: "Leader/Staff",                key: "is_leader",              width: 14 },
		{ header: "Departemen",                  key: "department_name",        width: 18 },
		{ header: "Jabatan",                     key: "position_name",          width: 22 },
		{ header: "Job Level",                   key: "job_level_name",         width: 18 },
		{ header: "Status Pekerjaan",            key: "employment_status_name", width: 18 },
		{ header: "Tanggal Masuk",               key: "join_date",              width: 14 },
		{ header: "Tanggal Akhir Kontrak",       key: "contract_end_date",      width: 16 },
		{ header: "Pendidikan",                  key: "education_level_name",   width: 14 },
		{ header: "Asal Sekolah/Universitas",    key: "school_name",            width: 28 },
		{ header: "Jurusan",                     key: "major_name",             width: 28 },
		{ header: "Bank",                        key: "bank_name",              width: 14 },
		{ header: "No. Rekening",                key: "bank_account_number",    width: 22 },
		{ header: "No. NPWP",                    key: "npwp_number",            width: 22 },
		{ header: "No. BPJS Kesehatan",          key: "bpjs_health_number",     width: 22 },
		{ header: "No. BPJS Ketenagakerjaan",    key: "bpjs_employment_number", width: 22 },
		{ header: "Kontak Darurat",              key: "emergency_contact",      width: 25 },
		{ header: "Catatan",                     key: "notes",                  width: 30 },
		{ header: "Username",                    key: "username",               width: 18 },
		...DOC_COLUMNS.map((d) => ({ header: d.header, key: d.key, width: 16 })),
	];

	styleHeader(ws, "FF5F1340", "FF4A0D31");

	employees.forEach((emp, idx) => {
		const row = ws.addRow({
			no: idx + 1,
			employee_code: emp.employee_code || "",
			full_name: formatName(emp.full_name),
			gender: fmtGender(emp.gender),
			birth_place: emp.birth_place || "",
			birth_date: fmtDate(emp.birth_date),
			blood_type: emp.blood_type || "",
			address: emp.address || "",
			ktp_number: emp.ktp_number || "",
			family_card_number: emp.family_card_number || "",
			phone_number: emp.phone_number || "",
			email: emp.email || "",
			private_email: emp.private_email || "",
			marital_status: fmtMarital(emp.marital_status),
			mother_name: emp.mother_name || "",
			religion_name: emp.religion_name || "",
			outlet_name: emp.outlet_name || "",
			waschen_role: emp.waschen_role || "",
			is_leader: fmtLeader(emp.is_leader),
			department_name: emp.department_name || "",
			position_name: emp.position_name || "",
			job_level_name: emp.job_level_name || "",
			employment_status_name: emp.employment_status_name || "",
			join_date: fmtDate(emp.join_date),
			contract_end_date: fmtDate(emp.contract_end_date),
			education_level_name: emp.education_level_name || "",
			school_name: emp.school_name || "",
			major_name: emp.major_name || "",
			bank_name: emp.bank_name || "",
			bank_account_number: emp.bank_account_number || "",
			npwp_number: emp.npwp_number || "",
			bpjs_health_number: emp.bpjs_health_number || "",
			bpjs_employment_number: emp.bpjs_employment_number || "",
			emergency_contact: emp.emergency_contact || "",
			notes: emp.notes || "",
			username: emp.username || "",
		});
		styleDataRow(row, idx);

		// Dokumen: hyperlink saja (setelah styleDataRow supaya font link tidak tertimpa)
		DOC_COLUMNS.forEach((d) => {
			const cell = row.getCell(d.key);
			setDocCell(cell, emp[d.pathKey]);
			cell.alignment = { vertical: "middle", horizontal: "center" };
		});
	});

	ws.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: ws.columns.length },
	};

	return ws;
}

// ── Sheet 2: Khusus Bank (KTP & NPWP berupa link) ────────────────────────────
function buildSheetKhususBank(workbook, employees) {
	const ws = workbook.addWorksheet("Khusus Bank", {
		views: [{ state: "frozen", xSplit: 2, ySplit: 1 }],
	});

	ws.columns = [
		{ header: "No",               key: "no",                   width: 5  },
		{ header: "Nama Lengkap",     key: "full_name",            width: 30 },
		{ header: "Nama Ibu Kandung", key: "mother_name",          width: 25 },
		{ header: "No. HP",           key: "phone_number",         width: 16 },
		{ header: "Pendidikan",       key: "education_level_name", width: 16 },
		{ header: "Email",            key: "email",                width: 28 },
		{ header: "No. KTP",          key: "ktp_number",           width: 22 },
		{ header: "File KTP",         key: "ktp_file",             width: 14 },
		{ header: "No. NPWP",         key: "npwp_number",          width: 22 },
		{ header: "File NPWP",        key: "npwp_file",            width: 14 },
	];

	styleHeader(ws, "FF059669", "FF065F46");

	employees.forEach((emp, idx) => {
		const row = ws.addRow({
			no: idx + 1,
			full_name: formatName(emp.full_name),
			mother_name: emp.mother_name || "",
			phone_number: emp.phone_number || "",
			education_level_name: emp.education_level_name || "",
			email: emp.email || "",
			ktp_number: emp.ktp_number || "",
			npwp_number: emp.npwp_number || "",
		});
		styleDataRow(row, idx);

		[["ktp_file", emp.ktp_path], ["npwp_file", emp.npwp_path]].forEach(([key, path]) => {
			const cell = row.getCell(key);
			setDocCell(cell, path);
			cell.alignment = { vertical: "middle", horizontal: "center" };
		});
	});

	ws.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: ws.columns.length },
	};

	return ws;
}

// ── Public API ───────────────────────────────────────────────────────────────
/**
 * Generate & download Excel berisi seluruh karyawan aktif Waschen.
 * @param {Object} options
 * @param {(p: { step: string, message: string }) => void} [options.onProgress]
 * @returns {Promise<{ total: number, fileName: string }>}
 */
export async function exportEmployeeWaschenToExcel({ onProgress } = {}) {
	onProgress?.({ step: "fetch", message: "Mengambil data karyawan..." });

	const resp = await api("/waschen/employees/export");
	const employees = Array.isArray(resp?.data) ? resp.data : [];

	if (employees.length === 0) {
		throw new Error("Tidak ada data karyawan untuk di-export.");
	}

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "AloraApp - Waschen";
	workbook.created = new Date();
	workbook.lastModifiedBy = "AloraApp";

	onProgress?.({ step: "build", message: "Menyusun sheet..." });
	buildSheetDataLengkap(workbook, employees);
	buildSheetKhususBank(workbook, employees);

	onProgress?.({ step: "generate", message: "Menghasilkan file Excel..." });
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});

	const today = new Date().toISOString().slice(0, 10);
	const fileName = `Karyawan_Waschen_${today}.xlsx`;
	saveAs(blob, fileName);

	onProgress?.({ step: "done", message: "File Excel berhasil diunduh." });

	return { total: employees.length, fileName };
}

export default exportEmployeeWaschenToExcel;
