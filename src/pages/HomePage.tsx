import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bot, CalendarDays, ChevronLeft, ChevronRight, Link as LinkIcon, Moon, Search, Shuffle, SunMedium, Users, X } from 'lucide-react';
import { getDailyAIProgress, getDailyAIStatusLine, resetDailyAIProgressIfNeeded } from '../game/dailyAIProgress.js';
import { backRankCodeFromSeed, getDailySeed, getUtcDateKey, isValidBackRankCode, resolveBackRankCode } from '../game/seed.js';
import type { MatchmakingResponse } from '../multiplayer/gameApi.js';

type HomePageProps = {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onStartBot: (dateKey?: string) => void;
  onStartSeededBot: (seed: string) => void;
  onInvite: () => void;
  onDaily: (dateKey?: string) => void;
  onSeeded: (seed: string) => void;
  onFindMatch: (seed: string, backRankCode: string) => Promise<MatchmakingResponse>;
  onCancelFindMatch: (queueId?: string) => Promise<void>;
};

type ModalName = 'date' | 'custom' | 'rules' | 'matchmaking' | null;
type MatchmakingState =
  | { status: 'idle' }
  | { status: 'finding'; queueId?: string }
  | { status: 'timeout'; queueId?: string }
  | { status: 'failed'; message: string };

function addUtcDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function randomPastDate(todayKey: string): string {
  const daysBack = Math.floor(Math.random() * 60) + 1;
  return addUtcDays(todayKey, -daysBack);
}

function spacedCode(backRankCode: string): string {
  return backRankCode.split('').join(' ');
}

function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function getMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function getDisplayDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function shiftMonth(monthKey: string, offset: number): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function getCalendarCells(monthKey: string): Array<{ dateKey: string; day: number } | null> {
  const firstDay = new Date(`${monthKey}-01T00:00:00.000Z`);
  const daysInMonth = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0)).getUTCDate();
  const leadingBlanks = firstDay.getUTCDay();
  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, dayIndex) => {
      const day = dayIndex + 1;
      return { dateKey: `${monthKey}-${String(day).padStart(2, '0')}`, day };
    }),
  ];
}

