import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	HiOutlineMagnifyingGlass, HiOutlineXMark, HiOutlineArrowPath, HiOutlineChatBubbleLeftEllipsis,
	HiOutlineClock, HiOutlinePhoto, HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
	HiOutlineArrowDownTray, HiOutlineChevronLeft, HiOutlineChevronRight,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { showError, showSuccess, showConfirm } from "../../../../utils/alert";

const STATUS = {
	DIAJUKAN: { label: "Diajukan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
	DISETUJUI_RS: { label: "Disetujui Tim Linen RS", cls: "bg-sky-50 text-sky-700 border-sky-200" },
	DIPROSES: { label: "Diproses", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
	SELESAI: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
	DITOLAK: { label: "Ditolak", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};
const ACTION = {
	CREATED: "Komplain diajukan", UPDATED: "Komplain diubah", APPROVED: "Disetujui Tim Linen RS",
	REJECTED: "Ditolak Tim Linen RS", STATUS: "Status diubah", NOTE: "Catatan", DELETED: "Komplain dihapus",
};
const OWNERSHIP = { MILIK_RS: "Milik RS", SEWA: "Sewa" };
// Harus sama dengan ADMIN_TRANSITIONS di complaintIkmController.js
// Dari "Diajukan" admin bertindak mewakili Tim Linen RS.
const NEXT = {
	DIAJUKAN: [["DISETUJUI_RS", "Setujui (mewakili Tim Linen RS)"], ["DITOLAK", "Tolak (mewakili Tim Linen RS)"]],
	DISETUJUI_RS: [["DIPROSES", "Diproses"], ["SELESAI", "Selesai"], ["DITOLAK", "Ditolak"]],
	DIPROSES: [["SELESAI", "Selesai"], ["DITOLAK", "Ditolak"]],
};

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 placeholder:text-slate-400";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1";

const fmtDate = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");

function Badge({ status }) {
	const s = STATUS[status] || STATUS.DIAJUKAN;
	return <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.label}</span>;
}

// Modal standar: portal ke body, z-[9999], scroll halaman terkunci, hanya ditutup lewat tombol X
function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
	useEffect(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => { document.body.style.overflow = prev; };
	}, []);
	return createPortal(
		<div className="fixed inset-0 z-[9999] flex items-end justify-center overscroll-contain bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
			<div className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white text-slate-800 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl ${wide ? "max-w-3xl" : "max-w-md"}`}>
				<div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
					<div className="min-w-0">
						{subtitle && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{subtitle}</p>}
						<h3 className="truncate text-base font-bold text-slate-800">{title}</h3>
					</div>
					<button type="button" aria-label="Tutup" onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
				{footer && <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>}
			</div>
		</div>,
		document.body
	);
}

// Pembesar foto bukti: klik thumbnail -> modal besar, bisa unduh & navigasi antar foto.
// Foto disajikan oleh server linen-monitoring-system (origin lain), jadi unduh lewat blob
// dengan fallback ke buka tab baru bila fetch diblokir.
function PhotoLightbox({ photos, index, onIndex, onClose }) {
	const photo = photos[index];
	const [downloading, setDownloading] = useState(false);

	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
			if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [index, photos.length, onIndex, onClose]);

	const fileName = (() => {
		if (photo.name) return photo.name;
		try { return decodeURIComponent(new URL(photo.url).pathname.split("/").pop()) || "foto-komplain"; }
		catch { return "foto-komplain"; }
	})();

	const download = async () => {
		setDownloading(true);
		try {
			const res = await fetch(photo.url, { mode: "cors" });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const blob = await res.blob();
			const href = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = href;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(href), 10000);
		} catch {
			window.open(photo.url, "_blank", "noopener");
		} finally {
			setDownloading(false);
		}
	};

	return createPortal(
		<div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
			<div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold">{fileName}</p>
					<p className="text-[11px] text-white/60">Foto {index + 1} dari {photos.length}</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<button type="button" onClick={download} disabled={downloading}
						className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60">
						<HiOutlineArrowDownTray className="h-4 w-4" /> {downloading ? "Mengunduh..." : "Unduh"}
					</button>
					<button type="button" aria-label="Tutup" onClick={onClose} className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20">
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>
			</div>
			<div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4" onClick={onClose}>
				<img src={photo.url} alt={fileName} onClick={(e) => e.stopPropagation()}
					className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
			</div>
			{photos.length > 1 && (
				<>
					<button type="button" aria-label="Sebelumnya" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + photos.length) % photos.length); }}
						className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25">
						<HiOutlineChevronLeft className="h-5 w-5" />
					</button>
					<button type="button" aria-label="Selanjutnya" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % photos.length); }}
						className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25">
						<HiOutlineChevronRight className="h-5 w-5" />
					</button>
				</>
			)}
		</div>,
		document.body
	);
}

export default function KomplainRsPage() {
	const [tab, setTab] = useState("list");
	return (
		<div className="min-h-full bg-rose-50/40 py-6">
			<div className="mx-auto max-w-screen-2xl space-y-5 px-4 sm:px-6 lg:px-8">
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<h2 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Komplain Rumah Sakit</h2>
					<p className="mt-1 text-xs font-medium text-slate-400">
						Pantau komplain dari Tim Unit dan Tim Linen RS. Status baru bisa diubah setelah disetujui Tim Linen RS; catatan bisa ditambahkan kapan saja dan langsung terlihat oleh Unit dan RS.
					</p>
					<div className="mt-4 flex gap-1 border-b border-slate-200">
						{[["list", "Daftar Komplain"], ["categories", "Kategori Komplain"]].map(([k, l]) => (
							<button key={k} type="button" onClick={() => setTab(k)}
								className={`-mb-px border-b-2 px-4 py-2 text-xs font-semibold transition ${tab === k ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
								{l}
							</button>
						))}
					</div>
				</div>
				{tab === "list" ? <ComplaintList /> : <CategoryList />}
			</div>
		</div>
	);
}

