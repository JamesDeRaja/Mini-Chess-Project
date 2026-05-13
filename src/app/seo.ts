import { CURATED_SEEDS, getCuratedSeedBySlug, getSeedDisplayName } from '../game/curatedSeeds.js';
import { dailyBackRankCodeFromSeed, getDailySeed, getUtcDateKey, validateSeedInput } from '../game/seed.js';

const SITE_URL = 'https://chess.alphaden.club';
const SITE_NAME = 'Pocket Shuffle Chess';
const DEFAULT_DESCRIPTION = 'Play fast tactical chess on a 5x6 board with randomized mirrored setups, daily seeds, AI games, leaderboards, and instant friend challenges. No opening memorization required.';
const KEYWORDS = [
  'Pocket Shuffle Chess',
  'mini chess',
  'shuffle chess',
  'daily chess',
  'daily chess game',
  'chess variant',
  'fast chess',
  'quick chess game',
  'tactical chess',
  'chess without openings',
  'no opening theory chess',
  'casual chess',
  'browser chess game',
  'free online chess game',
  'mobile chess game',
  'AI chess game',
  'friend chess challenge',
  'chess leaderboard',
  'chess puzzle tactics',
  '5x6 chess',
  'tiny chess',
  'online chess variant',
];

const ROUTE_KEYWORDS: Record<string, string[]> = {
  daily: ['daily chess challenge', 'today chess puzzle', 'daily tactical seed', 'daily AI chess'],
  bot: ['play chess against AI', 'AI chess bot', 'fast chess bot', 'practice chess tactics'],
  seed: ['custom chess seed', 'shareable chess puzzle', 'seeded chess challenge', 'beat my score chess'],
  'seed-leaderboard': ['seed leaderboard', 'chess high scores', 'score chase chess', 'competitive chess seed'],
  'popular-seeds': ['popular chess seeds', 'trending chess challenges', 'curated chess puzzles', 'viral chess seeds'],
  challenge: ['friend chess challenge', 'beat my score chess', 'share chess challenge', 'online chess duel'],
};

type SeoRouteName = 'home' | 'daily' | 'bot' | 'seed' | 'seed-leaderboard' | 'popular-seeds' | 'challenge' | 'game' | 'how-it-works' | 'not-found';

type SeoInput = {
  routeName: SeoRouteName;
  path: string;
  seed?: string;
  dateKey?: string;
  gameId?: string;
  challengeId?: string;
};

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  image: string;
  routeName?: SeoRouteName;
  noindex?: boolean;
  keywords?: string[];
  jsonLd: Array<Record<string, unknown>>;
};

