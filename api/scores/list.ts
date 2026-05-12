import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../games/serverSupabase.js';

type ScoreRow = {
  id: string;
  player_id: string;
  display_name: string;
  seed: string;
  back_rank_code: string | null;
  mode: string;
  side: string;
  result: string;
  score: number;
  moves: number;
  created_at: string;
};

const maleLeaderboardNames = [
  'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin', 'Lucas', 'Henry', 'Theodore',
  'Jack', 'Levi', 'Alexander', 'Jackson', 'Mateo', 'Daniel', 'Michael', 'Mason', 'Sebastian', 'Ethan',
  'Logan', 'Owen', 'Samuel', 'Jacob', 'Asher', 'Aiden', 'John', 'Joseph', 'Wyatt', 'David',
  'Leo', 'Luke', 'Julian', 'Hudson', 'Grayson', 'Matthew', 'Ezra', 'Gabriel', 'Carter', 'Isaac',
  'Jayden', 'Luca', 'Anthony', 'Dylan', 'Lincoln', 'Thomas', 'Maverick', 'Elias', 'Josiah', 'Charles',
  'Caleb', 'Christopher', 'Ezekiel', 'Miles', 'Jaxon', 'Isaiah', 'Andrew', 'Joshua', 'Nathan', 'Nolan',
  'Adrian', 'Cameron', 'Santiago', 'Eli', 'Aaron', 'Ryan', 'Angel', 'Cooper', 'Waylon', 'Easton',
  'Kai', 'Christian', 'Landon', 'Colton', 'Roman', 'Axel', 'Brooks', 'Jonathan', 'Robert', 'Jameson',
  'Ian', 'Everett', 'Greyson', 'Wesley', 'Jeremiah', 'Hunter', 'Leonardo', 'Jordan', 'Jose', 'Bennett',
  'Silas', 'Nicholas', 'Parker', 'Beau', 'Weston', 'Austin', 'Connor', 'Carson', 'Dominic', 'Xavier',
];

const femaleLeaderboardNames = [
  'Olivia', 'Emma', 'Charlotte', 'Amelia', 'Sophia', 'Mia', 'Isabella', 'Ava', 'Evelyn', 'Luna',
  'Harper', 'Sofia', 'Camila', 'Eleanor', 'Elizabeth', 'Violet', 'Scarlett', 'Emily', 'Hazel', 'Lily',
  'Gianna', 'Aurora', 'Penelope', 'Aria', 'Nora', 'Chloe', 'Ellie', 'Mila', 'Avery', 'Layla',
  'Abigail', 'Ella', 'Isla', 'Eliana', 'Nova', 'Madison', 'Zoe', 'Ivy', 'Grace', 'Lucy',
  'Willow', 'Emilia', 'Riley', 'Naomi', 'Victoria', 'Stella', 'Elena', 'Hannah', 'Valentina', 'Maya',
  'Zoey', 'Delilah', 'Leah', 'Lainey', 'Lillian', 'Paisley', 'Genesis', 'Madelyn', 'Sadie', 'Sophie',
  'Leilani', 'Addison', 'Natalie', 'Josephine', 'Alice', 'Ruby', 'Claire', 'Kinsley', 'Everly', 'Emery',
  'Adeline', 'Kennedy', 'Maeve', 'Audrey', 'Autumn', 'Athena', 'Eden', 'Iris', 'Anna', 'Eloise',
  'Jade', 'Maria', 'Caroline', 'Brooklyn', 'Quinn', 'Aaliyah', 'Vivian', 'Liliana', 'Gabriella', 'Hailey',
  'Sarah', 'Savannah', 'Cora', 'Madeline', 'Natalia', 'Ariana', 'Lydia', 'Lyla', 'Clara', 'Allison',
];

