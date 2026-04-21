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
import { BOARD_HEIGHT, BUFFER } from "@/lib/tetris/types";
import { getAudio } from "@/lib/audio";
import TetrisCanvas from "./TetrisCanvas";
import HUD from "./HUD";
import { HoldButton, TapButton } from "./Controls";
import GameOverModal from "./GameOverModal";
import type { Profile } from "./ProfilePicker";

interface Props {
  profile: Profile;
  onChangeProfile: () => void;
}

export default function TetrisGame({ profile, onChangeProfile }: Props) {
  const stateRef = useRef<GameState>(
    createInitialState(undefined, Date.now(), {
      startLevel: profile.level,
      startLinesThisLevel: profile.linesThisLevel,
    }),
  );
  const [version, setVersion] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [gameOverFillRow, setGameOverFillRow] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [levelBanner, setLevelBanner] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState(profile.bestScore);

  const rerender = useCallback(() => setVersion((c) => c + 1), []);

  const lockCountRef = useRef(0);
  const gameOverHandledRef = useRef(false);
  const levelUpCountRef = useRef(0);
  const lastSavedRef = useRef<{ level: number; lines: number; score: number }>({
    level: profile.level,
    lines: profile.linesThisLevel,
    score: 0,
  });
  const pendingAddLinesRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save progression to server (throttled)
  const saveProgress = useCallback(
    async (payload: {
      level?: number;
      linesThisLevel?: number;
      addLines?: number;
      lastScore?: number;
      bestScore?: number;
      finishedGame?: boolean;
    }) => {
      try {
        await fetch(`/api/profiles/${encodeURIComponent(profile.name)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // offline is OK — retry on next event
      }
    },
    [profile.name],
  );

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) return;
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const s = stateRef.current;
      const addLines = pendingAddLinesRef.current;
      pendingAddLinesRef.current = 0;
      const payload: Record<string, unknown> = {
        level: s.level,
        linesThisLevel: s.linesThisLevel,
        lastScore: s.score,
      };
      if (addLines > 0) payload.addLines = addLines;
      if (s.score > bestScore) {
        payload.bestScore = s.score;
        setBestScore(s.score);
      }
      saveProgress(payload);
      lastSavedRef.current = {
        level: s.level,
        lines: s.linesThisLevel,
        score: s.score,
      };
    }, 3000);
  }, [bestScore, saveProgress]);

  const restart = useCallback(() => {
    stateRef.current = createInitialState(undefined, Date.now(), {
      startLevel: profile.level,
      startLinesThisLevel: profile.linesThisLevel,
    });
    lockCountRef.current = 0;
    levelUpCountRef.current = 0;
    gameOverHandledRef.current = false;
    setGameOverFillRow(null);
    setShowModal(false);
    setLevelBanner(null);
    if (musicOn) getAudio().startMusic();
    rerender();
  }, [profile, musicOn, rerender]);

  // When profile changes (prop), re-init state
  useEffect(() => {
    stateRef.current = createInitialState(undefined, Date.now(), {
      startLevel: profile.level,
      startLinesThisLevel: profile.linesThisLevel,
    });
    lockCountRef.current = 0;
    levelUpCountRef.current = 0;
    gameOverHandledRef.current = false;
    setGameOverFillRow(null);
    setShowModal(false);
    setLevelBanner(null);
    setBestScore(profile.bestScore);
    lastSavedRef.current = {
      level: profile.level,
      lines: profile.linesThisLevel,
      score: 0,
    };
    pendingAddLinesRef.current = 0;
    rerender();
  }, [profile, rerender]);

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

      if (s.lockCount !== lockCountRef.current) {
        lockCountRef.current = s.lockCount;
        const a = getAudio();
        if (s.lastClearLines > 0) {
          a.playClear(s.lastClearLines);
          pendingAddLinesRef.current += s.lastClearLines;
          scheduleSave();
        } else {
          a.playLock();
        }
      }

      if (s.levelUpCount !== levelUpCountRef.current) {
        levelUpCountRef.current = s.levelUpCount;
        getAudio().playLevelUp();
        setLevelBanner(s.level);
        saveProgress({
          level: s.level,
          linesThisLevel: 0,
          lastScore: s.score,
        });
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
  }, [rerender, saveProgress, scheduleSave]);

  // Game over
  useEffect(() => {
    const s = stateRef.current;
    if (!s.isGameOver || gameOverHandledRef.current) return;
    gameOverHandledRef.current = true;
    const a = getAudio();
    a.stopMusic();
    a.playGameOver();

    // Save final state — keep level & linesThisLevel so they resume here.
    const addLines = pendingAddLinesRef.current;
    pendingAddLinesRef.current = 0;
    const finalPayload: Record<string, unknown> = {
      level: s.level,
      linesThisLevel: s.linesThisLevel,
      lastScore: s.score,
      finishedGame: true,
    };
    if (addLines > 0) finalPayload.addLines = addLines;
    if (s.score > bestScore) {
      finalPayload.bestScore = s.score;
      setBestScore(s.score);
    }
    saveProgress(finalPayload);

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
  }, [version, bestScore, saveProgress]);

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

  // Submit score to leaderboard (auto-fills with profile name)
  const submitScore = useCallback(
    async (pseudo: string) => {
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
    },
    [],
  );

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
      {/* Profile banner */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">Joueur :</span>
          <span className="font-bold text-cyan-400">{profile.name}</span>
          <span className="text-neutral-500">· record {bestScore.toLocaleString()}</span>
        </div>
        <button
          type="button"
          onClick={onChangeProfile}
          className="text-xs bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded px-3 py-1.5 hover:bg-neutral-800"
        >
          Changer de joueur
        </button>
      </div>

      <div className="flex flex-row items-start justify-center gap-2 sm:gap-4 w-full">
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

        <TetrisCanvas
          state={s}
          version={version}
          gameOverFillRow={gameOverFillRow}
        />

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
          defaultPseudo={profile.name}
          onSubmit={submitScore}
          onRestart={restart}
        />
      )}
    </div>
  );
}