function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setLink(rel: string, href: string, type?: string, title?: string) {
  const typeSelector = type ? `[type="${type}"]` : '';
  const titleSelector = title ? `[title="${title}"]` : '';
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${typeSelector}${titleSelector}`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    if (type) element.type = type;
    if (title) element.title = title;
    document.head.appendChild(element);
  }
  element.href = href;
}

function routeKeywords(routeName?: SeoRouteName): string[] {
  return routeName ? ROUTE_KEYWORDS[routeName] ?? [] : [];
}

function seedItemList() {
  return CURATED_SEEDS.slice(0, 24).map((seed, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: seed.displayName,
    description: seed.description,
    url: absoluteUrl(`/seed/${encodeURIComponent(seed.slug)}`),
  }));
}

function createStructuredData(config: SeoConfig) {
  const canonicalUrl = absoluteUrl(config.canonicalPath);
  const imageUrl = absoluteUrl(config.image);
  const keywords = unique([...KEYWORDS, ...routeKeywords(config.routeName), ...(config.keywords ?? [])]);
  const graph: Array<Record<string, unknown>> = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Alpha Den',
      url: SITE_URL,
      logo: absoluteUrl('/Icon.png'),
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ['Pocket Chess', 'Pocket Shuffle', '5x6 Shuffle Chess'],
      url: SITE_URL,
      inLanguage: 'en-US',
      publisher: { '@id': `${SITE_URL}/#organization` },
      description: DEFAULT_DESCRIPTION,
      keywords,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/seed/{search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#webapp`,
      name: SITE_NAME,
      applicationCategory: 'GameApplication',
      operatingSystem: 'iOS, Android, macOS, Windows, Linux',
      browserRequirements: 'Requires a modern browser with JavaScript enabled.',
      url: SITE_URL,
      image: imageUrl,
      author: { '@id': `${SITE_URL}/#organization` },
      description: DEFAULT_DESCRIPTION,
      keywords,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        '5x6 mini chess board',
        'Mirrored randomized back-rank seeds',
        'Daily tactical chess seed',
        'AI chess games',
        'Friend challenge links',
        'Seed leaderboards and score sharing',
        'Mobile-friendly browser gameplay',
      ],
    },
    {
      '@type': 'VideoGame',
      '@id': `${SITE_URL}/#game`,
      name: SITE_NAME,
      alternateName: ['Pocket Chess', 'Pocket Shuffle'],
      url: SITE_URL,
      image: imageUrl,
      description: 'A fast 5x6 shuffle chess variant with mirrored randomized setups, daily tactical seeds, AI battles, score leaderboards, and friend challenge links.',
      genre: ['Chess variant', 'Tactical chess', 'Casual strategy game', 'Puzzle strategy'],
      gamePlatform: ['Web browser', 'Mobile browser'],
      playMode: ['SinglePlayer', 'MultiPlayer'],
      keywords,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: config.title,
      description: config.description,
      image: imageUrl,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#game` },
      inLanguage: 'en-US',
      keywords,
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': `${SITE_URL}/#navigation`,
      name: ['Home', 'Daily Shuffle', 'Play AI', 'Popular Seeds', 'How It Works'],
      url: [SITE_URL, absoluteUrl('/daily'), absoluteUrl('/bot'), absoluteUrl('/seeds'), absoluteUrl('/how-it-works')],
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Pocket Shuffle Chess?',
          acceptedAnswer: { '@type': 'Answer', text: 'Pocket Shuffle Chess is a free browser chess variant played on a 5x6 board with randomized mirrored setups, daily seeds, AI games, and friend challenge links.' },
        },
        {
          '@type': 'Question',
          name: 'Why is there no opening memorization?',
          acceptedAnswer: { '@type': 'Answer', text: 'Every seed changes the back-rank order, so players must solve tactical positions instead of relying on memorized opening lines.' },
        },
        {
          '@type': 'Question',
          name: 'Can I play on mobile?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Pocket Shuffle Chess is designed for mobile and desktop browsers with touch-friendly controls and fast games.' },
        },
      ],
    },
  ];

  if (config.routeName === 'popular-seeds' || config.routeName === 'home') {
    graph.push({
      '@type': 'ItemList',
      '@id': `${SITE_URL}/#popular-seeds`,
      name: 'Popular Pocket Shuffle Chess seeds',
      itemListElement: seedItemList(),
    });
  }

  return [{ '@context': 'https://schema.org', '@graph': graph }];
}

function withStructuredData(config: Omit<SeoConfig, 'jsonLd'>): SeoConfig {
  const completeConfig = { ...config, jsonLd: [] } satisfies SeoConfig;
  return { ...completeConfig, jsonLd: createStructuredData(completeConfig) };
}

