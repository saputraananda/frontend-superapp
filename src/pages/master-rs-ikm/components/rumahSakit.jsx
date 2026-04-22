import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import {
	HiOutlineBuildingOffice2,
	HiOutlineCheckCircle,
	HiOutlineExclamationCircle,
	HiOutlineMapPin,
	HiOutlinePencilSquare,
	HiOutlinePlus,
	HiOutlineTrash,
	HiOutlineXMark,
} from "react-icons/hi2";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ── Fix leaflet default icon paths (broken by webpack/vite) ──────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
	iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
	shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ── Custom pin icons ─────────────────────────────────────────────────────
const hospitalIcon = L.divIcon({
	className: "",
	html: `<div style="width:32px;height:40px;position:relative">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" style="width:100%;height:100%">
			<path d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.5 24 16 24S32 26.627 32 16C32 7.163 24.837 0 16 0z" fill="#dc2626"/>
			<circle cx="16" cy="15" r="9" fill="white"/>
			<rect x="14.5" y="9" width="3" height="12" rx="1.5" fill="#dc2626"/>
			<rect x="10" y="13.5" width="12" height="3" rx="1.5" fill="#dc2626"/>
		</svg>
	</div>`,
	iconSize: [32, 40],
	iconAnchor: [16, 40],
	popupAnchor: [0, -42],
});

// offsets (lat,lng) so cars don't overlap hospital pins
const CAR_OFFSETS = [
	[0.008,  0.012],
	[-0.010, 0.008],
	[0.012, -0.009],
	[-0.007,-0.013],
	[0.006,  0.015],
	[0.015,  0.003],
	[-0.014, 0.011],
	[0.009, -0.016],
	[-0.003, 0.018],
	[0.017, -0.005],
	[-0.016,-0.007],
	[0.004,  0.020],
	[-0.012, 0.016],
	[0.018,  0.009],
	[-0.005,-0.018],
];

const CAR_PLATES = [
	"B 1234 TUX",
	"B 1235 PCX",
	"B 1236 KWN",
	"B 1237 ZXL",
	"B 1238 RQT",
	"B 1239 MQR",
	"B 1240 VNX",
	"B 1241 DKP",
	"B 1242 FBT",
	"B 1243 GWS",
	"B 1244 HLZ",
	"B 1245 JCY",
	"B 1246 NXV",
	"B 1247 QBR",
	"B 1248 SFM",
];

const carIcon = L.divIcon({
	className: "",
	html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#ffffff;border-radius:7px;box-shadow:0 2px 7px rgba(0,0,0,.35);border:1.5px solid #dc2626;">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px">
			<rect x="1" y="3" width="15" height="12" rx="1"/>
			<path d="M16 8h4l3 5v3h-7V8z"/>
			<circle cx="5.5" cy="18.5" r="2"/>
			<circle cx="18.5" cy="18.5" r="2"/>
		</svg>
	</div>`,
	iconSize: [36, 36],
	iconAnchor: [18, 18],
	popupAnchor: [0, -20],
});

// ── Helpers ──────────────────────────────────────────────────────────────
function centroid(hospitals) {
	const valid = hospitals.filter(
		(h) => h.latitude !== null && h.longitude !== null,
	);
	if (valid.length === 0) return [-2.5, 117.5];
	const lat = valid.reduce((s, h) => s + parseFloat(h.latitude), 0) / valid.length;
	const lng = valid.reduce((s, h) => s + parseFloat(h.longitude), 0) / valid.length;
	return [lat, lng];
}

const EMPTY_FORM = {
	hospital_name: "",
	hospital_id: "",
	company_name: "",
	address: "",
	latitude: "",
	longitude: "",
};

// ── Toast ────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
	useEffect(() => {
		const t = setTimeout(onClose, 3500);
		return () => clearTimeout(t);
	}, [onClose]);
	return (
		<div
			className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl text-sm font-semibold text-white transition ${type === "error" ? "bg-red-600" : "bg-emerald-600"}`}
		>
			{type === "error" ? <HiOutlineExclamationCircle className="h-5 w-5 shrink-0" /> : <HiOutlineCheckCircle className="h-5 w-5 shrink-0" />}
			{message}
			<button type="button" onClick={onClose} className="ml-2 rounded p-0.5 hover:bg-white/20">
				<HiOutlineXMark className="h-4 w-4" />
			</button>
		</div>
	);
}

