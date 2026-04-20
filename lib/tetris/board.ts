import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BUFFER,
  type Board,
  type Cell,
  type Piece,
} from "./types";
import { getShape } from "./tetromino";

export function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null as Cell),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function isOccupied(board: Board, x: number, y: number): boolean {
  if (x < 0 || x >= BOARD_WIDTH) return true;
  if (y < 0) return false; // above buffer is free
  if (y >= BOARD_HEIGHT) return true;
  return board[y][x] !== null;
}

export function collides(board: Board, piece: Piece): boolean {
  const shape = getShape(piece.kind, piece.rotation);
  for (const [dx, dy] of shape) {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (isOccupied(board, x, y)) return true;
  }
  return false;
}

export function lockPiece(board: Board, piece: Piece): Board {
  const next = cloneBoard(board);
  const shape = getShape(piece.kind, piece.rotation);
  for (const [dx, dy] of shape) {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
      next[y][x] = piece.kind;
    }
  }
  return next;
}

export function findFullLines(board: Board): number[] {
  const lines: number[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if (board[y].every((c) => c !== null)) lines.push(y);
  }
  return lines;
}

export function clearLines(board: Board, lines: number[]): Board {
  if (lines.length === 0) return board;
  const set = new Set(lines);
  const remaining = board.filter((_, y) => !set.has(y));
  const cleared = lines.length;
  const empty = Array.from({ length: cleared }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null as Cell),
  );
  return [...empty, ...remaining];
}

export function visibleRows(board: Board): Board {
  return board.slice(BUFFER);
}

export function dropDistance(board: Board, piece: Piece): number {
  let d = 0;
  while (!collides(board, { ...piece, y: piece.y + d + 1 })) {
    d++;
  }
  return d;
}
