/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Copy, Flag, Handshake, Home, Pause, Play, RotateCcw, Share2, Shuffle, Sparkles, Trophy } from 'lucide-react';
import { Board } from '../components/Board.js';
import { CapturedScoreRow } from '../components/CapturedPieces.js';
import { GameHeader } from '../components/GameHeader.js';
import { GameResultPanel } from '../components/GameResultPanel.js';
import { MoveHistory } from '../components/MoveHistory.js';
import { ScoreExplanation } from '../components/ScoreExplanation.js';
import { ShareChallengeModal } from '../components/ShareChallengeModal.js';
import { ResultScreenshotButton } from '../components/ResultScreenshotButton.js';
import { PowerShieldBadge } from '../components/PowerShieldBadge.js';
import { applyMove, createMoveRecord } from '../game/applyMove.js';
import { analyzeMove, getBestMoveForPosition, getMoveNotation } from '../game/analysis.js';
import { removeAscensionPieces, type AscensionTier } from '../game/ascension.js';
import { type BotLevel, getBotMoveByLevel, getMoveIdentity } from '../game/bot.js';
import {
  type DailyAIDifficulty,
  type DailyAIProgress,
  getDailyAIDifficulty,
  getDailyAIPlayerColor,
  getNextDailyAIProgress,
  resetDailyAIProgressIfNeeded,
  saveDailyAIProgress,
} from '../game/dailyAIProgress.js';
import { findKingIndex, isKingInCheck } from '../game/check.js';
import { createInitialBoard } from '../game/createInitialBoard.js';
import { squareLabel } from '../game/coordinates.js';
import { getOpponent, getStatusForTurn } from '../game/gameStatus.js';
import { getLegalMoves } from '../game/legalMoves.js';
import { dailyBackRankCodeFromSeed, getDailySeed, getUtcDateKey, isValidBackRankCode, validateSeedInput } from '../game/seed.js';
import { getSeedDisplayName, normalizeSeedSlug } from '../game/curatedSeeds.js';
import { compareChallengeResult, createChallengePayload, createSeedChallengeUrl, createChallengeUrl, type ActiveChallengeContext } from '../game/challenge.js';
import { buildShareMessage, getContextualTauntContext, getRandomComparisonText, getRandomShareTaunt, type TauntContext } from '../game/shareTaunts.js';
import { getAnonymousPlayerId, getDisplayName, saveDisplayName } from '../game/localPlayer.js';
import { getLocalBestScore, saveLocalScoreEntry, type CompletedScoreEntry } from '../game/localScoreHistory.js';
import { recordPlayStreak } from '../game/playStreak.js';
import { formatMoveNotation } from '../game/moveNotation.js';
import { calculateGameScore, getCaptureScore } from '../game/scoring.js';
import { getBestMoveChanceForPower, getPlayerPowerTier, getPowerRomanNumeral } from '../game/playerPower.js';
import { fetchLeaderboard, submitScore, type LeaderboardEntry } from '../multiplayer/scoreApi.js';
import { createChallenge, submitSeedScore } from '../multiplayer/challengeApi.js';
import { playCheckSound, playMoveSound, playResultSound } from '../game/sound.js';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveAnalysis, MoveRecord, PieceType } from '../game/types.js';

export type MatchMode = 'single' | 'best-of-3' | 'best-of-5';

type BotGamePageProps = {
  matchMode: MatchMode;
  dateKey?: string;
  customSeed?: string;
  customBackRankCode?: string;
  playerSide?: Color;
  activeChallengeContext?: ActiveChallengeContext;
  onHome: () => void;
  onCustomSeed: () => void;
  onDaily: () => void;
  onRandomSetup: () => void;
};

type MatchScore = Record<Color, number>;
type RoundResult = {
  status: GameStatus;
  winner: Color | null;
  message: string;
  progressionMessage?: string;
  didPlayerWin: boolean;
  drawReason?: 'agreed' | 'stalemate';
};

type PendingAction = 'resign' | 'draw' | 'restart' | null;

type BotAdaptationProfile = {
  winStreak: number;
  lossStreak: number;
};

const botAdaptationStorageKey = 'pocket-shuffle-bot-adaptation';

function readBotAdaptationProfile(): BotAdaptationProfile {
  if (typeof localStorage === 'undefined') return { winStreak: 0, lossStreak: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem(botAdaptationStorageKey) ?? '{}') as Partial<BotAdaptationProfile>;
    return {
      winStreak: Number.isFinite(parsed.winStreak) ? Math.max(0, Math.floor(parsed.winStreak ?? 0)) : 0,
      lossStreak: Number.isFinite(parsed.lossStreak) ? Math.max(0, Math.floor(parsed.lossStreak ?? 0)) : 0,
    };
  } catch {
    return { winStreak: 0, lossStreak: 0 };
  }
}

function saveBotAdaptationProfile(profile: BotAdaptationProfile): BotAdaptationProfile {
  const safeProfile = {
    winStreak: Math.max(0, Math.floor(profile.winStreak)),
    lossStreak: Math.max(0, Math.floor(profile.lossStreak)),
  };
  if (typeof localStorage !== 'undefined') localStorage.setItem(botAdaptationStorageKey, JSON.stringify(safeProfile));
  return safeProfile;
}

function getNextBotAdaptationProfile(profile: BotAdaptationProfile, didPlayerWin: boolean): BotAdaptationProfile {
  return {
    winStreak: didPlayerWin ? profile.winStreak + 1 : 0,
    lossStreak: didPlayerWin ? 0 : profile.lossStreak + 1,
  };
}

const BOT_MOVE_DELAY_MIN_MS = 650;
const BOT_MOVE_DELAY_SPREAD_MS = 450;
const HISTORY_AUTOPLAY_INTERVAL_MS = 780;
const RESULT_REVEAL_DELAY_MS = 1250;

const ascensionRemovedPieces: PieceType[] = ['knight', 'bishop', 'rook'];
const ascensionPieceLabels: Record<PieceType, string> = {
  king: 'king',
  queen: 'queen',
  rook: 'rook',
  bishop: 'bishop',
  knight: 'knight',
  pawn: 'pawn',
};

function formatPieceList(pieces: PieceType[]): string {
  const labels = pieces.map((piece) => ascensionPieceLabels[piece]);
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function getAscensionMissingNote(tier: AscensionTier): string | null {
  if (tier === 0) return null;
  const missingPieces = formatPieceList(ascensionRemovedPieces.slice(0, tier));
  return `Missing your ${missingPieces}? Not a bug. You climbed the daily ladder, so we politely confiscated ${tier === 1 ? 'it' : 'them'} to make the bot feel important. Keep winning and yes, we may borrow more.`;
}


type AscensionPopupTier = Exclude<AscensionTier, 0>;

type AscensionPopupCopy = {
  title: string;
  body: string;
  detail: string;
};

const ascensionPopupCopy: Record<AscensionPopupTier, AscensionPopupCopy> = {
  1: {
    title: 'Knight removed',
    body: 'Your knight is sitting out this daily AI round because you earned your first star.',
    detail: 'The bot keeps its full army, so look for pawn breaks and queen activity to make up for the missing jumper.',
  },
  2: {
    title: 'Bishop removed',
    body: 'Your bishop is now removed too after your second daily AI star.',
    detail: 'You are playing without your knight and bishop. Keep lanes open and trade carefully before the bot uses its extra minor pieces.',
  },
  3: {
    title: 'Knight, bishop, and rook removed',
    body: 'You reached the final daily boss: your knight, bishop, and rook are all removed from your side.',
    detail: 'This is intentional ascension difficulty. The bot still starts complete, so every tempo and capture matters.',
  },
};

function ascensionPopupStorageKey(tier: AscensionPopupTier) {
  return `daily-ai-ascension-removal-popup-seen-${tier}`;
}

function hasSeenAscensionPopup(tier: AscensionPopupTier) {
  return typeof localStorage !== 'undefined' && localStorage.getItem(ascensionPopupStorageKey(tier)) === 'true';
}

function markAscensionPopupSeen(tier: AscensionPopupTier) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(ascensionPopupStorageKey(tier), 'true');
}