export function getSeoConfig(input: SeoInput): SeoConfig {
  if (input.routeName === 'daily') {
    const dateKey = input.dateKey ?? getUtcDateKey();
    const seed = getDailySeed(dateKey);
    const backRankCode = dailyBackRankCodeFromSeed(seed);
    return withStructuredData({
      routeName: 'daily',
      title: `${dateKey} Daily Shuffle Chess Seed (${backRankCode}) | Pocket Shuffle Chess`,
      description: `Play the ${dateKey} Pocket Shuffle Chess daily seed (${backRankCode}). Solve the same fast 5x6 tactical chess setup, beat the AI, and challenge friends to top your score.`,
      canonicalPath: input.dateKey ? `/daily/${encodeURIComponent(dateKey)}` : '/daily',
      image: '/og-daily.svg',
      keywords: [dateKey, seed, backRankCode],
    });
  }

  if (input.routeName === 'seed' && input.seed) {
    const seedValidation = validateSeedInput(input.seed);
    if (seedValidation.ok === false) {
      return withStructuredData({
        routeName: 'seed',
        title: 'Invalid Seed - Pocket Shuffle Chess',
        description: 'This seed is invalid. Return home or enter a valid Pocket Shuffle Chess custom seed for a fast 5x6 chess challenge.',
        canonicalPath: input.path,
        image: '/og-result.svg',
        noindex: true,
      });
    }
    const seed = seedValidation.normalizedSeed;
    const backRankCode = seedValidation.backRankCode;
    const curatedSeed = getCuratedSeedBySlug(seed);
    const displayName = getSeedDisplayName(seed);
    return withStructuredData({
      routeName: 'seed',
      title: `${displayName} Seed (${backRankCode}) - Play a 5x6 Chess Challenge`,
      description: `${curatedSeed?.description ?? `Play seed ${seed}`} Setup ${backRankCode}. Practice against AI, send a friend challenge, and chase the leaderboard in Pocket Shuffle Chess.`,
      canonicalPath: `/seed/${encodeURIComponent(seed)}`,
      image: '/og-result.svg',
      keywords: [seed, displayName, backRankCode, ...(curatedSeed?.tags ?? [])],
    });
  }

  if (input.routeName === 'seed-leaderboard' && input.seed) {
    const seedValidation = validateSeedInput(input.seed);
    const seed = seedValidation.ok ? seedValidation.normalizedSeed : input.seed;
    const backRankCode = seedValidation.ok ? seedValidation.backRankCode : '';
    const displayName = getSeedDisplayName(seed);
    return withStructuredData({
      routeName: 'seed-leaderboard',
      title: `${displayName} Leaderboard - Best Scores for Pocket Shuffle Chess`,
      description: `View the ${displayName} seed leaderboard${backRankCode ? ` for setup ${backRankCode}` : ''}. Replay the same 5x6 shuffle chess challenge and beat the best score.`,
      canonicalPath: `/seed/${encodeURIComponent(seed)}/leaderboard`,
      image: '/og-result.svg',
      keywords: [seed, displayName, backRankCode, 'leaderboard', 'high score'],
    });
  }

  if (input.routeName === 'popular-seeds') {
    return withStructuredData({
      routeName: 'popular-seeds',
      title: 'Popular Shuffle Chess Seeds - Trending 5x6 Chess Challenges',
      description: 'Browse popular Pocket Shuffle Chess seeds, curated tactical setups, high-score challenges, and shareable 5x6 chess puzzles built for quick AI games and friend duels.',
      canonicalPath: '/seeds',
      image: '/og-home.svg',
      keywords: CURATED_SEEDS.slice(0, 12).flatMap((seed) => [seed.slug, seed.displayName, ...seed.tags]),
    });
  }

  if (input.routeName === 'challenge') {
    return withStructuredData({
      routeName: 'challenge',
      title: 'Pocket Shuffle Chess Friend Challenge - Beat the Score',
      description: 'Open a Pocket Shuffle Chess friend challenge, play the exact same 5x6 shuffle chess seed, and try to beat the shared score.',
      canonicalPath: input.challengeId ? `/challenge/${encodeURIComponent(input.challengeId)}` : input.path,
      image: '/og-result.svg',
      keywords: ['friend challenge', 'beat my score', 'share chess game'],
    });
  }

  if (input.routeName === 'bot') {
    return withStructuredData({
      routeName: 'bot',
      title: 'Play Shuffle Chess Against AI - Fast 5x6 Chess Bot',
      description: 'Play Pocket Shuffle Chess against AI in fast 2-5 minute games with daily tactical seeds, randomized mirrored setups, score tracking, and no opening theory.',
      canonicalPath: '/bot',
      image: '/og-home.svg',
    });
  }

  if (input.routeName === 'not-found') {
    return withStructuredData({
      routeName: 'not-found',
      title: 'Page Not Found - Pocket Shuffle Chess',
      description: 'This page does not exist. Return home, play today’s daily shuffle chess seed, or start a fast AI game.',
      canonicalPath: input.path,
      image: '/og-home.svg',
      noindex: true,
    });
  }

  if (input.routeName === 'game') {
    return withStructuredData({
      routeName: 'game',
      title: 'Play Pocket Shuffle Chess With Friends',
      description: 'Open this Pocket Shuffle Chess friend game for a fast online 5x6 chess variant match with randomized mirrored setups and no memorized openings.',
      canonicalPath: input.gameId ? `/game/${encodeURIComponent(input.gameId)}` : '/game/new',
      image: '/og-result.svg',
      noindex: true,
      keywords: ['private chess game', 'online chess match'],
    });
  }

  if (input.routeName === 'how-it-works') {
    return withStructuredData({
      routeName: 'how-it-works',
      title: 'How Pocket Shuffle Chess Works - Rules, Seeds, Scoring, AI',
      description: 'Learn the Pocket Shuffle Chess rules: 5x6 board, mirrored randomized back-rank seeds, daily AI ladder, score bonuses, friend challenges, and fast tactical games.',
      canonicalPath: '/how-it-works',
      image: '/og-home.svg',
      keywords: ['Pocket Shuffle Chess rules', '5x6 chess rules', 'shuffle chess scoring'],
    });
  }

  return withStructuredData({
    routeName: 'home',
    title: 'Pocket Shuffle Chess - Fast 5x6 Chess Without Memorized Openings',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: '/',
    image: '/og-home.svg',
  });
}

