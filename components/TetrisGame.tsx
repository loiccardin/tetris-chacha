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
import { BOARD_HEIGHT, BOARD_WIDTH, BUFFER } from "@/lib/tetris/types";
import { getAudio } from "@/lib/audio";
import TetrisCanvas from "./TetrisCanvas";
import HUD from "./HUD";
import { HoldButton, TapButton } from "./Controls";
import GameOverModal from "./GameOverModal";

export default function TetrisGame() {
  const stateRef = useRef<GameState>(createInitialState());
  const [version, setVersion] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [gameOverFillRow, setGameOverFillRow] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const rerender = useCallback(() => setVersion((c) => c + 1), []);

  const lockCountRef = useRef(0);
  const gameOverHandledRef = useRef(false);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    lockCountRef.current = 0;
    gameOverHandledRef.current = false;
    setGameOverFillRow(null);
    setShowModal(false);
    rerender();
  }, [rerender]);

  const kickAudio = useCallback(() => {
    const a = getAudio();
    if (!audioReady) {
      a.resume().then(() => {
        if (musicOn) a.startMusic();
        setAudioReady(true);
      });
    }
  }, [audioReady, musicOn]);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = Math.min(100, now - last);
      last = now;
      const s = stateRef.current;
      if (!s.isGameOver) tick(s, delta);

      // detect lock & clear events
      if (s.lockCount !== lockCountRef.current) {
        lockCountRef.current = s.lockCount;
        const a = getAudio();
        if (s.lastClearLines > 0) a.playClear(s.lastClearLines);
        else a.playLock();
      }

      rerender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rerender]);

  // Game over → fill animation → modal
  useEffect(() => {
    const s = stateRef.current;
    if (!s.isGameOver || gameOverHandledRef.current) return;
    gameOverHandledRef.current = true;
    const a = getAudio();
    a.stopMusic();
    a.playGameOver();
    // Fill from bottom to top
    let row = BOARD_HEIGHT - 1;
    setGameOverFillRow(row);
    const interval = setInterval(() => {
      row -= 1;
      if (row < BUFFER - 1) {
        clearInterval(interval);
        setShowModal(true);
        return;
      }
      setGameOverFillRow(row);
    }, 40);
    return () => clearInterval(interval);
  }, [version]);

  // Keyboard
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
      kickAudio();
      const s = stateRef.current;
      if (e.repeat) return;
      const k = e.key;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", " ", "ArrowUp"].includes(k)) {
        e.preventDefault();
      }
      const a = getAudio();
      switch (k) {
        case "ArrowLeft":
          startRepeat(() => {
            if (move(stateRef.current, -1)) a.playMove();
          });
          break;
        case "ArrowRight":
          startRepeat(() => {
            if (move(stateRef.current, 1)) a.playMove();
          });
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
          if (rotatePiece(s, 1)) a.playRotate();
          break;
        case "z":
        case "Z":
        case "q":
        case "Q":
          if (rotatePiece(s, -1)) a.playRotate();
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
  }, [rerender, kickAudio]);

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

  const withAudio = (fn: () => void) => () => {
    kickAudio();
    fn();
  };

  const doMove = (dx: number) => {
    if (move(s, dx)) getAudio().playMove();
    rerender();
  };
  const doRotate = () => {
    if (rotatePiece(s, 1)) getAudio().playRotate();
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

  const toggleMute = () => {
    const newMuted = getAudio().toggleMute();
    setMuted(newMuted);
  };
  const toggleMusic = () => {
    const on = getAudio().toggleMusic();
    setMusicOn(on);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 w-full">
        {/* LEFT PAD */}
        <div className="flex flex-col gap-2 shrink-0">
          <HoldButton
            onHold={withAudio(() => doMove(-1))}
            ariaLabel="Gauche"
            className="w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl"
          >
            ←
          </HoldButton>
          <HoldButton
            onHold={withAudio(() => doMove(1))}
            ariaLabel="Droite"
            className="w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl"
          >
            →
          </HoldButton>
          <HoldButton
            onHold={withAudio(doSoft)}
            ariaLabel="Descendre"
            className="w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl"
          >
            ↓
          </HoldButton>
          <TapButton
            onTap={withAudio(doHard)}
            ariaLabel="Chute instantanée"
            className="w-16 h-10 text-xl sm:w-20 sm:h-12 sm:text-2xl bg-cyan-900/40 border-cyan-700"
          >
            ⤓
          </TapButton>
        </div>

        {/* CENTER */}
        <TetrisCanvas
          state={s}
          version={version}
          gameOverFillRow={gameOverFillRow}
        />

        {/* RIGHT */}
        <div className="flex flex-col items-stretch gap-2 shrink-0">
          <HUD state={s} version={version} />
          <TapButton
            onTap={withAudio(doRotate)}
            ariaLabel="Tourner"
            className="w-full h-20 text-4xl sm:text-5xl bg-purple-900/40 border-purple-700"
          >
            ⟳
          </TapButton>
          <div className="flex gap-2">
            <TapButton
              onTap={withAudio(doHoldBtn)}
              ariaLabel="Hold"
              className="flex-1 h-10 text-sm"
            >
              Hold
            </TapButton>
            <TapButton
              onTap={withAudio(doPause)}
              ariaLabel="Pause"
              className="flex-1 h-10 text-sm"
            >
              ⏸
            </TapButton>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                kickAudio();
                toggleMusic();
              }}
              className="flex-1 h-9 text-xs bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded"
            >
              {musicOn ? "♪ on" : "♪ off"}
            </button>
            <button
              onClick={toggleMute}
              className="flex-1 h-9 text-xs bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded"
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-neutral-500 text-center leading-relaxed mt-4 hidden md:block">
        Clavier : ← → ↓ · Espace = hard drop · Z/X = rotations · Shift = hold · P = pause
      </div>

      {showModal && (
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