function getPendingAscensionPopupTier(isDailyAI: boolean, tier: AscensionTier): AscensionPopupTier | null {
  if (!isDailyAI || tier === 0) return null;
  return hasSeenAscensionPopup(tier) ? null : tier;
}

const modeConfig: Record<MatchMode, { label: string; maxGames: number; winsRequired: number }> = {
  single: { label: 'One Match', maxGames: 1, winsRequired: 1 },
  'best-of-3': { label: 'Best 2 / 3', maxGames: 3, winsRequired: 2 },
  'best-of-5': { label: 'Best 3 / 5', maxGames: 5, winsRequired: 3 },
};

function getWinner(status: GameStatus): Color | null {
  if (status === 'white_won') return 'white';
  if (status === 'black_won') return 'black';
  return null;
}

function getRoundMessage(status: GameStatus, drawReason?: RoundResult['drawReason']): string {
  if (status === 'white_won') return 'Checkmate - White wins this game!';
  if (status === 'black_won') return 'Checkmate - Black wins this game!';
  if (status === 'draw' && drawReason === 'stalemate') return 'Stalemate - no legal moves, so the game is drawn.';
  if (status === 'draw') return 'Draw agreed for this game.';
  return '';
}

function getBotLevel(matchMode: MatchMode, score: MatchScore, winsRequired: number, roundNumber: number, adaptation: BotAdaptationProfile): BotLevel {
  if (adaptation.lossStreak >= 3) return 'random';
  if (adaptation.lossStreak >= 2) return 'weak';
  if (adaptation.winStreak >= 3) return 'powerful';
  if (adaptation.winStreak >= 2) return 'strong';
  if (matchMode === 'single') return 'medium';
  if (score.white === winsRequired - 1 && score.black < winsRequired - 1) return 'powerful';
  if (roundNumber > 1 || score.black > score.white) return 'medium';
  return 'weak';
}


function getBotLevelForDailyDifficulty(difficulty: DailyAIDifficulty): BotLevel {
  if (difficulty === 'random') return 'random';
  if (difficulty === 'easy') return 'weak';
  if (difficulty === 'medium') return 'medium';
  if (difficulty === 'hard') return 'strong';
  return 'powerful';
}

function getAscensionTierForDailyDifficulty(difficulty: DailyAIDifficulty | null): AscensionTier {
  if (difficulty === 'random' || difficulty === 'easy') return 0;
  if (difficulty === 'medium') return 1;
  if (difficulty === 'hard') return 2;
  if (difficulty === 'extreme') return 3;
  return 0;
}

function getDailyProgressionMessage(progress: DailyAIProgress, didPlayerWin: boolean): string {
  if (!didPlayerWin) return 'No star lost. Retry the same bot.';
  if (progress.stars === 0) return 'Star earned. Medium bot unlocked.';
  if (progress.stars === 1) return 'Star earned. Hard bot unlocked.';
  if (progress.stars === 2) return 'Third star earned. Final boss unlocked.';
  return 'Magic star unlocked.';
}

function cloneBoard(board: ChessBoard): ChessBoard {
  return board.map((square) => ({ ...square, piece: square.piece ? { ...square.piece } : null }));
}

type ValidSeedValidation = Extract<ReturnType<typeof validateSeedInput>, { ok: true }>;

type BotGameContentProps = BotGamePageProps & {
  seedValidation: ValidSeedValidation | null;
};

function InvalidSeedPanel({ customSeed, error, onHome, onCustomSeed, onDaily, onRandomSetup }: BotGamePageProps & { error: string }) {
  return (
    <main className="game-page invalid-seed-page">
      <section className="invalid-seed-card" role="alert" aria-labelledby="invalid-seed-title">
        <p className="eyebrow">Custom Seed</p>
        <h1 id="invalid-seed-title">That seed can&apos;t start a game.</h1>
        <p className="invalid-seed-copy">{error}</p>
        {customSeed && <p className="invalid-seed-value"><span>Entered seed</span><strong>{customSeed}</strong></p>}
        <div className="panel-actions centered-actions">
          <button type="button" className="secondary-action" onClick={onCustomSeed}><Shuffle size={18} /> Return to Custom Seed</button>
          <button type="button" onClick={onDaily}><CalendarDays size={18} /> Play Today&apos;s Daily</button>
          <button type="button" className="gold-action" onClick={onRandomSetup}>Play Random Setup</button>
          <button type="button" onClick={onHome}>Go Home</button>
        </div>
      </section>
    </main>
  );
}

export function BotGamePage(props: BotGamePageProps) {
  const seedValidation = props.customSeed ? validateSeedInput(props.customSeed) : null;
  if (seedValidation && seedValidation.ok === false) return <InvalidSeedPanel {...props} error={seedValidation.error} />;
  return <BotGameContent {...props} seedValidation={seedValidation} />;
}

