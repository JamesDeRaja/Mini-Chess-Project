import { BOARD_FILES, BOARD_RANKS } from './constants.js';

export function index(file: number, rank: number): number {
  return rank * BOARD_FILES + file;
}

export function isInsideBoard(file: number, rank: number): boolean {
  return file >= 0 && file < BOARD_FILES && rank >= 0 && rank < BOARD_RANKS;
}

export function fileLabel(file: number): string {
  return String.fromCharCode('a'.charCodeAt(0) + file);
}

export function squareLabel(file: number, rank: number): string {
  return `${fileLabel(file)}${rank + 1}`;
}
