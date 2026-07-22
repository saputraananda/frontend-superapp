import { useState, useEffect, useRef } from "react";
import { api, assetUrl } from "../../../../lib/api";
import { 
  HiOutlinePaperAirplane, 
  HiOutlineFaceSmile, 
  HiOutlinePaperClip, 
  HiOutlineMagnifyingGlass, 
  HiOutlinePhone, 
  HiOutlineVideoCamera, 
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheck,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineCheckBadge
} from "react-icons/hi2";
import { HiCheckCircle } from "react-icons/hi";

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-500",
  "bg-amber-500",
  "bg-purple-600",
  "bg-sky-500",
  "bg-teal-600"
];

const POPULAR_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", 
  "🙂", "😉", "😌", "😍", "🥰", "😘", "😋", "😜", "😎", "😏", 
  "😐", "😑", "😒", "😔", "😭", "😡", "😠", "😤", "😱", "😳",
  "🥵", "🥶", "🤔", "🤫", "😴", "😷", "😈", "👿", "💩", "👻", 
  "👍", "👎", "👌", "✌️", "🤞", "🤟", "👏", "🙌", "🙏", "🤝", 
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "🔥", "✨"
];

export default function PersonalChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);

  // New Chat Modal States
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  // Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Custom alert state
  const [showDevModal, setShowDevModal] = useState(false);

  const messageEndRef = useRef(null);

  // Fetch Current Logged-in User profile
  const fetchCurrentUser = async () => {
    try {
      const data = await api("/api/pm2/me");
      setCurrentUser(data);
    } catch (err) {
      console.error("Gagal memuat info user login:", err);
    }
  };

  // Fetch Contacts
  const fetchContacts = async () => {
    try {
      const data = await api("/api/pm2/chat/contacts");
      setContacts(data?.data || []);
    } catch (err) {
      console.error("Gagal memuat kontak:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Messages for Selected Contact
  const fetchMessages = async (contactId) => {
    if (!contactId) return;
    try {
      const data = await api(`/api/pm2/chat/messages/${contactId}`);
      setMessages(data?.data || []);
    } catch (err) {
      console.error("Gagal memuat pesan:", err);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchCurrentUser();
    fetchContacts();
  }, []);

  // Poll Contacts list every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchContacts();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Poll Messages log every 3 seconds when a contact is selected
  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId);

    const timer = setInterval(() => {
      fetchMessages(activeId);
    }, 3000);

    return () => clearInterval(timer);
  }, [activeId]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectContact = (id) => {
    setActiveId(id);
    // Instantly mark local read
    setContacts(prev =>
      prev.map(c => (c.id === id ? { ...c, unread: 0 } : c))
    );
    fetchMessages(id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeId) return;

    const text = inputValue;
    setInputValue("");
    setShowEmojiPicker(false);

    try {
      const res = await api("/api/pm2/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          recipient_id: activeId,
          message: text
        })
      });
      if (res?.data) {
        setMessages(prev => [...prev, res.data]);
        fetchContacts(); // update last message in sidebar immediately
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
    }
  };

  const startNewChat = (contact) => {
    // If contact is not yet in active sidebar, select it and reset states
    setActiveId(contact.id);
    setShowNewChatModal(false);
    setNewChatSearch("");
    fetchMessages(contact.id);
  };

  // Helpers
  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const getAvatarColor = (id) => {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
  };

  // Bangun URL foto profil kontak, fallback ke ui-avatars jika tidak ada
  const buildContactAvatarSrc = (contact) => {
    if (contact?.profile_path) return assetUrl(contact.profile_path);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(contact?.name || "U")}&background=6366f1&color=ffffff&bold=true`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastMsgTime = (timeStr) => {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Kemarin";
    }
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  // Filter contacts displayed in the left sidebar:
  // - If search is empty: show only contacts with active chat history (lastMsg is not null)
  // - If search query exists: search through ALL contacts in the company
  const sidebarContacts = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery.trim() === "") {
      return c.lastMsg !== null; // active chats only
    }
    return matchesSearch;
  });

  // Filter for New Chat modal (all company employees matching search)
  const newChatContacts = contacts.filter((c) => {
    if (!newChatSearch.trim()) return true;
    return c.name.toLowerCase().includes(newChatSearch.toLowerCase());
  });

  const activeContact = contacts.find(c => c.id === activeId);

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden bg-slate-50">
      {/* Sidebar Contacts list */}
      <div className="flex w-full flex-col border-r border-slate-200 bg-white sm:w-80 md:w-96 shrink-0">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
              <HiOutlineChatBubbleLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Alsa Private Chat</h2>
              <p className="text-[11px] text-slate-400">Pesan langsung & diskusi</p>
            </div>
          </div>
          <button 
            onClick={() => setShowNewChatModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
            title="Mulai Chat Baru"
          >
            <HiOutlinePlus className="h-4.5 w-4.5 font-bold" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <HiOutlineMagnifyingGlass className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Cari anggota tim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Contacts list scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-[10px]">Memuat kontak...</p>
            </div>
          ) : sidebarContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 px-4">
              <HiOutlineChatBubbleLeftRight className="h-8 w-8 stroke-1 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-650">Tidak ada obrolan aktif</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {searchQuery.trim() 
                  ? "Kontak tidak ditemukan" 
                  : "Klik tombol '+' di atas untuk memulai chat baru dengan rekan tim."}
              </p>
            </div>
          ) : (
            sidebarContacts.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => selectContact(c.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-all ${
                    isActive
                      ? "bg-indigo-50/70 border-l-4 border-indigo-600"
                      : "hover:bg-slate-50 border-l-4 border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={buildContactAvatarSrc(c)}
                      alt={c.name}
                      className="h-11 w-11 rounded-xl object-cover shadow-sm"
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || "U")}&background=6366f1&color=ffffff&bold=true`; }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-bold text-slate-800">{c.name}</p>
                      <span className="text-[9px] text-slate-405 font-medium">{formatLastMsgTime(c.lastMsgTime)}</span>
                    </div>
                    <p className="truncate text-[10px] text-slate-400 font-medium">{c.role}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="truncate text-[11px] text-slate-550 flex-1 pr-2">{c.lastMsg || "Mulai chat..."}</p>
                      {c.unread > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white shrink-0 shadow-sm animate-pulse">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat window */}
      <div className="hidden flex-1 flex-col bg-slate-100 sm:flex">
        {activeContact ? (
          <>
            {/* Header recipient details */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={buildContactAvatarSrc(activeContact)}
                    alt={activeContact.name}
                    className="h-10 w-10 rounded-xl object-cover"
                    onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeContact.name || "U")}&background=6366f1&color=ffffff&bold=true`; }}
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 leading-tight">{activeContact.name}</h3>
                  <p className="text-[10px] text-slate-400 leading-none mt-1">
                    {activeContact.role} &bull; {activeContact.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDevModal(true)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                >
                  <HiOutlinePhone className="h-4.5 w-4.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => setShowDevModal(true)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-650 transition"
                >
                  <HiOutlineVideoCamera className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Message log wrapper */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-[#efeae2]/60 pattern-whatsapp">
              <div className="mx-auto my-4 w-fit rounded-lg bg-indigo-55/80 border border-indigo-100/50 px-4 py-2 text-center text-[10px] text-indigo-700 font-bold shadow-sm">
                🔒 Komunikasi Internal Alora Group Terenkripsi
              </div>
              
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`relative max-w-[70%] rounded-xl px-4 py-2 text-xs shadow-sm ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-white text-slate-800 rounded-tl-none"
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                      <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px]">
                        <span className={isMe ? "text-indigo-200" : "text-slate-400"}>
                          {formatTime(msg.time)}
                        </span>
                        {isMe && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {msg.is_read === 1 ? (
                              <>
                                <HiCheckCircle className="h-3.5 w-3.5 text-sky-300" />
                                <span className="text-[8px] font-bold text-sky-300 tracking-wide">Read</span>
                              </>
                            ) : (
                              <>
                                <HiOutlineCheck className="h-3 w-3 text-indigo-200/70" />
                                <span className="text-[8px] font-medium text-indigo-200/60 tracking-wide">Sent</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messageEndRef} />
            </div>

            {/* Bottom Form bar */}
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-3 border-t border-slate-200 bg-white px-6 py-3">
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-6 z-10 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pilih Emoji</span>
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-slate-400 hover:text-slate-600 transition"
                    >
                      <HiOutlineXMark className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setInputValue(prev => prev + emoji)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-base transition active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`rounded-lg p-1.5 transition shrink-0 ${showEmojiPicker ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
              >
                <HiOutlineFaceSmile className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowDevModal(true)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition shrink-0"
              >
                <HiOutlinePaperClip className="h-5 w-5" />
              </button>

              <input
                type="text"
                placeholder="Tulis pesan..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />

              <button
                type="submit"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition"
              >
                <HiOutlinePaperAirplane className="h-4.5 w-4.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#f8fafc]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
              <HiOutlineChatBubbleLeftRight className="h-8 w-8 stroke-1.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Mulai Percakapan</h3>
            <p className="mt-1 max-w-xs text-xs text-slate-450 leading-relaxed">
              Pilih rekan tim dari daftar di sebelah kiri atau klik tombol "+" untuk memulai obrolan langsung baru.
            </p>
            <div className="mt-4 flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1 text-[10px] font-semibold text-indigo-700">
              <HiOutlineCheckBadge className="h-3.5 w-3.5 text-indigo-600" />
              Saluran Komunikasi Aman Alora Group
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal Dialog */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-250 bg-white shadow-xl flex flex-col max-h-[500px] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-800">Mulai Chat Baru</h3>
              <button 
                onClick={() => { setShowNewChatModal(false); setNewChatSearch(""); }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-650 transition"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-4 border-b border-slate-50">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <HiOutlineMagnifyingGlass className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Cari anggota tim berdasarkan nama..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-250 bg-slate-50 py-2 pl-9 pr-4 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {newChatContacts.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Anggota tim tidak ditemukan.</p>
              ) : (
                newChatContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => startNewChat(contact)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-indigo-50/50 transition"
                  >
                    <img
                      src={buildContactAvatarSrc(contact)}
                      alt={contact.name}
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || "U")}&background=6366f1&color=ffffff&bold=true`; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{contact.name}</p>
                      <p className="truncate text-[10px] text-slate-450 leading-tight">{contact.role} &bull; {contact.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fitur Sedang Dikembangkan Modal Overlay */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-inner">
              <HiOutlineCheckBadge className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800">Fitur Sedang Dikembangkan</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mohon Menunggu Yaa, fitur ini sedang dalam proses pengembangan untuk Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDevModal(false)}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition active:scale-95 shadow-md shadow-indigo-600/20"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
