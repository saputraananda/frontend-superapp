import { HiOutlineTableCells } from "react-icons/hi2";

export default function DataLinenPage() {
	return (
		<div className="flex flex-col min-h-full">
			{/* Header */}
			<div className="bg-gradient-to-r from-red-700 to-orange-500 px-6 py-6">
				<div className="flex items-center gap-4">
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
						<HiOutlineTableCells className="h-6 w-6 text-white" />
					</div>
					<div>
						<h1 className="text-xl font-bold text-white">Data Linen</h1>
						<p className="text-sm text-red-100 mt-0.5">Manajemen data linen IKM</p>
					</div>
				</div>
			</div>

			{/* Placeholder */}
			<div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
				<div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50">
					<HiOutlineTableCells className="h-10 w-10 text-red-400" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-slate-700">Fitur Segera Hadir</h2>
					<p className="mt-1 text-sm text-slate-400">Halaman Data Linen sedang dalam pengembangan.</p>
				</div>
			</div>
		</div>
	);
}
