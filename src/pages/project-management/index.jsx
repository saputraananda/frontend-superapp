import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import PMAnnual from "./PMAnnual";
import PMSemester from "./PMSemester";
import PMMonthly from "./PMMonthly";
import PMBoard from "./PMBoard";

export default function ProjectManagement() {
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();

  const handleOpenV2 = () => {
    navigate("/project-management-v2");
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl transition-all relative">
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Perhatian
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Sekarang project management sudah beralih ke{" "}
                <span className="font-semibold text-slate-900">Project Management V2</span>, Untuk data lama yang penting mohon dipindahkan yaa
              </p>

              <div className="flex items-center justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={handleOpenV2}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
                >
                  <span>Buka Project Management V2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Routes>
        {/* default masuk annual */}
        <Route index element={<PMAnnual />} />

        {/* semester */}
        <Route path=":projectId" element={<PMSemester />} />

        {/* monthly */}
        <Route path=":projectId/semester/:semesterId" element={<PMMonthly />} />

        {/* board */}
        <Route path="month/:monthlyId" element={<PMBoard />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </>
  );
}