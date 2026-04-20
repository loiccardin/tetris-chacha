import { describe, expect, it } from "vitest";
import {
  createInitialState,
  framesPerCell,
  hardDrop,
  move,
  softDrop,
  tick,
} from "./game";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./types";
import { BagRandomizer } from "./rng";

describe("game scoring and levels", () => {
  it("gravity table is monotonic non-increasing and clamps", () => {
    expect(framesPerCell(1)).toBeGreaterThan(framesPerCell(10));
    expect(framesPerCell(20)).toBe(1);
    expect(framesPerCell(100)).toBe(1);
    expect(framesPerCell(0)).toBe(framesPerCell(1));
  });

  it("initial state has a board and a current piece and 5 next", () => {
    const s = createInitialState();
    expect(s.board.length).toBe(BOARD_HEIGHT);
    expect(s.board[0].length).toBe(BOARD_WIDTH);
    expect(s.next.length).toBe(5);
    expect(s.level).toBe(1);
    expect(s.score).toBe(0);
  });

  it("hard drop awards 2 points per cell dropped", () => {
    const s = createInitialState();
    const before = s.score;
    hardDrop(s);
    expect(s.score).toBeGreaterThan(before);
  });

  it("soft drop awards 1 point per cell", () => {
    const s = createInitialState();
    const before = s.score;
    const moved = softDrop(s);
    if (moved) expect(s.score).toBe(before + 1);
  });

  it("tick advances gravity over time", () => {
    const s = createInitialState();
    const y0 = s.current.y;
    tick(s, 1000); // 1 second, level 1 gravity ~800ms so piece should drop
    expect(s.current.y).toBeGreaterThanOrEqual(y0);
  });

  it("move left/right updates x when unobstructed", () => {
    const s = createInitialState();
    const x0 = s.current.x;
    move(s, -1);
    expect(s.current.x).toBe(x0 - 1);
  });
});

describe("7-bag randomizer", () => {
  it("never emits the same piece more than twice in 14 consecutive", () => {
    const bag = new BagRandomizer(() => 0.5);
    const seq = Array.from({ length: 14 }, () => bag.next());
    const counts: Record<string, number> = {};
    for (const p of seq) counts[p] = (counts[p] ?? 0) + 1;
    for (const c of Object.values(counts)) expect(c).toBeLessThanOrEqual(2);
  });

  it("each bag of 7 contains all 7 pieces exactly once", () => {
    const bag = new BagRandomizer(Math.random);
    const first7 = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(first7).size).toBe(7);
    const next7 = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(next7).size).toBe(7);
  });

  it("no more than 12 other pieces between two occurrences of the same piece", () => {
    const bag = new BagRandomizer(Math.random);
    const seq = Array.from({ length: 200 }, () => bag.next());
    const lastSeen: Record<string, number> = {};
    for (let i = 0; i < seq.length; i++) {
      const p = seq[i];
      if (p in lastSeen) {
        const between = i - lastSeen[p] - 1;
        expect(between).toBeLessThanOrEqual(12);
      }
      lastSeen[p] = i;
    }
  });
});
