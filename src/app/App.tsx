import { useEffect, useMemo, useState } from 'react';
import { cancelMatchmaking, createDailyGame, createSeededGame, findMatchmakingGame } from '../multiplayer/gameApi.js';
import type { MatchmakingResponse } from '../multiplayer/gameApi.js';
import { getPlayerId } from '../multiplayer/playerSession.js';
import { BotGamePage } from '../pages/BotGamePage.js';
import { ChallengeLandingPage } from '../pages/ChallengeLandingPage.js';
import { PopularSeedsPage } from '../pages/PopularSeedsPage.js';
import { SeedLeaderboardPage } from '../pages/SeedLeaderboardPage.js';
import { SeedDetailPage } from '../pages/SeedDetailPage.js';
import { NameGateModal } from '../components/NameGateModal.js';
import { hasCustomDisplayName } from '../game/localPlayer.js';
import type { MatchMode } from '../pages/BotGamePage.js';
import { HomePage } from '../pages/HomePage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { OnlineGamePage } from '../pages/OnlineGamePage.js';
import { trackEvent } from './analytics.js';
import { isValidBackRankCode } from '../game/seed.js';
import type { ActiveChallengeContext } from '../game/challenge.js';
import { createRandomGameSeed, resolveSeedSourceForMode } from '../game/shuffleMode.js';
import { applySeo, getSeoConfig } from './seo.js';

type Theme = 'light' | 'dark';

type Route =
  | { name: 'home' }
  | { name: 'daily'; dateKey?: string }
  | { name: 'seed'; seed: string }
  | { name: 'seed-leaderboard'; seed: string }
  | { name: 'challenge'; challengeId: string }
  | { name: 'popular-seeds' }
  | { name: 'how-it-works' }
  | { name: 'bot'; dateKey?: string; seed?: string; backRankCode?: string; side?: 'white' | 'black' }
  | { name: 'online'; gameId: string; matchMode: MatchMode }
  | { name: 'not-found' };

function isMatchMode(value: string | null): value is MatchMode {
  return value === 'single' || value === 'best-of-3' || value === 'best-of-5';
}

function routeFromLocation(): Route {
  const gameMatch = window.location.pathname.match(/^\/game\/([^/]+)$/);
  const challengeMatch = window.location.pathname.match(/^\/challenge\/([^/]+)$/);
  const seedLeaderboardMatch = window.location.pathname.match(/^\/seed\/([^/]+)\/leaderboard$/);
  const seedMatch = window.location.pathname.match(/^\/seed\/([^/]+)$/);
  const dailyMatch = window.location.pathname.match(/^\/daily\/([0-9]{4}-[0-9]{2}-[0-9]{2})$/);
  const search = new URLSearchParams(window.location.search);
  const mode = search.get('mode');
  if (gameMatch) return { name: 'online', gameId: gameMatch[1], matchMode: isMatchMode(mode) ? mode : 'single' };
  if (challengeMatch) return { name: 'challenge', challengeId: decodeURIComponent(challengeMatch[1]) };
  if (seedLeaderboardMatch) return { name: 'seed-leaderboard', seed: decodeURIComponent(seedLeaderboardMatch[1]) };
  if (seedMatch) return { name: 'seed', seed: decodeURIComponent(seedMatch[1]) };
  if (dailyMatch) return { name: 'daily', dateKey: dailyMatch[1] };
  if (window.location.pathname === '/daily') return { name: 'daily' };
  if (window.location.pathname === '/seeds' || window.location.pathname === '/seeds/popular') return { name: 'popular-seeds' };
  if (window.location.pathname === '/how-it-works') return { name: 'how-it-works' };
  if (window.location.pathname === '/bot') {
    const setup = search.get('setup');
    return {
      name: 'bot',
      dateKey: search.get('date') ?? undefined,
      seed: search.get('seed') ?? undefined,
      backRankCode: setup && isValidBackRankCode(setup) ? setup.toUpperCase() : undefined,
      side: search.get('side') === 'black' ? 'black' : search.get('side') === 'white' ? 'white' : undefined,
    };
  }
  if (window.location.pathname === '/') return { name: 'home' };
  return { name: 'not-found' };
}

function resetPageScroll() {
  window.scrollTo({ top: 0, left: 0 });
  document.querySelectorAll<HTMLElement>('.challenge-page, .home-page, .game-page').forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });
}

