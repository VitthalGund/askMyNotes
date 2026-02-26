export default function PreviewModal({
  isOpen,
  fileUrl,
  fileName,
  onClose,
}: {
  isOpen: boolean;
  fileUrl: string | null;
  fileName: string;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="animate-fade-in glass-card">
        <div style={styles.header}>
          <h3 style={styles.title}>📄 {fileName}</h3>
          <button onClick={onClose} style={styles.closeBtn}>
            ×
          </button>
        </div>
        <div style={styles.body}>
          {fileUrl ? (
            <iframe
              src={fileName.toLowerCase().endsWith(".pdf") ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true` : fileUrl}
              style={styles.iframe}
              title={fileName}
            />
          ) : (
            <div style={styles.emptyState}>
              <p>Preview not available for this legacy document.</p>
              <p style={{ fontSize: 13, marginTop: 8, color: "var(--text-muted)" }}>
                Only newly uploaded documents with Cloudinary integration support live previews.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
  },
  modal: {
    width: "90%",
    maxWidth: 900,
    height: "85vh",
    display: "flex",
    flexDirection: "column",
    padding: 20,
    gap: 16,
    background: "var(--bg-secondary)", // Better contrast than transparent card
    border: "1px solid rgba(255, 255, 255, 0.15)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  closeBtn: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid var(--glass-border)",
    borderRadius: "50%",
    color: "var(--text-muted)",
    fontSize: 20,
    cursor: "pointer",
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  body: {
    flex: 1,
    background: "rgba(0,0,0,0.2)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    position: "relative",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    backgroundColor: "#fff", // Most PDFs are white, ensures readability
  },
  emptyState: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    color: "var(--text-secondary)",
  },
};
