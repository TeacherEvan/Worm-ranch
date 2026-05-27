import React from "react";

type Props = {
  time?: string | null;
  kills: number;
};

export default function GameHUD({ time, kills }: Props) {
  const common: React.CSSProperties = {
    position: "absolute",
    padding: "6px 8px",
    background: "rgba(0,0,0,0.36)",
    color: "#fff",
    fontSize: 13,
    borderRadius: 6,
    pointerEvents: "none",
    WebkitFontSmoothing: "antialiased",
  };

  return (
    <>
      {time ? (
        <div aria-label="game time" style={{ ...common, left: 8, top: 8 }}>
          {time}
        </div>
      ) : null}
      <div aria-label="worms killed" style={{ ...common, right: 8, top: 8 }}>
        {kills}
      </div>
    </>
  );
}
