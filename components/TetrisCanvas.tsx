"use client";

import { useEffect, useRef } from "react";
import { BOARD_WIDTH, BUFFER, VISIBLE_HEIGHT, type GameState } from "@/lib/tetris/types";
import { COLORS, getShape } from "@/lib/tetris/tetromino";
import { getGhostY } from "@/lib/tetris/game";

interface Props {
  state: GameState;
  version: number;
  cellSize?: number;
  gameOverFillRow?: number | null;
}

export default function TetrisCanvas({ state, version, cellSize = 28, gameOverFillRow = null }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const width = BOARD_WIDTH * cellSize;
  const height = VISIBLE_HEIGHT * cellSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background
    ctx.fillStyle = "#0f0f18";
    ctx.fillRect(0, 0, width, height);

    // grid
    ctx.strokeStyle = "#1e1e2a";
    ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize + 0.5, 0);
      ctx.lineTo(x * cellSize + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= VISIBLE_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize + 0.5);
      ctx.lineTo(width, y * cellSize + 0.5);
      ctx.stroke();
    }

    const drawCell = (cx: number, cy: number, color: string, alpha = 1) => {
      if (cy < 0) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(cx * cellSize + 1, cy * cellSize + 1, cellSize - 2, cellSize - 2);
      // inner highlight
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(cx * cellSize + 1, cy * cellSize + 1, cellSize - 2, 3);
      ctx.globalAlpha = 1;
    };

    // locked cells (shift by buffer for display)
    for (let y = 0; y < VISIBLE_HEIGHT; y++) {
      const row = state.board[y + BUFFER];
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = row[x];
        if (cell) drawCell(x, y, COLORS[cell]);
      }
    }

    // ghost piece
    const ghostY = getGhostY(state);
    const shape = getShape(state.current.kind, state.current.rotation);
    for (const [dx, dy] of shape) {
      const x = state.current.x + dx;
      const y = ghostY + dy - BUFFER;
      if (x >= 0 && x < BOARD_WIDTH && y >= 0 && y < VISIBLE_HEIGHT) {
        drawCell(x, y, COLORS[state.current.kind], 0.22);
      }
    }

    // current piece
    for (const [dx, dy] of shape) {
      const x = state.current.x + dx;
      const y = state.current.y + dy - BUFFER;
      if (x >= 0 && x < BOARD_WIDTH && y >= -BUFFER && y < VISIBLE_HEIGHT) {
        drawCell(x, y, COLORS[state.current.kind]);
      }
    }

    // Game over fill animation: fill rows [fillRow..BOARD_HEIGHT-1] with colored blocks.
    if (gameOverFillRow !== null) {
      const palette = Object.values(COLORS);
      for (let by = gameOverFillRow; by < state.board.length; by++) {
        const displayY = by - BUFFER;
        if (displayY < 0) continue;
        for (let bx = 0; bx < BOARD_WIDTH; bx++) {
          // Deterministic "random" color per cell so it looks fun but doesn't flicker.
          const color = palette[(bx * 7 + by * 13) % palette.length];
          ctx.globalAlpha = 1;
          ctx.fillStyle = color;
          ctx.fillRect(
            bx * cellSize + 1,
            displayY * cellSize + 1,
            cellSize - 2,
            cellSize - 2,
          );
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(
            bx * cellSize + 1,
            displayY * cellSize + 1,
            cellSize - 2,
            3,
          );
        }
      }
    }

    if (state.isPaused && !state.isGameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#f3f4f6";
      ctx.textAlign = "center";
      ctx.font = "bold 28px ui-sans-serif, system-ui";
      ctx.fillText("PAUSE", width / 2, height / 2);
    }
  }, [state, version, cellSize, width, height, gameOverFillRow]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded border border-[color:var(--color-border)] touch-none select-none"
      aria-label="Tetris board"
    />
  );
}
