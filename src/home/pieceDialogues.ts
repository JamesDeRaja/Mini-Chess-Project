import type { PieceType } from '../game/types.js';

export type PieceDialogue = {
  name: string;
  moves: string[];
  lines: string[];
};

export const pieceDialogues: Record<PieceType, PieceDialogue> = {
  king: {
    name: 'King',
    moves: ['Moves one square in any direction.', 'If the king is trapped, the game is over.'],
    lines: [
      'I rule everything. But without the queen? I am basically a very expensive target.',
      'Everyone protects me because apparently walking one square at a time is leadership.',
      'Technically the most important piece. Practically the slowest employee here.',
      'She does all the work. I just try not to die.',
      'One square at a time. It is called executive pacing.',
    ],
  },
  queen: {
    name: 'Queen',
    moves: ['Moves in every direction for any distance.'],
    lines: [
      'I carry this entire kingdom.',
      'Most powerful piece on the board. Emotionally exhausted.',
      'I can move any direction. Which is great because I do not trust anyone else.',
      'Without me the king lasts about six seconds.',
      'Horizontal, vertical, diagonal. Multitasking with a crown.',
    ],
  },
  rook: {
    name: 'Rook',
    moves: ['Moves horizontally and vertically.'],
    lines: [
      'I move in straight lines because I have commitment issues with diagonals.',
      'Built like a castle. Hits like a truck.',
      'No curves. No nonsense.',
      'I only move in straight lines. Therapy says that is okay.',
      'Give me an open file and I become a problem with architecture.',
    ],
  },
  bishop: {
    name: 'Bishop',
    moves: ['Moves diagonally across the board.'],
    lines: [
      'I legally cannot move straight.',
      'Diagonal movement only. Very niche. Very elegant.',
      'I do not walk directly toward problems. I approach dramatically from the side.',
      'Straight lines are for amateurs.',
      'I saw the angle and made it my whole personality.',
    ],
  },
  knight: {
    name: 'Knight',
    moves: ['Moves in an L-shape and jumps over pieces.'],
    lines: [
      'I move like Wi-Fi signal.',
      'Nobody understands me until I fork their queen.',
      'Rules are suggestions.',
      'I jump over people because traffic is unbearable.',
      'The board has roads. I brought a pogo stick.',
    ],
  },
  pawn: {
    name: 'Pawn',
    moves: ['Moves forward one square.', 'Captures diagonally.', 'Can promote on the final rank.'],
    lines: [
      'Underpaid. Overworked.',
      'One day I become a queen. That is the dream.',
      'Tiny now. Dangerous later.',
      'Corporate ladder simulator.',
      'I take one step forward and somehow the whole army has opinions.',
    ],
  },
};

export function getDialogueLine(pieceType: PieceType, dialogueIndex: number): string {
  const lines = pieceDialogues[pieceType].lines;
  return lines[dialogueIndex % lines.length];
}
