// =============================================================================
// Export semua karyawan IKM ke file Excel (.xlsx) dengan ExcelJS.
//
// Workbook berisi 2 sheet:
//   1. "Data Lengkap"  — seluruh field mst_employee + JOIN master.
//   2. "Khusus Bank"   — kolom yang diminta bank + embed gambar KTP & NPWP.
//
// Untuk dokumen non-gambar (PDF/dll) hanya nama file yang ditulis karena
// Excel tidak dapat meng-embed PDF di dalam cell.
// =============================================================================

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { api, BASE_URL } from "../../../lib/api";

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

function fmtLeaderRole(v) {
	if (!v) return "Karyawan";
	const s = String(v).toLowerCase();
	if (s === "leader") return "Leader";
	if (s === "deputi") return "Deputi";
	if (s === "management") return "Management";
	return v;
}

function isImageFile(filename) {
	if (!filename) return false;
	const ext = String(filename).toLowerCase().split(".").pop();
	return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

/**
 * Build URL ke proxy backend (`/ikm/employees/document-proxy`) supaya fetch
 * gambar tidak kena CORS dari domain storage IKM.
 */
function buildProxyDocUrl(fileName, kind = "documents") {
	if (!fileName) return null;
	const base = (BASE_URL || "").replace(/\/$/, "");
	const safe = encodeURIComponent(String(fileName).replace(/^\/+/, ""));
	return `${base}/ikm/employees/document-proxy?kind=${kind}&name=${safe}`;
}

// Fetch image as ArrayBuffer + tentukan extension untuk ExcelJS.
// Return null jika gagal (CORS/404/format tidak didukung).
async function fetchImageBuffer(url) {
	if (!url) return null;
	try {
		// credentials: "include" → kirim cookie session ke endpoint backend kita
		const res = await fetch(url, { credentials: "include", mode: "cors" });
		if (!res.ok) return null;
		const blob = await res.blob();
		const mime = (blob.type || "").toLowerCase();
		let extension = "jpeg";
		if (mime.includes("png")) extension = "png";
		else if (mime.includes("gif")) extension = "gif";
		else if (mime.includes("jpeg") || mime.includes("jpg")) extension = "jpeg";
		else {
			// fallback: tebak dari URL extension
			const urlExt = url.split("?")[0].split(".").pop().toLowerCase();
			if (["png", "gif"].includes(urlExt)) extension = urlExt;
			else if (["jpg", "jpeg"].includes(urlExt)) extension = "jpeg";
			else return null;
		}
		const buffer = await blob.arrayBuffer();
		return { buffer, extension };
	} catch (err) {
		console.warn("[exportKaryawanIKM] gagal fetch gambar:", url, err);
		return null;
	}
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
		{ header: "Alamat",                      key: "address",                width: 40 },
		{ header: "No. KTP",                     key: "ktp_number",             width: 22 },
		{ header: "No. KK",                      key: "family_card_number",     width: 22 },
		{ header: "No. HP",                      key: "phone_number",           width: 16 },
		{ header: "Email",                       key: "email",                  width: 28 },
		{ header: "Status Pernikahan",           key: "marital_status",         width: 16 },
		{ header: "Nama Ibu Kandung",            key: "mother_name",            width: 25 },
		{ header: "Agama",                       key: "religion_name",          width: 12 },
		{ header: "Perusahaan",                  key: "company_name",           width: 18 },
		{ header: "Departemen",                  key: "department_name",        width: 18 },
		{ header: "Jabatan",                     key: "position_name",          width: 22 },
		{ header: "Job Level",                   key: "job_level_name",         width: 18 },
		{ header: "Status Pekerjaan",            key: "employment_status_name", width: 18 },
		{ header: "Tanggal Masuk",               key: "join_date",              width: 14 },
		{ header: "Tanggal Akhir Kontrak",       key: "contract_end_date",      width: 16 },
		{ header: "Tanggal Resign",              key: "exit_date",              width: 14 },
		{ header: "Alasan Resign",               key: "exit_reason",            width: 30 },
		{ header: "Pendidikan",                  key: "education_level_name",   width: 14 },
		{ header: "Asal Sekolah/Universitas",    key: "school_name",            width: 28 },
		{ header: "Bank",                        key: "bank_name",              width: 14 },
		{ header: "No. Rekening",                key: "bank_account_number",    width: 22 },
		{ header: "No. NPWP",                    key: "npwp_number",            width: 22 },
		{ header: "No. BPJS Kesehatan",          key: "bpjs_health_number",     width: 22 },
		{ header: "No. BPJS Ketenagakerjaan",    key: "bpjs_employment_number", width: 22 },
		{ header: "Kontak Darurat",              key: "emergency_contact",      width: 25 },
		{ header: "Catatan",                     key: "notes",                  width: 30 },
		{ header: "Username",                    key: "username",               width: 18 },
		{ header: "Role IKM",                    key: "leader_role",            width: 14 },
		{ header: "Tanggal Dibuat",              key: "created_at",             width: 18 },
	];

	const header = ws.getRow(1);
	header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
	header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
	header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
	header.height = 30;
	header.eachCell((cell) => {
		cell.border = {
			top: { style: "thin", color: { argb: "FF1E3A8A" } },
			bottom: { style: "thin", color: { argb: "FF1E3A8A" } },
			left: { style: "thin", color: { argb: "FF1E3A8A" } },
			right: { style: "thin", color: { argb: "FF1E3A8A" } },
		};
	});

	employees.forEach((emp, idx) => {
		const row = ws.addRow({
			no: idx + 1,
			employee_code: emp.employee_code || "",
			full_name: emp.full_name || "",
			gender: fmtGender(emp.gender),
			birth_place: emp.birth_place || "",
			birth_date: fmtDate(emp.birth_date),
			address: emp.address || "",
			ktp_number: emp.ktp_number || "",
			family_card_number: emp.family_card_number || "",
			phone_number: emp.phone_number || "",
			email: emp.email || "",
			marital_status: fmtMarital(emp.marital_status),
			mother_name: emp.mother_name || "",
			religion_name: emp.religion_name || "",
			company_name: emp.company_name || "",
			department_name: emp.department_name || "",
			position_name: emp.position_name || "",
			job_level_name: emp.job_level_name || "",
			employment_status_name: emp.employment_status_name || "",
			join_date: fmtDate(emp.join_date),
			contract_end_date: fmtDate(emp.contract_end_date),
			exit_date: fmtDate(emp.exit_date),
			exit_reason: emp.exit_reason || "",
			education_level_name: emp.education_level_name || "",
			school_name: emp.school_name || "",
			bank_name: emp.bank_name || "",
			bank_account_number: emp.bank_account_number || "",
			npwp_number: emp.npwp_number || "",
			bpjs_health_number: emp.bpjs_health_number || "",
			bpjs_employment_number: emp.bpjs_employment_number || "",
			emergency_contact: emp.emergency_contact || "",
			notes: emp.notes || "",
			username: emp.username || "",
			leader_role: fmtLeaderRole(emp.leader_role),
			created_at: fmtDate(emp.created_at),
		});
		row.alignment = { vertical: "middle", wrapText: true };

		// Border tipis untuk seluruh sel di row data
		row.eachCell({ includeEmpty: true }, (cell) => {
			cell.border = {
				top: { style: "thin", color: { argb: "FFE2E8F0" } },
				bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
				left: { style: "thin", color: { argb: "FFE2E8F0" } },
				right: { style: "thin", color: { argb: "FFE2E8F0" } },
			};
		});

		// Zebra stripe ringan
		if (idx % 2 === 1) {
			row.eachCell({ includeEmpty: true }, (cell) => {
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFF8FAFC" },
				};
			});
		}
	});

	ws.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: ws.columns.length },
	};

	return ws;
}

