import { useEffect, useState, useCallback } from "react";
import {
    HiBell, HiPlus, HiChevronDown, HiX,
    HiInformationCircle, HiExclamation, HiCheckCircle, HiExclamationCircle,
    HiChevronLeft, HiChevronRight, HiMail,
} from "react-icons/hi";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { api } from "../../../lib/api";
import { getEmployeeFromLocal, canSupervisorUp } from "../../project-management/role";

// ── Config ────────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    info: { gradient: "linear-gradient(135deg,#3b82f6,#4f46e5)", Icon: HiInformationCircle, label: "Informasi", pill: "#dbeafe", pillText: "#1d4ed8", glow: "rgba(59,130,246,.25)" },
    warning: { gradient: "linear-gradient(135deg,#f59e0b,#ef4444)", Icon: HiExclamation, label: "Perhatian", pill: "#fef3c7", pillText: "#b45309", glow: "rgba(245,158,11,.25)" },
    success: { gradient: "linear-gradient(135deg,#10b981,#059669)", Icon: HiCheckCircle, label: "Event", pill: "#d1fae5", pillText: "#047857", glow: "rgba(16,185,129,.25)" },
    urgent: { gradient: "linear-gradient(135deg,#ef4444,#be123c)", Icon: HiExclamationCircle, label: "Penting", pill: "#fee2e2", pillText: "#b91c1c", glow: "rgba(239,68,68,.25)" },
};

const DURATION_PRESETS = [
    { label: "1 Jam", hours: 1 },
    { label: "6 Jam", hours: 6 },
    { label: "12 Jam", hours: 12 },
    { label: "1 Hari", hours: 24 },
    { label: "3 Hari", hours: 72 },
    { label: "1 Minggu", hours: 168 },
    { label: "1 Bulan", hours: 720 },
    { label: "Custom", hours: null },
];

const capitalizeEachWord = (text) =>
    text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

