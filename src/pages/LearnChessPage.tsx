import { useMemo, useState } from 'react';
import { ArrowRight, Bot, Home, Lightbulb, Sparkles } from 'lucide-react';
import { BOARD_FILES, BOARD_RANKS, BOARD_SIZE } from '../game/constants.js';
import { getPieceImageSrc } from '../game/pieceAssets.js';
import type { Board, Piece, PieceType } from '../game/types.js';
import { getHomepagePieceMoves } from '../home/getHomepagePieceMoves.js';
import { pieceDialogues } from '../home/pieceDialogues.js';

type LearnChessPageProps = {
  initialPiece?: PieceType;
  onHome: () => void;
  onPlayAi: () => void;
  onPiece: (piece: PieceType) => void;
};

type PieceLesson = {
  title: string;
  tagline: string;
  movement: string[];
  captures: string[];
  tryThis: string;
};

const pieceOrder: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

const pepTalks = [
  'Do not be scared to tap around. The board lights up every legal idea before you commit.',
  'You are allowed to experiment here. Yellow dots are safe moves, red rings are captures, and no one is judging the first plan.',
  'Try a piece, read the hints, then play AI when you are curious. The game shows options, so you never have to guess in the dark.',
  'Tiny board, tiny pressure. Click through the pieces and let the highlights do the explaining.',
];

const lessons: Record<PieceType, PieceLesson> = {
  king: {
    title: 'King',
    tagline: 'Important, dramatic, and allergic to danger.',
    movement: ['Moves one square in any direction: up, down, sideways, or diagonal.', 'Your king may not move onto a square attacked by the opponent.', 'There is no castling in Pocket Shuffle Chess, so king safety comes from good moves, not paperwork.'],
    captures: ['Captures one adjacent enemy piece if that square is safe.', 'The king never captures the enemy king; checkmate ends the game instead.'],
    tryThis: 'Tap the king and notice the small one-square bubble around it.',
  },
  queen: {
    title: 'Queen',
    tagline: 'The whole board is her calendar.',
    movement: ['Moves any number of open squares vertically, horizontally, or diagonally.', 'She stops when she reaches the board edge or the first occupied square.', 'On a 5x6 board, queen lines get spicy fast.'],
    captures: ['Captures the first enemy piece in any straight or diagonal line.', 'She cannot jump over pieces, even when she is feeling very confident.'],
    tryThis: 'Tap the queen to see rook lines and bishop diagonals combine.',
  },
  rook: {
    title: 'Rook',
    tagline: 'Straight lines, zero small talk.',
    movement: ['Moves any number of open squares up, down, left, or right.', 'Rooks love open files and ranks.', 'There is no castling, but rooks are still excellent at bossing lanes.'],
    captures: ['Captures the first enemy piece it reaches on a straight line.', 'Friendly pieces block the rook, so clear lanes matter.'],
    tryThis: 'Tap the rook and follow the plus-sign pattern across the board.',
  },
  bishop: {
    title: 'Bishop',
    tagline: 'Diagonal specialist. Very committed to the angle.',
    movement: ['Moves any number of open squares diagonally.', 'A bishop stays on the same square color for the whole game.', 'On this compact board, one diagonal can become a whole tactical argument.'],
    captures: ['Captures the first enemy piece on a diagonal line.', 'It cannot jump over pieces, so blockers matter.'],
    tryThis: 'Tap the bishop and watch the X-shaped lanes appear.',
  },
  knight: {
    title: 'Knight',
    tagline: 'Moves like a question mark with hooves.',
    movement: ['Moves in an L shape: two squares one way, then one square sideways.', 'Knights can jump over every piece in between.', 'The destination square is all that matters.'],
    captures: ['Captures an enemy piece on its landing square.', 'It does not capture anything it jumps over. Very rude, very legal.'],
    tryThis: 'Tap the knight and look for the jump targets around it.',
  },
  pawn: {
    title: 'Pawn',
    tagline: 'Small piece, suspicious amount of ambition.',
    movement: ['White pawns move one square upward; black pawns move one square downward.', 'Pocket Shuffle pawns move one square at a time. No two-square first move here.', 'Reach the far rank and the pawn promotes into a stronger piece.'],
    captures: ['Pawns capture one square diagonally forward.', 'They do not capture straight ahead, even if an enemy is standing there looking annoying.'],
    tryThis: 'Tap the pawn and compare the forward move with the diagonal captures.',
  },
};

