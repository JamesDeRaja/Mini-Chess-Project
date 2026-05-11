import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Board } from '../components/Board.js';
import { GameHeader } from '../components/GameHeader.js';
import { GameResultPanel } from '../components/GameResultPanel.js';
import { MoveHistory } from '../components/MoveHistory.js';
import { applyMove, createMoveRecord } from '../game/applyMove.js';
import { findKingIndex, isKingInCheck } from '../game/check.js';
import { createInitialBoard } from '../game/createInitialBoard.js';
import { squareLabel } from '../game/coordinates.js';
import { getOpponent, getStatusForTurn } from '../game/gameStatus.js';
import { getLegalMoves } from '../game/legalMoves.js';
import { deriveBackRankCodeFromBoard, estimateMaterialScores } from '../game/seed.js';
import { playCheckSound, playMoveSound } from '../game/sound.js';
import { applyMoveDelta, isMoveDelta, moveDeltaToMove, rebuildBoardFromHistory, replayMoves } from '../game/moveDelta.js';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveDelta, MoveRecord } from '../game/types.js';
import { createOnlineGame, createSeededGame, joinOnlineGame, submitOnlineGameAction, submitOnlineMove } from '../multiplayer/gameApi.js';
import type { OnlineGameRecord } from '../multiplayer/gameApi.js';
import { getPlayerId } from '../multiplayer/playerSession.js';
import { subscribeToGame, unsubscribeFromGame } from '../multiplayer/realtime.js';
import type { MatchMode } from './BotGamePage.js';
import { trackEvent } from '../app/analytics.js';

