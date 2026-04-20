"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialState,
  hardDrop,
  hold as doHold,
  move,
  rotatePiece,
  softDrop,
  tick,
  togglePause,
} from "@/lib/tetris/game";
import type { GameState } from "@/lib/tetris/types";
import TetrisCanvas from "./TetrisCanvas";
import HUD from "./HUD";
import Controls from "./Controls";
import GameOverModal from "./GameOverModal";

export default function TetrisGame() {
  const stateRef = useRef<GameState>(createInitialState());
  const [version, setVersion] = useState(0);
  const rerender = useCallback(() => setVersion((c) => c + 1), []);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    rerender();
  }, [rerender]);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = Math.min(100, now - last);
      last = now;
      tick(stateRef.current, delta);
      rerender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rerender]);

  // Keyboard handling with DAS-like autorepeat for left/right and soft drop.
  useEffect(() => {
    const heldKeys = new Set<string>();
    let dasTimer: ReturnType<typeof setTimeout> | null = null;
    let arrInterval: ReturnType<typeof setInterval> | null = null;
    const DAS = 150;
    const ARR = 40;

    const clearRepeat = () => {
      if (dasTimer) clearTimeout(dasTimer);
      if (arrInterval) clearInterval(arrInterval);
      dasTimer = null;
      arrInterval = null;
    };

    const startRepeat = (fn: () => void) => {
      clearRepeat();
      fn();
      dasTimer = setTimeout(() => {
        arrInterval = setInterval(fn, ARR);
      }, DAS);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.repeat) return;
      const k = e.key;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", " ", "ArrowUp"].includes(k)) {
        e.preventDefault();
      }
      heldKeys.add(k);
      switch (k) {
        case "ArrowLeft":
          startRepeat(() => move(stateRef.current, -1));
          break;
        case "ArrowRight":
          startRepeat(() => move(stateRef.current, 1));
          break;
        case "ArrowDown":
          startRepeat(() => softDrop(stateRef.current));
          break;
        case " ":
          hardDrop(s);
          break;
        case "ArrowUp":
        case "x":
        case "X":
        case "w":
        case "W":
          rotatePiece(s, 1);
          break;
        case "z":
        case "Z":
        case "q":
        case "Q":
          rotatePiece(s, -1);
          break;
        case "Shift":
        case "c":
        case "C":
          doHold(s);
          break;
        case "p":
        case "P":
        case "Escape":
          togglePause(s);
          break;
      }
      rerender();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.key);
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowDown"
      ) {
        clearRepeat();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      clearRepeat();
    };
  }, [rerender]);

  const submitScore = useCallback(async (pseudo: string) => {
    const s = stateRef.current;
    const payload = {
      pseudo,
      score: s.score,
      lines: s.lines,
      level: s.level,
      duration: Math.floor(s.durationMs / 1000),
    };
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
  }, []);

  const s = stateRef.current;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex flex-row gap-4 items-start justify-center flex-wrap">
        <TetrisCanvas state={s} version={version} />
        <HUD state={s} version={version} />
      </div>
      <Controls
        onMove={(dx) => {
          move(s, dx);
          rerender();
        }}
        onRotate={(d) => {
          rotatePiece(s, d);
          rerender();
        }}
        onSoftDrop={() => {
          softDrop(s);
          rerender();
        }}
        onHardDrop={() => {
          hardDrop(s);
          rerender();
        }}
        onHold={() => {
          doHold(s);
          rerender();
        }}
        onPause={() => {
          togglePause(s);
          rerender();
        }}
      />
      {s.isGameOver && (
        <GameOverModal
          score={s.score}
          lines={s.lines}
          level={s.level}
          durationSec={Math.floor(s.durationMs / 1000)}
          onSubmit={submitScore}
          onRestart={restart}
        />
      )}
    </div>
  );
}
