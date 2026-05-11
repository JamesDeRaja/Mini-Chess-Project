import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { BOARD_FILES, BOARD_RANKS } from '../game/constants.js';
import { fileLabel, index } from '../game/coordinates.js';
import type { Board as ChessBoard, Move, Piece as ChessPiece } from '../game/types.js';
import { Piece } from './Piece.js';
import { Square } from './Square.js';

type LastMove = Pick<Move, 'from' | 'to'> | null;

type BoardProps = {
  board: ChessBoard;
  ariaLabel?: string;
  selectedSquare: number | null;
  legalMoves: Move[];
  lastMove: LastMove;
  checkedKingIndex: number | null;
  isFlipped?: boolean;
  isInteractive?: boolean;
  onSquareClick: (squareIndex: number) => void;
  onDragStart?: (squareIndex: number) => Move[] | null;
  onDrop?: (squareIndex: number) => void;
  onDragCancel?: () => void;
};

type DragState = {
  fromSquare: number;
  piece: ChessPiece;
  pointerId: number;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  pieceWidth: number;
  pieceHeight: number;
  hasMoved: boolean;
  hoveredSquare: number | null;
  legalMoves: Move[];
};

function isPrimaryPointer(event: ReactPointerEvent<HTMLButtonElement>) {
  return event.isPrimary && (event.pointerType !== 'mouse' || event.button === 0);
}