export function applySeo(config: SeoConfig) {
  const canonicalUrl = absoluteUrl(config.canonicalPath);
  const imageUrl = absoluteUrl(config.image);
  const keywords = unique([...KEYWORDS, ...routeKeywords(config.routeName), ...(config.keywords ?? [])]).join(', ');

  document.title = config.title;
  setMeta('meta[name="description"]', 'name', 'description', config.description);
  setMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
  setMeta('meta[name="robots"]', 'name', 'robots', config.noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  setMeta('meta[name="googlebot"]', 'name', 'googlebot', config.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  setMeta('meta[name="bingbot"]', 'name', 'bingbot', config.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
  setMeta('meta[name="application-name"]', 'name', 'application-name', SITE_NAME);
  setMeta('meta[name="apple-mobile-web-app-title"]', 'name', 'apple-mobile-web-app-title', SITE_NAME);
  setMeta('meta[name="author"]', 'name', 'author', 'Alpha Den');
  setMeta('meta[name="category"]', 'name', 'category', 'Game, Chess, Strategy, Puzzle');
  setMeta('meta[name="classification"]', 'name', 'classification', 'free browser chess variant, strategy game, tactical puzzle game');
  setLink('canonical', canonicalUrl);
  setLink('alternate', absoluteUrl('/llms.txt'), 'text/plain', 'LLMs.txt');
  setLink('alternate', absoluteUrl('/ai.txt'), 'text/plain', 'AI crawler summary');

  setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
  setMeta('meta[property="og:title"]', 'property', 'og:title', config.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', config.description);
  setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
  setMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', `${SITE_NAME} 5x6 shuffle chess board preview`);
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
  setMeta('meta[property="og:locale"]', 'property', 'og:locale', 'en_US');
  setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', config.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', config.description);
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
  setMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', `${SITE_NAME} 5x6 shuffle chess board preview`);

  document.head.querySelectorAll('script[data-pocket-seo="jsonld"]').forEach((element) => element.remove());
  for (const data of config.jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.pocketSeo = 'jsonld';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

export function getShareUrl(path = window.location.pathname): string {
  return absoluteUrl(path);
}
