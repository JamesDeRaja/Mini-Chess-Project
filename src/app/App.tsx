import { useEffect, useState } from 'react';
import { createOnlineGame } from '../multiplayer/gameApi';
import { getPlayerId } from '../multiplayer/playerSession';
import { BotGamePage, type MatchMode } from '../pages/BotGamePage';
import { HomePage } from '../pages/HomePage';
import { OnlineGamePage } from '../pages/OnlineGamePage';

type Theme = 'light' | 'dark';

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

function getStoredTheme(): Theme {
  const storedTheme = localStorage.getItem('mini_chess_theme');
  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
}

export function App() {
  const [route, setRoute] = useState<Route>(() => routeFromLocation());
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());
  const [botMatchMode, setBotMatchMode] = useState<MatchMode>('single');
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('mini_chess_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }

  function startBot(matchMode: MatchMode) {
    setBotMatchMode(matchMode);
    navigate('/bot');
  }

  async function handleInvite() {
    setInviteError(null);
    try {
      const { gameId } = await createOnlineGame(getPlayerId());
      navigate(`/game/${gameId}`);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to create online game');
    }
  }

  if (route.name === 'bot') {
    return <BotGamePage matchMode={botMatchMode} theme={theme} onToggleTheme={toggleTheme} onHome={() => navigate('/')} />;
  }
  if (route.name === 'online') {
    return <OnlineGamePage gameId={route.gameId} theme={theme} onToggleTheme={toggleTheme} onHome={() => navigate('/')} />;
  }

  return (
    <>
      <HomePage theme={theme} onToggleTheme={toggleTheme} onStartBot={startBot} onInvite={handleInvite} />
      {inviteError && <p className="floating-error">{inviteError}</p>}
    </>
  );
}
