import { useState, type ReactNode } from 'react';
import type { Color } from '../game/types.js';

export type GameResult = 'win' | 'loss' | 'draw' | 'stalemate' | 'spectator';

type GameResultPanelProps = {
  result: GameResult;
  winner: Color | null;
  eyebrow: string;
  title: string;
  summary: string;
  progressionMessage?: string;
  titleAccessory?: ReactNode;
  details?: ReactNode;
  actions: ReactNode;
};

function ResultAvatar({ winner, result }: { winner: Color | null; result: GameResult }) {
  if (!winner) {
    const pieceType = result === 'stalemate' ? 'king' : 'pawn';
    return (
      <div className="result-piece-pair" role="img" aria-label={result === 'stalemate' ? 'Stalemate result' : 'Draw result'}>
        <img className="result-piece-img" data-piece={pieceType} src={`/pieces/white-${pieceType}.png`} alt="" draggable={false} />
        <img className="result-piece-img" data-piece={pieceType} src={`/pieces/black-${pieceType}.png`} alt="" draggable={false} />
      </div>
    );
  }

  return (
    <img
      className="result-piece-img result-king-img"
      data-piece="king"
      src={`/pieces/${winner}-king.png`}
      alt=""
      draggable={false}
      role="img"
      aria-label={`${winner === 'white' ? 'White' : 'Black'} winner`}
    />
  );
}

export function GameResultPanel({ result, winner, eyebrow, title, summary, progressionMessage, titleAccessory, details, actions }: GameResultPanelProps) {
  const [dismissedResultKey, setDismissedResultKey] = useState<string | null>(null);
  const didWin = result === 'win';
  const cardClassName = didWin ? 'winner-card player-winner-card' : result === 'stalemate' ? 'winner-card stalemate-result-card' : 'winner-card calm-result-card';
  const resultKey = `${result}:${winner ?? 'none'}:${title}:${summary}`;

  if (dismissedResultKey === resultKey) return null;

  return (
    <div className="winner-overlay" role="status">
      {didWin && <div className="confetti" />}
      <div className={cardClassName}>
        <button
          type="button"
          className="result-close-button"
          aria-label="Close result panel"
          onClick={() => setDismissedResultKey(resultKey)}
        >
          ×
        </button>
        <ResultAvatar winner={winner} result={result} />
        <p className="eyebrow">{eyebrow}</p>
        <div className="result-title-row">
          <h2>{title}</h2>
          {titleAccessory}
        </div>
        <p>{summary}</p>
        {progressionMessage && <p className="panel-note">{progressionMessage}</p>}
        {details}
        <div className="panel-actions centered-actions">{actions}</div>
      </div>
    </div>
  );
}
