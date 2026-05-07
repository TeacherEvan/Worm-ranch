import type { DisplayProfile } from "@/game/detection";
import styles from "./WormRanchShellHeader.module.css";

type WormRanchShellHeaderSharedProps = {
  shellProfile: DisplayProfile;
  shellScanProfile: DisplayProfile | "scanning";
};

type WormRanchShellHeaderStandardProps = WormRanchShellHeaderSharedProps & {
  density?: "standard";
  totalWorms: number;
};

type WormRanchShellHeaderWelcomeProps = WormRanchShellHeaderSharedProps & {
  density: "welcome";
};

type WormRanchShellHeaderProps = WormRanchShellHeaderStandardProps | WormRanchShellHeaderWelcomeProps;

const STANDARD_COPY =
  "A neon pasture scramble where every bagged worm spooks the herd, the blink fence wakes late, and the last outlaw was never bred to lose.";

export function WormRanchShellHeader(props: WormRanchShellHeaderProps) {
  const { density = "standard", shellProfile, shellScanProfile } = props;
  const chips =
    props.density === "welcome"
      ? [
          { label: "Pasture scan", value: shellScanProfile },
          { label: "Loaded tack", value: shellProfile },
        ]
      : [
          { label: "Pasture scan", value: shellScanProfile },
          { label: "Loaded tack", value: shellProfile },
          { label: "Loose herd", value: String(props.totalWorms) },
        ];

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.eyebrow}>Orbit corral panic</span>
        <h1 className={styles.title}>Worm Ranch</h1>
        {density === "standard" && <p className={styles.subtle}>{STANDARD_COPY}</p>}
      </div>
      <div className={styles.chips}>
        {chips.map((chip) => (
          <span key={chip.label} className={styles.chip}>
            {chip.label}: {chip.value}
          </span>
        ))}
      </div>
    </header>
  );
}