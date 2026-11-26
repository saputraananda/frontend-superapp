import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { HiOutlineChartBar } from "react-icons/hi2";
import { useToast } from "./helpers";
import { PageShell, Spinner } from "./ui";
import FeedbackTab from "./dashboard/FeedbackTab";
import OjtTab from "./dashboard/OjtTab";
import RaporTab from "./dashboard/RaporTab";
import SkillGapTab from "./dashboard/SkillGapTab";
import TrainingTab from "./dashboard/TrainingTab";
import { Capsules } from "./dashboard/dashboardUi";

const TABS = [
  ["training", "Training"],
  ["ojt", "OJT"],
  ["rapor", "Rapor"],
  ["skillgap", "Skill Gap"],
  ["feedback", "Feedback"],
];

const SUBTITLE = {
  training: "Training · Ringkasan bulan",
  ojt: "OJT · Dashboard bulanan",
  rapor: "Rapor karyawan",
  skillgap: "Skill gap per posisi · dari topik dan indikator terendah",
  feedback: "Feedback karyawan · apa yang perlu diperbaiki dari training",
};

// Semua tab dashboard memakai data nyata dari database (karyawan Waschen).
export default function AcademyDashboard() {
  const { toast, showToast } = useToast();
  const [tab, setTab] = useState("training");
  // Rentang tanggal mulai batch untuk pilihan bulan dan tahun; { first: null, last: null } bila belum ada batch.
  const [periods, setPeriods] = useState(null);

  useEffect(() => {
    api("/academy/dashboard/periods")
      .then((res) => setPeriods(res.data))
      .catch((err) => {
        showToast(err.message, "error");
        setPeriods({ first: null, last: null });
      });
  }, [showToast]);

  return (
    <PageShell icon={HiOutlineChartBar} title="Dashboard Academy" subtitle={SUBTITLE[tab]} toast={toast}>
      <Capsules label="Jenis dashboard" items={TABS} value={tab} onChange={setTab} />
      {!periods && <Spinner />}
      {periods && tab === "training" && <TrainingTab showToast={showToast} periods={periods} />}
      {periods && tab === "ojt" && <OjtTab showToast={showToast} periods={periods} />}
      {tab === "rapor" && <RaporTab showToast={showToast} />}
      {tab === "skillgap" && <SkillGapTab showToast={showToast} />}
      {periods && tab === "feedback" && <FeedbackTab showToast={showToast} periods={periods} />}
    </PageShell>
  );
}
