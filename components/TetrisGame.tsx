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
import { HoldButton, TapButton } from "./Controls";
import GameOverModal from "./GameOverModal";

export default function TetrisGame() {
  const stateRef = useRef<GameState>(createInitialState());
  const [version, setVersion] = useState(0);
  const rerender = useCallback(() => setVersion((c) => c + 1), []);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    rerender();
  }, [rerender]);

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

  useEffect(() => {
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

  const doMove = (dx: number) => {
    move(s, dx);
    rerender();
  };
  const doRotate = () => {
    rotatePiece(s, 1);
    rerender();
  };
  const doSoft = () => {
    softDrop(s);
    rerender();
  };
  const doHard = () => {
    hardDrop(s);
    rerender();
  };
  const doHoldBtn = () => {
    doHold(s);
    rerender();
  };
  const doPause = () => {
    togglePause(s);
    rerender();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Game area: 3 columns — left pad | canvas | right pad + HUD */}
      <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 w-full">
        {/* LEFT PAD — main gauche */}
        <div className="flex flex-col gap-2 shrink-0">
          <HoldButton
            onHold={() => doMove(-1)}
            ariaLabel="Gauche"
            className="w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl"
          >
            ←
          </HoldButton>
          <HoldButton
            onHold={() => doMove(1)}
            ariaLabel="Droite"
            className="w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl"
          >
            →
          </HoldButton>
          <HoldButton
            onHold={doSoft}
            ariaLabel="Descendre"
            className="w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl"
          >
            ↓
          </HoldButton>
          <TapButton
            onTap={doHard}
            ariaLabel="Chute instantanée"
            className="w-16 h-10 text-xl sm:w-20 sm:h-12 sm:text-2xl bg-cyan-900/40 border-cyan-700"
          >
            ⤓
          </TapButton>
        </div>

        {/* CENTER — canvas */}
        <TetrisCanvas state={s} version={version} />

        {/* RIGHT — HUD + rotate */}
        <div className="flex flex-col items-stretch gap-2 shrink-0">
          <HUD state={s} version={version} />
          <TapButton
            onTap={doRotate}
            ariaLabel="Tourner"
            className="w-full h-20 text-4xl sm:text-5xl bg-purple-900/40 border-purple-700"
          >
            ⟳
          </TapButton>
          <div className="flex gap-2">
            <TapButton
              onTap={doHoldBtn}
              ariaLabel="Hold"
              className="flex-1 h-10 text-sm"
            >
              Hold
            </TapButton>
            <TapButton
              onTap={doPause}
              ariaLabel="Pause"
              className="flex-1 h-10 text-sm"
            >
              ⏸
            </TapButton>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-neutral-500 text-center leading-relaxed mt-4 hidden md:block">
        Clavier : ← → ↓ · Espace = hard drop · Z/X = rotations · Shift = hold · P = pause
      </div>

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
