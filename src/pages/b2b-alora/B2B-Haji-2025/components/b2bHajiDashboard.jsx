import { HiOutlineBuildingStorefront } from "react-icons/hi2";

export default function B2bHajiDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 border border-sky-200">
          <HiOutlineBuildingStorefront className="h-8 w-8 text-sky-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">B2B Haji</h2>
          <p className="text-sm text-slate-500 mt-1">Sedang dalam pengembangan</p>
        </div>
      </div>
    </div>
  );
}
