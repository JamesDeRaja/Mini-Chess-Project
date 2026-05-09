import type { Color, GameStatus } from '../game/types.js';

type GameHeaderProps = {
  title: string;
  turn: Color;
  status: GameStatus;
  playerRole?: string;
  details?: string;
  statusItems?: string[];
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

export function GameHeader({ title, turn, status, playerRole, details, statusItems, onTitleClick }: GameHeaderProps) {
  const defaultStatusItems = [
    `${turn === 'white' ? 'White' : 'Black'} to move`,
    ...(playerRole ? [playerRole] : []),
    statusLabel(status),
  ];

  return (
    <header className="game-header">
      <div className="game-header-copy">
        <button className="title-link eyebrow" onClick={onTitleClick} disabled={!onTitleClick} aria-label="Go to home">
          Pocket Shuffle Chess
        </button>
        <h1>{title}</h1>
        {details && <p className="game-details">{details}</p>}
        <div className="game-status-row" role="status" aria-label="Game status">
          {(statusItems ?? defaultStatusItems).map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>
    </header>
  );
}
