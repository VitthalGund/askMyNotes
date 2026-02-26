"use client";

import { useState, useEffect, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

interface Citation {
  fileName: string;
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
}

export default function ChatPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [sessionId] = useState(() => searchParams.get("session") || uuidv4());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    // Fetch subject name
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        const sub = (data.subjects || []).find((s: { _id: string }) => s._id === subjectId);
        if (sub) setSubjectName(sub.name);
      });
  }, [subjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speech Recognition setup
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Text-to-Speech
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    const userMsg: Message = { id: uuidv4(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/subjects/${subjectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sessionId }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: data.answer || data.error || "Something went wrong",
        citations: data.citations || [],
        confidence: data.confidence || "",
        confidenceExplanation: data.confidenceExplanation || "",
        evidenceSnippets: data.evidenceSnippets || [],
        notFound: data.notFound || false,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-speak the answer (Phase 2 voice)
      if (data.answer && !data.notFound) {
        speakText(data.answer);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: "assistant", content: "Failed to get response. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div className="bg-orb" style={{ width: 400, height: 400, background: 'var(--accent-1)', top: '-15%', right: '-10%' }} />
      <div className="bg-orb" style={{ width: 300, height: 300, background: 'var(--accent-3)', bottom: '-5%', left: '-5%' }} />

      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => router.push("/dashboard")} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
          ← Back
        </button>
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
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageBubble,
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
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
                maxWidth: msg.role === "user" ? "70%" : "85%",
              }}
              className="animate-fade-in"
            >
              <p style={styles.messageText}>{msg.content}</p>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div style={styles.citationsSection}>
                  <div style={styles.citationsHeader}>📎 Citations</div>
                  {msg.citations.map((c, ci) => (
                    <div key={ci} style={styles.citationItem}>
                      📄 {c.fileName} — Page {c.pageNumber}, Chunk {c.chunkIndex}
                    </div>
                  ))}
                </div>
              )}

              {/* Confidence + SHAP/LIME Explanation */}
              {msg.confidence && (
                <div style={{ marginTop: 8 }}>
                  <span
                    className={`badge badge-${msg.confidence.toLowerCase()}`}
                  >
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

              {/* Speak button for assistant messages */}
              {msg.role === "assistant" && !msg.notFound && (
                <button
                  onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                  style={styles.speakBtn}
                  title={isSpeaking ? "Stop speaking" : "Read aloud"}
                >
                  {isSpeaking ? "⏹️" : "🔊"}
                </button>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.messageBubble, alignSelf: "flex-start", background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="spinner" /> Thinking...
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
          <button
            type="submit"
            className="btn-gradient"
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
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