const randomLeaderboardNames = [
  'CheckmateGoblin', 'PawnGoblin', 'TinyRook', 'BishopBotherer', 'KnightMare', 'ForkEnjoyer', 'BlunderChef', 'MateMagnet', 'PocketTactician', 'QueenSneak',
  'RookSnack', 'BoardGremlin', 'CastlelessKing', 'TempoThief', 'PinCollector', 'SkewerWizard', 'PawnStormy', 'MiniMate', 'ShuffleGremlin', 'EndgameEel',
  'TacticToaster', 'FiveBySixer', 'RankRascal', 'FileFerret', 'DiagonalDodo', 'CheckChaser', 'MateMoth', 'LooseKnight', 'SneakyBishop', 'RookRaccoon',
  'QueenQuokka', 'KingKobold', 'PawnPanic', 'TinyTerror', 'ForkGoblin', 'BlitzBadger', 'ShuffleShark', 'BoardBandit', 'TempoGoblin', 'PinPenguin',
  'SkewerOtter', 'CaptureCrow', 'PocketPenguin', 'MateMoose', 'RookRider', 'BishopBean', 'KnightNoodle', 'PawnPigeon', 'QueenQuill', 'KingKiwi',
  'CheckCactus', 'TinyTurtle', 'BlunderBard', 'TacticTurnip', 'ForkFalcon', 'BoardBurrito', 'ShuffleSloth', 'MateMango', 'RookRocket', 'BishopBiscuit',
  'KnightKoala', 'PawnPumpkin', 'QueenQuasar', 'KingKetchup', 'CheckChurro', 'TempoTaco', 'PinPanda', 'SkewerSeal', 'CaptureCapybara', 'PocketPirate',
  'MiniMischief', 'RankRabbit', 'FileFox', 'DiagonalDuck', 'EndgameImp', 'MateMeteor', 'RookPebble', 'BishopBubble', 'KnightNacho', 'PawnPretzel',
  'QueenQuibble', 'KingKazoo', 'CheckComet', 'TinyThunder', 'BlunderBug', 'TacticTuna', 'ForkFerret', 'BoardBeetle', 'ShuffleSprite', 'MateMuffin',
  'RookRiddle', 'BishopBongo', 'KnightKite', 'PawnPickle', 'QueenQuartz', 'KingCrab', 'CheckChipmunk', 'TempoToast', 'PinPuffin', 'SkewerSquid',
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashString(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledDailyNames(seed: string): string[] {
  const names = [...maleLeaderboardNames, ...femaleLeaderboardNames, ...randomLeaderboardNames];
  const random = seededRandom(seed);
  for (let index = names.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [names[index], names[swapIndex]] = [names[swapIndex], names[index]];
  }
  return names;
}

function createDailyLeaderboardFillers(seed: string, mode: string): ScoreRow[] {
  if (mode !== 'daily' || !seed.startsWith('daily-')) return [];
  const random = seededRandom(`leaderboard:${seed}`);
  return shuffledDailyNames(seed).slice(0, 100).map((displayName, index) => {
    const side = random() < 0.5 ? 'white' : 'black';
    return {
      id: `daily-bot-${seed}-${index}`,
      player_id: `daily-bot-${index}`,
      display_name: displayName,
      seed,
      back_rank_code: null,
      mode,
      side,
      result: side === 'white' ? 'white_won' : 'black_won',
      score: 35 + Math.floor(random() * 65),
      moves: 8 + Math.floor(random() * 34),
      created_at: new Date(Date.UTC(2026, 0, 1, 0, index, 0)).toISOString(),
    };
  });
}

function sortScores(scores: ScoreRow[]): ScoreRow[] {
  return [...scores].sort((a, b) => b.score - a.score || a.moves - b.moves || a.created_at.localeCompare(b.created_at));
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).send('Method not allowed');
    return;
  }

  const seed = typeof request.query.seed === 'string' ? request.query.seed : null;
  const mode = typeof request.query.mode === 'string' ? request.query.mode : 'daily';
  if (!seed) {
    response.status(400).send('Missing seed');
    return;
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('seed', seed)
    .eq('mode', mode)
    .order('score', { ascending: false })
    .order('moves', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    response.status(500).send(error.message);
    return;
  }

  const bestByPlayerSeedModeSide = new Map<string, ScoreRow>();
  for (const row of (data ?? []) as ScoreRow[]) {
    const key = `${row.player_id}:${row.seed}:${row.mode}:${row.side}`;
    if (!bestByPlayerSeedModeSide.has(key)) bestByPlayerSeedModeSide.set(key, row);
  }

  for (const row of createDailyLeaderboardFillers(seed, mode)) {
    const key = `${row.player_id}:${row.seed}:${row.mode}:${row.side}`;
    if (!bestByPlayerSeedModeSide.has(key)) bestByPlayerSeedModeSide.set(key, row);
  }

  response.status(200).json({ scores: sortScores([...bestByPlayerSeedModeSide.values()]).slice(0, 25) });
}
