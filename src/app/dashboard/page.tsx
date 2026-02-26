"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";



interface Subject {
  _id: string;
  name: string;
  createdAt: string;
}

interface DocInfo {
  _id: string;
  fileName: string;
  chunkCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectDocs, setSubjectDocs] = useState<Record<string, DocInfo[]>>({});
  const [newSubjectName, setNewSubjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      setSubjects(data.subjects || []);
      // Fetch docs for each subject
      for (const sub of data.subjects || []) {
        fetchDocs(sub._id);
      }
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocs = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}/documents`);
      const data = await res.json();
      setSubjectDocs((prev) => ({ ...prev, [subjectId]: data.documents || [] }));
    } catch (err) {
      console.error("Failed to fetch docs:", err);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchSubjects();
  }, [status, fetchSubjects]);

  const createSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubjectName.trim() }),
      });
      if (res.ok) {
        setNewSubjectName("");
        setShowCreate(false);
        fetchSubjects();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create subject");
      }
    } catch {
      alert("Failed to create subject");
    } finally {
      setCreating(false);
    }
  };

  const deleteSubject = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its notes?`)) return;
    try {
      await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      fetchSubjects();
    } catch {
      alert("Failed to delete subject");
    }
  };

  const handleFileUpload = async (subjectId: string, files: FileList) => {
    setUploadingFor(subjectId);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      const res = await fetch(`/api/subjects/${subjectId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        fetchDocs(subjectId);
      } else {
        const data = await res.json();
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploadingFor(null);
    }
  };

  const deleteDoc = async (subjectId: string, docId: string) => {
    try {
      await fetch(`/api/subjects/${subjectId}/documents/${docId}`, {
        method: "DELETE",
      });
      fetchDocs(subjectId);
    } catch {
      alert("Failed to delete document");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const userName = session?.user?.name || "Student";

  return (
    <div style={styles.page}>
      {/* Background orbs */}
      <div className="bg-orb" style={{ width: 500, height: 500, background: 'var(--accent-1)', top: '-15%', left: '-10%' }} />
      <div className="bg-orb" style={{ width: 400, height: 400, background: 'var(--accent-2)', bottom: '-10%', right: '-10%' }} />
      <div className="bg-orb" style={{ width: 300, height: 300, background: 'var(--accent-3)', top: '50%', left: '50%' }} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>📚 AskMyNotes</h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.greeting}>Hey, {userName} 👋</span>
          <button onClick={() => signOut()} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Your Subjects</h2>
            <p style={styles.sectionSub}>{subjects.length}/3 subjects created</p>
          </div>
          {subjects.length < 3 && (
            <button onClick={() => setShowCreate(true)} className="btn-gradient">
              + Add Subject
            </button>
          )}
        </div>

        {/* Create subject form */}
        {showCreate && (
          <form onSubmit={createSubject} style={styles.createForm} className="glass-card animate-fade-in">
            <input
              type="text"
              className="input-field"
              placeholder="Subject name (e.g., Machine Learning)"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-gradient" disabled={creating}>
                {creating ? <div className="spinner" /> : "Create"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Subject cards */}
        {subjects.length === 0 && !showCreate ? (
          <div style={styles.emptyState} className="glass-card">
            <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>No subjects yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              Create up to 3 subjects and upload your study notes to get started.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-gradient">
              + Create Your First Subject
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {subjects.map((sub, idx) => {
              const docs = subjectDocs[sub._id] || [];
              const totalChunks = docs.reduce((sum, d) => sum + d.chunkCount, 0);
              const colors = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)'];

              return (
                <div key={sub._id} className="glass-card animate-fade-in" style={{ ...styles.card, animationDelay: `${idx * 0.1}s` }}>
                  {/* Card header */}
                  <div style={styles.cardHeader}>
                    <div style={{ ...styles.cardDot, background: colors[idx % 3] }} />
                    <h3 style={styles.cardTitle}>{sub.name}</h3>
                    <button
                      onClick={() => deleteSubject(sub._id, sub.name)}
                      style={styles.deleteBtn}
                      title="Delete subject"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={styles.stats}>
                    <div style={styles.stat}>
                      <span style={styles.statNum}>{docs.length}</span>
                      <span style={styles.statLabel}>Files</span>
                    </div>
                    <div style={styles.stat}>
                      <span style={styles.statNum}>{totalChunks}</span>
                      <span style={styles.statLabel}>Chunks</span>
                    </div>
                  </div>

                  {/* Document list */}
                  {docs.length > 0 && (
                    <div style={styles.docList}>
                      {docs.map((doc) => (
                        <div key={doc._id} style={styles.docItem}>
                          <span style={styles.docName}>📄 {doc.fileName}</span>
                          <button
                            onClick={() => deleteDoc(sub._id, doc._id)}
                            style={styles.docDelete}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload */}
                  <label style={styles.uploadArea}>
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files) handleFileUpload(sub._id, e.target.files);
                      }}
                      disabled={uploadingFor === sub._id}
                    />
                    {uploadingFor === sub._id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="spinner" /> Uploading...
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: 20 }}>📤</span>
                        <span>Upload PDF or TXT files</span>
                      </>
                    )}
                  </label>

                  {/* Actions */}
                  <div style={styles.actions}>
                    <button
                      onClick={() => {
                        router.push(`/chat/${sub._id}`);
                      }}
                      className="btn-gradient"
                      style={{ flex: 1 }}
                      disabled={docs.length === 0}
                    >
                      💬 Ask Questions
                    </button>
                    <button
                      onClick={() => router.push(`/study/${sub._id}`)}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                      disabled={docs.length === 0}
                    >
                      🧠 Study Mode
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
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
    padding: "20px 32px",
    borderBottom: "1px solid var(--glass-border)",
    backdropFilter: "blur(20px)",
  },
  headerLeft: {},
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  greeting: {
    color: "var(--text-secondary)",
    fontSize: 14,
  },
  main: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
  },
  sectionSub: {
    color: "var(--text-muted)",
    fontSize: 13,
    marginTop: 4,
  },
  createForm: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 16,
    marginBottom: 24,
  },
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 20,
  },
  card: {
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    flex: 1,
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    opacity: 0.5,
    transition: "opacity 0.2s",
  },
  stats: {
    display: "flex",
    gap: 24,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
  },
  statNum: {
    fontSize: 20,
    fontWeight: 700,
    background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  statLabel: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  docList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxHeight: 120,
    overflowY: "auto",
  },
  docItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 10px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(255,255,255,0.03)",
    fontSize: 13,
  },
  docName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  docDelete: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 16,
    padding: "0 4px",
  },
  uploadArea: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    border: "2px dashed var(--glass-border)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontSize: 13,
    transition: "all 0.3s",
  },
  actions: {
    display: "flex",
    gap: 8,
  },
};
