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

function roleColor(playerRole?: string): Color | null {
  const normalizedRole = playerRole?.toLowerCase() ?? '';
  if (normalizedRole.includes('white')) return 'white';
  if (normalizedRole.includes('black')) return 'black';
  return null;
}

function isGameOver(status: GameStatus): boolean {
  return status === 'white_won' || status === 'black_won' || status === 'draw';
}

function statusLabel(status: GameStatus, isOwnTurn: boolean): string {
  if (isGameOver(status)) return 'Game Over';
  if (status === 'waiting') return 'Waiting';
  return isOwnTurn ? 'Active' : 'Waiting';
}

function getStatusAvatarColor(status: GameStatus, turn: Color, playerColor: Color | null): Color {
  if (status === 'white_won') return 'white';
  if (status === 'black_won') return 'black';
  if (status === 'draw') return playerColor ?? 'white';
  return turn;
}

export function GameHeader({ title, turn, status, playerRole, details, onTitleClick, statusLabelOverride, turnLabelOverride }: GameHeaderProps) {
  const playerColor = roleColor(playerRole);
  const isOwnTurn = status === 'active' && playerColor === turn;
  const dotState = isGameOver(status) || !playerColor ? 'neutral' : isOwnTurn ? 'active' : 'waiting';
  const avatarColor = getStatusAvatarColor(status, turn, playerColor);
  const avatarLabel = status === 'draw'
    ? 'Draw status avatar'
    : status === 'white_won' || status === 'black_won'
      ? `${avatarColor === 'white' ? 'White' : 'Black'} winner avatar`
      : `${avatarColor === 'white' ? 'White' : 'Black'} to move avatar`;

  return (
    <header className="game-header">
      <div className="game-title-block">
        <button className="title-link brand-lockup" onClick={onTitleClick} disabled={!onTitleClick} aria-label="Go to home">
          <img className="brand-icon" src="/Icon.png" alt="" draggable={false} />
          <span>Pocket Shuffle Chess</span>
        </button>
        <h1>{title}</h1>
        {details && <p className="game-details">{details}</p>}
      </div>
      <div className="status-card" aria-live="polite">
        <span className={`status-corner-dot status-dot-${dotState}`} aria-label={`${dotState} status`} />
        <div className={`status-avatar ${avatarColor === 'black' ? 'black-avatar' : 'white-avatar'}`} role="img" aria-label={avatarLabel}>
          <img className="status-piece-img" src={`/pieces/${avatarColor}-pawn.png`} alt="" draggable={false} />
        </div>
        <div className="status-copy">
          {playerRole && <span>{playerRole}</span>}
          <strong className={`status-word status-word-${dotState}`}>{statusLabelOverride ?? statusLabel(status, isOwnTurn)}</strong>
          <span className="turn-line">{turnLabelOverride ?? `${turn === 'white' ? 'White' : 'Black'} to move`}</span>
        </div>
      </div>
    </header>
  );
}
