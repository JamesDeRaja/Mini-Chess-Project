import { useEffect, useMemo, useState } from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { Board } from '../components/Board';
import { GameHeader } from '../components/GameHeader';
import { InvitePanel } from '../components/InvitePanel';
import { findKingIndex, isKingInCheck } from '../game/check';
import { getLegalMoves } from '../game/legalMoves';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveRecord } from '../game/types';
import { joinOnlineGame, submitOnlineMove } from '../multiplayer/gameApi';
import { getPlayerId } from '../multiplayer/playerSession';
import { subscribeToGame, unsubscribeFromGame } from '../multiplayer/realtime';
import { isSupabaseConfigured } from '../multiplayer/supabaseClient';
import type { MatchMode } from './BotGamePage';

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
  const [error, setError] = useState<string | null>(null);
  const playerId = useMemo(() => getPlayerId(), []);
  const inviteLink = `${window.location.origin}/game/${gameId}?mode=${matchMode}`;
  const checkedKingIndex = useMemo(() => (board.length && isKingInCheck(board, turn) ? findKingIndex(board, turn) : null), [board, turn]);

  useEffect(() => {
    joinOnlineGame(gameId, playerId)
      .then(({ game, role: joinedRole }) => {
        setBoard(game.board);
        setTurn(game.turn);
        setStatus(game.status);
        setMoveHistory(game.move_history);
        setRole(joinedRole);
      })
      .catch((joinError: Error) => setError(joinError.message));
  }, [gameId, playerId]);

  useEffect(() => {
    const channel = subscribeToGame(gameId, (game) => {
      setBoard(game.board);
      setTurn(game.turn);
      setStatus(game.status);
      setMoveHistory(game.move_history);
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
        setBoard(game.board);
        setTurn(game.turn);
        setStatus(game.status);
        setMoveHistory(game.move_history);
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
