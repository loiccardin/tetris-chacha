import {
  clearLines,
  collides,
  createBoard,
  dropDistance,
  findFullLines,
  lockPiece,
} from "./board";

export function linesGoalFor(level: number): number {
  return 10 + 5 * (level - 1);
}
import { BagRandomizer } from "./rng";
import { rotate } from "./srs";
import { spawnX, spawnY } from "./tetromino";
import type { GameState, Piece, PieceKind } from "./types";

const LOCK_DELAY_MS = 500;

// Frames per cell at 60 FPS, derived from Guideline gravity levels.
// level 1 ≈ 1.0 G/s … level 20 = 20 G/frame (instant).
// Converted: framesPerCell = max(1, round(60 / gCellsPerSecond)).
const GRAVITY_FPC: Record<number, number> = {
  1: 48,
  2: 43,
  3: 38,
  4: 33,
  5: 28,
  6: 23,
  7: 18,
  8: 13,
  9: 8,
  10: 6,
  11: 5,
  12: 5,
  13: 4,
  14: 4,
  15: 3,
  16: 3,
  17: 2,
  18: 2,
  19: 1,
  20: 1,
};

export function framesPerCell(level: number): number {
  const clamped = Math.max(1, Math.min(20, level));
  return GRAVITY_FPC[clamped];
}

export function msPerCell(level: number): number {
  return (framesPerCell(level) / 60) * 1000;
}

export interface StartOptions {
  startLevel?: number;
  startLinesThisLevel?: number;
}

export function createInitialState(
  seedRand?: () => number,
  now: number = Date.now(),
  opts: StartOptions = {},
): GameState {
  const bag = new BagRandomizer(seedRand);
  const firstKind = bag.next();
  const current: Piece = {
    kind: firstKind,
    rotation: 0,
    x: spawnX(firstKind),
    y: spawnY(),
  };
  const next = bag.peek(5);
  return {
    board: createBoard(),
    current,
    next,
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: Math.max(1, opts.startLevel ?? 1),
    dropCounter: 0,
    lockTimer: 0,
    isGameOver: false,
    isPaused: false,
    startedAt: now,
    durationMs: 0,
    backToBack: false,
    lastClearWasTetris: false,
    lockCount: 0,
    lastClearLines: 0,
    linesThisLevel: Math.max(0, opts.startLinesThisLevel ?? 0),
    levelUpCount: 0,
    levelTransitionPending: false,
    _bag: bag,
  } as GameState & { _bag: BagRandomizer };
}

function getBag(state: GameState): BagRandomizer {
  return (state as unknown as { _bag: BagRandomizer })._bag;
}

function spawnNext(state: GameState): void {
  const bag = getBag(state);
  const nextKind = bag.next();
  state.current = {
    kind: nextKind,
    rotation: 0,
    x: spawnX(nextKind),
    y: spawnY(),
  };
  state.next = bag.peek(5);
  state.canHold = true;
  state.lockTimer = 0;
  state.dropCounter = 0;
  if (collides(state.board, state.current)) {
    state.isGameOver = true;
  }
}

function scoreForLines(
  lines: number,
  level: number,
  backToBack: boolean,
): { score: number; isTetris: boolean } {
  let base = 0;
  if (lines === 1) base = 100;
  else if (lines === 2) base = 300;
  else if (lines === 3) base = 500;
  else if (lines === 4) base = 800;
  const isTetris = lines === 4;
  let total = base * level;
  if (isTetris && backToBack) total = Math.floor(total * 1.5);
  return { score: total, isTetris };
}

export function move(state: GameState, dx: number): boolean {
  if (state.isGameOver || state.isPaused || state.levelTransitionPending) return false;
  const candidate: Piece = { ...state.current, x: state.current.x + dx };
  if (!collides(state.board, candidate)) {
    state.current = candidate;
    // Reset lock timer on successful move if touching floor.
    if (isOnGround(state)) state.lockTimer = 0;
    return true;
  }
  return false;
}

