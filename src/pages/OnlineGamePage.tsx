import { useEffect, useMemo, useRef, useState } from 'react';
import { Moon, RotateCcw, SunMedium } from 'lucide-react';
import { Board } from '../components/Board.js';
import { GameHeader } from '../components/GameHeader.js';
import { GameResultPanel } from '../components/GameResultPanel.js';
import { applyMove, createMoveRecord } from '../game/applyMove.js';
import { findKingIndex, isKingInCheck } from '../game/check.js';
import { squareLabel } from '../game/coordinates.js';
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
  onNewOnlineGame: () => void;
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

export function OnlineGamePage({ gameId, matchMode, theme, onToggleTheme, onHome, onNewOnlineGame }: OnlineGamePageProps) {
  const playerId = useMemo(() => getPlayerId(), []);
  const isCreatingInvite = gameId === 'new';
  const [effectiveGameId, setEffectiveGameId] = useState(isCreatingInvite ? '' : gameId);
  const [board, setBoard] = useState<ChessBoard>(() => (isCreatingInvite ? createInitialBoard() : []));
  const [turn, setTurn] = useState<Color>('white');
  const [status, setStatus] = useState<GameStatus>(isCreatingInvite ? 'waiting' : 'waiting');
  const [inviteState, setInviteState] = useState<InviteState>(isCreatingInvite ? 'creating_game' : 'waiting_for_link');
  const [role, setRole] = useState<Color | 'spectator'>(isCreatingInvite ? 'white' : 'spectator');
  const [whitePlayerId, setWhitePlayerId] = useState<string | null>(isCreatingInvite ? playerId : null);
  const [blackPlayerId, setBlackPlayerId] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
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
  const confirmedGameRef = useRef<OnlineGameRecord | null>(null);
  const pendingClientMoveIdsRef = useRef(pendingClientMoveIds);
  const hasPendingMove = pendingClientMoveIds.size > 0;
  const inviteLink = effectiveGameId ? buildInviteLink(effectiveGameId, matchMode) : null;
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const checkedKingIndex = useMemo(() => (board.length && isKingInCheck(board, turn) ? findKingIndex(board, turn) : null), [board, turn]);
  const hasWhite = Boolean(whitePlayerId);
  const hasBlack = Boolean(blackPlayerId);
  const bothPlayersJoined = hasWhite && hasBlack;
  const isCompleted = status === 'white_won' || status === 'black_won' || status === 'draw';
  const isOnlineGameReady = status === 'active' || bothPlayersJoined;
  const shouldShowWaitingOverlay = !isCompleted && inviteState !== 'error' && !isOnlineGameReady;
  const canInteractWithBoard = !shouldShowWaitingOverlay && !isCompleted && role === turn && !hasPendingMove;
  const displayStatus: GameStatus = isOnlineGameReady && status === 'waiting' ? 'active' : status;
  const primaryStatus = useMemo(() => {
    if (inviteState === 'creating_game') return 'Creating game...';
    if (inviteState === 'waiting_for_link') return 'Creating invite link...';
    if (isCompleted) return status === 'draw' ? 'Draw' : `${status === 'white_won' ? 'White' : 'Black'} won`;
    if (!isOnlineGameReady) return 'Waiting for opponent';
    if (role === 'spectator') return `${turn === 'white' ? 'White' : 'Black'} to move`;
    return role === turn ? 'Your turn' : "Opponent's turn";
  }, [inviteState, isCompleted, isOnlineGameReady, role, status, turn]);
  const winner: Color | null = status === 'white_won' ? 'white' : status === 'black_won' ? 'black' : null;
  const onlineResult: 'win' | 'loss' | 'draw' | 'spectator' = status === 'draw' ? 'draw' : role === 'spectator' ? 'spectator' : winner === role ? 'win' : 'loss';
  const onlineResultTitle = status === 'draw'
    ? 'Draw'
    : role === 'spectator'
      ? `${winner === 'white' ? 'White' : 'Black'} won`
      : winner === role
        ? 'You won!'
        : 'You lost';
  const onlineResultSummary = `${winner ? `${winner === 'white' ? 'White' : 'Black'} wins by checkmate.` : 'The game ended in a draw.'} ${moveHistory.length} moves. Seed: ${seedLabel}.`;
  const headerStatusLabel = isCompleted ? 'Game Over' : undefined;
  const headerTurnLabel = isCompleted
    ? status === 'draw'
      ? 'Draw'
      : role === 'spectator'
        ? `${winner === 'white' ? 'White' : 'Black'} won`
        : winner === role
          ? 'You won'
          : 'You lost'
    : undefined;

  function setPendingIds(updater: (ids: Set<string>) => Set<string>) {
    setPendingClientMoveIds((currentIds) => {
      const nextIds = updater(new Set(currentIds));
      pendingClientMoveIdsRef.current = nextIds;
      return nextIds;
    });
  }

  function updateInviteStateFromGame(game: OnlineGameRecord) {
    const gameHasBothPlayers = Boolean(game.white_player_id) && Boolean(game.black_player_id);
    if (game.status === 'white_won' || game.status === 'black_won' || game.status === 'draw') {
      setInviteState('completed');
      return;
    }
    if (game.status === 'active' || gameHasBothPlayers) {
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
    setWhitePlayerId(game.white_player_id);
    setBlackPlayerId(game.black_player_id);
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


  useEffect(() => {
    if (!effectiveGameId || isOnlineGameReady || isCompleted || inviteState === 'error') return undefined;

    const pollId = window.setInterval(() => {
      joinOnlineGame(effectiveGameId, playerId)
        .then(({ game, role: refreshedRole }) => {
          applyGameRecord(game);
          setRole(refreshedRole);
        })
        .catch(() => {
          setIsRealtimeConnected(false);
        });
    }, 2000);

    return () => window.clearInterval(pollId);
  // applyGameRecord intentionally merges the latest server row while this fallback is keyed by readiness.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveGameId, inviteState, isCompleted, isOnlineGameReady, playerId]);

  useEffect(() => {
    if (!effectiveGameId || !isOnlineGameReady || isCompleted || hasPendingMove) return undefined;

    const pollId = window.setInterval(() => {
      joinOnlineGame(effectiveGameId, playerId)
        .then(({ game, role: refreshedRole }) => {
          const confirmedGame = confirmedGameRef.current;
          const confirmedVersion = confirmedGame?.updated_at ?? `${confirmedGame?.move_history?.length ?? 0}:${confirmedGame?.turn}:${confirmedGame?.status}`;
          const nextVersion = game.updated_at ?? `${game.move_history?.length ?? 0}:${game.turn}:${game.status}`;
          if (nextVersion !== confirmedVersion) applyGameRecord(game);
          setRole(refreshedRole);
        })
        .catch(() => {
          setIsRealtimeConnected(false);
        });
    }, 2000);

    return () => window.clearInterval(pollId);
  // applyGameRecord intentionally merges changed server rows while this fallback is keyed by active sync state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveGameId, hasPendingMove, isCompleted, isOnlineGameReady, playerId]);

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

  async function handleShareResult() {
    const resultText = `Pocket Shuffle Chess result: ${onlineResultTitle}. ${onlineResultSummary}`;
    const shareData = {
      title: 'Pocket Shuffle Chess result',
      text: resultText,
      url: inviteLink ?? window.location.href,
    };

    if (canNativeShare) {
      try {
        await navigator.share(shareData);
        setCopied(true);
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(`${resultText} ${shareData.url}`);
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
    if (!canInteractWithBoard) return;

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
  const leftPanelStatus = isCompleted ? onlineResultTitle : shareIsLoading ? 'Creating invite link' : isOnlineGameReady ? 'Active' : 'Waiting for opponent';
  const playerRoleLabel = role === 'spectator' ? 'Spectating' : `You are ${role === 'white' ? 'White' : 'Black'}`;

  return (
    <main className="game-page">
      <GameHeader title="Online Game" turn={turn} status={displayStatus} playerRole={playerRoleLabel} details={primaryStatus} onTitleClick={onHome} statusLabelOverride={headerStatusLabel} turnLabelOverride={headerTurnLabel} />
      {toast && <p className="sync-toast" role="status">{toast}</p>}
      <div className="game-layout chess-shell">
        <aside className="side-panel match-panel online-match-panel">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Online</p>
              <h2>{isOnlineGameReady ? 'Online Match' : 'Invite Friend'}</h2>
            </div>
            <span className="mode-badge">Online</span>
          </div>
          <div className="score-stack">
            <span className={turn === 'white' && isOnlineGameReady && !isCompleted ? 'active-score-row' : ''}><i className="score-dot white-dot" />White <strong>{scores.whiteScore}</strong></span>
            <span className={turn === 'black' && isOnlineGameReady && !isCompleted ? 'active-score-row' : ''}><i className="score-dot black-dot" />Black <strong>{scores.blackScore}</strong></span>
          </div>
          <div className="info-stack">
            <p><span>♙ You are</span><strong>{role === 'spectator' ? 'Spectating' : role === 'white' ? 'White' : 'Black'}</strong></p>
            <p><span>☌ Opponent</span><strong>{isOnlineGameReady ? 'Joined' : 'Waiting'}</strong></p>
            <p><span>● Status</span><strong>{leftPanelStatus}</strong></p>
            {isOnlineGameReady && !isCompleted && <p><span>↻ Turn</span><strong>{turn === 'white' ? 'White' : 'Black'}</strong></p>}
            <p><span>🌱 Seed</span><strong>{seedLabel}</strong></p>
            <p><span>♜ Back rank</span><strong>{backRankCode ?? 'Setup pending'}</strong></p>
            <p><span>🎮 Game</span><strong>{roundNumber}</strong></p>
          </div>
          <p className="panel-note">{isOnlineGameReady ? 'Share remains available.' : shareIsLoading ? 'Share the invite link. Your friend joins as Black.' : 'Send this link to a friend. The game starts when they join.'}</p>
          {hasPendingMove && <p className="subtle-inline-status">Sending move...</p>}
          {isSupabaseConfigured && !isRealtimeConnected && <p className="subtle-inline-status reconnecting-badge">Reconnecting...</p>}
          {!isSupabaseConfigured && <p className="panel-note">Supabase environment variables are required for live multiplayer.</p>}
          <div className="match-actions">
            <button type="button" className="wide-action primary-action" onClick={handleShareInvite} disabled={!inviteLink || shareIsLoading}>{shareIsLoading ? 'Creating Link...' : copied ? 'Copied' : isOnlineGameReady ? 'Share' : 'Share Invite'}</button>
            <button type="button" className="wide-action secondary-action" onClick={() => setIsFlipped((flipped) => !flipped)}><RotateCcw size={18} /> Flip Board</button>
            <button type="button" className="wide-action theme-action" onClick={onToggleTheme}>{theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />} Theme</button>
          </div>
        </aside>

        <section className="board-column online-board-column">
          {board.length > 0 && (
            <Board
              board={board}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              lastMove={lastMove}
              checkedKingIndex={checkedKingIndex}
              isFlipped={isFlipped}
              isInteractive={canInteractWithBoard}
              onSquareClick={handleSquareClick}
            />
          )}
          {shouldShowWaitingOverlay && (
            <div className="waiting-board-overlay">
              <strong>{shareIsLoading ? 'Creating invite...' : 'Waiting for opponent'}</strong>
              <span>Share the invite link to start.</span>
              <button type="button" onClick={handleShareInvite} disabled={!inviteLink || shareIsLoading}>
                {shareIsLoading ? 'Creating Link...' : copied ? 'Copied' : canNativeShare ? 'Share Invite' : 'Copy Invite Link'}
              </button>
            </div>
          )}
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
        </section>

        <aside className="side-panel review-panel history-panel">
          <div className="history-header">
            <div className="panel-topbar">
              <p className="eyebrow">Move History</p>
              <h2>Move history</h2>
            </div>
            <p className="panel-note">{isOnlineGameReady ? 'Select a piece to see legal moves.' : 'The game starts when both players are in.'}</p>
          </div>
          <ol className="move-history move-list history-list" ref={historyListRef}>
            {moveHistory.length === 0 ? (
              <li className="empty-history"><span>No moves yet.</span><span>{isCompleted ? 'Game over.' : isOnlineGameReady ? 'White can make the first move.' : 'Waiting for opponent.'}</span></li>
            ) : (
              moveHistory.map((move, index) => (
                <li key={`${move.timestamp}-${index}`}>
                  <button type="button" className="history-move" aria-disabled="true">
                    <span>{index + 1}.</span>
                    <strong>{move.color}</strong>
                    <span>{move.piece}</span>
                    <span>{squareLabel(move.to % 5, Math.floor(move.to / 5))}</span>
                  </button>
                </li>
              ))
            )}
          </ol>
          <div className="review-footer history-actions">
            <div className="review-controls">
              <button type="button" disabled>⏮</button>
              <button type="button" disabled>‹</button>
              <button type="button" disabled>Live</button>
              <button type="button" disabled>›</button>
              <button type="button" disabled>⏭</button>
            </div>
            <div className="panel-actions stacked-actions">
              <button type="button" onClick={handleShareInvite} disabled={!inviteLink || shareIsLoading}>{shareIsLoading ? 'Creating Link...' : copied ? 'Copied' : 'Share Invite'}</button>
            </div>
          </div>
        </aside>
      </div>
      {isCompleted && (
        <GameResultPanel
          result={onlineResult}
          winner={winner}
          eyebrow="Game complete"
          title={onlineResultTitle}
          summary={onlineResultSummary}
          actions={(
            <>
              <button type="button" onClick={onNewOnlineGame}>New Online Game</button>
              <button type="button" onClick={onHome}>Back Home</button>
              <button type="button" onClick={handleShareResult}>Share Result</button>
            </>
          )}
        />
      )}
    </main>
  );
}
