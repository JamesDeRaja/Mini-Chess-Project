import { useEffect, useMemo, useState } from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { Board } from '../components/Board.js';
import { GameHeader } from '../components/GameHeader.js';
import { InvitePanel } from '../components/InvitePanel.js';
import { findKingIndex, isKingInCheck } from '../game/check.js';
import { getLegalMoves } from '../game/legalMoves.js';
import { deriveBackRankCodeFromBoard, estimateMaterialScores } from '../game/seed.js';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveRecord } from '../game/types.js';
import { joinOnlineGame, submitOnlineMove } from '../multiplayer/gameApi.js';
import { getPlayerId } from '../multiplayer/playerSession.js';
import { subscribeToGame, unsubscribeFromGame } from '../multiplayer/realtime.js';
import { isSupabaseConfigured } from '../multiplayer/supabaseClient.js';
import type { MatchMode } from './BotGamePage.js';

type OnlineGamePageProps = {
  gameId: string;
  matchMode: MatchMode;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onHome: () => void;
};

export function OnlineGamePage({ gameId, matchMode, theme, onToggleTheme, onHome }: OnlineGamePageProps) {
  const [board, setBoard] = useState<ChessBoard>([]);
  const [turn, setTurn] = useState<Color>('white');
  const [status, setStatus] = useState<GameStatus>('waiting');
  const [role, setRole] = useState<Color | 'spectator'>('spectator');
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [seedLabel, setSeedLabel] = useState('Random');
  const [backRankCode, setBackRankCode] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [scores, setScores] = useState({ whiteScore: 0, blackScore: 0 });
  const [error, setError] = useState<string | null>(null);
  const playerId = useMemo(() => getPlayerId(), []);
  const inviteLink = `${window.location.origin}/game/${gameId}?mode=${matchMode}`;
  const shareText = `Pocket Shuffle Chess ${seedLabel} (${backRankCode ?? 'setup pending'}) — ${status.replace('_', ' ')} after ${moveHistory.length} moves. ${inviteLink}`;
  const checkedKingIndex = useMemo(() => (board.length && isKingInCheck(board, turn) ? findKingIndex(board, turn) : null), [board, turn]);

  function applyGameRecord(game: Awaited<ReturnType<typeof joinOnlineGame>>['game']) {
    const safeMoveHistory = game.move_history ?? [];
    const derivedBackRankCode = game.back_rank_code ?? deriveBackRankCodeFromBoard(game.board);
    const estimatedScores = estimateMaterialScores(safeMoveHistory);
    setBoard(game.board);
    setTurn(game.turn);
    setStatus(game.status);
    setMoveHistory(safeMoveHistory);
    setSeedLabel(game.seed ?? 'Random');
    setBackRankCode(derivedBackRankCode);
    setRoundNumber(game.round_number ?? 1);
    setScores({
      whiteScore: game.white_score ?? estimatedScores.whiteScore,
      blackScore: game.black_score ?? estimatedScores.blackScore,
    });
  }

  useEffect(() => {
    joinOnlineGame(gameId, playerId)
      .then(({ game, role: joinedRole }) => {
        applyGameRecord(game);
        setRole(joinedRole);
      })
      .catch((joinError: Error) => setError(joinError.message));
  }, [gameId, playerId]);

  useEffect(() => {
    const channel = subscribeToGame(gameId, (game) => {
      applyGameRecord(game);
      setSelectedSquare(null);
      setLegalMoves([]);
    });

    return () => unsubscribeFromGame(channel);
  }, [gameId]);

  async function handleSquareClick(squareIndex: number) {
    if (status !== 'active' || role !== turn) return;

    const selectedMove = legalMoves.find((move) => move.to === squareIndex);
    if (selectedMove) {
      setLastMove(selectedMove);
      try {
        const { game } = await submitOnlineMove(gameId, playerId, selectedMove);
        applyGameRecord(game);
      } catch (moveError) {
        setError(moveError instanceof Error ? moveError.message : 'Unable to submit move');
      }
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = board[squareIndex]?.piece;
    if (piece?.color === role) {
      setSelectedSquare(squareIndex);
      setLegalMoves(getLegalMoves(board, squareIndex));
    }
  }

  return (
    <main className="game-page">
      <div className="panel-topbar">
        <GameHeader title="Online Game" turn={turn} status={status} playerRole={`You are ${role}`} details={`Mode: ${matchMode}`} onTitleClick={onHome} />
        <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle light and dark theme">
          {theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
      {!isSupabaseConfigured && <p className="notice">Supabase environment variables are required for live multiplayer.</p>}
      {error && <p className="error-message">{error}</p>}
      <InvitePanel inviteLink={inviteLink} onCopy={() => navigator.clipboard.writeText(inviteLink)} />
      {board.length > 0 && (
        <div className="game-layout">
          <Board
            board={board}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            lastMove={lastMove}
            checkedKingIndex={checkedKingIndex}
            onSquareClick={handleSquareClick}
          />
          <aside className="side-panel">
            <h2>Seed</h2>
            <p><strong>{seedLabel}</strong></p>
            <p>Back rank: {backRankCode ?? 'Derived after board loads'} · Round {roundNumber}</p>
            <p>Score: White {scores.whiteScore} · Black {scores.blackScore}</p>
            <button className="secondary-action compact-action" onClick={() => navigator.clipboard.writeText(shareText)}>Copy result/share text</button>
            <h2>Players</h2>
            <p>Only the player whose color matches the current turn can move.</p>
            <h2>Move history</h2>
            <ol className="move-history">
              {moveHistory.map((record, moveIndex) => (
                <li key={`${record.timestamp}-${moveIndex}`}>{record.color} {record.piece}: {record.from}→{record.to}</li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </main>
  );
}
