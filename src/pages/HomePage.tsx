import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowRight, BookOpen, Bot, CalendarDays, ChevronLeft, ChevronRight, Copy, Flame, Link as LinkIcon, RefreshCw, Share2, Shuffle, Trophy, Users, X, Zap } from 'lucide-react';
import { pickRandomPlayerName, pickRandomPlayerNames } from '../game/humanPlayers.js';
import { getDailyAIProgress, getDailyAIStatusLine, resetDailyAIProgressIfNeeded, type DailyAIProgress } from '../game/dailyAIProgress.js';
import { dailyBackRankCodeFromSeed, getDailySeed, getUtcDateKey, validateSeedInput, createSeedFromInput } from '../game/seed.js';
import { createRandomGameSeed, getCurrentShuffleMode, getPageSessionRandomGameSeed, resolveSeedSourceForMode, setCurrentShuffleMode, type ShuffleMode } from '../game/shuffleMode.js';
import { HomepageInteractiveBoard } from '../home/interactiveBoard/HomepageInteractiveBoard.js';
import type { MatchmakingResponse } from '../multiplayer/gameApi.js';
import { trackEvent } from '../app/analytics.js';
import { getLocalBestScoreForSeedMode, type CompletedScoreEntry } from '../game/localScoreHistory.js';
import { getDisplayName, saveDisplayName } from '../game/localPlayer.js';
import { getPlayStreak } from '../game/playStreak.js';
import { getShareUrl } from '../app/seo.js';
import { fetchLeaderboard, fetchScoreboard, type LeaderboardEntry, type LeaderboardScope } from '../multiplayer/scoreApi.js';
import { CURATED_SEEDS } from '../game/curatedSeeds.js';
import { createSeedChallengeUrl } from '../game/challenge.js';
import { buildSeedShareMessage, getRandomShareTaunt } from '../game/shareTaunts.js';
import { PowerShieldBadge } from '../components/PowerShieldBadge.js';
import { readShieldProgression } from '../game/shieldProgression.js';

type HomePageProps = {
  initialModal?: Exclude<ModalName, null>;
  onStartBot: (dateKey?: string) => void;
  onStartSeededBot: (seed: string, backRankCode?: string) => void;
  onInvite: () => void;
  onDaily: (dateKey?: string) => void;
  onSeeded: (seed: string, backRankCode?: string) => void;
  onFindMatch: (seed: string, backRankCode: string) => Promise<MatchmakingResponse>;
  onCancelFindMatch: (queueId?: string) => Promise<void>;
  onStartAiAsPlayer: (opponentName: string, seed: string, backRankCode: string | undefined, playerSide: 'white' | 'black') => void;
};

type ModalName = 'date' | 'custom' | 'rules' | 'matchmaking' | 'dailyMastered' | 'streak' | null;
type LeaderboardFeedItem = { id: string; displayName: string; score: number; kind: 'rank' | 'new-score'; rank?: number };
type LeaderboardView = { scope: LeaderboardScope; label: string; title: string; description: string };

type MatchmakingState =
  | { status: 'idle' }
  | { status: 'finding'; queueId?: string }
  | { status: 'found-ai'; opponentName: string; playerSide: 'white' | 'black'; queueId?: string }
  | { status: 'no-player-found'; queueId?: string }
  | { status: 'failed'; message: string };


const leaderboardViews: LeaderboardView[] = [
  { scope: 'daily', label: 'Today’s Top 10', title: 'Today’s top 10', description: 'Best scores on today’s shared shuffle.' },
  { scope: 'global', label: 'Global', title: 'Global scores', description: 'Best player scores across every saved game.' },
];

