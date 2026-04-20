import { describe, expect, it } from "vitest";
import { getKicks, rotate } from "./srs";
import { createBoard } from "./board";
import type { Piece } from "./types";

describe("SRS kicks", () => {
  it("O piece has no-op kicks", () => {
    expect(getKicks("O", 0, 1)).toEqual([[0, 0]]);
  });

  it("JLSTZ 0>1 first kick is identity", () => {
    const kicks = getKicks("T", 0, 1);
    expect(kicks[0]).toEqual([0, 0]);
    expect(kicks.length).toBe(5);
  });

  it("I piece 0>1 kick table is I-specific", () => {
    const kicks = getKicks("I", 0, 1);
    expect(kicks[1]).toEqual([-2, 0]);
    expect(kicks[2]).toEqual([1, 0]);
  });

  it("rotating a T in empty space succeeds with identity kick", () => {
    const b = createBoard();
    const p: Piece = { kind: "T", rotation: 0, x: 3, y: 5 };
    const rotated = rotate(b, p, 1);
    expect(rotated).not.toBeNull();
    expect(rotated!.rotation).toBe(1);
  });

  it("rotating O returns same piece (no-op)", () => {
    const b = createBoard();
    const p: Piece = { kind: "O", rotation: 0, x: 4, y: 5 };
    const rotated = rotate(b, p, 1);
    expect(rotated).toEqual(p);
  });

  it("wall kicks let a piece rotate against left wall", () => {
    const b = createBoard();
    // I piece sitting flush against left wall, rotate 0>1 should kick right.
    const p: Piece = { kind: "I", rotation: 0, x: -2, y: 5 };
    // starting pos places cells at x=-2+0..3, y=5+1 = [-2,-1,0,1] -> colliding at -2,-1
    // rotate 0>1 with I kicks [(0,0),(-2,0),(1,0),...] - (1,0) kick should help.
    const rotated = rotate(b, p, 1);
    expect(rotated).not.toBeNull();
  });
});
