/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Flag, Handshake, RotateCcw, Shuffle } from 'lucide-react';
import { Board } from '../components/Board.js';
import { GameHeader } from '../components/GameHeader.js';
import { GameResultPanel } from '../components/GameResultPanel.js';
import { MoveHistory } from '../components/MoveHistory.js';
import { applyMove, createMoveRecord } from '../game/applyMove.js';
import { removeAscensionPieces, type AscensionTier } from '../game/ascension.js';
import { type BotLevel, getBotMoveByLevel, getMoveIdentity } from '../game/bot.js';
import {
  type DailyAIDifficulty,
  type DailyAIProgress,
  getDailyAIDifficulty,
  getDailyAIPlayerColor,
  handleDailyAIGameResult,
  resetDailyAIProgressIfNeeded,
} from '../game/dailyAIProgress.js';
import { findKingIndex, isKingInCheck } from '../game/check.js';
import { createInitialBoard } from '../game/createInitialBoard.js';
import { squareLabel } from '../game/coordinates.js';
import { getOpponent, getStatusForTurn } from '../game/gameStatus.js';
import { getLegalMoves } from '../game/legalMoves.js';
import { backRankCodeFromSeed, getDailySeed, getUtcDateKey, isValidBackRankCode, validateSeedInput } from '../game/seed.js';
import { playCheckSound, playMoveSound, playResultSound } from '../game/sound.js';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveRecord, PieceType } from '../game/types.js';

export type MatchMode = 'single' | 'best-of-3' | 'best-of-5';

type BotGamePageProps = {
  matchMode: MatchMode;
  dateKey?: string;
  customSeed?: string;
  customBackRankCode?: string;
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
};

type PendingAction = 'resign' | 'draw' | 'restart' | null;

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

function getRoundMessage(status: GameStatus): string {
  if (status === 'white_won') return 'Checkmate - White wins this game!';
  if (status === 'black_won') return 'Checkmate - Black wins this game!';
  if (status === 'draw') return 'Draw agreed for this game.';
  return '';
}

function getBotLevel(matchMode: MatchMode, score: MatchScore, winsRequired: number, roundNumber: number): BotLevel {
  if (matchMode === 'single') return 'medium';
  if (score.white === winsRequired - 1 && score.black < winsRequired - 1) return 'powerful';
  if (roundNumber > 1 || score.black > score.white) return 'medium';
  return 'weak';
}


function getBotLevelForDailyDifficulty(difficulty: DailyAIDifficulty): BotLevel {
  if (difficulty === 'easy') return 'weak';
  if (difficulty === 'medium') return 'medium';
  return 'powerful';
}

function getAscensionTierForDailyDifficulty(difficulty: DailyAIDifficulty | null): AscensionTier {
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
  if (seedValidation && !seedValidation.ok) return <InvalidSeedPanel {...props} error={seedValidation.error} />;
  return <BotGameContent {...props} seedValidation={seedValidation} />;
}

