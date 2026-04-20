import { describe, expect, it } from "vitest";
import { SHAPES } from "./tetromino";
import type { PieceKind, Rotation } from "./types";

const KINDS: PieceKind[] = ["I", "O", "T", "S", "Z", "J", "L"];

describe("tetromino shapes", () => {
  it("each piece has 4 rotations with 4 cells each", () => {
    for (const k of KINDS) {
      for (const r of [0, 1, 2, 3] as Rotation[]) {
        const s = SHAPES[k][r];
        expect(s).toHaveLength(4);
        for (const [x, y] of s) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("O piece is identical across all rotations", () => {
    const base = JSON.stringify(SHAPES.O[0]);
    for (const r of [1, 2, 3] as Rotation[]) {
      expect(JSON.stringify(SHAPES.O[r])).toBe(base);
    }
  });

  it("T rotation 0 has expected coordinates", () => {
    // T spawn: . X .    positions (1,0) (0,1) (1,1) (2,1)
    //          X X X
    expect(SHAPES.T[0]).toEqual([
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]);
  });

  it("I piece horizontal-to-vertical rotation shifts expected cells", () => {
    expect(SHAPES.I[0]).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
    expect(SHAPES.I[1]).toEqual([
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
  });
});
