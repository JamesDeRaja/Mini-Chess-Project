import type { ReactNode } from 'react';
import type { Color } from '../game/types.js';

export type GameResult = 'win' | 'loss' | 'draw' | 'spectator';

type GameResultPanelProps = {
  result: GameResult;
  winner: Color | null;
  eyebrow: string;
  title: string;
  summary: string;
  progressionMessage?: string;
  actions: ReactNode;
};

function ResultAvatar({ winner }: { winner: Color | null }) {
  if (!winner) {
    return (
      <div className="result-piece-pair" role="img" aria-label="Draw result">
        <img className="result-piece-img" src="/pieces/white-pawn.png" alt="" draggable={false} />
        <img className="result-piece-img" src="/pieces/black-pawn.png" alt="" draggable={false} />
      </div>
    );
  }

  return (
    <img
      className="result-piece-img result-king-img"
      src={`/pieces/${winner}-king.png`}
      alt=""
      draggable={false}
      role="img"
      aria-label={`${winner === 'white' ? 'White' : 'Black'} winner`}
    />
  );
}

export function GameResultPanel({ result, winner, eyebrow, title, summary, progressionMessage, actions }: GameResultPanelProps) {
  const didWin = result === 'win';

  return (
    <div className="winner-overlay" role="status">
      {didWin && <div className="confetti" />}
      <div className={didWin ? 'winner-card player-winner-card' : 'winner-card calm-result-card'}>
        <ResultAvatar winner={winner} />
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{summary}</p>
        {progressionMessage && <p className="panel-note">{progressionMessage}</p>}
        <div className="panel-actions centered-actions">{actions}</div>
      </div>
    </div>
  );
}