function BotGameContent({ matchMode, dateKey: requestedDateKey, customSeed, customBackRankCode, onHome, seedValidation }: BotGameContentProps) {
  const dailySeedInfo = useMemo(() => {
    if (seedValidation?.ok) {
      const safeBackRankCode = customBackRankCode && isValidBackRankCode(customBackRankCode) ? customBackRankCode.toUpperCase() : seedValidation.backRankCode;
      return { dateKey: 'Custom', seed: seedValidation.normalizedSeed, backRankCode: safeBackRankCode };
    }
    const todayKey = getUtcDateKey();
    const dateKey = requestedDateKey && requestedDateKey <= todayKey ? requestedDateKey : todayKey;
    const seed = getDailySeed(dateKey);
    return { dateKey, seed, backRankCode: backRankCodeFromSeed(seed) };
  }, [customBackRankCode, requestedDateKey, seedValidation]);
  const isDailyAI = !customSeed;
  const [dailyAIProgress, setDailyAIProgress] = useState(() => resetDailyAIProgressIfNeeded(dailySeedInfo.dateKey));
  const dailyAIDifficulty = isDailyAI ? getDailyAIDifficulty(dailyAIProgress) : null;
  const dailyAscensionTier = getAscensionTierForDailyDifficulty(dailyAIDifficulty);
  const ascensionMissingNote = isDailyAI ? getAscensionMissingNote(dailyAscensionTier) : null;
  const playerColor = isDailyAI ? getDailyAIPlayerColor(dailyAIProgress) : 'white';
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
  const [lastMove, setLastMove] = useState<(Pick<Move, 'from' | 'to'> & { isCapture?: boolean }) | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');
  const [score, setScore] = useState<MatchScore>({ white: 0, black: 0 });
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundResetId, setRoundResetId] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [matchWinner, setMatchWinner] = useState<Color | null>(null);
  const [isFlipped, setIsFlipped] = useState(() => playerColor === 'black');
  const [isBoardReady, setIsBoardReady] = useState(false);
  const [ascensionPopupTier, setAscensionPopupTier] = useState<AscensionPopupTier | null>(() => getPendingAscensionPopupTier(isDailyAI, dailyAscensionTier));
  const [previewPly, setPreviewPly] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const historyListRef = useRef<HTMLOListElement | null>(null);
  const botMoveTimerRef = useRef<number | null>(null);
  const lastQueuedBotMoveKeyRef = useRef('');
  const recentBotMoveKeysRef = useRef<string[]>([]);
  const config = modeConfig[matchMode];
  const botLevel = dailyAIDifficulty ? getBotLevelForDailyDifficulty(dailyAIDifficulty) : getBotLevel(matchMode, score, config.winsRequired, roundNumber);
  const latestPly = boardTimeline.length - 1;
  const isPreviewing = previewPly !== null && previewPly < latestPly;
  const displayBoard = isPreviewing ? boardTimeline[previewPly] : board;
  const displayMove = isPreviewing && previewPly > 0 ? moveHistory[previewPly - 1] : lastMove;
  const checkedKingIndex = useMemo(
    () => (!isPreviewing && displayBoard.length && isKingInCheck(displayBoard, turn) ? findKingIndex(displayBoard, turn) : null),
    [displayBoard, isPreviewing, turn],
  );

  useEffect(() => {
    if (isDailyAI) setDailyAIProgress(resetDailyAIProgressIfNeeded(dailySeedInfo.dateKey));
  }, [dailySeedInfo.dateKey, isDailyAI]);

  useEffect(() => {
    setAscensionPopupTier(getPendingAscensionPopupTier(isDailyAI, dailyAscensionTier));
  }, [dailyAscensionTier, isDailyAI]);

  useEffect(() => () => {
    if (botMoveTimerRef.current !== null) window.clearTimeout(botMoveTimerRef.current);
  }, []);

  useEffect(() => {
    const historyList = historyListRef.current;
    if (!historyList) return;

    historyList.scrollTop = historyList.scrollHeight;
  }, [moveHistory.length]);

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
        setPreviewPly((ply) => Math.max((ply ?? latestPly) - 1, 0));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setPreviewPly((ply) => {
          const nextPly = Math.min((ply ?? latestPly) + 1, latestPly);
          return nextPly >= latestPly ? null : nextPly;
        });
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setPreviewPly(null);
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setPreviewPly(0);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [latestPly]);

  const finishRound = useCallback((nextStatus: GameStatus) => {
    const winner = getWinner(nextStatus);
    const didPlayerWin = winner === playerColor;
    let progressionMessage: string | undefined;

    if (isDailyAI) {
      progressionMessage = getDailyProgressionMessage(dailyAIProgress, didPlayerWin);
      const nextProgress = handleDailyAIGameResult(dailyAIProgress, didPlayerWin ? 'win' : 'loss');
      setDailyAIProgress(nextProgress);
    }

    if (winner) {
      const updatedScore = { ...score, [winner]: score[winner] + 1 };
      setScore(updatedScore);
      if (!isDailyAI && updatedScore[winner] >= config.winsRequired) setMatchWinner(winner);
    }
    setRoundResult({ status: nextStatus, winner, message: getRoundMessage(nextStatus), progressionMessage, didPlayerWin });
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
    setLastMove({ from: move.from, to: move.to, isCapture: move.isCapture });
    setMoveAnnouncement(`${move.piece.color === 'white' ? 'White' : 'Black'} ${move.piece.type} moved from ${squareLabel(move.from % 5, Math.floor(move.from / 5))} to ${squareLabel(move.to % 5, Math.floor(move.to / 5))}${move.isCapture ? ' and captured a piece' : ''}.`);
    setMoveHistory((history) => [...history, createMoveRecord(move)]);
    setPreviewPly(null);
    playMoveSound(move.isCapture);
    if (nextStatus !== 'active') {
      playResultSound(getWinner(nextStatus) === playerColor);
      finishRound(nextStatus);
    } else if (isKingInCheck(nextBoard, nextTurn)) {
      playCheckSound();
    }
  }, [board, finishRound, playerColor]);

  function resetRound(nextRoundNumber = roundNumber) {
    const dailyBoard = createInitialBoard({ backRankCode: dailySeedInfo.backRankCode });
    const initialBoard = isDailyAI ? removeAscensionPieces(dailyBoard, dailyAscensionTier, playerColor) : dailyBoard;
    setBoard(initialBoard);
    setBoardTimeline([cloneBoard(initialBoard)]);
    setTurn('white');
    setStatus('active');
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setMoveAnnouncement('');
    setRoundResult(null);
    setPreviewPly(null);
    setIsFlipped(playerColor === 'black');
    setIsBoardReady(false);
    lastQueuedBotMoveKeyRef.current = '';
    if (botMoveTimerRef.current !== null) {
      window.clearTimeout(botMoveTimerRef.current);
      botMoveTimerRef.current = null;
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

  function selectSquare(squareIndex: number): boolean {
    if (status !== 'active' || turn !== playerColor || isPreviewing) return false;
    const piece = board[squareIndex]?.piece;
    if (piece?.color !== turn) return false;
    setSelectedSquare(squareIndex);
    setLegalMoves(getLegalMoves(board, squareIndex));
    return true;
  }

  function tryMoveTo(squareIndex: number): boolean {
    if (status !== 'active' || turn !== playerColor || isPreviewing) return false;
    const selectedMove = legalMoves.find((move) => move.to === squareIndex);
    if (selectedMove) {
      completeMove(selectedMove);
      return true;
    }
    return false;
  }

  function handleSquareClick(squareIndex: number) {
    if (tryMoveTo(squareIndex)) return;
    if (selectSquare(squareIndex)) return;
    setSelectedSquare(null);
    setLegalMoves([]);
  }

  function handleDragStart(squareIndex: number): Move[] | null {
    if (status !== 'active' || turn !== playerColor || isPreviewing) return null;
    const piece = board[squareIndex]?.piece;
    if (piece?.color !== turn) return null;
    const moves = getLegalMoves(board, squareIndex);
    setSelectedSquare(squareIndex);
    setLegalMoves(moves);
    return moves;
  }

  function handleDrop(squareIndex: number, draggedMove?: Move) {
    if (draggedMove) {
      completeMove(draggedMove);
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
    finishRound('draw');
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

    botMoveTimerRef.current = window.setTimeout(() => {
      botMoveTimerRef.current = null;
      const botMove = getBotMoveByLevel(board, botColor, botLevel, { avoidMoveKeys: new Set(recentBotMoveKeysRef.current) });
      if (botMove) {
        recentBotMoveKeysRef.current = [...recentBotMoveKeysRef.current.slice(-11), getMoveIdentity(botMove)];
        completeMove(botMove);
      }
    }, 300);

    return () => {
      if (botMoveTimerRef.current !== null) {
        window.clearTimeout(botMoveTimerRef.current);
        botMoveTimerRef.current = null;
      }
    };
  }, [board, botColor, botLevel, completeMove, isBoardReady, isPreviewing, moveHistory.length, roundResetId, status, turn]);

  const handleBoardSpawnComplete = useCallback(() => {
    setIsBoardReady(true);
  }, []);

  const activeLegalMoves = isPreviewing || !isBoardReady ? [] : legalMoves;
  const headerStatusLabel = roundResult ? 'Game Over' : undefined;
  const headerTurnLabel = roundResult
    ? roundResult.status === 'draw'
      ? 'Draw'
      : roundResult.didPlayerWin
        ? 'You won'
        : 'You lost'
    : undefined;

  return (
    <main className="game-page">
      <GameHeader
        title="Play Against Bot"
        turn={turn}
        status={status}
        playerRole={`You are ${playerColor === 'white' ? 'White' : 'Black'}`}
        details={dailyAIDifficulty ? `Daily ladder · ${dailyAIDifficulty} bot · ${dailyAIProgress.stars}${dailyAIProgress.magicStarUnlocked ? ' + magic' : ''} stars` : `${config.label} · Game ${roundNumber}/${config.maxGames} · ${botLevel} bot`}
        onTitleClick={onHome}
        statusLabelOverride={headerStatusLabel}
        turnLabelOverride={headerTurnLabel}
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
            <span className={turn === 'white' && status === 'active' ? 'active-score-row' : ''}><img className="score-dot piece-score-icon" src="/pieces/white-pawn.png" alt="" draggable={false} />White <strong>{score.white}</strong></span>
            <span className={turn === 'black' && status === 'active' ? 'active-score-row' : ''}><img className="score-dot piece-score-icon" src="/pieces/black-pawn.png" alt="" draggable={false} />Black <strong>{score.black}</strong></span>
          </div>
          <div className="info-stack">
            <p><span>🎮 Game</span><strong>{roundNumber}/{config.maxGames}</strong></p>
            <p><span>▥ Bot level</span><strong>{dailyAIDifficulty ?? botLevel}</strong></p>
            <p><span>🌱 Daily seed</span><strong>{dailySeedInfo.seed}</strong></p>
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
            selectedSquare={isPreviewing ? null : selectedSquare}
            legalMoves={activeLegalMoves}
            lastMove={displayMove}
            checkedKingIndex={checkedKingIndex}
            isFlipped={isFlipped}
            isInteractive={!isPreviewing && isBoardReady && status === 'active'}
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
            <p className="panel-note">Click a move to review. Use ←/→ to step, ↑ for live, ↓ for start, Esc to cancel.</p>
          </div>
          <ol ref={historyListRef} className="move-history move-list history-list">
            <MoveHistory
              moves={moveHistory}
              emptyPrimary="No moves yet."
              emptySecondary="Select a piece to see legal moves."
              activePly={previewPly}
              onSelectPly={(ply) => setPreviewPly(ply >= latestPly ? null : ply)}
            />
          </ol>
          <div className="review-footer history-actions">
            <div className="review-controls">
              <button type="button" onClick={() => setPreviewPly(0)} disabled={moveHistory.length === 0}>⏮</button>
              <button type="button" onClick={() => setPreviewPly((ply) => Math.max((ply ?? latestPly) - 1, 0))} disabled={moveHistory.length === 0}>‹</button>
              <button type="button" onClick={() => setPreviewPly(null)}>Live</button>
              <button type="button" onClick={() => setPreviewPly((ply) => { const nextPly = Math.min((ply ?? 0) + 1, latestPly); return nextPly >= latestPly ? null : nextPly; })} disabled={moveHistory.length === 0}>›</button>
              <button type="button" onClick={() => setPreviewPly(null)} disabled={moveHistory.length === 0}>⏭</button>
            </div>
            <div className="panel-actions stacked-actions">
              <button type="button" className="secondary-action" onClick={() => setPendingAction('draw')}><Handshake size={18} /> Request Draw</button>
              <button type="button" className="danger-action" onClick={() => setPendingAction('resign')}><Flag size={18} /> Resign</button>
              <button type="button" className="gold-action" onClick={requestRestart}>Restart Match</button>
            </div>
          </div>
        </aside>
      </div>
      {roundResult && (
        <GameResultPanel
          result={roundResult.status === 'draw' ? 'draw' : roundResult.didPlayerWin ? 'win' : 'loss'}
          winner={roundResult.winner}
          eyebrow={matchWinner ? 'Match complete' : `Game ${roundNumber} complete`}
          title={matchWinner ? `${matchWinner === 'white' ? 'White' : 'Black'} wins the match!` : roundResult.message}
          summary={`Score: White ${score.white} - Black ${score.black}. ${isDailyAI ? 'Daily ladder mode.' : matchMode === 'single' ? 'Single match mode.' : `First to ${config.winsRequired} wins.`}`}
          progressionMessage={roundResult.progressionMessage}
          actions={(
            <>
              {!matchWinner && roundResult.status !== 'draw' && <button type="button" onClick={nextRound}>Next Game</button>}
              {!matchWinner && roundResult.status === 'draw' && <button type="button" onClick={nextRound}>Replay Game</button>}
              <button type="button" onClick={requestRestart}>Restart Match</button>
            </>
          )}
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
            <h2>{pendingAction === 'resign' ? 'Resign this game?' : pendingAction === 'draw' ? 'Offer a draw?' : 'Restart the match?'}</h2>
            <p>This action can change or reset the current game. Do you want to continue?</p>
            <div className="panel-actions centered-actions">
              <button type="button" onClick={confirmPendingAction}>Continue</button>
              <button type="button" onClick={() => setPendingAction(null)}>Back to game</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
