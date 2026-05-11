import type { MouseEvent } from 'react';
import { Bot, CalendarDays, Home, Sparkles } from 'lucide-react';

type NotFoundPageProps = {
  onHome: () => void;
  onBot: () => void;
  onDaily: () => void;
};

function stopAndRun(event: MouseEvent<HTMLAnchorElement>, action: () => void) {
  event.preventDefault();
  action();
}

export function NotFoundPage({ onHome, onBot, onDaily }: NotFoundPageProps) {
  return (
    <main className="not-found-page" aria-labelledby="not-found-title">
      <section className="not-found-card">
        <header className="not-found-nav" aria-label="Pocket Shuffle Chess">
          <a href="/" className="not-found-brand" onClick={(event) => stopAndRun(event, onHome)}>
            <span className="brand-icon-tile" aria-hidden="true"><img src="/Icon.png" alt="" draggable={false} /></span>
            <span>POCKET SHUFFLE CHESS</span>
          </a>
          <nav className="not-found-links" aria-label="404 actions">
            <a href="/how-it-works">How It Works</a>
            <a href="/daily" onClick={(event) => stopAndRun(event, onDaily)}>Daily Setup</a>
            <a className="not-found-nav-button" href="/bot" onClick={(event) => stopAndRun(event, onBot)}>Play Now</a>
          </nav>
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
              <img className="lost-king" src="/pieces/white-king.png" alt="" draggable={false} />
              <img className="lost-pawn" src="/pieces/black-pawn.png" alt="" draggable={false} />
              <img className="fallen-king" src="/pieces/black-king.png" alt="" draggable={false} />
            </div>
            <div className="not-found-speech"><strong>Oops!</strong><span>Looks like this page got lost.</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
