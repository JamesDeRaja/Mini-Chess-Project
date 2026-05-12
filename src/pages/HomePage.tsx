import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Bot, CalendarDays, ChevronLeft, ChevronRight, Copy, Link as LinkIcon, MoreHorizontal, Shuffle, Trophy, Users, X, Zap } from 'lucide-react';
import { getDailyAIProgress, getDailyAIStatusLine, resetDailyAIProgressIfNeeded, type DailyAIProgress } from '../game/dailyAIProgress.js';
import { dailyBackRankCodeFromSeed, getDailySeed, getUtcDateKey, validateSeedInput } from '../game/seed.js';
import { getCurrentShuffleMode, getPageSessionRandomGameSeed, resolveSeedSourceForMode, setCurrentShuffleMode, type ShuffleMode } from '../game/shuffleMode.js';
import { HomepageInteractiveBoard } from '../home/interactiveBoard/HomepageInteractiveBoard.js';
import type { MatchmakingResponse } from '../multiplayer/gameApi.js';
import { trackEvent } from '../app/analytics.js';
import { getLocalBestScoreForSeedMode, type CompletedScoreEntry } from '../game/localScoreHistory.js';
import { getShareUrl } from '../app/seo.js';
import { fetchLeaderboard, fetchScoreboard, type LeaderboardEntry, type LeaderboardScope } from '../multiplayer/scoreApi.js';

type HomePageProps = {
  initialModal?: Exclude<ModalName, null>;
  onStartBot: (dateKey?: string) => void;
  onStartSeededBot: (seed: string, backRankCode?: string) => void;
  onInvite: () => void;
  onDaily: (dateKey?: string) => void;
  onSeeded: (seed: string, backRankCode?: string) => void;
  onFindMatch: (seed: string, backRankCode: string) => Promise<MatchmakingResponse>;
  onCancelFindMatch: (queueId?: string) => Promise<void>;
};

type ModalName = 'date' | 'custom' | 'rules' | 'more' | 'matchmaking' | null;
type LeaderboardFeedItem = { id: string; displayName: string; score: number; kind: 'rank' | 'new-score'; rank?: number };
type LeaderboardView = { scope: LeaderboardScope; label: string; title: string; description: string };

type MatchmakingState =
  | { status: 'idle' }
  | { status: 'finding'; queueId?: string }
  | { status: 'timeout'; queueId?: string }
  | { status: 'failed'; message: string };


const dailyTauntsWithoutScore = [
  'Today’s setup looked scary for about six seconds. Your move.',
  'I solved today’s tiny chess problem. Try not to trip over the 5x6 board.',
  'The pieces were shuffled. My confidence was not. Beat this daily if you can.',
  'No opening book, no excuses, just you and whatever plan survives move one.',
  'I handled today’s chaos. Please bring a better excuse than “weird setup.”',
];

const dailyTauntsWithScore = [
  (score: number) => `I posted ${score} today. Surely you can beat that, right? Right?`,
  (score: number) => `My daily score is ${score}. Consider this a very polite threat.`,
  (score: number) => `${score} is the number to beat today. The board is small; your excuses should be smaller.`,
  (score: number) => `I put ${score} on today’s seed. Come ruin my leaderboard mood.`,
  (score: number) => `Today’s target is ${score}. If you beat it, I will pretend the shuffle was unfair.`,
];

const randomTaunts = [
  'I survived this random shuffle. Your turn to discover what “random” did to your dignity.',
  'This setup is nonsense, which makes losing to it even funnier.',
  'I found a way through this shuffle. Try not to donate your queen immediately.',
  'Random setup, very real bragging rights. Come get them.',
  'No memorized openings here. Unfortunately, that means you have to think.',
];

const leaderboardViews: LeaderboardView[] = [
  { scope: 'daily', label: 'Today’s Top 10', title: 'Today’s top 10', description: 'Best scores on today’s shared shuffle.' },
  { scope: 'global', label: 'Global', title: 'Global scores', description: 'Best player scores across every saved game.' },
  { scope: 'global-start-points', label: 'Global start points', title: 'Global start points', description: 'Best scores grouped by starting setup.' },
];

const leaderboardPulseNames = [
  'MateMeteor', 'Charles', 'Caroline', 'LooseKnight', 'Hannah', 'PawnPigeon', 'SkewerSeal', 'Delilah',
  'TinyRook', 'ForkFalcon', 'QueenSneak', 'BlitzBadger', 'TempoToast', 'PocketPirate', 'RookPebble', 'MiniMate',
];

