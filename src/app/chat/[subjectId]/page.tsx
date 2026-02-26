"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import ErrorModal from "@/components/ErrorModal";
import ConfirmModal from "@/components/ConfirmModal";
import PreviewModal from "@/components/PreviewModal";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import UpgradeModal from "@/components/UpgradeModal";

interface Citation {
  fileName: string;
  fileUrl?: string;
  pageNumber: number;
  chunkIndex: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  confidence?: string;
  confidenceExplanation?: string;
  evidenceSnippets?: string[];
  notFound?: boolean;
  isNew?: boolean;
}

interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
  isTyping?: boolean; // Custom flag for typewriter effect on new auto-titled chats
}

function TypewriterMessage({ content, animate }: { content: string; animate: boolean }) {
  const [displayed, setDisplayed] = useState(animate ? "" : content);

  useEffect(() => {
    if (!animate) {
      setDisplayed(content);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(content.slice(0, i + 1));
      i++;
      if (i >= content.length) {
        clearInterval(interval);
      }
    }, 12); // Speed of typewriter
    return () => clearInterval(interval);
  }, [content, animate]);

  return <MarkdownRenderer content={displayed} />;
}

export default function ChatPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(searchParams.get("chat"));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string | null; name: string } | null>(null);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeatureBlocked, setUpgradeFeatureBlocked] = useState<"subject" | "question">("question");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        const sub = (data.subjects || []).find((s: { _id: string }) => s._id === subjectId);
        if (sub) setSubjectName(sub.name);
      });
  }, [subjectId]);

  const fetchChats = useCallback(async (newChatIdJustUsed?: string) => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}/chats`);
      const data = await res.json();
      const loaded: ChatSession[] = data.chats || [];
      
      // If we just generated a title for a new chat, flag it for typing animation
      if (newChatIdJustUsed) {
         const found = loaded.find(c => c._id === newChatIdJustUsed);
         if (found && found.title !== "New Chat") found.isTyping = true;
      }
      
      setChatSessions(loaded);
      return loaded;
    } catch {
      return [];
    }
  }, [subjectId]);

  // Load chats on mount and auto-select
  useEffect(() => {
    const init = async () => {
      const chats = await fetchChats();
      const urlChatId = searchParams.get("chat");
      if (urlChatId && chats.find((c: ChatSession) => c._id === urlChatId)) {
        setActiveChatId(urlChatId);
      } else if (chats.length > 0) {
        setActiveChatId(chats[0]._id);
        router.replace(`/chat/${subjectId}?chat=${chats[0]._id}`);
      }
    };
    if (status === "authenticated") init();
  }, [status, subjectId, fetchChats, searchParams, router]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/subjects/${subjectId}/chats/${activeChatId}/messages`);
        const data = await res.json();
        const msgs: Message[] = (data.messages || []).map((m: { _id?: string; role: string; content: string; citations?: Citation[]; confidence?: string; confidenceExplanation?: string; evidenceSnippets?: string[]; notFound?: boolean }) => ({
          id: m._id || crypto.randomUUID(),
          role: m.role,
          content: m.content,
          citations: m.citations || [],
          confidence: m.confidence || "",
          confidenceExplanation: m.confidenceExplanation || "",
          evidenceSnippets: m.evidenceSnippets || [],
          notFound: m.notFound || false,
        }));
        setMessages(msgs);
      } catch {
        setMessages([]);
      }
    };
    loadMessages();
  }, [activeChatId, subjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createNewChat = async () => {
    setCreatingChat(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const data = await res.json();
      if (data.chat) {
        await fetchChats();
        setActiveChatId(data.chat._id);
        router.replace(`/chat/${subjectId}?chat=${data.chat._id}`);
        setMessages([]);
      } else {
        setErrorMsg(data.error || "Failed to create chat");
      }
    } catch {
      setErrorMsg("Failed to create chat");
    } finally {
      setCreatingChat(false);
    }
  };

  const selectChat = (chatId: string) => {
    setActiveChatId(chatId);
    router.replace(`/chat/${subjectId}?chat=${chatId}`);
  };

  const startRename = (chat: ChatSession) => {
    setEditingChatId(chat._id);
    setEditTitle(chat.title);
  };

  const saveRename = async () => {
    if (!editingChatId || !editTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      await fetch(`/api/subjects/${subjectId}/chats/${editingChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      await fetchChats();
    } catch {
      setErrorMsg("Failed to rename chat");
    } finally {
      setEditingChatId(null);
    }
  };

  const triggerDelete = (chatId: string) => {
    setChatToDelete(chatId);
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/subjects/${subjectId}/chats/${chatToDelete}`, {
        method: "DELETE",
      });
      const chats = await fetchChats();
      if (activeChatId === chatToDelete) {
        if (chats.length > 0) {
          setActiveChatId(chats[0]._id);
          router.replace(`/chat/${subjectId}?chat=${chats[0]._id}`);
        } else {
          setActiveChatId(null);
          router.replace(`/chat/${subjectId}`);
          setMessages([]);
        }
      }
    } catch {
      setErrorMsg("Failed to delete chat");
    } finally {
      setIsDeleting(false);
      setChatToDelete(null);
    }
  };

  // Speech Recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setErrorMsg("Speech recognition not supported. Try Chrome."); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    // Auto-create chat if none exists
    let chatId = activeChatId;
    if (!chatId) {
      try {
        const res = await fetch(`/api/subjects/${subjectId}/chats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.chat) {
          chatId = data.chat._id;
          setActiveChatId(chatId);
          router.replace(`/chat/${subjectId}?chat=${chatId}`);
          // Wait briefly, then re-fetch the list so auto-trigger of typewriter applies
          await fetchChats(chatId || undefined);
        } else {
           setErrorMsg(data.error || "Failed to create chat session");
           return;
        }
      } catch {
        setErrorMsg("Failed to create chat session");
        return;
      }
    }

    const question = input.trim();
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/subjects/${subjectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, chatSessionId: chatId }),
      });

      const data = await res.json();

      if (res.status === 403 && data.reason === "limit_exceeded") {
         setUpgradeFeatureBlocked(data.feature || "question");
         setIsUpgradeModalOpen(true);
         // Remove the optimistically added user message
         setMessages((prev) => prev.slice(0, -1));
         return;
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer || data.error || "Something went wrong",
        citations: data.citations || [],
        confidence: data.confidence || "",
        confidenceExplanation: data.confidenceExplanation || "",
        evidenceSnippets: data.evidenceSnippets || [],
        notFound: data.notFound || false,
        isNew: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      fetchChats(); // refresh chat list (title may have changed)

      if (data.answer && !data.notFound) speakText(data.answer);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Failed to get response. Please try again.", isNew: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div className="bg-orb" style={{ width: 400, height: 400, background: 'var(--accent-1)', top: '-15%', right: '-10%' }} />
      <div className="bg-orb" style={{ width: 300, height: 300, background: 'var(--accent-3)', bottom: '-5%', left: '-5%' }} />

      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? 280 : 0, padding: sidebarOpen ? '16px 12px' : 0 }}>
        <div style={styles.sidebarHeader}>
          <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>CHATS</h3>
          <button
            onClick={createNewChat}
            disabled={creatingChat}
            style={styles.newChatBtn}
            title="New Chat"
          >
            {creatingChat ? "..." : "+ New"}
          </button>
        </div>

        <div style={styles.chatList}>
          {chatSessions.map((chat) => (
            <div
              key={chat._id}
              style={{
                ...styles.chatItem,
                background: activeChatId === chat._id ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                borderColor: activeChatId === chat._id ? 'rgba(124, 58, 237, 0.3)' : 'transparent',
              }}
              onClick={() => selectChat(chat._id)}
            >
              {editingChatId === chat._id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setEditingChatId(null);
                  }}
                  autoFocus
                  style={styles.renameInput}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span style={styles.chatTitle}>
                    💬{" "}
                    {chat.isTyping ? (
                      <span className="typewriter-text">{chat.title}</span>
                    ) : (
                      chat.title
                    )}
                  </span>
                  <div style={styles.chatActions} className="chat-actions">
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(chat); }}
                      style={styles.chatActionBtn}
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); triggerDelete(chat._id); }}
                      style={styles.chatActionBtn}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {chatSessions.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>
              No chats yet. Click &quot;+ New&quot; to start.
            </div>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div style={{ ...styles.mainArea, marginLeft: sidebarOpen ? 280 : 0 }}>
        {/* Header */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={styles.toggleBtn}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <button onClick={() => router.push("/dashboard")} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
              ← Back
            </button>
          </div>
          <div style={styles.headerCenter}>
            <h1 style={styles.headerTitle}>💬 {subjectName || "Chat"}</h1>
            <span style={styles.headerBadge}>Subject-Scoped Q&A</span>
          </div>
          <button
            onClick={() => router.push(`/study/${subjectId}`)}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            🧠 Study Mode
          </button>
        </header>

        {/* Messages */}
        <div style={styles.messagesContainer}>
          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.welcome} className="animate-fade-in">
                <div style={{ fontSize: 48 }}>💡</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>
                  Ask about {subjectName || "your subject"}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                  Questions are answered strictly from your uploaded notes with citations.
                </p>
                {!activeChatId && (
                  <button onClick={createNewChat} className="btn-gradient" style={{ marginTop: 16 }}>
                    + Start New Chat
                  </button>
                )}
              </div>
            )}

            {messages.map((msg) => {
              return (
              <div
                key={msg.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  display: "flex",
                  gap: 12,
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  maxWidth: "90%",
                }}
                className="animate-fade-in"
              >
                {/* Avatar */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: msg.role === "user" ? "var(--accent-1)" : "var(--bg-card)",
                  border: msg.role === "assistant" ? "1px solid var(--accent-2)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 18,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}>
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>

                <div
                  style={{
                    ...styles.messageBubble,
                    position: "relative",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #7c3aed, #3b82f6)"
                      : msg.notFound
                        ? "rgba(239, 68, 68, 0.1)"
                        : "var(--bg-card)",
                    border: msg.role === "user"
                      ? "none"
                      : msg.notFound
                        ? "1px solid rgba(239, 68, 68, 0.3)"
                        : "1px solid var(--glass-border)",
                    color: msg.role === "user" ? "#ffffff" : "var(--text-primary)",
                  }}
                >


                  <div style={{ ...styles.messageText, color: msg.role === "user" ? "#ffffff" : "var(--text-primary)" }}>
                    {msg.role === "user" ? <MarkdownRenderer content={msg.content} /> : <TypewriterMessage content={msg.content} animate={msg.isNew || false} />}
                  </div>

                  {/* Action Buttons Bottom */}
                  {msg.role === "assistant" && (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                      {!msg.notFound && (
                        <button
                          onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid var(--glass-border)",
                            borderRadius: 4,
                            color: "var(--text-secondary)",
                            padding: "4px 8px",
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          title={isSpeaking ? "Stop speaking" : "Read aloud"}
                        >
                          {isSpeaking ? "⏹️ Stop" : "🔊 Read"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedId(msg.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: 4,
                          color: "var(--text-secondary)",
                          padding: "4px 8px",
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? "Copied! ✅" : "Copy 📋"}
                      </button>
                    </div>
                  )}

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={styles.citationsSection}>
                      <div style={styles.citationsHeader}>📎 Citations</div>
                      {msg.citations.map((c, ci) => (
                        <div key={ci} style={styles.citationItem}>
                          {c.fileUrl ? (
                            <button 
                              onClick={() => setPreviewFile({ url: `${c.fileUrl}#page=${c.pageNumber}`, name: c.fileName })}
                              style={styles.citationBtn}
                              className="hover-underline"
                              title={`Preview ${c.fileName} on page ${c.pageNumber}`}
                            >
                              📄 {c.fileName} — Page {c.pageNumber}, Chunk {c.chunkIndex}
                            </button>
                          ) : (
                            <span>📄 {c.fileName} — Page {c.pageNumber}, Chunk {c.chunkIndex}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confidence + SHAP/LIME Explanation */}
                  {msg.confidence && (
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge badge-${msg.confidence.toLowerCase()}`}>
                        {msg.confidence === "High" ? "🟢" : msg.confidence === "Medium" ? "🟡" : "🔴"}{" "}
                        {msg.confidence} Confidence
                      </span>
                      {msg.confidenceExplanation && (
                        <details style={styles.confidenceDetails}>
                          <summary style={styles.confidenceSummary}>
                            🔬 Why this confidence? (SHAP/LIME Analysis)
                          </summary>
                          <pre style={styles.confidenceText}>{msg.confidenceExplanation}</pre>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Evidence snippets */}
                  {msg.evidenceSnippets && msg.evidenceSnippets.length > 0 && (
                    <details style={styles.evidence}>
                      <summary style={styles.evidenceSummary}>
                        📋 Supporting Evidence ({msg.evidenceSnippets.length})
                      </summary>
                      <div style={styles.evidenceList}>
                        {msg.evidenceSnippets.map((e, ei) => (
                          <div key={ei} style={styles.evidenceItem}>
                            &ldquo;{e}&rdquo;
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Speak button */}
                  {msg.role === "assistant" && !msg.notFound && (
                    <button
                      onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                      style={{...styles.speakBtn, color: "var(--text-secondary)"}}
                      title={isSpeaking ? "Stop speaking" : "Read aloud"}
                    >
                      {isSpeaking ? "⏹️" : "🔊"}
                    </button>
                  )}
                </div>
              </div>
            )})}

            {loading && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  alignSelf: "flex-start",
                  maxWidth: "90%",
                }}
                className="animate-fade-in"
              >
                {/* AI Loading Avatar */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--bg-card)",
                  border: "1px solid var(--accent-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 18,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}>
                  🤖
                </div>
                <div style={{ ...styles.messageBubble, padding: "12px 18px", background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
                  <div className="typing-indicator" style={{ display: "flex", alignItems: "center", height: 12 }}>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={styles.inputBar}>
          <form onSubmit={sendMessage} style={styles.inputForm}>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              style={{
                ...styles.micBtn,
                background: isListening ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)",
                borderColor: isListening ? "#ef4444" : "var(--glass-border)",
              }}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? "⏹️" : "🎤"}
            </button>
            <input
              type="text"
              className="input-field"
              placeholder={isListening ? "Listening..." : "Ask a question about your notes..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || isListening}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-gradient" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>

      <ErrorModal
        isOpen={!!errorMsg}
        message={errorMsg}
        onClose={() => setErrorMsg("")}
      />

      <ConfirmModal
        isOpen={!!chatToDelete}
        title="Delete Chat"
        message={isDeleting ? "Deleting..." : "Are you sure you want to delete this chat and all its messages?"}
        confirmText={isDeleting ? "..." : "Delete"}
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => !isDeleting && setChatToDelete(null)}
      />

      <PreviewModal
        isOpen={!!previewFile}
        fileUrl={previewFile?.url || null}
        fileName={previewFile?.name || ""}
        onClose={() => setPreviewFile(null)}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureBlocked={upgradeFeatureBlocked}
      />

      {/* Sidebar hover & typewriter animations */}
      <style>{`
        .chat-actions { opacity: 0; transition: opacity 0.2s; }
        div:hover > .chat-actions { opacity: 1; }
        
        .typewriter-text {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid var(--accent-1);
          animation: typing 2s steps(40, end), blink-caret 0.75s step-end infinite;
        }

        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }

        @keyframes blink-caret {
          from, to { border-color: transparent }
          50% { border-color: var(--accent-1); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    display: "flex",
    position: "relative",
    overflow: "hidden",
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    background: "rgba(10, 10, 20, 0.95)",
    borderRight: "1px solid var(--glass-border)",
    backdropFilter: "blur(20px)",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: "width 0.3s, padding 0.3s",
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    flexShrink: 0,
  },
  newChatBtn: {
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--glass-border)",
    background: "rgba(124, 58, 237, 0.1)",
    color: "var(--accent-1)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  chatList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  chatItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    transition: "background 0.2s",
    border: "1px solid transparent",
    minHeight: 40,
  },
  chatTitle: {
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  chatActions: {
    display: "flex",
    gap: 4,
    flexShrink: 0,
  },
  chatActionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    padding: 2,
    opacity: 0.7,
    transition: "opacity 0.2s",
  },
  renameInput: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--accent-1)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)",
    fontSize: 13,
    padding: "4px 8px",
    outline: "none",
  },
  mainArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    transition: "margin-left 0.3s",
  },
  header: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid var(--glass-border)",
    backdropFilter: "blur(20px)",
  },
  toggleBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--glass-border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "6px 10px",
    fontSize: 12,
    transition: "all 0.2s",
  },
  headerCenter: {
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
  },
  headerBadge: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  messagesContainer: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    zIndex: 1,
  },
  messages: {
    height: "100%",
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  welcome: {
    textAlign: "center",
    margin: "auto",
  },
  messageBubble: {
    padding: "14px 18px",
    borderRadius: "var(--radius-lg)",
    position: "relative",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  citationsSection: {
    marginTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: 10,
  },
  citationsHeader: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--accent-2)",
    marginBottom: 6,
  },
  citationItem: {
    fontSize: 12,
    color: "var(--text-secondary)",
    padding: "3px 0",
  },
  citationBtn: {
    background: "none",
    border: "none",
    color: "var(--accent-2)",
    cursor: "pointer",
    fontSize: "inherit",
    padding: 0,
    textAlign: "left",
  },
  evidence: {
    marginTop: 10,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: 8,
  },
  evidenceSummary: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--accent-3)",
    cursor: "pointer",
  },
  evidenceList: {
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  evidenceItem: {
    fontSize: 12,
    color: "var(--text-secondary)",
    fontStyle: "italic",
    padding: "6px 10px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(255,255,255,0.03)",
    borderLeft: "2px solid var(--accent-3)",
  },
  confidenceDetails: {
    marginTop: 8,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: 6,
  },
  confidenceSummary: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--accent-1)",
    cursor: "pointer",
  },
  confidenceText: {
    fontSize: 11,
    color: "var(--text-secondary)",
    marginTop: 6,
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(124, 58, 237, 0.05)",
    borderLeft: "2px solid var(--accent-1)",
    whiteSpace: "pre-wrap" as const,
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.5,
    overflow: "auto",
    maxHeight: 200,
  },
  speakBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    opacity: 0.6,
    transition: "opacity 0.2s",
  },
  inputBar: {
    position: "relative",
    zIndex: 1,
    borderTop: "1px solid var(--glass-border)",
    padding: "16px 24px",
    backdropFilter: "blur(20px)",
  },
  inputForm: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    maxWidth: 800,
    margin: "0 auto",
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "1px solid var(--glass-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 18,
    transition: "all 0.3s",
    flexShrink: 0,
  },
};