export function Board({
  board,
  ariaLabel = 'Pocket Shuffle Chess board',
  selectedSquare,
  legalMoves,
  lastMove,
  checkedKingIndex,
  isFlipped = false,
  isInteractive = true,
  onSquareClick,
  onDragStart,
  onDrop,
  onDragCancel,
}: BoardProps) {
  const boardElementRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const squares = [];
  const ranks = Array.from({ length: BOARD_RANKS }, (_, rank) => rank);
  const files = Array.from({ length: BOARD_FILES }, (_, file) => file);
  const visualRanks = isFlipped ? ranks : [...ranks].reverse();
  const visualFiles = isFlipped ? [...files].reverse() : files;

  useEffect(() => {
    return () => {
      dragStateRef.current = null;
    };
  }, []);

  function updateDragState(nextDragState: DragState | null) {
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  function squareIndexFromPoint(clientX: number, clientY: number): number | null {
    const boardElement = boardElementRef.current;
    const pointedElement = document.elementFromPoint(clientX, clientY);
    if (!boardElement || !pointedElement || !boardElement.contains(pointedElement)) return null;

    const squareElement = pointedElement.closest<HTMLButtonElement>('.square[data-square-index]');
    if (!squareElement || !boardElement.contains(squareElement)) return null;

    const squareIndex = Number(squareElement.dataset.squareIndex);
    return Number.isInteger(squareIndex) ? squareIndex : null;
  }

  function finishDrag(targetSquare: number | null) {
    const currentDragState = dragStateRef.current;
    if (!currentDragState) return;

    const legalDrop = targetSquare !== null && currentDragState.legalMoves.some((move) => move.to === targetSquare);
    suppressNextClickRef.current = currentDragState.hasMoved;
    updateDragState(null);

    if (legalDrop) {
      onDrop?.(targetSquare);
      return;
    }

    onDragCancel?.();
  }

  function handlePointerMove(event: PointerEvent) {
    const currentDragState = dragStateRef.current;
    if (!currentDragState || event.pointerId !== currentDragState.pointerId) return;

    const deltaX = event.clientX - currentDragState.startX;
    const deltaY = event.clientY - currentDragState.startY;
    const hasMoved = currentDragState.hasMoved || Math.hypot(deltaX, deltaY) > 4;
    if (hasMoved) event.preventDefault();

    updateDragState({
      ...currentDragState,
      pointerX: event.clientX,
      pointerY: event.clientY,
      hasMoved,
      hoveredSquare: squareIndexFromPoint(event.clientX, event.clientY),
    });
  }

  function handlePointerUp(event: PointerEvent) {
    const currentDragState = dragStateRef.current;
    if (!currentDragState || event.pointerId !== currentDragState.pointerId) return;

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);

    if (!currentDragState.hasMoved) {
      updateDragState(null);
      return;
    }

    event.preventDefault();
    finishDrag(squareIndexFromPoint(event.clientX, event.clientY));
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);
  }

  function handlePointerCancel(event: PointerEvent) {
    const currentDragState = dragStateRef.current;
    if (!currentDragState || event.pointerId !== currentDragState.pointerId) return;

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
    updateDragState(null);
    onDragCancel?.();
  }

  function handlePointerDragStart(event: ReactPointerEvent<HTMLButtonElement>, squareIndex: number) {
    if (!isInteractive || !isPrimaryPointer(event)) return;

    const piece = board[squareIndex]?.piece;
    if (!piece) return;

    const dragLegalMoves = onDragStart?.(squareIndex) ?? null;
    if (!dragLegalMoves) return;

    const squareRect = event.currentTarget.getBoundingClientRect();
    const nextDragState: DragState = {
      fromSquare: squareIndex,
      piece,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pointerX: event.clientX,
      pointerY: event.clientY,
      pieceWidth: squareRect.width,
      pieceHeight: squareRect.height,
      hasMoved: false,
      hoveredSquare: squareIndex,
      legalMoves: dragLegalMoves,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateDragState(nextDragState);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  }

  function handleSquareClick(squareIndex: number) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onSquareClick(squareIndex);
  }

  const visibleLegalMoves = dragState?.hasMoved ? dragState.legalMoves : legalMoves;
  const dragHoveredSquare = dragState?.hasMoved ? dragState.hoveredSquare : null;
  const dragHoveredLegalSquare = dragHoveredSquare !== null && visibleLegalMoves.some((move) => move.to === dragHoveredSquare) ? dragHoveredSquare : null;

  for (const rank of visualRanks) {
    for (const file of visualFiles) {
      const squareIndex = index(file, rank);
      const legalMove = visibleLegalMoves.find((move) => move.to === squareIndex);
      squares.push(
        <Square
          key={squareIndex}
          squareIndex={squareIndex}
          square={board[squareIndex]}
          isSelected={selectedSquare === squareIndex}
          isLegalMove={Boolean(legalMove)}
          isCapture={Boolean(legalMove?.isCapture)}
          isLastMove={lastMove?.from === squareIndex || lastMove?.to === squareIndex}
          isKingInCheck={checkedKingIndex === squareIndex}
          isInteractive={isInteractive}
          isBoardSelected={selectedSquare === squareIndex}
          isDragSource={Boolean(dragState?.hasMoved && dragState.fromSquare === squareIndex)}
          isDragHoveredLegal={dragHoveredLegalSquare === squareIndex}
          coordinateLabel={`${fileLabel(file)}${rank + 1}`}
          onClick={() => handleSquareClick(squareIndex)}
          onPointerDragStart={handlePointerDragStart}
        />,
      );
    }
  }

  const rankLabels = visualRanks.map((rank) => rank + 1);
  const fileLabels = visualFiles.map((file) => fileLabel(file));

  return (
    <div className="board-frame board-shell">
      <div className="board-stage">
        <div className="board-rank-labels" aria-hidden="true">
          {rankLabels.map((rank) => <span key={rank}>{rank}</span>)}
        </div>
        <div ref={boardElementRef} className={`board ${dragState?.hasMoved ? 'dragging-board' : ''}`} role="grid" aria-label={ariaLabel}>{squares}</div>
        <div className="board-file-labels" aria-hidden="true">
          {fileLabels.map((file) => <span key={file}>{file}</span>)}
        </div>
      </div>
      {dragState?.hasMoved && (
        <div
          className="board-drag-preview"
          aria-hidden="true"
          style={{
            left: dragState.pointerX,
            top: dragState.pointerY,
            width: dragState.pieceWidth,
            height: dragState.pieceHeight,
          }}
        >
          <Piece piece={dragState.piece} isDraggable={false} isSelected />
        </div>
      )}
    </div>
  );
}
