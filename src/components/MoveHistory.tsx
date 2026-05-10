import { formatMoveNotation, groupMoveHistory, moveDestination, pieceNames, type HistoryMove } from '../game/moveNotation.js';

type MoveHistoryProps = {
  moves: HistoryMove[];
  emptyPrimary: string;
  emptySecondary: string;
  activePly?: number | null;
  onSelectPly?: (ply: number) => void;
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
}: {
  move: HistoryMove | null;
  ply: number | null;
  activePly?: number | null;
  onSelectPly?: (ply: number) => void;
}) {
  if (!move || ply === null) {
    return <span className="history-move history-move-placeholder" aria-label="Move pending">…</span>;
  }

  const notation = formatMoveNotation(move);
  const isActive = activePly === ply;
  const className = isActive ? 'history-move active-history-move' : 'history-move';
  const label = moveA11yLabel(move, notation);
  const content = (
    <>
      <img className="history-piece-icon" src={notation.pieceIcon} alt="" aria-hidden="true" draggable="false" />
      <span className="history-notation-text">{notation.text}</span>
    </>
  );

  if (!onSelectPly) {
    return (
      <span className={className} role="text" aria-label={label} title={label}>
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
    >
      {content}
    </button>
  );
}

export function MoveHistory({ moves, emptyPrimary, emptySecondary, activePly, onSelectPly }: MoveHistoryProps) {
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
      <MoveCell move={group.white} ply={group.whitePly} activePly={activePly} onSelectPly={onSelectPly} />
      <MoveCell move={group.black} ply={group.blackPly} activePly={activePly} onSelectPly={onSelectPly} />
    </li>
  ));
}
