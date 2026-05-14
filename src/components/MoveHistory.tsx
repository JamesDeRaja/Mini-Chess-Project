import { formatMoveNotation, groupMoveHistory, moveDestination, pieceNames, type HistoryMove } from '../game/moveNotation.js';
import { getCapturePenaltyScore, getMoveCaptureRecord } from '../game/scoring.js';
import type { Color, MoveAnalysis } from '../game/types.js';

type MoveHistoryProps = {
  moves: HistoryMove[];
  emptyPrimary: string;
  emptySecondary: string;
  activePly?: number | null;
  onSelectPly?: (ply: number) => void;
  scoringSide?: Color;
  analysisByPly?: Record<number, MoveAnalysis | undefined>;
};

function moveA11yLabel(move: HistoryMove, notation: ReturnType<typeof formatMoveNotation>) {
  const color = move.color === 'white' ? 'White' : 'Black';
  const action = notation.isCapture ? 'captures on' : 'to';
  const suffix = notation.isMate ? ' checkmate' : notation.isCheck ? ' check' : '';
  return `${color} ${pieceNames[move.piece]} ${action} ${moveDestination(move)}${suffix}`;
}

function MoveCell({
  move,
  ply,
  activePly,
  onSelectPly,
  scoringSide,
  analysis,
}: {
  move: HistoryMove | null;
  ply: number | null;
  activePly?: number | null;
  onSelectPly?: (ply: number) => void;
  scoringSide?: Color;
  analysis?: MoveAnalysis;
}) {
  if (!move || ply === null) {
    return <span className="history-move history-move-placeholder" aria-label="Move pending">…</span>;
  }

  const notation = formatMoveNotation(move);
  const isActive = activePly === ply;
  const className = isActive ? 'history-move active-history-move' : 'history-move';
  const label = moveA11yLabel(move, notation);
  const captureRecord = getMoveCaptureRecord(move, ply - 1);
  const isPenaltyCapture = Boolean(captureRecord && scoringSide && captureRecord.capturingSide !== scoringSide);
  const captureScoreLabel = captureRecord ? (isPenaltyCapture ? `-${getCapturePenaltyScore(captureRecord.capturedPiece)}` : `+${captureRecord.scoreValue}`) : null;
  const content = (
    <>
      <img className="history-piece-icon" src={notation.pieceIcon} alt="" aria-hidden="true" draggable="false" />
      <span className="history-notation-text">{notation.text}{captureScoreLabel && <span className={isPenaltyCapture ? 'history-capture-score history-capture-score-penalty' : 'history-capture-score'}> {captureScoreLabel}</span>}</span>
      {analysis && <span className={analysis.isBlunder ? 'history-analysis-marker history-analysis-blunder' : analysis.isBestMove ? 'history-analysis-marker history-analysis-best' : 'history-analysis-marker history-analysis-suggested'} title={analysis.isBlunder ? 'Blunder: this move has a strong reply' : analysis.isBestMove ? 'Best move found' : 'Computer suggested a different move'}>{analysis.isBlunder ? '!' : analysis.isBestMove ? '⭐' : '↗'}</span>}
    </>
  );

  if (!onSelectPly) {
    return (
      <span className={className} role="text" aria-label={label} title={label} data-history-ply={ply}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-current={isActive ? 'step' : undefined}
      aria-label={label}
      title={label}
      onClick={() => onSelectPly(ply)}
      data-history-ply={ply}
    >
      {content}
    </button>
  );
}

export function MoveHistory({ moves, emptyPrimary, emptySecondary, activePly, onSelectPly, scoringSide, analysisByPly = {} }: MoveHistoryProps) {
  const groupedMoves = groupMoveHistory(moves);
  const newestMoveNumber = groupedMoves.at(-1)?.moveNumber;

  if (moves.length === 0) {
    return (
      <li className="empty-history">
        <span>{emptyPrimary}</span>
        <span>{emptySecondary}</span>
      </li>
    );
  }

  return groupedMoves.map((group) => (
    <li key={`move-row-${group.moveNumber}`} className={group.moveNumber === newestMoveNumber ? 'move-history-row latest-history-row' : 'move-history-row'}>
      <span className="history-move-number">{group.moveNumber}.</span>
      <MoveCell move={group.white} ply={group.whitePly} activePly={activePly} onSelectPly={onSelectPly} scoringSide={scoringSide} analysis={group.whitePly ? analysisByPly[group.whitePly] : undefined} />
      <MoveCell move={group.black} ply={group.blackPly} activePly={activePly} onSelectPly={onSelectPly} scoringSide={scoringSide} analysis={group.blackPly ? analysisByPly[group.blackPly] : undefined} />
    </li>
  ));
}