const demoOrigins: Record<PieceType, { file: number; rank: number }> = {
  king: { file: 2, rank: 2 },
  queen: { file: 2, rank: 2 },
  rook: { file: 2, rank: 2 },
  bishop: { file: 2, rank: 2 },
  knight: { file: 2, rank: 2 },
  pawn: { file: 2, rank: 1 },
};

const demoCaptures: Record<PieceType, Array<{ file: number; rank: number; type: PieceType }>> = {
  king: [{ file: 1, rank: 3, type: 'pawn' }, { file: 3, rank: 2, type: 'bishop' }],
  queen: [{ file: 4, rank: 2, type: 'rook' }, { file: 0, rank: 4, type: 'knight' }, { file: 2, rank: 5, type: 'bishop' }],
  rook: [{ file: 4, rank: 2, type: 'bishop' }, { file: 2, rank: 5, type: 'queen' }, { file: 0, rank: 2, type: 'knight' }],
  bishop: [{ file: 4, rank: 4, type: 'rook' }, { file: 0, rank: 4, type: 'knight' }, { file: 4, rank: 0, type: 'pawn' }],
  knight: [{ file: 4, rank: 3, type: 'rook' }, { file: 0, rank: 3, type: 'bishop' }, { file: 3, rank: 0, type: 'queen' }, { file: 1, rank: 4, type: 'pawn' }],
  pawn: [{ file: 1, rank: 2, type: 'knight' }, { file: 3, rank: 2, type: 'bishop' }],
};

function squareIndex(file: number, rank: number): number {
  return rank * BOARD_FILES + file;
}

function createPiece(type: PieceType, color: 'white' | 'black', id: string): Piece {
  return { id, type, color, hasMoved: false };
}

function createLessonBoard(pieceType: PieceType): { board: Board; selectedIndex: number } {
  const board: Board = Array.from({ length: BOARD_SIZE }, (_item, index) => ({
    file: index % BOARD_FILES,
    rank: Math.floor(index / BOARD_FILES),
    piece: null,
  }));
  const origin = demoOrigins[pieceType];
  const selectedIndex = squareIndex(origin.file, origin.rank);
  board[selectedIndex].piece = createPiece(pieceType, 'white', `learn-white-${pieceType}`);
  for (const target of demoCaptures[pieceType]) {
    board[squareIndex(target.file, target.rank)].piece = createPiece(target.type, 'black', `learn-black-${pieceType}-${target.file}-${target.rank}`);
  }
  return { board, selectedIndex };
}

function piecePath(piece: PieceType): string {
  return `/learn/${piece}`;
}

