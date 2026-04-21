export type PieceKind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export type Rotation = 0 | 1 | 2 | 3;

export type Cell = PieceKind | null;

export type Board = Cell[][];

export interface Piece {
  kind: PieceKind;
  rotation: Rotation;
  x: number;
  y: number;
}

export interface GameState {
  board: Board;
  current: Piece;
  next: PieceKind[];
  hold: PieceKind | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  dropCounter: number;
  lockTimer: number;
  isGameOver: boolean;
  isPaused: boolean;
  startedAt: number;
  durationMs: number;
  backToBack: boolean;
  lastClearWasTetris: boolean;
  lockCount: number;
  lastClearLines: number;
  linesThisLevel: number;
  levelUpCount: number;
  levelTransitionPending: boolean;
}

export const BOARD_WIDTH = 10;
export const VISIBLE_HEIGHT = 20;
export const BUFFER = 2;
export const BOARD_HEIGHT = VISIBLE_HEIGHT + BUFFER;
