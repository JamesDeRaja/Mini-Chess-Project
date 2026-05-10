import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { BOARD_FILES, BOARD_RANKS } from '../../game/constants.js';
import { createInitialBoard } from '../../game/createInitialBoard.js';
import { getPieceImageSrc } from '../../game/pieceAssets.js';
import type { Piece } from '../../game/types.js';
import { getHomepagePieceMoves } from '../getHomepagePieceMoves.js';
import { getDialogueLine, pieceDialogues } from '../pieceDialogues.js';

type HomepageInteractiveBoardProps = {
  backRankCode: string;
  dailySeed: string;
  blackBackRankCode: string;
};

function spacedCode(backRankCode: string): string {
  return backRankCode.split('').join(' ');
}

function getPieceName(piece: Piece): string {
  return pieceDialogues[piece.type].name;
}

type MeetPiecePlacement = 'above' | 'below' | 'left' | 'right';

type MeetPieceCardStyle = CSSProperties & {
  '--meet-card-left': string;
  '--meet-card-top': string;
  '--meet-pointer-x': string;
  '--meet-pointer-y': string;
};

type MeetPieceCardPosition = {
  placement: MeetPiecePlacement;
  style: MeetPieceCardStyle;
};

const POPUP_GAP = 12;
const POPUP_INSET = 8;
const SELECTED_OVERLAP_PENALTY = 200000;
const CAPTURE_OVERLAP_PENALTY = 100000;
const NON_PREFERRED_ROW_PENALTY = 5000;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function toPixelStyle(value: number): string {
  return `${Math.round(value)}px`;
}

type PlacementCandidate = {
  placement: MeetPiecePlacement;
  left: number;
  top: number;
  fits: boolean;
};

function getOverlapArea(first: { left: number; top: number; right: number; bottom: number }, second: { left: number; top: number; right: number; bottom: number }): number {
  const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
  const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  return width * height;
}

