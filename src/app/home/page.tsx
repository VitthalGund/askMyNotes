"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={styles.loadingWrapper}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const faqs = [
    {
      question: "How do I upload my notes?",
      answer: "Simply navigate to your Dashboard, create a new subject, and upload your PDF or TXT files. Our AI will process them instantly.",
    },
    {
      question: "Can I ask questions about specific documents?",
      answer: "Yes! Once your notes are uploaded, you can start a chat and ask any question. The AI will cite the exact document it used to answer.",
    },
    {
      question: "Is there a limit on how many subjects I can create?",
      answer: "Currently, you can create up to 3 subjects in the free tier, with unlimited document uploads per subject.",
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use industry-standard encryption to protect your data. Your documents are only accessible to you and the AI when making queries.",
    }
  ];

  return (
    <div style={styles.pageWrapper}>
      {/* Navbar overlay */}
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.logo}>📚 AskMyNotes</span>
        </div>
        <div style={styles.navRight}>
          <Link href="/dashboard" style={styles.navLink}>Dashboard</Link>
          <button style={styles.signOutBtn} onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <main style={styles.heroSection}>
        <video autoPlay loop muted playsInline style={styles.heroVideo}>
          <source src="/homepage_pune.mp4" type="video/mp4" />
        </video>
        <div style={styles.heroOverlay} />
        <div style={styles.heroGradientBottom} />

        <div className="animate-fade-in" style={styles.heroContent}>
          <div style={styles.heroBadge}>✨ The Safest AI for Serious Students</div>
          <h1 style={styles.welcomeTitle}>
            Turn Your Notes Into a Personal AI Tutor — <span style={styles.textAccent}>For Each Subject</span>
          </h1>
          <p style={styles.welcomeSub}>
            Upload your PDFs. Ask questions. Get cited answers, confidence scores, and instant practice tests. No guessing. No hallucinations.
          </p>
          <div style={styles.actionButtons}>
            <button style={styles.primaryBtn} onClick={() => router.push("/dashboard")}>
              Try It Now
            </button>
            <button style={styles.demoBtn}>
              ▶ See How It Works (30 sec demo)
            </button>
          </div>
        </div>
      </main>

      <div style={styles.contentWrapper}>
        
        {/* 10. ZERO HALLUCINATION GUARANTEE */}
        <section style={styles.trustSection}>
          <div style={styles.trustCard}>
            <div style={styles.trustIcon}>🛡️</div>
            <h2 style={styles.trustTitle}>Zero Hallucination Guarantee</h2>
            <p style={styles.trustText}>
              AskMyNotes <strong>NEVER</strong> guesses. If the answer is not in your uploaded notes, it tells you clearly. It acts purely as a strict tutor over your exact curriculum.
            </p>
          </div>
        </section>

        {/* 2. WHY ASKMYNOTES IS DIFFERENT (Comparison) */}
        <section style={styles.section}>
          <div style={styles.container}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Why AskMyNotes is Different</h2>
              <p style={styles.sectionSub}>Stop hoping ChatGPT is right. Start knowing your exact course material.</p>
            </div>
            
            <div style={styles.comparisonGrid}>
              {/* Generic AI */}
              <div style={styles.compCardBad}>
                <h3 style={styles.compTitleBad}>❌ Generic AI</h3>
                <ul style={styles.compList}>
                  <li style={styles.compItemBad}>Mixes subjects and outside info</li>
                  <li style={styles.compItemBad}>Guesses answers (Hallucinates)</li>
                  <li style={styles.compItemBad}>No citations or proof provided</li>
                  <li style={styles.compItemBad}>Doesn&apos;t generate targeted MCQs</li>
                </ul>
              </div>
              
              {/* AskMyNotes */}
              <div style={styles.compCardGood}>
                <div style={styles.glowTop} />
                <h3 style={styles.compTitleGood}>✅ AskMyNotes</h3>
                <ul style={styles.compList}>
                  <li style={styles.compItemGood}>Strictly locked to one subject content</li>
                  <li style={styles.compItemGood}>Clearly says "Not found" if missing</li>
                  <li style={styles.compItemGood}>Provides Exact File + Page Citation</li>
                  <li style={styles.compItemGood}>Generates MCQs + short answers</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SEE IT IN ACTION (Mock Demo) */}
        <section style={styles.demoSection}>
          <div style={styles.container}>
            <div style={styles.demoLayout}>
              <div style={styles.demoText}>
                <h2 style={styles.sectionTitleLeft}>See It In Action</h2>
                <p style={styles.demoDesc}>
                  Every answer comes with undeniable proof. If you ask a question, AskMyNotes reads your slides and tells you exactly where it found the information. 
                </p>
                <div style={styles.checkList}>
                  <div style={styles.checkItem}>✓ Highlights exact quoted evidence</div>
                  <div style={styles.checkItem}>✓ Displays High/Medium/Low confidence</div>
                  <div style={styles.checkItem}>✓ Links directly to your source files</div>
                </div>
              </div>
              <div style={styles.demoVisual}>
                <div style={styles.mockChat}>
                  <div style={styles.mockUserBub}>What is Newton's Second Law?</div>
                  <div style={styles.mockAiBub}>
                    <p style={styles.mockAnsText}>Newton's second law states that the acceleration of an object depends upon two variables: the net force acting upon the object and the mass of the object (F = ma).</p>
                    <div style={styles.mockMeta}>
                      <span style={styles.badgeHigh}>🧠 Confidence: High</span>
                      <span style={styles.docLink}>📎 Physics_Unit2.pdf (Page 14)</span>
                    </div>
                    <div style={styles.mockEvidence}>
                      <strong>🔎 Evidence:</strong> "According to Newton's second law, F = ma, representing the relationship..."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. EXAM PRACTICE (Study Mode Showcase) */}
        <section style={styles.studySection}>
          <div style={styles.container}>
            <div style={styles.sectionHeader}>
              <div style={styles.heroBadge}>For Better Grades</div>
              <h2 style={styles.sectionTitle}>Turn Notes Into Exam Practice Instantly</h2>
              <p style={styles.sectionSub}>Students don't just want answers. They want better exam results.</p>
            </div>
            
            <div style={styles.studyGrid}>
              <div style={styles.studyCard}>
                <div style={styles.studyIcon}>📝</div>
                <h3 style={styles.studyCardTitle}>5 MCQs per session</h3>
                <p style={styles.studyCardText}>Instantly generates multiple choice questions with tricky distractors directly from your lecture notes.</p>
              </div>
              <div style={styles.studyCard}>
                <div style={styles.studyIcon}>✍️</div>
                <h3 style={styles.studyCardTitle}>Short Answer Challenges</h3>
                <p style={styles.studyCardText}>Tests your true understanding by making you write out concepts, graded against your rubrics.</p>
              </div>
              <div style={styles.studyCard}>
                <div style={styles.studyIcon}>🎯</div>
                <h3 style={styles.studyCardTitle}>Targeted to YOUR notes</h3>
                <p style={styles.studyCardText}>No random general knowledge questions. Every quiz tests only what your professor uploaded.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. VOICE FEATURES LIVE */}
        <section style={styles.voiceSection}>
          <div style={styles.container}>
            <div style={styles.voiceBox}>
              <div style={styles.voiceIcon}>🎙️</div>
              <h2 style={styles.voiceTitle}>Talk to Your Notes Like a Teacher</h2>
              <p style={styles.voiceText}>
                Leave the keyboard behind! You can now ask questions out loud, get teacher-style explanations spoken back to you, and converse naturally using Voice AI.
              </p>
              <div style={styles.liveBadge}>LIVE NOW</div>
            </div>
          </div>
        </section>

        {/* 6. SOCIAL PROOF (Testimonials) */}
        <section style={styles.testimonialSection}>
          <div style={styles.container}>
            <h2 style={styles.sectionTitle}>Trusted by serious students</h2>
            <div style={styles.testimonialGrid}>
              <div style={styles.testimoCard}>
                <p style={styles.quote}>"It feels like I built a private tutor strictly from my professor's lecture slides. It never confuses my specific curriculum with internet knowledge."</p>
                <div style={styles.author}>— Sarah J., CS Student</div>
              </div>
              <div style={styles.testimoCard}>
                <p style={styles.quote}>"The citations make it feel 100% trustworthy. I know exactly what slide to study before the exam. My study time is cut in half."</p>
                <div style={styles.author}>— Michael T., Pre-Med</div>
              </div>
              <div style={styles.testimoCard}>
                <p style={styles.quote}>"Generating exact MCQs from my 40-page PDFs the night before the exam saved my GPA. Incredible."</p>
                <div style={styles.author}>— Emily R., Law Student</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section style={styles.faqSection}>
          <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div style={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <div
                key={index}
                style={styles.faqItem}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <div style={styles.faqHeader}>
                  <h3 style={styles.faqQuestion}>{faq.question}</h3>
                  <span style={styles.faqIcon}>{openFaq === index ? "−" : "+"}</span>
                </div>
                {openFaq === index && (
                  <p style={styles.faqAnswer} className="animate-fade-in">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 7 & 8. FULL WIDTH FOOTER */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <div style={styles.footerBrandColumn}>
              <div style={styles.footerLogo}>📚 AskMyNotes</div>
              <p style={styles.footerText}>
                The ultimate AI-powered study copilot designed to organize, analyze, and converse with your strictly scoped study notes. No guesswork, just precision.
              </p>
            </div>
            
            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>Quick Links</h4>
              <div style={styles.footerLinks}>
                <Link href="/dashboard" style={styles.footerLink}>Dashboard</Link>
                <Link href="#" style={styles.footerLink}>Features</Link>
                <Link href="#" style={styles.footerLink}>Pricing</Link>
                <Link href="#" style={styles.footerLink}>Demo</Link>
              </div>
            </div>

            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>Legal</h4>
              <div style={styles.footerLinks}>
                <a href="#" style={styles.footerLink}>Privacy Policy</a>
                <a href="#" style={styles.footerLink}>Terms of Service</a>
                <a href="#" style={styles.footerLink}>Cookie Policy</a>
                <a href="#" style={styles.footerLink}>Academic Integrity</a>
              </div>
            </div>

            <div style={styles.footerColumn}>
              <h4 style={styles.footerHeading}>Connect</h4>
              <div style={styles.footerLinks}>
                <a href="#" style={styles.footerLink}>Twitter / X</a>
                <a href="#" style={styles.footerLink}>LinkedIn</a>
                <a href="#" style={styles.footerLink}>Contact Us</a>
                <a href="#" style={styles.footerLink}>Support Community</a>
              </div>
            </div>
          </div>
          
          <div style={styles.footerBottom}>
            <p style={styles.footerCopy}>
              &copy; {new Date().getFullYear()} AskMyNotes. All rights reserved. Built for students who care about their grades.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  pageWrapper: {
    position: "relative",
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#050511", 
  },
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 40px",
    color: "#fff",
    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 10,
  },
  navLeft: { display: "flex", alignItems: "center" },
  logo: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", cursor: "pointer" },
  navRight: { display: "flex", alignItems: "center", gap: "24px" },
  navLink: { color: "#fff", textDecoration: "none", fontSize: "15px", fontWeight: 500, transition: "opacity 0.2s" },
  signOutBtn: {
    background: "rgba(255, 255, 255, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    padding: "8px 16px",
    borderRadius: "20px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    backdropFilter: "blur(4px)",
    transition: "all 0.2s ease",
  },

  // HERO
  heroSection: {
    position: "relative",
    width: "100%",
    minHeight: "95vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "100px 20px 40px",
    overflow: "hidden", 
  },
  heroVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 0,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(5, 5, 17, 0.65)", // Darker for text legibility
    zIndex: 1,
    pointerEvents: "none",
  },
  heroGradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: "200px", 
    background: "linear-gradient(to bottom, rgba(5,5,17,0) 0%, #050511 100%)",
    zIndex: 1,
    pointerEvents: "none",
  },
  heroContent: {
    textAlign: "center", 
    maxWidth: "900px", 
    padding: "0 20px",
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  heroBadge: {
    background: "rgba(124, 58, 237, 0.2)",
    border: "1px solid rgba(124, 58, 237, 0.5)",
    color: "#c4b5fd",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    marginBottom: "24px",
    display: "inline-block",
  },
  welcomeTitle: {
    fontSize: "56px",
    fontWeight: 800,
    marginBottom: "24px",
    lineHeight: 1.15,
    textShadow: "0 4px 12px rgba(0,0,0,0.6)",
    color: "#fff",
    letterSpacing: "-1px",
  },
  textAccent: {
    background: "linear-gradient(135deg, #a78bfa, #60a5fa, #38bdf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  welcomeSub: {
    fontSize: "20px",
    lineHeight: 1.6,
    color: "rgba(255, 255, 255, 0.85)",
    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
    maxWidth: "700px",
    marginBottom: "40px",
  },
  actionButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
    color: "#fff",
    border: "none",
    padding: "16px 36px",
    borderRadius: "30px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(124, 58, 237, 0.4)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  demoBtn: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#fff",
    padding: "16px 36px",
    borderRadius: "30px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    transition: "all 0.2s ease",
  },

  contentWrapper: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    width: "100%",
    padding: "0 20px",
  },
  section: {
    padding: "80px 0",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: "60px",
  },
  sectionTitle: {
    fontSize: "36px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "16px",
    letterSpacing: "-0.5px",
  },
  sectionTitleLeft: {
    fontSize: "36px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "20px",
    letterSpacing: "-0.5px",
  },
  sectionSub: {
    fontSize: "18px",
    color: "var(--text-secondary)",
    maxWidth: "600px",
    margin: "0 auto",
    lineHeight: 1.6,
  },

  // GUARANTEE
  trustSection: {
    padding: "40px 20px",
    display: "flex",
    justifyContent: "center",
    marginTop: "-40px", // Pull it up slightly
  },
  trustCard: {
    background: "rgba(16, 185, 129, 0.05)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    borderRadius: "20px",
    padding: "24px 32px",
    display: "flex",
    alignItems: "center",
    gap: "24px",
    maxWidth: "800px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  },
  trustIcon: { fontSize: "40px" },
  trustTitle: { fontSize: "20px", fontWeight: 700, color: "#10b981", marginBottom: "8px" },
  trustText: { fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 },

  // COMPARISON
  comparisonGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  compCardBad: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "24px",
    padding: "40px 32px",
  },
  compCardGood: {
    background: "rgba(124, 58, 237, 0.08)",
    border: "1px solid rgba(124, 58, 237, 0.3)",
    borderRadius: "24px",
    padding: "40px 32px",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(124, 58, 237, 0.15)",
  },
  glowTop: {
    position: "absolute",
    top: 0,
    left: "20%",
    right: "20%",
    height: "2px",
    background: "linear-gradient(90deg, transparent, #a78bfa, transparent)",
    boxShadow: "0 0 20px 2px #a78bfa",
  },
  compTitleBad: { fontSize: "22px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "24px" },
  compTitleGood: { fontSize: "22px", fontWeight: 700, color: "#fff", marginBottom: "24px" },
  compList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px" },
  compItemBad: { color: "var(--text-muted)", fontSize: "16px", display: "flex", gap: "12px", alignItems: "center", opacity: 0.8 },
  compItemGood: { color: "#fff", fontSize: "16px", display: "flex", gap: "12px", alignItems: "center", fontWeight: 500 },

  // DEMO SECTION
  demoSection: {
    padding: "100px 0",
    background: "rgba(255,255,255,0.02)",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  demoLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "60px",
    alignItems: "center",
  },
  demoText: {},
  demoDesc: { fontSize: "18px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "32px" },
  checkList: { display: "flex", flexDirection: "column", gap: "16px" },
  checkItem: { fontSize: "16px", color: "#fff", fontWeight: 500 },
  demoVisual: {
    background: "rgba(30, 41, 59, 0.5)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "24px",
    padding: "30px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
  },
  mockChat: { display: "flex", flexDirection: "column", gap: "20px" },
  mockUserBub: {
    background: "var(--bg-card)", border: "1px solid var(--glass-border)", color: "#fff",
    padding: "16px 20px", borderRadius: "20px 20px 4px 20px", alignSelf: "flex-end", maxWidth: "80%", fontSize: "15px"
  },
  mockAiBub: {
    background: "linear-gradient(180deg, rgba(124, 58, 237, 0.1), rgba(30, 41, 59, 0.6))",
    border: "1px solid rgba(124, 58, 237, 0.3)", borderRadius: "20px 20px 20px 4px",
    padding: "24px", alignSelf: "flex-start", width: "100%"
  },
  mockAnsText: { color: "#fff", fontSize: "15px", lineHeight: 1.6, marginBottom: "20px" },
  mockMeta: { display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" },
  badgeHigh: { background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 },
  docLink: { background: "rgba(255,255,255,0.1)", color: "#e2e8f0", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 500 },
  mockEvidence: { borderLeft: "3px solid #7c3aed", paddingLeft: "16px", color: "var(--text-secondary)", fontSize: "14px", fontStyle: "italic", background: "rgba(0,0,0,0.2)", padding: "12px 16px", borderRadius: "0 8px 8px 0" },

  // STUDY SECTION
  studySection: { padding: "100px 0" },
  studyGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" },
  studyCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "32px", transition: "transform 0.2s" },
  studyIcon: { fontSize: "36px", marginBottom: "20px" },
  studyCardTitle: { fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "12px" },
  studyCardText: { color: "var(--text-secondary)", fontSize: "15px", lineHeight: 1.6 },

  // VOICE TEASER
  voiceSection: { padding: "40px 0 100px" },
  voiceBox: {
    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.15))",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "32px", padding: "60px 40px",
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: "800px", margin: "0 auto", position: "relative"
  },
  voiceIcon: { fontSize: "48px", marginBottom: "20px" },
  voiceTitle: { fontSize: "32px", fontWeight: 800, color: "#fff", marginBottom: "16px" },
  voiceText: { fontSize: "18px", color: "var(--text-secondary)", maxWidth: "600px", lineHeight: 1.6 },
  liveBadge: { position: "absolute", top: "-15px", background: "linear-gradient(90deg, #10b981, #3b82f6)", color: "#fff", padding: "6px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)" },

  // TESTIMONIALS
  testimonialSection: { padding: "80px 0", background: "rgba(255,255,255,0.02)" },
  testimonialGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" },
  testimoCard: { background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" },
  quote: { color: "#fff", fontSize: "16px", lineHeight: 1.6, fontStyle: "italic", marginBottom: "24px" },
  author: { color: "var(--text-muted)", fontSize: "14px", fontWeight: 600 },

  // FAQS
  faqSection: { padding: "100px 20px", display: "flex", flexDirection: "column", alignItems: "center" },
  faqContainer: { maxWidth: "800px", width: "100%", display: "flex", flexDirection: "column", gap: "16px" },
  faqItem: { background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px", padding: "24px", cursor: "pointer", transition: "all 0.2s ease" },
  faqHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  faqQuestion: { fontSize: "18px", fontWeight: 600, color: "#fff", margin: 0 },
  faqIcon: { fontSize: "24px", color: "var(--accent-2)", fontWeight: 300 },
  faqAnswer: { marginTop: "16px", color: "var(--text-secondary)", fontSize: "15px", lineHeight: 1.6 },

  // FOOTER - Making it full-width by having 100% width on the container and no max-width constraints on the inner wrapper other than reasonable read-lengths
  footer: {
    background: "rgba(10, 10, 26, 0.95)", // Solid dark base 
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    marginTop: "auto",
    width: "100%",
    padding: "80px 4% 40px", // Use percentages for full-width scaling
  },
  footerContent: {
    maxWidth: "1400px", // Much wider than 1200px from before
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "2.5fr 1fr 1fr 1fr", // Give brand column more space
    gap: "60px",
    marginBottom: "60px",
  },
  footerBrandColumn: { display: "flex", flexDirection: "column", gap: "20px", paddingRight: "40px" },
  footerColumn: { display: "flex", flexDirection: "column", gap: "20px" },
  footerLogo: { fontSize: "26px", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" },
  footerText: { color: "var(--text-secondary)", fontSize: "15px", lineHeight: 1.6, maxWidth: "400px" },
  footerHeading: { color: "#fff", fontSize: "17px", fontWeight: 600, margin: 0 },
  footerLinks: { display: "flex", flexDirection: "column", gap: "16px" },
  footerLink: { color: "var(--text-secondary)", textDecoration: "none", fontSize: "15px", transition: "color 0.2s", fontWeight: 500 },
  footerBottom: {
    maxWidth: "1400px",
    margin: "0 auto",
    paddingTop: "32px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    justifyContent: "center",
  },
  footerCopy: { color: "var(--text-muted)", fontSize: "14px", margin: 0 },
};
