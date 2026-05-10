import { useMemo, useState } from 'react';
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
  onTryDaily: () => void;
};

function spacedCode(backRankCode: string): string {
  return backRankCode.split('').join(' ');
}

function getPieceName(piece: Piece): string {
  return pieceDialogues[piece.type].name;
}

type MeetPieceCardStyle = CSSProperties & { '--meet-piece-left': string; '--meet-piece-top': string };

function getTooltipPlacement(selectedIndex: number | null): MeetPieceCardStyle {
  if (selectedIndex === null) return { '--meet-piece-left': '50%', '--meet-piece-top': '50%' };

  const file = selectedIndex % BOARD_FILES;
  const rank = Math.floor(selectedIndex / BOARD_FILES);
  const visualRow = BOARD_RANKS - 1 - rank;
  return {
    '--meet-piece-left': `${((file + 0.5) / BOARD_FILES) * 100}%`,
    '--meet-piece-top': `${((visualRow + 0.5) / BOARD_RANKS) * 100}%`,
  };
}

export function HomepageInteractiveBoard({ backRankCode, dailySeed, blackBackRankCode, onTryDaily }: HomepageInteractiveBoardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dialogueStep, setDialogueStep] = useState(0);
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
  const tooltipStyle = getTooltipPlacement(selectedIndex);

  function selectPiece(squareIndex: number) {
    if (!board[squareIndex].piece) return;
    setSelectedIndex(squareIndex);
    setDialogueStep((currentStep) => currentStep + 1);
  }

  return (
    <>
      <div className="preview-board-frame meet-board-frame">
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
          <aside className="meet-piece-card" style={tooltipStyle} aria-live="polite">
            <div className="meet-piece-card-header">
              <span className="meet-piece-icon" aria-hidden="true"><img src={getPieceImageSrc(selectedPiece)} alt="" draggable={false} /></span>
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
            <button type="button" className="meet-piece-cta" onClick={onTryDaily}>Try Today&apos;s Daily</button>
          </aside>
        )}
      </div>
      <p className="meet-board-hint">Tap a piece. It will explain itself with only a little attitude.</p>
    </>
  );
}
