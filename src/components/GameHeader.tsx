import type { Color, GameStatus } from '../game/types';

type GameHeaderProps = {
  title: string;
  turn: Color;
  status: GameStatus;
  playerRole?: string;
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

export function GameHeader({ title, turn, status, playerRole }: GameHeaderProps) {
  return (
    <header className="game-header">
      <div>
        <p className="eyebrow">Mini Chess</p>
        <h1>{title}</h1>
      </div>
      <div className="status-card">
        {playerRole && <span>{playerRole}</span>}
        <strong>{statusLabel(status)}</strong>
        <span>{turn === 'white' ? 'White' : 'Black'} to move</span>
      </div>
    </header>
  );
}
