"use client";

import { COLORS, getShape } from "@/lib/tetris/tetromino";
import type { PieceKind } from "@/lib/tetris/types";

export default function PiecePreview({
  kind,
  cellSize = 16,
}: {
  kind: PieceKind | null;
  cellSize?: number;
}) {
  const size = cellSize * 4;
  if (!kind) {
    return (
      <div
        className="bg-[color:var(--color-panel)] rounded border border-[color:var(--color-border)]"
        style={{ width: size, height: size }}
      />
    );
  }
  const shape = getShape(kind, 0);
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = (maxX - minX + 1) * cellSize;
  const h = (maxY - minY + 1) * cellSize;
  return (
    <div
      className="bg-[color:var(--color-panel)] rounded border border-[color:var(--color-border)] flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="relative" style={{ width: w, height: h }}>
        {shape.map(([x, y], i) => (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: (x - minX) * cellSize,
              top: (y - minY) * cellSize,
              width: cellSize - 2,
              height: cellSize - 2,
              background: COLORS[kind],
              boxShadow: "inset 0 2px 0 rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
