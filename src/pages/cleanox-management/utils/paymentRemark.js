export const DP_REMARK = "DP";

/** Remark pembayaran untuk tabel dan Excel: "DP" bila nota baru dibayar sebagian, selain itu kosong. */
export function getPaymentRemark(row) {
	return row?.payment_status === "dp" ? DP_REMARK : "";
}

/** Isi sel kronologi di Excel: alasan HURUF KAPITAL di baris pertama (pembeda, library Excel tak mendukung tebal sebagian), kronologi di baris kedua; yang kosong dilewati. */
export function getCompensationNarrative(row) {
	return [row?.compensation_reason?.toUpperCase(), row?.compensation_chronology].filter(Boolean).join("\n");
}