// ── Sheet 2: Khusus Bank (dengan embed gambar KTP & NPWP) ────────────────────
async function buildSheetKhususBank(workbook, employees, opts = {}) {
	const { onProgress } = opts;

	const ws = workbook.addWorksheet("Khusus Bank", {
		views: [{ state: "frozen", xSplit: 2, ySplit: 1 }],
	});

	// Lebar kolom untuk file KTP & NPWP dibuat lebih lebar agar gambar muat.
	ws.columns = [
		{ header: "No",                  key: "no",                   width: 5  },
		{ header: "Nama Lengkap",        key: "full_name",            width: 30 },
		{ header: "Nama Ibu Kandung",    key: "mother_name",          width: 25 },
		{ header: "No. HP",              key: "phone_number",         width: 16 },
		{ header: "Pendidikan",          key: "education_level_name", width: 16 },
		{ header: "Email",               key: "email",                width: 28 },
		{ header: "No. KTP",             key: "ktp_number",           width: 22 },
		{ header: "File KTP",            key: "ktp_file",             width: 38 },
		{ header: "No. NPWP",            key: "npwp_number",          width: 22 },
		{ header: "File NPWP",           key: "npwp_file",            width: 38 },
	];

	const header = ws.getRow(1);
	header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
	header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
	header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
	header.height = 30;
	header.eachCell((cell) => {
		cell.border = {
			top: { style: "thin", color: { argb: "FF065F46" } },
			bottom: { style: "thin", color: { argb: "FF065F46" } },
			left: { style: "thin", color: { argb: "FF065F46" } },
			right: { style: "thin", color: { argb: "FF065F46" } },
		};
	});

	const IMAGE_WIDTH_PX = 240;
	const IMAGE_HEIGHT_PX = 140;
	const ROW_HEIGHT_PT = 110; // tinggi baris (pt) untuk ruang gambar
	// Index kolom 0-based untuk anchor gambar
	const colKtpFile = 7;   // kolom ke-8
	const colNpwpFile = 9;  // kolom ke-10

	for (let i = 0; i < employees.length; i++) {
		const emp = employees[i];
		onProgress?.({
			step: "process",
			current: i + 1,
			total: employees.length,
			message: `Memproses ${emp.full_name || "karyawan"}...`,
		});

		const ktpUrl = buildProxyDocUrl(emp.ktp_name, "documents");
		const npwpUrl = buildProxyDocUrl(emp.npwp_name, "documents");
		const ktpIsImg = isImageFile(emp.ktp_name);
		const npwpIsImg = isImageFile(emp.npwp_name);

		const ktpDefaultText = !emp.ktp_name
			? "-"
			: ktpIsImg
				? "" // akan di-embed jika fetch berhasil
				: `${emp.ktp_name} (PDF/Non-gambar)`;
		const npwpDefaultText = !emp.npwp_name
			? "-"
			: npwpIsImg
				? ""
				: `${emp.npwp_name} (PDF/Non-gambar)`;

		const row = ws.addRow({
			no: i + 1,
			full_name: emp.full_name || "",
			mother_name: emp.mother_name || "",
			phone_number: emp.phone_number || "",
			education_level_name: emp.education_level_name || "",
			email: emp.email || "",
			ktp_number: emp.ktp_number || "",
			ktp_file: ktpDefaultText,
			npwp_number: emp.npwp_number || "",
			npwp_file: npwpDefaultText,
		});
		row.height = ROW_HEIGHT_PT;
		row.alignment = { vertical: "middle", wrapText: true };

		row.eachCell({ includeEmpty: true }, (cell) => {
			cell.border = {
				top: { style: "thin", color: { argb: "FFE2E8F0" } },
				bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
				left: { style: "thin", color: { argb: "FFE2E8F0" } },
				right: { style: "thin", color: { argb: "FFE2E8F0" } },
			};
		});
		if (i % 2 === 1) {
			row.eachCell({ includeEmpty: true }, (cell) => {
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFF8FAFC" },
				};
			});
		}

		// Embed gambar KTP
		if (ktpIsImg && ktpUrl) {
			const img = await fetchImageBuffer(ktpUrl);
			if (img) {
				const imgId = workbook.addImage(img);
				ws.addImage(imgId, {
					tl: { col: colKtpFile + 0.1, row: row.number - 1 + 0.1 },
					ext: { width: IMAGE_WIDTH_PX, height: IMAGE_HEIGHT_PX },
					editAs: "oneCell",
				});
			} else {
				row.getCell("ktp_file").value = `${emp.ktp_name} (gagal dimuat)`;
			}
		}

		// Embed gambar NPWP
		if (npwpIsImg && npwpUrl) {
			const img = await fetchImageBuffer(npwpUrl);
			if (img) {
				const imgId = workbook.addImage(img);
				ws.addImage(imgId, {
					tl: { col: colNpwpFile + 0.1, row: row.number - 1 + 0.1 },
					ext: { width: IMAGE_WIDTH_PX, height: IMAGE_HEIGHT_PX },
					editAs: "oneCell",
				});
			} else {
				row.getCell("npwp_file").value = `${emp.npwp_name} (gagal dimuat)`;
			}
		}
	}

	ws.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: ws.columns.length },
	};

	return ws;
}

