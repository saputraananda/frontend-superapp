import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
    HiOutlineBeaker,
    HiOutlineBuildingStorefront,
    HiOutlineChevronDown,
    HiOutlineChevronRight,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlinePencilSquare,
    HiOutlinePhoto,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineUsers,
} from "react-icons/hi2";
import { api, apiUpload, assetUrl } from "../../../lib/api";
import { ikmOperationalConfig } from "./companyRegistry";

function cn(...c) {
    return c.filter(Boolean).join(" ");
}

const FALLBACK_CHEMICAL_OPTIONS = [
    "Obat Tinta (Ink)",
    "Obat Karat (Rust)",
    "Yellow Go",
    "Colorsol",
    "Obat kunyit",
    "Obat Darah",
    "Metanol",
    "Bon Go (kunyit)",
];

const FALLBACK_SCORE_OPTIONS = [
    { label: "Aman", score: 4 },
    { label: "Setengah", score: 3 },
    { label: "Sedikit", score: 2 },
    { label: "Habis", score: 1 },
];

function todayIso() {
    return new Date().toISOString().split("T")[0];
}

function monthIso(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function toTitleCase(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

function toLocalIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCutoffRangeFromMonth(monthValue) {
    const [yearRaw, monthRaw] = String(monthValue || "").split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);

    if (!year || !month) {
        const fallback = monthIso(new Date());
        return getCutoffRangeFromMonth(fallback);
    }

    const start = new Date(year, month - 2, 26);
    const end = new Date(year, month - 1, 25);

    return {
        start: toLocalIsoDate(start),
        end: toLocalIsoDate(end),
    };
}

function getCurrentCutoffMonth() {
    const now = new Date();
    return monthIso(now);
}

function createInitialResultFilter() {
    const cutoffMonth = getCurrentCutoffMonth();
    const cutoff = getCutoffRangeFromMonth(cutoffMonth);

    return {
        mode: "cutoff",
        cutoffMonth,
        date: todayIso(),
        month: monthIso(new Date()),
        rangeStart: cutoff.start,
        rangeEnd: cutoff.end,
        outlet: "all",
    };
}

function analyzeReport(report) {
    const chemicals = Array.isArray(report.chemical_items) ? report.chemical_items : [];
    const habisCount = chemicals.filter((item) => item?.status === "Habis").length;
    const sedikitCount = chemicals.filter((item) => item?.status === "Sedikit").length;
    const issueText = String(report?.outlet_issue || "").trim();
    const hasIssue = hasMeaningfulIssue(issueText);
    const avgScore = Number(report?.avg_score || 0);

    const needsAttention = habisCount > 0 || sedikitCount > 0 || hasIssue || avgScore < 2.5;
    const severity = habisCount > 0 || avgScore < 2 ? "Tinggi" : needsAttention ? "Sedang" : "Normal";

    return {
        habisCount,
        sedikitCount,
        hasIssue,
        needsAttention,
        severity,
    };
}

function hasMeaningfulIssue(text) {
    const raw = String(text || "").toLowerCase();
    const cleaned = raw.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return false;

    const noIssuePhrases = new Set([
        "tidak ada isu",
        "tidak ada",
        "ga ada isu",
        "ga ada",
        "gak ada isu",
        "gak ada",
        "aman",
        "aman aman",
        "aman aja",
        "aman aman aja",
        "oke",
        "ok",
        "normal",
        "nihil",
        "no issue",
        "no issues",
        "none",
        "n a",
    ]);

    if (noIssuePhrases.has(cleaned)) return false;
    if (cleaned.includes("tidak ada isu") || cleaned.includes("ga ada isu") || cleaned.includes("gak ada isu")) return false;

    const safeHints = ["aman", "oke", "ok", "normal"];
    const riskyHints = ["tapi", "namun", "tetapi", "kendala", "masalah", "rusak", "bocor", "bau", "berisik", "perbaikan", "kurang", "saran"];
    if (safeHints.some((hint) => cleaned === hint || cleaned.startsWith(`${hint} `))) {
        if (!riskyHints.some((hint) => cleaned.includes(hint))) return false;
    }

    return true;
}

function formatDate(dateValue) {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getStatusClass(status) {
    if (status === "Aman") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (status === "Setengah") return "bg-amber-50 text-amber-700 border border-amber-200";
    if (status === "Sedikit") return "bg-orange-50 text-orange-700 border border-orange-200";
    return "bg-rose-50 text-rose-700 border border-rose-200";
}

function buildChemicalRows(chemicalOptions, scoreOptions) {
    const defaultStatus = scoreOptions[0]?.label || "Aman";
    return (chemicalOptions || []).map((name) => ({
        name,
        status: defaultStatus,
        custom: false,
    }));
}

function buildReportChemicalRows(reportItems, chemicalOptions, scoreOptions) {
    const defaultStatus = scoreOptions[0]?.label || "Aman";
    const optionSet = new Set((chemicalOptions || []).map((name) => toTitleCase(name)));
    const items = Array.isArray(reportItems) ? reportItems : [];

    return items.map((item) => {
        const name = toTitleCase(item?.name || "");
        const status = item?.status || defaultStatus;
        return {
            name,
            status,
            custom: !optionSet.has(name),
        };
    });
}

export default function ChemicalTreatmentOC() {
    const outletContext = useOutletContext() || {};
    const companyConfig = outletContext.companyConfig || ikmOperationalConfig;
    const selectedCompany = outletContext.selectedCompany || null;

    const [activeMenu, setActiveMenu] = useState("form");

    const [leaders, setLeaders] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [chemicalOptions, setChemicalOptions] = useState(FALLBACK_CHEMICAL_OPTIONS);
    const [scoreOptions, setScoreOptions] = useState(FALLBACK_SCORE_OPTIONS);

    const [reports, setReports] = useState([]);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [loadingReports, setLoadingReports] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [visitDate, setVisitDate] = useState(todayIso());
    const [selectedLeaderIds, setSelectedLeaderIds] = useState([]);
    const [selectedOutletId, setSelectedOutletId] = useState("");
    const [chemicalRows, setChemicalRows] = useState(
        buildChemicalRows(FALLBACK_CHEMICAL_OPTIONS, FALLBACK_SCORE_OPTIONS)
    );
    const [customChemicalName, setCustomChemicalName] = useState("");
    const [photoFiles, setPhotoFiles] = useState([]);
    const [outletIssue, setOutletIssue] = useState("");
    const [suggestionImprovement, setSuggestionImprovement] = useState("");
    const [resultFilter, setResultFilter] = useState(createInitialResultFilter);
    const [expandedReportId, setExpandedReportId] = useState(null);
    const [editReportId, setEditReportId] = useState(null);
    const [editVisitDate, setEditVisitDate] = useState(todayIso());
    const [editSelectedLeaderIds, setEditSelectedLeaderIds] = useState([]);
    const [editSelectedOutletId, setEditSelectedOutletId] = useState("");
    const [editChemicalRows, setEditChemicalRows] = useState([]);
    const [editCustomChemicalName, setEditCustomChemicalName] = useState("");
    const [editPhotoFiles, setEditPhotoFiles] = useState([]);
    const [editExistingPhotoPaths, setEditExistingPhotoPaths] = useState([]);
    const [editRemovedPhotoPaths, setEditRemovedPhotoPaths] = useState([]);
    const [editOutletIssue, setEditOutletIssue] = useState("");
    const [editSuggestionImprovement, setEditSuggestionImprovement] = useState("");
    const [editError, setEditError] = useState("");
    const [editSaving, setEditSaving] = useState(false);
    const [deletingReportId, setDeletingReportId] = useState(null);

    const selectedCompanyCode = String(selectedCompany?.company_code || "").toUpperCase();
    const isWaschenOnlyPage = Number(selectedCompany?.company_id) === 5 || selectedCompanyCode === "WL";

    useEffect(() => {
        const companyName = selectedCompany?.company_name || "Operasional";
        document.title = `Chemical & Treatment ${companyName} | Alora App`;
    }, [selectedCompany]);

    const previewPhotos = useMemo(
        () => photoFiles.map((file) => ({
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
        })),
        [photoFiles]
    );

    const editPreviewPhotos = useMemo(
        () => editPhotoFiles.map((file) => ({
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
        })),
        [editPhotoFiles]
    );

    const cutoffRange = useMemo(
        () => getCutoffRangeFromMonth(resultFilter.cutoffMonth),
        [resultFilter.cutoffMonth]
    );

    const filteredReports = useMemo(() => {
        return reports.filter((report) => {
            const reportDate = String(report?.visit_date || "").slice(0, 10);
            if (!reportDate) return false;

            if (resultFilter.outlet !== "all" && String(report.outlet_id) !== String(resultFilter.outlet)) {
                return false;
            }

            if (resultFilter.mode === "cutoff") {
                return reportDate >= cutoffRange.start && reportDate <= cutoffRange.end;
            }

            if (resultFilter.mode === "date") {
                return reportDate === resultFilter.date;
            }

            if (resultFilter.mode === "month") {
                return reportDate.slice(0, 7) === resultFilter.month;
            }

            if (resultFilter.mode === "range") {
                if (!resultFilter.rangeStart || !resultFilter.rangeEnd) return true;
                return reportDate >= resultFilter.rangeStart && reportDate <= resultFilter.rangeEnd;
            }

            return true;
        });
    }, [cutoffRange.end, cutoffRange.start, reports, resultFilter]);

    const reportSummary = useMemo(() => {
        const base = {
            totalReports: filteredReports.length,
            uniqueOutlets: 0,
            needsAttentionCount: 0,
            issueCount: 0,
            lowStockCount: 0,
            avgScore: 0,
            topProblemOutlets: [],
            topProblemChemicals: [],
        };

        if (filteredReports.length === 0) return base;

        const outletSet = new Set();
        const outletIssueCounter = {};
        const chemicalCounter = {};

        let scoreTotal = 0;
        filteredReports.forEach((report) => {
            outletSet.add(String(report.outlet_name || report.outlet_id || "-"));
            scoreTotal += Number(report.avg_score || 0);

            const analysis = analyzeReport(report);
            if (analysis.needsAttention) {
                base.needsAttentionCount += 1;
                const outletKey = String(report.outlet_name || "Outlet");
                outletIssueCounter[outletKey] = (outletIssueCounter[outletKey] || 0) + 1;
            }
            if (analysis.hasIssue) {
                base.issueCount += 1;
            }

            const items = Array.isArray(report.chemical_items) ? report.chemical_items : [];
            items.forEach((item) => {
                if (item?.status === "Sedikit" || item?.status === "Habis") {
                    const name = toTitleCase(item?.name || "Chemical");
                    chemicalCounter[name] = (chemicalCounter[name] || 0) + 1;
                    base.lowStockCount += 1;
                }
            });
        });

        base.uniqueOutlets = outletSet.size;
        base.avgScore = Number((scoreTotal / filteredReports.length).toFixed(2));
        base.topProblemOutlets = Object.entries(outletIssueCounter)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
        base.topProblemChemicals = Object.entries(chemicalCounter)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return base;
    }, [filteredReports]);

    useEffect(() => {
        return () => {
            previewPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
        };
    }, [previewPhotos]);

    useEffect(() => {
        return () => {
            editPreviewPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
        };
    }, [editPreviewPhotos]);

    useEffect(() => {
        if (!isWaschenOnlyPage) return;

        const loadMeta = async () => {
            setLoadingMeta(true);
            setError("");
            try {
                const data = await api("/operational/chemical-leader/meta");
                const nextLeaders = Array.isArray(data.leaders) ? data.leaders : [];
                const nextOutlets = Array.isArray(data.outlets) ? data.outlets : [];
                const nextChemicalOptions =
                    Array.isArray(data.chemicalOptions) && data.chemicalOptions.length > 0
                        ? data.chemicalOptions
                        : FALLBACK_CHEMICAL_OPTIONS;
                const nextScoreOptions =
                    Array.isArray(data.scoreOptions) && data.scoreOptions.length > 0
                        ? data.scoreOptions
                        : FALLBACK_SCORE_OPTIONS;

                setLeaders(nextLeaders);
                setOutlets(nextOutlets);
                setChemicalOptions(nextChemicalOptions);
                setScoreOptions(nextScoreOptions);
                setChemicalRows(buildChemicalRows(nextChemicalOptions, nextScoreOptions));
            } catch (err) {
                setError(err.message || "Gagal mengambil data form.");
                setChemicalRows(buildChemicalRows(FALLBACK_CHEMICAL_OPTIONS, FALLBACK_SCORE_OPTIONS));
            } finally {
                setLoadingMeta(false);
            }
        };

        loadMeta();
    }, [isWaschenOnlyPage]);

    const loadReports = useCallback(async () => {
        if (!isWaschenOnlyPage) return;

        setLoadingReports(true);
        try {
            const data = await api("/operational/chemical-leader/reports?limit=200");
            setReports(Array.isArray(data.reports) ? data.reports : []);
        } catch (err) {
            setError(err.message || "Gagal mengambil data hasil pengisian.");
        } finally {
            setLoadingReports(false);
        }
    }, [isWaschenOnlyPage]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleLeaderToggle = (employeeId) => {
        setSelectedLeaderIds((prev) => {
            if (prev.includes(employeeId)) return prev.filter((id) => id !== employeeId);
            return [...prev, employeeId];
        });
    };

    const handleChemicalStatusChange = (index, statusLabel) => {
        setChemicalRows((prev) =>
            prev.map((row, idx) => (idx === index ? { ...row, status: statusLabel } : row))
        );
    };

    const handleAddCustomChemical = () => {
        const name = toTitleCase(customChemicalName);
        if (!name) return;

        const defaultStatus = scoreOptions[0]?.label || "Aman";
        setChemicalRows((prev) => [...prev, { name, status: defaultStatus, custom: true }]);
        setCustomChemicalName("");
    };

    const handleRemoveCustomChemical = (index) => {
        setChemicalRows((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handlePhotoPick = (event) => {
        const pickedFiles = Array.from(event.target.files || []);
        if (pickedFiles.length === 0) return;

        setPhotoFiles((prev) => [...prev, ...pickedFiles]);
        event.target.value = "";
    };

    const handleRemovePhoto = (index) => {
        setPhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
    };

    const openEditReport = (report) => {
        const leaderIds = Array.isArray(report?.leader_employee_ids)
            ? report.leader_employee_ids.map((id) => Number(id))
            : [];
        const visit = String(report?.visit_date || "").slice(0, 10) || todayIso();
        const outletId = report?.outlet_id ? String(report.outlet_id) : "";
        const chemicalItems = Array.isArray(report?.chemical_items) ? report.chemical_items : [];
        const nextChemicalRows = chemicalItems.length > 0
            ? buildReportChemicalRows(chemicalItems, chemicalOptions, scoreOptions)
            : buildChemicalRows(chemicalOptions, scoreOptions);

        setExpandedReportId(report.report_id);
        setEditReportId(report.report_id);
        setEditVisitDate(visit);
        setEditSelectedLeaderIds(leaderIds);
        setEditSelectedOutletId(outletId);
        setEditChemicalRows(nextChemicalRows);
        setEditCustomChemicalName("");
        setEditPhotoFiles([]);
        setEditExistingPhotoPaths(Array.isArray(report?.photo_paths) ? report.photo_paths : []);
        setEditRemovedPhotoPaths([]);
        setEditOutletIssue(report?.outlet_issue || "");
        setEditSuggestionImprovement(report?.suggestion_improvement || "");
        setEditError("");
    };

    const closeEditReport = () => {
        setEditReportId(null);
        setEditPhotoFiles([]);
        setEditExistingPhotoPaths([]);
        setEditRemovedPhotoPaths([]);
        setEditCustomChemicalName("");
        setEditError("");
    };

    const handleEditLeaderToggle = (employeeId) => {
        setEditSelectedLeaderIds((prev) => {
            if (prev.includes(employeeId)) return prev.filter((id) => id !== employeeId);
            return [...prev, employeeId];
        });
    };

    const handleEditChemicalStatusChange = (index, statusLabel) => {
        setEditChemicalRows((prev) =>
            prev.map((row, idx) => (idx === index ? { ...row, status: statusLabel } : row))
        );
    };

    const handleEditAddCustomChemical = () => {
        const name = toTitleCase(editCustomChemicalName);
        if (!name) return;

        const defaultStatus = scoreOptions[0]?.label || "Aman";
        setEditChemicalRows((prev) => [...prev, { name, status: defaultStatus, custom: true }]);
        setEditCustomChemicalName("");
    };

    const handleEditRemoveCustomChemical = (index) => {
        setEditChemicalRows((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleEditPhotoPick = (event) => {
        const pickedFiles = Array.from(event.target.files || []);
        if (pickedFiles.length === 0) return;

        setEditPhotoFiles((prev) => [...prev, ...pickedFiles]);
        event.target.value = "";
    };

    const handleEditRemovePhoto = (index) => {
        setEditPhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleToggleRemoveExistingPhoto = (photoPath) => {
        setEditRemovedPhotoPaths((prev) =>
            prev.includes(photoPath)
                ? prev.filter((path) => path !== photoPath)
                : [...prev, photoPath]
        );
    };

    const handleUpdateReport = async (event) => {
        event.preventDefault();
        setEditError("");

        if (!editVisitDate) {
            setEditError("Tanggal kunjungan wajib diisi.");
            return;
        }
        if (editSelectedLeaderIds.length === 0) {
            setEditError("Pilih minimal 1 Leader Operasional.");
            return;
        }
        if (!editSelectedOutletId) {
            setEditError("Pilih cabang/outlet terlebih dahulu.");
            return;
        }

        const normalizedChemicals = editChemicalRows
            .map((row) => {
                const scoreRef = scoreOptions.find((option) => option.label === row.status);
                return {
                    name: row.name,
                    status: row.status,
                    score: Number(scoreRef?.score || 0),
                };
            })
            .filter((row) => String(row.name || "").trim());

        if (normalizedChemicals.length === 0) {
            setEditError("Minimal 1 item chemical harus diisi.");
            return;
        }

        const formData = new FormData();
        formData.append("visit_date", editVisitDate);
        formData.append("leader_employee_ids", JSON.stringify(editSelectedLeaderIds));
        formData.append("outlet_id", String(editSelectedOutletId));
        formData.append("chemicals", JSON.stringify(normalizedChemicals));
        formData.append("outlet_issue", editOutletIssue || "");
        formData.append("suggestion_improvement", editSuggestionImprovement || "");

        if (editRemovedPhotoPaths.length > 0) {
            formData.append("deleted_photo_paths", JSON.stringify(editRemovedPhotoPaths));
        }
        editPhotoFiles.forEach((file) => formData.append("photos", file));

        setEditSaving(true);
        try {
            await apiUpload(`/operational/chemical-leader/reports/${editReportId}`, {
                method: "PUT",
                body: formData,
            });

            await loadReports();
            closeEditReport();
        } catch (err) {
            setEditError(err.message || "Gagal mengupdate report.");
        } finally {
            setEditSaving(false);
        }
    };

    const handleDeleteReport = async (reportId) => {
        const confirmed = window.confirm("Hapus report ini? Data tidak bisa dikembalikan.");
        if (!confirmed) return;

        setDeletingReportId(reportId);
        try {
            await api(`/operational/chemical-leader/reports/${reportId}`, { method: "DELETE" });
            await loadReports();
            if (expandedReportId === reportId) setExpandedReportId(null);
            if (editReportId === reportId) closeEditReport();
        } catch (err) {
            setError(err.message || "Gagal menghapus report.");
        } finally {
            setDeletingReportId(null);
        }
    };

    const resetForm = () => {
        setVisitDate(todayIso());
        setSelectedLeaderIds([]);
        setSelectedOutletId("");
        setChemicalRows(buildChemicalRows(chemicalOptions, scoreOptions));
        setCustomChemicalName("");
        setPhotoFiles([]);
        setOutletIssue("");
        setSuggestionImprovement("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!visitDate) {
            setError("Tanggal kunjungan wajib diisi.");
            return;
        }
        if (selectedLeaderIds.length === 0) {
            setError("Pilih minimal 1 Leader Operasional.");
            return;
        }
        if (!selectedOutletId) {
            setError("Pilih cabang/outlet terlebih dahulu.");
            return;
        }

        const normalizedChemicals = chemicalRows
            .map((row) => {
                const scoreRef = scoreOptions.find((option) => option.label === row.status);
                return {
                    name: row.name,
                    status: row.status,
                    score: Number(scoreRef?.score || 0),
                };
            })
            .filter((row) => String(row.name || "").trim());

        if (normalizedChemicals.length === 0) {
            setError("Minimal 1 item chemical harus diisi.");
            return;
        }

        const formData = new FormData();
        formData.append("visit_date", visitDate);
        formData.append("leader_employee_ids", JSON.stringify(selectedLeaderIds));
        formData.append("outlet_id", String(selectedOutletId));
        formData.append("chemicals", JSON.stringify(normalizedChemicals));
        formData.append("outlet_issue", outletIssue || "");
        formData.append("suggestion_improvement", suggestionImprovement || "");
        photoFiles.forEach((file) => formData.append("photos", file));

        setSaving(true);
        try {
            await apiUpload("/operational/chemical-leader/reports", {
                method: "POST",
                body: formData,
            });

            setSuccess("Form Leader Operasional berhasil disimpan.");
            resetForm();
            await loadReports();
            setActiveMenu("result");
        } catch (err) {
            setError(err.message || "Gagal menyimpan form.");
        } finally {
            setSaving(false);
        }
    };

    if (!isWaschenOnlyPage) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
                <div className={cn("mb-5 flex h-20 w-20 items-center justify-center rounded-2xl", companyConfig.heroShellClass)}>
                    <HiOutlineClock className={cn("h-10 w-10", companyConfig.heroIconClass)} />
                </div>
                <h2 className="mb-2 text-xl font-extrabold text-slate-800">Chemical & Treatment</h2>
                <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    Fitur ini khusus untuk Waschen Laundry (company_id = 5). Silakan pilih company Waschen
                    di dropdown untuk mengakses halaman ini.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", companyConfig.brandShellClass)}>
                    <HiOutlineBeaker className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-extrabold leading-tight text-slate-800">Chemical & Treatment</h1>
                    <p className="text-xs text-slate-400">Form dan hasil kunjungan Leader Operasional</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex border-b border-slate-200 bg-slate-50">
                    <button
                        type="button"
                        onClick={() => setActiveMenu("form")}
                        className={cn(
                            "px-5 py-3 text-sm font-semibold transition",
                            activeMenu === "form"
                                ? "border-t-4 border-blue-500 bg-white text-slate-800"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Leader Operasional
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMenu("result")}
                        className={cn(
                            "px-5 py-3 text-sm font-semibold transition",
                            activeMenu === "result"
                                ? "border-t-4 border-blue-500 bg-white text-slate-800"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Hasil Leader Operasional
                    </button>
                </div>

                {loadingMeta && activeMenu === "form" && (
                    <div className="p-6 text-sm text-slate-500">Memuat data form...</div>
                )}

                {!loadingMeta && activeMenu === "form" && (
                    <form onSubmit={handleSubmit} className="space-y-5 p-5 md:p-6">
                        {(error || success) && (
                            <div
                                className={cn(
                                    "rounded-xl px-4 py-3 text-sm",
                                    error
                                        ? "border border-rose-200 bg-rose-50 text-rose-700"
                                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                )}
                            >
                                {error || success}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Tanggal Kunjungan</span>
                                <input
                                    type="date"
                                    value={visitDate}
                                    onChange={(e) => setVisitDate(e.target.value)}
                                    className={cn(
                                        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition",
                                        companyConfig.focusClass
                                    )}
                                />
                            </label>

                            <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Cabang / Outlet</span>
                                <select
                                    value={selectedOutletId}
                                    onChange={(e) => setSelectedOutletId(e.target.value)}
                                    className={cn(
                                        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition",
                                        companyConfig.focusClass
                                    )}
                                >
                                    <option value="">Pilih outlet</option>
                                    {outlets.map((outlet) => (
                                        <option key={outlet.id} value={outlet.id}>
                                            {outlet.full_name || outlet.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <HiOutlineUsers className="h-4 w-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-slate-700">Nama Leader Operasional (multi pilih)</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {leaders.map((leader) => {
                                    const checked = selectedLeaderIds.includes(Number(leader.employee_id));
                                    return (
                                        <label
                                            key={leader.employee_id}
                                            className={cn(
                                                "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                                                checked
                                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-300"
                                                checked={checked}
                                                onChange={() => handleLeaderToggle(Number(leader.employee_id))}
                                            />
                                            <span>{toTitleCase(leader.full_name)}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-slate-700">Chemical (dengan scoring)</h3>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={customChemicalName}
                                        onChange={(e) => setCustomChemicalName(e.target.value)}
                                        placeholder="Tambah chemical custom"
                                        className={cn(
                                            "rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none transition",
                                            companyConfig.focusClass
                                        )}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomChemical}
                                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                    >
                                        <HiOutlinePlus className="h-3.5 w-3.5" />
                                        Tambah
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {chemicalRows.map((row, index) => {
                                    const selectedScore = scoreOptions.find((option) => option.label === row.status)?.score || 0;
                                    return (
                                        <div
                                            key={`${row.name}-${index}`}
                                            className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_200px_auto_auto] md:items-center"
                                        >
                                            <span className="text-sm font-medium text-slate-700">{row.name}</span>
                                            <select
                                                value={row.status}
                                                onChange={(e) => handleChemicalStatusChange(index, e.target.value)}
                                                className={cn(
                                                    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition",
                                                    companyConfig.focusClass
                                                )}
                                            >
                                                {scoreOptions.map((option) => (
                                                    <option key={option.label} value={option.label}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className={cn("inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold", getStatusClass(row.status))}>
                                                Score: {selectedScore}
                                            </span>
                                            {row.custom ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCustomChemical(index)}
                                                    className="inline-flex w-fit items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                                                >
                                                    <HiOutlineTrash className="h-3.5 w-3.5" />
                                                    Hapus
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-300">Default</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <HiOutlinePhoto className="h-4 w-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-slate-700">Foto keadaan outlet (multi foto)</h3>
                            </div>
                            <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600">
                                Klik untuk pilih foto
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoPick} />
                            </label>
                            {previewPhotos.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                    {previewPhotos.map((photo, index) => (
                                        <div key={`${photo.name}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                                            <img src={photo.url} alt={photo.name} className="h-24 w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePhoto(index)}
                                                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/70"
                                            >
                                                <HiOutlineTrash className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Isu Outlet</span>
                                <textarea
                                    value={outletIssue}
                                    onChange={(e) => setOutletIssue(e.target.value)}
                                    rows={4}
                                    className={cn(
                                        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition",
                                        companyConfig.focusClass
                                    )}
                                    placeholder="Tulis isu yang ditemukan di outlet, jika tidak ada atau aman, kosongi yaa!..."
                                />
                            </label>

                            <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Saran dan Perbaikan</span>
                                <textarea
                                    value={suggestionImprovement}
                                    onChange={(e) => setSuggestionImprovement(e.target.value)}
                                    rows={4}
                                    className={cn(
                                        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition",
                                        companyConfig.focusClass
                                    )}
                                    placeholder="Tulis rekomendasi perbaikan..."
                                />
                            </label>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white",
                                    saving ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"
                                )}
                            >
                                <HiOutlineCheckCircle className="h-4 w-4" />
                                {saving ? "Menyimpan..." : "Simpan Form"}
                            </button>
                        </div>
                    </form>
                )}

                {activeMenu === "result" && (
                    <div className="space-y-4 p-5 md:p-6">
                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {error}
                            </div>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-700">Filter Hasil Leader Operasional</h3>
                                <button
                                    type="button"
                                    onClick={() => setResultFilter(createInitialResultFilter())}
                                    className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Reset Filter
                                </button>
                            </div>

                            <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-white p-1">
                                {[
                                    { key: "cutoff", label: "Cutoff" },
                                    { key: "date", label: "Date" },
                                    { key: "month", label: "Month" },
                                    { key: "range", label: "Range" },
                                ].map((mode) => (
                                    <button
                                        key={mode.key}
                                        type="button"
                                        onClick={() => setResultFilter((prev) => ({ ...prev, mode: mode.key }))}
                                        className={cn(
                                            "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                                            resultFilter.mode === mode.key
                                                ? "bg-blue-600 text-white"
                                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                        )}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                                {resultFilter.mode === "cutoff" && (
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cutoff Bulan</span>
                                        <input
                                            type="month"
                                            value={resultFilter.cutoffMonth}
                                            onChange={(e) =>
                                                setResultFilter((prev) => ({
                                                    ...prev,
                                                    cutoffMonth: e.target.value,
                                                }))
                                            }
                                            className={cn(
                                                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                companyConfig.focusClass
                                            )}
                                        />
                                    </label>
                                )}

                                {resultFilter.mode === "date" && (
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tanggal</span>
                                        <input
                                            type="date"
                                            value={resultFilter.date}
                                            onChange={(e) => setResultFilter((prev) => ({ ...prev, date: e.target.value }))}
                                            className={cn(
                                                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                companyConfig.focusClass
                                            )}
                                        />
                                    </label>
                                )}

                                {resultFilter.mode === "month" && (
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bulan</span>
                                        <input
                                            type="month"
                                            value={resultFilter.month}
                                            onChange={(e) => setResultFilter((prev) => ({ ...prev, month: e.target.value }))}
                                            className={cn(
                                                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                companyConfig.focusClass
                                            )}
                                        />
                                    </label>
                                )}

                                {resultFilter.mode === "range" && (
                                    <>
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Range Start</span>
                                            <input
                                                type="date"
                                                value={resultFilter.rangeStart}
                                                onChange={(e) => setResultFilter((prev) => ({ ...prev, rangeStart: e.target.value }))}
                                                className={cn(
                                                    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                    companyConfig.focusClass
                                                )}
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Range End</span>
                                            <input
                                                type="date"
                                                value={resultFilter.rangeEnd}
                                                onChange={(e) => setResultFilter((prev) => ({ ...prev, rangeEnd: e.target.value }))}
                                                className={cn(
                                                    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                    companyConfig.focusClass
                                                )}
                                            />
                                        </label>
                                    </>
                                )}

                                <label className="space-y-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Outlet</span>
                                    <select
                                        value={resultFilter.outlet}
                                        onChange={(e) => setResultFilter((prev) => ({ ...prev, outlet: e.target.value }))}
                                        className={cn(
                                            "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                            companyConfig.focusClass
                                        )}
                                    >
                                        <option value="all">Semua Outlet</option>
                                        {outlets.map((outlet) => (
                                            <option key={outlet.id} value={outlet.id}>
                                                {outlet.full_name || outlet.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            {resultFilter.mode === "cutoff" && (
                                <p className="mt-2 text-xs font-medium text-blue-700">
                                    Cutoff aktif: {formatDate(cutoffRange.start)} sampai {formatDate(cutoffRange.end)}
                                </p>
                            )}
                        </div>

                        {loadingReports ? (
                            <div className="text-sm text-slate-500">Memuat hasil pengisian...</div>
                        ) : filteredReports.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                Tidak ada data hasil untuk filter yang dipilih.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Report</p>
                                        <p className="mt-1 text-xl font-extrabold text-slate-800">{reportSummary.totalReports}</p>
                                    </div>
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">Perlu Tindakan</p>
                                        <p className="mt-1 text-xl font-extrabold text-rose-700">{reportSummary.needsAttentionCount}</p>
                                    </div>
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Chemical Menipis/Habis</p>
                                        <p className="mt-1 text-xl font-extrabold text-amber-700">{reportSummary.lowStockCount}</p>
                                    </div>
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Rata-rata Score</p>
                                        <p className="mt-1 text-xl font-extrabold text-blue-700">{reportSummary.avgScore}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paslate-500">Outlet Dengan Isu</p>
                                        {reportSummary.topProblemOutlets.length === 0 ? (
                                            <p className="text-xs text-slate-400">Tidak ada outlet dengan indikator masalah di filter ini.</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {reportSummary.topProblemOutlets.map((item) => (
                                                    <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                                                        <span className="font-medium text-slate-700">{item.name}</span>
                                                        <span className="font-bold text-rose-600">{item.count} report</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chemical Report ⚠️</p>
                                        {reportSummary.topProblemChemicals.length === 0 ? (
                                            <p className="text-xs text-slate-400">Semua chemical masih aman pada data yang difilter.</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {reportSummary.topProblemChemicals.map((item) => (
                                                    <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                                                        <span className="font-medium text-slate-700">{item.name}</span>
                                                        <span className="font-bold text-amber-600">{item.count} temuan</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {filteredReports.map((report) => {
                                        const analysis = analyzeReport(report);
                                        const severityClass =
                                            analysis.severity === "Tinggi"
                                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                : analysis.severity === "Sedang"
                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                        const isExpanded = expandedReportId === report.report_id;

                                        return (
                                            <div key={report.report_id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedReportId(isExpanded ? null : report.report_id)}
                                                    className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-600"
                                                >
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                        <HiOutlineClock className="h-3.5 w-3.5" />
                                                        {formatDate(report.visit_date)}
                                                    </span>
                                                    <span className="text-slate-400">/</span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                        <HiOutlineBuildingStorefront className="h-3.5 w-3.5" />
                                                        {toTitleCase(report.outlet_name || "-")}
                                                    </span>
                                                    <span className="text-slate-400">/</span>
                                                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", severityClass)}>
                                                        Status: {analysis.severity}
                                                    </span>
                                                    <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                            Total score: {report.total_score || 0}
                                                        </span>
                                                        {isExpanded ? (
                                                            <HiOutlineChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <HiOutlineChevronRight className="h-4 w-4" />
                                                        )}
                                                    </span>
                                                </button>

                                                {isExpanded && (
                                                    <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditReport(report)}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                                            >
                                                                <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteReport(report.report_id)}
                                                                disabled={deletingReportId === report.report_id}
                                                                className={cn(
                                                                    "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold",
                                                                    deletingReportId === report.report_id
                                                                        ? "border-slate-200 bg-slate-100 text-slate-400"
                                                                        : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                                )}
                                                            >
                                                                <HiOutlineTrash className="h-3.5 w-3.5" />
                                                                Hapus
                                                            </button>
                                                            {editReportId === report.report_id && (
                                                                <span className="text-xs font-semibold text-blue-600">Mode edit aktif</span>
                                                            )}
                                                        </div>

                                                        {editReportId === report.report_id ? (
                                                            <form onSubmit={handleUpdateReport} className="space-y-4">
                                                                {editError && (
                                                                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                                                        {editError}
                                                                    </div>
                                                                )}

                                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                                    <label className="space-y-1">
                                                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tanggal Kunjungan</span>
                                                                        <input
                                                                            type="date"
                                                                            value={editVisitDate}
                                                                            onChange={(e) => setEditVisitDate(e.target.value)}
                                                                            className={cn(
                                                                                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                                                companyConfig.focusClass
                                                                            )}
                                                                        />
                                                                    </label>
                                                                    <label className="space-y-1">
                                                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cabang / Outlet</span>
                                                                        <select
                                                                            value={editSelectedOutletId}
                                                                            onChange={(e) => setEditSelectedOutletId(e.target.value)}
                                                                            className={cn(
                                                                                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                                                companyConfig.focusClass
                                                                            )}
                                                                        >
                                                                            <option value="">Pilih outlet</option>
                                                                            {outlets.map((outlet) => (
                                                                                <option key={outlet.id} value={outlet.id}>
                                                                                    {outlet.full_name || outlet.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </label>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leader Operasional</p>
                                                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                                        {leaders.map((leader) => {
                                                                            const checked = editSelectedLeaderIds.includes(Number(leader.employee_id));
                                                                            return (
                                                                                <label
                                                                                    key={leader.employee_id}
                                                                                    className={cn(
                                                                                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
                                                                                        checked
                                                                                            ? "border-blue-300 bg-blue-50 text-blue-700"
                                                                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                                                    )}
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="h-3.5 w-3.5 rounded border-slate-300"
                                                                                        checked={checked}
                                                                                        onChange={() => handleEditLeaderToggle(Number(leader.employee_id))}
                                                                                    />
                                                                                    <span>{toTitleCase(leader.full_name)}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chemical</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editCustomChemicalName}
                                                                                onChange={(e) => setEditCustomChemicalName(e.target.value)}
                                                                                placeholder="Tambah chemical"
                                                                                className={cn(
                                                                                    "rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none",
                                                                                    companyConfig.focusClass
                                                                                )}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={handleEditAddCustomChemical}
                                                                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                                                            >
                                                                                <HiOutlinePlus className="h-3.5 w-3.5" />
                                                                                Tambah
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {editChemicalRows.map((row, index) => {
                                                                            const selectedScore = scoreOptions.find((option) => option.label === row.status)?.score || 0;
                                                                            return (
                                                                                <div
                                                                                    key={`${row.name}-${index}`}
                                                                                    className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-[1fr_160px_auto_auto] md:items-center"
                                                                                >
                                                                                    <span className="text-xs font-medium text-slate-700">{row.name}</span>
                                                                                    <select
                                                                                        value={row.status}
                                                                                        onChange={(e) => handleEditChemicalStatusChange(index, e.target.value)}
                                                                                        className={cn(
                                                                                            "rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none",
                                                                                            companyConfig.focusClass
                                                                                        )}
                                                                                    >
                                                                                        {scoreOptions.map((option) => (
                                                                                            <option key={option.label} value={option.label}>
                                                                                                {option.label}
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                    <span className={cn("inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold", getStatusClass(row.status))}>
                                                                                        Score: {selectedScore}
                                                                                    </span>
                                                                                    {row.custom ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleEditRemoveCustomChemical(index)}
                                                                                            className="inline-flex w-fit items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                                                                                        >
                                                                                            <HiOutlineTrash className="h-3.5 w-3.5" />
                                                                                            Hapus
                                                                                        </button>
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-slate-300">Default</span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Foto Outlet</p>
                                                                    {editExistingPhotoPaths.length > 0 && (
                                                                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                                            {editExistingPhotoPaths.map((photoPath, idx) => {
                                                                                const removed = editRemovedPhotoPaths.includes(photoPath);
                                                                                return (
                                                                                    <button
                                                                                        key={`${photoPath}-${idx}`}
                                                                                        type="button"
                                                                                        onClick={() => handleToggleRemoveExistingPhoto(photoPath)}
                                                                                        className={cn(
                                                                                            "relative overflow-hidden rounded-lg border",
                                                                                            removed ? "border-rose-200 opacity-50" : "border-slate-200"
                                                                                        )}
                                                                                    >
                                                                                        <img src={assetUrl(photoPath)} alt="Foto outlet" className="h-20 w-full object-cover" />
                                                                                        <span className={cn(
                                                                                            "absolute bottom-1 right-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                                                            removed ? "bg-rose-100 text-rose-600" : "bg-slate-900/70 text-white"
                                                                                        )}>
                                                                                            {removed ? "Dihapus" : "Hapus"}
                                                                                        </span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                    <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600">
                                                                        Tambah foto baru
                                                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleEditPhotoPick} />
                                                                    </label>
                                                                    {editPreviewPhotos.length > 0 && (
                                                                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                                            {editPreviewPhotos.map((photo, index) => (
                                                                                <div key={`${photo.name}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                                    <img src={photo.url} alt={photo.name} className="h-20 w-full object-cover" />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleEditRemovePhoto(index)}
                                                                                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/70"
                                                                                    >
                                                                                        <HiOutlineTrash className="h-3.5 w-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                                    <label className="space-y-1">
                                                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Isu Outlet</span>
                                                                        <textarea
                                                                            value={editOutletIssue}
                                                                            onChange={(e) => setEditOutletIssue(e.target.value)}
                                                                            rows={3}
                                                                            className={cn(
                                                                                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                                                companyConfig.focusClass
                                                                            )}
                                                                        />
                                                                    </label>
                                                                    <label className="space-y-1">
                                                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Saran & Perbaikan</span>
                                                                        <textarea
                                                                            value={editSuggestionImprovement}
                                                                            onChange={(e) => setEditSuggestionImprovement(e.target.value)}
                                                                            rows={3}
                                                                            className={cn(
                                                                                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none",
                                                                                companyConfig.focusClass
                                                                            )}
                                                                        />
                                                                    </label>
                                                                </div>

                                                                <div className="flex flex-wrap justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={closeEditReport}
                                                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                                                    >
                                                                        Batal
                                                                    </button>
                                                                    <button
                                                                        type="submit"
                                                                        disabled={editSaving}
                                                                        className={cn(
                                                                            "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                                                                            editSaving ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"
                                                                        )}
                                                                    >
                                                                        {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs text-slate-500">
                                                                    Leader Operasional: {(report.leader_names || []).map((name) => toTitleCase(name)).join(", ") || "-"}
                                                                </p>

                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {analysis.habisCount > 0 && (
                                                                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                                                                            Habis: {analysis.habisCount}
                                                                        </span>
                                                                    )}
                                                                    {analysis.sedikitCount > 0 && (
                                                                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                                                                            Sedikit: {analysis.sedikitCount}
                                                                        </span>
                                                                    )}
                                                                    {analysis.hasIssue && (
                                                                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                                                                            Ada Isu Outlet
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                                    {(report.chemical_items || []).map((item, idx) => (
                                                                        <div key={`${report.report_id}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                                                                            <span className="text-xs font-medium text-slate-700">{toTitleCase(item.name)}</span>
                                                                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", getStatusClass(item.status))}>
                                                                                {item.status} ({item.score})
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                                        <p className="mb-1 text-xs font-semibold text-slate-600">Isu Outlet</p>
                                                                        <p className="text-xs leading-relaxed text-slate-500">{report.outlet_issue || "-"}</p>
                                                                    </div>
                                                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                                        <p className="mb-1 text-xs font-semibold text-slate-600">Saran & Perbaikan</p>
                                                                        <p className="text-xs leading-relaxed text-slate-500">{report.suggestion_improvement || "-"}</p>
                                                                    </div>
                                                                </div>

                                                                {Array.isArray(report.photo_paths) && report.photo_paths.length > 0 && (
                                                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                                                                        {report.photo_paths.map((photoPath, idx) => (
                                                                            <a
                                                                                key={`${report.report_id}-photo-${idx}`}
                                                                                href={assetUrl(photoPath)}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="overflow-hidden rounded-lg border border-slate-200"
                                                                            >
                                                                                <img src={assetUrl(photoPath)} alt={`Chemical report ${report.report_id}`} className="h-24 w-full object-cover" />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}