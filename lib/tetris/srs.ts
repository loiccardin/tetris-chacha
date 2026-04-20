import type { Piece, PieceKind, Rotation } from "./types";
import { collides } from "./board";
import type { Board } from "./types";

// Standard SRS wall kick tables.
// Entries: per (from -> to) rotation, list of [dx, dy] offsets to try.
// Note: In screen coordinates (y grows downward), SRS +y in Guideline means "up";
// we convert: Guideline (dx, +dy) -> our (dx, -dy).
// These tables already reflect the screen-space sign.

type KickTable = Record<string, ReadonlyArray<readonly [number, number]>>;

// JLSTZ
const JLSTZ_KICKS: KickTable = {
  "0>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "1>0": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "1>2": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "2>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "2>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "3>2": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "3>0": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "0>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};

const I_KICKS: KickTable = {
  "0>1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "1>0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "1>2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  "2>1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  "2>3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "3>2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "3>0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  "0>3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};

export function getKicks(
  kind: PieceKind,
  from: Rotation,
  to: Rotation,
): ReadonlyArray<readonly [number, number]> {
  if (kind === "O") return [[0, 0]];
  const key = `${from}>${to}`;
  const table = kind === "I" ? I_KICKS : JLSTZ_KICKS;
  return table[key] ?? [[0, 0]];
}

export function rotate(
  board: Board,
  piece: Piece,
  direction: 1 | -1,
): Piece | null {
  if (piece.kind === "O") return piece;
  const from = piece.rotation;
  const to = (((piece.rotation + direction) % 4) + 4) % 4 as Rotation;
  const kicks = getKicks(piece.kind, from, to);
  for (const [dx, dy] of kicks) {
    const candidate: Piece = {
      ...piece,
      rotation: to,
      x: piece.x + dx,
      y: piece.y + dy,
    };
    if (!collides(board, candidate)) return candidate;
  }
  return null;
}
