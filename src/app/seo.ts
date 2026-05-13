import { dailyBackRankCodeFromSeed, getDailySeed, getUtcDateKey, validateSeedInput } from '../game/seed.js';

const SITE_URL = 'https://chess.alphaden.club';
const SITE_NAME = 'Pocket Shuffle Chess';
const DEFAULT_DESCRIPTION = 'Play fast tactical chess on a 5x6 board with randomized mirrored setups, daily seeds, and instant friend challenges. No opening memorization required.';
const KEYWORDS = [
  'mini chess',
  'shuffle chess',
  'daily chess',
  'chess variant',
  'fast chess',
  'tactical chess',
  'chess without openings',
  'casual chess',
  'browser chess game',
  'mobile chess game',
  'chess puzzle tactics',
  '5x6 chess',
  'online chess variant',
];

type SeoInput = {
  routeName: 'home' | 'daily' | 'bot' | 'seed' | 'game' | 'how-it-works' | 'not-found';
  path: string;
  seed?: string;
  dateKey?: string;
  gameId?: string;
};

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  image: string;
  noindex?: boolean;
  jsonLd: Array<Record<string, unknown>>;
};

function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
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

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

function createStructuredData(config: SeoConfig) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/seed/{search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'GameApplication',
      operatingSystem: 'iOS, Android, macOS, Windows, Linux',
      browserRequirements: 'Requires a modern browser with JavaScript enabled.',
      url: SITE_URL,
      image: absoluteUrl(config.image),
      author: { '@type': 'Organization', name: 'Alpha Den' },
      description: DEFAULT_DESCRIPTION,
      keywords: KEYWORDS.join(', '),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: SITE_NAME,
      url: SITE_URL,
      image: absoluteUrl(config.image),
      description: 'A fast 5x6 shuffle chess variant with mirrored randomized setups, daily tactical seeds, AI battles, and friend challenge links.',
      genre: ['Chess variant', 'Tactical chess', 'Casual strategy game'],
      gamePlatform: ['Web browser', 'Mobile browser'],
      keywords: KEYWORDS.join(', '),
    },
  ];
}

export function getSeoConfig(input: SeoInput): SeoConfig {
  if (input.routeName === 'daily') {
    const dateKey = input.dateKey ?? getUtcDateKey();
    const seed = getDailySeed(dateKey);
    const backRankCode = dailyBackRankCodeFromSeed(seed);
    const config = {
      title: 'Daily Shuffle Chess - Today’s Tactical Seed',
      description: `Play the ${dateKey} Pocket Shuffle Chess daily seed (${backRankCode}) and challenge your friends to the same tactical 5x6 setup.`,
      canonicalPath: '/daily',
      image: '/og-daily.svg',
      jsonLd: [],
    } satisfies SeoConfig;
    return { ...config, jsonLd: createStructuredData(config) };
  }

  if (input.routeName === 'seed' && input.seed) {
    const seedValidation = validateSeedInput(input.seed);
    if (seedValidation.ok === false) {
      const config = {
        title: 'Invalid Seed - Pocket Shuffle Chess',
        description: 'This seed is invalid. Return home or enter a valid Pocket Shuffle Chess custom seed.',
        canonicalPath: input.path,
        image: '/og-result.svg',
        noindex: true,
        jsonLd: [],
      } satisfies SeoConfig;
      return { ...config, jsonLd: createStructuredData(config) };
    }
    const seed = seedValidation.normalizedSeed;
    const backRankCode = seedValidation.backRankCode;
    const config = {
      title: `Custom Seed Chess Challenge - ${backRankCode} | Pocket Shuffle Chess`,
      description: `Play seed ${seed} (${backRankCode}) as a shareable 5x6 mirrored shuffle chess challenge. Fast tactical chess without memorized openings.`,
      canonicalPath: `/seed/${encodeURIComponent(seed)}`,
      image: '/og-result.svg',
      jsonLd: [],
    } satisfies SeoConfig;
    return { ...config, jsonLd: createStructuredData(config) };
  }

  if (input.routeName === 'bot') {
    const config = {
      title: 'Play Shuffle Chess Against AI',
      description: 'Play Pocket Shuffle Chess against AI in fast 2-5 minute matches with daily tactical seeds and 5x6 mirrored setups.',
      canonicalPath: '/bot',
      image: '/og-home.svg',
      jsonLd: [],
    } satisfies SeoConfig;
    return { ...config, jsonLd: createStructuredData(config) };
  }

  if (input.routeName === 'not-found') {
    const config = {
      title: 'Page Not Found - Pocket Shuffle Chess',
      description: 'This page does not exist. Return home or play Pocket Shuffle Chess against the bot.',
      canonicalPath: input.path,
      image: '/og-home.svg',
      noindex: true,
      jsonLd: [],
    } satisfies SeoConfig;
    return { ...config, jsonLd: createStructuredData(config) };
  }

  if (input.routeName === 'game') {
    const config = {
      title: 'Play Pocket Shuffle Chess With Friends',
      description: 'Open this Pocket Shuffle Chess friend challenge for a fast online 5x6 chess variant match without memorized openings.',
      canonicalPath: input.gameId ? `/game/${encodeURIComponent(input.gameId)}` : '/game/new',
      image: '/og-result.svg',
      noindex: true,
      jsonLd: [],
    } satisfies SeoConfig;
    return { ...config, jsonLd: createStructuredData(config) };
  }

  if (input.routeName === 'how-it-works') {
    const config = {
      title: 'How Pocket Shuffle Chess Works',
      description: 'Learn the simple 5x6 mirrored setup, daily tactical seed, and fast chess variant rules behind Pocket Shuffle Chess.',
      canonicalPath: '/how-it-works',
      image: '/og-home.svg',
      jsonLd: [],
    } satisfies SeoConfig;
    return { ...config, jsonLd: createStructuredData(config) };
  }

  const config = {
    title: 'Pocket Shuffle Chess - Fast Chess Without Memorized Openings',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: '/',
    image: '/og-home.svg',
    jsonLd: [],
  } satisfies SeoConfig;
  return { ...config, jsonLd: createStructuredData(config) };
}

export function applySeo(config: SeoConfig) {
  const canonicalUrl = absoluteUrl(config.canonicalPath);
  const imageUrl = absoluteUrl(config.image);

  document.title = config.title;
  setMeta('meta[name="description"]', 'name', 'description', config.description);
  setMeta('meta[name="keywords"]', 'name', 'keywords', KEYWORDS.join(', '));
  setMeta('meta[name="robots"]', 'name', 'robots', config.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  setLink('canonical', canonicalUrl);

  setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
  setMeta('meta[property="og:title"]', 'property', 'og:title', config.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', config.description);
  setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
  setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', config.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', config.description);
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

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
