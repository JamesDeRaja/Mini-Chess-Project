import { useMemo, useState } from 'react';
import { Bot, CalendarDays, Link as LinkIcon, Moon, Sparkles, SunMedium } from 'lucide-react';
import { backRankCodeFromSeed, getDailySeed, getUtcDateKey } from '../game/seed.js';
import type { MatchMode } from './BotGamePage.js';

type HomePageProps = {
  theme: 'light' | 'dark';
  selectedMatchMode: MatchMode;
  onSelectMatchMode: (matchMode: MatchMode) => void;
  onToggleTheme: () => void;
  onStartBot: (matchMode: MatchMode) => void;
  onInvite: (matchMode: MatchMode) => void;
  onDaily: (matchMode: MatchMode, dateKey?: string) => void;
  onSeeded: (matchMode: MatchMode, seed: string) => void;
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
  onDaily,
  onSeeded,
}: HomePageProps) {
  const seedInputId = 'custom-seed-input';
  const todayKey = useMemo(() => getUtcDateKey(), []);
  const [calendarDateKey, setCalendarDateKey] = useState(todayKey);
  const selectedDailySeed = getDailySeed(calendarDateKey);
  const selectedDailyBackRankCode = backRankCodeFromSeed(selectedDailySeed);

  return (
    <main className="home-page">
      <button type="button" className="theme-toggle floating-theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />}
        {theme === 'dark' ? 'Light' : 'Dark'} mode
      </button>
      <section className="hero-card">
        <p className="eyebrow">Mini Chess Daily Seed</p>
        <h1>Play today's shared setup.</h1>
        <p>
          Mini Chess is daily-seeded by default. Play AI or create an invite link and both games use today's same
          back-rank setup. Use custom seeds only when you want a specific challenge.
        </p>
        <div className="match-mode-grid" role="radiogroup" aria-label="Match format">
          {matchModes.map((matchMode) => (
            <button
              type="button"
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
          <button type="button" className="primary-action" onClick={() => onStartBot(selectedMatchMode)}>
            <Bot size={20} /> Play AI
          </button>
          <button type="button" className="primary-action" onClick={() => onInvite(selectedMatchMode)}>
            <LinkIcon size={20} /> Invite Link
          </button>
        </div>

        <div className="seed-tools-grid">
          <section className="seed-tool-card">
            <div className="seed-tool-heading">
              <CalendarDays size={18} />
              <strong>Daily seed calendar</strong>
            </div>
            <p>Pick today or a past date to reveal its seed. Future dates are locked to keep daily play fair.</p>
            <input
              type="date"
              value={calendarDateKey}
              max={todayKey}
              onChange={(event) => {
                const nextDateKey = event.target.value || todayKey;
                setCalendarDateKey(nextDateKey > todayKey ? todayKey : nextDateKey);
              }}
              aria-label="Daily seed date"
            />
            <p className="seed-readout">
              <span>{selectedDailySeed}</span>
              <span>Back rank: {selectedDailyBackRankCode}</span>
            </p>
            <button type="button" className="secondary-action" onClick={() => onDaily(selectedMatchMode, calendarDateKey)}>
              Create invite for this day
            </button>
          </section>

          <form
            className="seed-tool-card seed-form"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const seed = String(formData.get('seed') ?? '');
              if (seed.trim()) onSeeded(selectedMatchMode, seed);
            }}
          >
            <label htmlFor={seedInputId}>Create challenge with custom seed</label>
            <p>Use a phrase like boss-battle-1 or a direct code like BQKRN.</p>
            <div className="seed-form-row">
              <input id={seedInputId} name="seed" placeholder="boss-battle-1 or BQKRN" maxLength={48} />
              <button className="secondary-action" type="submit">Create challenge</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
