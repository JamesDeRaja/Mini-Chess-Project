import { useEffect, useState } from 'react';
import { createDailyGame, createOnlineGame, createSeededGame } from '../multiplayer/gameApi';
import { getPlayerId } from '../multiplayer/playerSession';
import { BotGamePage, type MatchMode } from '../pages/BotGamePage';
import { HomePage } from '../pages/HomePage';
import { OnlineGamePage } from '../pages/OnlineGamePage';

type Theme = 'light' | 'dark';

type Route =
  | { name: 'home' }
  | { name: 'bot' }
  | { name: 'online'; gameId: string; matchMode: MatchMode };

function isMatchMode(value: string | null): value is MatchMode {
  return value === 'single' || value === 'best-of-3' || value === 'best-of-5';
}

function routeFromLocation(): Route {
  const gameMatch = window.location.pathname.match(/^\/game\/([^/]+)$/);
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (gameMatch) return { name: 'online', gameId: gameMatch[1], matchMode: isMatchMode(mode) ? mode : 'single' };
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
  const [selectedMatchMode, setSelectedMatchMode] = useState<MatchMode>('single');
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

  async function handleInvite(matchMode: MatchMode) {
    setInviteError(null);
    setSelectedMatchMode(matchMode);
    try {
      const { gameId } = await createOnlineGame(getPlayerId());
      navigate(`/game/${gameId}?mode=${matchMode}`);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to create invite link');
    }
  }

  async function handleDaily(matchMode: MatchMode, dateKey?: string) {
    setInviteError(null);
    setSelectedMatchMode(matchMode);
    try {
      const { gameId } = await createDailyGame(getPlayerId(), dateKey);
      navigate(`/game/${gameId}?mode=${matchMode}`);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to create daily game');
    }
  }

  async function handleSeeded(matchMode: MatchMode, seed: string) {
    setInviteError(null);
    setSelectedMatchMode(matchMode);
    try {
      const { gameId } = await createSeededGame(getPlayerId(), seed);
      navigate(`/game/${gameId}?mode=${matchMode}`);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to create seeded game');
    }
  }

  if (route.name === 'bot') {
    return <BotGamePage key={botMatchMode} matchMode={botMatchMode} theme={theme} onToggleTheme={toggleTheme} onHome={() => navigate('/')} />;
  }
  if (route.name === 'online') {
    return (
      <OnlineGamePage
        gameId={route.gameId}
        matchMode={route.matchMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onHome={() => navigate('/')}
      />
    );
  }

  return (
    <>
      <HomePage
        theme={theme}
        selectedMatchMode={selectedMatchMode}
        onSelectMatchMode={setSelectedMatchMode}
        onToggleTheme={toggleTheme}
        onStartBot={startBot}
        onInvite={handleInvite}
        onDaily={handleDaily}
        onSeeded={handleSeeded}
      />
      {inviteError && <p className="floating-error">{inviteError}</p>}
    </>
  );
}