function navigate(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.requestAnimationFrame(resetPageScroll);
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
  const [nameGateOpen, setNameGateOpen] = useState(() => !hasCustomDisplayName());
  const theme = selectedTheme ?? getDefaultTheme();
  const seoConfig = useMemo(() => {
    if (route.name === 'online') return getSeoConfig({ routeName: 'game', path: window.location.pathname, gameId: route.gameId });
    if (route.name === 'seed') return getSeoConfig({ routeName: 'seed', path: window.location.pathname, seed: route.seed });
    if (route.name === 'not-found') return getSeoConfig({ routeName: 'not-found', path: window.location.pathname });
    if (route.name === 'challenge' || route.name === 'seed-leaderboard' || route.name === 'popular-seeds') return getSeoConfig({ routeName: 'seed', path: window.location.pathname });
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
    return <><BotGamePage key={`daily-${route.dateKey ?? 'today'}`} matchMode="single" dateKey={route.dateKey} onHome={() => navigate('/')} onCustomSeed={openCustomSeed} onDaily={() => navigate('/daily')} onRandomSetup={playRandomSetup} />{nameGateOpen && <NameGateModal open={nameGateOpen} onComplete={() => setNameGateOpen(false)} />}</>;
  }
  if (route.name === 'challenge') {
    return <><ChallengeLandingPage challengeId={route.challengeId} onPlayChallenge={(context: ActiveChallengeContext) => navigate(`/bot?seed=${encodeURIComponent(context.seedSlug)}&setup=${encodeURIComponent(context.backRankCode)}&challenge=${encodeURIComponent(JSON.stringify(context))}`)} onSeedLeaderboard={(seed) => navigate(`/seed/${encodeURIComponent(seed)}/leaderboard`)} onHome={() => navigate('/')} onDaily={() => navigate('/daily')} />{nameGateOpen && <NameGateModal open={nameGateOpen} onComplete={() => setNameGateOpen(false)} />}</>;
  }
  if (route.name === 'popular-seeds') {
    return <><PopularSeedsPage onPlaySeed={startSeededBot} onChallengeSeed={handleSeeded} onOpenSeed={(seed) => navigate(`/seed/${encodeURIComponent(seed)}`)} onHome={() => navigate('/')} />{nameGateOpen && <NameGateModal open={nameGateOpen} onComplete={() => setNameGateOpen(false)} />}</>;
  }
  if (route.name === 'seed-leaderboard') {
    return <><SeedLeaderboardPage seedSlug={route.seed} onPlaySeed={startSeededBot} onHome={() => navigate('/')} />{nameGateOpen && <NameGateModal open={nameGateOpen} onComplete={() => setNameGateOpen(false)} />}</>;
  }
  if (route.name === 'seed') {
    return <><SeedDetailPage seedSlug={route.seed} onPlaySeed={startSeededBot} onChallengeSeed={handleSeeded} onLeaderboard={(seed) => navigate(`/seed/${encodeURIComponent(seed)}/leaderboard`)} onOpenSeed={(seed) => navigate(`/seed/${encodeURIComponent(seed)}`)} onHome={() => navigate('/')} />{nameGateOpen && <NameGateModal open={nameGateOpen} onComplete={() => setNameGateOpen(false)} />}</>;
  }
  if (route.name === 'bot') {
    const challengeParam = new URLSearchParams(window.location.search).get('challenge');
    let activeChallengeContext: ActiveChallengeContext | undefined;
    try { activeChallengeContext = challengeParam ? JSON.parse(challengeParam) as ActiveChallengeContext : undefined; } catch { activeChallengeContext = undefined; }
    return <><BotGamePage key={`single-${route.seed ?? route.dateKey ?? 'today'}-${route.backRankCode ?? ''}-${route.side ?? ''}-${activeChallengeContext?.challengeId ?? ''}`} matchMode="single" dateKey={route.dateKey} customSeed={route.seed} customBackRankCode={route.backRankCode} playerSide={route.side} activeChallengeContext={activeChallengeContext} onHome={() => navigate('/')} onCustomSeed={openCustomSeed} onDaily={() => navigate('/daily')} onRandomSetup={playRandomSetup} />{nameGateOpen && <NameGateModal open={nameGateOpen} onComplete={() => setNameGateOpen(false)} />}</>;
  }
  if (route.name === 'not-found') {
    return <NotFoundPage onHome={() => navigate('/')} onBot={() => navigate('/bot')} onDaily={() => navigate('/daily')} />;
  }
  if (route.name === 'online') {
    return (
      <>
      <OnlineGamePage
        gameId={route.gameId}
        matchMode={route.matchMode}
        onHome={() => navigate('/')}
        onNewOnlineGame={() => navigate('/game/new?mode=single&create=invite')}
      />
      {nameGateOpen && <NameGateModal open={nameGateOpen} onComplete={() => setNameGateOpen(false)} />}
      </>
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
      {nameGateOpen && <NameGateModal open={nameGateOpen} onComplete={() => setNameGateOpen(false)} />}
    </>
  );
}