function leaderboardEntryToFeedItem(entry: LeaderboardEntry, index: number): LeaderboardFeedItem {
  return { id: entry.id, displayName: entry.display_name, score: entry.score, kind: index < 10 ? 'rank' : 'new-score', rank: index + 1 };
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
  onStartAiAsPlayer,
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
  const [displayNameDraft, setDisplayNameDraft] = useState(() => getDisplayName());
  const [modal, setModal] = useState<ModalName>(initialModal ?? null);
  const [matchmaking, setMatchmaking] = useState<MatchmakingState>({ status: 'idle' });
  const [searchingNames, setSearchingNames] = useState<string[]>([]);
  const [searchNameGeneration, setSearchNameGeneration] = useState(0);
  const [shuffleMode, setShuffleModeState] = useState<ShuffleMode>(() => getCurrentShuffleMode());
  const [randomSetup, setRandomSetup] = useState(() => resolveSeedSourceForMode('random', { randomSeed: getPageSessionRandomGameSeed() }));
  const [dailyAIProgress, setDailyAIProgress] = useState(() => resetDailyAIProgressIfNeeded(todayKey));
  const [localBestScore, setLocalBestScore] = useState<CompletedScoreEntry | null>(() => getLocalBestScoreForSeedMode(getDailySeed(todayKey), 'daily'));
  const [leaderboardFeed, setLeaderboardFeed] = useState<LeaderboardFeedItem[]>([]);
  const [leaderboardFeedLoading, setLeaderboardFeedLoading] = useState(true);
  const [leaderboardFeedIndex, setLeaderboardFeedIndex] = useState(0);
  const [leaderboardChipExpanded, setLeaderboardChipExpanded] = useState(false);
  const [playStreak, setPlayStreak] = useState(() => getPlayStreak());
  const [shieldProgression] = useState(readShieldProgression);
  const previousLeaderboardFeedSignatureRef = useRef('');
  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>('daily');
  const [leaderboardDialogRows, setLeaderboardDialogRows] = useState<LeaderboardEntry[]>([]);
  const [leaderboardDialogLoading, setLeaderboardDialogLoading] = useState(false);
  const [matchTarget, setMatchTarget] = useState({ seed: getDailySeed(todayKey), backRankCode: dailyBackRankCodeFromSeed(getDailySeed(todayKey)), mode: 'daily' as ShuffleMode });
  const dailySeed = getDailySeed(todayKey);
  const dailyBackRankCode = dailyBackRankCodeFromSeed(dailySeed);
  const selectedDailySeed = getDailySeed(calendarDateKey);
  const selectedDailyBackRankCode = dailyBackRankCodeFromSeed(selectedDailySeed);
  const calendarCells = getCalendarCells(calendarMonthKey);
  const canGoNextMonth = shiftMonth(calendarMonthKey, 1) <= monthKeyFromDateKey(todayKey);
  const activeSeedSource = shuffleMode === 'daily' ? resolveSeedSourceForMode('daily', { dateKey: todayKey }) : randomSetup;
  const activeBackRankCode = activeSeedSource.backRankCode;
  const activeSeedLabel = shuffleMode === 'daily' ? dailyBackRankCode : activeBackRankCode;
  const activeHeaderLabel = shuffleMode === 'daily' ? 'Today’s setup' : 'Random setup';
  const activeHeaderDescription = shuffleMode === 'daily' ? 'Same board for everyone today.' : 'Active until refresh.';
  const blackBackRankCode = [...activeBackRankCode].reverse().join('');
  const customSeedValidation = validateSeedInput(customSeed);
  const customSeedError = customSeedWasSubmitted && customSeedValidation.ok === false ? customSeedValidation.error : null;
  const customBackRankCode = customSeedValidation.ok ? customSeedValidation.backRankCode : null;
  const dailyAIStatusLine = getDailyAIStatusLine(dailyAIProgress);
  const shouldConfirmDailyReplay = dailyAIProgress.stars >= 3 || dailyAIProgress.magicStarUnlocked;
  const dailyMasteredSeedSuggestions = CURATED_SEEDS.filter((seed) => ['gotham-chaos', 'boss-battle', 'queen-rush'].includes(seed.slug)).slice(0, 3);
  const activeLeaderboardView = leaderboardViews.find((view) => view.scope === leaderboardScope) ?? leaderboardViews[0];
  const leaderboardFeedSignature = useMemo(() => leaderboardFeed.map((entry) => `${entry.id}:${entry.score}:${entry.rank ?? ''}`).join('|'), [leaderboardFeed]);
  const visibleLeaderboardFeed = leaderboardFeed.length > 0
    ? [0, 1, 2].map((offset) => leaderboardFeed[(leaderboardFeedIndex + offset) % leaderboardFeed.length]).filter(Boolean) as LeaderboardFeedItem[]
    : [];
  const decorativePieces = useMemo(() => {
    const pieces = ['pawn', 'knight', 'bishop', 'rook', 'queen'] as const;
    const seedText = activeSeedSource.seed;
    let hash = 0;
    for (let index = 0; index < seedText.length; index += 1) hash = (hash * 31 + seedText.charCodeAt(index)) >>> 0;
    const frontPiece = pieces[hash % pieces.length];
    const backPiece = pieces[(hash >>> 3) % pieces.length];
    return {
      front: `/pieces/white-${frontPiece}.png`,
      back: `/pieces/black-${backPiece}.png`,
    };
  }, [activeSeedSource.seed]);

  useEffect(() => {
    const dateRefreshId = window.setInterval(() => setTodayKey(getUtcDateKey()), 60000);
    return () => window.clearInterval(dateRefreshId);
  }, []);

  useEffect(() => {
    const refreshStreak = () => setPlayStreak(getPlayStreak());
    refreshStreak();
    window.addEventListener('play-streak-updated', refreshStreak);
    window.addEventListener('storage', refreshStreak);
    return () => {
      window.removeEventListener('play-streak-updated', refreshStreak);
      window.removeEventListener('storage', refreshStreak);
    };
  }, [todayKey]);

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
      setLeaderboardFeed(topScores.map(leaderboardEntryToFeedItem));
      setLeaderboardFeedIndex(0);
    }).catch(() => setLeaderboardFeed([])).finally(() => setLeaderboardFeedLoading(false));
  }, [dailySeed]);

  useEffect(() => {
    const scrollId = window.setInterval(() => {
      setLeaderboardFeedIndex((currentIndex) => (leaderboardFeed.length <= 1 ? 0 : (currentIndex + 1) % leaderboardFeed.length));
    }, 2600);
    return () => window.clearInterval(scrollId);
  }, [leaderboardFeed.length]);

  useEffect(() => {
    const previousSignature = previousLeaderboardFeedSignatureRef.current;
    previousLeaderboardFeedSignatureRef.current = leaderboardFeedSignature;
    if (!leaderboardFeedSignature || leaderboardFeedSignature === previousSignature) return undefined;

    setLeaderboardChipExpanded(true);
    const collapseId = window.setTimeout(() => setLeaderboardChipExpanded(false), 7800);
    return () => window.clearTimeout(collapseId);
  }, [leaderboardFeedSignature]);

  useEffect(() => {
    if (!leaderboardDialogOpen) return;
    const loadScores = leaderboardScope === 'daily' ? fetchScoreboard('daily', dailySeed, 'daily') : fetchScoreboard(leaderboardScope);
    loadScores.then((scores) => setLeaderboardDialogRows(scores.slice(0, 10))).catch(() => setLeaderboardDialogRows([])).finally(() => setLeaderboardDialogLoading(false));
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


  function openLeaderboardDialog() {
    setLeaderboardDialogRows([]);
    setLeaderboardDialogLoading(true);
    setLeaderboardDialogOpen(true);
  }

  function chooseLeaderboardScope(scope: LeaderboardScope) {
    if (scope === leaderboardScope && leaderboardDialogRows.length > 0) return;
    setLeaderboardDialogRows([]);
    setLeaderboardDialogLoading(true);
    setLeaderboardScope(scope);
  }

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

  function reshuffleRandomSetup() {
    const nextRandomSetup = resolveSeedSourceForMode('random', { randomSeed: createRandomGameSeed() });
    setRandomSetup(nextRandomSetup);
    setCurrentShuffleMode('random');
    setShuffleModeState('random');
    trackEvent('homepage_cta_click', { cta: 'random_shuffle_refresh', backRankCode: nextRandomSetup.backRankCode });
  }

  function commitDisplayNameDraft() {
    const normalizedDraft = displayNameDraft.trim();
    setDisplayNameDraft(saveDisplayName(normalizedDraft));
  }

  function handleDisplayNameKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  async function copyActiveSeed() {
    trackEvent('share_button_click', { type: shuffleMode === 'daily' ? 'daily_seed_copy' : 'random_seed_copy', seed: activeSeedSource.seed });
    const copyText = buildSeedShareMessage({
      style: shuffleMode === 'daily' ? 'dailySeed' : 'randomSeed',
      taunt: getRandomShareTaunt(shuffleMode === 'daily' ? 'daily' : 'generic'),
      seedSlug: activeSeedSource.seed,
      backRankCode: activeBackRankCode,
      challengeUrl: shuffleMode === 'daily' ? getShareUrl('/daily') : getShareUrl(`/seed/${encodeURIComponent(activeSeedSource.seed)}`),
      score: shuffleMode === 'daily' ? localBestScore?.score : null,
    });
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
    if (customSeedValidation.ok === false) return;
    onStartSeededBot(customSeedValidation.normalizedSeed);
  }

  async function requestCustomMatch() {
    setCustomSeedWasSubmitted(true);
    if (customSeedValidation.ok === false) return;
    await requestMatchFor(customSeedValidation.normalizedSeed, customSeedValidation.backRankCode);
  }

  async function inviteCustomSeed() {
    setCustomSeedWasSubmitted(true);
    if (customSeedValidation.ok === false) return;
    await onSeeded(customSeedValidation.normalizedSeed);
  }

  function continueDailyAiReplay() {
    setModal(null);
    onStartBot(todayKey);
  }

  function playActiveModeAgainstAi() {
    trackEvent('homepage_cta_click', { cta: 'play_ai', mode: shuffleMode });
    if (shuffleMode === 'daily') {
      if (shouldConfirmDailyReplay) {
        setModal('dailyMastered');
        return;
      }
      onStartBot(todayKey);
    }
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

  function openSeedDetail(seed: string) {
    window.history.pushState(null, '', `/seed/${encodeURIComponent(seed)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }

  function openLearnPieces() {
    trackEvent('homepage_cta_click', { cta: 'learn_pieces_from_rules' });
    setModal(null);
    window.history.pushState(null, '', '/learn');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }

  async function challengeHomeSeed(seed: string, backRankCode: string) {
    if (seed.startsWith('daily-')) await onDaily(seed.replace('daily-', ''));
    else await onSeeded(seed, backRankCode);
  }

  function openHomeSeedLeaderboard(seed: string) {
    window.history.pushState(null, '', `/seed/${encodeURIComponent(seed)}/leaderboard`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }

  function shareHomeSeed(seed: string) {
    const validation = createSeedFromInput(seed);
    const backRankCode = validation.ok ? validation.backRankCode : activeBackRankCode;
    const shareText = buildSeedShareMessage({
      style: seed.startsWith('daily-') ? 'dailySeed' : 'popularSeed',
      taunt: getRandomShareTaunt(seed.startsWith('daily-') ? 'daily' : 'friendChallenge'),
      seedSlug: seed,
      backRankCode,
      challengeUrl: createSeedChallengeUrl(seed),
    });
    void navigator.clipboard?.writeText(shareText);
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
    if (matchmaking.status === 'finding' || matchmaking.status === 'no-player-found' || matchmaking.status === 'found-ai') await onCancelFindMatch(matchmaking.queueId);
    setMatchmaking({ status: 'idle' });
    setModal(null);
  }, [matchmaking, onCancelFindMatch]);

  function playAiForSeed(seed: string, backRankCode?: string) {
    trackEvent('homepage_cta_click', { cta: 'play_ai_for_seed', seed });
    if (seed.startsWith('daily-')) onStartBot(seed.replace('daily-', ''));
    else onStartSeededBot(seed, backRankCode);
  }

  async function switchFromMatchmaking(nextAction: () => void | Promise<void>) {
    if (matchmaking.status === 'finding' || matchmaking.status === 'no-player-found') await onCancelFindMatch(matchmaking.queueId);
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
          if (result.status === 'unavailable') setMatchmaking((current) => (current.status === 'finding' ? { status: 'failed', message: result.message } : current));
        })
        .catch((error: Error) => setMatchmaking((current) => (current.status === 'finding' ? { status: 'failed', message: error.message } : current)));
    }, 5000);

    // If no real match appears after a short scan, usually connect to a human-named AI.
    // About 1 in 10 searches shows a no-player-found state instead, so matchmaking feels less automatic.
    const fallbackDelay = 10000 + Math.floor(Math.random() * 5000);
    const fallbackId = window.setTimeout(() => {
      setMatchmaking((current) => {
        if (current.status !== 'finding') return current;
        if (Math.random() < 0.1) return { status: 'no-player-found', queueId: current.queueId };
        return { status: 'found-ai', opponentName: pickRandomPlayerName(), playerSide: Math.random() < 0.5 ? 'white' : 'black', queueId: current.queueId };
      });
    }, fallbackDelay);

    return () => {
      window.clearInterval(pollId);
      window.clearTimeout(fallbackId);
    };
  }, [matchTarget.backRankCode, matchTarget.seed, matchmaking.status, onFindMatch]);

  // When AI match is found, cancel server queue and navigate to bot game after brief delay
  useEffect(() => {
    if (matchmaking.status !== 'found-ai') return;
    const { opponentName, playerSide, queueId } = matchmaking;
    const navigateId = window.setTimeout(() => {
      void onCancelFindMatch(queueId);
      setMatchmaking({ status: 'idle' });
      setModal(null);
      onStartAiAsPlayer(opponentName, matchTarget.seed, matchTarget.backRankCode, playerSide);
    }, 2000);
    return () => window.clearTimeout(navigateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmaking.status]);

  // Cycle through random names while searching
  useEffect(() => {
    if (matchmaking.status !== 'finding') {
      const clearId = window.setTimeout(() => setSearchingNames([]), 0);
      return () => window.clearTimeout(clearId);
    }
    const refresh = () => {
      setSearchingNames(pickRandomPlayerNames(5));
      setSearchNameGeneration((g) => g + 1);
    };
    refresh();
    const refreshId = window.setInterval(refresh, 2800);
    return () => window.clearInterval(refreshId);
  }, [matchmaking.status]);

  return (
    <main className="home-page">
      <button type="button" className={`home-leaderboard-chip ${leaderboardChipExpanded ? 'is-expanded' : 'is-collapsed'}`} onClick={openLeaderboardDialog} aria-label="Open leaderboards">
        <Trophy size={18} aria-hidden="true" />
        <div>
          <strong>Live scores</strong>
          <ol aria-live="polite">
            {leaderboardFeedLoading ? [0, 1, 2].map((item) => (
              <li key={`leaderboard-feed-skeleton-${item}`} className="leaderboard-skeleton-row" aria-hidden="true"><span /><b /></li>
            )) : visibleLeaderboardFeed.length > 0 ? visibleLeaderboardFeed.map((entry, index) => (
              <li key={`${entry.id}-${index}`} className={entry.kind === 'new-score' ? 'new-score-pulse' : ''}>
                <span>{entry.kind === 'new-score' ? `${entry.displayName} got a new score` : `${entry.rank ?? index + 1}. ${entry.displayName}`}</span><b>{entry.score}</b>
              </li>
            )) : <li><span>No daily scores yet</span><b>—</b></li>}
          </ol>
          <small>Tap for top 10 and global scores</small>
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
                <button key={view.scope} type="button" role="tab" aria-selected={leaderboardScope === view.scope} className={leaderboardScope === view.scope ? 'selected' : ''} onClick={() => chooseLeaderboardScope(view.scope)}>
                  {view.label}
                </button>
              ))}
            </div>
            <ol className="leaderboard-dialog-list" aria-busy={leaderboardDialogLoading}>
              {leaderboardDialogLoading ? Array.from({ length: 10 }, (_item, index) => (
                <li key={`leaderboard-dialog-skeleton-${index}`} className="leaderboard-skeleton-card" aria-hidden="true">
                  <span className="leaderboard-rank">{index + 1}</span>
                  <span className="leaderboard-player"><strong /><small /></span>
                  <b />
                </li>
              )) : leaderboardDialogRows.length > 0 ? leaderboardDialogRows.slice(0, 10).map((entry, index) => (
                <li key={entry.id}>
                  <span className="leaderboard-rank">{index + 1}</span>
                  <span className="leaderboard-player">
                    <strong>{entry.display_name}</strong>
                    <small>{entry.mode} • {entry.seed.replace('daily-', '')}</small>
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
            <button type="button" className="brand-icon-tile streak-brand-tile" aria-label={`${playStreak.count} day play streak — tap to learn more`} onClick={() => { trackEvent('homepage_cta_click', { cta: 'streak_info' }); setModal('streak'); }}><Flame size={42} aria-hidden="true" /><b>{playStreak.count}</b></button>
            <form className="player-greeting" onSubmit={(event) => { event.preventDefault(); commitDisplayNameDraft(); }}>
              <span>Hello <PowerShieldBadge tier={shieldProgression.tier} pips={shieldProgression.pips} /></span>
              <input
                aria-label="Player name"
                value={displayNameDraft}
                onChange={(event) => setDisplayNameDraft(event.target.value)}
                onBlur={commitDisplayNameDraft}
                onKeyDown={handleDisplayNameKeyDown}
                placeholder="Player name"
                maxLength={24}
              />
            </form>
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
            </div>
            {localBestScore && (
              <span className="today-high-score-chip" aria-label={`High score ${localBestScore.score}`}>
                <Trophy size={18} aria-hidden="true" />
                <span>
                  <small>High score</small>
                  <strong>{localBestScore.score}</strong>
                </span>
              </span>
            )}
            <div className="shuffle-mode-toggle" role="group" aria-label="Choose global shuffle mode">
              <button
                type="button"
                className={shuffleMode === 'daily' ? 'selected' : ''}
                onClick={() => setShuffleMode('daily')}
                aria-pressed={shuffleMode === 'daily'}
              >
                Daily Shuffle
              </button>
              <span className="random-shuffle-toggle">
                <button
                  type="button"
                  className={shuffleMode === 'random' ? 'selected' : ''}
                  onClick={() => setShuffleMode('random')}
                  aria-pressed={shuffleMode === 'random'}
                >
                  Random Shuffle
                </button>
                <button
                  type="button"
                  className="shuffle-refresh-button"
                  onClick={reshuffleRandomSetup}
                  aria-label="Shuffle a new random setup"
                  title="Shuffle again"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                </button>
              </span>
            </div>
          </div>

          <div className="home-action-grid" aria-label="Choose how to play">
            <button type="button" className="home-action-card home-action-ai" onClick={playActiveModeAgainstAi}>
              <span className="action-badge"><Bot size={14} aria-hidden="true" /> AI</span>
              <span className="card-sparkle card-sparkle-one" aria-hidden="true" />
              <img className="action-piece action-piece-ai action-piece-ai-knight" src="/pieces/white-knight.png" alt="" aria-hidden="true" draggable={false} />
              <img className="action-piece action-piece-ai action-piece-ai-pawn" src="/pieces/white-pawn.png" alt="" aria-hidden="true" draggable={false} />
              <img className="action-piece action-piece-ai action-piece-ai-bishop" src="/pieces/white-bishop.png" alt="" aria-hidden="true" draggable={false} />
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
              <span className="action-card-copy"><strong>Challenge Friend</strong><small>{shuffleMode === 'daily' ? 'Share today’s setup' : 'Share one random setup'}</small></span>
              <span className="action-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
            <button type="button" className="home-action-card home-action-date" onClick={() => { trackEvent('homepage_cta_click', { cta: 'choose_date' }); setModal('date'); }}>
              <span className="action-badge date-badge"><CalendarDays size={14} aria-hidden="true" /> Date</span>
              <span className="action-glyph" aria-hidden="true"><CalendarDays size={52} /></span>
              <span className="action-card-copy"><strong>Choose Date</strong><small>Replay any daily</small></span>
              <span className="action-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
            <button type="button" className="home-action-card home-action-seed" onClick={() => { trackEvent('homepage_cta_click', { cta: 'custom_seed' }); setModal('custom'); }}>
              <span className="action-badge seed-badge"><Shuffle size={14} aria-hidden="true" /> Seed</span>
              <span className="action-glyph" aria-hidden="true"><Shuffle size={52} /></span>
              <span className="action-card-copy"><strong>Custom Seed</strong><small>Your own setup</small></span>
              <span className="action-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
            <button type="button" className="home-action-card home-action-rules" onClick={() => { trackEvent('homepage_cta_click', { cta: 'how_it_works' }); setModal('rules'); }}>
              <span className="rules-icon-wrap" aria-hidden="true"><BookOpen size={24} /></span>
              <span className="action-card-copy"><strong>How It Works</strong><small>Rules, scoring, and AI challenge</small></span>
              <span className="action-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
            </button>
          </div>

        </div>

        <aside className="today-setup-showcase" aria-label="Today's 5 by 6 setup preview">
          <span className="setup-spark setup-spark-left" aria-hidden="true" />
          <span className="setup-spark setup-spark-right" aria-hidden="true" />
          <div className="setup-header-pill"><span aria-hidden="true" />TODAY'S SETUP<span aria-hidden="true" /></div>
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

        <section className="popular-seeds-home" aria-labelledby="popular-seeds-home-title">
          <div>
            <p className="eyebrow">Popular Seeds</p>
            <h2 id="popular-seeds-home-title">Play a shared setup and try to beat the best score.</h2>
          </div>
          <div className="popular-seed-home-grid">
            {[{ slug: getDailySeed(todayKey), displayName: "Today's Daily" }, ...CURATED_SEEDS.filter((seed) => ['gotham-chaos', 'boss-battle', 'queen-rush', 'knight-panic', 'final-boss'].includes(seed.slug))].map((seed) => {
              const created = createSeedFromInput(seed.slug);
              const setup = created.ok ? created.backRankCode : activeBackRankCode;
              return (
                <article
                  className="popular-seed-home-card seed-card-clickable"
                  key={seed.slug}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSeedDetail(seed.slug)}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && event.currentTarget === event.target) {
                      event.preventDefault();
                      openSeedDetail(seed.slug);
                    }
                  }}
                >
                  <strong>{seed.displayName}</strong>
                  <span>{seed.slug}</span>
                  <small>Setup {setup}</small>
                  <div className="seed-card-action-stack">
                    <div className="seed-card-action-row">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onStartSeededBot(seed.slug, setup); }}>Play AI</button>
                      <button type="button" className="seed-icon-action" aria-label={`Share ${seed.displayName}`} onClick={(event) => { event.stopPropagation(); shareHomeSeed(seed.slug); }}><Share2 size={15} /></button>
                      <button type="button" className="seed-icon-action" aria-label={`${seed.displayName} leaderboard`} onClick={(event) => { event.stopPropagation(); openHomeSeedLeaderboard(seed.slug); }}><Trophy size={15} /></button>
                    </div>
                    <button type="button" className="secondary-action seed-challenge-action" onClick={(event) => { event.stopPropagation(); void challengeHomeSeed(seed.slug, setup); }}><Users size={15} /> Challenge Friend</button>
                  </div>
                </article>
              );
            })}
          </div>
          <button type="button" className="secondary-action" onClick={() => { window.history.pushState(null, '', '/seeds'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Play Popular Seeds</button>
        </section>

        <div className="decorative-home-pieces" aria-hidden="true">
          <img className="decorative-black-pawn" src={decorativePieces.back} alt="" draggable={false} />
          <img className="decorative-white-bishop" src={decorativePieces.front} alt="" draggable={false} />
        </div>
      </section>


      {modal === 'dailyMastered' && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="confirm-card utility-modal daily-mastered-modal" role="dialog" aria-modal="true" aria-labelledby="daily-mastered-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close daily mastered prompt"><X size={18} /></button>
            <p className="eyebrow">Daily mastered</p>
            <h2 id="daily-mastered-title">You already earned all 3 stars today.</h2>
            <p>You can still replay today’s AI ladder, or try another popular setup for a fresh score chase.</p>
            <div className="daily-mastered-seeds" aria-label="Popular seed suggestions">
              {dailyMasteredSeedSuggestions.map((seed) => {
                const created = createSeedFromInput(seed.slug);
                const setup = created.ok ? created.backRankCode : activeBackRankCode;
                return (
                  <button type="button" key={seed.slug} className="daily-mastered-seed-card" onClick={() => onStartSeededBot(seed.slug, setup)}>
                    <strong>{seed.displayName}</strong>
                    <span>{seed.slug}</span>
                  </button>
                );
              })}
            </div>
            <div className="panel-actions centered-actions">
              <button type="button" className="success-action" onClick={continueDailyAiReplay}>Continue daily anyway</button>
              <button type="button" className="secondary-action" onClick={() => setModal(null)}>Back to menu</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'streak' && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="confirm-card utility-modal streak-info-modal" role="dialog" aria-modal="true" aria-labelledby="streak-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setModal(null)} aria-label="Close streak info"><X size={18} /></button>
            <p className="eyebrow">Play Streak</p>
            <h2 id="streak-modal-title"><Flame size={28} aria-hidden="true" className="streak-modal-flame" /> {playStreak.count}-day streak</h2>
            <p>Your streak counts the number of days in a row you&apos;ve played at least one game. Every time you complete a game, your streak is kept alive for another 24&nbsp;hours.</p>
            <p>Miss a day and it resets to zero — so come back tomorrow to keep the fire burning!</p>
            {playStreak.lastPlayedDate && (
              <p className="streak-last-played">Last played: <strong>{getDisplayDate(playStreak.lastPlayedDate)}</strong></p>
            )}
            <div className="panel-actions centered-actions">
              <button type="button" className="secondary-action" onClick={() => setModal(null)}>Got it</button>
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
              <button type="button" onClick={() => onDaily(calendarDateKey)}>Challenge Friend</button>
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
              <button type="submit">Challenge Friend</button>
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
              <p>White's back rank is shuffled. Black's back rank is mirrored.</p>
              <p>Normal chess movement applies, except:</p>
              <ul>
                <li>No castling.</li>
                <li>No en passant.</li>
                <li>Pawns move one square.</li>
                <li>Pawns auto-promote to queen in V1.</li>
                <li>Checkmate wins.</li>
              </ul>
              <p className="rules-learn-pieces">Want to learn more about how each piece moves? <button type="button" onClick={openLearnPieces}>Click here for the piece lessons.</button></p>
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
        <div className="modal-backdrop" role="presentation" onClick={matchmaking.status === 'found-ai' ? undefined : closeModal}>
          <div className="confirm-card utility-modal matchmaking-modal" role="dialog" aria-modal="true" aria-labelledby="matchmaking-modal-title" onClick={(event) => event.stopPropagation()}>
            {matchmaking.status !== 'found-ai' && (
              <button type="button" className="modal-close" onClick={cancelMatch} aria-label="Cancel matchmaking"><X size={18} /></button>
            )}
            <p className="eyebrow">Find Match</p>
            <h2 id="matchmaking-modal-title">
              {matchmaking.status === 'found-ai'
                ? 'Match found!'
                : matchmaking.status === 'no-player-found'
                  ? 'No player found.'
                  : matchmaking.status === 'failed'
                    ? 'Matchmaking unavailable'
                    : 'Scanning for players...'}
            </h2>

            {matchmaking.status === 'finding' && (
              <div className="matchmaking-search-animation" aria-live="polite">
                <div className="matchmaking-radar" aria-hidden="true">
                  <span className="matchmaking-radar-ring matchmaking-radar-ring-1" />
                  <span className="matchmaking-radar-ring matchmaking-radar-ring-2" />
                  <span className="matchmaking-radar-dot" />
                </div>
                <div className="matchmaking-names-list" aria-label="Scanning potential players">
                  {searchingNames.map((name, index) => (
                    <span key={`${searchNameGeneration}-${index}`} className="matchmaking-scanning-name">
                      <span className="scanning-name-dot" aria-hidden="true" />
                      {name}
                    </span>
                  ))}
                </div>
                <p className="matchmaking-status-text">Looking for real players nearby...</p>
              </div>
            )}

            {matchmaking.status === 'found-ai' && (
              <div className="matchmaking-found-container" aria-live="assertive">
                <div className="matchmaking-found-check" aria-hidden="true">✓</div>
                <span className="matchmaking-found-name">{matchmaking.opponentName}</span>
                <p className="matchmaking-found-status">Connecting to your match...</p>
              </div>
            )}

            {matchmaking.status !== 'finding' && matchmaking.status !== 'found-ai' && (
              <>
                <p>Queued seed: <strong>{matchTarget.seed}</strong></p>
                <p>Back rank: {matchTarget.backRankCode}</p>
                <p className="panel-note">
                  {matchmaking.status === 'no-player-found'
                    ? 'No player was available for this setup right now.'
                    : 'Your setup stays open online. The next player who taps Find Match joins this board, and colors are picked at random.'}
                </p>
              </>
            )}

            {matchmaking.status === 'failed' && <p className="error-message inline-message">{matchmaking.message}</p>}
            {matchmaking.status === 'no-player-found' && <p>No player found. Try again later, challenge a friend, or play AI now.</p>}

            {matchmaking.status !== 'found-ai' && (
              <div className="panel-actions centered-actions">
                {matchmaking.status === 'no-player-found' && <button type="button" onClick={() => requestMatchFor(matchTarget.seed, matchTarget.backRankCode)}><Users size={18} /> Try Again</button>}
                {matchmaking.status === 'no-player-found' && <button type="button" onClick={() => { void switchFromMatchmaking(inviteMatchTarget); }}><LinkIcon size={18} /> Challenge Friend</button>}
                {matchmaking.status === 'no-player-found' && <button type="button" onClick={() => { void switchFromMatchmaking(() => playAiForSeed(matchTarget.seed, matchTarget.backRankCode)); }}><Bot size={18} /> Play AI</button>}
                <button type="button" onClick={cancelMatch}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
