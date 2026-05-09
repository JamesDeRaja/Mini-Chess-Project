import { Bot, Link as LinkIcon } from 'lucide-react';

type HomePageProps = {
  onStartBot: () => void;
  onInvite: () => void;
};

export function HomePage({ onStartBot, onInvite }: HomePageProps) {
  return (
    <main className="home-page">
      <section className="hero-card">
        <p className="eyebrow">5×6 randomized chess</p>
        <h1>Mini Chess</h1>
        <p>
          A compact chess variant with mirrored randomized back ranks, full legal move filtering, checkmate, stalemate,
          promotion, and a local bot.
        </p>
        <div className="home-actions">
          <button className="primary-action" onClick={onStartBot}>
            <Bot size={20} /> Play Against Bot
          </button>
          <button className="secondary-action" onClick={onInvite}>
            <LinkIcon size={20} /> Invite People
          </button>
        </div>
      </section>
    </main>
  );
}
