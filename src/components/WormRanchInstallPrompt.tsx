import styles from "./WormRanchInstallPrompt.module.css";

type WormRanchInstallPromptProps = {
  visible: boolean;
  placement?: "floating" | "inline";
  onInstall: () => void;
  onDismiss: () => void;
};

export function WormRanchInstallPrompt({
  visible,
  placement = "floating",
  onInstall,
  onDismiss,
}: WormRanchInstallPromptProps) {
  if (!visible) {
    return null;
  }

  const copy =
    placement === "inline"
      ? "Add it once for faster jump-ins and a cleaner launch."
      : "Keep Worm Ranch on the desktop like a real cabinet. Install it once and jump straight back into the corral.";
  const label = placement === "inline" ? "Install the ranch app" : "Install ranch app";

  return (
    <aside
      className={`${styles.prompt} ${placement === "inline" ? styles.promptInline : ""}`.trim()}
      aria-live="polite"
      data-placement={placement}
    >
      <span className={styles.eyebrow}>{label}</span>
      <p className={styles.copy}>{copy}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.dismiss} onClick={onDismiss}>
          Later
        </button>
        <button type="button" className={styles.install} onClick={onInstall}>
          Install
        </button>
      </div>
    </aside>
  );
}