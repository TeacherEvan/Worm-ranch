import { GAME_MODES, type GameMode } from "@/game/gameModes";

type GameModeScreenProps = {
  onBack: () => void;
  onSelectMode: (mode: GameMode) => void;
  onStart: () => void;
  selectedMode: GameMode;
};

export function GameModeScreen({ onBack, onSelectMode, onStart, selectedMode }: GameModeScreenProps) {
  return (
    <section data-layout="compact-mode-menu" aria-labelledby="game-mode-title">
      <header>
        <span>Game mode</span>
        <h2 id="game-mode-title">Pick the next roundup.</h2>
        <p>Choose the ride before the gate opens.</p>
      </header>

      <fieldset>
        <legend>Available rides</legend>
        {GAME_MODES.map((mode) => (
          <label key={mode.id}>
            <input
              autoFocus={selectedMode === mode.id}
              checked={selectedMode === mode.id}
              name="game-mode"
              onChange={() => onSelectMode(mode.id)}
              type="radio"
            />
            <span>{mode.title}</span>
            <small>{mode.description}</small>
          </label>
        ))}
      </fieldset>

      <div>
        <button onClick={onBack}>Back</button>
        <button onClick={onStart}>Ride this mode</button>
      </div>
    </section>
  );
}
