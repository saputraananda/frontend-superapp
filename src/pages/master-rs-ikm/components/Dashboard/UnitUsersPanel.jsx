import { useCallback, useEffect, useState } from "react";
import { HiOutlinePencilSquare, HiOutlinePlus, HiOutlinePower, HiOutlineTrash } from "react-icons/hi2";
import { api } from "../../../../lib/api";
import { showError, showConfirm } from "../../../../utils/alert";

const EMPTY = { id: null, nurse_name: "", phone: "", username: "", password: "", role: "unit", room_ids: [] };

const inputCls =
	"w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 placeholder:text-slate-400";

// Master user unit (mst_users_rs) per rumah sakit. Dipakai di modal Detail & Edit.
// Dirender sebagai <div> (bukan <form>) agar aman berada di dalam form Edit.
export default function UnitUsersPanel({ hospitalId, rooms = [] }) {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState(null);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		if (!hospitalId) return;
		setLoading(true);
		try {
			const res = await api(`/ikm/master-rs/hospitals/${hospitalId}/unit-users`);
			setUsers(res.data || []);
		} catch (e) {
			showError(e.message);
		} finally {
			setLoading(false);
		}
	}, [hospitalId]);

	useEffect(() => { load(); }, [load]);

	const roomName = (id) => rooms.find((r) => Number(r.id) === Number(id))?.room_name || `#${id}`;
	// hanya ruangan yang sudah tersimpan (punya id) yang bisa di-assign
	const assignable = rooms.filter((r) => r.id);

	const toggleRoom = (id) =>
		setForm((f) => ({
			...f,
			room_ids: f.room_ids.includes(id) ? f.room_ids.filter((x) => x !== id) : [...f.room_ids, id],
		}));

	const save = async () => {
		if (!form.nurse_name.trim() || !form.username.trim() || !form.password.trim()) {
			showError("Nama, username, dan password wajib diisi");
			return;
		}
		setSaving(true);
		try {
			if (form.id) {
				await api(`/ikm/master-rs/hospitals/unit-users/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
			} else {
				await api(`/ikm/master-rs/hospitals/${hospitalId}/unit-users`, { method: "POST", body: JSON.stringify(form) });
			}
			setForm(null);
			load();
		} catch (e) {
			showError(e.message);
		} finally {
			setSaving(false);
		}
	};

	const toggle = async (u) => {
		try {
			await api(`/ikm/master-rs/hospitals/unit-users/${u.id}/toggle`, { method: "POST" });
			load();
		} catch (e) {
			showError(e.message);
		}
	};

	const remove = async (u) => {
		if (!(await showConfirm("Hapus user unit?", `${u.nurse_name} (${u.username}) akan dihapus.`))) return;
		try {
			await api(`/ikm/master-rs/hospitals/unit-users/${u.id}`, { method: "DELETE" });
			load();
		} catch (e) {
			showError(e.message);
		}
	};

	return (
		<div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 space-y-3">
			<div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
				<div className="text-xs font-bold text-slate-700">Master User Unit ({users.length})</div>
				<button
					type="button"
					onClick={() => setForm({ ...EMPTY })}
					className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition"
				>
					<HiOutlinePlus className="h-3.5 w-3.5" /> Tambah
				</button>
			</div>

			{form && (
				<div
					className="space-y-2 rounded-xl border border-red-100 bg-white p-3"
					onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
				>
					<div className="flex gap-1.5">
						{[["unit", "Unit"], ["rs", "User RS"]].map(([val, label]) => (
							<button
								key={val}
								type="button"
								onClick={() => setForm({ ...form, role: val })}
								className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${form.role === val ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
							>
								{label}
							</button>
						))}
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<input className={inputCls} placeholder="Nama Perawat" value={form.nurse_name} onChange={(e) => setForm({ ...form, nurse_name: e.target.value })} />
						<input className={inputCls} placeholder="No. Telepon (opsional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
						<input className={inputCls} placeholder="Username (unik)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
						<input className={inputCls} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
					</div>
					{form.role !== "rs" && (
					<div>
						<p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Unit (bisa lebih dari satu)</p>
						{assignable.length === 0 ? (
							<p className="text-[11px] text-slate-400">Belum ada ruangan tersimpan. Tambahkan ruangan dulu.</p>
						) : (
							<div className="flex flex-wrap gap-1.5">
								{assignable.map((r) => {
									const on = form.room_ids.includes(Number(r.id));
									return (
										<button
											key={r.id}
											type="button"
											onClick={() => toggleRoom(Number(r.id))}
											className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${on ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
										>
											{r.room_name}
										</button>
									);
								})}
							</div>
						)}
					</div>
					)}
					<div className="flex justify-end gap-2">
						<button type="button" onClick={() => setForm(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">Batal</button>
						<button type="button" disabled={saving} onClick={save} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition">
							{saving ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</div>
			)}

			{loading ? (
				<p className="py-2 text-center text-xs text-slate-400">Memuat...</p>
			) : users.length === 0 ? (
				<p className="py-2 text-center text-xs text-slate-400">— Belum ada user unit —</p>
			) : (
				<div className="space-y-2">
					{users.map((u) => (
						<div key={u.id} className="rounded-xl border border-slate-200 bg-white p-3">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="truncate text-sm font-bold text-slate-800">
										{u.nurse_name}
										<span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role === "rs" ? "bg-indigo-50 text-indigo-700" : "bg-sky-50 text-sky-700"}`}>
											{u.role === "rs" ? "User RS" : "Unit"}
										</span>
										<span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
											{u.is_active ? "Aktif" : "Nonaktif"}
										</span>
									</p>
									<p className="mt-0.5 text-[11px] text-slate-500">Telp: {u.phone || "-"}</p>
									<p className="font-mono text-[11px] text-slate-700">
										{u.username} / {u.password}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-0.5">
									<button type="button" title="Edit" onClick={() => setForm({ ...u })} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition">
										<HiOutlinePencilSquare className="h-4 w-4" />
									</button>
									<button type="button" title={u.is_active ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggle(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition">
										<HiOutlinePower className="h-4 w-4" />
									</button>
									<button type="button" title="Hapus" onClick={() => remove(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition">
										<HiOutlineTrash className="h-4 w-4" />
									</button>
								</div>
							</div>
							<div className="mt-2 flex flex-wrap gap-1">
								{u.role === "rs" ? (
									<span className="text-[11px] text-slate-400">Akses semua unit</span>
								) : u.room_ids.length === 0 ? (
									<span className="text-[11px] text-slate-400">Belum ada unit</span>
								) : (
									u.room_ids.map((id) => (
										<span key={id} className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
											{roomName(id)}
										</span>
									))
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