export function HomePage({
  theme,
  onToggleTheme,
  onStartBot,
  onStartSeededBot,
  onInvite,
  onDaily,
  onSeeded,
  onFindMatch,
  onCancelFindMatch,
}: HomePageProps) {
  const seedInputId = 'custom-seed-input';
  const [todayKey, setTodayKey] = useState(() => getUtcDateKey());
  const yesterdayKey = useMemo(() => addUtcDays(todayKey, -1), [todayKey]);
  const [calendarDateKey, setCalendarDateKey] = useState(todayKey);
  const [calendarMonthKey, setCalendarMonthKey] = useState(monthKeyFromDateKey(todayKey));
  const [dateError, setDateError] = useState<string | null>(null);
  const [customSeed, setCustomSeed] = useState('');
  const [modal, setModal] = useState<ModalName>(null);
  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({ status: 'idle' });
  const [dailyAIProgress, setDailyAIProgress] = useState(() => resetDailyAIProgressIfNeeded(todayKey));
  const [matchTarget, setMatchTarget] = useState({ seed: getDailySeed(todayKey), backRankCode: backRankCodeFromSeed(getDailySeed(todayKey)) });
  const dailySeed = getDailySeed(todayKey);
  const dailyBackRankCode = backRankCodeFromSeed(dailySeed);
  const selectedDailySeed = getDailySeed(calendarDateKey);
  const selectedDailyBackRankCode = backRankCodeFromSeed(selectedDailySeed);
  const calendarCells = getCalendarCells(calendarMonthKey);
  const canGoNextMonth = shiftMonth(calendarMonthKey, 1) <= monthKeyFromDateKey(todayKey);
  const blackBackRankCode = [...dailyBackRankCode].reverse().join('');
  const customSeedValue = customSeed.trim();
  const customSeedLooksLikeCode = /^[BRKNQ]+$/i.test(customSeedValue);
  const customSeedError = customSeedValue && customSeedLooksLikeCode && !isValidBackRankCode(customSeedValue)
    ? 'Direct codes must contain exactly one B, R, K, N, and Q.'
    : null;
  const customBackRankCode = customSeedValue && !customSeedError ? resolveBackRankCode(customSeedValue) : null;
  const dailyAIStatusLine = getDailyAIStatusLine(dailyAIProgress);

  useEffect(() => {
    const dateRefreshId = window.setInterval(() => setTodayKey(getUtcDateKey()), 60000);
    return () => window.clearInterval(dateRefreshId);
  }, []);

  useEffect(() => {
    function refreshDailyAIProgress() {
      setDailyAIProgress(getDailyAIProgress(todayKey));
    }

    refreshDailyAIProgress();
    window.addEventListener('focus', refreshDailyAIProgress);
    window.addEventListener('storage', refreshDailyAIProgress);
    return () => {
      window.removeEventListener('focus', refreshDailyAIProgress);
      window.removeEventListener('storage', refreshDailyAIProgress);
    };
  }, [todayKey]);

  function handleDateChange(nextDateKey: string) {
    if (nextDateKey > todayKey) {
      setDateError('Future daily seeds are locked.');
      return;
    }
    const safeDateKey = nextDateKey || todayKey;
    setDateError(null);
    setCalendarDateKey(safeDateKey);
    setCalendarMonthKey(monthKeyFromDateKey(safeDateKey));
  }

  function goToPreviousMonth() {
    setCalendarMonthKey((currentMonthKey) => shiftMonth(currentMonthKey, -1));
  }

  function goToNextMonth() {
    setCalendarMonthKey((currentMonthKey) => {
      const nextMonthKey = shiftMonth(currentMonthKey, 1);
      return nextMonthKey <= monthKeyFromDateKey(todayKey) ? nextMonthKey : currentMonthKey;
    });
  }

  async function requestMatchFor(seed: string, backRankCode: string) {
    setMatchTarget({ seed, backRankCode });
    setModal('matchmaking');
    setMatchmaking((current) => ({ status: 'finding', queueId: current.status === 'finding' ? current.queueId : undefined }));
    try {
      const result = await onFindMatch(seed, backRankCode);
      if (result.status === 'waiting') setMatchmaking({ status: 'finding', queueId: result.queueId });
      if (result.status === 'unavailable') setMatchmaking({ status: 'failed', message: result.message });
    } catch (error) {
      setMatchmaking({ status: 'failed', message: error instanceof Error ? error.message : 'Unable to start matchmaking.' });
    }
  }

  async function cancelMatch() {
    if (matchmaking.status === 'finding' || matchmaking.status === 'timeout') await onCancelFindMatch(matchmaking.queueId);
    setMatchmaking({ status: 'idle' });
    setModal(null);
  }

  function playAiForSeed(seed: string) {
    if (seed.startsWith('daily-')) onStartBot(seed.replace('daily-', ''));
    else onStartSeededBot(seed);
  }

  async function switchFromMatchmaking(nextAction: () => void) {
    if (matchmaking.status === 'finding' || matchmaking.status === 'timeout') await onCancelFindMatch(matchmaking.queueId);
    setMatchmaking({ status: 'idle' });
    setModal(null);
    nextAction();
  }

  useEffect(() => {
    if (matchmaking.status !== 'finding') return;

    const pollId = window.setInterval(() => {
      onFindMatch(matchTarget.seed, matchTarget.backRankCode)
        .then((result) => {
          if (result.status === 'waiting') setMatchmaking((current) => (current.status === 'finding' ? { ...current, queueId: result.queueId } : current));
          if (result.status === 'unavailable') setMatchmaking({ status: 'failed', message: result.message });
        })
        .catch((error: Error) => setMatchmaking({ status: 'failed', message: error.message }));
    }, 5000);

    const timeoutId = window.setTimeout(() => {
      setMatchmaking((current) => (current.status === 'finding' ? { status: 'timeout', queueId: current.queueId } : current));
    }, 55000);

    return () => {
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
    };
  }, [matchTarget.backRankCode, matchTarget.seed, matchmaking.status, onFindMatch]);

  return (
    <main className="home-page">
      <button type="button" className="theme-toggle floating-theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />}
        {theme === 'dark' ? 'Light' : 'Dark'} mode
      </button>

      <section className="hero-card shuffle-hero-card">
        <div className="hero-copy">
          <div className="brand-badge" aria-hidden="true"><img src="/Icon.png" alt="" draggable={false} /></div>
          <p className="eyebrow">Pocket Shuffle Chess</p>
          <h1 className="home-title"><span>Pocket</span><span>Shuffle</span><span>Chess</span></h1>
          <p className="hero-subtitle">Fast chess. New opening every time.</p>

          <div className="daily-summary-card">
            <span>Today’s Daily</span>
            <strong>{dailySeed} · {dailyBackRankCode}</strong>
          </div>

          <div className="opponent-actions" aria-label="Choose opponent">
            <button type="button" className="opponent-card primary-action daily-ai-card" onClick={() => onStartBot(todayKey)}>
              <span className={dailyAIProgress.magicStarUnlocked ? 'daily-ai-stars magic-star-active' : 'daily-ai-stars'} aria-label={dailyAIProgress.magicStarUnlocked ? 'Magic star unlocked' : `${dailyAIProgress.stars} of 3 daily AI stars earned`}>
                {dailyAIProgress.magicStarUnlocked ? <span aria-hidden="true">✦</span> : [0, 1, 2].map((starIndex) => <span key={starIndex} aria-hidden="true">{starIndex < dailyAIProgress.stars ? '★' : '☆'}</span>)}
              </span>
              <Bot size={22} />
              <span><strong>Play AI</strong><small>Instant daily game</small><small className="daily-ai-status">{dailyAIStatusLine}</small></span>
            </button>
            <button type="button" className="opponent-card primary-action" onClick={() => requestMatchFor(dailySeed, dailyBackRankCode)}>
              <Search size={22} />
              <span><strong>Find Match</strong><small>Match today's seed</small></span>
            </button>
            <button type="button" className="opponent-card primary-action" onClick={onInvite}>
              <LinkIcon size={22} />
              <span><strong>Invite Friend</strong><small>Share a challenge link</small></span>
            </button>
          </div>

          <div className="secondary-links" aria-label="More options">
            <button type="button" onClick={() => setModal('date')}><CalendarDays size={16} /> Choose Date</button>
            <button type="button" onClick={() => setModal('custom')}><Shuffle size={16} /> Custom Seed</button>
            <button type="button" onClick={() => setModal('rules')}><BookOpen size={16} /> How It Works</button>
          </div>
        </div>

        <aside className="setup-preview-card" aria-label="Today's setup preview">
          <span className="decor-dot decor-dot-one" aria-hidden="true" />
          <span className="decor-dot decor-dot-two" aria-hidden="true" />
          <span className="decor-spark decor-spark-one" aria-hidden="true">✦</span>
          <span className="decor-spark decor-spark-two" aria-hidden="true">✦</span>
          <span className="decor-heart" aria-hidden="true">♥</span>
          <p className="eyebrow">Today’s Setup</p>
          <div className="mini-board-preview" aria-hidden="true">
            {blackBackRankCode.split('').map((piece, index) => <span key={`black-${piece}-${index}`} className="preview-piece preview-piece-black">{piece}</span>)}
            {Array.from({ length: 20 }, (_, index) => <span key={`empty-${index}`} className="preview-empty" />)}
            {dailyBackRankCode.split('').map((piece, index) => <span key={`white-${piece}-${index}`} className="preview-piece preview-piece-white">{piece}</span>)}
          </div>
          <div className="setup-code-stack">
            <small>Daily shuffle</small>
            <span>White: {spacedCode(dailyBackRankCode)}</span>
            <span>Black: {spacedCode(blackBackRankCode)}</span>
            <strong>{dailyBackRankCode}</strong>
          </div>
        </aside>
      </section>

      {modal === 'date' && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="date-modal-title">
          <div className="confirm-card utility-modal">
            <button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close date picker"><X size={18} /></button>
            <p className="eyebrow">Daily Seed Calendar</p>
            <h2 id="date-modal-title">Choose a daily setup</h2>
            <div className="quick-chip-row">
              <button type="button" onClick={() => handleDateChange(todayKey)}>Today</button>
              <button type="button" onClick={() => handleDateChange(yesterdayKey)}>Yesterday</button>
              <button type="button" onClick={() => handleDateChange(randomPastDate(todayKey))}>Random Past Daily</button>
            </div>
            <div className="selected-daily-panel">
              <span>Selected Daily</span>
              <strong>{getDisplayDate(calendarDateKey)}</strong>
              <p>{selectedDailySeed} · {selectedDailyBackRankCode}</p>
            </div>
            <div className="daily-calendar-panel" aria-label="Daily seed calendar">
              <div className="daily-calendar-header">
                <button type="button" onClick={goToPreviousMonth} aria-label="Previous month"><ChevronLeft size={18} /></button>
                <strong>{getMonthLabel(calendarMonthKey)}</strong>
                <button type="button" onClick={goToNextMonth} disabled={!canGoNextMonth} aria-label="Next month"><ChevronRight size={18} /></button>
              </div>
              <div className="daily-calendar-weekdays" aria-hidden="true">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
              </div>
              <div className="daily-calendar-grid">
                {calendarCells.map((cell, index) => {
                  if (!cell) return <span key={`blank-${index}`} className="daily-calendar-blank" />;
                  const isFuture = cell.dateKey > todayKey;
                  const isSelected = cell.dateKey === calendarDateKey;
                  const isToday = cell.dateKey === todayKey;
                  return (
                    <button
                      type="button"
                      key={cell.dateKey}
                      className={[
                        'daily-calendar-day',
                        isSelected ? 'selected-day' : '',
                        isToday ? 'today-day' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleDateChange(cell.dateKey)}
                      disabled={isFuture}
                      aria-pressed={isSelected}
                      aria-label={`${getDisplayDate(cell.dateKey)}${isFuture ? ' locked' : ''}`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
              {dateError && <p className="error-message inline-message">{dateError}</p>}
            </div>
            <div className="panel-actions centered-actions">
              <button type="button" onClick={() => onStartBot(calendarDateKey)}>Play AI</button>
              <button type="button" onClick={() => requestMatchFor(selectedDailySeed, selectedDailyBackRankCode)}>Find Match</button>
              <button type="button" onClick={() => onDaily(calendarDateKey)}>Invite Friend</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'custom' && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="custom-modal-title">
          <form
            className="confirm-card utility-modal"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const seed = String(formData.get('seed') ?? '').trim();
              if (seed && customBackRankCode) onSeeded(seed);
            }}
          >
            <button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close custom seed"><X size={18} /></button>
            <p className="eyebrow">Custom Seed</p>
            <h2 id="custom-modal-title">Create a challenge</h2>
            <label htmlFor={seedInputId}>Seed phrase or direct back-rank code</label>
            <input
              id={seedInputId}
              name="seed"
              placeholder="boss-battle-1 or BRKNQ"
              maxLength={48}
              value={customSeed}
              onChange={(event) => setCustomSeed(event.target.value)}
              autoFocus
            />
            <p>Use a direct code like BRKNQ or a text seed like boss-battle-1.</p>
            {customSeedError && <p className="error-message inline-message">{customSeedError}</p>}
            {customBackRankCode && <p className="seed-readout"><span>Generated back rank</span><span>{customBackRankCode}</span></p>}
            <div className="panel-actions centered-actions">
              <button type="button" disabled={!customBackRankCode} onClick={() => customSeedValue && onStartSeededBot(customSeedValue)}>Play AI</button>
              <button type="button" disabled={!customBackRankCode} onClick={() => customSeedValue && customBackRankCode && requestMatchFor(customSeedValue, customBackRankCode)}>Find Match</button>
              <button type="submit" disabled={!customBackRankCode}>Invite Friend</button>
            </div>
          </form>
        </div>
      )}

      {modal === 'rules' && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rules-modal-title">
          <div className="confirm-card utility-modal rules-modal">
            <button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close rules"><X size={18} /></button>
            <p className="eyebrow">How It Works</p>
            <h2 id="rules-modal-title">Pocket Shuffle Chess rules</h2>
            <section className="rules-section">
              <h3>Rules</h3>
              <p>Pocket Shuffle Chess is played on a 5x6 board. Each side has a king, queen, rook, bishop, knight, and five pawns.</p>
              <p>White’s back rank is shuffled. Black’s back rank is mirrored.</p>
              <p>Normal chess movement applies, except:</p>
              <ul>
                <li>No castling.</li>
                <li>No en passant.</li>
                <li>Pawns move one square.</li>
                <li>Pawns auto-promote to queen in V1.</li>
                <li>Checkmate wins.</li>
              </ul>
            </section>
            <section className="rules-section">
              <h3>Scoring</h3>
              <ul>
                <li>Checkmate win: +100.</li>
                <li>Faster wins get bonus points.</li>
                <li>Captures add points.</li>
                <li>Mirror Match later lets players play both sides of the same seed.</li>
              </ul>
            </section>
          </div>
        </div>
      )}

      {modal === 'matchmaking' && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="matchmaking-modal-title">
          <div className="confirm-card utility-modal matchmaking-modal">
            <button type="button" className="modal-close" onClick={cancelMatch} aria-label="Cancel matchmaking"><X size={18} /></button>
            <p className="eyebrow">Find Match</p>
            <h2 id="matchmaking-modal-title">{matchmaking.status === 'timeout' ? 'No opponent found yet.' : matchmaking.status === 'failed' ? 'Matchmaking unavailable' : 'Finding opponent...'}</h2>
            <p>Daily seed: <strong>{matchTarget.seed}</strong></p>
            <p>Back rank: {matchTarget.backRankCode}</p>
            {matchmaking.status === 'failed' && <p className="error-message inline-message">{matchmaking.message}</p>}
            {matchmaking.status === 'timeout' && <p>No one matched within about a minute. You can keep waiting or send an invite link.</p>}
            <div className="panel-actions centered-actions">
              {matchmaking.status === 'timeout' && <button type="button" onClick={() => requestMatchFor(matchTarget.seed, matchTarget.backRankCode)}><Users size={18} /> Keep Waiting</button>}
              <button type="button" onClick={() => switchFromMatchmaking(onInvite)}><LinkIcon size={18} /> Invite Friend Instead</button>
              <button type="button" onClick={() => switchFromMatchmaking(() => playAiForSeed(matchTarget.seed))}><Bot size={18} /> Play AI While Waiting</button>
              <button type="button" onClick={cancelMatch}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
