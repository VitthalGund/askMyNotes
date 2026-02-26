"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Citation {
  fileName: string;
  pageNumber: number;
  chunkIndex: number;
}

interface MCQ {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  citation: Citation;
}

interface ShortAnswer {
  question: string;
  modelAnswer: string;
  citation: Citation;
}

export default function StudyModePage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [shortAnswers, setShortAnswers] = useState<ShortAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedMCQ, setRevealedMCQ] = useState<Set<number>>(new Set());
  const [revealedSA, setRevealedSA] = useState<Set<number>>(new Set());
  const [score, setScore] = useState<number | null>(null);

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

  const generateQuiz = async () => {
    setLoading(true);
    setError("");
    setSelectedAnswers({});
    setRevealedMCQ(new Set());
    setRevealedSA(new Set());
    setScore(null);

    try {
      const res = await fetch(`/api/subjects/${subjectId}/quiz`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate quiz");
      } else {
        setMcqs(data.mcqs || []);
        setShortAnswers(data.shortAnswer || []);
      }
    } catch {
      setError("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") generateQuiz();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const selectMCQAnswer = (qIdx: number, optIdx: number) => {
    if (revealedMCQ.has(qIdx)) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const revealMCQAnswer = (qIdx: number) => {
    setRevealedMCQ((prev) => new Set(prev).add(qIdx));
  };

  const revealSAAnswer = (qIdx: number) => {
    setRevealedSA((prev) => new Set(prev).add(qIdx));
  };

  const calculateScore = () => {
    let correct = 0;
    mcqs.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) correct++;
    });
    setScore(correct);
    // Reveal all
    const all = new Set(mcqs.map((_, i) => i));
    setRevealedMCQ(all);
  };

  return (
    <div style={styles.page}>
      <div className="bg-orb" style={{ width: 500, height: 500, background: 'var(--accent-2)', top: '-15%', left: '-10%' }} />
      <div className="bg-orb" style={{ width: 300, height: 300, background: 'var(--accent-1)', bottom: '-5%', right: '-5%' }} />

      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => router.push("/dashboard")} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
          ← Back
        </button>
        <div style={styles.headerCenter}>
          <h1 style={styles.headerTitle}>🧠 Study Mode</h1>
          <span style={styles.headerBadge}>{subjectName}</span>
        </div>
        <button onClick={generateQuiz} className="btn-gradient" disabled={loading} style={{ padding: '8px 16px', fontSize: 13 }}>
          🔄 New Quiz
        </button>
      </header>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingState}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
              Generating quiz from your notes...
            </p>
          </div>
        ) : error ? (
          <div style={styles.errorState} className="glass-card">
            <p style={{ color: '#ef4444', fontSize: 14 }}>⚠️ {error}</p>
            <button onClick={generateQuiz} className="btn-gradient" style={{ marginTop: 12 }}>
              Try Again
            </button>
          </div>
        ) : (
          <div style={styles.quizContainer}>
            {/* MCQs */}
            <section>
              <h2 style={styles.sectionTitle}>Multiple Choice Questions</h2>
              <div style={styles.questionGrid}>
                {mcqs.map((q, idx) => {
                  const isRevealed = revealedMCQ.has(idx);
                  const selected = selectedAnswers[idx];
                  const isCorrect = selected === q.correctIndex;

                  return (
                    <div key={idx} className="glass-card animate-fade-in" style={{ ...styles.questionCard, animationDelay: `${idx * 0.1}s` }}>
                      <div style={styles.qNumber}>Q{idx + 1}</div>
                      <p style={styles.qText}>{q.question}</p>

                      <div style={styles.options}>
                        {q.options.map((opt, oi) => {
                          let optStyle: React.CSSProperties = { ...styles.option };

                          if (isRevealed) {
                            if (oi === q.correctIndex) {
                              optStyle = { ...optStyle, background: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981', color: '#10b981' };
                            } else if (oi === selected && !isCorrect) {
                              optStyle = { ...optStyle, background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#ef4444' };
                            }
                          } else if (selected === oi) {
                            optStyle = { ...optStyle, background: 'rgba(124, 58, 237, 0.15)', borderColor: 'var(--accent-1)' };
                          }

                          return (
                            <button
                              key={oi}
                              onClick={() => selectMCQAnswer(idx, oi)}
                              style={optStyle}
                              disabled={isRevealed}
                            >
                              <span style={styles.optLabel}>{String.fromCharCode(65 + oi)}</span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {!isRevealed && selected !== undefined && (
                        <button onClick={() => revealMCQAnswer(idx)} className="btn-secondary" style={{ marginTop: 8, fontSize: 13 }}>
                          Check Answer
                        </button>
                      )}

                      {isRevealed && (
                        <div style={styles.explanation} className="animate-fade-in">
                          <p style={{ fontSize: 13, color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 600, marginBottom: 4 }}>
                            {isCorrect ? "✅ Correct!" : "❌ Incorrect"}
                          </p>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{q.explanation}</p>
                          <p style={styles.citationText}>
                            📄 {q.citation.fileName} — Page {q.citation.pageNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {mcqs.length > 0 && score === null && (
                <button
                  onClick={calculateScore}
                  className="btn-gradient"
                  style={{ marginTop: 16 }}
                  disabled={Object.keys(selectedAnswers).length < mcqs.length}
                >
                  Submit All & See Score
                </button>
              )}

              {score !== null && (
                <div className="glass-card animate-fade-in" style={{ padding: 20, marginTop: 16, textAlign: 'center' }}>
                  <h3 style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Score: {score}/{mcqs.length}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                    {score === mcqs.length ? "🎉 Perfect!" : score >= mcqs.length / 2 ? "👍 Good job!" : "📚 Keep studying!"}
                  </p>
                </div>
              )}
            </section>

            {/* Short Answer */}
            <section style={{ marginTop: 40 }}>
              <h2 style={styles.sectionTitle}>Short Answer Questions</h2>
              <div style={styles.questionGrid}>
                {shortAnswers.map((q, idx) => {
                  const isRevealed = revealedSA.has(idx);

                  return (
                    <div key={idx} className="glass-card animate-fade-in" style={{ ...styles.questionCard, animationDelay: `${idx * 0.1}s` }}>
                      <div style={styles.qNumber}>Q{mcqs.length + idx + 1}</div>
                      <p style={styles.qText}>{q.question}</p>

                      <textarea
                        className="input-field"
                        placeholder="Write your answer here..."
                        rows={3}
                        style={{ resize: "vertical", marginTop: 8 }}
                      />

                      <button
                        onClick={() => revealSAAnswer(idx)}
                        className="btn-secondary"
                        style={{ marginTop: 8, fontSize: 13 }}
                      >
                        {isRevealed ? "Hide Answer" : "Reveal Model Answer"}
                      </button>

                      {isRevealed && (
                        <div style={styles.modelAnswer} className="animate-fade-in">
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-3)', marginBottom: 4 }}>
                            📝 Model Answer:
                          </p>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {q.modelAnswer}
                          </p>
                          <p style={styles.citationText}>
                            📄 {q.citation.fileName} — Page {q.citation.pageNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
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
  content: {
    position: "relative",
    zIndex: 1,
    maxWidth: 900,
    margin: "0 auto",
    padding: "32px 24px 60px",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
  },
  errorState: {
    padding: 24,
    textAlign: "center",
  },
  quizContainer: {},
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  questionGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  questionCard: {
    padding: 20,
  },
  qNumber: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--accent-1)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  qText: {
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  options: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--glass-border)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left" as const,
    transition: "all 0.2s",
    fontFamily: "'Inter', sans-serif",
    width: "100%",
  },
  optLabel: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  explanation: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(255,255,255,0.03)",
    borderLeft: "3px solid var(--accent-1)",
  },
  modelAnswer: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(255,255,255,0.03)",
    borderLeft: "3px solid var(--accent-3)",
  },
  citationText: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 6,
  },
};
