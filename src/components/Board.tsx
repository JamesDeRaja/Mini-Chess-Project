import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { BOARD_FILES, BOARD_RANKS } from '../game/constants.js';
import { fileLabel, index } from '../game/coordinates.js';
import type { Board as ChessBoard, Move, Piece as ChessPiece } from '../game/types.js';
import { Piece } from './Piece.js';
import { Square } from './Square.js';

type LastMove = { from: number; to: number; isCapture?: boolean } | null;

type FlyingPiece = {
  piece: ChessPiece;
  startX: number;
  startY: number;
  endDx: number;
  endDy: number;
  arcHeight: number;
  size: number;
  destSquare: number;
  duration: number;
  animKey: string;
} | null;

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
  onDrop?: (squareIndex: number, move: Move) => void;
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

function spawnCaptureParticles(cx: number, cy: number) {
  const colors = [
    '#f7cf72', '#ffa995', '#ffffff', '#ffc840',
    '#8dbfaf', '#ff6932', '#ffec64', '#ff4422',
    '#ffdc00', '#ff9e00', '#ffe082', '#ff7043',
  ];

  // Main burst: 26 particles
  const count = 26;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'capture-particle';

    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const speed = 65 + Math.random() * 120;
    const tx = Math.sin(angle) * speed;
    const ty = -Math.cos(angle) * speed - Math.random() * 20; // slight upward bias
    const size = 4 + Math.random() * 14;
    const dur = 480 + Math.random() * 420;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const rot = (Math.random() - 0.5) * 560;
    const r = Math.random();
    let borderRadius = '50%';
    let w = size, h = size;
    if (r > 0.65) { borderRadius = '2px'; } // square chunk
    if (r > 0.82) { w = size * 0.35; h = size * 2.2; borderRadius = '1px'; } // shard

    el.style.cssText = [
      `left:${cx}px`, `top:${cy}px`,
      `width:${w}px`, `height:${h}px`,
      `background:${color}`,
      `border-radius:${borderRadius}`,
      `--tx:${tx}px`, `--ty:${ty}px`, `--rot:${rot}deg`,
      `animation:particle-burst ${dur}ms cubic-bezier(0.12,0.8,0.22,1) forwards`,
    ].join(';');

    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), dur + 100);
  }

  // 3 expanding shockwave rings
  const ringColors = ['rgba(255,180,60,0.95)', 'rgba(255,255,180,0.85)', 'rgba(255,120,40,0.7)'];
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    ring.className = 'capture-shockwave';
    const dur = 360 + i * 90;
    const delay = i * 60;
    const size = 14 + i * 10;

    ring.style.cssText = [
      `left:${cx}px`, `top:${cy}px`,
      `width:${size}px`, `height:${size}px`,
      `border:${3 - i * 0.5}px solid ${ringColors[i]}`,
      `animation:shockwave-ring ${dur}ms ${delay}ms cubic-bezier(0,0.5,0.2,1) forwards`,
    ].join(';');

    document.body.appendChild(ring);
    window.setTimeout(() => ring.remove(), dur + delay + 150);
  }

  // Subtle screen flash
  const flash = document.createElement('div');
  flash.style.cssText = [
    'position:fixed', 'inset:0', 'pointer-events:none',
    'z-index:9997', 'background:rgba(255,200,80,0.13)',
    'animation:capture-screen-flash 240ms ease-out forwards',
  ].join(';');
  document.body.appendChild(flash);
  window.setTimeout(() => flash.remove(), 260);
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
  const [flyingPiece, setFlyingPiece] = useState<FlyingPiece>(null);
  const [hiddenPieceSquare, setHiddenPieceSquare] = useState<number | null>(null);
  const flyKeyRef = useRef<string | null>(null);
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

  // --- Flying piece ghost (runs before paint) ---
  const prevMoveKeyRef = useRef<string | null>(null);
  const boardPropRef = useRef(board);
  boardPropRef.current = board;

  useLayoutEffect(() => {
    const boardEl = boardElementRef.current;
    if (!boardEl || !lastMove) {
      prevMoveKeyRef.current = null;
      return;
    }

    const moveKey = `${lastMove.from}-${lastMove.to}`;
    if (prevMoveKeyRef.current === moveKey) return;
    prevMoveKeyRef.current = moveKey;

    const fromEl = boardEl.querySelector<HTMLElement>(`[data-square-index="${lastMove.from}"]`);
    const toEl = boardEl.querySelector<HTMLElement>(`[data-square-index="${lastMove.to}"]`);
    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endDx = (toRect.left + toRect.width / 2) - startX;
    const endDy = (toRect.top + toRect.height / 2) - startY;

    if (Math.abs(endDx) < 2 && Math.abs(endDy) < 2) return;

    const piece = boardPropRef.current[lastMove.to]?.piece;
    if (!piece) return;

    const distance = Math.hypot(endDx, endDy);
    const arcHeight = Math.max(Math.min(distance * 0.55, 90), 52);
    const duration = Math.min(Math.max(distance * 0.6, 340), 480);

    const animKey = `${moveKey}-${Date.now()}`;
    flyKeyRef.current = animKey;

    // Hide real piece at destination while ghost flies
    setHiddenPieceSquare(lastMove.to);
    setFlyingPiece({
      piece,
      startX,
      startY,
      endDx,
      endDy,
      arcHeight,
      size: fromRect.width,
      destSquare: lastMove.to,
      duration,
      animKey,
    });

    // Reveal real piece just before ghost fully fades
    const REVEAL_AT = duration * 0.88;
    const revealTimer = window.setTimeout(() => {
      if (flyKeyRef.current === animKey) setHiddenPieceSquare(null);
    }, REVEAL_AT);

    // Clear ghost after animation completes
    const clearTimer = window.setTimeout(() => {
      if (flyKeyRef.current === animKey) {
        setFlyingPiece(null);
        flyKeyRef.current = null;
      }
    }, duration + 80);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(clearTimer);
    };
  }, [lastMove]);

  // --- Capture explosion (after paint) ---
  useEffect(() => {
    if (!lastMove?.isCapture) return;
    const boardEl = boardElementRef.current;
    if (!boardEl) return;

    const toEl = boardEl.querySelector<HTMLElement>(`[data-square-index="${lastMove.to}"]`);
    if (!toEl) return;

    const rect = toEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    toEl.classList.add('capture-flash');
    spawnCaptureParticles(cx, cy);

    const flashTimer = window.setTimeout(() => toEl.classList.remove('capture-flash'), 520);
    return () => {
      window.clearTimeout(flashTimer);
      toEl.classList.remove('capture-flash');
    };
  }, [lastMove]);

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
          isPieceHidden={hiddenPieceSquare === squareIndex}
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
      {flyingPiece && createPortal(
        <div
          key={flyingPiece.animKey}
          className="flying-piece-ghost"
          aria-hidden="true"
          style={{
            left: flyingPiece.startX,
            top: flyingPiece.startY,
            width: flyingPiece.size * 1.38,
            height: flyingPiece.size * 1.38,
            '--end-dx': `${flyingPiece.endDx}px`,
            '--end-dy': `${flyingPiece.endDy}px`,
            '--arc': `${flyingPiece.arcHeight}px`,
            '--fly-dur': `${flyingPiece.duration}ms`,
          } as React.CSSProperties}
        >
          <Piece piece={flyingPiece.piece} isDraggable={false} />
        </div>,
        document.body,
      )}
    </div>
  );
}