export function rotatePiece(state: GameState, direction: 1 | -1): boolean {
  if (state.isGameOver || state.isPaused || state.levelTransitionPending) return false;
  const rotated = rotate(state.board, state.current, direction);
  if (rotated) {
    state.current = rotated;
    if (isOnGround(state)) state.lockTimer = 0;
    return true;
  }
  return false;
}

export function softDrop(state: GameState): boolean {
  if (state.isGameOver || state.isPaused || state.levelTransitionPending) return false;
  const candidate: Piece = { ...state.current, y: state.current.y + 1 };
  if (!collides(state.board, candidate)) {
    state.current = candidate;
    state.score += 1;
    return true;
  }
  return false;
}

export function hardDrop(state: GameState): void {
  if (state.isGameOver || state.isPaused || state.levelTransitionPending) return;
  const d = dropDistance(state.board, state.current);
  state.current = { ...state.current, y: state.current.y + d };
  state.score += d * 2;
  lockCurrent(state);
}

export function hold(state: GameState): boolean {
  if (state.isGameOver || state.isPaused || state.levelTransitionPending) return false;
  if (!state.canHold) return false;
  const bag = getBag(state);
  const currentKind = state.current.kind;
  if (state.hold === null) {
    state.hold = currentKind;
    const nextKind = bag.next();
    state.current = {
      kind: nextKind,
      rotation: 0,
      x: spawnX(nextKind),
      y: spawnY(),
    };
    state.next = bag.peek(5);
  } else {
    const swap = state.hold;
    state.hold = currentKind;
    state.current = {
      kind: swap,
      rotation: 0,
      x: spawnX(swap),
      y: spawnY(),
    };
  }
  state.canHold = false;
  state.lockTimer = 0;
  state.dropCounter = 0;
  if (collides(state.board, state.current)) state.isGameOver = true;
  return true;
}

function isOnGround(state: GameState): boolean {
  return collides(state.board, {
    ...state.current,
    y: state.current.y + 1,
  });
}

function lockCurrent(state: GameState): void {
  state.board = lockPiece(state.board, state.current);
  state.lockCount += 1;
  const full = findFullLines(state.board);
  state.lastClearLines = full.length;
  if (full.length > 0) {
    state.board = clearLines(state.board, full);
    const { score, isTetris } = scoreForLines(
      full.length,
      state.level,
      state.backToBack && state.lastClearWasTetris,
    );
    state.score += score;
    state.lines += full.length;
    state.linesThisLevel += full.length;
    state.lastClearWasTetris = isTetris;
    state.backToBack = isTetris;

    const goal = linesGoalFor(state.level);
    if (state.linesThisLevel >= goal) {
      state.level += 1;
      state.linesThisLevel = 0;
      state.levelUpCount += 1;
      state.board = createBoard();
      state.levelTransitionPending = true;
      return; // pause piece spawn until transition is resolved
    }
  } else {
    state.lastClearWasTetris = false;
  }
  spawnNext(state);
}

export function resumeAfterLevelTransition(state: GameState): void {
  if (!state.levelTransitionPending) return;
  state.levelTransitionPending = false;
  state.dropCounter = 0;
  state.lockTimer = 0;
  spawnNext(state);
}

export function tick(state: GameState, deltaMs: number): void {
  if (state.isGameOver || state.isPaused || state.levelTransitionPending) return;
  state.durationMs += deltaMs;
  const gravityMs = msPerCell(state.level);
  state.dropCounter += deltaMs;
  while (state.dropCounter >= gravityMs) {
    state.dropCounter -= gravityMs;
    const candidate: Piece = { ...state.current, y: state.current.y + 1 };
    if (!collides(state.board, candidate)) {
      state.current = candidate;
      state.lockTimer = 0;
    } else {
      break;
    }
  }
  if (isOnGround(state)) {
    state.lockTimer += deltaMs;
    if (state.lockTimer >= LOCK_DELAY_MS) {
      lockCurrent(state);
    }
  } else {
    state.lockTimer = 0;
  }
}

export function togglePause(state: GameState): void {
  if (!state.isGameOver) state.isPaused = !state.isPaused;
}

export function getGhostY(state: GameState): number {
  return state.current.y + dropDistance(state.board, state.current);
}

export type { PieceKind };
