"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialState,
  hardDrop,
  hold as doHold,
  linesGoalFor,
  move,
  resumeAfterLevelTransition,
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
  const levelUpCountRef = useRef(0);
  const [levelBanner, setLevelBanner] = useState<number | null>(null);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    lockCountRef.current = 0;
    levelUpCountRef.current = 0;
    gameOverHandledRef.current = false;
    setGameOverFillRow(null);
    setShowModal(false);
    setLevelBanner(null);
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

      // detect level up
      if (s.levelUpCount !== levelUpCountRef.current) {
        levelUpCountRef.current = s.levelUpCount;
        getAudio().playLevelUp();
        setLevelBanner(s.level);
        setTimeout(() => {
          resumeAfterLevelTransition(stateRef.current);
          setLevelBanner(null);
          rerender();
        }, 1800);
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
    // Fill from bottom (display row 19) up to the top (display row 0), then show modal.
    let row = BOARD_HEIGHT - 1;
    setGameOverFillRow(row);
    const interval = setInterval(() => {
      row -= 1;
      if (row < BUFFER) {
        clearInterval(interval);
        setGameOverFillRow(BUFFER);
        setTimeout(() => setShowModal(true), 400);
        return;
      }
      setGameOverFillRow(row);
    }, 35);
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
    move(s, dx);
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
      <div className="flex flex-row items-start justify-center gap-2 sm:gap-4 w-full">
        {/* LEFT PAD — main gauche */}
        <div className="flex flex-col gap-2 shrink-0 justify-center self-center">
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
            className="w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl bg-cyan-900/40 border-cyan-700"
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

        {/* RIGHT PAD — main droite */}
        <div className="flex flex-col gap-2 shrink-0 justify-center self-center">
          <TapButton
            onTap={withAudio(doRotate)}
            ariaLabel="Tourner"
            className="w-16 h-16 text-3xl sm:w-20 sm:h-20 sm:text-4xl bg-purple-900/40 border-purple-700"
          >
            ⟳
          </TapButton>
          <TapButton
            onTap={withAudio(doHoldBtn)}
            ariaLabel="Hold"
            className="w-16 h-16 text-xs sm:w-20 sm:h-20 sm:text-sm"
          >
            Hold
          </TapButton>
          <TapButton
            onTap={withAudio(doPause)}
            ariaLabel="Pause"
            className="w-16 h-16 text-2xl sm:w-20 sm:h-20 sm:text-3xl"
          >
            ⏸
          </TapButton>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              kickAudio();
              toggleMusic();
            }}
            className="w-16 h-10 sm:w-20 sm:h-10 text-xs bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-lg touch-none"
          >
            {musicOn ? "♪ on" : "♪ off"}
          </button>
        </div>

        {/* HUD — visible on md+ to the far right */}
        <div className="hidden md:flex flex-col shrink-0">
          <HUD state={s} version={version} />
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              toggleMute();
            }}
            className="mt-2 w-full h-9 text-xs bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-lg touch-none"
          >
            {muted ? "🔇 muet" : "🔊 son"}
          </button>
        </div>
      </div>

      {/* Compact HUD under the board on small screens */}
      <div className="md:hidden mt-3 w-full max-w-xs">
        <HUD state={s} version={version} compact />
      </div>

      <div className="text-[11px] text-neutral-500 text-center leading-relaxed mt-4 hidden md:block">
        Clavier : ← → ↓ · Espace = hard drop · Z/X = rotations · Shift = hold · P = pause
      </div>

      {levelBanner !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-center">
            <div className="text-cyan-400 text-sm uppercase tracking-[0.3em] mb-2">
              Niveau terminé
            </div>
            <div className="text-white text-5xl sm:text-7xl font-bold mb-2">
              LEVEL {levelBanner}
            </div>
            <div className="text-neutral-300 text-sm">
              Objectif : {linesGoalFor(levelBanner)} lignes
            </div>
          </div>
        </div>
      )}

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
