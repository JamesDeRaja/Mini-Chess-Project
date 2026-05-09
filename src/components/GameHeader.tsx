import type { Color, GameStatus } from '../game/types';

type GameHeaderProps = {
  title: string;
  turn: Color;
  status: GameStatus;
  playerRole?: string;
  details?: string;
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

export function GameHeader({ title, turn, status, playerRole, details }: GameHeaderProps) {
  return (
    <header className="game-header">
      <div>
        <p className="eyebrow">Mini Chess</p>
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
