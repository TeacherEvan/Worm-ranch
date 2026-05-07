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
const WELCOME_EYEBROW = "Moonlit trouble";
const STANDARD_EYEBROW = "Orbit corral panic";

export function WormRanchShellHeader(props: WormRanchShellHeaderProps) {
  const { density = "standard" } = props;
  const chips =
    props.density === "welcome"
      ? []
      : [
          { label: "Pasture scan", value: props.shellScanProfile },
          { label: "Loaded tack", value: props.shellProfile },
          { label: "Loose herd", value: String(props.totalWorms) },
        ];

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.eyebrow}>{density === "welcome" ? WELCOME_EYEBROW : STANDARD_EYEBROW}</span>
        <h1 className={styles.title}>Worm Ranch</h1>
        {density === "standard" && <p className={styles.subtle}>{STANDARD_COPY}</p>}
      </div>
      {chips.length > 0 ? (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <span key={chip.label} className={styles.chip}>
              {chip.label}: {chip.value}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}