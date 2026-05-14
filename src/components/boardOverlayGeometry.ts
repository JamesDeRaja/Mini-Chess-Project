import { useLayoutEffect, useState, type RefObject } from 'react';
import { BOARD_FILES, BOARD_RANKS } from '../game/constants.js';
import type { BoardOrientation } from '../game/boardGeometry.js';

type OverlayLayout = {
  width: number;
  height: number;
  gap: number;
};

export type OverlaySquareGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

function readBoardGap(element: HTMLElement): number {
  const board = element.closest<HTMLElement>('.board');
  if (!board) return 0;
  const styles = window.getComputedStyle(board);
  const columnGap = Number.parseFloat(styles.columnGap || styles.gap || '0');
  return Number.isFinite(columnGap) ? columnGap : 0;
}

export function useOverlayLayout<T extends HTMLElement | SVGElement>(ref: RefObject<T | null>): OverlayLayout | null {
  const [layout, setLayout] = useState<OverlayLayout | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element?.parentElement) return undefined;
    const parent = element.parentElement;

    function updateLayout() {
      const rect = parent.getBoundingClientRect();
      setLayout({
        width: rect.width,
        height: rect.height,
        gap: readBoardGap(parent),
      });
    }

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [ref]);

  return layout;
}

export function getOverlaySquareGeometry(squareIndex: number, orientation: BoardOrientation, layout: OverlayLayout): OverlaySquareGeometry {
  const file = squareIndex % BOARD_FILES;
  const rank = Math.floor(squareIndex / BOARD_FILES);
  const visualFile = orientation === 'black' ? BOARD_FILES - 1 - file : file;
  const visualRank = orientation === 'black' ? rank : BOARD_RANKS - 1 - rank;
  const squareWidth = (layout.width - layout.gap * (BOARD_FILES - 1)) / BOARD_FILES;
  const squareHeight = (layout.height - layout.gap * (BOARD_RANKS - 1)) / BOARD_RANKS;
  const x = visualFile * (squareWidth + layout.gap);
  const y = visualRank * (squareHeight + layout.gap);

  return {
    x,
    y,
    width: squareWidth,
    height: squareHeight,
    centerX: x + squareWidth / 2,
    centerY: y + squareHeight / 2,
  };
}
