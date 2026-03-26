import { useState, useEffect, useRef, useCallback } from "react";

const WEBHOOK_URL = "https://n8n.awancode.com/webhook/9f3a2574-73db-494d-b1b4-8d26b9a7967b/chat";
const SESSION_KEY = "alora_chatbot_session";

function getSessionId(employeeId) {
    const key = `${SESSION_KEY}_${employeeId || "guest"}`;
    let id = sessionStorage.getItem(key);
    if (!id) {
        id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(key, id);
    }
    return id;
}

function getUserFromStorage() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const userData = parsed.user ?? parsed;
        return userData.employee ?? null;
    } catch {
        return null;
    }
}

export default function AloraChatBot() {
    const [employee] = useState(() => getUserFromStorage());
    const userName = employee?.full_name?.split(" ")[0] || "Sobat";

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => [
        {
            id: 1,
            role: "bot",
            text: `Halo *${userName}*! 👋 Saya *minbot Alora*, asisten virtual kamu.\nAda yang bisa saya bantu hari ini?\n\n⚠️ Catatan: MinBot masih dalam tahap pengembangan. Jawaban yang diberikan mungkin belum selalu akurat.`,
            time: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [unread, setUnread] = useState(0);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const sessionId = useRef(getSessionId(employee?.employee_id));
    const hasAutoGreeted = useRef(false);

    const sendIdentityContext = useCallback((sid) => {
        if (!employee?.full_name) return;
        const identityMsg = `Halo! Perkenalkan, nama saya ${employee.full_name}` +
            (employee.position_name ? `, saya bekerja sebagai ${employee.position_name}` : "") +
            (employee.job_level_name ? ` level ${employee.job_level_name}` : "") +
            ` di PT Waschen Alora Indonesia.`;
        fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "sendMessage",
                chatInput: identityMsg,
                sessionId: sid,
                employeeName: employee?.full_name ?? null,
                employeePosition: employee?.position_name ?? null,
                employeeLevel: employee?.job_level_name ?? null,
            }),
        }).catch(() => { });
    }, [employee]);

    const resetSession = () => {
        const key = `${SESSION_KEY}_${employee?.employee_id || "guest"}`;
        const ctxKey = `${SESSION_KEY}_ctx_${employee?.employee_id || "guest"}`;
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(ctxKey);
        const newSessionId = getSessionId(employee?.employee_id);
        sessionId.current = newSessionId;
        hasAutoGreeted.current = false;  // ← reset agar auto-greeting kirim ulang
        setMessages([
            {
                id: Date.now(),
                role: "bot",
                text: `Sesi baru dimulai! 🔄\n\nHalo *${userName}*! 👋 Saya *minbot Alora*, asisten virtual kamu.\nAda yang bisa saya bantu hari ini?\n\n⚠️ Catatan: MinBot masih dalam tahap pengembangan. Jawaban yang diberikan mungkin belum selalu akurat.`,
                time: new Date(),
            },
        ]);
        setInput("");
        setIsTyping(false);
    };

    // Scroll to bottom on new messages
    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping, isOpen]);

    // Focus input & clear unread when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 150);
            setUnread(0);

            if (hasAutoGreeted.current) return;
            hasAutoGreeted.current = true;

            const greetText = "Hai Minbot!";
            setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: greetText, time: new Date() }]);
            setIsTyping(true);
            fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "sendMessage",
                    chatInput: greetText,
                    sessionId: sessionId.current,
                    employeeName: employee?.full_name ?? null,
                    employeePosition: employee?.position_name ?? null,
                    employeeLevel: employee?.job_level_name ?? null,
                }),
            })
                .then((r) => r.json())
                .then((data) => {
                    const botText = data?.output ?? data?.text ?? data?.message ?? "Maaf, saya tidak mengerti. Coba ulangi ya 😊";
                    setMessages((prev) => [...prev, { id: Date.now() + 1, role: "bot", text: botText, time: new Date() }]);
                })
                .catch(() => {
                    setMessages((prev) => [...prev, { id: Date.now() + 1, role: "bot", text: "Koneksi bermasalah, coba lagi ya 🙏", time: new Date() }]);
                })
                .finally(() => setIsTyping(false));
        }
    }, [isOpen, employee]);

    // Drag events
    useEffect(() => {
        const onMove = (e) => {
            if (!isDragging.current) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            setDragOffset({
                x: clientX - dragStart.current.x,
                y: clientY - dragStart.current.y,
            });
        };
        const onUp = () => { isDragging.current = false; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onMove);
        window.addEventListener("touchend", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend", onUp);
        };
    }, []);

    const onDragStart = (e) => {
        isDragging.current = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStart.current = {
            x: clientX - dragOffset.x,
            y: clientY - dragOffset.y,
        };
        e.preventDefault();
    };

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isTyping) return;

        setMessages((prev) => [...prev, { id: Date.now(), role: "user", text, time: new Date() }]);
        setInput("");
        setIsTyping(true);

        try {
            const res = await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "sendMessage",
                    chatInput: text,
                    sessionId: sessionId.current,
                    employeeName: employee?.full_name ?? null,
                    employeePosition: employee?.position_name ?? null,
                    employeeLevel: employee?.job_level_name ?? null,
                }),
            });
            const data = await res.json();
            const botText =
                data?.output ?? data?.text ?? data?.message ?? "Maaf, saya tidak mengerti. Coba ulangi ya 😊";

            setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, role: "bot", text: botText, time: new Date() },
            ]);
            if (!isOpen) setUnread((n) => n + 1);
        } catch {
            setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, role: "bot", text: "Koneksi bermasalah, coba lagi ya 🙏", time: new Date() },
            ]);
        } finally {
            setIsTyping(false);
        }
    }, [input, isTyping, isOpen, employee]);

    const formatTime = (d) => d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    const renderText = (text) =>
        text.split(/\*(.+?)\*/g).map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );

    useEffect(() => {
        if (!employee?.full_name) return;
        const contextKey = `${SESSION_KEY}_ctx_${employee?.employee_id || "guest"}`;
        if (sessionStorage.getItem(contextKey)) return;
        sessionStorage.setItem(contextKey, "1");
        sendIdentityContext(sessionId.current);
    }, [employee, sendIdentityContext]);


    return (
        <>
            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>

            {/* ── Chat Window ── */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "88px",
                        right: "24px",
                        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                        zIndex: 9999,
                    }}
                    className="w-[340px] sm:w-[370px] rounded-2xl shadow-2xl border border-slate-200 bg-white flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div
                        onMouseDown={onDragStart}
                        onTouchStart={onDragStart}
                        className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-500 cursor-move select-none"
                    >
                        <div className="relative shrink-0">
                            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white leading-tight">minbot Alora</div>
                            <div className="text-[11px] text-blue-100">
                                {isTyping ? (
                                    <span className="animate-pulse">sedang mengetik...</span>
                                ) : (
                                    "● Online"
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={resetSession}
                            title="Mulai sesi baru"
                            className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white text-xs transition"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Sub-header */}
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[11px] text-blue-600 text-center">
                        Asisten virtual Alora Group — Siap membantu 24/7
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50"
                        style={{ maxHeight: "340px", minHeight: "180px" }}
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                            >
                                {msg.role === "bot" && (
                                    <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-sm shrink-0 mb-4">
                                        🤖
                                    </div>
                                )}
                                <div className={`flex flex-col gap-0.5 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                    <div
                                        className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                                            : "bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm"
                                            }`}
                                    >
                                        {renderText(msg.text)}
                                    </div>
                                    <span className="text-[10px] text-slate-400 px-1">{formatTime(msg.time)}</span>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex items-end gap-2">
                                <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-sm shrink-0">🤖</div>
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                    <div className="flex gap-1 items-center h-4">
                                        {[0, 150, 300].map((delay) => (
                                            <span
                                                key={delay}
                                                className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                                                style={{ animationDelay: `${delay}ms` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 border-t border-slate-200 bg-white flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                            }}
                            placeholder="Ketik pesan..."
                            disabled={isTyping}
                            className="flex-1 h-9 rounded-full border border-slate-200 px-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={!input.trim() || isTyping}
                            className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center text-white transition shrink-0"
                        >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>

                    <div className="text-center py-1.5 bg-white border-t border-slate-100">
                        <span className="text-[10px] text-slate-300">Powered by Alora SuperApp ✨</span>
                    </div>
                </div>
            )}

            {/* ── FAB Button ── */}
            <button
                type="button"
                onClick={() => setIsOpen((p) => !p)}
                className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center transition-all duration-200"
                title="Chat dengan minbot Alora"
            >
                <div className={`transition-all duration-200 ${isOpen ? "rotate-180 scale-0 opacity-0 absolute" : "rotate-0 scale-100 opacity-100"}`}>
                    <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
                    </svg>
                </div>
                <div className={`transition-all duration-200 ${isOpen ? "rotate-0 scale-100 opacity-100" : "rotate-180 scale-0 opacity-0 absolute"}`}>
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                {unread > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white px-1">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}

                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
                )}
            </button>

            {/* Speech bubble tooltip */}
            {!isOpen && (
                <div
                    style={{ animation: "float 3s ease-in-out infinite" }}
                    className="fixed bottom-[90px] right-6 z-[9998] flex items-center gap-2"
                >
                    <div className="bg-white text-slate-700 text-xs font-medium px-3.5 py-2 rounded-2xl rounded-br-sm shadow-lg border border-slate-200 whitespace-nowrap">
                        Hai Sobat Alora, ada yang bisa MinBot bantu? 👋
                    </div>
                    <div className="w-3 h-3 bg-white rotate-45 -mt-1.5 border-t border-l border-slate-200" />
                </div>
            )}
        </>
    );
}