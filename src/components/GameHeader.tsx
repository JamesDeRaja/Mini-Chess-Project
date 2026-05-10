import { Crown } from 'lucide-react';
import type { Color, GameStatus } from '../game/types.js';

type GameHeaderProps = {
  title: string;
  turn: Color;
  status: GameStatus;
  playerRole?: string;
  details?: string;
  onTitleClick?: () => void;
  statusLabelOverride?: string;
  turnLabelOverride?: string;
};

function statusLabel(status: GameStatus): string {
  switch (status) {
    case 'waiting': return 'Waiting';
    case 'active': return 'Active';
    case 'white_won': return 'White won';
    case 'black_won': return 'Black won';
    case 'draw': return 'Draw';
  }
}

export function GameHeader({ title, turn, status, playerRole, details, onTitleClick, statusLabelOverride, turnLabelOverride }: GameHeaderProps) {
  const isActive = status === 'active' && !statusLabelOverride;
  const pieceSymbol = playerRole?.toLowerCase().includes('black') ? '♟' : '♙';

  return (
    <header className="game-header">
      <div className="game-title-block">
        <button
          className="title-link brand-line"
          onClick={onTitleClick}
          disabled={!onTitleClick}
          aria-label="Go to home"
        >
          <span className="brand-crown">
            <Crown size={11} strokeWidth={2.5} />
          </span>
          Pocket Shuffle Chess
        </button>
        <h1>{title}</h1>
        {details && <p className="game-details">{details}</p>}
      </div>

      <div className="status-card">
        <div className="status-avatar-wrap" aria-hidden="true">
          {pieceSymbol}
        </div>
        <div className="status-text">
          {playerRole && <span className="status-role-text">{playerRole}</span>}
          <strong className="status-main">
            {statusLabelOverride ?? statusLabel(status)}
          </strong>
          <span className="status-turn-text">
            <span className={`status-dot${isActive ? ' status-dot-active' : ''}`} />
            {turnLabelOverride ?? `${turn === 'white' ? 'White' : 'Black'} to move`}
          </span>
        </div>
      </div>
    </header>
  );
}
