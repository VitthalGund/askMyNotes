export default function ErrorModal({
  isOpen,
  message,
  onClose,
}: {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="animate-fade-in glass-card">
        <div style={styles.header}>
          <h3 style={styles.title}>Notice</h3>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>
        <div style={styles.body}>
          <p style={styles.message}>{message}</p>
        </div>
        <div style={styles.footer}>
          <button onClick={onClose} className="btn-secondary" style={styles.okBtn}>
            OK
          </button>
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
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    width: "90%",
    maxWidth: 400,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "var(--bg-secondary)", // Better contrast than transparent card
    border: "1px solid rgba(255, 255, 255, 0.15)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: 24,
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
  },
  body: {
    padding: "8px 0",
  },
  message: {
    fontSize: 15,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  okBtn: {
    padding: "8px 24px",
  },
};
