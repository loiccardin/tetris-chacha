import { describe, expect, it } from "vitest";
import {
  clearLines,
  collides,
  createBoard,
  findFullLines,
  lockPiece,
} from "./board";
import { BOARD_HEIGHT, BOARD_WIDTH, type Piece } from "./types";

describe("board", () => {
  it("creates an empty board with correct dimensions", () => {
    const b = createBoard();
    expect(b.length).toBe(BOARD_HEIGHT);
    expect(b[0].length).toBe(BOARD_WIDTH);
    expect(b.every((r) => r.every((c) => c === null))).toBe(true);
  });

  it("detects collision with walls", () => {
    const b = createBoard();
    const p: Piece = { kind: "O", rotation: 0, x: -2, y: 0 };
    expect(collides(b, p)).toBe(true);
    const p2: Piece = { kind: "O", rotation: 0, x: 9, y: 0 };
    expect(collides(b, p2)).toBe(true);
  });

  it("detects collision with floor", () => {
    const b = createBoard();
    const p: Piece = { kind: "O", rotation: 0, x: 3, y: BOARD_HEIGHT - 1 };
    expect(collides(b, p)).toBe(true);
  });

  it("does not collide in empty spawn", () => {
    const b = createBoard();
    const p: Piece = { kind: "T", rotation: 0, x: 3, y: 0 };
    expect(collides(b, p)).toBe(false);
  });

  it("locks a piece into the board", () => {
    const b = createBoard();
    const p: Piece = { kind: "O", rotation: 0, x: 3, y: BOARD_HEIGHT - 2 };
    const locked = lockPiece(b, p);
    expect(locked[BOARD_HEIGHT - 2][4]).toBe("O");
    expect(locked[BOARD_HEIGHT - 2][5]).toBe("O");
    expect(locked[BOARD_HEIGHT - 1][4]).toBe("O");
    expect(locked[BOARD_HEIGHT - 1][5]).toBe("O");
  });

  it("finds full lines", () => {
    const b = createBoard();
    // Fill bottom row
    for (let x = 0; x < BOARD_WIDTH; x++) b[BOARD_HEIGHT - 1][x] = "I";
    const full = findFullLines(b);
    expect(full).toEqual([BOARD_HEIGHT - 1]);
  });

  it("clears lines and shifts above rows down", () => {
    const b = createBoard();
    for (let x = 0; x < BOARD_WIDTH; x++) {
      b[BOARD_HEIGHT - 1][x] = "I";
      b[BOARD_HEIGHT - 2][x] = "I";
    }
    b[BOARD_HEIGHT - 3][0] = "T"; // marker above
    const full = findFullLines(b);
    expect(full).toHaveLength(2);
    const cleared = clearLines(b, full);
    expect(cleared[BOARD_HEIGHT - 1][0]).toBe("T");
    expect(cleared[BOARD_HEIGHT - 2][0]).toBe(null);
  });
});
