import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { BOARD_FILES, BOARD_RANKS } from '../game/constants.js';
import { fileLabel, index } from '../game/coordinates.js';
import type { Board as ChessBoard, Move, Piece as ChessPiece, PieceType } from '../game/types.js';
import { Piece } from './Piece.js';
import { Square } from './Square.js';

type LastMove = (Pick<Move, 'from' | 'to'> & { isCapture?: boolean; captureScore?: number | null }) | null;

type BoardProps = {
  board: ChessBoard;
  ariaLabel?: string;
  selectedSquare: number | null;
  legalMoves: Move[];
  lastMove: LastMove;
  checkedKingIndex: number | null;
  isFlipped?: boolean;
  isInteractive?: boolean;
  spawnKey?: string | number;
  onSquareClick: (squareIndex: number) => void;
  onDragStart?: (squareIndex: number) => Move[] | null;
  onDrop?: (squareIndex: number, move: Move) => void;
  onDragCancel?: () => void;
  onSpawnComplete?: () => void;
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

type MoveInputKind = 'click' | 'drag';

const pieceJumpArc: Record<PieceType, number> = {
  king: 34,
  queen: 38,
  rook: 18,
  bishop: 30,
  knight: 52,
  pawn: 24,
};

const pieceMoveDuration: Record<PieceType, number> = {
  king: 520,
  queen: 540,
  rook: 430,
  bishop: 480,
  knight: 580,
  pawn: 420,
};

function getMotionPreference(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getMoveKeyframes(pieceType: PieceType, deltaX: number, deltaY: number, isCapture: boolean, inputKind: MoveInputKind): Keyframe[] {
  if (inputKind === 'drag') {
    return isCapture
      ? [
        { transform: 'translateY(-8px) scale(1.04, 0.96)', filter: 'brightness(1.08)', offset: 0 },
        { transform: 'translateY(5px) scale(1.18, 0.74)', filter: 'brightness(1.16)', offset: 0.52 },
        { transform: 'translateY(-3px) scale(0.95, 1.1)', filter: 'brightness(1.06)', offset: 0.76 },
        { transform: 'translateY(0) scale(1)', filter: 'brightness(1)', offset: 1 },
      ]
      : [
        { transform: 'translateY(-7px) scale(1.04, 0.96)', offset: 0 },
        { transform: 'translateY(4px) scale(1.12, 0.82)', offset: 0.55 },
        { transform: 'translateY(-2px) scale(0.97, 1.06)', offset: 0.78 },
        { transform: 'translateY(0) scale(1)', offset: 1 },
      ];
  }

  const arc = pieceJumpArc[pieceType];
  const rotation = pieceType === 'knight' ? -8 : pieceType === 'bishop' ? -5 : pieceType === 'queen' ? 4 : pieceType === 'rook' ? 0 : -3;
  const midX = deltaX * 0.48;
  const midY = deltaY * 0.48 - arc;
  return [
    { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.96, 1.04) rotate(${rotation}deg)`, opacity: 0.92, offset: 0 },
    { transform: `translate(${midX}px, ${midY}px) scale(1.05) rotate(${rotation * -0.35}deg)`, opacity: 1, offset: 0.46 },
    { transform: isCapture ? 'translateY(5px) scale(1.18, 0.76) rotate(3deg)' : 'translateY(3px) scale(1.12, 0.82)', opacity: 1, offset: 0.74 },
    { transform: 'translateY(-3px) scale(0.97, 1.07)', opacity: 1, offset: 0.88 },
    { transform: 'translate(0, 0) scale(1) rotate(0)', opacity: 1, offset: 1 },
  ];
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
  spawnKey,
  onSquareClick,
  onDragStart,
  onDrop,
  onDragCancel,
  onSpawnComplete,
}: BoardProps) {
  const boardElementRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const pendingMoveInputRef = useRef<MoveInputKind>('click');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isSpawningPieces, setIsSpawningPieces] = useState(true);
  const squares = [];
  const ranks = Array.from({ length: BOARD_RANKS }, (_, rank) => rank);
  const files = Array.from({ length: BOARD_FILES }, (_, file) => file);
  const visualRanks = isFlipped ? ranks : [...ranks].reverse();
  const visualFiles = isFlipped ? [...files].reverse() : files;
  useEffect(() => {
    const spawnTimer = window.setTimeout(() => {
      setIsSpawningPieces(false);
      onSpawnComplete?.();
    }, 1100);
    return () => {
      window.clearTimeout(spawnTimer);
      dragStateRef.current = null;
    };
  }, [onSpawnComplete, spawnKey]);

  useLayoutEffect(() => {
    if (!lastMove || getMotionPreference()) return;
    const boardElement = boardElementRef.current;
    const movedPiece = board[lastMove.to]?.piece;
    if (!boardElement || !movedPiece) return;

    const fromSquare = boardElement.querySelector<HTMLElement>(`[data-square-index="${lastMove.from}"]`);
    const toSquare = boardElement.querySelector<HTMLElement>(`[data-square-index="${lastMove.to}"]`);
    const pieceElement = toSquare?.querySelector<HTMLElement>(`[data-piece-id="${movedPiece.id}"]`);
    if (!fromSquare || !toSquare || !pieceElement) return;

    const fromRect = fromSquare.getBoundingClientRect();
    const toRect = toSquare.getBoundingClientRect();
    const deltaX = fromRect.left - toRect.left;
    const deltaY = fromRect.top - toRect.top;
    const inputKind = pendingMoveInputRef.current;
    pendingMoveInputRef.current = 'click';

    pieceElement.classList.add('piece-tweening');
    const animation = pieceElement.animate(
      getMoveKeyframes(movedPiece.type, deltaX, deltaY, Boolean(lastMove.isCapture), inputKind),
      {
        duration: inputKind === 'drag' ? 360 : pieceMoveDuration[movedPiece.type],
        easing: 'cubic-bezier(.16, 1.35, .32, 1)',
      },
    );
    return () => animation.cancel();
  }, [board, lastMove]);

  function updateDragState(nextDragState: DragState | null) {
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  function squareIndexFromPoint(clientX: number, clientY: number): number | null {
    const boardElement = boardElementRef.current;
    if (!boardElement) return null;

    const rect = boardElement.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;

    const styles = window.getComputedStyle(boardElement);
    const borderLeft = parseFloat(styles.borderLeftWidth) || 0;
    const borderRight = parseFloat(styles.borderRightWidth) || 0;
    const borderTop = parseFloat(styles.borderTopWidth) || 0;
    const borderBottom = parseFloat(styles.borderBottomWidth) || 0;
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const boardLeft = rect.left + borderLeft + paddingLeft;
    const boardRight = rect.right - borderRight - paddingRight;
    const boardTop = rect.top + borderTop + paddingTop;
    const boardBottom = rect.bottom - borderBottom - paddingBottom;
    if (clientX < boardLeft || clientX > boardRight || clientY < boardTop || clientY > boardBottom) return null;

    const visualFile = Math.min(BOARD_FILES - 1, Math.max(0, Math.floor(((clientX - boardLeft) / (boardRight - boardLeft)) * BOARD_FILES)));
    const visualRank = Math.min(BOARD_RANKS - 1, Math.max(0, Math.floor(((clientY - boardTop) / (boardBottom - boardTop)) * BOARD_RANKS)));
    return index(visualFiles[visualFile], visualRanks[visualRank]);
  }

  function finishDrag(targetSquare: number | null) {
    const currentDragState = dragStateRef.current;
    if (!currentDragState) return;

    const droppedMove = targetSquare !== null ? currentDragState.legalMoves.find((move) => move.to === targetSquare) : undefined;
    suppressNextClickRef.current = currentDragState.hasMoved;
    updateDragState(null);

    if (targetSquare !== null && droppedMove) {
      pendingMoveInputRef.current = 'drag';
      onDrop?.(targetSquare, droppedMove);
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
    pendingMoveInputRef.current = 'click';
    onSquareClick(squareIndex);
  }

  const visibleLegalMoves = dragState?.hasMoved ? dragState.legalMoves : legalMoves;
  const dragHoveredSquare = dragState?.hasMoved ? dragState.hoveredSquare : null;
  const dragHoveredLegalSquare = dragHoveredSquare !== null && visibleLegalMoves.some((move) => move.to === dragHoveredSquare) ? dragHoveredSquare : null;

  for (const rank of visualRanks) {
    for (const file of visualFiles) {
      const squareIndex = index(file, rank);
      const legalMove = visibleLegalMoves.find((move) => move.to === squareIndex);
      const isLastMoveDestination = lastMove?.to === squareIndex;
      const movedPieceType = isLastMoveDestination ? board[squareIndex]?.piece?.type ?? null : null;
      const spawnOrder = rank * BOARD_FILES + file;
      squares.push(
        <Square
          key={squareIndex}
          squareIndex={squareIndex}
          square={board[squareIndex]}
          isSelected={selectedSquare === squareIndex}
          isLegalMove={Boolean(legalMove)}
          isCapture={Boolean(legalMove?.isCapture)}
          isLastMove={lastMove?.from === squareIndex || isLastMoveDestination}
          isLastMoveDestination={isLastMoveDestination}
          didLastMoveCapture={Boolean(isLastMoveDestination && lastMove?.isCapture)}
          movedPieceType={movedPieceType}
          captureScoreFeedback={isLastMoveDestination ? lastMove?.captureScore : null}
          spawnOrder={spawnOrder}
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
        <div ref={boardElementRef} className={`board ${dragState?.hasMoved ? 'dragging-board' : ''} ${isSpawningPieces ? 'piece-spawn-board' : ''}`} role="grid" aria-label={ariaLabel}>{squares}</div>
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
