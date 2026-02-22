// src/pages/project-management/index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import PMAnnual from "./PMAnnual";
import PMSemester from "./PMSemester";
import PMMonthly from "./PMMonthly";
import PMBoard from "./PMBoard";

export default function ProjectManagement() {
  return (
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
  );
}