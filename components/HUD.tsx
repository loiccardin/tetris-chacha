"use client";

import type { GameState } from "@/lib/tetris/types";
import PiecePreview from "./PiecePreview";

interface Props {
  state: GameState;
  version: number;
  compact?: boolean;
}

export default function HUD({ state, compact = false }: Props) {
  const seconds = Math.floor(state.durationMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1 text-center">
          <MiniStat label="Score" value={state.score.toLocaleString()} />
          <MiniStat label="Lines" value={state.lines.toString()} />
          <MiniStat label="Lvl" value={state.level.toString()} />
          <MiniStat label="Time" value={`${mm}:${ss}`} />
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase text-neutral-500">Hold</div>
            <PiecePreview kind={state.hold} cellSize={10} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase text-neutral-500 mb-1">
              Next
            </div>
            <div className="flex gap-1 justify-start">
              {state.next.slice(0, 5).map((k, i) => (
                <PiecePreview key={i} kind={k} cellSize={10} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="flex flex-col gap-3 min-w-[140px]">
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded px-1 py-1">
      <div className="text-[9px] uppercase text-neutral-500">{label}</div>
      <div className="font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}