// ── Public API ───────────────────────────────────────────────────────────────
/**
 * Generate & download Excel berisi seluruh data karyawan IKM.
 * @param {Object} options
 * @param {(p: { step: string, current?: number, total?: number, message: string }) => void} [options.onProgress]
 * @returns {Promise<{ total: number, fileName: string }>}
 */
export async function exportKaryawanIKMToExcel({ onProgress } = {}) {
	onProgress?.({ step: "fetch", message: "Mengambil data karyawan..." });

	const resp = await api("/ikm/employees/export");
	const employees = Array.isArray(resp?.data) ? resp.data : [];

	if (employees.length === 0) {
		throw new Error("Tidak ada data karyawan untuk di-export.");
	}

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "AloraApp - IKM";
	workbook.created = new Date();
	workbook.lastModifiedBy = "AloraApp";

	onProgress?.({ step: "build_sheet1", message: "Menyusun sheet Data Lengkap..." });
	buildSheetDataLengkap(workbook, employees);

	onProgress?.({ step: "build_sheet2", message: "Menyusun sheet Khusus Bank & memuat gambar..." });
	await buildSheetKhususBank(workbook, employees, {
		onProgress,
	});

	onProgress?.({ step: "generate", message: "Menghasilkan file Excel..." });
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});

	const today = new Date().toISOString().slice(0, 10);
	const fileName = `Karyawan_IKM_${today}.xlsx`;
	saveAs(blob, fileName);

	onProgress?.({ step: "done", message: "File Excel berhasil diunduh." });

	return { total: employees.length, fileName };
}

export default exportKaryawanIKMToExcel;
