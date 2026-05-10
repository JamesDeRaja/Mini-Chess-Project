import { useEffect, useState } from 'react';
import { cancelMatchmaking, createDailyGame, createSeededGame, findMatchmakingGame } from '../multiplayer/gameApi.js';
import type { MatchmakingResponse } from '../multiplayer/gameApi.js';
import { getPlayerId } from '../multiplayer/playerSession.js';
import { BotGamePage } from '../pages/BotGamePage.js';
import type { MatchMode } from '../pages/BotGamePage.js';
import { HomePage } from '../pages/HomePage.js';
import { OnlineGamePage } from '../pages/OnlineGamePage.js';

type Theme = 'light' | 'dark';

type Route =
  | { name: 'home' }
  | { name: 'bot'; dateKey?: string; seed?: string }
  | { name: 'online'; gameId: string; matchMode: MatchMode };

function isMatchMode(value: string | null): value is MatchMode {
  return value === 'single' || value === 'best-of-3' || value === 'best-of-5';
}

function routeFromLocation(): Route {
  const gameMatch = window.location.pathname.match(/^\/game\/([^/]+)$/);
  const search = new URLSearchParams(window.location.search);
  const mode = search.get('mode');
  if (gameMatch) return { name: 'online', gameId: gameMatch[1], matchMode: isMatchMode(mode) ? mode : 'single' };
  if (window.location.pathname === '/bot') return { name: 'bot', dateKey: search.get('date') ?? undefined, seed: search.get('seed') ?? undefined };
  return { name: 'home' };
}

function navigate(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function getStoredTheme(): Theme | null {
  const storedTheme = localStorage.getItem('mini_chess_theme');
  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
}

function getDefaultTheme(): Theme {
  return 'light';
}

export function App() {
  const [route, setRoute] = useState<Route>(() => routeFromLocation());
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(() => getStoredTheme());
  const [inviteError, setInviteError] = useState<string | null>(null);
  const theme = selectedTheme ?? getDefaultTheme();

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (selectedTheme) localStorage.setItem('mini_chess_theme', selectedTheme);
  }, [selectedTheme, theme]);

  function toggleTheme() {
    setSelectedTheme((currentTheme) => {
      const activeTheme = currentTheme ?? theme;
      return activeTheme === 'dark' ? 'light' : 'dark';
    });
  }

  function startBot(dateKey?: string) {
    navigate(dateKey ? `/bot?date=${encodeURIComponent(dateKey)}` : '/bot');
  }

  function startSeededBot(seed: string) {
    navigate(`/bot?seed=${encodeURIComponent(seed)}`);
  }

  function handleInvite() {
    setInviteError(null);
    navigate('/game/new?mode=single&create=invite');
  }

  async function handleDaily(dateKey?: string) {
    setInviteError(null);
    try {
      const { gameId } = await createDailyGame(getPlayerId(), dateKey);
      navigate(`/game/${gameId}?mode=single`);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to create daily game');
    }
  }

  async function handleSeeded(seed: string) {
    setInviteError(null);
    try {
      const { gameId } = await createSeededGame(getPlayerId(), seed);
      navigate(`/game/${gameId}?mode=single`);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to create seeded game');
    }
  }

  async function handleFindMatch(seed: string, backRankCode: string): Promise<MatchmakingResponse> {
    setInviteError(null);
    const result = await findMatchmakingGame(getPlayerId(), seed, backRankCode);
    if (result.status === 'matched') navigate(`/game/${result.gameId}?mode=single`);
    return result;
  }

  async function handleCancelFindMatch(queueId?: string) {
    await cancelMatchmaking(getPlayerId(), queueId);
  }

  if (route.name === 'bot') {
    return <BotGamePage key={`single-${route.seed ?? route.dateKey ?? 'today'}`} matchMode="single" dateKey={route.dateKey} customSeed={route.seed} theme={theme} onToggleTheme={toggleTheme} onHome={() => navigate('/')} />;
  }
  if (route.name === 'online') {
    return (
      <OnlineGamePage
        gameId={route.gameId}
        matchMode={route.matchMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onHome={() => navigate('/')}
        onNewOnlineGame={() => navigate('/game/new?mode=single&create=invite')}
      />
    );
  }

  return (
    <>
      <HomePage
        theme={theme}
        onToggleTheme={toggleTheme}
        onStartBot={startBot}
        onStartSeededBot={startSeededBot}
        onInvite={handleInvite}
        onDaily={handleDaily}
        onSeeded={handleSeeded}
        onFindMatch={handleFindMatch}
        onCancelFindMatch={handleCancelFindMatch}
      />
      {inviteError && <p className="floating-error">{inviteError}</p>}
    </>
  );
}