// ── Modal ────────────────────────────────────────────────────────────────
function Modal({ open, title, onClose, children }) {
	useEffect(() => {
		const handler = (e) => { if (e.key === "Escape") onClose(); };
		if (open) document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onClose]);

	if (!open) return null;
	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
			<div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
				<div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
					<h3 className="text-base font-bold text-slate-800">{title}</h3>
					<button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
						<HiOutlineXMark className="h-5 w-5" />
					</button>
				</div>
				<div className="px-6 py-5">{children}</div>
			</div>
		</div>
	);
}

// ── Form ─────────────────────────────────────────────────────────────────
function HospitalForm({ initial, onSubmit, onClose, loading }) {
	const [form, setForm] = useState(initial ?? EMPTY_FORM);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const handleSubmit = (e) => {
		e.preventDefault();
		onSubmit(form);
	};

	const inputCls =
		"w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 placeholder:text-slate-400";
	const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="sm:col-span-2">
					<label className={labelCls}>Nama Rumah Sakit <span className="text-red-500">*</span></label>
					<input required className={inputCls} value={form.hospital_name} onChange={set("hospital_name")} placeholder="RS Mitra Husada" />
				</div>
				<div>
					<label className={labelCls}>Hospital ID</label>
					<input className={inputCls} value={form.hospital_id} onChange={set("hospital_id")} placeholder="RSU-001" />
				</div>
				<div>
					<label className={labelCls}>Nama Perusahaan</label>
					<input className={inputCls} value={form.company_name} onChange={set("company_name")} placeholder="PT ..." />
				</div>
				<div className="sm:col-span-2">
					<label className={labelCls}>Alamat</label>
					<textarea rows={2} className={inputCls} value={form.address} onChange={set("address")} placeholder="Jl. ..." />
				</div>
				<div>
					<label className={labelCls}>Latitude</label>
					<input type="number" step="any" className={inputCls} value={form.latitude} onChange={set("latitude")} placeholder="-6.2088" />
				</div>
				<div>
					<label className={labelCls}>Longitude</label>
					<input type="number" step="any" className={inputCls} value={form.longitude} onChange={set("longitude")} placeholder="106.8456" />
				</div>
			</div>
			<div className="flex justify-end gap-3 pt-2">
				<button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
					Batal
				</button>
				<button
					type="submit"
					disabled={loading}
					className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
				>
					{loading ? "Menyimpan..." : "Simpan"}
				</button>
			</div>
		</form>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function RumahSakitPage() {
	const [hospitals, setHospitals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState(null);
	const [modal, setModal] = useState(null); // { mode: "add"|"edit", data: null|{...} }
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [formLoading, setFormLoading] = useState(false);

	const showToast = (message, type = "success") => setToast({ message, type });
	const closeToast = () => setToast(null);

	// ── Fetch ──
	const fetchHospitals = useCallback(async () => {
		try {
			const json = await api("/ikm/master-rs/hospitals");
			setHospitals(json.data || []);
		} catch (e) {
			showToast(e.message, "error");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { fetchHospitals(); }, [fetchHospitals]);

	// ── Create ──
	const handleCreate = async (form) => {
		setFormLoading(true);
		try {
			await api("/ikm/master-rs/hospitals", { method: "POST", body: JSON.stringify(form) });
			showToast("Rumah sakit berhasil ditambahkan");
			setModal(null);
			fetchHospitals();
		} catch (e) {
			showToast(e.message, "error");
		} finally {
			setFormLoading(false);
		}
	};

	// ── Update ──
	const handleUpdate = async (form) => {
		setFormLoading(true);
		try {
			await api(`/ikm/master-rs/hospitals/${modal.data.id}`, { method: "PUT", body: JSON.stringify(form) });
			showToast("Rumah sakit berhasil diperbarui");
			setModal(null);
			fetchHospitals();
		} catch (e) {
			showToast(e.message, "error");
		} finally {
			setFormLoading(false);
		}
	};

	// ── Delete ──
	const handleDelete = async () => {
		try {
			await api(`/ikm/master-rs/hospitals/${deleteTarget.id}`, { method: "DELETE" });
			showToast("Rumah sakit berhasil dihapus");
			setDeleteTarget(null);
			fetchHospitals();
		} catch (e) {
			showToast(e.message, "error");
		}
	};

	const mapCenter = centroid(hospitals);
	const hasCoords = hospitals.some((h) => h.latitude !== null && h.longitude !== null);

	return (
		<div className="flex flex-col min-h-full">
			{/* Header */}
			<div className="bg-gradient-to-r from-red-700 to-orange-500 px-6 py-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
							<HiOutlineBuildingOffice2 className="h-6 w-6 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-white">Data Rumah Sakit</h1>
							<p className="text-sm text-red-100 mt-0.5">
								{hospitals.length} rumah sakit terdaftar
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setModal({ mode: "add", data: null })}
						className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow hover:bg-red-50 transition active:scale-95"
					>
						<HiOutlinePlus className="h-4 w-4" />
						Tambah Rumah Sakit
					</button>
				</div>
			</div>

			{/* Map */}
			<div className="px-4 pt-4 pb-2">
				<div className="rounded-2xl overflow-hidden shadow-md border border-slate-200" style={{ height: 420, position: "relative", zIndex: 0 }}>
					{loading ? (
						<div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
							Memuat peta...
						</div>
					) : (
						<MapContainer
							center={mapCenter}
							zoom={hasCoords ? 9 : 5}
							style={{ height: "100%", width: "100%" }}
							scrollWheelZoom
						>
							<TileLayer
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							/>
							{hospitals
								.filter((h) => h.latitude !== null && h.longitude !== null)
								.map((h) => (
									<Marker
										key={h.id}
										position={[parseFloat(h.latitude), parseFloat(h.longitude)]}
										icon={hospitalIcon}
									>
										<Popup>
											<strong>{h.hospital_name}</strong>
											{h.company_name && <><br /><span className="text-xs text-slate-500">{h.company_name}</span></>}
											{h.address && <><br /><span className="text-xs text-slate-400">{h.address}</span></>}
										</Popup>
									</Marker>
								))}
								{hospitals
							.filter((h) => h.latitude !== null && h.longitude !== null)
							.slice(0, 15)
							.map((h, i) => {
								const [dLat, dLng] = CAR_OFFSETS[i];
								const plate = CAR_PLATES[i];
								return (
									<Marker
										key={`car-${h.id}`}
										position={[parseFloat(h.latitude) + dLat, parseFloat(h.longitude) + dLng]}
										icon={carIcon}
									>
										<Popup>
											<div style={{minWidth:"140px"}}>
												<div style={{fontWeight:700,fontSize:"13px",marginBottom:"4px"}}>🚚 Mobil Box</div>
												<div style={{fontSize:"12px",color:"#374151",marginBottom:"2px"}}>
													<span style={{fontWeight:600}}>Plat:</span>{" "}
													<span style={{fontFamily:"monospace",background:"#fef9c3",padding:"1px 6px",borderRadius:"4px",border:"1px solid #d97706"}}>{plate}</span>
												</div>
												<div style={{fontSize:"12px",color:"#6b7280"}}>Menuju: <span style={{color:"#dc2626",fontWeight:600}}>{h.hospital_name}</span></div>
											</div>
										</Popup>
									</Marker>
								);
							})}
						</MapContainer>
					)}
				</div>
				{!hasCoords && !loading && (
					<p className="mt-1.5 text-center text-xs text-slate-400">
						Tambahkan koordinat pada data rumah sakit untuk menampilkan peta
					</p>
				)}

			</div>

			{/* Table */}
			<div className="flex-1 px-4 pb-6 pt-2">
				<div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
								<tr>
									<th className="px-4 py-3 text-center">#</th>
									<th className="px-4 py-3 text-left">Nama Rumah Sakit</th>
									<th className="px-4 py-3 text-left">Hospital ID</th>
									<th className="hidden md:table-cell px-4 py-3 text-left">Perusahaan</th>
									<th className="hidden lg:table-cell px-4 py-3 text-left">Alamat</th>
									<th className="hidden sm:table-cell px-4 py-3 text-center">Koordinat</th>
									<th className="px-4 py-3 text-center">Aksi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{loading ? (
									<tr>
										<td colSpan={7} className="py-10 text-center text-slate-400">
											Memuat data...
										</td>
									</tr>
								) : hospitals.length === 0 ? (
									<tr>
										<td colSpan={7} className="py-12 text-center text-slate-400">
											Belum ada data rumah sakit.{" "}
											<button
												type="button"
												onClick={() => setModal({ mode: "add", data: null })}
												className="text-red-600 font-semibold hover:underline"
											>
												Tambahkan sekarang
											</button>
										</td>
									</tr>
								) : (
									hospitals.map((h, idx) => (
										<tr key={h.id} className="hover:bg-slate-50 transition-colors">
											<td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
											<td className="px-4 py-3">
												<div className="flex items-center gap-2.5">
													<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
														<HiOutlineBuildingOffice2 className="h-4 w-4" />
													</div>
													<span className="font-semibold text-slate-800">{h.hospital_name}</span>
												</div>
											</td>
											<td className="px-4 py-3 text-slate-500 font-mono text-xs">
												{h.hospital_id || <span className="text-slate-300">—</span>}
											</td>
											<td className="hidden md:table-cell px-4 py-3 text-slate-500">
												{h.company_name || <span className="text-slate-300">—</span>}
											</td>
											<td className="hidden lg:table-cell px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">
												{h.address || <span className="text-slate-300">—</span>}
											</td>
											<td className="hidden sm:table-cell px-4 py-3 text-center">
												{h.latitude && h.longitude ? (
													<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
														<HiOutlineMapPin className="h-3 w-3" />
														{parseFloat(h.latitude).toFixed(4)}, {parseFloat(h.longitude).toFixed(4)}
													</span>
												) : (
													<span className="text-slate-300 text-xs">Belum ada</span>
												)}
											</td>
											<td className="px-4 py-3">
												<div className="flex items-center justify-center gap-1.5">
													<button
														type="button"
														title="Edit"
														onClick={() =>
															setModal({
																mode: "edit",
																data: {
																	...h,
																	latitude: h.latitude ?? "",
																	longitude: h.longitude ?? "",
																},
															})
														}
														className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition"
													>
														<HiOutlinePencilSquare className="h-4 w-4" />
													</button>
													<button
														type="button"
														title="Hapus"
														onClick={() => setDeleteTarget(h)}
														className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition"
													>
														<HiOutlineTrash className="h-4 w-4" />
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Add / Edit modal */}
			<Modal
				open={modal !== null}
				title={modal?.mode === "edit" ? "Edit Rumah Sakit" : "Tambah Rumah Sakit"}
				onClose={() => setModal(null)}
			>
				<HospitalForm
					initial={modal?.data}
					onSubmit={modal?.mode === "edit" ? handleUpdate : handleCreate}
					onClose={() => setModal(null)}
					loading={formLoading}
				/>
			</Modal>

			{/* Delete confirmation */}
			<Modal
				open={deleteTarget !== null}
				title="Hapus Rumah Sakit"
				onClose={() => setDeleteTarget(null)}
			>
				<p className="text-sm text-slate-600">
					Hapus <span className="font-semibold text-slate-800">{deleteTarget?.hospital_name}</span>?
					Tindakan ini tidak dapat dibatalkan.
				</p>
				<div className="flex justify-end gap-3 mt-5">
					<button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
						Batal
					</button>
					<button
						type="button"
						onClick={handleDelete}
						className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
					>
						Hapus
					</button>
				</div>
			</Modal>

			{/* Toast */}
			{toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
		</div>
	);
}
