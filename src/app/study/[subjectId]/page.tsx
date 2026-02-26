"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

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
  isStarred?: boolean;
  starId?: string;
  originalIndex?: number; // Used for repeating mistakes
}

interface ShortAnswer {
  question: string;
  modelAnswer: string;
  citation: Citation;
  isStarred?: boolean;
  starId?: string;
}

interface Flashcard {
  question: string;
  answer: string;
  citation: Citation;
}

export default function StudyModePage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  
  // Quiz State
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [shortAnswers, setShortAnswers] = useState<ShortAnswer[]>([]);
  const [difficulty, setDifficulty] = useState("medium");
  
  // Interaction State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedMCQ, setRevealedMCQ] = useState<Set<number>>(new Set());
  const [revealedSA, setRevealedSA] = useState<Set<number>>(new Set());
  const [score, setScore] = useState<number | null>(null);
  
  // Global State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [mode, setMode] = useState<"menu" | "quiz" | "activerecall" | "cheatsheet">("menu");

  // Feature State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cheatsheet, setCheatsheet] = useState<string>("");
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

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

  // --- FEATURE ACTIONS ---

  const generateQuiz = async (retryMistakesMode: boolean = false) => {
    setLoading(true);
    setError("");
    setSelectedAnswers({});
    setRevealedMCQ(new Set());
    setRevealedSA(new Set());
    setScore(null);
    setMode("quiz");

    if (retryMistakesMode) {
      // Just filter current mcqs
      const mistakes = mcqs.filter((q, idx) => selectedAnswers[idx] !== q.correctIndex);
      setMcqs(mistakes);
      setShortAnswers([]); // skip SA for mistake review
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/subjects/${subjectId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty })
      });
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

  const startActiveRecall = async () => {
    setLoading(true);
    setError("");
    setMode("activerecall");
    setFlashcardIndex(0);
    setShowFlashcardAnswer(false);
    
    try {
      const res = await fetch(`/api/subjects/${subjectId}/activerecall`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFlashcards(data.flashcards || []);
    } catch (err: any) {
      setError("Failed to generate active recall session.");
    } finally {
      setLoading(false);
    }
  };

  const generateCheatsheetSession = async () => {
    setLoading(true);
    setError("");
    setMode("cheatsheet");
    
    try {
      const res = await fetch(`/api/subjects/${subjectId}/cheatsheet`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCheatsheet(data.cheatsheet || "");
    } catch (err: any) {
      setError("Failed to generate cheatsheet.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (type: "mcq" | "short_answer", qIndex: number, questionObj: any) => {
    const isStarred = questionObj.isStarred;
    
    if (isStarred && questionObj.starId) {
      // Delete star
      await fetch(`/api/subjects/${subjectId}/starred/${questionObj.starId}`, { method: "DELETE" });
      updateQuestionState(type, qIndex, { isStarred: false, starId: undefined });
    } else {
      // Add star
      const payload = { ...questionObj, type };
      const res = await fetch(`/api/subjects/${subjectId}/starred`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        updateQuestionState(type, qIndex, { isStarred: true, starId: data.star._id });
      }
    }
  };

  const updateQuestionState = (type: "mcq" | "short_answer", index: number, updates: any) => {
    if (type === "mcq") {
      const newArr = [...mcqs];
      newArr[index] = { ...newArr[index], ...updates };
      setMcqs(newArr);
    } else {
      const newArr = [...shortAnswers];
      newArr[index] = { ...newArr[index], ...updates };
      setShortAnswers(newArr);
    }
  };

  // --- QUIZ LOGIC ---

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
    const all = new Set(mcqs.map((_, i) => i));
    setRevealedMCQ(all);
  };

  // --- RENDER HELPERS ---

  if (status === "loading") {
    return (
      <div style={styles.loadingState}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div className="bg-orb" style={{ width: 500, height: 500, background: 'var(--accent-2)', top: '-15%', left: '-10%' }} />
      <div className="bg-orb" style={{ width: 300, height: 300, background: 'var(--accent-1)', bottom: '-5%', right: '-5%' }} />

      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => {
          if (mode === "menu") router.push("/dashboard");
          else setMode("menu");
        }} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
          ← Back
        </button>
        <div style={styles.headerCenter}>
          <h1 style={styles.headerTitle}>🧠 Study Mode</h1>
          <span style={styles.headerBadge}>{subjectName}</span>
        </div>
        <div style={{width: 70}} /> {/* Spacer for centering */}
      </header>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingState}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
              {mode === "activerecall" ? "Generating flashcards..." : mode === "cheatsheet" ? "Synthesizing cheatsheet..." : "Generating quiz from your notes..."}
            </p>
          </div>
        ) : error ? (
          <div style={styles.errorState} className="glass-card">
            <p style={{ color: '#ef4444', fontSize: 14 }}>⚠️ {error}</p>
            <button onClick={() => setMode("menu")} className="btn-secondary" style={{ marginTop: 12 }}>
              Return to Menu
            </button>
          </div>
        ) : mode === "menu" ? (
          // --- MENU MODE ---
          <div style={styles.menuContainer}>
            <div className="glass-card" style={styles.menuCard}>
              <h2 style={{fontSize: 24, fontWeight: 700, marginBottom: 8}}>Take a Quiz</h2>
              <p style={{color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20}}>Test your knowledge with AI-generated MCQs and short answers tailored to your exact notes.</p>
              
              <div style={styles.difficultySelector}>
                <label style={{fontSize: 13, fontWeight: 600, color: 'var(--text-muted)'}}>Difficulty Level:</label>
                <select 
                  className="input-field" 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  style={{marginTop: 8, padding: 10}}
                >
                  <option value="easy">Easy (Definitions & Basics)</option>
                  <option value="medium">Medium (Application)</option>
                  <option value="hard">Hard (Synthesis & Edge Cases)</option>
                  <option value="adaptive">Increasing (Gets harder as you go)</option>
                </select>
              </div>
              <button onClick={() => generateQuiz(false)} className="btn-gradient" style={{width: '100%', marginTop: 16}}>
                Start Quiz
              </button>
            </div>

            <div style={{display: 'flex', gap: 20, marginTop: 20}}>
              <div className="glass-card" style={{...styles.menuCard, flex: 1}}>
                <div style={{fontSize: 32, marginBottom: 12}}>⚡</div>
                <h3 style={{fontSize: 18, fontWeight: 700, marginBottom: 8}}>Active Recall</h3>
                <p style={{color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16}}>Rapid-fire flashcards. Best done right before a quiz to prime your brain.</p>
                <button onClick={startActiveRecall} className="btn-secondary" style={{width: '100%'}}>Start Drill</button>
              </div>

              <div className="glass-card" style={{...styles.menuCard, flex: 1}}>
                <div style={{fontSize: 32, marginBottom: 12}}>📝</div>
                <h3 style={{fontSize: 18, fontWeight: 700, marginBottom: 8}}>Cheat Sheet</h3>
                <p style={{color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16}}>A highly condensed, scannable markdown summary of all your notes.</p>
                <button onClick={generateCheatsheetSession} className="btn-secondary" style={{width: '100%'}}>Generate</button>
              </div>
            </div>
          </div>
        ) : mode === "cheatsheet" ? (
          // --- CHEATSHEET MODE ---
          <div className="glass-card animate-fade-in" style={{padding: 32, background: 'rgba(255,255,255,0.02)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--glass-border)', paddingBottom: 16}}>
              <h2 style={{fontSize: 24, fontWeight: 700}}>Exam Cheatsheet</h2>
              <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(cheatsheet)}>Copy Text</button>
            </div>
            <div className="markdown-body" style={{fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)'}}>
              <ReactMarkdown>{cheatsheet}</ReactMarkdown>
            </div>
          </div>
        ) : mode === "activerecall" ? (
          // --- ACTIVE RECALL MODE ---
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40}}>
             {flashcards.length > 0 ? (
               <div className="glass-card animate-fade-in" style={{width: '100%', maxWidth: 600, padding: 40, textAlign: 'center', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                 <div style={{fontSize: 12, fontWeight: 700, color: 'var(--accent-1)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16}}>
                   Card {flashcardIndex + 1} of {flashcards.length}
                 </div>
                 
                 <h2 style={{fontSize: 24, fontWeight: 600, marginBottom: 32}}>{flashcards[flashcardIndex].question}</h2>
                 
                 {showFlashcardAnswer ? (
                   <div className="animate-fade-in" style={{background: 'rgba(16, 185, 129, 0.1)', padding: 24, borderRadius: 16, border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                     <p style={{fontSize: 16, color: '#10b981', fontWeight: 500}}>{flashcards[flashcardIndex].answer}</p>
                     <p style={{fontSize: 12, color: 'var(--text-muted)', marginTop: 12}}>📄 {flashcards[flashcardIndex].citation.fileName} — Page {flashcards[flashcardIndex].citation.pageNumber}</p>
                   </div>
                 ) : (
                   <button onClick={() => setShowFlashcardAnswer(true)} className="btn-gradient" style={{alignSelf: 'center', padding: '12px 32px'}}>Show Answer</button>
                 )}
                 
                 {showFlashcardAnswer && (
                   <div style={{display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32}}>
                     <button className="btn-secondary" onClick={() => {
                        if (flashcardIndex < flashcards.length - 1) {
                          setFlashcardIndex(prev => prev + 1);
                          setShowFlashcardAnswer(false);
                        } else {
                          setMode("menu");
                        }
                     }}>
                        {flashcardIndex < flashcards.length - 1 ? "Next Card →" : "Finish Drill"}
                     </button>
                   </div>
                 )}
               </div>
             ) : (
                <p>No flashcards generated.</p>
             )}
          </div>
        ) : (
          // --- QUIZ MODE ---
          <div style={styles.quizWrapper}>
            {/* MCQs */}
            {mcqs.length > 0 && (
              <section>
                <div style={styles.sectionHeaderLine}>
                  <h2 style={styles.sectionTitle}>Multiple Choice Questions</h2>
                  <span style={{fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase'}}>{difficulty} Difficulty</span>
                </div>
                
                <div style={styles.questionGrid}>
                  {mcqs.map((q, idx) => {
                    const isRevealed = revealedMCQ.has(idx);
                    const selected = selectedAnswers[idx];
                    const isCorrect = selected === q.correctIndex;

                    return (
                      <div key={idx} className="glass-card animate-fade-in" style={{ ...styles.questionCard, animationDelay: `${idx * 0.1}s` }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                          <div style={styles.qNumber}>Q{idx + 1}</div>
                          <button 
                            onClick={() => toggleStar("mcq", idx, q)}
                            style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, opacity: q.isStarred ? 1 : 0.3, transition: 'all 0.2s', padding: 4}}
                            title={q.isStarred ? "Unstar" : "Star to review later"}
                          >
                            ⭐
                          </button>
                        </div>

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
                    style={{ marginTop: 24, width: '100%', padding: '16px 0', fontSize: 16 }}
                    disabled={Object.keys(selectedAnswers).length < mcqs.length}
                  >
                    Submit All & See Score
                  </button>
                )}

                {score !== null && (
                  <div className="glass-card animate-fade-in" style={{ padding: 32, marginTop: 24, textAlign: 'center', background: 'rgba(124, 58, 237, 0.05)' }}>
                    <h3 style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16 }}>
                      Score: {score}/{mcqs.length}
                    </h3>
                    
                    {score < mcqs.length && (
                       <button onClick={() => generateQuiz(true)} className="btn-secondary" style={{padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: 8}}>
                         ↺ Re-attempt Mistakes
                       </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Short Answer */}
            {shortAnswers.length > 0 && (
              <section style={{ marginTop: 60 }}>
                <h2 style={styles.sectionTitle}>Short Answer Questions</h2>
                <div style={styles.questionGrid}>
                  {shortAnswers.map((q, idx) => {
                    const isRevealed = revealedSA.has(idx);

                    return (
                      <div key={idx} className="glass-card animate-fade-in" style={{ ...styles.questionCard, animationDelay: `${idx * 0.1}s` }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                          <div style={styles.qNumber}>Q{mcqs.length + idx + 1}</div>
                          <button 
                            onClick={() => toggleStar("short_answer", idx, q)}
                            style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, opacity: q.isStarred ? 1 : 0.3, transition: 'all 0.2s', padding: 4}}
                            title={q.isStarred ? "Unstar" : "Star to review later"}
                          >
                            ⭐
                          </button>
                        </div>
                        <p style={styles.qText}>{q.question}</p>

                        <textarea
                          className="input-field"
                          placeholder="Write your answer here..."
                          rows={3}
                          style={{ resize: "vertical", marginTop: 12 }}
                        />

                        <button
                          onClick={() => revealSAAnswer(idx)}
                          className="btn-secondary"
                          style={{ marginTop: 12, fontSize: 13 }}
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", position: "relative", overflow: "hidden" },
  header: {
    position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 24px", borderBottom: "1px solid var(--glass-border)", backdropFilter: "blur(20px)",
  },
  headerCenter: { textAlign: "center" },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  headerBadge: { fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 },
  content: { position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" },
  loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 },
  errorState: { padding: 32, textAlign: "center", margin: "40px auto", maxWidth: 500 },
  
  menuContainer: { display: "flex", flexDirection: "column", maxWidth: 600, margin: "40px auto 0" },
  menuCard: { padding: 32 },
  difficultySelector: { display: "flex", flexDirection: "column", marginTop: 16 },
  
  quizWrapper: {},
  sectionHeaderLine: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 700, margin: 0 },
  questionGrid: { display: "flex", flexDirection: "column", gap: 20 },
  questionCard: { padding: 24 },
  qNumber: { fontSize: 11, fontWeight: 700, color: "var(--accent-1)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  qText: { fontSize: 16, fontWeight: 600, lineHeight: 1.5 },
  options: { display: "flex", flexDirection: "column", gap: 10, marginTop: 16 },
  option: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: "12px",
    border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)",
    cursor: "pointer", fontSize: 14, textAlign: "left" as const, transition: "all 0.2s", width: "100%",
  },
  optLabel: { width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  explanation: { marginTop: 16, padding: "12px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", borderLeft: "3px solid var(--accent-1)" },
  modelAnswer: { marginTop: 16, padding: "12px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", borderLeft: "3px solid var(--accent-3)" },
  citationText: { fontSize: 11, color: "var(--text-muted)", marginTop: 8 },
};
