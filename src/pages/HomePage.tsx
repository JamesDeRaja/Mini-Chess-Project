import { Bot, Link as LinkIcon, Moon, Sparkles, SunMedium } from 'lucide-react';
import type { MatchMode } from './BotGamePage';

type HomePageProps = {
  theme: 'light' | 'dark';
  selectedMatchMode: MatchMode;
  onSelectMatchMode: (matchMode: MatchMode) => void;
  onToggleTheme: () => void;
  onStartBot: (matchMode: MatchMode) => void;
  onInvite: (matchMode: MatchMode) => void;
};

const matchModes: Array<{ mode: MatchMode; title: string; description: string }> = [
  { mode: 'single', title: 'One Match', description: 'A fast single-board game.' },
  { mode: 'best-of-3', title: 'Best 2 / 3', description: 'First side to two wins takes the set.' },
  { mode: 'best-of-5', title: 'Best 3 / 5', description: 'A longer set with adaptive bot pressure.' },
];

export function HomePage({
  theme,
  selectedMatchMode,
  onSelectMatchMode,
  onToggleTheme,
  onStartBot,
  onInvite,
}: HomePageProps) {
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
          Select a match format once, then use it for either the AI game or an invite game. One Match is selected by
          default.
        </p>
        <div className="match-mode-grid" role="radiogroup" aria-label="Match format">
          {matchModes.map((matchMode) => (
            <button
              key={matchMode.mode}
              className={matchMode.mode === selectedMatchMode ? 'mode-card selected-mode-card' : 'mode-card'}
              onClick={() => onSelectMatchMode(matchMode.mode)}
              role="radio"
              aria-checked={matchMode.mode === selectedMatchMode}
            >
              <Sparkles size={18} />
              <strong>{matchMode.title}</strong>
              <span>{matchMode.description}</span>
            </button>
          ))}
        </div>
        <div className="home-actions two-main-actions">
          <button className="primary-action" onClick={() => onStartBot(selectedMatchMode)}>
            <Bot size={20} /> Play AI
          </button>
          <button className="secondary-action" onClick={() => onInvite(selectedMatchMode)}>
            <LinkIcon size={20} /> Invite People
          </button>
        </div>
      </section>
    </main>
  );
}
