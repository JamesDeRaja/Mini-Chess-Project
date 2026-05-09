import { Bot, Link as LinkIcon, Moon, Sparkles, SunMedium } from 'lucide-react';
import type { MatchMode } from './BotGamePage';

type HomePageProps = {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onStartBot: (matchMode: MatchMode) => void;
  onInvite: () => void;
};

const matchModes: Array<{ mode: MatchMode; title: string; description: string }> = [
  { mode: 'single', title: 'One Match', description: 'A fast single-board game.' },
  { mode: 'best-of-3', title: 'Best 2 / 3', description: 'First side to two wins takes the set.' },
  { mode: 'best-of-5', title: 'Best 3 / 5', description: 'A longer set with adaptive bot pressure.' },
];

export function HomePage({ theme, onToggleTheme, onStartBot, onInvite }: HomePageProps) {
  return (
    <main className="home-page">
      <button className="theme-toggle floating-theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />}
        {theme === 'dark' ? 'Light' : 'Dark'} mode
      </button>
      <section className="hero-card">
        <p className="eyebrow">Mini Chess</p>
        <h1>Play smarter short chess.</h1>
        <p>
          Choose a match format, drag pieces like a modern chess board, and play through adaptive bot rounds on a
          chess.com-inspired board.
        </p>
        <div className="match-mode-grid">
          {matchModes.map((matchMode) => (
            <button key={matchMode.mode} className="mode-card" onClick={() => onStartBot(matchMode.mode)}>
              <Sparkles size={18} />
              <strong>{matchMode.title}</strong>
              <span>{matchMode.description}</span>
            </button>
          ))}
        </div>
        <div className="home-actions">
          <button className="primary-action" onClick={() => onStartBot('single')}>
            <Bot size={20} /> Quick Bot Game
          </button>
          <button className="secondary-action" onClick={onInvite}>
            <LinkIcon size={20} /> Invite People
          </button>
        </div>
      </section>
    </main>
  );
}
