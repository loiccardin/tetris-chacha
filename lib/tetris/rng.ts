import type { PieceKind } from "./types";

const ALL_PIECES: PieceKind[] = ["I", "O", "T", "S", "Z", "J", "L"];

export class BagRandomizer {
  private bag: PieceKind[] = [];
  private rand: () => number;

  constructor(rand: () => number = Math.random) {
    this.rand = rand;
    this.refill();
  }

  private refill(): void {
    const next = [...ALL_PIECES];
    // Fisher-Yates
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    this.bag.push(...next);
  }

  next(): PieceKind {
    if (this.bag.length === 0) this.refill();
    return this.bag.shift()!;
  }

  peek(count: number): PieceKind[] {
    while (this.bag.length < count) this.refill();
    return this.bag.slice(0, count);
  }
}
