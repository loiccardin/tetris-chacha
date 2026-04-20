"use client";

import type { GameState } from "@/lib/tetris/types";
import PiecePreview from "./PiecePreview";

export default function HUD({ state }: { state: GameState }) {
  const seconds = Math.floor(state.durationMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <aside className="flex flex-col gap-4 min-w-[140px]">
      <Stat label="Score" value={state.score.toLocaleString()} />
      <Stat label="Lines" value={state.lines.toString()} />
      <Stat label="Level" value={state.level.toString()} />
      <Stat label="Time" value={`${mm}:${ss}`} />

      <div>
        <div className="text-xs uppercase text-neutral-400 mb-1">Hold</div>
        <PiecePreview kind={state.hold} />
      </div>

      <div>
        <div className="text-xs uppercase text-neutral-400 mb-1">Next</div>
        <div className="flex flex-col gap-2">
          {state.next.map((k, i) => (
            <PiecePreview key={i} kind={k} cellSize={14} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded px-3 py-2">
      <div className="text-xs uppercase text-neutral-400">{label}</div>
      <div className="font-mono text-xl tabular-nums">{value}</div>
    </div>
  );
}
