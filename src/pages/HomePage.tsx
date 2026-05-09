import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Bot, CalendarDays, Link as LinkIcon, Moon, Search, Shuffle, SunMedium, Users, X } from 'lucide-react';
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
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const todayKey = useMemo(() => getUtcDateKey(), []);
  const yesterdayKey = useMemo(() => addUtcDays(todayKey, -1), [todayKey]);
  const [calendarDateKey, setCalendarDateKey] = useState(todayKey);
  const [dateError, setDateError] = useState<string | null>(null);
  const [customSeed, setCustomSeed] = useState('');
  const [modal, setModal] = useState<ModalName>(null);
  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({ status: 'idle' });
  const [matchTarget, setMatchTarget] = useState({ seed: getDailySeed(todayKey), backRankCode: backRankCodeFromSeed(getDailySeed(todayKey)) });
  const dailySeed = getDailySeed(todayKey);
  const dailyBackRankCode = backRankCodeFromSeed(dailySeed);
  const selectedDailySeed = getDailySeed(calendarDateKey);
  const selectedDailyBackRankCode = backRankCodeFromSeed(selectedDailySeed);
  const blackBackRankCode = [...dailyBackRankCode].reverse().join('');
  const customSeedValue = customSeed.trim();
  const customSeedLooksLikeCode = /^[BRKNQ]+$/i.test(customSeedValue);
  const customSeedError = customSeedValue && customSeedLooksLikeCode && !isValidBackRankCode(customSeedValue)
    ? 'Direct codes must contain exactly one B, R, K, N, and Q.'
    : null;
  const customBackRankCode = customSeedValue && !customSeedError ? resolveBackRankCode(customSeedValue) : null;

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') input.showPicker();
    else input.focus();
  }

  function handleDateChange(nextDateKey: string) {
    if (nextDateKey > todayKey) {
      setDateError('Future daily seeds are locked.');
      setCalendarDateKey(todayKey);
      return;
    }
    setDateError(null);
    setCalendarDateKey(nextDateKey || todayKey);
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
          <p className="eyebrow">Pocket Shuffle Chess</p>
          <h1>Fast chess without memorized openings.</h1>
          <p className="hero-subtitle">Today’s setup is shared by everyone. Play AI, find a match, or invite a friend to battle the same daily seed.</p>

          <div className="daily-summary-card">
            <span>Today’s Daily</span>
            <strong>{dailySeed} · {dailyBackRankCode}</strong>
          </div>

          <div className="opponent-actions" aria-label="Choose opponent">
            <button type="button" className="opponent-card primary-action" onClick={() => onStartBot(todayKey)}>
              <Bot size={22} />
              <span><strong>Play AI</strong><small>Instant daily game</small></span>
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
          <p className="eyebrow">Today’s Setup</p>
          <span className="preview-side-label">Black top</span>
          <div className="mini-board-preview" aria-hidden="true">
            {blackBackRankCode.split('').map((piece, index) => <span key={`black-${piece}-${index}`}>{piece}</span>)}
            {Array.from({ length: 20 }, (_, index) => <span key={`empty-${index}`} className="preview-empty" />)}
            {dailyBackRankCode.split('').map((piece, index) => <span key={`white-${piece}-${index}`}>{piece}</span>)}
          </div>
          <span className="preview-side-label preview-white-label">White bottom</span>
          <div className="setup-code-stack">
            <small>5x6 daily tactical chess</small>
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
            <div className="date-input-wrap">
              <input
                ref={dateInputRef}
                type="date"
                value={calendarDateKey}
                max={todayKey}
                onChange={(event) => handleDateChange(event.target.value || todayKey)}
                className="date-input"
                aria-label="Daily seed date"
              />
              <button type="button" className="date-picker-button" onClick={openDatePicker} aria-label="Open daily seed calendar">
                <CalendarDays size={19} />
              </button>
            </div>
            {dateError && <p className="error-message inline-message">{dateError}</p>}
            <p className="seed-readout"><span>{selectedDailySeed}</span><span>Back rank: {selectedDailyBackRankCode}</span></p>
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
