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
    case 'waiting':
      return 'Waiting';
    case 'active':
      return 'Active';
    case 'white_won':
      return 'Game Over';
    case 'black_won':
      return 'Game Over';
    case 'draw':
      return 'Game Over';
  }
}

export function GameHeader({ title, turn, status, playerRole, details, onTitleClick, statusLabelOverride, turnLabelOverride }: GameHeaderProps) {
  const roleIsBlack = playerRole?.toLowerCase().includes('black');

  return (
    <header className="game-header">
      <div className="game-title-block">
        <button className="title-link brand-lockup" onClick={onTitleClick} disabled={!onTitleClick} aria-label="Go to home">
          <span className="brand-crown" aria-hidden="true">♕</span>
          <span>Pocket Shuffle Chess</span>
        </button>
        <h1>{title}</h1>
        {details && <p className="game-details">{details}</p>}
      </div>
      <div className="status-card" aria-live="polite">
        <div className={`status-avatar ${roleIsBlack ? 'black-avatar' : 'white-avatar'}`} aria-hidden="true">♟</div>
        <div className="status-copy">
          {playerRole && <span>{playerRole}</span>}
          <strong>{statusLabelOverride ?? statusLabel(status)}</strong>
          <span className="turn-line"><span className="status-dot" />{turnLabelOverride ?? `${turn === 'white' ? 'White' : 'Black'} to move`}</span>
        </div>
      </div>
    </header>
  );
}
