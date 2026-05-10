import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart2, CalendarDays, Flag, Gamepad2, Grid3x3, Handshake, Layout, Moon, RotateCcw, Sprout, SunMedium } from 'lucide-react';
import { Board } from '../components/Board.js';
import { GameHeader } from '../components/GameHeader.js';
import { GameResultPanel } from '../components/GameResultPanel.js';
import { applyMove, createMoveRecord } from '../game/applyMove.js';
import { type BotLevel, getBotMoveByLevel } from '../game/bot.js';
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
import { backRankCodeFromSeed, getDailySeed, getUtcDateKey, normalizeSeed, resolveBackRankCode } from '../game/seed.js';
import { playCheckSound, playMoveSound, playResultSound } from '../game/sound.js';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveRecord } from '../game/types.js';

export type MatchMode = 'single' | 'best-of-3' | 'best-of-5';

type BotGamePageProps = {
  matchMode: MatchMode;
  dateKey?: string;
  customSeed?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onHome: () => void;
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

const modeConfig: Record<MatchMode, { label: string; badge: string; maxGames: number; winsRequired: number }> = {
  single: { label: 'One Match', badge: '1v1', maxGames: 1, winsRequired: 1 },
  'best-of-3': { label: 'Best 2 / 3', badge: 'Bo3', maxGames: 3, winsRequired: 2 },
  'best-of-5': { label: 'Best 3 / 5', badge: 'Bo5', maxGames: 5, winsRequired: 3 },
};

function getWinner(status: GameStatus): Color | null {
  if (status === 'white_won') return 'white';
  if (status === 'black_won') return 'black';
  return null;
}

function getRoundMessage(status: GameStatus): string {
  if (status === 'white_won') return 'Checkmate — White wins this game!';
  if (status === 'black_won') return 'Checkmate — Black wins this game!';
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

function moveSquareLabel(index: number): string {
  return squareLabel(index % 5, Math.floor(index / 5));
}

export function BotGamePage({ matchMode, dateKey: requestedDateKey, customSeed, theme, onToggleTheme, onHome }: BotGamePageProps) {
  const dailySeedInfo = useMemo(() => {
    if (customSeed) {
      const seed = normalizeSeed(customSeed);
      return { dateKey: 'Custom', seed, backRankCode: resolveBackRankCode(seed) };
    }
    const todayKey = getUtcDateKey();
    const dateKey = requestedDateKey && requestedDateKey <= todayKey ? requestedDateKey : todayKey;
    const seed = getDailySeed(dateKey);
    return { dateKey, seed, backRankCode: backRankCodeFromSeed(seed) };
  }, [customSeed, requestedDateKey]);

  const isDailyAI = !customSeed;
  const [dailyAIProgress, setDailyAIProgress] = useState(() => resetDailyAIProgressIfNeeded(dailySeedInfo.dateKey));
  const dailyAIDifficulty = isDailyAI ? getDailyAIDifficulty(dailyAIProgress) : null;
  const playerColor = isDailyAI ? getDailyAIPlayerColor(dailyAIProgress) : 'white';
  const botColor = getOpponent(playerColor);
  const initialBoardForMount = useMemo(() => createInitialBoard({ backRankCode: dailySeedInfo.backRankCode }), [dailySeedInfo.backRankCode]);
  const [board, setBoard] = useState<ChessBoard>(() => initialBoardForMount);
  const [boardTimeline, setBoardTimeline] = useState<ChessBoard[]>(() => [cloneBoard(initialBoardForMount)]);
  const [turn, setTurn] = useState<Color>('white');
  const [status, setStatus] = useState<GameStatus>('active');
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Pick<Move, 'from' | 'to'> | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [score, setScore] = useState<MatchScore>({ white: 0, black: 0 });
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [matchWinner, setMatchWinner] = useState<Color | null>(null);
  const [isFlipped, setIsFlipped] = useState(() => playerColor === 'black');
  const [previewPly, setPreviewPly] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const historyListRef = useRef<HTMLOListElement | null>(null);

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
      setIsFlipped(getDailyAIPlayerColor(nextProgress) === 'black');
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
    setLastMove({ from: move.from, to: move.to });
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
    const initialBoard = createInitialBoard({ backRankCode: dailySeedInfo.backRankCode });
    setBoard(initialBoard);
    setBoardTimeline([cloneBoard(initialBoard)]);
    setTurn('white');
    setStatus('active');
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setRoundResult(null);
    setPreviewPly(null);
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

  function handleDragStart(squareIndex: number): boolean {
    return selectSquare(squareIndex);
  }

  function handleDrop(squareIndex: number) {
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
    if (status !== 'active' || turn !== botColor || isPreviewing) return;

    const timeoutId = window.setTimeout(() => {
      const botMove = getBotMoveByLevel(board, botColor, botLevel);
      if (botMove) completeMove(botMove);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [board, botColor, botLevel, completeMove, isPreviewing, status, turn]);

  const activeLegalMoves = isPreviewing ? [] : legalMoves;
  const headerStatusLabel = roundResult ? 'Game Over' : undefined;
  const headerTurnLabel = roundResult
    ? roundResult.status === 'draw'
      ? 'Draw'
      : roundResult.didPlayerWin
        ? 'You won'
        : 'You lost'
    : undefined;

  const effectiveBotLevel = dailyAIDifficulty ?? botLevel;
  const detailsLine = dailyAIDifficulty
    ? `Daily ladder • ${dailyAIDifficulty} bot • ${dailyAIProgress.stars}${dailyAIProgress.magicStarUnlocked ? ' + magic' : ''} stars`
    : `${config.label} • Game ${roundNumber}/${config.maxGames} • ${botLevel} bot`;

  return (
    <main className="game-page">
      <GameHeader
        title="Play Against Bot"
        turn={turn}
        status={status}
        playerRole={`You are ${playerColor === 'white' ? 'White' : 'Black'}`}
        details={detailsLine}
        onTitleClick={onHome}
        statusLabelOverride={headerStatusLabel}
        turnLabelOverride={headerTurnLabel}
      />

      <div className="game-layout chess-shell">
        {/* ── Left panel ─────────────────────────────────────── */}
        <aside className="side-panel match-panel">
          <div className="panel-header">
            <p className="eyebrow">
              <Gamepad2 size={11} />
              Match
            </p>
            <div className="panel-title-row">
              <h2>{config.label}</h2>
              <span className="mode-badge">{config.badge}</span>
            </div>
          </div>

          <div className="score-stack">
            <div className="score-row">
              <span className="score-circle score-circle-white" />
              <span className="score-label">White</span>
              <strong className="score-value">{score.white}</strong>
            </div>
            <div className="score-row">
              <span className="score-circle score-circle-black" />
              <span className="score-label">Black</span>
              <strong className="score-value">{score.black}</strong>
            </div>
          </div>

          <div className="info-rows">
            <div className="info-row">
              <Gamepad2 size={14} className="info-icon" />
              <span className="info-label">Game</span>
              <span className="info-value">{roundNumber}/{config.maxGames}</span>
            </div>
            <div className="info-row">
              <BarChart2 size={14} className="info-icon" />
              <span className="info-label">Bot level</span>
              <span className="info-value info-value-accent">{effectiveBotLevel}</span>
            </div>
            <div className="info-row">
              <Sprout size={14} className="info-icon" />
              <span className="info-label">Daily seed</span>
              <span className="info-value info-value-accent">{dailySeedInfo.seed}</span>
            </div>
            <div className="info-row">
              <CalendarDays size={14} className="info-icon" />
              <span className="info-label">Date</span>
              <span className="info-value">{dailySeedInfo.dateKey}</span>
            </div>
            <div className="info-row">
              <Layout size={14} className="info-icon" />
              <span className="info-label">Back rank</span>
              <span className="info-value">{dailySeedInfo.backRankCode}</span>
            </div>
          </div>

          <div className="panel-buttons">
            <button type="button" className="wide-action" onClick={() => setIsFlipped((f) => !f)}>
              <RotateCcw size={16} /> Flip Board
            </button>
            <button type="button" className="wide-action" onClick={onToggleTheme}>
              {theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />} Theme
            </button>
          </div>
        </aside>

        {/* ── Board column ───────────────────────────────────── */}
        <section className="board-column">
          <div className="board-badge">
            <Sprout size={13} />
            <span className="board-badge-label">Daily Seed</span>
            <strong>{dailySeedInfo.seed}</strong>
          </div>
          <Board
            board={displayBoard}
            selectedSquare={isPreviewing ? null : selectedSquare}
            legalMoves={activeLegalMoves}
            lastMove={displayMove}
            checkedKingIndex={checkedKingIndex}
            isFlipped={isFlipped}
            isInteractive={!isPreviewing && status === 'active'}
            onSquareClick={handleSquareClick}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
          <div className="board-size-label">
            <Grid3x3 size={12} />
            5x6 Board
          </div>
        </section>

        {/* ── Right panel — move history ─────────────────────── */}
        <aside className="side-panel review-panel history-panel">
          <div className="history-header">
            <h2>
              <CalendarDays size={15} />
              Move History
            </h2>
            <p className="panel-note">
              Click a move to review. Use ←/→ to step, ↑ for live, ↓ for start, Esc to cancel.
            </p>
          </div>

          <ol ref={historyListRef} className="move-history move-list history-list">
            {moveHistory.length === 0 ? (
              <li className="empty-history">
                <span>No moves yet.</span>
                <span>Select a piece to see legal moves.</span>
              </li>
            ) : (
              moveHistory.map((record, moveIndex) => (
                <li key={`${record.timestamp}-${moveIndex}`}>
                  <button
                    type="button"
                    className={`history-move${previewPly === moveIndex + 1 ? ' active-history-move' : ''}`}
                    onClick={() => setPreviewPly(moveIndex + 1 >= latestPly ? null : moveIndex + 1)}
                  >
                    <span className="history-move-num">{moveIndex + 1}.</span>
                    <span className={`history-move-dot history-move-dot-${record.color}`} />
                    <span className="history-move-color">{record.color}</span>
                    <span className="history-move-piece">{record.piece}</span>
                    <span className="history-move-squares">
                      {moveSquareLabel(record.from)}–{moveSquareLabel(record.to)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ol>

          <div className="history-actions">
            <div className="review-controls">
              <button type="button" onClick={() => setPreviewPly(0)} disabled={moveHistory.length === 0} title="Start">⏮</button>
              <button type="button" onClick={() => setPreviewPly((ply) => Math.max((ply ?? latestPly) - 1, 0))} disabled={moveHistory.length === 0} title="Previous">‹</button>
              <button type="button" onClick={() => setPreviewPly(null)} title="Live">Live</button>
              <button type="button" onClick={() => setPreviewPly((ply) => { const next = Math.min((ply ?? 0) + 1, latestPly); return next >= latestPly ? null : next; })} disabled={moveHistory.length === 0} title="Next">›</button>
              <button type="button" onClick={() => setPreviewPly(null)} disabled={moveHistory.length === 0} title="End">⏭</button>
            </div>
            <div className="stacked-actions">
              <button type="button" onClick={() => setPendingAction('draw')}>
                <Handshake size={15} /> Request Draw
              </button>
              <button type="button" className="danger-action" onClick={() => setPendingAction('resign')}>
                <Flag size={15} /> Resign
              </button>
              <button type="button" className="primary-action restart-action" onClick={requestRestart}>
                <RotateCcw size={15} /> Restart Match
              </button>
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
          summary={`Score: White ${score.white} — Black ${score.black}. ${isDailyAI ? 'Daily ladder mode.' : matchMode === 'single' ? 'Single match mode.' : `First to ${config.winsRequired} wins.`}`}
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

      {pendingAction && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <p className="eyebrow">Confirm</p>
            <h2>
              {pendingAction === 'resign'
                ? 'Resign this game?'
                : pendingAction === 'draw'
                  ? 'Offer a draw?'
                  : 'Restart the match?'}
            </h2>
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