function BotGameContent({ matchMode, dateKey: requestedDateKey, customSeed, customBackRankCode, playerSide, activeChallengeContext, onHome, seedValidation }: BotGameContentProps) {
  const dailySeedInfo = useMemo(() => {
    if (seedValidation?.ok) {
      const safeBackRankCode = customBackRankCode && isValidBackRankCode(customBackRankCode) ? customBackRankCode.toUpperCase() : seedValidation.backRankCode;
      return { dateKey: getUtcDateKey(), seed: seedValidation.normalizedSeed, backRankCode: safeBackRankCode };
    }
    const todayKey = getUtcDateKey();
    const dateKey = requestedDateKey && requestedDateKey <= todayKey ? requestedDateKey : todayKey;
    const seed = getDailySeed(dateKey);
    return { dateKey, seed, backRankCode: dailyBackRankCodeFromSeed(seed) };
  }, [customBackRankCode, requestedDateKey, seedValidation]);
  const isDailyAI = !customSeed;
  const seedInfoLabel = isDailyAI ? '🌱 Daily seed' : '🌱 Random seed';
  const [dailyAIProgress, setDailyAIProgress] = useState(() => resetDailyAIProgressIfNeeded(dailySeedInfo.dateKey));
  const [botAdaptationProfile, setBotAdaptationProfile] = useState(readBotAdaptationProfile);
  const dailyAIDifficulty = isDailyAI ? getDailyAIDifficulty(dailyAIProgress) : null;
  const dailyAscensionTier = getAscensionTierForDailyDifficulty(dailyAIDifficulty);
  const ascensionMissingNote = isDailyAI ? getAscensionMissingNote(dailyAscensionTier) : null;
  const playerColor = playerSide ?? (isDailyAI ? getDailyAIPlayerColor(dailyAIProgress) : 'white');
  const botColor = getOpponent(playerColor);
  const initialBoardForMount = useMemo(() => {
    const dailyBoard = createInitialBoard({ backRankCode: dailySeedInfo.backRankCode });
    return isDailyAI ? removeAscensionPieces(dailyBoard, dailyAscensionTier, playerColor) : dailyBoard;
  }, [dailyAscensionTier, dailySeedInfo.backRankCode, isDailyAI, playerColor]);
  const [board, setBoard] = useState<ChessBoard>(() => initialBoardForMount);
  const [boardTimeline, setBoardTimeline] = useState<ChessBoard[]>(() => [cloneBoard(initialBoardForMount)]);
  const [turn, setTurn] = useState<Color>('white');
  const [status, setStatus] = useState<GameStatus>('active');
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<(Pick<Move, 'from' | 'to'> & { color?: Color; isCapture?: boolean; captureScore?: number | null }) | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [analysisByPly, setAnalysisByPly] = useState<Record<number, MoveAnalysis | undefined>>({});
  const [moveAnnouncement, setMoveAnnouncement] = useState('');
  const [score, setScore] = useState<MatchScore>({ white: 0, black: 0 });
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundResetId, setRoundResetId] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [isResultPanelReady, setIsResultPanelReady] = useState(false);
  const [isResultPanelDismissed, setIsResultPanelDismissed] = useState(false);
  const [matchWinner, setMatchWinner] = useState<Color | null>(null);
  const [isFlipped, setIsFlipped] = useState(() => playerColor === 'black');
  const [isBoardReady, setIsBoardReady] = useState(false);
  const [ascensionPopupTier, setAscensionPopupTier] = useState<AscensionPopupTier | null>(() => getPendingAscensionPopupTier(isDailyAI, dailyAscensionTier));
  const pendingDailyAIProgressRef = useRef<DailyAIProgress | null>(null);
  const [previewPly, setPreviewPly] = useState<number | null>(null);
  const [isHistoryAutoplaying, setIsHistoryAutoplaying] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState(() => getDisplayName());
  const [localBestScore, setLocalBestScore] = useState<CompletedScoreEntry | null>(null);
  const [submittedScore, setSubmittedScore] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [variationStartPly, setVariationStartPly] = useState<number | null>(null);
  const [variationBoard, setVariationBoard] = useState<ChessBoard | null>(null);
  const [variationTurn, setVariationTurn] = useState<Color | null>(null);
  const [variationLastMove, setVariationLastMove] = useState<(Pick<Move, 'from' | 'to'> & { color?: Color; isCapture?: boolean; captureScore?: number | null }) | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTaunt, setShareTaunt] = useState('');
  const [challengeUrl, setChallengeUrl] = useState('');
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);
  const historyListRef = useRef<HTMLOListElement | null>(null);
  const botMoveTimerRef = useRef<number | null>(null);
  const historyAutoplayTimerRef = useRef<number | null>(null);
  const resultRevealTimerRef = useRef<number | null>(null);
  const lastQueuedBotMoveKeyRef = useRef('');
  const recentBotMoveKeysRef = useRef<string[]>([]);
  const config = modeConfig[matchMode];
  const botLevel = dailyAIDifficulty ? getBotLevelForDailyDifficulty(dailyAIDifficulty) : getBotLevel(matchMode, score, config.winsRequired, roundNumber, botAdaptationProfile);
  const playerPowerTier = getPlayerPowerTier({ botLevel, dailyDifficulty: dailyAIDifficulty, dailyProgress: isDailyAI ? dailyAIProgress : null });
  const playerPowerLabel = getPowerRomanNumeral(playerPowerTier);
  const latestPly = boardTimeline.length - 1;
  const activeReviewPly = roundResult ? previewPly ?? latestPly : previewPly;
  const isPreviewing = previewPly !== null && previewPly < latestPly;
  const isVariationReview = Boolean(variationBoard && variationTurn);
  const displayBoard = variationBoard ?? (isPreviewing ? boardTimeline[previewPly] : board);
  const displayMove = variationLastMove ?? (isPreviewing && previewPly > 0 ? moveHistory[previewPly - 1] : lastMove);
  const displayTurn = variationTurn ?? (isPreviewing ? (previewPly % 2 === 0 ? 'white' : 'black') : turn);
  const displayedAnalysisPly = isVariationReview ? null : activeReviewPly && activeReviewPly > 0 ? activeReviewPly : !isPreviewing && latestPly > 0 ? latestPly : null;
  const currentAnalysis = displayedAnalysisPly ? analysisByPly[displayedAnalysisPly] ?? null : null;
  const currentReviewMove = roundResult && activeReviewPly && activeReviewPly > 0 ? moveHistory[activeReviewPly - 1] ?? null : null;
  const variationAnalysis = useMemo<MoveAnalysis | null>(() => {
    if (!variationBoard || !variationTurn) return null;
    return { bestMove: getBestMoveForPosition({ board: variationBoard, sideToMove: variationTurn }), isBestMove: false };
  }, [variationBoard, variationTurn]);
  const boardAnalysis = variationAnalysis ?? currentAnalysis;
  const checkedKingIndex = useMemo(
    () => (displayBoard.length && isKingInCheck(displayBoard, displayTurn) ? findKingIndex(displayBoard, displayTurn) : null),
    [displayBoard, displayTurn],
  );



  useEffect(() => {
    if (!activeReviewPly || activeReviewPly <= 0) return;
    if (analysisByPly[activeReviewPly]) return;
    const actualMove = moveHistory[activeReviewPly - 1];
    const boardBeforeMove = boardTimeline[activeReviewPly - 1];
    if (!actualMove || !boardBeforeMove) return;

    const analysis = analyzeMove(boardBeforeMove, actualMove);
    setAnalysisByPly((cachedAnalysis) => ({ ...cachedAnalysis, [activeReviewPly]: analysis }));
  }, [activeReviewPly, analysisByPly, boardTimeline, moveHistory]);

  useEffect(() => {
    pendingDailyAIProgressRef.current = null;
    if (isDailyAI) setDailyAIProgress(resetDailyAIProgressIfNeeded(dailySeedInfo.dateKey));
  }, [dailySeedInfo.dateKey, isDailyAI]);

  useEffect(() => () => {
    if (botMoveTimerRef.current !== null) window.clearTimeout(botMoveTimerRef.current);
    if (historyAutoplayTimerRef.current !== null) window.clearTimeout(historyAutoplayTimerRef.current);
    if (resultRevealTimerRef.current !== null) window.clearTimeout(resultRevealTimerRef.current);
  }, []);


  const scoreBreakdown = useMemo(() => calculateGameScore({ status, side: playerColor, moveHistory, missingPlayerPieces: dailyAscensionTier }), [dailyAscensionTier, moveHistory, playerColor, status]);
  const headerScoreValue = status === 'active' ? scoreBreakdown.capturePoints : scoreBreakdown.totalScore;
  const headerScoreLabel = `Score ${headerScoreValue > 0 && status === 'active' ? '+' : ''}${headerScoreValue}`;
  const scoreMode = isDailyAI ? 'daily' : 'bot';

  useEffect(() => {
    if (!roundResult) return;
    const entry = saveLocalScoreEntry({
      seed: dailySeedInfo.seed,
      backRankCode: dailySeedInfo.backRankCode,
      mode: scoreMode,
      side: playerColor,
      result: roundResult.status,
      score: scoreBreakdown.totalScore,
      moves: scoreBreakdown.fullMoves,
    });
    setLocalBestScore(getLocalBestScore(dailySeedInfo.seed, scoreMode, playerColor) ?? entry);
    recordPlayStreak();
  }, [dailySeedInfo.backRankCode, dailySeedInfo.seed, playerColor, roundResult, scoreBreakdown.fullMoves, scoreBreakdown.totalScore, scoreMode]);

  useEffect(() => {
    if (!roundResult || !isDailyAI) {
      setIsLeaderboardLoading(false);
      return undefined;
    }

    let isCancelled = false;
    setIsLeaderboardLoading(true);
    fetchLeaderboard(dailySeedInfo.seed, scoreMode)
      .then((entries) => {
        if (!isCancelled) setLeaderboard(entries);
      })
      .catch(() => {
        if (!isCancelled) setLeaderboard([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLeaderboardLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [dailySeedInfo.seed, isDailyAI, roundResult, scoreMode, submittedScore]);

  useEffect(() => {
    if (!roundResult) return;
    const seedSlugForScore = normalizeSeedSlug(dailySeedInfo.seed);
    submitSeedScore({
      seed_slug: seedSlugForScore,
      seed: dailySeedInfo.seed,
      back_rank_code: dailySeedInfo.backRankCode,
      player_id: getAnonymousPlayerId(),
      player_name: displayNameDraft,
      score: scoreBreakdown.totalScore,
      moves: scoreBreakdown.fullMoves,
      result: roundResult.status,
      color: playerColor,
      challenge_id: activeChallengeContext?.challengeId,
    }).catch((error) => console.warn('Seed score unavailable.', error));
  }, [activeChallengeContext?.challengeId, dailySeedInfo.backRankCode, dailySeedInfo.seed, displayNameDraft, playerColor, roundResult, scoreBreakdown.fullMoves, scoreBreakdown.totalScore]);

  useEffect(() => {
    const historyList = historyListRef.current;
    if (!historyList) return;

    const animationFrame = window.requestAnimationFrame(() => {
      if (activeReviewPly && activeReviewPly > 0) {
        const activeMove = historyList.querySelector<HTMLElement>(`[data-history-ply="${activeReviewPly}"]`);
        activeMove?.scrollIntoView({ block: 'center', inline: 'nearest' });
        return;
      }

      historyList.scrollTop = historyList.scrollHeight;
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeReviewPly, moveHistory.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedSquare(null);
        setLegalMoves([]);
        setPendingAction(null);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIsHistoryAutoplaying(false);
        setPreviewPly((ply) => Math.max((ply ?? latestPly) - 1, 0));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setIsHistoryAutoplaying(false);
        setPreviewPly((ply) => {
          const nextPly = Math.min((ply ?? latestPly) + 1, latestPly);
          return nextPly >= latestPly ? null : nextPly;
        });
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setIsHistoryAutoplaying(false);
        setPreviewPly(null);
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setIsHistoryAutoplaying(false);
        setPreviewPly(0);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [latestPly]);

  function pauseHistoryAutoplay() {
    setIsHistoryAutoplaying(false);
  }

  function clearReviewSelection() {
    setSelectedSquare(null);
    setLegalMoves([]);
  }

  function clearReviewVariation() {
    setVariationStartPly(null);
    setVariationBoard(null);
    setVariationTurn(null);
    setVariationLastMove(null);
    clearReviewSelection();
  }

  function goToStartReview() {
    pauseHistoryAutoplay();
    clearReviewVariation();
    setPreviewPly(0);
  }

  function goToPreviousReviewPly() {
    pauseHistoryAutoplay();
    clearReviewVariation();
    setPreviewPly((ply) => Math.max((ply ?? latestPly) - 1, 0));
  }

  function resumeOriginalReview() {
    pauseHistoryAutoplay();
    const resumePly = variationStartPly;
    clearReviewVariation();
    if (resumePly !== null) {
      setPreviewPly(resumePly >= latestPly ? null : resumePly);
      return;
    }
    setPreviewPly(null);
  }

  function goToLiveReview() {
    pauseHistoryAutoplay();
    resumeOriginalReview();
  }

  function goToNextReviewPly() {
    pauseHistoryAutoplay();
    clearReviewVariation();
    setPreviewPly((ply) => {
      const nextPly = Math.min((ply ?? latestPly) + 1, latestPly);
      return nextPly >= latestPly ? null : nextPly;
    });
  }

  function goToEndReview() {
    pauseHistoryAutoplay();
    clearReviewVariation();
    setPreviewPly(null);
  }

  function beginReviewVariationFromDisplayedPosition(): { board: ChessBoard; turn: Color } | null {
    if (!roundResult && previewPly === null) return null;
    const branchPly = previewPly ?? latestPly;
    const branchBoard = boardTimeline[branchPly];
    if (!branchBoard) return null;
    const branchTurn = branchPly % 2 === 0 ? 'white' : 'black';
    const clonedBoard = cloneBoard(branchBoard);
    pauseHistoryAutoplay();
    setVariationStartPly(branchPly);
    setVariationBoard(clonedBoard);
    setVariationTurn(branchTurn);
    setVariationLastMove(branchPly > 0 ? moveHistory[branchPly - 1] ?? null : null);
    clearReviewSelection();
    setPreviewPly(branchPly >= latestPly ? null : branchPly);
    setIsResultPanelDismissed(true);
    return { board: clonedBoard, turn: branchTurn };
  }

  function handleSelectHistoryPly(ply: number) {
    pauseHistoryAutoplay();
    clearReviewVariation();
    setPreviewPly(ply >= latestPly ? null : ply);
  }

  function toggleHistoryAutoplay() {
    if (moveHistory.length === 0) return;
    setIsHistoryAutoplaying((isPlaying) => {
      if (isPlaying) return false;
      clearReviewVariation();
      setPreviewPly((ply) => (ply === null || ply >= latestPly ? 0 : ply));
      return true;
    });
  }

  useEffect(() => {
    if (historyAutoplayTimerRef.current !== null) {
      window.clearTimeout(historyAutoplayTimerRef.current);
      historyAutoplayTimerRef.current = null;
    }

    if (!isHistoryAutoplaying || moveHistory.length === 0) return undefined;

    historyAutoplayTimerRef.current = window.setTimeout(() => {
      historyAutoplayTimerRef.current = null;
      setPreviewPly((ply) => {
        const currentPly = ply ?? 0;
        const nextPly = Math.min(currentPly + 1, latestPly);
        if (nextPly >= latestPly) {
          setIsHistoryAutoplaying(false);
          return null;
        }
        return nextPly;
      });
    }, HISTORY_AUTOPLAY_INTERVAL_MS);

    return () => {
      if (historyAutoplayTimerRef.current !== null) {
        window.clearTimeout(historyAutoplayTimerRef.current);
        historyAutoplayTimerRef.current = null;
      }
    };
  }, [isHistoryAutoplaying, latestPly, moveHistory.length, previewPly]);

  const finishRound = useCallback((nextStatus: GameStatus, drawReason?: RoundResult['drawReason']) => {
    const winner = getWinner(nextStatus);
    const didPlayerWin = winner === playerColor;
    let progressionMessage: string | undefined;

    if (isDailyAI) {
      progressionMessage = getDailyProgressionMessage(dailyAIProgress, didPlayerWin);
      pendingDailyAIProgressRef.current = getNextDailyAIProgress(dailyAIProgress, didPlayerWin ? 'win' : 'loss');
    } else {
      setBotAdaptationProfile((profile) => saveBotAdaptationProfile(getNextBotAdaptationProfile(profile, didPlayerWin)));
    }

    if (winner) {
      const updatedScore = { ...score, [winner]: score[winner] + 1 };
      setScore(updatedScore);
      if (!isDailyAI && updatedScore[winner] >= config.winsRequired) setMatchWinner(winner);
    }
    setIsResultPanelDismissed(false);
    setIsResultPanelReady(false);
    if (resultRevealTimerRef.current !== null) window.clearTimeout(resultRevealTimerRef.current);
    resultRevealTimerRef.current = window.setTimeout(() => {
      resultRevealTimerRef.current = null;
      setIsResultPanelReady(true);
    }, RESULT_REVEAL_DELAY_MS);
    setRoundResult({ status: nextStatus, winner, message: getRoundMessage(nextStatus, drawReason), progressionMessage, didPlayerWin, drawReason });
  }, [config.winsRequired, dailyAIProgress, isDailyAI, playerColor, score]);

  const completeMove = useCallback((move: Move) => {
    const nextBoard = applyMove(board, move);
    const nextTurn = getOpponent(move.piece.color);
    const nextStatus = getStatusForTurn(nextBoard, nextTurn);
    setBoard(nextBoard);
    setBoardTimeline((timeline) => [...timeline, cloneBoard(nextBoard)]);
    setTurn(nextTurn);
    setStatus(nextStatus);
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove({ from: move.from, to: move.to, color: move.piece.color, isCapture: move.isCapture, captureScore: move.capturedPiece ? getCaptureScore(move.capturedPiece.type) : null });
    setMoveAnnouncement(`${move.piece.color === 'white' ? 'White' : 'Black'} ${move.piece.type} moved from ${squareLabel(move.from % 5, Math.floor(move.from / 5))} to ${squareLabel(move.to % 5, Math.floor(move.to / 5))}${move.isCapture ? ' and captured a piece' : ''}.`);
    setAnalysisByPly((analysis) => ({ ...analysis, [moveHistory.length + 1]: analyzeMove(board, { from: move.from, to: move.to, promotion: move.promotionPiece ?? null, color: move.piece.color }) }));
    setMoveHistory((history) => [...history, createMoveRecord(move)]);
    setIsHistoryAutoplaying(false);
    setPreviewPly(null);
    playMoveSound(move.isCapture);
    if (nextStatus !== 'active') {
      playResultSound(getWinner(nextStatus) === playerColor);
      finishRound(nextStatus, nextStatus === 'draw' ? 'stalemate' : undefined);
    } else if (isKingInCheck(nextBoard, nextTurn)) {
      playCheckSound();
    }
  }, [board, finishRound, moveHistory.length, playerColor]);

  function resetRound(nextRoundNumber = roundNumber) {
    const pendingDailyProgress = isDailyAI ? pendingDailyAIProgressRef.current : null;
    const appliedDailyProgress = pendingDailyProgress ? saveDailyAIProgress(pendingDailyProgress) : dailyAIProgress;
    if (pendingDailyProgress) {
      pendingDailyAIProgressRef.current = null;
      setDailyAIProgress(appliedDailyProgress);
    }
    const roundDailyDifficulty = isDailyAI ? getDailyAIDifficulty(appliedDailyProgress) : null;
    const roundAscensionTier = getAscensionTierForDailyDifficulty(roundDailyDifficulty);
    const roundPlayerColor = isDailyAI ? getDailyAIPlayerColor(appliedDailyProgress) : playerColor;
    const dailyBoard = createInitialBoard({ backRankCode: dailySeedInfo.backRankCode });
    const initialBoard = isDailyAI ? removeAscensionPieces(dailyBoard, roundAscensionTier, roundPlayerColor) : dailyBoard;
    setBoard(initialBoard);
    setBoardTimeline([cloneBoard(initialBoard)]);
    setTurn('white');
    setStatus('active');
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setAnalysisByPly({});
    setMoveAnnouncement('');
    setSubmittedScore(false);
    setShareTaunt('');
    setChallengeUrl('');
    setCreatedChallengeId(null);
    setShareModalOpen(false);
    setRoundResult(null);
    setIsResultPanelReady(false);
    setIsResultPanelDismissed(false);
    setAscensionPopupTier(getPendingAscensionPopupTier(isDailyAI, roundAscensionTier));
    setPreviewPly(null);
    setVariationStartPly(null);
    setVariationBoard(null);
    setVariationTurn(null);
    setVariationLastMove(null);
    setIsHistoryAutoplaying(false);
    setIsFlipped(roundPlayerColor === 'black');
    setIsBoardReady(false);
    lastQueuedBotMoveKeyRef.current = '';
    if (botMoveTimerRef.current !== null) {
      window.clearTimeout(botMoveTimerRef.current);
      botMoveTimerRef.current = null;
    }
    if (resultRevealTimerRef.current !== null) {
      window.clearTimeout(resultRevealTimerRef.current);
      resultRevealTimerRef.current = null;
    }
    setRoundResetId((resetId) => resetId + 1);
    setRoundNumber(nextRoundNumber);
  }

  function restartMatch() {
    setScore({ white: 0, black: 0 });
    setMatchWinner(null);
    resetRound(1);
  }

  function requestRestart() {
    if (status === 'active' && !roundResult) {
      setPendingAction('restart');
      return;
    }
    restartMatch();
  }

  function nextRound() {
    if (!matchWinner) resetRound(Math.min(roundNumber + 1, config.maxGames));
  }

  function getDisplayedReviewPosition(): { board: ChessBoard; turn: Color } | null {
    if (variationBoard && variationTurn) return { board: variationBoard, turn: variationTurn };
    if (!roundResult && previewPly === null) return null;
    const reviewPly = previewPly ?? latestPly;
    const reviewBoard = boardTimeline[reviewPly];
    if (!reviewBoard) return null;
    return { board: reviewBoard, turn: reviewPly % 2 === 0 ? 'white' : 'black' };
  }

  function getOrCreateReviewVariation(): { board: ChessBoard; turn: Color } | null {
    if (variationBoard && variationTurn) return { board: variationBoard, turn: variationTurn };
    if (!roundResult && previewPly === null) return null;
    return beginReviewVariationFromDisplayedPosition();
  }

  function selectSquare(squareIndex: number): boolean {
    const reviewPosition = getDisplayedReviewPosition();
    const activeBoard = reviewPosition?.board ?? board;
    const activeTurn = reviewPosition?.turn ?? turn;
    const canSelect = Boolean(reviewPosition) || (status === 'active' && activeTurn === playerColor && !isPreviewing);
    if (!canSelect) return false;
    const piece = activeBoard[squareIndex]?.piece;
    if (piece?.color !== activeTurn) return false;
    setSelectedSquare(squareIndex);
    setLegalMoves(getLegalMoves(activeBoard, squareIndex));
    return true;
  }

  function completeVariationMove(move: Move, sourceBoard = variationBoard) {
    if (!sourceBoard) return;
    const nextBoard = applyMove(sourceBoard, move);
    const nextTurn = getOpponent(move.piece.color);
    setVariationBoard(nextBoard);
    setVariationTurn(nextTurn);
    setSelectedSquare(null);
    setLegalMoves([]);
    setVariationLastMove({ from: move.from, to: move.to, color: move.piece.color, isCapture: move.isCapture, captureScore: move.capturedPiece ? getCaptureScore(move.capturedPiece.type) : null });
    setMoveAnnouncement(`Analysis branch: ${move.piece.color === 'white' ? 'White' : 'Black'} ${move.piece.type} moved from ${squareLabel(move.from % 5, Math.floor(move.from / 5))} to ${squareLabel(move.to % 5, Math.floor(move.to / 5))}.`);
  }

  function tryMoveTo(squareIndex: number): boolean {
    const selectedMove = legalMoves.find((move) => move.to === squareIndex);
    if (!selectedMove) return false;
    const reviewPosition = getDisplayedReviewPosition() ? getOrCreateReviewVariation() : null;
    const canMove = Boolean(reviewPosition) || (status === 'active' && turn === playerColor && !isPreviewing);
    if (!canMove) return false;
    if (reviewPosition) completeVariationMove(selectedMove, reviewPosition.board);
    else completeMove(selectedMove);
    return true;
  }

  function handleSquareClick(squareIndex: number) {
    if (tryMoveTo(squareIndex)) return;
    if (selectSquare(squareIndex)) return;
    setSelectedSquare(null);
    setLegalMoves([]);
  }

  function handleDragStart(squareIndex: number): Move[] | null {
    const reviewPosition = getDisplayedReviewPosition();
    const activeBoard = reviewPosition?.board ?? board;
    const activeTurn = reviewPosition?.turn ?? turn;
    const canDrag = Boolean(reviewPosition) || (status === 'active' && activeTurn === playerColor && !isPreviewing);
    if (!canDrag) return null;
    const piece = activeBoard[squareIndex]?.piece;
    if (piece?.color !== activeTurn) return null;
    const moves = getLegalMoves(activeBoard, squareIndex);
    setSelectedSquare(squareIndex);
    setLegalMoves(moves);
    return moves;
  }

  function handleDrop(squareIndex: number, draggedMove?: Move) {
    if (draggedMove) {
      if (getDisplayedReviewPosition()) {
        const reviewPosition = getOrCreateReviewVariation();
        if (reviewPosition) completeVariationMove(draggedMove, reviewPosition.board);
      } else {
        completeMove(draggedMove);
      }
      return;
    }
    if (!tryMoveTo(squareIndex)) {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }

  function resign() {
    if (status !== 'active') return;
    const resignationStatus = playerColor === 'white' ? 'black_won' : 'white_won';
    setStatus(resignationStatus);
    finishRound(resignationStatus);
  }

  function requestDraw() {
    if (status !== 'active') return;
    setStatus('draw');
    finishRound('draw', 'agreed');
  }

  function confirmPendingAction() {
    if (pendingAction === 'resign') resign();
    if (pendingAction === 'draw') requestDraw();
    if (pendingAction === 'restart') restartMatch();
    setPendingAction(null);
  }

  useEffect(() => {
    if (botMoveTimerRef.current !== null) {
      window.clearTimeout(botMoveTimerRef.current);
      botMoveTimerRef.current = null;
    }

    if (!isBoardReady || status !== 'active' || turn !== botColor || isPreviewing) return undefined;

    const botMoveKey = `${roundResetId}-${moveHistory.length}-${turn}`;
    if (lastQueuedBotMoveKeyRef.current === botMoveKey) return undefined;
    lastQueuedBotMoveKeyRef.current = botMoveKey;

    const naturalDelay = BOT_MOVE_DELAY_MIN_MS + Math.floor(Math.random() * BOT_MOVE_DELAY_SPREAD_MS);
    botMoveTimerRef.current = window.setTimeout(() => {
      botMoveTimerRef.current = null;
      const botMove = getBotMoveByLevel(board, botColor, botLevel, { avoidMoveKeys: new Set(recentBotMoveKeysRef.current), bestMoveChance: getBestMoveChanceForPower(playerPowerTier) });
      if (botMove) {
        recentBotMoveKeysRef.current = [...recentBotMoveKeysRef.current.slice(-11), getMoveIdentity(botMove)];
        completeMove(botMove);
      }
    }, naturalDelay);

    return () => {
      if (botMoveTimerRef.current !== null) {
        window.clearTimeout(botMoveTimerRef.current);
        botMoveTimerRef.current = null;
      }
    };
  }, [board, botColor, botLevel, completeMove, isBoardReady, isPreviewing, moveHistory.length, playerPowerTier, roundResetId, status, turn]);

  const handleBoardSpawnComplete = useCallback(() => {
    setIsBoardReady(true);
  }, []);

  const activeLegalMoves = (isVariationReview || roundResult || !isPreviewing) && isBoardReady ? legalMoves : [];
  const headerStatusLabel = roundResult ? 'Game Over' : undefined;
  const headerTurnLabel = roundResult
    ? roundResult.status === 'draw'
      ? roundResult.drawReason === 'stalemate' ? 'Stalemate' : 'Draw agreed'
      : roundResult.didPlayerWin
        ? 'You won'
        : 'You lost'
    : undefined;
  const resultMarker = useMemo(() => {
    if (!roundResult || isResultPanelReady) return null;
    const markerTone: 'win' | 'loss' | 'draw' = roundResult.status === 'draw' ? 'draw' : roundResult.didPlayerWin ? 'win' : 'loss';
    const markerColor = roundResult.winner ? getOpponent(roundResult.winner) : playerColor;
    return {
      squareIndex: findKingIndex(displayBoard, markerColor),
      icon: markerTone === 'win' ? '🏆' : markerTone === 'loss' ? '💥' : '½',
      label: markerTone === 'win' ? 'You won' : markerTone === 'loss' ? 'You lost' : 'Draw',
      tone: markerTone,
    };
  }, [displayBoard, isResultPanelReady, playerColor, roundResult]);


  const seedSlug = normalizeSeedSlug(dailySeedInfo.seed);
  const displaySeedName = getSeedDisplayName(seedSlug);
  const resultLabel = roundResult?.drawReason === 'stalemate' ? 'stalemate' : roundResult?.status === 'draw' ? 'stalemate' : roundResult?.didPlayerWin ? 'win' : 'loss';
  const challengeComparison = useMemo(() => roundResult && activeChallengeContext ? compareChallengeResult({
    previousScore: activeChallengeContext.previousScore,
    previousMoves: activeChallengeContext.previousMoves,
    newScore: scoreBreakdown.totalScore,
    newMoves: scoreBreakdown.fullMoves,
    previousPlayerName: activeChallengeContext.previousPlayerName,
    newPlayerName: displayNameDraft,
    seedSlug,
  }) : null, [activeChallengeContext, displayNameDraft, roundResult, scoreBreakdown.fullMoves, scoreBreakdown.totalScore, seedSlug]);
  const comparisonText = useMemo(() => challengeComparison ? getRandomComparisonText({ outcome: challengeComparison.outcome, previousPlayerName: activeChallengeContext?.previousPlayerName, points: Math.abs(challengeComparison.pointsDelta) }) : undefined, [activeChallengeContext?.previousPlayerName, challengeComparison]);
  const tauntContext: TauntContext = roundResult ? getContextualTauntContext({
    result: resultLabel,
    score: scoreBreakdown.totalScore,
    moves: scoreBreakdown.fullMoves,
    previousScore: activeChallengeContext?.previousScore,
    beatPrevious: challengeComparison?.beatPrevious,
    isDaily: isDailyAI,
  }) : 'generic';
  const currentShareTaunt = useMemo(() => shareTaunt || (roundResult ? getRandomShareTaunt(tauntContext) : ''), [roundResult, shareTaunt, tauntContext]);
  const effectiveChallengeUrl = challengeUrl || createSeedChallengeUrl(seedSlug);
  const canUseBotGameActions = status === 'active' && !roundResult;
  const canAutoplayHistory = Boolean(roundResult && moveHistory.length > 0);
  const confirmActionClassName = pendingAction ? 'danger-action' : undefined;
  const restartActionLabel = canUseBotGameActions ? 'Restart Match' : 'Rematch';



  function startPostGameReview() {
    if (!roundResult || moveHistory.length === 0) return;
    setIsHistoryAutoplaying(false);
    setPreviewPly(1);
    setIsResultPanelDismissed(true);
  }

  const analysisPanel = roundResult ? (() => {
    if (isVariationReview) {
      const suggestedNotation = getMoveNotation(variationAnalysis?.bestMove ?? null);
      return <div className="analysis-panel analysis-panel-suggested analysis-branch-panel"><strong>Analysis branch</strong><span>{variationTurn === playerColor ? 'Your turn' : 'Bot side'} to move. Best move: {suggestedNotation}</span><span>Play any legal move to test the line, then Resume returns to the original replay.</span></div>;
    }
    if (!activeReviewPly || activeReviewPly <= 0 || !currentReviewMove) {
      return <div className="analysis-panel"><strong>Review</strong><span>Step through the game and see where the computer wanted to move.</span></div>;
    }
    const actualNotation = formatMoveNotation(currentReviewMove).text;
    if (!currentAnalysis) {
      return <div className="analysis-panel"><strong>Analysis</strong><span>Review preparing…</span></div>;
    }
    const sideLabel = currentReviewMove.color === 'white' ? 'White' : 'Black';
    const actorLabel = currentReviewMove.color === playerColor ? 'You' : 'Bot';
    const suggestedNotation = getMoveNotation(currentAnalysis.bestMove);
    return (
      <div className={currentAnalysis.isBestMove ? 'analysis-panel analysis-panel-best' : 'analysis-panel analysis-panel-suggested'}>
        <strong>Move {activeReviewPly} / {moveHistory.length}</strong>
        <span>{sideLabel} played: {actualNotation}</span>
        <span>{currentAnalysis.isBestMove ? (currentReviewMove.color === playerColor ? 'Nice. You found the best move. ⭐' : 'Bot played the suggested move. ⭐') : `${actorLabel === 'You' ? 'Computer preferred' : 'Suggested for bot'}: ${suggestedNotation}`}</span>
      </div>
    );
  })() : null;

  async function ensureChallengeRecord(finalShareText?: string, finalTaunt?: string): Promise<string> {
    if (!roundResult) return effectiveChallengeUrl;
    if (createdChallengeId) return createChallengeUrl(createdChallengeId);
    const savedName = saveDisplayName(displayNameDraft);
    const fallbackUrl = createSeedChallengeUrl(seedSlug);
    try {
      const parentChallengeId = activeChallengeContext?.challengeId ?? null;
      const chainRootId = activeChallengeContext?.chainRootId ?? parentChallengeId;
      const payload = createChallengePayload({
        seed: dailySeedInfo.seed,
        seedSlug,
        backRankCode: dailySeedInfo.backRankCode,
        displaySeedName,
        playerName: savedName,
        playerId: getAnonymousPlayerId(),
        score: scoreBreakdown.totalScore,
        moves: scoreBreakdown.fullMoves,
        result: roundResult.status,
        color: playerColor,
        parentChallengeId,
        chainRootId,
        chainDepth: activeChallengeContext ? (activeChallengeContext.chainDepth ?? 0) + 1 : 0,
        shareTaunt: finalTaunt ?? currentShareTaunt,
        shareText: finalShareText ?? null,
      });
      const record = await createChallenge(payload);
      setCreatedChallengeId(record.id);
      const url = createChallengeUrl(record.id);
      setChallengeUrl(url);
      return url;
    } catch (error) {
      console.warn('Challenge sharing unavailable; falling back to seed link.', error);
      setChallengeUrl(fallbackUrl);
      return fallbackUrl;
    }
  }

  async function copyChallengeLink() {
    const url = await ensureChallengeRecord();
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
  }

  function openShareModal() {
    setShareTaunt(getRandomShareTaunt(tauntContext, shareTaunt));
    setChallengeUrl((url) => url || createSeedChallengeUrl(seedSlug));
    setShareModalOpen(true);
  }

  async function handleSubmitScore() {
    if (!roundResult) return;
    try {
      saveDisplayName(displayNameDraft);
      await submitScore({
        seed: dailySeedInfo.seed,
        backRankCode: dailySeedInfo.backRankCode,
        mode: scoreMode,
        side: playerColor,
        result: roundResult.status,
        score: scoreBreakdown.totalScore,
        moves: scoreBreakdown.fullMoves,
      });
      setSubmittedScore(true);
    } catch (error) {
      console.warn('Could not submit score online, but the local score is saved.', error);
    }
  }

  useEffect(() => {
    if (!roundResult || submittedScore) return;
    void handleSubmitScore();
  // handleSubmitScore reads the latest completed score state and is intentionally triggered once per result.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundResult, submittedScore]);


  return (
    <main className="game-page">
      <GameHeader
        title="Play Against Bot"
        turn={turn}
        status={status}
        playerRole={`You are ${playerColor === 'white' ? 'White' : 'Black'}`}
        details={dailyAIDifficulty ? `Daily ladder · ${dailyAIDifficulty} bot · Power ${playerPowerLabel} · ${dailyAIProgress.stars}${dailyAIProgress.magicStarUnlocked ? ' + magic' : ''} stars` : `${config.label} · ${botLevel} bot · Power ${playerPowerLabel}`}
        onTitleClick={onHome}
        statusLabelOverride={headerStatusLabel}
        turnLabelOverride={headerTurnLabel}
        scoreLabel={headerScoreLabel}
      />
      <div className="game-layout chess-shell">
        <aside className="side-panel match-panel">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Match</p>
              <h2>{config.label}</h2>
            </div>
            <span className="mode-badge">{isDailyAI ? 'Daily' : '1v1'}</span>
          </div>
          <div className="score-stack">
            <CapturedScoreRow side="white" moves={moveHistory} scoringSide={playerColor} isActive={turn === 'white' && status === 'active'} />
            <CapturedScoreRow side="black" moves={moveHistory} scoringSide={playerColor} isActive={turn === 'black' && status === 'active'} />
          </div>
          <div className="info-stack">
            <p><span>▥ Bot level</span><strong>{dailyAIDifficulty ?? botLevel}</strong></p>
            <p><span>🛡️ Your power</span><strong><PowerShieldBadge tier={playerPowerTier} /></strong></p>
            <p><span>{seedInfoLabel}</span><strong>{dailySeedInfo.seed}</strong></p>
            <p><span>▣ Date</span><strong>{dailySeedInfo.dateKey}</strong></p>
            <p><span>Back rank</span><strong>{dailySeedInfo.backRankCode}</strong></p>
          </div>
          {ascensionMissingNote && (
            <p className="ascension-missing-note" aria-label="Daily ascension piece removal explanation">
              <span aria-hidden="true">🪄</span> {ascensionMissingNote}
            </p>
          )}
          <div className="match-actions">
            <button type="button" className="wide-action secondary-action" onClick={() => setIsFlipped((flipped) => !flipped)}><RotateCcw size={18} /> Flip Board</button>
          </div>
        </aside>

        <section className="board-column">
          <p className="sr-only" aria-live="polite">{moveAnnouncement}</p>
          <Board
            key={`${dailySeedInfo.seed}-${roundNumber}-${roundResetId}-${playerColor}`}
            ariaLabel={`Pocket Shuffle Chess ${dailySeedInfo.backRankCode} board. ${playerColor === 'white' ? 'White' : 'Black'} to play as you.`}
            board={displayBoard}
            selectedSquare={selectedSquare}
            legalMoves={activeLegalMoves}
            lastMove={displayMove}
            checkedKingIndex={checkedKingIndex}
            resultMarker={resultMarker}
            analysis={boardAnalysis}
            isFlipped={isFlipped}
            isInteractive={isBoardReady && (isVariationReview || isPreviewing || Boolean(roundResult) || (!isPreviewing && status === 'active'))}
            scoringSide={playerColor}
            spawnKey={roundResetId}
            onSquareClick={handleSquareClick}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragCancel={() => { setSelectedSquare(null); setLegalMoves([]); }}
            onSpawnComplete={handleBoardSpawnComplete}
          />
        </section>

        <aside className="side-panel review-panel history-panel">
          <div className="history-header">
            <div className="panel-topbar">
              <p className="eyebrow">Move History</p>
              <h2>Move history</h2>
            </div>
            <p className="panel-note">Click a move to review. Move any piece on the board to explore an alternate line; Live returns to the original replay.</p>
            {analysisPanel}
          </div>
          <ol ref={historyListRef} className="move-history move-list history-list">
            <MoveHistory
              moves={moveHistory}
              emptyPrimary="No moves yet."
              emptySecondary="Select a piece to see legal moves."
              activePly={activeReviewPly}
              scoringSide={playerColor}
              analysisByPly={analysisByPly}
              onSelectPly={handleSelectHistoryPly}
            />
          </ol>
          <div className="review-footer history-actions">
            <div className="review-controls">
              <button type="button" onClick={goToStartReview} disabled={moveHistory.length === 0}>⏮</button>
              <button type="button" onClick={goToPreviousReviewPly} disabled={moveHistory.length === 0}>‹</button>
              <button type="button" className={isVariationReview ? 'live-review-pending' : undefined} onClick={goToLiveReview}>{isVariationReview ? 'Resume' : 'Live'}</button>
              <button type="button" onClick={goToNextReviewPly} disabled={moveHistory.length === 0}>›</button>
              <button type="button" onClick={goToEndReview} disabled={moveHistory.length === 0}>⏭</button>
            </div>
            <div className={`panel-actions stacked-actions ${roundResult ? 'history-complete-actions' : ''}`}>
              {roundResult ? (
                <>
                  <button type="button" className="secondary-action" onClick={toggleHistoryAutoplay} disabled={!canAutoplayHistory || isVariationReview}>
                    {isHistoryAutoplaying ? <Pause size={18} /> : <Play size={18} />}
                    {isHistoryAutoplaying ? 'Pause History' : 'Play History'}
                  </button>
                  <button type="button" className="secondary-action history-home-action" onClick={onHome} aria-label="Go home"><Home size={18} /><span>Home</span></button>
                </>
              ) : (
                <>
                  <button type="button" className="secondary-action" onClick={() => setPendingAction('draw')} disabled={!canUseBotGameActions}><Handshake size={18} /> Request Draw</button>
                  <button type="button" className="danger-action" onClick={() => setPendingAction('resign')} disabled={!canUseBotGameActions}><Flag size={18} /> Resign</button>
                </>
              )}
              <button type="button" className="gold-action" onClick={requestRestart}>{restartActionLabel}</button>
            </div>
          </div>
        </aside>
      </div>
      {roundResult && isResultPanelReady && (
        <GameResultPanel
          result={roundResult.status === 'draw' && roundResult.drawReason === 'stalemate' ? 'stalemate' : roundResult.status === 'draw' ? 'draw' : roundResult.didPlayerWin ? 'win' : 'loss'}
          winner={roundResult.winner}
          eyebrow={matchWinner ? 'Match complete' : roundResult.drawReason === 'stalemate' ? 'Stalemate' : `Game ${roundNumber} complete`}
          title={matchWinner ? 'Match complete' : roundResult.drawReason === 'stalemate' ? 'Stalemate' : roundResult.status === 'draw' ? 'Draw agreed' : roundResult.didPlayerWin ? 'You won' : 'You lost'}
          summary={roundResult.message}
          progressionMessage={roundResult.progressionMessage}
          dismissed={isResultPanelDismissed}
          onDismiss={() => setIsResultPanelDismissed(true)}
          homeAction={(
            <button type="button" className="result-home-button" aria-label="Go home" onClick={onHome}>
              <Home size={24} aria-hidden="true" />
            </button>
          )}
          details={(
            <>
              <div className="score-result-bento" aria-label="Score breakdown">
                <div className="score-hero-tile">
                  <div className="score-label-row"><span className="score-label-text">Score</span><ScoreExplanation breakdown={scoreBreakdown} resultLabel={roundResult.drawReason === 'stalemate' ? 'stalemate' : roundResult.status === 'draw' ? 'draw' : roundResult.didPlayerWin ? 'win' : 'loss'} /></div>
                  <div className="score-value-row"><strong>{scoreBreakdown.totalScore}</strong></div>
                  {localBestScore && <small>Local best {localBestScore.score}</small>}
                </div>
                <div className="score-mini-grid">
                  <p><span>Result</span><strong>+{scoreBreakdown.resultBonus}</strong></p>
                  <p><span>Speed</span><strong>+{scoreBreakdown.speedBonus}</strong></p>
                  <p><span>Captures</span><strong>{scoreBreakdown.capturePoints >= 0 ? `+${scoreBreakdown.capturePoints}` : scoreBreakdown.capturePoints}</strong></p>
                  {scoreBreakdown.materialAdjustment > 0 && <p><span>Fairness</span><strong>+{scoreBreakdown.materialAdjustment}</strong></p>}
                  <p><span>Moves</span><strong>{scoreBreakdown.fullMoves}</strong></p>
                  <p><span>Seed</span><strong>{seedSlug}</strong></p>
                  <p><span>Side</span><strong>{playerColor === 'white' ? 'White' : 'Black'}</strong></p>
                  <p><span>Setup</span><strong>{dailySeedInfo.backRankCode}</strong></p>
                </div>
                <label className="name-capture-form inline-name-form power-name-form">
                  <span>Name <PowerShieldBadge tier={playerPowerTier} /></span>
                  <input value={displayNameDraft} onChange={(event) => setDisplayNameDraft(event.target.value)} onBlur={() => setDisplayNameDraft(saveDisplayName(displayNameDraft))} maxLength={20} />
                </label>
              </div>
              {activeChallengeContext && (
                <div className="challenge-comparison-box">
                  <h3>Previous challenge</h3>
                  <p>{activeChallengeContext.previousPlayerName} scored {activeChallengeContext.previousScore} in {activeChallengeContext.previousMoves} moves.</p>
                  <strong>{comparisonText ?? challengeComparison?.message}</strong>
                </div>
              )}
              <blockquote className="result-taunt">“{currentShareTaunt}”</blockquote>
              {isDailyAI && (isLeaderboardLoading || leaderboard.length > 0) && (
                <div className="leaderboard-mini result-leaderboard-card">
                  <div className="leaderboard-mini-heading">
                    <div>
                      <p className="eyebrow">Leaderboard</p>
                      <h3>Today’s Best Scores</h3>
                    </div>
                    {isLeaderboardLoading && <span className="leaderboard-loading-pill">Loading…</span>}
                  </div>
                  <div className={isLeaderboardLoading ? 'leaderboard-table leaderboard-result-list leaderboard-table-loading' : 'leaderboard-table leaderboard-result-list'} aria-busy={isLeaderboardLoading}>
                    {isLeaderboardLoading ? (
                      Array.from({ length: 3 }, (_, index) => (
                        <div className="leaderboard-row leaderboard-result-row leaderboard-skeleton-result-row" key={`leaderboard-skeleton-${index}`}>
                          <span className="leaderboard-rank-badge" />
                          <span className="leaderboard-skeleton-name" />
                          <span className="leaderboard-skeleton-score" />
                          <span className="leaderboard-skeleton-chip" />
                        </div>
                      ))
                    ) : leaderboard.slice(0, 3).map((entry, index) => (
                      <div className="leaderboard-row leaderboard-result-row" key={entry.id}>
                        <span className="leaderboard-rank-badge">{index + 1}</span>
                        <span className="leaderboard-player-name">{entry.display_name}</span>
                        <strong>{entry.score}</strong>
                        <span className="leaderboard-result-meta">{entry.moves} moves · {entry.side}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          actions={(
            <>
              <div className="result-action-row result-action-row-primary">
                <button type="button" className="result-primary-action result-share-action" onClick={openShareModal}><Share2 size={17} /> Challenge Friend</button>
                <button type="button" className="secondary-action result-primary-action result-review-action" onClick={startPostGameReview}><Sparkles size={18} /> Review Game</button>
              </div>
              <div className="result-action-row result-action-row-tools">
                <ResultScreenshotButton title={roundResult.didPlayerWin ? 'You won' : roundResult.status === 'draw' ? 'Draw' : 'You lost'} summary={roundResult.message} score={scoreBreakdown.totalScore} moves={scoreBreakdown.fullMoves} seed={seedSlug} setup={dailySeedInfo.backRankCode} className="result-tool-action result-screenshot-action" />
                <button type="button" className="secondary-action result-tool-action result-copy-action" onClick={() => { void copyChallengeLink(); }}><Copy size={22} /> Copy Link</button>
              </div>
              <div className="result-action-row result-action-row-secondary">
                <button type="button" className="secondary-action result-leaderboard-action" onClick={() => { window.history.pushState(null, '', `/seed/${encodeURIComponent(seedSlug)}/leaderboard`); window.dispatchEvent(new PopStateEvent('popstate')); }}><Trophy size={24} /> Seed Leaderboard</button>
                {!matchWinner && <button type="button" className="result-replay-action" onClick={nextRound}>Replay Seed</button>}
              </div>
              <div className="result-action-row result-action-row-rematch">
                <button type="button" className="result-other-side-action" onClick={() => { window.history.pushState(null, '', `/bot?seed=${encodeURIComponent(seedSlug)}&setup=${encodeURIComponent(dailySeedInfo.backRankCode)}&side=${playerColor === 'white' ? 'black' : 'white'}`); window.dispatchEvent(new PopStateEvent('popstate')); }}>Other Side</button>
                <button type="button" className="result-rematch-action" onClick={requestRestart}>Rematch</button>
              </div>
            </>
          )}
        />
      )}
      {roundResult && (
        <ShareChallengeModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          result={resultLabel}
          playerName={displayNameDraft}
          score={scoreBreakdown.totalScore}
          moves={scoreBreakdown.fullMoves}
          seedSlug={seedSlug}
          backRankCode={dailySeedInfo.backRankCode}
          challengeUrl={effectiveChallengeUrl}
          comparisonText={comparisonText ?? challengeComparison?.message}
          context={tauntContext}
          style={isDailyAI ? 'daily' : 'trashTalk'}
          initialTaunt={currentShareTaunt}
          onUseShareText={async (shareText, taunt) => {
            setShareTaunt(taunt);
            const url = await ensureChallengeRecord(shareText, taunt);
            if (url !== effectiveChallengeUrl) {
              const updatedText = buildShareMessage({ style: isDailyAI ? 'daily' : 'trashTalk', taunt, playerName: displayNameDraft, score: scoreBreakdown.totalScore, moves: scoreBreakdown.fullMoves, seedSlug, backRankCode: dailySeedInfo.backRankCode, challengeUrl: url, comparisonText: comparisonText ?? challengeComparison?.message });
              void updatedText;
            }
          }}
        />
      )}
      {ascensionPopupTier && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="ascension-removal-title">
          <div className="confirm-card ascension-removal-card">
            <p className="eyebrow">Daily ascension</p>
            <h2 id="ascension-removal-title">{ascensionPopupCopy[ascensionPopupTier].title}</h2>
            <p>{ascensionPopupCopy[ascensionPopupTier].body}</p>
            <p>{ascensionPopupCopy[ascensionPopupTier].detail}</p>
            <div className="panel-actions centered-actions">
              <button
                type="button"
                onClick={() => {
                  markAscensionPopupSeen(ascensionPopupTier);
                  setAscensionPopupTier(null);
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingAction && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <p className="eyebrow">Confirm</p>
            <h2>{pendingAction === 'resign' ? 'Resign this game?' : pendingAction === 'draw' ? 'Offer a draw?' : 'Rematch?'}</h2>
            <p>This action can change or reset the current game. Do you want to continue?</p>
            <div className="panel-actions centered-actions">
              <button type="button" className={confirmActionClassName} onClick={confirmPendingAction}>Continue</button>
              <button type="button" className="success-action" onClick={() => setPendingAction(null)}>Back to game</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