export function LearnChessPage({ initialPiece = 'king', onHome, onPlayAi, onPiece }: LearnChessPageProps) {
  const [selectedPiece, setSelectedPiece] = useState<PieceType>(initialPiece);
  const [pepIndex, setPepIndex] = useState(() => pieceOrder.indexOf(initialPiece) % pepTalks.length);


  const lesson = lessons[selectedPiece];
  const { board, selectedIndex } = useMemo(() => createLessonBoard(selectedPiece), [selectedPiece]);
  const preview = useMemo(() => getHomepagePieceMoves(board, selectedIndex), [board, selectedIndex]);
  const moves = useMemo(() => new Set(preview.moves), [preview.moves]);
  const captures = useMemo(() => new Set(preview.captures), [preview.captures]);
  const previewRows = useMemo(() => Array.from({ length: BOARD_RANKS }, (_rankPlaceholder, rowIndex) => {
    const rank = BOARD_RANKS - 1 - rowIndex;
    return Array.from({ length: BOARD_FILES }, (_filePlaceholder, file) => board[squareIndex(file, rank)]);
  }), [board]);

  function choosePiece(piece: PieceType) {
    setSelectedPiece(piece);
    setPepIndex((current) => (current + 1) % pepTalks.length);
    onPiece(piece);
  }

  return (
    <main className="learn-page">
      <button type="button" className="seed-detail-home-button" aria-label="Go home" onClick={onHome}><Home size={22} /></button>
      <section className="learn-hero-card">
        <div className="learn-copy">
          <p className="eyebrow">Learn Chess</p>
          <h1>Learn one piece at a time. Then go bully the AI politely.</h1>
          <p>Tap a piece below to see every move and capture it can try on the 5x6 Pocket Shuffle board. Yellow dots are moves. Red rings are captures. Do not be scared to experiment.</p>
          <div className="learn-pep-card" aria-live="polite"><Sparkles size={18} /> {pepTalks[pepIndex]}</div>
          <div className="learn-piece-tabs" aria-label="Choose a piece lesson">
            {pieceOrder.map((piece) => (
              <button
                key={piece}
                type="button"
                className={piece === selectedPiece ? 'is-active' : ''}
                onClick={() => choosePiece(piece)}
                aria-current={piece === selectedPiece ? 'page' : undefined}
              >
                <img src={getPieceImageSrc({ type: piece, color: 'white' })} alt="" draggable={false} />
                {lessons[piece].title}
              </button>
            ))}
          </div>
        </div>
        <div className="learn-board-panel">
          <div className="preview-board-frame learn-board-frame">
            <div className="preview-board-grid meet-board-grid learn-board-grid" role="grid" aria-label={`${lesson.title} movement lesson board`}>
              {previewRows.flatMap((row) => row.map((square) => {
                const index = squareIndex(square.file, square.rank);
                const isSelected = index === selectedIndex;
                const isMove = moves.has(index);
                const isCapture = captures.has(index);
                const squareClassName = [
                  'preview-square',
                  'meet-square',
                  isSelected ? 'is-selected' : '',
                  isMove ? 'is-move-preview' : '',
                  isCapture ? 'is-capture-preview' : '',
                ].filter(Boolean).join(' ');
                return (
                  <div key={`${square.rank}-${square.file}`} className={squareClassName} role="gridcell" aria-label={square.piece ? `${square.piece.color} ${square.piece.type}` : isMove ? 'Move option' : 'Empty square'}>
                    {square.piece && <img src={getPieceImageSrc(square.piece)} alt="" draggable={false} />}
                  </div>
                );
              }))}
            </div>
          </div>
          <div className="meet-piece-preview-tags learn-preview-tags" aria-label="Movement preview legend">
            <span className="meet-preview-chip-move"><i className="meet-legend-orb" aria-hidden="true" /> move</span>
            <span className="meet-preview-chip-capture"><i className="meet-legend-capture" aria-hidden="true" /> capture</span>
          </div>
        </div>
      </section>

      <section className="learn-lesson-card" aria-labelledby="learn-piece-title">
        <div className="learn-lesson-title">
          <span className={`meet-piece-icon meet-piece-icon-${selectedPiece}`} aria-hidden="true"><img src={getPieceImageSrc({ type: selectedPiece, color: 'white' })} alt="" draggable={false} /></span>
          <div>
            <p className="eyebrow">Piece lesson</p>
            <h2 id="learn-piece-title">{lesson.title}</h2>
            <p>{lesson.tagline}</p>
          </div>
        </div>
        <div className="learn-rule-grid">
          <article>
            <h3><Lightbulb size={18} /> How it moves</h3>
            <ul>{lesson.movement.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <h3><ArrowRight size={18} /> How it captures</h3>
            <ul>{lesson.captures.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
        <p className="learn-try-line">{lesson.tryThis} The board above shows every possible option for this piece right now.</p>
        <div className="panel-actions centered-actions">
          <button type="button" onClick={() => choosePiece(pieceOrder[(pieceOrder.indexOf(selectedPiece) + 1) % pieceOrder.length])}>Next piece</button>
          <button type="button" className="secondary-action" onClick={() => setPepIndex((current) => (current + 1) % pepTalks.length)}>Try another message</button>
          <button type="button" className="secondary-action" onClick={onPlayAi}><Bot size={17} /> Play with AI</button>
        </div>
      </section>

      <nav className="learn-piece-links" aria-label="All learn pages">
        {pieceOrder.map((piece) => <a key={piece} href={piecePath(piece)} onClick={(event) => { event.preventDefault(); choosePiece(piece); }}>{pieceDialogues[piece].name}</a>)}
      </nav>
    </main>
  );
}
