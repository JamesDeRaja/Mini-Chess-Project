import { useEffect, useMemo, useRef, useState } from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { Board } from '../components/Board.js';
import { GameHeader } from '../components/GameHeader.js';
import { InvitePanel } from '../components/InvitePanel.js';
import { applyMove, createMoveRecord } from '../game/applyMove.js';
import { findKingIndex, isKingInCheck } from '../game/check.js';
import { createInitialBoard } from '../game/createInitialBoard.js';
import { getOpponent, getStatusForTurn } from '../game/gameStatus.js';
import { getLegalMoves } from '../game/legalMoves.js';
import { deriveBackRankCodeFromBoard, estimateMaterialScores } from '../game/seed.js';
import { playCheckSound, playMoveSound } from '../game/sound.js';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveRecord } from '../game/types.js';
import { createOnlineGame, joinOnlineGame, submitOnlineMove } from '../multiplayer/gameApi.js';
import type { OnlineGameRecord } from '../multiplayer/gameApi.js';
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

type InviteState = 'creating_game' | 'waiting_for_link' | 'waiting_for_opponent' | 'active' | 'completed' | 'error';

function buildInviteLink(gameId: string, matchMode: MatchMode) {
  return `${window.location.origin}/game/${gameId}?mode=${matchMode}`;
}

