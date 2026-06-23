import { useState, useEffect } from "react";
import { api } from "../../../lib/api";

// ── Konfigurasi mood (light theme) ──────────────────────────────────────────
export const MOOD_OPTIONS = [
  {
    value: "lagi_bersinar",
    label: "Lagi Bersinar",
    emoji: "😎",
    color: "bg-yellow-50 border-yellow-300 hover:bg-yellow-100",
    selectedColor: "bg-yellow-400 border-yellow-400 ring-2 ring-yellow-300",
    textColor: "text-yellow-600",
    iconBg: "bg-yellow-200",
  },
  {
    value: "santai_positif",
    label: "Santai & Positif",
    emoji: "😊",
    color: "bg-green-50 border-green-300 hover:bg-green-100",
    selectedColor: "bg-green-400 border-green-400 ring-2 ring-green-300",
    textColor: "text-green-600",
    iconBg: "bg-green-200",
  },
  {
    value: "mode_standar",
    label: "Mode Standar",
    emoji: "😐",
    color: "bg-blue-50 border-blue-300 hover:bg-blue-100",
    selectedColor: "bg-blue-400 border-blue-400 ring-2 ring-blue-300",
    textColor: "text-blue-600",
    iconBg: "bg-blue-200",
  },
  {
    value: "agak_mendung",
    label: "Agak Mendung",
    emoji: "🙃",
    color: "bg-orange-50 border-orange-300 hover:bg-orange-100",
    selectedColor: "bg-orange-400 border-orange-400 ring-2 ring-orange-300",
    textColor: "text-orange-600",
    iconBg: "bg-orange-200",
  },
  {
    value: "cuaca_hati_kurang_baik",
    label: "Cuaca Hati Kurang Baik",
    emoji: "⛈️",
    color: "bg-purple-50 border-purple-300 hover:bg-purple-100",
    selectedColor: "bg-purple-400 border-purple-400 ring-2 ring-purple-300",
    textColor: "text-purple-600",
    iconBg: "bg-purple-200",
  },
];

export default function EmployeeMood({ isOpen, onClose, todayMood, onMoodSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedMood, setSelected] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (todayMood) {
      setSelected(todayMood.mood_level || "");
      setIsEditing(false);
    } else {
      setSelected("");
      setIsEditing(true);
    }
  }, [todayMood, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedMood) return;
    setSubmitting(true);
    try {
      const res = await api("/api/employee-mood", {
        method: "POST",
        body: JSON.stringify({ mood_level: selectedMood }),
      });
      if (res.success) {
        const savedData = {
          mood_level: selectedMood,
          mood_date: new Date().toISOString().slice(0, 10),
        };
        onMoodSaved(savedData);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("[EmployeeMood] Gagal simpan:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentOption = MOOD_OPTIONS.find((o) => o.value === todayMood?.mood_level);
  const todayDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-all text-xs"
          title="Tutup"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-sm">
              <span className="text-sm text-white">🧘</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Employee Mood</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{todayDate}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          {!isEditing && todayMood ? (
            /* SUDAH ISI VIEW */
            <div className="text-center space-y-4 py-2">
              <div className="text-5xl animate-bounce">{currentOption?.emoji || "🧘"}</div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">
                  Terima kasih telah mengisi E-Mood hari ini! 🙏
                </p>
                <p className="text-xs text-slate-500">
                  Mood kamu hari ini:{" "}
                  <span className={`font-bold ${currentOption?.textColor || "text-slate-600"}`}>
                    {currentOption?.label || "-"}
                  </span>
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-2 border-t border-slate-100">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-lg transition-all"
                >
                  ✏️ Ubah Mood Hari Ini
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            /* BELUM ISI / EDIT FORM VIEW */
            <div className="space-y-4">              
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {MOOD_OPTIONS.map((mood) => {
                  const isSelected = selectedMood === mood.value;
                  return (
                    <button
                      key={mood.value}
                      onClick={() => setSelected(mood.value)}
                      className={`flex flex-col items-center justify-between p-1.5 sm:p-2.5 rounded-xl border transition-all text-center group cursor-pointer
                        ${isSelected
                          ? mood.selectedColor + " text-white font-semibold shadow-md transform scale-105"
                          : mood.color + " text-slate-600 hover:scale-102 hover:shadow-sm"
                        }
                      `}
                    >
                      <div className="flex-1 flex items-center justify-center min-h-[40px] sm:min-h-[48px]">
                        <span className={`h-9 w-9 sm:h-11 sm:w-11 rounded-full flex items-center justify-center text-lg sm:text-2xl transition-all group-hover:scale-110
                          ${isSelected ? "bg-white/30 ring-2 ring-white/50" : mood.iconBg}
                        `}>
                          {mood.emoji}
                        </span>
                      </div>
                      <span className="mt-1 text-[8px] sm:text-[10px] font-semibold leading-tight break-words w-full min-h-[24px] sm:min-h-[28px] flex items-center justify-center">
                        {mood.label}
                      </span>
                      {isSelected && (
                        <span className="text-[8px] sm:text-[9px] mt-0.5 bg-white/20 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex gap-2">
                {todayMood && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!selectedMood || submitting}
                  className={`flex-[2] py-2 rounded-lg text-xs font-semibold transition-all shadow-sm
                    ${selectedMood && !submitting
                      ? "bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white shadow-md"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }
                  `}
                >
                  {submitting ? "Menyimpan..." : "Simpan Mood Hari Ini"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
