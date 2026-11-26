import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineXMark } from "react-icons/hi2";
import { AuthenticatedImage } from "./AuthenticatedImage";

function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

export function PhotoThumb({ path, label, onOpen, className = "h-10 w-10" }) {
	if (!path) {
		return <span className="text-xs text-slate-300">-</span>;
	}

	return (
		<button
			type="button"
			onClick={onOpen}
			title={`Lihat ${label}`}
			className="group relative overflow-visible rounded-lg"
		>
			<AuthenticatedImage
				path={path}
				alt={label}
				className={cn(
					"rounded-lg border border-slate-200 bg-slate-100 transition group-hover:scale-[1.04] group-hover:border-blue-300",
					className,
				)}
				iconSize="h-4 w-4"
			/>
		</button>
	);
}

export function PaymentProofViewerModal({ item, onClose }) {
	const [scale, setScale] = useState(1);
	const wheelRef = useRef(null);

	useEffect(() => {
		setScale(1);
	}, [item?.url]);

	useEffect(() => {
		if (!item) return undefined;
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [item, onClose]);

	useEffect(() => {
		if (!item) return undefined;
		const el = wheelRef.current;
		if (!el) return undefined;
		const onWheel = (e) => {
			e.preventDefault();
			e.stopPropagation();
			const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
			setScale((prev) => clamp(Number((prev * factor).toFixed(3)), 0.5, 4));
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [item]);

	if (!item || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="relative inline-flex max-h-[90vh] max-w-[94vw] flex-col items-center"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition hover:bg-white hover:text-slate-800"
					aria-label="Tutup preview foto"
				>
					<HiOutlineXMark className="h-5 w-5" />
				</button>
				<p className="mb-2 max-w-full truncate rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
					{item.label || "Bukti pembayaran"} · scroll untuk zoom ({Math.round(scale * 100)}%)
				</p>
				<div
					ref={wheelRef}
					className="flex max-h-[84vh] max-w-[94vw] items-center justify-center overflow-auto"
				>
					<div
						style={{
							transform: `scale(${scale})`,
							transformOrigin: "center center",
							transition: "transform 60ms linear",
						}}
					>
						<AuthenticatedImage
							path={item.url}
							alt={item.label}
							className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl bg-slate-900"
							iconSize="h-10 w-10"
							objectFit="contain"
						/>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
