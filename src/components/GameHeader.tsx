import type { Color, GameStatus } from '../game/types';

type GameHeaderProps = {
  title: string;
  turn: Color;
  status: GameStatus;
  playerRole?: string;
  details?: string;
  onTitleClick?: () => void;
};

function statusLabel(status: GameStatus): string {
  switch (status) {
    case 'waiting':
      return 'Waiting for opponent';
    case 'active':
      return 'Active';
    case 'white_won':
      return 'White won';
    case 'black_won':
      return 'Black won';
    case 'draw':
      return 'Draw';
  }
}

export function GameHeader({ title, turn, status, playerRole, details, onTitleClick }: GameHeaderProps) {
  return (
    <header className="game-header">
      <div>
        <button className="title-link eyebrow" onClick={onTitleClick} disabled={!onTitleClick} aria-label="Go to home">
          Mini Chess
        </button>
        <h1>{title}</h1>
        {details && <p className="game-details">{details}</p>}
      </div>
      <div className="status-card">
        {playerRole && <span>{playerRole}</span>}
        <strong>{statusLabel(status)}</strong>
        <span>{turn === 'white' ? 'White' : 'Black'} to move</span>
      </div>
    </header>
  );
}