function addHonorific(fullName = "") {
    const name = String(fullName).trim();
    if (!name) return "";

    // kalau sudah ada sapaan, jangan dobel
    const lower = name.toLowerCase();
    if (
        lower.startsWith("bapak ") ||
        lower.startsWith("ibu ") ||
        lower.startsWith("pak ") ||
        lower.startsWith("bu ")
    ) {
        return name;
    }

    // ambil nama depan
    const first = lower.split(/\s+/)[0];

    // daftar sederhana (bisa kamu tambah)
    const MALE = new Set(["oemar", "faruk", "faruq"]);
    const FEMALE = new Set(["rahmi", "solehah"]);

    if (MALE.has(first)) return `Bapak ${name}`;
    if (FEMALE.has(first)) return `Ibu ${name}`;

    // fallback (kalau gak yakin)
    return name;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.bb-root * { box-sizing: border-box; }
.bb-root { font-family: 'Plus Jakarta Sans', sans-serif; }

.bb-wrap {
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}

.bb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  background: #fafafa;
  border-bottom: 1.5px solid #f0f0f5;
  gap: 8px;
}
.bb-header-left {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}
.bb-header-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(135deg,#1e293b,#334155);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,.18);
  color: #fff;
}
.bb-header-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bb-badge-count {
  background: #ef4444;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 99px;
  flex-shrink: 0;
  line-height: 1.5;
}
.bb-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.bb-add-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #1e293b;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s, transform .12s;
  font-family: inherit;
}
.bb-add-btn:hover { background: #334155; transform: translateY(-1px); }
.bb-chevron-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background .15s;
  color: #94a3b8;
}
.bb-chevron-btn:hover { background: #f1f5f9; }
.bb-chevron-btn svg { transition: transform .25s ease; }
.bb-chevron-btn.open svg { transform: rotate(180deg); }

.bb-body {
  overflow: hidden;
  transition: max-height .3s ease, opacity .25s ease;
}
.bb-body.collapsed { max-height: 0 !important; opacity: 0; }
.bb-body.expanded  { opacity: 1; }

.bb-carousel { padding: 12px 14px 10px; }

.bb-slide { display: none; animation: bbFadeIn .22s ease; }
.bb-slide.active { display: block; }
@keyframes bbFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.bb-card {
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  border: 1.5px solid #e5e7eb;
  background: #fff;
}
.bb-card-stripe { height: 3.5px; width: 100%; }
.bb-card-inner {
  padding: 11px 13px 12px;
  display: flex;
  gap: 11px;
  align-items: flex-start;
}
.bb-card-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 3px 8px var(--glow, rgba(0,0,0,.1));
}
.bb-card-body { flex: 1; min-width: 0; }
.bb-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}
.bb-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.bb-type-pill {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .04em;
  padding: 2px 7px;
  border-radius: 99px;
  text-transform: uppercase;
}
.bb-timer {
  font-size: 9.5px;
  font-weight: 500;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 3px;
}
.bb-timer-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: .3; }
}
.bb-dismiss {
  width: 20px; height: 20px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  transition: background .15s, color .15s;
  flex-shrink: 0;
  padding: 0;
}
.bb-dismiss:hover { background: #f1f5f9; color: #475569; }

.bb-card-title {
  font-size: 12.5px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.35;
  margin-bottom: 4px;
}
.bb-card-desc {
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.55;
}
.bb-card-desc.clamped { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.bb-expand-btn {
  font-size: 10px;
  font-weight: 600;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
  font-family: inherit;
}
.bb-expand-btn:hover { text-decoration: underline; }

.bb-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}
.bb-card-author { font-size: 9.5px; color: #94a3b8; }
.bb-card-author span { color: #64748b; font-weight: 600; }
.bb-card-date { font-size: 9.5px; color: #94a3b8; }

.bb-card.urgent-glow {
  box-shadow: 0 0 0 2px rgba(239,68,68,.2), 0 4px 14px rgba(239,68,68,.12);
  border-color: rgba(239,68,68,.3);
}

.bb-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 14px 12px;
}
.bb-nav-btn {
  width: 26px; height: 26px;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
  color: #64748b;
}
.bb-nav-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.bb-nav-btn:disabled { opacity: .3; cursor: not-allowed; }

.bb-dots {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  justify-content: center;
}
.bb-dot {
  height: 5px;
  border-radius: 99px;
  border: none;
  cursor: pointer;
  transition: all .2s ease;
  padding: 0;
}
.bb-dot.inactive { width: 5px; background: #e2e8f0; }
.bb-dot.inactive:hover { background: #94a3b8; }
.bb-dot.active-dot { width: 18px; }

.bb-counter {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  white-space: nowrap;
}

.bb-empty { text-align: center; padding: 28px 16px; }
.bb-empty-icon { display: flex; justify-content: center; margin-bottom: 8px; color: #cbd5e1; }
.bb-empty-text { font-size: 12px; color: #94a3b8; font-weight: 500; }
.bb-empty-link { font-size: 11px; color: #64748b; text-decoration: underline; cursor: pointer; background: none; border: none; font-family: inherit; margin-top: 4px; display: block; margin-inline: auto; }

/* ─ Modal ─ */
.bb-modal-overlay {
  position: fixed; inset: 0; z-index: 50;
  display: flex; align-items: flex-start; justify-content: center;
  background: rgba(0,0,0,.45);
  backdrop-filter: blur(4px);
  padding: 12px;
  overflow-y: auto;
}
.bb-modal {
  width: 100%; max-width: 480px;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,.18);
  margin: auto;
  animation: bbModalIn .2s ease;
}
@keyframes bbModalIn {
  from { opacity: 0; transform: translateY(12px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.bb-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 16px;
  border-bottom: 1.5px solid #f1f5f9;
}
.bb-modal-title { font-size: 14px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 7px; }
.bb-modal-sub   { font-size: 10.5px; color: #94a3b8; margin-top: 2px; font-weight: 400; }
.bb-modal-close {
  width: 30px; height: 30px; border-radius: 9px;
  border: none; background: #f1f5f9; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748b; transition: background .15s;
}
.bb-modal-close:hover { background: #e2e8f0; }

.bb-modal-form { padding: 18px 20px; display: flex; flex-direction: column; gap: 15px; }

.bb-field-label {
  display: block;
  font-size: 11px; font-weight: 700; color: #374151;
  margin-bottom: 6px;
  letter-spacing: .01em;
}
.bb-field-label .req { color: #ef4444; }

.bb-input, .bb-textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 12.5px;
  font-family: inherit;
  color: #1e293b;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  background: #fff;
}
.bb-input:focus, .bb-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,.12);
}
.bb-textarea { resize: none; }

.bb-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.bb-type-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 4px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: #f8fafc;
  cursor: pointer;
  font-size: 9.5px; font-weight: 700;
  color: #64748b;
  transition: all .15s;
  font-family: inherit;
}
.bb-type-btn:hover { border-color: #cbd5e1; background: #f1f5f9; }
.bb-type-btn.selected { color: #fff; border-color: transparent; box-shadow: 0 3px 10px rgba(0,0,0,.15); }

.bb-preset-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.bb-preset-chip {
  padding: 5px 11px;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  background: #f8fafc;
  font-size: 10.5px; font-weight: 600;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}
.bb-preset-chip:hover { background: #f1f5f9; border-color: #cbd5e1; }
.bb-preset-chip.sel { background: #1e293b; color: #fff; border-color: #1e293b; }

.bb-datetime-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
.bb-dt-label { font-size: 9.5px; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }
.bb-dt-input {
  width: 100%; height: 36px;
  padding: 0 10px;
  border: 1.5px solid #e5e7eb;
  border-radius: 9px;
  font-size: 11px; font-family: inherit;
  color: #1e293b; outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.bb-dt-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }

.bb-preview {
  border-radius: 12px;
  padding: 10px 13px;
  border: 1.5px solid transparent;
}
.bb-preview-tag {
  display: flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 800; letter-spacing: .06em;
  text-transform: uppercase; opacity: .7; margin-bottom: 4px;
}
.bb-preview-title { font-size: 12px; font-weight: 800; color: #1e293b; }
.bb-preview-desc  { font-size: 11px; opacity: .75; margin-top: 3px; }

.bb-error {
  padding: 9px 13px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  font-size: 11px; color: #b91c1c; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
}

.bb-modal-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 14px 20px;
  border-top: 1.5px solid #f1f5f9;
  background: #fafafa;
}
.bb-cancel-btn {
  padding: 8px 16px;
  border-radius: 9px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  font-size: 11.5px; font-weight: 600;
  color: #475569; cursor: pointer;
  font-family: inherit;
  transition: background .15s;
}
.bb-cancel-btn:hover { background: #f8fafc; }
.bb-submit-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px;
  border-radius: 9px;
  border: none;
  background: #1e293b;
  color: #fff;
  font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background .15s, transform .12s;
}
.bb-submit-btn:hover:not(:disabled) { background: #334155; transform: translateY(-1px); }
.bb-submit-btn:disabled { opacity: .55; cursor: not-allowed; }
.bb-spin {
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
`;

// ── Countdown ─────────────────────────────────────────────────────────────────
function useCountdown(expiresAt) {
    const calc = useCallback(() => {
        const diff = Math.max(0, new Date(expiresAt) - Date.now());
        return {
            d: Math.floor(diff / 86400000),
            h: Math.floor((diff % 86400000) / 3600000),
            m: Math.floor((diff % 3600000) / 60000),
            s: Math.floor((diff % 60000) / 1000),
            total: diff,
        };
    }, [expiresAt]);
    const [left, setLeft] = useState(calc);
    useEffect(() => {
        const t = setInterval(() => setLeft(calc()), 1000);
        return () => clearInterval(t);
    }, [calc]);
    return left;
}

function timeLabel(cd) {
    if (cd.d > 0) return `${cd.d}h ${cd.h}j`;
    if (cd.h > 0) return `${cd.h}j ${cd.m}m`;
    return `${cd.m}m ${cd.s}s`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function AddBroadcastModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ title: "", description: "", type: "info", starts_at: "", expires_at: "" });
    const [preset, setPreset] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    const applyPreset = (hours) => {
        setPreset(hours);
        if (!hours) return;
        const now = new Date();
        const expire = new Date(now.getTime() + hours * 3600000);
        const toLocal = (d) =>
            new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        set("starts_at", toLocal(now));
        set("expires_at", toLocal(expire));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!form.title.trim()) return setError("Judul wajib diisi");
        if (!form.description.trim()) return setError("Deskripsi wajib diisi");
        if (!form.expires_at) return setError("Waktu kadaluarsa wajib diisi");
        setSaving(true);
        try {
            const result = await api("/broadcast", { method: "POST", body: JSON.stringify(form) });
            onSaved(result.broadcast);
            onClose();
        } catch (err) {
            setError(err?.message || "Gagal menyimpan broadcast");
        } finally {
            setSaving(false);
        }
    };

    const cfg = TYPE_CONFIG[form.type];
    const CfgIcon = cfg.Icon;

    return (
        <div className="bb-modal-overlay">
            <div className="bb-modal">
                {/* Header */}
                <div className="bb-modal-header">
                    <div>
                        <div className="bb-modal-title">
                            <HiMiniSpeakerWave size={16} />
                            Buat Pengumuman
                        </div>
                        <div className="bb-modal-sub">Akan tampil untuk seluruh karyawan</div>
                    </div>
                    <button className="bb-modal-close" onClick={onClose}>
                        <HiX size={14} />
                    </button>
                </div>

                {/* Form */}
                <div className="bb-modal-form">
                    {error && (
                        <div className="bb-error">
                            <HiExclamationCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="bb-field-label">Judul <span className="req">*</span></label>
                        <input className="bb-input" placeholder="Contoh: Libur Nasional Idul Fitri" value={form.title}
                            onChange={(e) => set("title", e.target.value)} />
                    </div>

                    <div>
                        <label className="bb-field-label">Deskripsi <span className="req">*</span></label>
                        <textarea className="bb-textarea" rows={3} placeholder="Tulis isi pengumuman secara jelas..."
                            value={form.description} onChange={(e) => set("description", e.target.value)} />
                    </div>

                    <div>
                        <label className="bb-field-label">Tipe</label>
                        <div className="bb-type-grid">
                            {Object.entries(TYPE_CONFIG).map(([key, c]) => {
                                const TIcon = c.Icon;
                                return (
                                    <button key={key} type="button"
                                        className={`bb-type-btn${form.type === key ? " selected" : ""}`}
                                        style={form.type === key ? { background: c.gradient } : {}}
                                        onClick={() => set("type", key)}>
                                        <TIcon size={20} />
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="bb-field-label">Durasi Tampil <span className="req">*</span></label>
                        <div className="bb-preset-wrap">
                            {DURATION_PRESETS.map((p) => (
                                <button key={p.label} type="button"
                                    className={`bb-preset-chip${preset === p.hours ? " sel" : ""}`}
                                    onClick={() => applyPreset(p.hours)}>{p.label}</button>
                            ))}
                        </div>
                        <div className="bb-datetime-row">
                            <div>
                                <div className="bb-dt-label">Mulai Tayang</div>
                                <input type="datetime-local" className="bb-dt-input" value={form.starts_at}
                                    onChange={(e) => set("starts_at", e.target.value)} />
                            </div>
                            <div>
                                <div className="bb-dt-label">Berakhir <span style={{ color: "#ef4444" }}>*</span></div>
                                <input type="datetime-local" className="bb-dt-input" value={form.expires_at}
                                    onChange={(e) => set("expires_at", e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {form.title && (
                        <div className="bb-preview" style={{ background: cfg.pill, borderColor: cfg.pillText + "33" }}>
                            <div className="bb-preview-tag" style={{ color: cfg.pillText }}>
                                <CfgIcon size={10} /> Preview
                            </div>
                            <div className="bb-preview-title">{form.title}</div>
                            {form.description && (
                                <div className="bb-preview-desc" style={{ color: cfg.pillText }}>{form.description}</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bb-modal-footer">
                    <button className="bb-cancel-btn" type="button" onClick={onClose} disabled={saving}>Batal</button>
                    <button className="bb-submit-btn" type="button" onClick={handleSubmit} disabled={saving}>
                        {saving
                            ? <><div className="bb-spin" />Menyimpan...</>
                            : <><HiBell size={13} />Publish</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── BroadcastSlide ────────────────────────────────────────────────────────────
function BroadcastSlide({ broadcast, onDismiss, isActive }) {
    const cfg = TYPE_CONFIG[broadcast.type] || TYPE_CONFIG.info;
    const cd = useCountdown(broadcast.expires_at);
    const [expanded, setExpanded] = useState(false);

    const CardIcon = cfg.Icon;

    return (
        <div className={`bb-slide${isActive ? " active" : ""}`}>
            <div className={`bb-card${broadcast.type === "urgent" ? " urgent-glow" : ""}`}>
                <div className="bb-card-stripe" style={{ background: cfg.gradient }} />
                <div className="bb-card-inner">
                    {/* Avatar */}
                    <div className="bb-card-avatar" style={{ background: cfg.gradient, "--glow": cfg.glow }}>
                        <CardIcon size={18} />
                    </div>

                    <div className="bb-card-body">
                        <div className="bb-card-top">
                            <div className="bb-card-meta">
                                <span className="bb-type-pill" style={{ background: cfg.pill, color: cfg.pillText }}>
                                    <CardIcon size={9} />
                                    {cfg.label}
                                </span>
                                <span className="bb-timer">
                                    <span className="bb-timer-dot" style={{
                                        background: broadcast.type === "urgent" ? "#ef4444" : "#22c55e"
                                    }} />
                                    {timeLabel(cd)}
                                </span>
                            </div>
                            <button className="bb-dismiss" onClick={() => onDismiss(broadcast.id)}>
                                <HiX size={11} />
                            </button>
                        </div>

                        <div className="bb-card-title">{broadcast.title}</div>
                        <div className={`bb-card-desc${!expanded ? " clamped" : ""}`}>{broadcast.description}</div>
                        {broadcast.description?.length > 100 && (
                            <button className="bb-expand-btn" onClick={() => setExpanded((v) => !v)}>
                                {expanded ? "Sembunyikan ↑" : "Selengkapnya ↓"}
                            </button>
                        )}

                        <div className="bb-card-footer">
                            <div className="bb-card-author">oleh <span>{capitalizeEachWord(addHonorific(broadcast.creator_name))}</span></div>
                            <div className="bb-card-date">
                                {new Date(broadcast.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BroadcastBanner() {
    const [broadcasts, setBroadcasts] = useState([]);
    const [dismissed, setDismissed] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem("dismissed_broadcasts") || "[]"); }
        catch { return []; }
    });
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const [now, setNow] = useState(Date.now()); // ✅ tambah ticker

    const employee = getEmployeeFromLocal();
    const canCreate = canSupervisorUp(employee);

    // ✅ Ticker setiap 1 detik untuk update waktu expired
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const load = useCallback(async () => {
        try {
            const d = await api("/broadcast");
            setBroadcasts(d.broadcasts || []);
        } catch { setBroadcasts([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 5 * 60 * 1000);
        return () => clearInterval(t);
    }, [load]);

    const handleDismiss = useCallback((id) => {
        setDismissed((prev) => {
            const next = [...prev, id];
            sessionStorage.setItem("dismissed_broadcasts", JSON.stringify(next));
            return next;
        });
    }, []);

    const handleSaved = useCallback((b) => {
        setBroadcasts((prev) => [b, ...prev]);
        setCurrent(0);
    }, []);

    const sorted = [...broadcasts
        .filter((b) => !dismissed.includes(b.id))
        .filter((b) => new Date(b.expires_at).getTime() > now) // ✅ filter expired real-time
    ].sort((a, b) =>
        ({ urgent: 0, warning: 1, info: 2, success: 3 }[a.type] ?? 9) -
        ({ urgent: 0, warning: 1, info: 2, success: 3 }[b.type] ?? 9)
    );

    useEffect(() => {
        if (current >= sorted.length && sorted.length > 0) setCurrent(sorted.length - 1);
        if (sorted.length === 0) setCurrent(0);
    }, [sorted.length, current]);

    const prev = () => setCurrent((c) => Math.max(0, c - 1));
    const next = () => setCurrent((c) => Math.min(sorted.length - 1, c + 1));
    const dotColor = (b) => TYPE_CONFIG[b?.type]?.gradient || "#94a3b8";

    // ── Auto-slide setiap 5 detik ──
    useEffect(() => {
        if (sorted.length <= 1 || paused) return;
        const t = setInterval(() => {
            setCurrent((c) => (c + 1) % sorted.length);
        }, 5000);
        return () => clearInterval(t);
    }, [sorted.length, paused]);

    if (loading) return null;
    if (sorted.length === 0 && !canCreate) return null;

    return (
        <div className="bb-root">
            <style>{css}</style>
            <div className="bb-wrap">

                {/* Header */}
                <div className="bb-header">
                    <div className="bb-header-left" onClick={() => setCollapsed((v) => !v)}>
                        <div className="bb-header-icon">
                            <HiBell size={15} />
                        </div>
                        <span className="bb-header-title">Announcement</span>
                        {sorted.length > 0 && (
                            <span className="bb-badge-count">{sorted.length}</span>
                        )}
                    </div>
                    <div className="bb-header-right">
                        {canCreate && (
                            <button className="bb-add-btn" onClick={() => setShowModal(true)}>
                                <HiPlus size={11} />
                                Tambah
                            </button>
                        )}
                        <button className={`bb-chevron-btn${collapsed ? "" : " open"}`} onClick={() => setCollapsed((v) => !v)}>
                            <HiChevronDown size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div
                    className={`bb-body${collapsed ? " collapsed" : " expanded"}`}
                    style={{ maxHeight: collapsed ? "0" : "400px" }}
                >
                    {sorted.length === 0 ? (
                        <div className="bb-empty">
                            <div className="bb-empty-icon"><HiMail size={36} /></div>
                            <p className="bb-empty-text">Belum ada pengumuman aktif</p>
                            {canCreate && (
                                <button className="bb-empty-link" onClick={() => setShowModal(true)}>
                                    Buat pengumuman baru
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* pause saat hover carousel */}
                            <div
                                className="bb-carousel"
                                onMouseEnter={() => setPaused(true)}
                                onMouseLeave={() => setPaused(false)}
                            >
                                {sorted.map((b, i) => (
                                    <BroadcastSlide key={b.id} broadcast={b} onDismiss={handleDismiss} isActive={i === current} />
                                ))}
                            </div>

                            {sorted.length > 1 && (
                                <div className="bb-controls">
                                    <button className="bb-nav-btn" onClick={prev} disabled={current === 0}>
                                        <HiChevronLeft size={13} />
                                    </button>

                                    <div className="bb-dots">
                                        {sorted.map((b, i) => (
                                            <button
                                                key={b.id}
                                                className={`bb-dot${i === current ? " active-dot" : " inactive"}`}
                                                style={i === current ? { background: dotColor(b) } : {}}
                                                onClick={() => { setCurrent(i); setPaused(true); setTimeout(() => setPaused(false), 8000); }}
                                            />
                                        ))}
                                    </div>

                                    <span className="bb-counter">{current + 1}/{sorted.length}</span>

                                    <button className="bb-nav-btn" onClick={next} disabled={current === sorted.length - 1}>
                                        <HiChevronRight size={13} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {showModal && (
                <AddBroadcastModal onClose={() => setShowModal(false)} onSaved={handleSaved} />
            )}
        </div>
    );
}