type OnlineGamePageProps = {
  gameId: string;
  matchMode: MatchMode;
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

function getLatestMove(game: OnlineGameRecord): MoveDelta | MoveRecord | null {
  return game.last_move ?? game.move_history?.at(-1) ?? null;
}

function moveToIndex(move: MoveDelta | MoveRecord): number {
  return isMoveDelta(move) ? move.to.file + move.to.rank * 5 : move.to;
}

function moveFromIndex(move: MoveDelta | MoveRecord): number {
  return isMoveDelta(move) ? move.from.file + move.from.rank * 5 : move.from;
}

function toDisplayMove(move: MoveDelta | MoveRecord): Move {
  return {
    from: moveFromIndex(move),
    to: moveToIndex(move),
    piece: { id: `${move.color}-${move.piece}`, type: move.piece, color: move.color, hasMoved: true },
    capturedPiece: null,
    isCapture: Boolean(move.captured),
    isPromotion: isMoveDelta(move) ? Boolean(move.promotion) : false,
    promotionPiece: isMoveDelta(move) ? move.promotion ?? undefined : undefined,
  };
}

function sameMove(a: MoveDelta | MoveRecord | null | undefined, b: MoveDelta | MoveRecord | null | undefined) {
  if (!a || !b) return false;
  const aFrom = moveFromIndex(a);
  const aTo = moveToIndex(a);
  const bFrom = moveFromIndex(b);
  const bTo = moveToIndex(b);
  return aFrom === bFrom && aTo === bTo && a.color === b.color;
}

function getDrawOfferBy(game: OnlineGameRecord): Color | null {
  if (game.draw_offer_by === 'white' || game.draw_offer_by === 'black') return game.draw_offer_by;
  const [, offeredBy] = game.result_type?.match(/^draw_offer:(white|black)$/) ?? [];
  return offeredBy === 'white' || offeredBy === 'black' ? offeredBy : null;
}

export function OnlineGamePage({ gameId, matchMode, onHome, onNewOnlineGame }: OnlineGamePageProps) {
  const playerId = useMemo(() => getPlayerId(), []);
  const isCreatingInvite = gameId === 'new';
  const [effectiveGameId, setEffectiveGameId] = useState(isCreatingInvite ? '' : gameId);
  const [board, setBoard] = useState<ChessBoard>(() => (isCreatingInvite ? createInitialBoard() : []));
  const [initialReplayBoard, setInitialReplayBoard] = useState<ChessBoard>(() => createInitialBoard());
  const [turn, setTurn] = useState<Color>('white');
  const [status, setStatus] = useState<GameStatus>(isCreatingInvite ? 'waiting' : 'waiting');
  const [inviteState, setInviteState] = useState<InviteState>(isCreatingInvite ? 'creating_game' : 'waiting_for_link');
  const [role, setRole] = useState<Color | 'spectator'>(isCreatingInvite ? 'white' : 'spectator');
  const [whitePlayerId, setWhitePlayerId] = useState<string | null>(isCreatingInvite ? playerId : null);
  const [blackPlayerId, setBlackPlayerId] = useState<string | null>(null);
  const [manualBoardFlip, setManualBoardFlip] = useState<boolean | null>(null);
  const [previewPly, setPreviewPly] = useState<number | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<Array<MoveDelta | MoveRecord>>([]);
  const [moveAnnouncement, setMoveAnnouncement] = useState('Online board ready.');
  const [seedLabel, setSeedLabel] = useState('Random');
  const [seedSource, setSeedSource] = useState<string | null>(null);
  const [backRankCode, setBackRankCode] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [scores, setScores] = useState({ whiteScore: 0, blackScore: 0 });
  const [resultType, setResultType] = useState<string | null>(null);
  const [drawOfferBy, setDrawOfferBy] = useState<Color | null>(null);
  const [gameActionPending, setGameActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingClientMoveIds, setPendingClientMoveIds] = useState<Set<string>>(() => new Set());
  const historyListRef = useRef<HTMLOListElement | null>(null);
  const confirmedGameRef = useRef<OnlineGameRecord | null>(null);
  const pendingClientMoveIdsRef = useRef(pendingClientMoveIds);
  const boardRef = useRef(board);
  const moveHistoryRef = useRef<Array<MoveDelta | MoveRecord>>(moveHistory);
  const hasPendingMove = pendingClientMoveIds.size > 0;
  const latestPly = moveHistory.length;
  const isPreviewing = previewPly !== null && previewPly < latestPly;
  const isFlipped = manualBoardFlip ?? role === 'black';
  const displayBoard = useMemo(() => (isPreviewing ? replayMoves(initialReplayBoard, moveHistory.slice(0, previewPly)) : board), [board, initialReplayBoard, isPreviewing, moveHistory, previewPly]);
  const displayMove = isPreviewing && previewPly !== null && previewPly > 0 ? toDisplayMove(moveHistory[previewPly - 1]) : lastMove;
  const activeLegalMoves = isPreviewing ? [] : legalMoves;
  const inviteLink = effectiveGameId ? buildInviteLink(effectiveGameId, matchMode) : null;
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const checkedKingIndex = useMemo(
    () => (!isPreviewing && displayBoard.length && isKingInCheck(displayBoard, turn) ? findKingIndex(displayBoard, turn) : null),
    [displayBoard, isPreviewing, turn],
  );
  const hasWhite = Boolean(whitePlayerId);
  const hasBlack = Boolean(blackPlayerId);
  const bothPlayersJoined = hasWhite && hasBlack;
  const isLifecycleTerminal = status === 'expired' || status === 'timeout';
  const isFinishedGame = status === 'white_won' || status === 'black_won' || status === 'draw';
  const isCompleted = isFinishedGame || isLifecycleTerminal;
  const isOnlineGameReady = !isLifecycleTerminal && (status === 'active' || bothPlayersJoined);
  const shouldShowWaitingOverlay = !isCompleted && inviteState !== 'error' && !isOnlineGameReady;
  const canInteractWithBoard = !isPreviewing && !shouldShowWaitingOverlay && !isCompleted && role === turn && !hasPendingMove;
  const displayStatus: GameStatus = isOnlineGameReady && status === 'waiting' ? 'active' : status;
  const primaryStatus = useMemo(() => {
    if (inviteState === 'creating_game') return 'Creating game...';
    if (inviteState === 'waiting_for_link') return 'Creating invite link...';
    if (status === 'expired') return 'Challenge link expired';
    if (status === 'timeout') return 'Session over';
    if (isCompleted) return status === 'draw' ? 'Draw' : `${status === 'white_won' ? 'White' : 'Black'} won`;
    if (!isOnlineGameReady) return 'Waiting for opponent';
    if (role === 'spectator') return `${turn === 'white' ? 'White' : 'Black'} to move`;
    return role === turn ? 'Your turn' : "Opponent's turn";
  }, [inviteState, isCompleted, isOnlineGameReady, role, status, turn]);
  const winner: Color | null = status === 'white_won' ? 'white' : status === 'black_won' ? 'black' : null;
  const drawOfferIsFromOpponent = (role === 'white' || role === 'black') && drawOfferBy !== null && drawOfferBy !== role;
  const drawActionLabel = drawOfferIsFromOpponent ? 'Accept Draw' : drawOfferBy === role ? 'Draw Requested' : 'Request Draw';
  const canUseGameActions = isOnlineGameReady && !isCompleted && (role === 'white' || role === 'black') && !gameActionPending;
  const onlineResult: 'win' | 'loss' | 'draw' | 'spectator' = isLifecycleTerminal || status === 'draw' ? 'draw' : role === 'spectator' ? 'spectator' : winner === role ? 'win' : 'loss';
  const onlineResultTitle = status === 'expired'
    ? 'This challenge link has expired.'
    : status === 'timeout'
      ? 'This game session is over.'
      : status === 'draw'
        ? 'Draw'
        : role === 'spectator'
          ? `${winner === 'white' ? 'White' : 'Black'} won`
          : winner === role
            ? 'You won!'
            : 'You lost';
  const isDailySeed = seedLabel.startsWith('daily-') || seedSource?.startsWith('daily');
  const isRandomSeed = seedLabel.startsWith('random-') || seedSource?.startsWith('random');
  const shareSetupLine = isDailySeed ? 'I beat today’s Pocket Shuffle Chess setup.' : isRandomSeed ? 'I survived this random shuffle setup.' : 'Play this Pocket Shuffle Chess seed with me.';
  const onlineResultSummary = status === 'expired'
    ? 'Challenge links expire after 60 minutes. Create a new challenge to keep playing.'
    : status === 'timeout'
      ? 'No moves were made for 60 minutes. Create a new challenge to keep playing.'
      : resultType === 'draw_agreement'
        ? `Players agreed to a draw. ${moveHistory.length} moves. Seed: ${seedLabel}.`
        : resultType === 'resignation'
          ? `${winner === 'white' ? 'White' : 'Black'} wins by resignation. ${moveHistory.length} moves. Seed: ${seedLabel}.`
          : `${winner ? `${winner === 'white' ? 'White' : 'Black'} wins by checkmate.` : 'The game ended in a draw.'} ${moveHistory.length} moves. Seed: ${seedLabel}.`;
  const headerStatusLabel = isCompleted ? (isLifecycleTerminal ? 'Session Over' : 'Game Over') : undefined;
  const headerTurnLabel = isCompleted
    ? status === 'expired'
      ? 'Link expired'
      : status === 'timeout'
        ? 'Timed out'
        : status === 'draw'
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
    if (game.status === 'white_won' || game.status === 'black_won' || game.status === 'draw' || game.status === 'expired' || game.status === 'timeout') {
      setInviteState('completed');
      return;
    }
    if (game.status === 'active' || gameHasBothPlayers) {
      setInviteState('active');
      return;
    }
    setInviteState(effectiveGameId || game.id ? 'waiting_for_opponent' : 'waiting_for_link');
  }

  function resolveRoleFromGame(game: OnlineGameRecord): Color | 'spectator' {
    if (game.white_player_id === playerId) return 'white';
    if (game.black_player_id === playerId) return 'black';
    return 'spectator';
  }

  function applyGameRecord(game: OnlineGameRecord, options: { preserveLocalMove?: boolean } = {}) {
    const safeMoveHistory = game.move_history ?? [];
    const derivedBackRankCode = game.back_rank_code ?? deriveBackRankCodeFromBoard(game.board);
    const initialBoard = derivedBackRankCode ? createInitialBoard({ backRankCode: derivedBackRankCode }) : safeMoveHistory.length === 0 ? game.board : createInitialBoard();
    const rebuiltBoard = rebuildBoardFromHistory(safeMoveHistory, { backRankCode: derivedBackRankCode, fallbackBoard: game.board });
    const estimatedScores = estimateMaterialScores(safeMoveHistory);
    const isNewGameRecord = confirmedGameRef.current?.id !== game.id;
    if (isNewGameRecord) {
      setManualBoardFlip(null);
      setPreviewPly(null);
    }
    confirmedGameRef.current = game;
    setInitialReplayBoard(initialBoard);
    if (!options.preserveLocalMove) {
      setBoard(rebuiltBoard);
      boardRef.current = rebuiltBoard;
      setMoveHistory(safeMoveHistory);
      moveHistoryRef.current = safeMoveHistory;
      const latestMove = getLatestMove(game);
      if (latestMove) {
        setLastMove(toDisplayMove(latestMove));
      } else {
        setLastMove(null);
      }
    }
    setTurn(game.turn);
    setStatus(game.status);
    setWhitePlayerId(game.white_player_id);
    setBlackPlayerId(game.black_player_id);
    setRole(resolveRoleFromGame(game));
    setSeedLabel(game.seed ?? 'Random');
    setSeedSource(game.seed_source ?? null);
    setBackRankCode(derivedBackRankCode);
    setRoundNumber(game.round_number ?? 1);
    setResultType(game.result_type ?? null);
    setDrawOfferBy(getDrawOfferBy(game));
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
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    moveHistoryRef.current = moveHistory;
  }, [moveHistory]);

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
        setRole(joinedRole);
        applyGameRecord(game);
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
      const latestMove = getLatestMove(game);
      const serverMoveCount = game.move_count ?? game.total_moves ?? game.move_history?.length ?? 0;
      const localHistory = moveHistoryRef.current;
      const localMoveCount = localHistory.length;
      const localLatestMove = localHistory.at(-1);

      if (latestMove && pendingClientMoveIdsRef.current.size > 0 && sameMove(latestMove, localLatestMove) && serverMoveCount === localMoveCount) {
        setPendingIds(() => new Set());
        applyGameRecord(game, { preserveLocalMove: true });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (latestMove && isMoveDelta(latestMove) && latestMove.moveNumber === localMoveCount + 1) {
        const currentBoard = boardRef.current;
        const displayMove = moveDeltaToMove(currentBoard, latestMove);
        const nextBoard = applyMoveDelta(currentBoard, latestMove);
        const nextHistory = [...localHistory, latestMove];
        setBoard(nextBoard);
        boardRef.current = nextBoard;
        setMoveHistory(nextHistory);
        moveHistoryRef.current = nextHistory;
        setLastMove(displayMove);
        setMoveAnnouncement(`${latestMove.color === 'white' ? 'White' : 'Black'} ${latestMove.piece} moved to ${squareLabel(latestMove.to.file, latestMove.to.rank)}.`);
        setTurn(game.turn);
        setStatus(game.status);
        setWhitePlayerId(game.white_player_id);
        setBlackPlayerId(game.black_player_id);
        setScores(estimateMaterialScores(nextHistory));
        updateInviteStateFromGame(game);
        const isNewGameRecord = confirmedGameRef.current?.id !== game.id;
    if (isNewGameRecord) {
      setManualBoardFlip(null);
      setPreviewPly(null);
    }
    confirmedGameRef.current = game;
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (!latestMove || serverMoveCount !== localMoveCount) applyGameRecord(game);
      setSelectedSquare(null);
      setLegalMoves([]);
    });

    return () => unsubscribeFromGame(channel);
  // applyGameRecord intentionally reads refs while this subscription is keyed by game identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveGameId]);


  useEffect(() => {
    if (!effectiveGameId || isOnlineGameReady || isCompleted || inviteState === 'error') return undefined;

    const pollId = window.setInterval(() => {
      joinOnlineGame(effectiveGameId, playerId)
        .then(({ game, role: refreshedRole }) => {
          setRole(refreshedRole);
          applyGameRecord(game);
        })
        .catch(() => undefined);
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
          setRole(refreshedRole);
          if (nextVersion !== confirmedVersion) applyGameRecord(game);
        })
        .catch(() => undefined);
    }, 2000);

    return () => window.clearInterval(pollId);
  // applyGameRecord intentionally merges changed server rows while this fallback is keyed by active sync state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveGameId, hasPendingMove, isCompleted, isOnlineGameReady, playerId]);

  async function handleShareInvite() {
    if (!inviteLink) return;
    trackEvent('share_button_click', { type: 'invite', seed: seedLabel });
    const shareData = {
      title: 'Play Pocket Shuffle Chess With Friends',
      text: `${shareSetupLine}

Seed: ${seedLabel}
Back rank: ${backRankCode ?? 'Setup pending'}

Fast chess without memorized openings.
Can you beat it?`,
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
      await navigator.clipboard.writeText(`${shareData.text}

${inviteLink}`);
      setCopied(true);
    }
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleShareResult() {
    trackEvent('share_button_click', { type: 'result', seed: seedLabel, result: onlineResultTitle });
    const resultText = `${onlineResultTitle} in Pocket Shuffle Chess.

${shareSetupLine}

${onlineResultSummary}

Seed: ${seedLabel}
Back rank: ${backRankCode ?? 'Setup pending'}

Fast chess without memorized openings.
Can you beat it?`;
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

  async function handleCreateNewChallenge() {
    setError(null);
    setInviteState('creating_game');
    try {
      const createdGame = seedLabel && seedLabel !== 'Random' ? await createSeededGame(playerId, seedLabel, backRankCode ?? undefined) : await createOnlineGame(playerId);
      setEffectiveGameId(createdGame.gameId);
      setInviteState('waiting_for_link');
      window.history.replaceState(null, '', `/game/${createdGame.gameId}?mode=${matchMode}`);
    } catch (createError) {
      setInviteState('error');
      setError(createError instanceof Error ? createError.message : 'Could not create invite link.');
    }
  }

  async function handleOnlineGameAction(action: 'resign' | 'request_draw' | 'accept_draw') {
    if (!effectiveGameId || gameActionPending) return;
    setGameActionPending(true);
    setError(null);
    try {
      const { game } = await submitOnlineGameAction(effectiveGameId, playerId, action);
      applyGameRecord(game);
      if (action === 'request_draw') setToast('Draw offer sent.');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update game.');
    } finally {
      setGameActionPending(false);
    }
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

  function completeSelectedMove(selectedMove: Move) {
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
    setMoveAnnouncement(`${selectedMove.piece.color === 'white' ? 'White' : 'Black'} ${selectedMove.piece.type} moved from ${squareLabel(selectedMove.from % 5, Math.floor(selectedMove.from / 5))} to ${squareLabel(selectedMove.to % 5, Math.floor(selectedMove.to / 5))}${selectedMove.isCapture ? ' and captured a piece' : ''}.`);
    setSelectedSquare(null);
    setLegalMoves([]);
    setPendingIds((ids) => ids.add(clientMoveId));
    playMoveSound(selectedMove.isCapture);
    if (isKingInCheck(nextBoard, nextTurn)) playCheckSound();

    submitOnlineMove(effectiveGameId, playerId, selectedMove)
      .then(({ game }) => {
        const latestMove = getLatestMove(game);
        const optimisticMove = optimisticHistory.at(-1);
        const serverMoveCount = game.move_count ?? game.total_moves ?? game.move_history?.length ?? 0;
        if (sameMove(latestMove, optimisticMove) && serverMoveCount === previousStateVersion + 1) {
          setPendingIds((ids) => {
            ids.delete(clientMoveId);
            return ids;
          });
          applyGameRecord(game, { preserveLocalMove: true });
          return;
        }
        setPendingIds((ids) => {
          ids.delete(clientMoveId);
          return ids;
        });
        applyGameRecord(game);
      })
      .catch(() => {
        setPendingIds((ids) => {
          ids.delete(clientMoveId);
          return ids;
        });
        rollbackToConfirmedGame();
      });
  }

  function tryMoveTo(squareIndex: number): boolean {
    if (!canInteractWithBoard) return false;
    const selectedMove = legalMoves.find((move) => move.to === squareIndex);
    if (!selectedMove) return false;
    completeSelectedMove(selectedMove);
    return true;
  }

  function selectSquare(squareIndex: number): boolean {
    if (!canInteractWithBoard) return false;
    const piece = board[squareIndex]?.piece;
    if (piece?.color !== role) return false;
    setSelectedSquare(squareIndex);
    setLegalMoves(getLegalMoves(board, squareIndex));
    return true;
  }

  function handleSquareClick(squareIndex: number) {
    if (tryMoveTo(squareIndex)) return;
    if (selectSquare(squareIndex)) return;
    setSelectedSquare(null);
    setLegalMoves([]);
  }

  function handleDragStart(squareIndex: number): Move[] | null {
    if (!canInteractWithBoard) return null;
    const piece = board[squareIndex]?.piece;
    if (piece?.color !== role) return null;
    const moves = getLegalMoves(board, squareIndex);
    setSelectedSquare(squareIndex);
    setLegalMoves(moves);
    return moves;
  }

  function handleDrop(squareIndex: number) {
    if (!tryMoveTo(squareIndex)) {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
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
            <span className={turn === 'white' && isOnlineGameReady && !isCompleted ? 'active-score-row' : ''}><img className="score-dot piece-score-icon" src="/pieces/white-pawn.png" alt="" draggable={false} />White <strong>{scores.whiteScore}</strong></span>
            <span className={turn === 'black' && isOnlineGameReady && !isCompleted ? 'active-score-row' : ''}><img className="score-dot piece-score-icon" src="/pieces/black-pawn.png" alt="" draggable={false} />Black <strong>{scores.blackScore}</strong></span>
          </div>
          <div className="info-stack">
            <p><span className="info-label-with-piece"><img className="inline-pawn-icon" src={role === 'black' ? '/pieces/black-pawn.png' : '/pieces/white-pawn.png'} alt="" draggable={false} />You are</span><strong>{role === 'spectator' ? 'Spectating' : role === 'white' ? 'White' : 'Black'}</strong></p>
            <p><span>☌ Opponent</span><strong>{isOnlineGameReady ? 'Joined' : 'Waiting'}</strong></p>
            <p><span>● Status</span><strong>{leftPanelStatus}</strong></p>
            {isOnlineGameReady && !isCompleted && <p><span>↻ Turn</span><strong>{turn === 'white' ? 'White' : 'Black'}</strong></p>}
            <p><span>🌱 Seed</span><strong>{seedLabel}</strong></p>
            <p><span>Back rank</span><strong>{backRankCode ?? 'Setup pending'}</strong></p>
            <p><span>🎮 Game</span><strong>{roundNumber}</strong></p>
          </div>
          <p className="panel-note">{isOnlineGameReady ? (drawOfferBy ? `${drawOfferBy === role ? 'You offered a draw.' : 'Opponent offered a draw.'}` : 'Share remains available.') : shareIsLoading ? 'Share the invite link. Your friend joins when they open it.' : 'Send this link to a friend. The game starts when they join.'}</p>
          <div className="match-actions">
            <button type="button" className="wide-action primary-action" onClick={handleShareInvite} disabled={!inviteLink || shareIsLoading}>{shareIsLoading ? 'Creating Link...' : copied ? 'Copied' : isOnlineGameReady ? 'Share' : 'Share Invite'}</button>
            <button type="button" className="wide-action secondary-action" onClick={() => setManualBoardFlip((flipped) => !(flipped ?? role === 'black'))}><RotateCcw size={18} /> Flip Board</button>
          </div>
        </aside>

        <section className="board-column online-board-column">
          {board.length > 0 && (
            <>
              <p className="sr-only" aria-live="polite">{moveAnnouncement}</p>
              <Board
                ariaLabel={`Pocket Shuffle Chess online board. ${role === 'white' || role === 'black' ? `You are ${role}.` : 'Spectator view.'}`}
                board={displayBoard}
                selectedSquare={isPreviewing ? null : selectedSquare}
                legalMoves={activeLegalMoves}
                lastMove={displayMove}
                checkedKingIndex={checkedKingIndex}
                isFlipped={isFlipped}
                isInteractive={canInteractWithBoard}
                onSquareClick={handleSquareClick}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragCancel={() => { setSelectedSquare(null); setLegalMoves([]); }}
              />
            </>
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
            <p className="panel-note">{isOnlineGameReady ? 'Click a move to review. Use controls to return Live.' : 'The game starts when both players are in.'}</p>
          </div>
          <ol className="move-history move-list history-list" ref={historyListRef}>
            <MoveHistory
              moves={moveHistory}
              emptyPrimary="No moves yet."
              emptySecondary={isCompleted ? 'Game over.' : isOnlineGameReady ? 'White can make the first move.' : 'Waiting for opponent.'}
              activePly={previewPly}
              onSelectPly={(ply) => setPreviewPly(ply >= latestPly ? null : ply)}
            />
          </ol>
          <div className="review-footer history-actions">
            <div className="review-controls">
              <button type="button" onClick={() => setPreviewPly(0)} disabled={latestPly === 0 || previewPly === 0}>⏮</button>
              <button type="button" onClick={() => setPreviewPly((ply) => Math.max((ply ?? latestPly) - 1, 0))} disabled={latestPly === 0 || previewPly === 0}>‹</button>
              <button type="button" className={isPreviewing ? 'live-review-pending' : undefined} onClick={() => setPreviewPly(null)} disabled={!isPreviewing}>Live</button>
              <button type="button" onClick={() => setPreviewPly((ply) => { const nextPly = Math.min((ply ?? 0) + 1, latestPly); return nextPly >= latestPly ? null : nextPly; })} disabled={latestPly === 0 || !isPreviewing}>›</button>
              <button type="button" onClick={() => setPreviewPly(null)} disabled={latestPly === 0 || !isPreviewing}>⏭</button>
            </div>
            <div className="panel-actions stacked-actions">
              <button type="button" className="danger-action" onClick={() => handleOnlineGameAction('resign')} disabled={!canUseGameActions}>Resign</button>
              <button type="button" className="secondary-action" onClick={() => handleOnlineGameAction(drawOfferIsFromOpponent ? 'accept_draw' : 'request_draw')} disabled={!canUseGameActions || drawOfferBy === role}>{gameActionPending ? 'Updating...' : drawActionLabel}</button>
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
              {isLifecycleTerminal ? <button type="button" onClick={handleCreateNewChallenge}>Create New Challenge</button> : <button type="button" onClick={onNewOnlineGame}>New Online Game</button>}
              <button type="button" onClick={onHome}>Back Home</button>
              <button type="button" onClick={handleShareResult}>Share Result</button>
            </>
          )}
        />
      )}
    </main>
  );
}
