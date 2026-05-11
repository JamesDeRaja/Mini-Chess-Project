import { useMemo, type MouseEvent } from 'react';
import { Bot, CalendarDays, Home, Sparkles } from 'lucide-react';

type NotFoundPageProps = {
  onHome: () => void;
  onBot: () => void;
  onDaily: () => void;
};

type LostPiece = {
  id: string;
  src: string;
  alt: string;
  line: string;
};

const lostPieces: LostPiece[] = [
  { id: 'white-queen', src: '/pieces/white-queen.png', alt: 'White queen', line: 'The queen checked the map and still took a wrong turn.' },
  { id: 'black-queen', src: '/pieces/black-queen.png', alt: 'Black queen', line: 'The queen tried a power move and left the board.' },
  { id: 'white-rook', src: '/pieces/white-rook.png', alt: 'White rook', line: 'The rook marched straight into the address bar.' },
  { id: 'black-rook', src: '/pieces/black-rook.png', alt: 'Black rook', line: 'The rook found a file, but not this page.' },
  { id: 'white-bishop', src: '/pieces/white-bishop.png', alt: 'White bishop', line: 'The bishop went diagonal and missed the route.' },
  { id: 'black-bishop', src: '/pieces/black-bishop.png', alt: 'Black bishop', line: 'The bishop spotted a shortcut that was not legal.' },
  { id: 'white-knight', src: '/pieces/white-knight.png', alt: 'White knight', line: 'The knight hopped in an L and landed nowhere.' },
  { id: 'black-knight', src: '/pieces/black-knight.png', alt: 'Black knight', line: 'The knight jumped the line and lost the square.' },
  { id: 'white-pawn', src: '/pieces/white-pawn.png', alt: 'White pawn', line: 'The pawn advanced bravely into a missing page.' },
  { id: 'black-pawn', src: '/pieces/black-pawn.png', alt: 'Black pawn', line: 'The pawn took one small step outside the board.' },
  { id: 'white-king', src: '/pieces/white-king.png', alt: 'White king', line: 'The king is safe, but this square is not real.' },
  { id: 'black-king', src: '/pieces/black-king.png', alt: 'Black king', line: 'The king called check, but the page was gone.' },
];

function stopAndRun(event: MouseEvent<HTMLAnchorElement>, action: () => void) {
  event.preventDefault();
  action();
}

function randomizeLostPieces(): LostPiece[] {
  return [...lostPieces]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

export function NotFoundPage({ onHome, onBot, onDaily }: NotFoundPageProps) {
  const [mainPiece, sidePiece, fallenPiece] = useMemo(() => randomizeLostPieces(), []);

  return (
    <main className="not-found-page" aria-labelledby="not-found-title">
      <section className="not-found-card">
        <header className="not-found-nav" aria-label="Pocket Shuffle Chess">
          <a href="/" className="not-found-brand" onClick={(event) => stopAndRun(event, onHome)}>
            <span className="brand-icon-tile" aria-hidden="true"><img src="/Icon.png" alt="" draggable={false} /></span>
            <span>POCKET SHUFFLE CHESS</span>
          </a>
        </header>

        <div className="not-found-content">
          <div className="not-found-copy">
            <p className="eyebrow">Illegal move</p>
            <h1 id="not-found-title">404</h1>
            <h2>This square does not exist.</h2>
            <p>Looks like this move went off the board.</p>
            <div className="not-found-actions">
              <a className="button-link secondary-action" href="/" onClick={(event) => stopAndRun(event, onHome)}><Home size={19} aria-hidden="true" /> Go Home</a>
              <a className="button-link gold-action" href="/bot" onClick={(event) => stopAndRun(event, onBot)}><Bot size={19} aria-hidden="true" /> Play Against Bot</a>
              <a className="button-link subtle-link" href="/daily" onClick={(event) => stopAndRun(event, onDaily)}><CalendarDays size={17} aria-hidden="true" /> Try Today&apos;s Daily</a>
            </div>
          </div>

          <div className="not-found-board-scene" aria-hidden="true">
            <Sparkles className="not-found-sparkle sparkle-one" size={32} />
            <Sparkles className="not-found-sparkle sparkle-two" size={24} />
            <div className="not-found-mini-board">
              <div className="not-found-file-labels"><span>K</span><span>N</span><span>K</span><span>B</span><span>Q</span></div>
              <div className="not-found-board-grid">
                {Array.from({ length: 25 }, (_, index) => <span key={index} />)}
              </div>
              <div className="not-found-file-labels bottom"><span>Q</span><span>B</span><span>K</span><span>N</span><span>R</span></div>
              <img className="lost-piece lost-piece-main" src={mainPiece.src} alt={mainPiece.alt} draggable={false} />
              <img className="lost-piece lost-piece-side" src={sidePiece.src} alt={sidePiece.alt} draggable={false} />
              <img className="lost-piece lost-piece-fallen" src={fallenPiece.src} alt={fallenPiece.alt} draggable={false} />
            </div>
            <div className="not-found-speech"><strong>Oops!</strong><span>{mainPiece.line}</span><span>{sidePiece.line}</span><span>{fallenPiece.line}</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