function createPulseScore(index: number): LeaderboardFeedItem {
  const name = leaderboardPulseNames[index % leaderboardPulseNames.length] ?? 'PocketPlayer';
  const score = 52 + ((index * 17) % 48);
  return { id: `pulse-${Date.now()}-${index}`, displayName: name, score, kind: 'new-score' };
}

function leaderboardEntryToFeedItem(entry: LeaderboardEntry, index: number): LeaderboardFeedItem {
  return { id: entry.id, displayName: entry.display_name, score: entry.score, kind: index < 10 ? 'rank' : 'new-score', rank: index + 1 };
}

function getLeaderboardBackRankCode(entry: LeaderboardEntry): string | null {
  return entry.backRankCode ?? (entry as LeaderboardEntry & { back_rank_code?: string | null }).back_rank_code ?? null;
}

function pickTaunt(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)] ?? messages[0] ?? 'Can you beat it?';
}

function getDailyShareTaunt(score?: number): string {
  if (typeof score === 'number') return pickTaunt(dailyTauntsWithScore.map((createMessage) => createMessage(score)));
  return pickTaunt(dailyTauntsWithoutScore);
}

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

function modeFromSeed(seed: string): ShuffleMode {
  return seed.startsWith('daily-') ? 'daily' : 'random';
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


function getDailyAIProgressAria(progress: DailyAIProgress): string {
  if (progress.magicStarUnlocked) return 'rainbow star unlocked';
  if (progress.stars === 0) return 'no stars yet';
  return `${progress.stars} ${progress.stars === 1 ? 'star' : 'stars'} unlocked`;
}

function DailyAIStarMarks({ progress, compact = false }: { progress: DailyAIProgress; compact?: boolean }) {
  if (progress.magicStarUnlocked) {
    return (
      <span className={compact ? 'daily-ai-calendar-rainbow-star' : 'daily-ai-rainbow-star'} aria-hidden="true">
        ★
      </span>
    );
  }

  return (
    <>
      {[0, 1, 2].map((starIndex) => (
        <span key={starIndex} className={starIndex < progress.stars ? 'daily-ai-star-earned' : 'daily-ai-star-empty'} aria-hidden="true">
          ★
        </span>
      ))}
    </>
  );
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
  initialModal,
  onStartBot,
  onStartSeededBot,
  onInvite,
  onDaily,
  onSeeded,
  onFindMatch,
  onCancelFindMatch,
}: HomePageProps) {
  const seedInputId = 'custom-seed-input';
  const seedErrorId = 'custom-seed-error';
  const [todayKey, setTodayKey] = useState(() => getUtcDateKey());
  const yesterdayKey = useMemo(() => addUtcDays(todayKey, -1), [todayKey]);
  const [calendarDateKey, setCalendarDateKey] = useState(todayKey);
  const [calendarMonthKey, setCalendarMonthKey] = useState(monthKeyFromDateKey(todayKey));
  const [dateError, setDateError] = useState<string | null>(null);
  const [customSeed, setCustomSeed] = useState('');
  const [customSeedWasSubmitted, setCustomSeedWasSubmitted] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [modal, setModal] = useState<ModalName>(initialModal ?? null);
  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({ status: 'idle' });
  const [shuffleMode, setShuffleModeState] = useState<ShuffleMode>(() => getCurrentShuffleMode());
  const [randomSetup] = useState(() => resolveSeedSourceForMode('random', { randomSeed: getPageSessionRandomGameSeed() }));
  const [dailyAIProgress, setDailyAIProgress] = useState(() => resetDailyAIProgressIfNeeded(todayKey));
  const [localBestScore, setLocalBestScore] = useState<CompletedScoreEntry | null>(() => getLocalBestScoreForSeedMode(getDailySeed(todayKey), 'daily'));
  const [leaderboardFeed, setLeaderboardFeed] = useState<LeaderboardFeedItem[]>(() => leaderboardPulseNames.slice(0, 3).map((_, index) => createPulseScore(index)));
  const [leaderboardFeedIndex, setLeaderboardFeedIndex] = useState(0);
  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>('daily');
  const [leaderboardDialogRows, setLeaderboardDialogRows] = useState<LeaderboardEntry[]>([]);
  const [matchTarget, setMatchTarget] = useState({ seed: getDailySeed(todayKey), backRankCode: dailyBackRankCodeFromSeed(getDailySeed(todayKey)), mode: 'daily' as ShuffleMode });
  const dailySeed = getDailySeed(todayKey);
  const dailyBackRankCode = dailyBackRankCodeFromSeed(dailySeed);
  const selectedDailySeed = getDailySeed(calendarDateKey);
  const selectedDailyBackRankCode = dailyBackRankCodeFromSeed(selectedDailySeed);
  const calendarCells = getCalendarCells(calendarMonthKey);
  const canGoNextMonth = shiftMonth(calendarMonthKey, 1) <= monthKeyFromDateKey(todayKey);
  const activeSeedSource = shuffleMode === 'daily' ? resolveSeedSourceForMode('daily', { dateKey: todayKey }) : randomSetup;
  const activeBackRankCode = activeSeedSource.backRankCode;
  const activeSeedLabel = shuffleMode === 'daily' ? dailyBackRankCode : `Random • ${activeBackRankCode}`;
  const activeHeaderLabel = shuffleMode === 'daily' ? 'Today’s setup' : 'Random setup';
  const activeHeaderDescription = shuffleMode === 'daily' ? 'Same board for everyone today.' : 'Active until refresh.';
  const blackBackRankCode = [...activeBackRankCode].reverse().join('');
  const customSeedValidation = validateSeedInput(customSeed);
  const customSeedError = customSeedWasSubmitted && !customSeedValidation.ok ? customSeedValidation.error : null;
  const customBackRankCode = customSeedValidation.ok ? customSeedValidation.backRankCode : null;
  const dailyAIStatusLine = getDailyAIStatusLine(dailyAIProgress);
  const activeLeaderboardView = leaderboardViews.find((view) => view.scope === leaderboardScope) ?? leaderboardViews[0];
  const visibleLeaderboardFeed = leaderboardFeed.length > 0
    ? [0, 1, 2].map((offset) => leaderboardFeed[(leaderboardFeedIndex + offset) % leaderboardFeed.length]).filter(Boolean) as LeaderboardFeedItem[]
    : [];

  useEffect(() => {
    const dateRefreshId = window.setInterval(() => setTodayKey(getUtcDateKey()), 60000);
    return () => window.clearInterval(dateRefreshId);
  }, []);

  useEffect(() => {
    function refreshHomeProgress() {
      setDailyAIProgress(getDailyAIProgress(todayKey));
      setLocalBestScore(getLocalBestScoreForSeedMode(getDailySeed(todayKey), 'daily'));
    }

    refreshHomeProgress();
    window.addEventListener('focus', refreshHomeProgress);
    window.addEventListener('storage', refreshHomeProgress);
    return () => {
      window.removeEventListener('focus', refreshHomeProgress);
      window.removeEventListener('storage', refreshHomeProgress);
    };
  }, [todayKey]);

  useEffect(() => {
    fetchLeaderboard(dailySeed, 'daily').then((scores) => {
      const topScores = scores.slice(0, 10);
      setLeaderboardFeed((currentFeed) => {
        const rankedFeed = topScores.map(leaderboardEntryToFeedItem);
        return [...rankedFeed, ...currentFeed.filter((item) => item.kind === 'new-score')].slice(0, 18);
      });
    }).catch(() => setLeaderboardFeed((currentFeed) => currentFeed.filter((item) => item.kind === 'new-score')));
  }, [dailySeed]);

  useEffect(() => {
    const scrollId = window.setInterval(() => {
      setLeaderboardFeedIndex((currentIndex) => (leaderboardFeed.length <= 1 ? 0 : (currentIndex + 1) % leaderboardFeed.length));
    }, 2600);
    return () => window.clearInterval(scrollId);
  }, [leaderboardFeed.length]);

  useEffect(() => {
    let pulseIndex = 0;
    const pulseId = window.setInterval(() => {
      pulseIndex += 1;
      setLeaderboardFeed((currentFeed) => [createPulseScore(pulseIndex), ...currentFeed].slice(0, 18));
      setLeaderboardFeedIndex(0);
    }, 11000);
    return () => window.clearInterval(pulseId);
  }, []);

  useEffect(() => {
    if (!leaderboardDialogOpen) return;
    const loadScores = leaderboardScope === 'daily' ? fetchScoreboard('daily', dailySeed, 'daily') : fetchScoreboard(leaderboardScope);
    loadScores.then((scores) => setLeaderboardDialogRows(scores.slice(0, 25))).catch(() => setLeaderboardDialogRows([]));
  }, [dailySeed, leaderboardDialogOpen, leaderboardScope]);

  useEffect(() => {
    if (!leaderboardDialogOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLeaderboardDialogOpen(false);
    }

    document.body.classList.add('home-modal-open');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('home-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [leaderboardDialogOpen]);

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

  function setShuffleMode(mode: ShuffleMode) {
    setCurrentShuffleMode(mode);
    setShuffleModeState(mode);
    trackEvent('homepage_cta_click', { cta: 'shuffle_mode_toggle', mode });
  }

  async function copyActiveSeed() {
    trackEvent('share_button_click', { type: shuffleMode === 'daily' ? 'daily_seed_copy' : 'random_seed_copy', seed: activeSeedSource.seed });
    const copyText = shuffleMode === 'daily'
      ? `I beat today’s Pocket Shuffle Chess setup.

${getDailyShareTaunt(localBestScore?.score)}

Seed: ${dailySeed}
Back rank: ${dailyBackRankCode}
${localBestScore ? `Score to beat: ${localBestScore.score}
` : ''}
Fast chess without memorized openings.
Can you beat it?

${getShareUrl('/daily')}`
      : `I survived this random shuffle setup.

${pickTaunt(randomTaunts)}

Seed: ${activeSeedSource.seed}
Back rank: ${activeBackRankCode}

Fast chess without memorized openings.
Can you beat it?

${getShareUrl(`/seed/${encodeURIComponent(activeSeedSource.seed)}`)}`;
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = copyText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopyStatus('copied');
    window.setTimeout(() => setCopyStatus('idle'), 1600);
  }

  function playCustomSeedAgainstAi() {
    setCustomSeedWasSubmitted(true);
    if (!customSeedValidation.ok) return;
    onStartSeededBot(customSeedValidation.normalizedSeed);
  }

  async function requestCustomMatch() {
    setCustomSeedWasSubmitted(true);
    if (!customSeedValidation.ok) return;
    await requestMatchFor(customSeedValidation.normalizedSeed, customSeedValidation.backRankCode);
  }

  async function inviteCustomSeed() {
    setCustomSeedWasSubmitted(true);
    if (!customSeedValidation.ok) return;
    await onSeeded(customSeedValidation.normalizedSeed);
  }

  function playActiveModeAgainstAi() {
    trackEvent('homepage_cta_click', { cta: 'play_ai', mode: shuffleMode });
    if (shuffleMode === 'daily') onStartBot(todayKey);
    else onStartSeededBot(activeSeedSource.seed, activeSeedSource.backRankCode);
  }

  async function requestActiveMatch() {
    const seedSource = activeSeedSource;
    await requestMatchFor(seedSource.seed, seedSource.backRankCode, seedSource.mode);
  }

  async function inviteActiveMode() {
    trackEvent('homepage_cta_click', { cta: 'invite_friend', mode: shuffleMode });
    if (shuffleMode === 'daily') onInvite();
    else await onSeeded(activeSeedSource.seed, activeSeedSource.backRankCode);
  }

  async function requestMatchFor(seed: string, backRankCode: string, mode: ShuffleMode = modeFromSeed(seed)) {
    trackEvent('homepage_cta_click', { cta: 'find_match', seed, mode });
    setMatchTarget({ seed, backRankCode, mode });
    setModal('matchmaking');
    setMatchmaking((current) => ({ status: 'finding', queueId: current.status === 'finding' ? current.queueId : undefined }));
    try {
      const result = await onFindMatch(seed, backRankCode);
      if (result.status === 'waiting') {
        setMatchTarget({ seed: result.seed, backRankCode: result.backRankCode, mode: modeFromSeed(result.seed) });
        setMatchmaking({ status: 'finding', queueId: result.queueId });
      }
      if (result.status === 'unavailable') setMatchmaking({ status: 'failed', message: result.message });
    } catch (error) {
      setMatchmaking({ status: 'failed', message: error instanceof Error ? error.message : 'Unable to start matchmaking.' });
    }
  }

  const cancelMatch = useCallback(async () => {
    if (matchmaking.status === 'finding' || matchmaking.status === 'timeout') await onCancelFindMatch(matchmaking.queueId);
    setMatchmaking({ status: 'idle' });
    setModal(null);
  }, [matchmaking, onCancelFindMatch]);

  function playAiForSeed(seed: string, backRankCode?: string) {
    trackEvent('homepage_cta_click', { cta: 'play_ai_for_seed', seed });
    if (seed.startsWith('daily-')) onStartBot(seed.replace('daily-', ''));
    else onStartSeededBot(seed, backRankCode);
  }

  async function switchFromMatchmaking(nextAction: () => void | Promise<void>) {
    if (matchmaking.status === 'finding' || matchmaking.status === 'timeout') await onCancelFindMatch(matchmaking.queueId);
    setMatchmaking({ status: 'idle' });
    setModal(null);
    await nextAction();
  }

  async function inviteMatchTarget() {
    if (matchTarget.seed.startsWith('daily-')) await onDaily(matchTarget.seed.replace('daily-', ''));
    else await onSeeded(matchTarget.seed, matchTarget.backRankCode);
  }

  const closeModal = useCallback(() => {
    if (modal === 'matchmaking') {
      void cancelMatch();
      return;
    }
    setModal(null);
  }, [cancelMatch, modal]);

  useEffect(() => {
    if (!modal) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeModal();
    }

    document.body.classList.add('home-modal-open');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('home-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal, modal]);

  useEffect(() => {
    if (matchmaking.status !== 'finding') return;

    const pollId = window.setInterval(() => {
      onFindMatch(matchTarget.seed, matchTarget.backRankCode)
        .then((result) => {
          if (result.status === 'waiting') {
            setMatchTarget({ seed: result.seed, backRankCode: result.backRankCode, mode: modeFromSeed(result.seed) });
            setMatchmaking((current) => (current.status === 'finding' ? { ...current, queueId: result.queueId } : current));
          }
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
      <button type="button" className="home-leaderboard-chip" onClick={() => setLeaderboardDialogOpen(true)} aria-label="Open leaderboards">
        <Trophy size={18} aria-hidden="true" />
        <div>
          <strong>Live scores</strong>
          <ol aria-live="polite">
            {visibleLeaderboardFeed.length > 0 ? visibleLeaderboardFeed.map((entry, index) => (
              <li key={`${entry.id}-${index}`} className={entry.kind === 'new-score' ? 'new-score-pulse' : ''}>
                <span>{entry.kind === 'new-score' ? `${entry.displayName} got a new score` : `${entry.rank ?? index + 1}. ${entry.displayName}`}</span><b>{entry.score}</b>
              </li>
            )) : <li><span>No daily scores yet</span><b>—</b></li>}
          </ol>
          <small>Tap for top 10, global, and starts</small>
        </div>
      </button>
      {leaderboardDialogOpen && (
        <div className="modal-backdrop leaderboard-dialog-backdrop" role="presentation" onClick={() => setLeaderboardDialogOpen(false)}>
          <section className="modal-card leaderboard-dialog" role="dialog" aria-modal="true" aria-labelledby="leaderboard-dialog-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close-button" onClick={() => setLeaderboardDialogOpen(false)} aria-label="Close leaderboards"><X size={18} aria-hidden="true" /></button>
            <div className="leaderboard-dialog-heading">
              <span className="eyebrow"><Trophy size={16} aria-hidden="true" /> Leaderboards</span>
              <h2 id="leaderboard-dialog-title">{activeLeaderboardView.title}</h2>
              <p>{activeLeaderboardView.description}</p>
            </div>
            <div className="leaderboard-tabs" role="tablist" aria-label="Choose leaderboard">
              {leaderboardViews.map((view) => (
                <button key={view.scope} type="button" role="tab" aria-selected={leaderboardScope === view.scope} className={leaderboardScope === view.scope ? 'selected' : ''} onClick={() => setLeaderboardScope(view.scope)}>
                  {view.label}
                </button>
              ))}
            </div>
            <ol className="leaderboard-dialog-list">
              {leaderboardDialogRows.length > 0 ? leaderboardDialogRows.slice(0, 10).map((entry, index) => (
                <li key={entry.id}>
                  <span className="leaderboard-rank">{index + 1}</span>
                  <span className="leaderboard-player">
                    <strong>{leaderboardScope === 'global-start-points' ? (getLeaderboardBackRankCode(entry) ?? entry.seed) : entry.display_name}</strong>
                    <small>{leaderboardScope === 'global-start-points' ? `Best by ${entry.display_name}` : `${entry.mode} • ${entry.seed.replace('daily-', '')}`}</small>
                  </span>
                  <b>{entry.score}</b>
                </li>
              )) : <li className="leaderboard-empty">No scores yet. Be the first tiny-board menace.</li>}
            </ol>
          </section>
        </div>
      )}
      <section className="home-hero-shell" aria-labelledby="home-title">
        <div className="hero-copy">
          <div className="brand-row">
            <span className="brand-icon-tile" aria-hidden="true"><img src="/Icon.png" alt="" draggable={false} /></span>
            <span>POCKET SHUFFLE CHESS</span>
          </div>

          <span className="title-spark title-spark-yellow" aria-hidden="true" />
          <span className="title-spark title-spark-mint" aria-hidden="true" />
          <h1 id="home-title" className="hero-title"><span>Pocket</span><span>Shuffle</span><span>Chess</span></h1>
          <p className="hero-tagline"><Zap size={18} aria-hidden="true" /><span>Fast chess without <strong>memorized openings</strong>.</span></p>

          <div className="shuffle-mode-panel">
            <div className="today-pill">
              <span className="today-pill-icon" aria-hidden="true">{shuffleMode === 'daily' ? <CalendarDays size={21} /> : <Shuffle size={21} />}</span>
              <span className="today-pill-copy">
                <span>{activeHeaderLabel}</span>
                <strong>{activeSeedLabel}</strong>
                <small>{activeHeaderDescription}</small>
              </span>
              <button type="button" className="copy-seed-button" onClick={copyActiveSeed} aria-label={`Copy ${activeSeedSource.seed} seed`}>
                <Copy size={18} aria-hidden="true" />
                <span>{copyStatus === 'copied' ? 'Copied' : 'Copy'}</span>
              </button>
              <span className="copy-status" aria-live="polite">{copyStatus === 'copied' ? 'Copied.' : ''}</span>
              {localBestScore && <span className="today-high-score-chip">High Score: {localBestScore.score}</span>}
            </div>
            {localBestScore && <span className="today-high-score-chip">High Score: {localBestScore.score}</span>}
            <div className="shuffle-mode-toggle" role="group" aria-label="Choose global shuffle mode">
              {(['daily', 'random'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={mode === shuffleMode ? 'selected' : ''}
                  onClick={() => setShuffleMode(mode)}
                  aria-pressed={mode === shuffleMode}
                >
                  {mode === 'daily' ? 'Daily Shuffle' : 'Random Shuffle'}
                </button>
              ))}
            </div>
          </div>

          <div className="home-action-grid" aria-label="Choose how to play">
            <button type="button" className="home-action-card home-action-ai" onClick={playActiveModeAgainstAi}>
              <span className="action-badge"><Bot size={14} aria-hidden="true" /> AI</span>
              <span className="card-sparkle card-sparkle-one" aria-hidden="true" />
              <img className="action-piece action-piece-pawn" src="/pieces/white-pawn.png" alt="White pawn" draggable={false} />
              {shuffleMode === 'daily' && <span className="daily-ai-stars" aria-label={`Daily AI progress: ${getDailyAIProgressAria(dailyAIProgress)}`}><DailyAIStarMarks progress={dailyAIProgress} /></span>}
              <span className="action-card-copy"><strong>Play AI</strong><small>{shuffleMode === 'daily' ? 'Instant daily game' : 'Use displayed setup'}</small>{shuffleMode === 'daily' && <small className="daily-ai-status">{dailyAIStatusLine}</small>}</span>
              <span className="action-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
            <button type="button" className="home-action-card home-action-match" onClick={() => { void requestActiveMatch(); }}>
              <span className="card-sparkle card-sparkle-two" aria-hidden="true" />
              <img className="action-piece action-piece-rook" src="/pieces/white-rook.png" alt="White rook" draggable={false} />
              <span className="action-card-copy"><strong>Find Match</strong><small>Join any open player</small></span>
              <span className="action-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
            <button type="button" className="home-action-card home-action-invite" onClick={() => { void inviteActiveMode(); }}>
              <span className="action-badge invite-badge"><LinkIcon size={14} aria-hidden="true" /> Link</span>
              <span className="card-sparkle card-sparkle-three" aria-hidden="true" />
              <img className="action-piece action-piece-knight" src="/pieces/white-knight.png" alt="White knight" draggable={false} />
              <span className="action-card-copy"><strong>Invite Friend</strong><small>{shuffleMode === 'daily' ? 'Share today’s setup' : 'Share one random setup'}</small></span>
              <span className="action-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
            <button type="button" className="home-action-card home-action-more" onClick={() => setModal('more')}>
              <span className="action-badge more-badge"><MoreHorizontal size={14} aria-hidden="true" /> More</span>
              <span className="card-sparkle card-sparkle-four" aria-hidden="true" />
              <span className="action-more-glyph" aria-hidden="true"><CalendarDays size={30} /><Shuffle size={30} /><BookOpen size={30} /></span>
              <span className="action-card-copy"><strong>More Options</strong><small>Date, seed, and rules</small></span>
              <span className="action-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
          </div>

          <div className="secondary-home-actions" aria-label="More options">
            <button type="button" onClick={() => { trackEvent('homepage_cta_click', { cta: 'choose_date' }); setModal('date'); }}><CalendarDays size={17} aria-hidden="true" /> Choose Date</button>
            <button type="button" onClick={() => { trackEvent('homepage_cta_click', { cta: 'custom_seed' }); setModal('custom'); }}><Shuffle size={17} aria-hidden="true" /> Custom Seed</button>
            <button type="button" onClick={() => { trackEvent('homepage_cta_click', { cta: 'how_it_works' }); setModal('rules'); }}><BookOpen size={17} aria-hidden="true" /> How It Works</button>
          </div>
        </div>

        <aside className="today-setup-showcase" aria-label="Today’s 5 by 6 setup preview">
          <span className="setup-spark setup-spark-left" aria-hidden="true" />
          <span className="setup-spark setup-spark-right" aria-hidden="true" />
          <div className="setup-header-pill"><span aria-hidden="true" />TODAY’S SETUP<span aria-hidden="true" /></div>
          <HomepageInteractiveBoard
            key={activeSeedSource.seed}
            backRankCode={activeBackRankCode}
            dailySeed={activeSeedSource.seed}
            blackBackRankCode={blackBackRankCode}
          />
          <div className="setup-summary-panel">
            <div className="setup-summary-copy">
              <span>{shuffleMode === 'daily' ? 'DAILY SHUFFLE' : 'RANDOM SHUFFLE'}</span>
              <p><strong>White (Bottom):</strong> {spacedCode(activeBackRankCode)}</p>
              <p><strong>Black (Top):</strong> {spacedCode(blackBackRankCode)}</p>
            </div>
            <div className="setup-seed-block">
              <span>SEED</span>
              <strong>{activeBackRankCode}</strong>
            </div>
          </div>
        </aside>

        <div className="decorative-home-pieces" aria-hidden="true">
          <img className="decorative-black-pawn" src="/pieces/black-pawn.png" alt="" draggable={false} />
          <img className="decorative-white-bishop" src="/pieces/white-bishop.png" alt="" draggable={false} />
        </div>
      </section>


      {modal === 'more' && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="confirm-card utility-modal more-options-modal" role="dialog" aria-modal="true" aria-labelledby="more-options-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close more options"><X size={18} /></button>
            <p className="eyebrow">More Options</p>
            <h2 id="more-options-modal-title">Pick a setup tool</h2>
            <div className="more-options-list">
              <button type="button" className="more-option-item" onClick={() => { trackEvent('homepage_cta_click', { cta: 'choose_date' }); setModal('date'); }}>
                <CalendarDays size={20} aria-hidden="true" />
                <span><strong>Choose Date</strong><small>Replay any unlocked daily setup.</small></span>
              </button>
              <button type="button" className="more-option-item" onClick={() => { trackEvent('homepage_cta_click', { cta: 'custom_seed' }); setModal('custom'); }}>
                <Shuffle size={20} aria-hidden="true" />
                <span><strong>Custom Seed</strong><small>Create or share your own shuffle.</small></span>
              </button>
              <button type="button" className="more-option-item" onClick={() => { trackEvent('homepage_cta_click', { cta: 'how_it_works' }); setModal('rules'); }}>
                <BookOpen size={20} aria-hidden="true" />
                <span><strong>Rule Book / How It Works</strong><small>Learn captures, drops, and scoring.</small></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'date' && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="confirm-card utility-modal" role="dialog" aria-modal="true" aria-labelledby="date-modal-title" onClick={(event) => event.stopPropagation()}>
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
                  const cellProgress = isFuture ? null : getDailyAIProgress(cell.dateKey);
                  return (
                    <button
                      type="button"
                      key={cell.dateKey}
                      className={[
                        'daily-calendar-day',
                        isSelected ? 'selected-day' : '',
                        isToday ? 'today-day' : '',
                        cellProgress?.magicStarUnlocked ? 'rainbow-day' : '',
                        cellProgress && cellProgress.stars > 0 && !cellProgress.magicStarUnlocked ? 'starred-day' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleDateChange(cell.dateKey)}
                      disabled={isFuture}
                      aria-pressed={isSelected}
                      aria-label={`${getDisplayDate(cell.dateKey)}${isFuture ? ' locked' : cellProgress ? `, ${getDailyAIProgressAria(cellProgress)}` : ''}`}
                    >
                      <span className="daily-calendar-day-number">{cell.day}</span>
                      {cellProgress && (cellProgress.stars > 0 || cellProgress.magicStarUnlocked) && (
                        <span className="daily-calendar-stars" aria-hidden="true">
                          <DailyAIStarMarks progress={cellProgress} compact />
                        </span>
                      )}
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
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <form
            className="confirm-card utility-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-modal-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void inviteCustomSeed();
            }}
          >
            <button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close custom seed"><X size={18} /></button>
            <p className="eyebrow">Custom Seed</p>
            <h2 id="custom-modal-title">Create a challenge</h2>
            <label htmlFor={seedInputId}>Seed phrase or direct back-rank code</label>
            <input
              id={seedInputId}
              name="seed"
              placeholder="boss-battle-1 or PPKPP"
              maxLength={48}
              value={customSeed}
              onChange={(event) => {
                setCustomSeed(event.target.value);
                if (customSeedWasSubmitted) setCustomSeedWasSubmitted(true);
              }}
              aria-describedby={`custom-seed-help ${customSeedError ? seedErrorId : ''}`.trim()}
              aria-invalid={customSeedError ? 'true' : 'false'}
              autoFocus
            />
            <p id="custom-seed-help" className="custom-seed-example">Use any 5-piece direct code with one K, like PPKPP, or a text seed like boss-battle-1.</p>
            {customSeedError && <p id={seedErrorId} className="error-message inline-message">{customSeedError}</p>}
            {customBackRankCode && <p className="seed-readout"><span>Generated back rank</span><span>{customBackRankCode}</span></p>}
            <div className="panel-actions centered-actions">
              <button type="button" onClick={playCustomSeedAgainstAi}>Play AI</button>
              <button type="button" onClick={() => { void requestCustomMatch(); }}>Find Match</button>
              <button type="submit">Invite Friend</button>
            </div>
          </form>
        </div>
      )}

      {modal === 'rules' && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="confirm-card utility-modal rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-modal-title" onClick={(event) => event.stopPropagation()}>
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
              <h3>AI Challenge</h3>
              <p>Playing against the AI is the main daily challenge. As you improve, the default AI mode can remove some pieces from your side to make each seed harder, more fun, and more interesting.</p>
              <p>Those lighter setups are designed as a challenge, not a penalty. They create fresh tactical puzzles, force new plans, and help you discover surprising ways to win with fewer resources.</p>
              <p>The AI&apos;s side keeps its full setup, and today&apos;s seed remains the same so you can keep exploring new tactics from the same board.</p>
            </section>
          </div>
        </div>
      )}

      {modal === 'matchmaking' && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="confirm-card utility-modal matchmaking-modal" role="dialog" aria-modal="true" aria-labelledby="matchmaking-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={cancelMatch} aria-label="Cancel matchmaking"><X size={18} /></button>
            <p className="eyebrow">Find Match</p>
            <h2 id="matchmaking-modal-title">{matchmaking.status === 'timeout' ? 'No opponent found yet.' : matchmaking.status === 'failed' ? 'Matchmaking unavailable' : 'Finding opponent...'}</h2>
            <p>Queued seed: <strong>{matchTarget.seed}</strong></p>
            <p>Back rank: {matchTarget.backRankCode}</p>
            <p className="panel-note">Your setup stays open online. The next player who taps Find Match joins this board, and colors are picked at random.</p>
            {matchmaking.status === 'failed' && <p className="error-message inline-message">{matchmaking.message}</p>}
            {matchmaking.status === 'timeout' && <p>No one matched within about a minute. You can keep waiting or send an invite link.</p>}
            <div className="panel-actions centered-actions">
              {matchmaking.status === 'timeout' && <button type="button" onClick={() => requestMatchFor(matchTarget.seed, matchTarget.backRankCode)}><Users size={18} /> Keep Waiting</button>}
              <button type="button" onClick={() => { void switchFromMatchmaking(inviteMatchTarget); }}><LinkIcon size={18} /> Invite Friend Instead</button>
              <button type="button" onClick={() => { void switchFromMatchmaking(() => playAiForSeed(matchTarget.seed, matchTarget.backRankCode)); }}><Bot size={18} /> Play AI While Waiting</button>
              <button type="button" onClick={cancelMatch}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