function generateClientMoveId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `move-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getLatestMove(game: OnlineGameRecord): MoveRecord | null {
  const history = game.move_history ?? [];
  return history.at(-1) ?? null;
}

export function OnlineGamePage({ gameId, matchMode, theme, onToggleTheme, onHome }: OnlineGamePageProps) {
  const isCreatingInvite = gameId === 'new';
  const [effectiveGameId, setEffectiveGameId] = useState(isCreatingInvite ? '' : gameId);
  const [board, setBoard] = useState<ChessBoard>(() => (isCreatingInvite ? createInitialBoard() : []));
  const [turn, setTurn] = useState<Color>('white');
  const [status, setStatus] = useState<GameStatus>(isCreatingInvite ? 'waiting' : 'waiting');
  const [inviteState, setInviteState] = useState<InviteState>(isCreatingInvite ? 'creating_game' : 'waiting_for_link');
  const [role, setRole] = useState<Color | 'spectator'>(isCreatingInvite ? 'white' : 'spectator');
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [seedLabel, setSeedLabel] = useState('Random');
  const [backRankCode, setBackRankCode] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [scores, setScores] = useState({ whiteScore: 0, blackScore: 0 });
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);
  const [pendingClientMoveIds, setPendingClientMoveIds] = useState<Set<string>>(() => new Set());
  const historyListRef = useRef<HTMLOListElement | null>(null);
  const playerId = useMemo(() => getPlayerId(), []);
  const confirmedGameRef = useRef<OnlineGameRecord | null>(null);
  const pendingClientMoveIdsRef = useRef(pendingClientMoveIds);
  const hasPendingMove = pendingClientMoveIds.size > 0;
  const inviteLink = effectiveGameId ? buildInviteLink(effectiveGameId, matchMode) : null;
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const checkedKingIndex = useMemo(() => (board.length && isKingInCheck(board, turn) ? findKingIndex(board, turn) : null), [board, turn]);
  const isCompleted = status === 'white_won' || status === 'black_won' || status === 'draw';
  const isActiveGame = inviteState === 'active' && status === 'active';
  const isWaitingForOpponent = inviteState === 'waiting_for_opponent' || inviteState === 'waiting_for_link' || inviteState === 'creating_game';
  const primaryStatus = useMemo(() => {
    if (inviteState === 'creating_game') return 'Creating game...';
    if (inviteState === 'waiting_for_link') return 'Creating invite link...';
    if (inviteState === 'waiting_for_opponent') return 'Waiting for opponent';
    if (inviteState === 'completed') return status === 'draw' ? 'Draw' : `${status === 'white_won' ? 'White' : 'Black'} won`;
    if (role === 'spectator') return `${turn === 'white' ? 'White' : 'Black'} to move`;
    return role === turn ? 'Your turn' : "Opponent's turn";
  }, [inviteState, role, status, turn]);

  function setPendingIds(updater: (ids: Set<string>) => Set<string>) {
    setPendingClientMoveIds((currentIds) => {
      const nextIds = updater(new Set(currentIds));
      pendingClientMoveIdsRef.current = nextIds;
      return nextIds;
    });
  }

  function updateInviteStateFromGame(game: OnlineGameRecord) {
    if (game.status === 'white_won' || game.status === 'black_won' || game.status === 'draw') {
      setInviteState('completed');
      return;
    }
    if (game.status === 'active') {
      setInviteState('active');
      return;
    }
    setInviteState(effectiveGameId || game.id ? 'waiting_for_opponent' : 'waiting_for_link');
  }

  function applyGameRecord(game: OnlineGameRecord, options: { preserveLocalMove?: boolean } = {}) {
    const safeMoveHistory = game.move_history ?? [];
    const derivedBackRankCode = game.back_rank_code ?? deriveBackRankCodeFromBoard(game.board);
    const estimatedScores = estimateMaterialScores(safeMoveHistory);
    confirmedGameRef.current = game;
    if (!options.preserveLocalMove) {
      setBoard(game.board);
      setMoveHistory(safeMoveHistory);
      const latestMove = safeMoveHistory.at(-1);
      if (latestMove) {
        setLastMove({
          from: latestMove.from,
          to: latestMove.to,
          piece: { id: `${latestMove.color}-${latestMove.piece}`, type: latestMove.piece, color: latestMove.color, hasMoved: true },
          capturedPiece: null,
          isCapture: Boolean(latestMove.captured),
        });
      }
    }
    setTurn(game.turn);
    setStatus(game.status);
    setSeedLabel(game.seed ?? 'Random');
    setBackRankCode(derivedBackRankCode);
    setRoundNumber(game.round_number ?? 1);
    setScores({
      whiteScore: game.white_score ?? estimatedScores.whiteScore,
      blackScore: game.black_score ?? estimatedScores.blackScore,
    });
    updateInviteStateFromGame(game);
  }

  function rollbackToConfirmedGame() {
    const confirmedGame = confirmedGameRef.current;
    if (confirmedGame) {
      applyGameRecord(confirmedGame);
      setToast('Move rejected. Board resynced.');
      return;
    }
    if (!effectiveGameId) return;
    joinOnlineGame(effectiveGameId, playerId)
      .then(({ game }) => {
        applyGameRecord(game);
        setToast('Move rejected. Board resynced.');
      })
      .catch((syncError: Error) => setError(syncError.message));
  }

  useEffect(() => {
    pendingClientMoveIdsRef.current = pendingClientMoveIds;
  }, [pendingClientMoveIds]);

  useEffect(() => {
    const historyList = historyListRef.current;
    if (!historyList) return;

    historyList.scrollTop = historyList.scrollHeight;
  }, [moveHistory.length]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!isCreatingInvite) return undefined;
    let isMounted = true;
    createOnlineGame(playerId)
      .then(({ gameId: createdGameId }) => {
        if (!isMounted) return;
        setEffectiveGameId(createdGameId);
        setInviteState('waiting_for_link');
        window.history.replaceState(null, '', `/game/${createdGameId}?mode=${matchMode}`);
      })
      .catch((createError: Error) => {
        if (!isMounted) return;
        setInviteState('error');
        setError(createError.message || 'Could not create invite link.');
      });

    return () => {
      isMounted = false;
    };
  }, [isCreatingInvite, matchMode, playerId]);

  useEffect(() => {
    if (!effectiveGameId) return;
    joinOnlineGame(effectiveGameId, playerId)
      .then(({ game, role: joinedRole }) => {
        applyGameRecord(game);
        setRole(joinedRole);
      })
      .catch((joinError: Error) => {
        setInviteState('error');
        setError(joinError.message);
      });
  // applyGameRecord intentionally reads the latest local state while this effect is keyed by game identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveGameId, playerId]);

  useEffect(() => {
    if (!effectiveGameId) return undefined;
    const channel = subscribeToGame(effectiveGameId, (game) => {
      setIsRealtimeConnected(true);
      const latestMove = getLatestMove(game);
      if (latestMove?.clientMoveId && pendingClientMoveIdsRef.current.has(latestMove.clientMoveId)) {
        setPendingIds((ids) => {
          ids.delete(latestMove.clientMoveId ?? '');
          return ids;
        });
        applyGameRecord(game, { preserveLocalMove: true });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      applyGameRecord(game);
      setSelectedSquare(null);
      setLegalMoves([]);
    });

    if (!channel) setIsRealtimeConnected(false);
    return () => unsubscribeFromGame(channel);
  // applyGameRecord intentionally reads pending move refs while this subscription is keyed by game identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveGameId]);

  async function handleShareInvite() {
    if (!inviteLink) return;
    const shareData = {
      title: 'Pocket Shuffle Chess invite',
      text: `Join my Pocket Shuffle Chess game (${seedLabel}).`,
      url: inviteLink,
    };

    if (canNativeShare) {
      try {
        await navigator.share(shareData);
        setCopied(true);
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    }
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function retryCreateInvite() {
    setError(null);
    setInviteState('creating_game');
    try {
      const { gameId: createdGameId } = await createOnlineGame(playerId);
      setEffectiveGameId(createdGameId);
      setInviteState('waiting_for_link');
      window.history.replaceState(null, '', `/game/${createdGameId}?mode=${matchMode}`);
    } catch (createError) {
      setInviteState('error');
      setError(createError instanceof Error ? createError.message : 'Could not create invite link.');
    }
  }

  async function handleSquareClick(squareIndex: number) {
    if (!isActiveGame || role !== turn || hasPendingMove) return;

    const selectedMove = legalMoves.find((move) => move.to === squareIndex);
    if (selectedMove) {
      const clientMoveId = generateClientMoveId();
      const previousStateVersion = moveHistory.length;
      const nextBoard = applyMove(board, selectedMove);
      const nextTurn = getOpponent(turn);
      const nextStatus = getStatusForTurn(nextBoard, nextTurn);
      const optimisticHistory = [...moveHistory, createMoveRecord(selectedMove, { clientMoveId, playerId })];
      const materialScores = estimateMaterialScores(optimisticHistory);
      setBoard(nextBoard);
      setTurn(nextTurn);
      setStatus(nextStatus);
      setMoveHistory(optimisticHistory);
      setScores(materialScores);
      setLastMove(selectedMove);
      setSelectedSquare(null);
      setLegalMoves([]);
      setPendingIds((ids) => ids.add(clientMoveId));
      playMoveSound(selectedMove.isCapture);
      if (isKingInCheck(nextBoard, nextTurn)) playCheckSound();

      submitOnlineMove(effectiveGameId, playerId, selectedMove, {
        clientMoveId,
        moveNumber: previousStateVersion + 1,
        previousStateVersion,
      })
        .then(({ game }) => {
          const latestMove = getLatestMove(game);
          if (latestMove?.clientMoveId === clientMoveId || (!latestMove?.clientMoveId && latestMove?.from === selectedMove.from && latestMove?.to === selectedMove.to && latestMove?.color === role && (game.move_history?.length ?? 0) === previousStateVersion + 1)) {
            setPendingIds((ids) => {
              ids.delete(clientMoveId);
              return ids;
            });
            applyGameRecord(game, { preserveLocalMove: true });
            return;
          }
          applyGameRecord(game);
        })
        .catch(() => {
          setPendingIds((ids) => {
            ids.delete(clientMoveId);
            return ids;
          });
          rollbackToConfirmedGame();
        });
      return;
    }

    const piece = board[squareIndex]?.piece;
    if (piece?.color === role) {
      setSelectedSquare(squareIndex);
      setLegalMoves(getLegalMoves(board, squareIndex));
      return;
    }

    setSelectedSquare(null);
    setLegalMoves([]);
  }

  const shareIsLoading = inviteState === 'creating_game' || inviteState === 'waiting_for_link';

  return (
    <main className="game-page online-game-page">
      <div className="panel-topbar online-topbar">
        <GameHeader title="Online Game" turn={turn} status={status} playerRole={role === 'spectator' ? 'Spectating' : `You are ${role}`} details={primaryStatus} onTitleClick={onHome} />
        <div className="topbar-actions">
          {hasPendingMove && <span className="subtle-status">Sending move...</span>}
          {!isRealtimeConnected && <span className="subtle-status reconnecting-badge">Reconnecting...</span>}
          {inviteState === 'active' && <InvitePanel inviteLink={inviteLink} isLoading={false} isActive copied={copied} canNativeShare={canNativeShare} compact onShare={handleShareInvite} />}
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle light and dark theme">
            {theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>
      {!isSupabaseConfigured && <p className="notice">Supabase environment variables are required for live multiplayer.</p>}
      {toast && <p className="sync-toast" role="status">{toast}</p>}
      <div className="online-layout">
        <section className="online-main-column">
          <div className="mobile-waiting-card">
            {isWaitingForOpponent && <InvitePanel inviteLink={inviteLink} isLoading={shareIsLoading} isActive={false} copied={copied} canNativeShare={canNativeShare} onShare={handleShareInvite} />}
          </div>
          <div className="online-status-strip">
            <strong>{primaryStatus}</strong>
            {role !== 'spectator' && <span>You are {role}</span>}
            {hasPendingMove && <small>Sending move...</small>}
          </div>
          <div className="online-board-wrap">
            {board.length > 0 && (
              <Board
                board={board}
                selectedSquare={selectedSquare}
                legalMoves={legalMoves}
                lastMove={lastMove}
                checkedKingIndex={checkedKingIndex}
                isInteractive={isActiveGame && !hasPendingMove}
                onSquareClick={handleSquareClick}
              />
            )}
            {isWaitingForOpponent && (
              <div className="waiting-board-overlay">
                <strong>{shareIsLoading ? 'Creating invite...' : 'Waiting for opponent'}</strong>
                <span>Share the invite link to start.</span>
                <button type="button" onClick={handleShareInvite} disabled={!inviteLink || shareIsLoading}>
                  {shareIsLoading ? 'Creating link...' : copied ? 'Copied' : canNativeShare ? 'Share Invite' : 'Copy Invite Link'}
                </button>
              </div>
            )}
          </div>
          {inviteState === 'error' && (
            <section className="error-card">
              <strong>Could not create invite link.</strong>
              {error && <p>{error}</p>}
              <div className="panel-actions">
                <button type="button" onClick={retryCreateInvite}>Retry</button>
                <button type="button" className="secondary-action" onClick={onHome}>Back home</button>
              </div>
            </section>
          )}
          <aside className="side-panel history-panel online-history-panel">
            <div className="history-header">
              <p className="eyebrow">Move History</p>
              <h2>Round {roundNumber}</h2>
              <p className="panel-note">White {scores.whiteScore} · Black {scores.blackScore}</p>
            </div>
            <ol className="move-history history-list" ref={historyListRef}>
              {moveHistory.length === 0 && <li className="empty-history"><strong>No moves yet.</strong><span>{isCompleted ? 'Game over.' : 'The game starts when both players are in.'}</span></li>}
              {moveHistory.map((move, index) => (
                <li key={`${move.timestamp}-${index}`}>{index + 1}. {move.color} {move.piece} {move.from}→{move.to}{move.captured ? ` captures ${move.captured}` : ''}</li>
              ))}
            </ol>
          </aside>
        </section>
        <aside className="online-sidebar">
          <section className="side-panel status-card online-status-card">
            <span>{role === 'spectator' ? 'Spectator' : `You are ${role}`}</span>
            <strong>{primaryStatus}</strong>
            {hasPendingMove && <small>Sending move...</small>}
          </section>
          {inviteState !== 'active' && <InvitePanel inviteLink={inviteLink} isLoading={shareIsLoading} isActive={false} copied={copied} canNativeShare={canNativeShare} onShare={handleShareInvite} />}
          {inviteState === 'active' && <InvitePanel inviteLink={inviteLink} isLoading={false} isActive copied={copied} canNativeShare={canNativeShare} onShare={handleShareInvite} />}
          <section className="side-panel online-role-card">
            <p className="eyebrow">Game</p>
            <strong>{seedLabel}</strong>
            <span>{backRankCode ?? 'Setup pending'}</span>
            <small>Mode: {matchMode}</small>
          </section>
        </aside>
      </div>
    </main>
  );
}