function ComplaintList() {
	const [items, setItems] = useState([]);
	const [summary, setSummary] = useState({});
	const [hospitals, setHospitals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("");
	const [hospitalId, setHospitalId] = useState("");
	const [detail, setDetail] = useState(null);

	const load = useCallback(async (silent = false) => {
		if (!silent) setLoading(true);
		try {
			const qs = new URLSearchParams();
			if (search.trim()) qs.set("q", search.trim());
			if (status) qs.set("status", status);
			if (hospitalId) qs.set("hospital_id", hospitalId);
			const res = await api(`/ikm/complaints?${qs}`);
			setItems(res.data || []);
			setSummary(res.summary || {});
		} catch (e) {
			showError(e.message);
		} finally {
			setLoading(false);
		}
	}, [search, status, hospitalId]);

	useEffect(() => { const t = setTimeout(() => load(), 250); return () => clearTimeout(t); }, [load]);
	useEffect(() => { api("/ikm/master-rs/hospitals").then((r) => setHospitals(r.data || [])).catch(() => {}); }, []);

	const open = async (id) => {
		try {
			const res = await api(`/ikm/complaints/${id}`);
			setDetail(res.data);
		} catch (e) { showError(e.message); }
	};

	return (
		<>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{Object.entries(STATUS).map(([k, v]) => (
					<button key={k} type="button" onClick={() => setStatus(status === k ? "" : k)}
						className={`rounded-xl border bg-white p-3 text-left shadow-sm transition hover:shadow ${status === k ? "border-red-400 ring-2 ring-red-100" : "border-slate-200"}`}>
						<p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{v.label}</p>
						<p className="mt-1 text-2xl font-extrabold text-slate-800">{summary[k] ?? 0}</p>
					</button>
				))}
			</div>

			<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div className="relative flex-1">
						<HiOutlineMagnifyingGlass className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-slate-400" />
						<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor, jenis, pelapor, deskripsi, atau rumah sakit..."
							className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100" />
					</div>
					<select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-red-400">
						<option value="">Semua Rumah Sakit</option>
						{hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
					</select>
					<select value={status} onChange={(e) => setStatus(e.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-red-400">
						<option value="">Semua Status</option>
						{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
					</select>
					<button type="button" title="Muat ulang" onClick={() => load()} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-500 transition hover:bg-slate-200">
						<HiOutlineArrowPath className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
					</button>
				</div>
			</div>

			{loading ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm"><HiOutlineArrowPath className="mx-auto h-6 w-6 animate-spin text-red-500" /></div>
			) : items.length === 0 ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
					<HiOutlineChatBubbleLeftEllipsis className="mx-auto mb-2 h-8 w-8 text-slate-300" />
					<p className="text-sm font-bold text-slate-700">Tidak ada komplain</p>
					<p className="mt-1 text-xs text-slate-400">Ubah filter atau tunggu pengajuan baru dari rumah sakit.</p>
				</div>
			) : (
				<div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					{items.map((c) => (
						<div key={c.id} onClick={() => open(c.id)} className="flex cursor-pointer flex-col gap-2 px-5 py-4 transition hover:bg-rose-50/40 lg:flex-row lg:items-center lg:gap-6">
							<div className="min-w-0 lg:w-1/3">
								<div className="flex flex-wrap items-center gap-2">
									<p className="truncate text-sm font-bold text-slate-800">{c.complaint_number}</p>
									<Badge status={c.status} />
								</div>
								<p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{c.hospital_name} · {c.room_name || "-"}</p>
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-bold text-slate-700">{c.complaint_type}</p>
								<p className="line-clamp-2 text-xs text-slate-500">{c.description}</p>
								{c.linen_name && <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{c.linen_name}{c.category_name ? ` · ${c.category_name}` : ""}{c.ownership_type ? ` · ${OWNERSHIP[c.ownership_type]}` : ""} · {c.quantity} pcs</p>}
							</div>
							<div className="text-[11px] font-medium text-slate-500 lg:w-48">
								<p className="font-semibold text-slate-700">{c.reporter_name}</p>
								<p>{fmtDate(c.complaint_date)}</p>
								{c.photo_count > 0 && <p className="mt-0.5 flex items-center gap-1"><HiOutlinePhoto className="h-3 w-3" /> {c.photo_count} foto</p>}
							</div>
						</div>
					))}
				</div>
			)}

			{detail && <DetailModal detail={detail} onClose={() => setDetail(null)} onChanged={async () => { await load(true); const r = await api(`/ikm/complaints/${detail.id}`); setDetail(r.data); }} />}
		</>
	);
}

function DetailModal({ detail, onClose, onChanged }) {
	const [status, setStatus] = useState("");
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);
	const [lightbox, setLightbox] = useState(null);

	const submit = async (e) => {
		e.preventDefault();
		if (!status && !note.trim()) { showError("Pilih status baru atau isi catatan"); return; }
		if (status === "DITOLAK" && !note.trim()) { showError("Alasan penolakan wajib diisi"); return; }
		if (detail.status === "DIAJUKAN" && status && !note.trim()) { showError("Alasan wajib diisi saat mewakili Tim Linen RS"); return; }
		setSaving(true);
		try {
			await api(`/ikm/complaints/${detail.id}/status`, { method: "POST", body: JSON.stringify({ status: status || undefined, note }) });
			setStatus(""); setNote("");
			showSuccess("Komplain diperbarui");
			await onChanged();
		} catch (err) { showError(err.message); } finally { setSaving(false); }
	};

	return (
		<Modal wide subtitle="Detail Komplain" title={detail.complaint_number} onClose={onClose}>
			<div className="flex flex-wrap items-center gap-2"><Badge status={detail.status} /><span className="text-xs font-semibold text-slate-500">{detail.complaint_type}</span></div>
			<div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-3">
				{[["Rumah Sakit", detail.hospital_name], ["Unit", detail.room_name || "-"], ["Pelapor", detail.reporter_name],
					["Tanggal Pengajuan", fmtDate(detail.complaint_date)], ["Diajukan Oleh", detail.created_by_role === "rs" ? "Tim Linen RS" : "Tim Unit"],
					["Diproses RS", detail.rs_approved_by ? `${detail.rs_approved_by} · ${fmtDateTime(detail.rs_approved_at)}` : "-"],
					...(detail.linen_name ? [["Linen", detail.linen_name], ["Kategori", detail.category_name || "-"], ["Kepemilikan", OWNERSHIP[detail.ownership_type] || "-"], ["Quantity", `${detail.quantity} pcs`]] : []),
				].map(([l, v]) => <div key={l}><p className={labelCls}>{l}</p><p className="font-bold text-slate-800">{v}</p></div>)}
			</div>
			<div><p className={labelCls}>Deskripsi</p><p className="whitespace-pre-wrap text-sm text-slate-700">{detail.description}</p></div>
			{detail.photos.length > 0 && (
				<div>
					<p className={labelCls}>Foto Bukti ({detail.photos.length})</p>
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
						{detail.photos.map((p, i) => (
							<button key={p.id} type="button" onClick={() => setLightbox(i)} title="Klik untuk memperbesar"
								className="group relative block aspect-square cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
								<img src={p.url} alt={p.name || "Foto bukti"} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
								<span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/40 group-hover:opacity-100">
									<HiOutlinePhoto className="h-5 w-5" />
								</span>
							</button>
						))}
					</div>
				</div>
			)}

			<form onSubmit={submit} className="space-y-3 rounded-xl border border-red-100 bg-rose-50/40 p-4">
				<p className="text-xs font-bold text-slate-700">Tindak Lanjut Admin</p>
				{detail.can_update_status ? (
					<div>
						<label className={labelCls}>Ubah Status</label>
						<select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} cursor-pointer`}>
							<option value="">Tidak diubah ({STATUS[detail.status]?.label})</option>
							{(NEXT[detail.status] || []).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
						</select>
					</div>
				) : (
					<p className="text-[11px] font-medium text-slate-500">
						Komplain sudah selesai / ditolak. Anda masih bisa menambahkan catatan.
					</p>
				)}
				{detail.status === "DIAJUKAN" && (
					<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
						Komplain ini belum diproses Tim Linen RS. Gunakan hanya jika kondisional (misalnya Tim Linen RS tidak bisa merespons). Persetujuan Anda dicatat sebagai tindakan admin yang mewakili Tim Linen RS dan alasan wajib diisi.
					</p>
				)}
				<div>
					<label className={labelCls}>Catatan{detail.status === "DIAJUKAN" ? " / alasan (wajib jika mengubah status)" : ""} (terlihat oleh Unit dan Tim Linen RS)</label>
					<textarea rows={3} className={inputCls} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tulis catatan tindak lanjut..." />
				</div>
				<div className="flex justify-end">
					<button type="submit" disabled={saving} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button>
				</div>
			</form>

			<div>
				<p className={labelCls}>Riwayat</p>
				<ol className="space-y-3 border-l-2 border-slate-100 pl-4">
					{detail.logs.map((l) => (
						<li key={l.id} className="relative">
							<span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
							<p className="text-xs font-bold text-slate-800">
								{ACTION[l.action] || l.action}{["admin", "ikm"].includes(l.actor_role) && (l.action === "APPROVED" || l.action === "REJECTED") ? ` (${l.actor_role === "ikm" ? "Tim IKM" : "Admin"} mewakili Tim Linen RS)` : ""}
								{l.to_status && l.action !== "NOTE" && <span className="ml-1 font-semibold text-slate-400">→ {STATUS[l.to_status]?.label || l.to_status}</span>}
							</p>
							{l.note && <p className="mt-0.5 whitespace-pre-wrap rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">{l.note}</p>}
							<p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><HiOutlineClock className="h-3 w-3" /> {l.actor_name} ({l.actor_role === "admin" ? "Admin" : l.actor_role === "ikm" ? "Tim IKM" : l.actor_role === "rs" ? "Tim Linen RS" : "Unit"}) · {fmtDateTime(l.created_at)}</p>
						</li>
					))}
				</ol>
			</div>
			{lightbox !== null && detail.photos[lightbox] && (
				<PhotoLightbox photos={detail.photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
			)}
		</Modal>
	);
}

function CategoryList() {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState(null);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try { setRows((await api("/ikm/complaints/categories")).data || []); } catch (e) { showError(e.message); } finally { setLoading(false); }
	}, []);
	useEffect(() => { load(); }, [load]);

	const save = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			if (form.id) await api(`/ikm/complaints/categories/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
			else await api("/ikm/complaints/categories", { method: "POST", body: JSON.stringify(form) });
			setForm(null);
			load();
		} catch (err) { showError(err.message); } finally { setSaving(false); }
	};

	const remove = async (r) => {
		if (!(await showConfirm("Hapus kategori?", `Kategori "${r.category_name}" akan dihapus. Komplain yang sudah ada tidak terpengaruh.`))) return;
		try { await api(`/ikm/complaints/categories/${r.id}`, { method: "DELETE" }); load(); } catch (err) { showError(err.message); }
	};

	return (
		<>
			<div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<p className="text-xs font-medium text-slate-500">Kategori muncul sebagai saran pada kolom "Jenis Komplain". Pengguna tetap bisa mengetik jenis lain.</p>
				<button type="button" onClick={() => setForm({ id: null, category_name: "", description: "", is_active: 1 })}
					className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700">
					<HiOutlinePlus className="h-4 w-4" /> Tambah
				</button>
			</div>
			{loading ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"><HiOutlineArrowPath className="mx-auto h-6 w-6 animate-spin text-red-500" /></div>
			) : rows.length === 0 ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-400 shadow-sm">Belum ada kategori.</div>
			) : (
				<div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					{rows.map((r) => (
						<div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-bold text-slate-800">
									{r.category_name}
									{!r.is_active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Nonaktif</span>}
								</p>
								{r.description && <p className="truncate text-xs text-slate-500">{r.description}</p>}
							</div>
							<button type="button" title="Edit" onClick={() => setForm({ ...r })} className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><HiOutlinePencilSquare className="h-4 w-4" /></button>
							<button type="button" title="Hapus" onClick={() => remove(r)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><HiOutlineTrash className="h-4 w-4" /></button>
						</div>
					))}
				</div>
			)}
			{form && (
				<Modal subtitle="Kategori Komplain" title={form.id ? "Edit Kategori" : "Tambah Kategori"} onClose={() => setForm(null)}
					footer={(
						<>
							<button type="button" onClick={() => setForm(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Batal</button>
							<button type="submit" form="cat-form" disabled={saving} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button>
						</>
					)}>
					<form id="cat-form" onSubmit={save} className="space-y-3">
						<div><label className={labelCls}>Nama Kategori</label><input required maxLength={100} className={inputCls} value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} /></div>
						<div><label className={labelCls}>Keterangan</label><input maxLength={255} className={inputCls} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
						<label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
							<input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="h-4 w-4 accent-red-600" /> Aktif
						</label>
					</form>
				</Modal>
			)}
		</>
	);
}
