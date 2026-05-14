import { BOARD_FILES, BOARD_RANKS } from './constants.js';

export type BoardOrientation = 'white' | 'black';

export type SquareCenter = {
  x: number;
  y: number;
};

export type SquareBounds = SquareCenter & {
  width: number;
  height: number;
};

export function getSquareCenter(squareIndex: number, boardOrientation: BoardOrientation, boardSize = 100): SquareCenter {
  const file = squareIndex % BOARD_FILES;
  const rank = Math.floor(squareIndex / BOARD_FILES);
  const visualFile = boardOrientation === 'black' ? BOARD_FILES - 1 - file : file;
  const visualRank = boardOrientation === 'black' ? rank : BOARD_RANKS - 1 - rank;

  return {
    x: ((visualFile + 0.5) / BOARD_FILES) * boardSize,
    y: ((visualRank + 0.5) / BOARD_RANKS) * boardSize,
  };
}

export function getSquareBounds(squareIndex: number, boardOrientation: BoardOrientation, boardSize = 100): SquareBounds {
  const center = getSquareCenter(squareIndex, boardOrientation, boardSize);
  const width = boardSize / BOARD_FILES;
  const height = boardSize / BOARD_RANKS;

  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
}
