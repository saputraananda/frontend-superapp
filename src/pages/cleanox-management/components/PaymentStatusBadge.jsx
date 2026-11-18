const STATUS_STYLES = {
	lunas: { label: "Lunas", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
	dp: { label: "Lunas", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
	belum_lunas: { label: "Belum lunas", className: "border-amber-200 bg-amber-50 text-amber-700" },
};

/** Badge status pembayaran. Nota DP tampil "Lunas"; penandanya hanya kolom Remark ("DP"). */
export default function PaymentStatusBadge({ status }) {
	const style = STATUS_STYLES[status] || STATUS_STYLES.belum_lunas;
	return (
		<span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>
			{style.label}
		</span>
	);
}
