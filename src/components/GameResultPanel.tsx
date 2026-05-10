import type { ReactNode } from 'react';
import { Trophy } from 'lucide-react';
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

export function GameResultPanel({ result, winner, eyebrow, title, summary, progressionMessage, actions }: GameResultPanelProps) {
  const didWin = result === 'win';
  const icon = didWin ? <Trophy size={48} /> : <span className="result-emoji">{winner ? '😅' : '🤝'}</span>;

  return (
    <div className="winner-overlay" role="status">
      {didWin && <div className="confetti" />}
      <div className={didWin ? 'winner-card player-winner-card' : 'winner-card calm-result-card'}>
        {icon}
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{summary}</p>
        {progressionMessage && <p className="panel-note">{progressionMessage}</p>}
        <div className="panel-actions centered-actions">{actions}</div>
      </div>
    </div>
  );
}
