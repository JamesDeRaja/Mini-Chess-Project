import { useEffect, useMemo, useState } from 'react';
import { cancelMatchmaking, createDailyGame, createSeededGame, findMatchmakingGame } from '../multiplayer/gameApi.js';
import type { MatchmakingResponse } from '../multiplayer/gameApi.js';
import { getPlayerId } from '../multiplayer/playerSession.js';
import { BotGamePage } from '../pages/BotGamePage.js';
import type { MatchMode } from '../pages/BotGamePage.js';
import { HomePage } from '../pages/HomePage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { OnlineGamePage } from '../pages/OnlineGamePage.js';
import { trackEvent } from './analytics.js';
import { isValidBackRankCode } from '../game/seed.js';
import { createRandomGameSeed, resolveSeedSourceForMode } from '../game/shuffleMode.js';
import { applySeo, getSeoConfig } from './seo.js';

type Theme = 'light' | 'dark';

type Route =
  | { name: 'home' }
  | { name: 'daily' }
  | { name: 'seed'; seed: string }
  | { name: 'how-it-works' }
  | { name: 'bot'; dateKey?: string; seed?: string; backRankCode?: string }
  | { name: 'online'; gameId: string; matchMode: MatchMode }
  | { name: 'not-found' };

function isMatchMode(value: string | null): value is MatchMode {
  return value === 'single' || value === 'best-of-3' || value === 'best-of-5';
}

function routeFromLocation(): Route {
  const gameMatch = window.location.pathname.match(/^\/game\/([^/]+)$/);
  const seedMatch = window.location.pathname.match(/^\/seed\/([^/]+)$/);
  const search = new URLSearchParams(window.location.search);
  const mode = search.get('mode');
  if (gameMatch) return { name: 'online', gameId: gameMatch[1], matchMode: isMatchMode(mode) ? mode : 'single' };
  if (seedMatch) return { name: 'seed', seed: decodeURIComponent(seedMatch[1]) };
  if (window.location.pathname === '/daily') return { name: 'daily' };
  if (window.location.pathname === '/how-it-works') return { name: 'how-it-works' };
  if (window.location.pathname === '/bot') {
    const setup = search.get('setup');
    return {
      name: 'bot',
      dateKey: search.get('date') ?? undefined,
      seed: search.get('seed') ?? undefined,
      backRankCode: setup && isValidBackRankCode(setup) ? setup.toUpperCase() : undefined,
    };
  }
  if (window.location.pathname === '/') return { name: 'home' };
  return { name: 'not-found' };
}

function navigate(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function getStoredTheme(): Theme | null {
  const storedTheme = localStorage.getItem('mini_chess_theme');
  return storedTheme === 'light' ? storedTheme : null;
}

function getDefaultTheme(): Theme {
  return 'light';
}

export function App() {
  const [route, setRoute] = useState<Route>(() => routeFromLocation());
  const [selectedTheme] = useState<Theme | null>(() => getStoredTheme());
  const [inviteError, setInviteError] = useState<string | null>(null);
  const theme = selectedTheme ?? getDefaultTheme();
  const seoConfig = useMemo(() => {
    if (route.name === 'online') return getSeoConfig({ routeName: 'game', path: window.location.pathname, gameId: route.gameId });
    if (route.name === 'seed') return getSeoConfig({ routeName: 'seed', path: window.location.pathname, seed: route.seed });
    if (route.name === 'not-found') return getSeoConfig({ routeName: 'not-found', path: window.location.pathname });
    return getSeoConfig({ routeName: route.name, path: window.location.pathname });
  }, [route]);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    applySeo(seoConfig);
  }, [seoConfig]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (selectedTheme) localStorage.setItem('mini_chess_theme', selectedTheme);
  }, [selectedTheme, theme]);

  function startBot(dateKey?: string) {
    trackEvent('ai_mode_start', { dateKey: dateKey ?? 'today' });
    navigate(dateKey ? `/bot?date=${encodeURIComponent(dateKey)}` : '/bot');
  }

  function startSeededBot(seed: string, backRankCode?: string) {
    trackEvent('seed_challenge_start', { seed, backRankCode });
    const setupQuery = backRankCode ? `&setup=${encodeURIComponent(backRankCode)}` : '';
    navigate(`/bot?seed=${encodeURIComponent(seed)}${setupQuery}`);
  }

  function openCustomSeed() {
    navigate('/?modal=custom');
  }

  function playRandomSetup() {
    const randomSetup = resolveSeedSourceForMode('random', { randomSeed: createRandomGameSeed() });
    trackEvent('seed_challenge_start', { seed: randomSetup.seed, backRankCode: randomSetup.backRankCode });
    navigate(`/bot?seed=${encodeURIComponent(randomSetup.seed)}&setup=${encodeURIComponent(randomSetup.backRankCode)}`);
  }

  function handleInvite() {
    trackEvent('invite_creation_start');
    setInviteError(null);
    navigate('/game/new?mode=single&create=invite');
  }

  async function handleDaily(dateKey?: string) {
    trackEvent('daily_mode_start', { dateKey: dateKey ?? 'today' });
    setInviteError(null);
    try {
      const { gameId } = await createDailyGame(getPlayerId(), dateKey);
      navigate(`/game/${gameId}?mode=single`);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to create daily game');
    }
  }

  async function handleSeeded(seed: string, backRankCode?: string) {
    setInviteError(null);
    try {
      const { gameId } = await createSeededGame(getPlayerId(), seed, backRankCode);
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

  if (route.name === 'daily') {
    return <BotGamePage key="daily" matchMode="single" onHome={() => navigate('/')} onCustomSeed={openCustomSeed} onDaily={() => navigate('/daily')} onRandomSetup={playRandomSetup} />;
  }
  if (route.name === 'seed') {
    return <BotGamePage key={`seed-${route.seed}`} matchMode="single" customSeed={route.seed} onHome={() => navigate('/')} onCustomSeed={openCustomSeed} onDaily={() => navigate('/daily')} onRandomSetup={playRandomSetup} />;
  }
  if (route.name === 'bot') {
    return <BotGamePage key={`single-${route.seed ?? route.dateKey ?? 'today'}-${route.backRankCode ?? ''}`} matchMode="single" dateKey={route.dateKey} customSeed={route.seed} customBackRankCode={route.backRankCode} onHome={() => navigate('/')} onCustomSeed={openCustomSeed} onDaily={() => navigate('/daily')} onRandomSetup={playRandomSetup} />;
  }
  if (route.name === 'not-found') {
    return <NotFoundPage onHome={() => navigate('/')} onBot={() => navigate('/bot')} onDaily={() => navigate('/daily')} />;
  }
  if (route.name === 'online') {
    return (
      <OnlineGamePage
        gameId={route.gameId}
        matchMode={route.matchMode}
        onHome={() => navigate('/')}
        onNewOnlineGame={() => navigate('/game/new?mode=single&create=invite')}
      />
    );
  }

  return (
    <>
      <HomePage
        initialModal={route.name === 'how-it-works' ? 'rules' : new URLSearchParams(window.location.search).get('modal') === 'custom' ? 'custom' : undefined}
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
