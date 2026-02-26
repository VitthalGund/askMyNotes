"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import UpgradeModal from "@/components/UpgradeModal";

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
  originalIndex?: number;
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

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeatureBlocked, setUpgradeFeatureBlocked] = useState<"subject" | "question">("question");

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
      const mistakes = mcqs.filter((q, idx) => selectedAnswers[idx] !== q.correctIndex);
      setMcqs(mistakes);
      setShortAnswers([]);
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

      if (res.status === 403 && data.reason === "limit_exceeded") {
         setUpgradeFeatureBlocked(data.feature || "question");
         setIsUpgradeModalOpen(true);
      } else if (!res.ok) {
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
      if (res.status === 403 && data.reason === "limit_exceeded") {
         setUpgradeFeatureBlocked(data.feature || "question");
         setIsUpgradeModalOpen(true);
         return;
      }
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
      if (res.status === 403 && data.reason === "limit_exceeded") {
         setUpgradeFeatureBlocked(data.feature || "question");
         setIsUpgradeModalOpen(true);
         return;
      }
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
      await fetch(`/api/subjects/${subjectId}/starred/${questionObj.starId}`, { method: "DELETE" });
      updateQuestionState(type, qIndex, { isStarred: false, starId: undefined });
    } else {
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

  if (status === "loading") {
    return (
      <div style={styles.loadingState}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Animated BG Orbs for "Startup UX" feel */}
      <div className="bg-orb" style={{ width: 600, height: 600, background: 'var(--accent-1)', top: '-10%', left: '-15%', animation: 'spin 40s linear infinite' }} />
      <div className="bg-orb" style={{ width: 500, height: 500, background: 'var(--accent-2)', bottom: '-10%', right: '-15%', animation: 'spin 30s linear infinite reverse' }} />

      {/* Header with Breadcrumb and AI Ready WOW Element */}
      <header style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <Link href="/dashboard" className="text-muted-plus hover:text-white transition-colors" style={{fontSize: 14, fontWeight: 500, textDecoration: 'none'}}>Dashboard</Link>
          <span style={{color: 'var(--glass-border)'}}>/</span>
          <span style={{fontSize: 14, fontWeight: 600, color: 'var(--text-primary)'}}>{subjectName || "Subject"}</span>
          <span style={{color: 'var(--glass-border)'}}>/</span>
          <span className="text-gradient" style={{fontSize: 14, fontWeight: 700}}>Study Mode</span>
        </div>
        
        {/* AI Performance Indicator (Mocked for perfection) */}
        <div style={{display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.03)', padding: '6px 16px', borderRadius: 20, border: '1px solid var(--glass-border)'}}>
           <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
             <div style={{width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)'}}></div>
             <span style={{fontSize: 12, fontWeight: 600, letterSpacing: 0.5}}>AI SYNCHRONIZED</span>
           </div>
        </div>
      </header>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingState}>
             <div className="typing-indicator" style={{marginBottom: 24}}>
               <div className="typing-dot"></div>
               <div className="typing-dot"></div>
               <div className="typing-dot"></div>
             </div>
            <h3 style={{fontSize: 20, fontWeight: 600, marginBottom: 8}}>Synthesizing Intelligence...</h3>
            <p className="text-muted-plus" style={{ fontSize: 14 }}>
              {mode === "activerecall" ? "Extracting high-yield concepts for flashcards." : mode === "cheatsheet" ? "Condensing your notes into a scannable master sheet." : "Generating a tailored assessment from your specific context."}
            </p>
          </div>
        ) : error ? (
          <div style={styles.errorState} className="glass-card">
            <p style={{ color: '#ef4444', fontSize: 15, fontWeight: 500 }}>⚠️ {error}</p>
            <button onClick={() => setMode("menu")} className="btn-secondary" style={{ marginTop: 20 }}>
              ← Return to Menu
            </button>
          </div>
        ) : mode === "menu" ? (
          // --- MENU MODE ---
          <div style={styles.menuContainer} className="animate-slide-in">
            {/* Subject Pill */}
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: 24}}>
               <div style={{background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.3)', padding: '6px 16px', borderRadius: 24, display: 'inline-flex', alignItems: 'center', gap: 8}}>
                 <span style={{fontSize: 16}}>🧠</span>
                 <span style={{fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#e9d5ff', textTransform: 'uppercase'}}>{subjectName}</span>
               </div>
            </div>

            {/* Main Quiz Card (Elevated) */}
            <div className="glass-card card-elevated" style={styles.mainCard}>
              <h2 style={{fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em'}}>Take a Dynamic Quiz</h2>
              <p className="text-muted-plus" style={{fontSize: 15, lineHeight: 1.6, marginBottom: 32}}>
                Test your knowledge with AI-generated MCQs and short answers tailored exactly to the geometry of your notes. Zero hallucination guarantee.
              </p>
              
              <div style={{marginBottom: 24}}>
                <label style={{fontSize: 13, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'block'}}>
                  Select Difficulty Level
                </label>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12}}>
                   <div className={`difficulty-pill ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => setDifficulty('easy')}>
                     <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                       <div style={{width: 8, height: 8, borderRadius: '50%', background: '#10b981'}}></div>
                       <span>Easy</span>
                     </div>
                     <span style={{fontSize: 11, fontWeight: 400, opacity: 0.8}}>Definitions & Basics</span>
                   </div>
                   
                   <div className={`difficulty-pill ${difficulty === 'medium' ? 'active' : ''}`} onClick={() => setDifficulty('medium')}>
                     <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                       <div style={{width: 8, height: 8, borderRadius: '50%', background: '#3b82f6'}}></div>
                       <span>Medium</span>
                     </div>
                     <span style={{fontSize: 11, fontWeight: 400, opacity: 0.8}}>Application & Logic</span>
                   </div>

                   <div className={`difficulty-pill ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => setDifficulty('hard')}>
                     <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                       <div style={{width: 8, height: 8, borderRadius: '50%', background: '#f59e0b'}}></div>
                       <span>Hard</span>
                     </div>
                     <span style={{fontSize: 11, fontWeight: 400, opacity: 0.8}}>Synthesis & Edge Cases</span>
                   </div>

                   <div className={`difficulty-pill ${difficulty === 'adaptive' ? 'active' : ''}`} onClick={() => setDifficulty('adaptive')}>
                     <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                       <div style={{width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6'}}></div>
                       <span>Increasing</span>
                     </div>
                     <span style={{fontSize: 11, fontWeight: 400, opacity: 0.8}}>Progressively Harder</span>
                   </div>
                </div>
              </div>
              
              <button onClick={() => generateQuiz(false)} className="btn-gradient" style={{width: '100%', padding: '16px 0', fontSize: 16, justifyContent: 'center'}}>
                <span style={{marginRight: 8, fontSize: 18}}>🚀</span> Generate Assessment
              </button>
            </div>

            {/* Secondary Tools Grid */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24}}>
              <div className="glass-card" style={styles.secondaryCard}>
                <div style={{fontSize: 36, marginBottom: 16, filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.3))'}}>⚡</div>
                <h3 style={{fontSize: 20, fontWeight: 700, marginBottom: 8}}>Active Recall</h3>
                <p className="text-muted-plus" style={{fontSize: 14, marginBottom: 24, lineHeight: 1.5, flex: 1}}>
                  Rapid-fire flashcards to prime your brain. Best done right before testing.
                </p>
                <button onClick={startActiveRecall} className="btn-secondary" style={{width: '100%', justifyContent: 'center'}}>
                  Start Drill
                </button>
              </div>

              <div className="glass-card" style={styles.secondaryCard}>
                <div style={{fontSize: 36, marginBottom: 16, filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.3))'}}>📝</div>
                <h3 style={{fontSize: 20, fontWeight: 700, marginBottom: 8}}>Cheat Sheet</h3>
                <p className="text-muted-plus" style={{fontSize: 14, marginBottom: 24, lineHeight: 1.5, flex: 1}}>
                  A highly condensed, scannable markdown summary of all your context notes.
                </p>
                <button onClick={generateCheatsheetSession} className="btn-secondary" style={{width: '100%', justifyContent: 'center'}}>
                  Generate Sheet
                </button>
              </div>
            </div>
          </div>
        ) : mode === "cheatsheet" ? (
          // --- CHEATSHEET MODE ---
          <div className="glass-card animate-fade-in" style={{padding: 40, background: 'rgba(20, 20, 35, 0.6)', border: '1px solid rgba(124, 58, 237, 0.2)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid var(--glass-border)', paddingBottom: 24}}>
              <div>
                <h2 style={{fontSize: 28, fontWeight: 800}}>Exam Cheatsheet</h2>
                <p className="text-muted-plus" style={{fontSize: 14, marginTop: 4}}>Generated directly from {subjectName}</p>
              </div>
              <div style={{display: 'flex', gap: 12}}>
                 <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(cheatsheet)}>📋 Copy Markdown</button>
              </div>
            </div>
            <div className="markdown-body" style={{fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)'}}>
              <ReactMarkdown>{cheatsheet}</ReactMarkdown>
            </div>
          </div>
        ) : mode === "activerecall" ? (
          // --- ACTIVE RECALL MODE ---
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60}}>
             {flashcards.length > 0 ? (
               <div className="glass-card card-elevated animate-fade-in" style={{width: '100%', maxWidth: 700, padding: 48, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                 <div style={{fontSize: 13, fontWeight: 700, color: 'var(--accent-2)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 24}}>
                   Flashcard {flashcardIndex + 1} of {flashcards.length}
                 </div>
                 
                 <h2 style={{fontSize: 28, fontWeight: 700, lineHeight: 1.4, marginBottom: 40}}>{flashcards[flashcardIndex].question}</h2>
                 
                 {showFlashcardAnswer ? (
                   <div className="animate-fade-in" style={{background: 'rgba(16, 185, 129, 0.1)', padding: 32, borderRadius: 16, border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                     <p style={{fontSize: 18, color: '#10b981', fontWeight: 600, lineHeight: 1.5}}>{flashcards[flashcardIndex].answer}</p>
                     <p style={{fontSize: 13, color: 'var(--text-muted)', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
                       <span>📄</span> {flashcards[flashcardIndex].citation.fileName}
                     </p>
                   </div>
                 ) : (
                   <button onClick={() => setShowFlashcardAnswer(true)} className="btn-gradient" style={{alignSelf: 'center', padding: '16px 40px', fontSize: 16}}>
                     Reveal Knowledge
                   </button>
                 )}
                 
                 {showFlashcardAnswer && (
                   <div style={{display: 'flex', justifyContent: 'center', gap: 16, marginTop: 40}}>
                     <button className="btn-secondary" style={{padding: '12px 32px'}} onClick={() => {
                        if (flashcardIndex < flashcards.length - 1) {
                          setFlashcardIndex(prev => prev + 1);
                          setShowFlashcardAnswer(false);
                        } else {
                          setMode("menu");
                        }
                     }}>
                        {flashcardIndex < flashcards.length - 1 ? "Next Card →" : "Finish Drill 🏆"}
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
                  <h2 style={{fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em'}}>Multiple Choice</h2>
                  <div style={{padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid var(--glass-border)'}}>
                    <span style={{fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1}}>{difficulty} LEVEL</span>
                  </div>
                </div>
                
                <div style={styles.questionGrid}>
                  {mcqs.map((q, idx) => {
                    const isRevealed = revealedMCQ.has(idx);
                    const selected = selectedAnswers[idx];
                    const isCorrect = selected === q.correctIndex;

                    return (
                      <div key={idx} className="glass-card animate-fade-in" style={{ ...styles.questionCard, animationDelay: `${idx * 0.1}s` }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                          <div style={styles.qNumber}>Question {idx + 1}</div>
                          <button 
                            onClick={() => toggleStar("mcq", idx, q)}
                            style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, cursor: 'pointer', fontSize: 18, opacity: q.isStarred ? 1 : 0.5, transition: 'all 0.2s', padding: '6px 10px'}}
                            title={q.isStarred ? "Unstar" : "Star to review later"}
                            className="hover:bg-white/10"
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
                              optStyle = { ...optStyle, background: 'rgba(124, 58, 237, 0.2)', borderColor: 'var(--accent-1)' };
                            }

                            return (
                              <button
                                key={oi}
                                onClick={() => selectMCQAnswer(idx, oi)}
                                style={optStyle}
                                disabled={isRevealed}
                              >
                                <span style={{...styles.optLabel, background: selected === oi ? 'rgba(124, 58, 237, 0.5)' : 'rgba(255,255,255,0.1)'}}>
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <span style={{lineHeight: 1.5}}>{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {!isRevealed && selected !== undefined && (
                          <button onClick={() => revealMCQAnswer(idx)} className="btn-secondary" style={{ marginTop: 16, fontSize: 13, padding: '8px 20px' }}>
                            Verify Concept
                          </button>
                        )}

                        {isRevealed && (
                          <div style={styles.explanation} className="animate-slide-in">
                            <p style={{ fontSize: 14, color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 700, marginBottom: 8 }}>
                              {isCorrect ? "✅ Perfect Execution!" : "❌ Concept Missed"}
                            </p>
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>{q.explanation}</p>
                            <div style={styles.citationBadge}>
                              📄 {q.citation.fileName} — Page {q.citation.pageNumber}
                            </div>
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
                    style={{ marginTop: 40, width: '100%', padding: '20px 0', fontSize: 18, borderRadius: 16, boxShadow: '0 10px 30px rgba(124, 58, 237, 0.3)' }}
                    disabled={Object.keys(selectedAnswers).length < mcqs.length}
                  >
                    Submit Assessment & Calculate Score 🎯
                  </button>
                )}

                {score !== null && (
                  <div className="glass-card animate-fade-in card-elevated" style={{ padding: 48, marginTop: 40, textAlign: 'center' }}>
                    <div style={{fontSize: 64, marginBottom: 16}}>{score === mcqs.length ? '🏆' : score > mcqs.length / 2 ? '🔥' : '🧠'}</div>
                    <h3 style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 24, letterSpacing: '-0.03em' }}>
                      {score} / {mcqs.length}
                    </h3>
                    <p style={{fontSize: 18, color: 'var(--text-secondary)', marginBottom: 32}}>
                      {score === mcqs.length ? "Flawless victory. You've mastered this material." : "Solid effort. Let's review the concepts you missed."}
                    </p>
                    
                    {score < mcqs.length && (
                       <button onClick={() => generateQuiz(true)} className="btn-secondary" style={{padding: '16px 32px', fontSize: 16, borderRadius: 12}}>
                         ↺ Drill Incorrect Answers
                       </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Short Answer */}
            {shortAnswers.length > 0 && (
              <section style={{ marginTop: 80 }}>
                <h2 style={{fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 24}}>Constructed Response</h2>
                <div style={styles.questionGrid}>
                  {shortAnswers.map((q, idx) => {
                    const isRevealed = revealedSA.has(idx);

                    return (
                      <div key={idx} className="glass-card animate-fade-in" style={{ ...styles.questionCard, animationDelay: `${idx * 0.1}s` }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                          <div style={styles.qNumber}>Prompt {mcqs.length + idx + 1}</div>
                          <button 
                            onClick={() => toggleStar("short_answer", idx, q)}
                            style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, cursor: 'pointer', fontSize: 18, opacity: q.isStarred ? 1 : 0.5, transition: 'all 0.2s', padding: '6px 10px'}}
                            title={q.isStarred ? "Unstar" : "Star to review later"}
                            className="hover:bg-white/10"
                          >
                            ⭐
                          </button>
                        </div>
                        <p style={styles.qText}>{q.question}</p>

                        <textarea
                          className="input-field"
                          placeholder="Draft your thoughts here to compare against the model logic..."
                          rows={4}
                          style={{ resize: "vertical", marginTop: 20, fontSize: 15, lineHeight: 1.6, padding: 16 }}
                        />

                        <button
                          onClick={() => revealSAAnswer(idx)}
                          className="btn-secondary"
                          style={{ marginTop: 20, fontSize: 14, padding: '10px 24px' }}
                        >
                          {isRevealed ? "Hide Model Architecture" : "Reveal Model Logic"}
                        </button>

                        {isRevealed && (
                          <div style={styles.modelAnswer} className="animate-slide-in">
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                              Model Ground Truth
                            </p>
                            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7 }}>
                              {q.modelAnswer}
                            </p>
                            <div style={{...styles.citationBadge, marginTop: 16}}>
                              📄 {q.citation.fileName} — Page {q.citation.pageNumber}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            
            {/* Safe spacing at bottom */}
            <div style={{height: 100}}></div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureBlocked={upgradeFeatureBlocked}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", position: "relative", overflow: "hidden" },
  header: {
    position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(10, 10, 26, 0.4)", backdropFilter: "blur(20px)",
  },
  content: { position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "60px 24px 80px" },
  loadingState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500 },
  errorState: { padding: 40, textAlign: "center", margin: "40px auto", maxWidth: 500 },
  
  menuContainer: { display: "flex", flexDirection: "column", maxWidth: 700, margin: "0 auto" },
  mainCard: { padding: 48, position: "relative" },
  secondaryCard: { padding: 32, display: "flex", flexDirection: "column" },
  
  quizWrapper: { maxWidth: 860, margin: "0 auto" },
  sectionHeaderLine: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' },
  questionGrid: { display: "flex", flexDirection: "column", gap: 32 },
  questionCard: { padding: 40 },
  qNumber: { fontSize: 12, fontWeight: 800, color: "var(--accent-1)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 },
  qText: { fontSize: 18, fontWeight: 600, lineHeight: 1.6, color: '#fff', letterSpacing: '-0.01em' },
  options: { display: "flex", flexDirection: "column", gap: 12, marginTop: 24 },
  option: {
    display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px", borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)", color: "var(--text-primary)",
    cursor: "pointer", fontSize: 15, textAlign: "left" as const, transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", width: "100%",
  },
  optLabel: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, transition: "all 0.2s" },
  explanation: { marginTop: 24, padding: "20px 24px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", borderLeft: "4px solid var(--accent-1)" },
  modelAnswer: { marginTop: 24, padding: "20px 24px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", borderLeft: "4px solid var(--accent-3)" },
  citationBadge: { display: "inline-block", padding: "6px 12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", fontSize: 12, color: "var(--text-muted)", marginTop: 12, border: "1px solid rgba(255,255,255,0.05)" },
};