export function HomepageInteractiveBoard({ backRankCode, dailySeed, blackBackRankCode }: HomepageInteractiveBoardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [cardPosition, setCardPosition] = useState<MeetPieceCardPosition | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const board = useMemo(() => createInitialBoard({ backRankCode }), [backRankCode]);
  const previewRows = useMemo(() => Array.from({ length: BOARD_RANKS }, (_rankPlaceholder, rowIndex) => {
    const rank = BOARD_RANKS - 1 - rowIndex;
    return Array.from({ length: BOARD_FILES }, (_filePlaceholder, file) => board[rank * BOARD_FILES + file]);
  }), [board]);
  const selectedPiece = selectedIndex === null ? null : board[selectedIndex]?.piece ?? null;
  const highlightedSquares = useMemo(() => {
    if (selectedIndex === null) return { moves: new Set<number>(), captures: new Set<number>() };
    const preview = getHomepagePieceMoves(board, selectedIndex);
    return { moves: new Set(preview.moves), captures: new Set(preview.captures) };
  }, [board, selectedIndex]);
  useLayoutEffect(() => {
    if (selectedIndex === null) return undefined;
    const activeSelectedIndex = selectedIndex;

    function updateCardPosition() {
      const frame = frameRef.current;
      const card = cardRef.current;
      const selectedSquare = frame?.querySelector<HTMLElement>(`[data-square-index="${activeSelectedIndex}"]`);
      if (!frame || !card || !selectedSquare) return;

      const frameRect = frame.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const squareRect = selectedSquare.getBoundingClientRect();
      const cardWidth = cardRect.width;
      const cardHeight = cardRect.height;
      const squareCenterX = squareRect.left - frameRect.left + squareRect.width / 2;
      const squareCenterY = squareRect.top - frameRect.top + squareRect.height / 2;
      const squareTop = squareRect.top - frameRect.top;
      const squareRight = squareRect.right - frameRect.left;
      const squareBottom = squareRect.bottom - frameRect.top;
      const squareLeft = squareRect.left - frameRect.left;
      const minLeft = POPUP_INSET - frameRect.left;
      const minTop = POPUP_INSET - frameRect.top;
      const maxLeft = window.innerWidth - frameRect.left - cardWidth - POPUP_INSET;
      const maxTop = window.innerHeight - frameRect.top - cardHeight - POPUP_INSET;
      const centeredLeft = squareCenterX - cardWidth / 2;
      const centeredTop = squareCenterY - cardHeight / 2;
      const selectedVisualRow = BOARD_RANKS - 1 - Math.floor(activeSelectedIndex / BOARD_FILES);
      const preferredVerticalPlacement: MeetPiecePlacement = selectedVisualRow >= BOARD_RANKS / 2 ? 'below' : 'above';
      const selectedSquareRect = {
        left: squareLeft,
        top: squareTop,
        right: squareRight,
        bottom: squareBottom,
      };
      const captureRects = [...highlightedSquares.captures]
        .map((captureIndex) => frame.querySelector<HTMLElement>(`[data-square-index="${captureIndex}"]`))
        .filter((captureSquare): captureSquare is HTMLElement => Boolean(captureSquare))
        .map((captureSquare) => {
          const captureRect = captureSquare.getBoundingClientRect();
          return {
            left: captureRect.left - frameRect.left,
            top: captureRect.top - frameRect.top,
            right: captureRect.right - frameRect.left,
            bottom: captureRect.bottom - frameRect.top,
          };
        });
      const aboveCandidate: PlacementCandidate = {
        placement: 'above',
        left: centeredLeft,
        top: squareTop - POPUP_GAP - cardHeight,
        fits: squareTop - POPUP_GAP - cardHeight >= minTop,
      };
      const belowCandidate: PlacementCandidate = {
        placement: 'below',
        left: centeredLeft,
        top: squareBottom + POPUP_GAP,
        fits: squareBottom + POPUP_GAP + cardHeight <= maxTop + cardHeight,
      };
      const sideCandidates: PlacementCandidate[] = [
        {
          placement: 'right',
          left: squareRight + POPUP_GAP,
          top: centeredTop,
          fits: squareRight + POPUP_GAP + cardWidth <= maxLeft + cardWidth,
        },
        {
          placement: 'left',
          left: squareLeft - POPUP_GAP - cardWidth,
          top: centeredTop,
          fits: squareLeft - POPUP_GAP - cardWidth >= minLeft,
        },
      ];
      const candidates = preferredVerticalPlacement === 'below'
        ? [belowCandidate, ...sideCandidates, aboveCandidate]
        : [aboveCandidate, ...sideCandidates, belowCandidate];
      const scoredCandidates = candidates.map((candidate, index) => {
        const clampedLeft = clamp(candidate.left, minLeft, maxLeft);
        const clampedTop = clamp(candidate.top, minTop, maxTop);
        const cardBounds = {
          left: clampedLeft,
          top: clampedTop,
          right: clampedLeft + cardWidth,
          bottom: clampedTop + cardHeight,
        };
        const selectedOverlap = getOverlapArea(cardBounds, selectedSquareRect);
        const captureOverlap = captureRects.reduce((total, captureRect) => total + getOverlapArea(cardBounds, captureRect), 0);
        const clampDistance = Math.abs(clampedLeft - candidate.left) + Math.abs(clampedTop - candidate.top);
        return {
          ...candidate,
          index,
          left: clampedLeft,
          top: clampedTop,
          score: (candidate.fits ? 0 : 10000)
            + (candidate.placement === preferredVerticalPlacement ? 0 : NON_PREFERRED_ROW_PENALTY)
            + selectedOverlap * SELECTED_OVERLAP_PENALTY
            + captureOverlap * CAPTURE_OVERLAP_PENALTY
            + clampDistance,
        };
      });
      scoredCandidates.sort((first, second) => first.score - second.score || first.index - second.index);
      const bestCandidate = scoredCandidates[0];
      const placement = bestCandidate.placement;
      const left = bestCandidate.left;
      const top = bestCandidate.top;

      const nextPosition: MeetPieceCardPosition = {
        placement,
        style: {
          '--meet-card-left': toPixelStyle(left),
          '--meet-card-top': toPixelStyle(top),
          '--meet-pointer-x': toPixelStyle(clamp(squareCenterX - left, 18, cardWidth - 18)),
          '--meet-pointer-y': toPixelStyle(clamp(squareCenterY - top, 18, cardHeight - 18)),
        },
      };

      setCardPosition((currentPosition) => {
        if (
          currentPosition?.placement === nextPosition.placement
          && currentPosition.style['--meet-card-left'] === nextPosition.style['--meet-card-left']
          && currentPosition.style['--meet-card-top'] === nextPosition.style['--meet-card-top']
          && currentPosition.style['--meet-pointer-x'] === nextPosition.style['--meet-pointer-x']
          && currentPosition.style['--meet-pointer-y'] === nextPosition.style['--meet-pointer-y']
        ) return currentPosition;
        return nextPosition;
      });
    }

    const animationFrameId = window.requestAnimationFrame(updateCardPosition);
    window.addEventListener('resize', updateCardPosition);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCardPosition);
    };
  }, [dialogueStep, highlightedSquares.captures, selectedIndex, selectedPiece]);

  function closePieceCard() {
    setCardPosition(null);
    setSelectedIndex(null);
  }

  function selectPiece(squareIndex: number) {
    if (!board[squareIndex].piece) return;
    setCardPosition(null);
    setSelectedIndex(squareIndex);
    setDialogueStep((currentStep) => currentStep + 1);
  }

  return (
    <>
      <div className="preview-board-frame meet-board-frame" ref={frameRef}>
        <div
          className="preview-board-grid meet-board-grid"
          role="grid"
          data-seed={dailySeed}
          data-white-back-rank={backRankCode}
          data-black-back-rank={blackBackRankCode}
          aria-label={`Meet the pieces on today's 5 by 6 seed arrangement for ${dailySeed}: white bottom ${spacedCode(backRankCode)}, black top ${spacedCode(blackBackRankCode)}`}
        >
          {previewRows.flatMap((row) => row.map((square) => {
            const isSelected = square.piece && selectedIndex === square.rank * BOARD_FILES + square.file;
            const index = square.rank * BOARD_FILES + square.file;
            const isMove = highlightedSquares.moves.has(index);
            const isCapture = highlightedSquares.captures.has(index);
            const squareClassName = [
              'preview-square',
              'meet-square',
              isSelected ? 'is-selected' : '',
              isMove ? 'is-move-preview' : '',
              isCapture ? 'is-capture-preview' : '',
            ].filter(Boolean).join(' ');

            return (
              <button
                key={`${square.rank}-${square.file}`}
                type="button"
                className={squareClassName}
                onClick={() => selectPiece(index)}
                disabled={!square.piece}
                data-square-index={index}
                role="gridcell"
                aria-pressed={Boolean(isSelected)}
                aria-label={square.piece ? `Meet the ${square.piece.color} ${getPieceName(square.piece)}` : 'Empty square'}
              >
                {square.piece && <img src={getPieceImageSrc(square.piece)} alt="" draggable={false} />}
              </button>
            );
          }))}
        </div>
        {selectedPiece && (
          <aside
            ref={cardRef}
            className={`meet-piece-card meet-piece-card-${cardPosition?.placement ?? 'above'} ${cardPosition ? 'is-positioned' : ''}`}
            style={cardPosition?.style}
            aria-live="polite"
          >
            <button type="button" className="meet-piece-close" onClick={closePieceCard} aria-label="Close piece tip">×</button>
            <div className="meet-piece-card-header">
              <span className={`meet-piece-icon meet-piece-icon-${selectedPiece.type}`} aria-hidden="true"><img src={getPieceImageSrc(selectedPiece)} alt="" draggable={false} /></span>
              <div>
                <span>Meet the</span>
                <strong>{pieceDialogues[selectedPiece.type].name}</strong>
              </div>
            </div>
            <p className="meet-piece-quote">“{getDialogueLine(selectedPiece.type, dialogueStep)}”</p>
            <div className="meet-piece-moves">
              <span>Moves</span>
              {pieceDialogues[selectedPiece.type].moves.map((moveText) => <p key={moveText}>{moveText}</p>)}
            </div>
            <div className="meet-piece-preview-tags" aria-label="Movement preview legend">
              <span><i className="meet-legend-orb" aria-hidden="true" />Yellow orb = move</span>
              <span><i className="meet-legend-capture" aria-hidden="true" />Red orb = capture</span>
            </div>
          </aside>
        )}
      </div>
      <p className="meet-board-hint">Tap a piece. It will explain itself with only a little attitude.</p>
    </>
  );
}
