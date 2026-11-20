/**
 * Periode cut off perusahaan: periode bulan M = tanggal 26 bulan M-1 sampai tanggal 25 bulan M.
 * Logikanya sama dengan backend-superapp/controllers/MyWaschen/cutoffHelpers.js.
 */

const pad = (value) => String(value).padStart(2, "0");
const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Periode yang sedang berjalan; mulai tanggal 26 sudah masuk periode bulan berikutnya. */
export function currentCutoffPeriod(now = new Date()) {
	if (now.getDate() >= 26) {
		const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		return { year: next.getFullYear(), month: next.getMonth() + 1 };
	}
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Rentang tanggal (YYYY-MM-DD) untuk periode `month` (1-12) pada `year`. */
export function cutoffRange(year, month) {
	return {
		dateFrom: toIsoDate(new Date(year, month - 2, 26)),
		dateTo: toIsoDate(new Date(year, month - 1, 25)),
	};
}
