import { useCallback, useEffect, useMemo, useState } from 'react';
import { Board } from '../components/Board';
import { GameHeader } from '../components/GameHeader';
import { applyMove, createMoveRecord } from '../game/applyMove';
import { getWeightedBotMove } from '../game/bot';
import { findKingIndex, isKingInCheck } from '../game/check';
import { createInitialBoard } from '../game/createInitialBoard';
import { getOpponent, getStatusForTurn } from '../game/gameStatus';
import { getLegalMoves } from '../game/legalMoves';
import type { Board as ChessBoard, Color, GameStatus, Move, MoveRecord } from '../game/types';

type BotGamePageProps = {
  onHome: () => void;
};

export function BotGamePage({ onHome }: BotGamePageProps) {
  const [board, setBoard] = useState<ChessBoard>(() => createInitialBoard());
  const [turn, setTurn] = useState<Color>('white');
  const [status, setStatus] = useState<GameStatus>('active');
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);

  const checkedKingIndex = useMemo(() => (isKingInCheck(board, turn) ? findKingIndex(board, turn) : null), [board, turn]);

  const completeMove = useCallback((move: Move) => {
    const nextBoard = applyMove(board, move);
    const nextTurn = getOpponent(move.piece.color);
    setBoard(nextBoard);
    setTurn(nextTurn);
    setStatus(getStatusForTurn(nextBoard, nextTurn));
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(move);
    setMoveHistory((history) => [...history, createMoveRecord(move)]);
  }, [board]);

  function handleSquareClick(squareIndex: number) {
    if (status !== 'active' || turn !== 'white') return;

    const selectedMove = legalMoves.find((move) => move.to === squareIndex);
    if (selectedMove) {
      completeMove(selectedMove);
      return;
    }

    const piece = board[squareIndex].piece;
    if (piece?.color === turn) {
      setSelectedSquare(squareIndex);
      setLegalMoves(getLegalMoves(board, squareIndex));
      return;
    }

    setSelectedSquare(null);
    setLegalMoves([]);
  }

  useEffect(() => {
    if (status !== 'active' || turn !== 'black') return;

    const timeoutId = window.setTimeout(() => {
      const botMove = getWeightedBotMove(board, 'black');
      if (botMove) completeMove(botMove);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [board, completeMove, status, turn]);

  function restart() {
    setBoard(createInitialBoard());
    setTurn('white');
    setStatus('active');
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setMoveHistory([]);
  }

  return (
    <main className="game-page">
      <GameHeader title="Play Against Bot" turn={turn} status={status} playerRole="You are White" />
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
          <h2>Move history</h2>
          <ol className="move-history">
            {moveHistory.map((record, moveIndex) => (
              <li key={`${record.timestamp}-${moveIndex}`}>
                {record.color} {record.piece} {record.from}→{record.to}{record.captured ? ` captures ${record.captured}` : ''}
              </li>
            ))}
          </ol>
          <div className="panel-actions">
            <button onClick={restart}>Restart</button>
            <button onClick={onHome}>Home</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
