import { useEffect, useState } from 'react';
import { createOnlineGame } from '../multiplayer/gameApi';
import { getPlayerId } from '../multiplayer/playerSession';
import { BotGamePage } from '../pages/BotGamePage';
import { HomePage } from '../pages/HomePage';
import { OnlineGamePage } from '../pages/OnlineGamePage';

type Route =
  | { name: 'home' }
  | { name: 'bot' }
  | { name: 'online'; gameId: string };

function routeFromLocation(): Route {
  const gameMatch = window.location.pathname.match(/^\/game\/([^/]+)$/);
  if (gameMatch) return { name: 'online', gameId: gameMatch[1] };
  if (window.location.pathname === '/bot') return { name: 'bot' };
  return { name: 'home' };
}

function navigate(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function App() {
  const [route, setRoute] = useState<Route>(() => routeFromLocation());
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  async function handleInvite() {
    setInviteError(null);
    try {
      const { gameId } = await createOnlineGame(getPlayerId());
      navigate(`/game/${gameId}`);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to create online game');
    }
  }

  if (route.name === 'bot') return <BotGamePage onHome={() => navigate('/')} />;
  if (route.name === 'online') return <OnlineGamePage gameId={route.gameId} onHome={() => navigate('/')} />;

  return (
    <>
      <HomePage onStartBot={() => navigate('/bot')} onInvite={handleInvite} />
      {inviteError && <p className="floating-error">{inviteError}</p>}
    </>
  );
}
