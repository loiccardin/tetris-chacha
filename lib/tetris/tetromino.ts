import type { PieceKind, Rotation } from "./types";

export type Shape = ReadonlyArray<readonly [number, number]>;

// Coordinates are (x, y) offsets from piece origin.
// Origin for each piece matches SRS spawn orientation.
// Standard SRS: pieces spawn flat-side-down at rows 20-21 (within 20+2 buffer grid).
export const SHAPES: Record<PieceKind, Record<Rotation, Shape>> = {
  I: {
    0: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    1: [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    2: [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    3: [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  },
  O: {
    0: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    1: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    2: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    3: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  },
  T: {
    0: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    1: [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    2: [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    3: [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  S: {
    0: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    1: [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    2: [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ],
    3: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  Z: {
    0: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    1: [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    2: [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    3: [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  },
  J: {
    0: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    1: [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
    2: [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    3: [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  },
  L: {
    0: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    1: [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    2: [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ],
    3: [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  },
};

export const COLORS: Record<PieceKind, string> = {
  I: "#22d3ee",
  O: "#facc15",
  T: "#a855f7",
  S: "#22c55e",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#f97316",
};

export function getShape(kind: PieceKind, rotation: Rotation): Shape {
  return SHAPES[kind][rotation];
}

export function spawnX(kind: PieceKind): number {
  // SRS: spawn so leftmost bounding box cell is at col 3 (for 3-wide) or 3 (for 4-wide I).
  // Our shapes use internal boxes, so shift by 3.
  return kind === "O" ? 3 : 3;
}

export function spawnY(): number {
  // Top of visible area with buffer above. Buffer is 2, so spawn at y=0 (buffer row 0).
  return 0;
}
