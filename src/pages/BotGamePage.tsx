import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag, Handshake, Moon, RotateCcw, SunMedium, Trophy } from 'lucide-react';
import { Board } from '../components/Board';
import { GameHeader } from '../components/GameHeader';
import { applyMove, createMoveRecord } from '../game/applyMove';
import { type BotLevel, getBotMoveByLevel } from '../game/bot';
import { findKingIndex, isKingInCheck } from '../game/check';
import { createInitialBoard } from '../game/createInitialBoard';
import { squareLabel } from '../game/coordinates';
import { getOpponent, getStatusForTurn } from '../game/gameStatus';
import { getLegalMoves } from '../game/legalMoves';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveRecord } from '../game/types';

export type MatchMode = 'single' | 'best-of-3' | 'best-of-5';

type BotGamePageProps = {
  matchMode: MatchMode;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onHome: () => void;
};

type MatchScore = Record<Color, number>;
type RoundResult = {
  status: GameStatus;
  winner: Color | null;
  message: string;
};

type PendingAction = 'resign' | 'draw' | 'restart' | null;

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

function cloneBoard(board: ChessBoard): ChessBoard {
  return board.map((square) => ({ ...square, piece: square.piece ? { ...square.piece } : null }));
}

export function BotGamePage({ matchMode, theme, onToggleTheme, onHome }: BotGamePageProps) {
  const initialBoardForMount = useMemo(() => createInitialBoard(), []);
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
  const [isFlipped, setIsFlipped] = useState(false);
  const [previewPly, setPreviewPly] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const config = modeConfig[matchMode];
  const botLevel = getBotLevel(matchMode, score, config.winsRequired, roundNumber);
  const isPreviewing = previewPly !== null;
  const displayBoard = isPreviewing ? boardTimeline[previewPly] : board;
  const displayMove = isPreviewing && previewPly > 0 ? moveHistory[previewPly - 1] : lastMove;
  const checkedKingIndex = useMemo(
    () => (!isPreviewing && displayBoard.length && isKingInCheck(displayBoard, turn) ? findKingIndex(displayBoard, turn) : null),
    [displayBoard, isPreviewing, turn],
  );

  useEffect(() => {
    const initialBoard = createInitialBoard();
    setBoard(initialBoard);
    setBoardTimeline([cloneBoard(initialBoard)]);
    setTurn('white');
    setStatus('active');
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setScore({ white: 0, black: 0 });
    setRoundNumber(1);
    setRoundResult(null);
    setMatchWinner(null);
    setPreviewPly(null);
    setPendingAction(null);
  }, [matchMode]);

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
        setPreviewPly((ply) => Math.max((ply ?? boardTimeline.length - 1) - 1, 0));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setPreviewPly((ply) => Math.min((ply ?? boardTimeline.length - 1) + 1, boardTimeline.length - 1));
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
  }, [boardTimeline.length]);

  const finishRound = useCallback((nextStatus: GameStatus) => {
    const winner = getWinner(nextStatus);
    let updatedScore = score;
    if (winner) {
      updatedScore = { ...score, [winner]: score[winner] + 1 };
      setScore(updatedScore);
      if (updatedScore[winner] >= config.winsRequired) setMatchWinner(winner);
    }
    setRoundResult({ status: nextStatus, winner, message: getRoundMessage(nextStatus) });
  }, [config.winsRequired, score]);

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
    if (nextStatus !== 'active') finishRound(nextStatus);
  }, [board, finishRound]);

  function resetRound(nextRoundNumber = roundNumber) {
    const initialBoard = createInitialBoard();
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

  function nextRound() {
    if (!matchWinner) resetRound(Math.min(roundNumber + 1, config.maxGames));
  }

  function selectSquare(squareIndex: number): boolean {
    if (status !== 'active' || turn !== 'white' || isPreviewing) return false;
    const piece = board[squareIndex]?.piece;
    if (piece?.color !== turn) return false;
    setSelectedSquare(squareIndex);
    setLegalMoves(getLegalMoves(board, squareIndex));
    return true;
  }

  function tryMoveTo(squareIndex: number): boolean {
    if (status !== 'active' || turn !== 'white' || isPreviewing) return false;
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
    setStatus('black_won');
    finishRound('black_won');
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
    if (status !== 'active' || turn !== 'black' || isPreviewing) return;

    const timeoutId = window.setTimeout(() => {
      const botMove = getBotMoveByLevel(board, 'black', botLevel);
      if (botMove) completeMove(botMove);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [board, botLevel, completeMove, isPreviewing, status, turn]);

  const activeLegalMoves = isPreviewing ? [] : legalMoves;

  return (
    <main className="game-page">
      <GameHeader
        title="Play Against Bot"
        turn={turn}
        status={status}
        playerRole="You are White"
        details={`${config.label} · Game ${roundNumber}/${config.maxGames} · ${botLevel} bot`}
        onTitleClick={onHome}
      />
      <div className="game-layout chess-shell">
        <aside className="side-panel match-panel">
          <p className="eyebrow">Match</p>
          <h2>{config.label}</h2>
          <div className="score-stack">
            <span>White <strong>{score.white}</strong></span>
            <span>Black <strong>{score.black}</strong></span>
          </div>
          <p>Game {roundNumber}/{config.maxGames}</p>
          <p>Bot level: <strong>{botLevel}</strong></p>
          <button className="wide-action" onClick={() => setIsFlipped((flipped) => !flipped)}><RotateCcw size={18} /> Flip Board</button>
          <button className="wide-action" onClick={onToggleTheme}>{theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />} Theme</button>
        </aside>

        <section className="board-column">
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
        </section>

        <aside className="side-panel review-panel">
          <div className="panel-topbar">
            <h2>Move history</h2>
          </div>
          <p className="panel-note">Click a move to review. Use ←/→ to step, ↑ for live, ↓ for start, Esc to cancel.</p>
          <ol className="move-history move-list">
            {moveHistory.map((record, moveIndex) => (
              <li key={`${record.timestamp}-${moveIndex}`}>
                <button className={previewPly === moveIndex + 1 ? 'history-move active-history-move' : 'history-move'} onClick={() => setPreviewPly(moveIndex + 1)}>
                  <span>{moveIndex + 1}.</span>
                  <strong>{record.color}</strong>
                  <span>{record.piece}</span>
                  <span>{squareLabel(record.to % 5, Math.floor(record.to / 5))}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="review-footer">
            <div className="review-controls">
              <button onClick={() => setPreviewPly(0)} disabled={moveHistory.length === 0}>⏮</button>
              <button onClick={() => setPreviewPly((ply) => Math.max((ply ?? boardTimeline.length - 1) - 1, 0))} disabled={moveHistory.length === 0}>‹</button>
              <button onClick={() => setPreviewPly(null)}>Live</button>
              <button onClick={() => setPreviewPly((ply) => Math.min((ply ?? 0) + 1, boardTimeline.length - 1))} disabled={moveHistory.length === 0}>›</button>
              <button onClick={() => setPreviewPly(boardTimeline.length - 1)} disabled={moveHistory.length === 0}>⏭</button>
            </div>
            <div className="panel-actions stacked-actions">
              <button onClick={() => setPendingAction('draw')}><Handshake size={18} /> Request Draw</button>
              <button onClick={() => setPendingAction('resign')}><Flag size={18} /> Resign</button>
              <button onClick={() => setPendingAction('restart')}>Restart Match</button>
            </div>
          </div>
        </aside>
      </div>
      {roundResult && (
        <div className="winner-overlay" role="status">
          {roundResult.winner === 'white' && <div className="confetti" />}
          <div className={roundResult.winner === 'white' ? 'winner-card player-winner-card' : 'winner-card calm-result-card'}>
            {roundResult.winner === 'white' ? <Trophy size={48} /> : <span className="result-emoji">{roundResult.winner === 'black' ? '😅' : '🤝'}</span>}
            <p className="eyebrow">{matchWinner ? 'Match complete' : `Game ${roundNumber} complete`}</p>
            <h2>{matchWinner ? `${matchWinner === 'white' ? 'White' : 'Black'} wins the match!` : roundResult.message}</h2>
            <p>
              Score: White {score.white} — Black {score.black}. {matchMode === 'single' ? 'Single match mode.' : `First to ${config.winsRequired} wins.`}
            </p>
            <div className="panel-actions centered-actions">
              {!matchWinner && roundResult.status !== 'draw' && <button onClick={nextRound}>Next Game</button>}
              {!matchWinner && roundResult.status === 'draw' && <button onClick={nextRound}>Replay Game</button>}
              <button onClick={() => setPendingAction('restart')}>Restart Match</button>
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
              <button onClick={confirmPendingAction}>Continue</button>
              <button onClick={() => setPendingAction(null)}>Back to game</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
