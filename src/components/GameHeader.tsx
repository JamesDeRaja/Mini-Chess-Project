import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getSoundSettings, preloadSounds, playSound, setSoundEnabled } from '../audio/audioManager';
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
    case 'waiting':   return 'Waiting for opponent';
    case 'active':    return 'Active';
    case 'white_won': return 'White won';
    case 'black_won': return 'Black won';
    case 'draw':      return 'Draw';
  }
}

export function GameHeader({ title, turn, status, playerRole, details, onTitleClick }: GameHeaderProps) {
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    preloadSounds();
    return getSoundSettings().enabled;
  });

  useEffect(() => {
    preloadSounds();
    setSoundOn(getSoundSettings().enabled);
  }, []);

  function toggleSound() {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playSound('button');
  }

  return (
    <header className="game-header">
      <div>
        <button className="title-link eyebrow" onClick={onTitleClick} disabled={!onTitleClick} aria-label="Go to home">
          Mini Chess
        </button>
        <h1>{title}</h1>
        {details && <p className="game-details">{details}</p>}
      </div>
      <div className="header-actions">
        <button
          className="icon-action sound-toggle"
          onClick={toggleSound}
          aria-label={soundOn ? 'Mute sounds' : 'Unmute sounds'}
          title={soundOn ? 'Sound on' : 'Sound off'}
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span className="sound-label">{soundOn ? 'Sound' : 'Muted'}</span>
        </button>
        <div className="status-card">
          {playerRole && <span>{playerRole}</span>}
          <strong>{statusLabel(status)}</strong>
          <span>{turn === 'white' ? 'White' : 'Black'} to move</span>
        </div>
      </div>
    </header>
  );
}
