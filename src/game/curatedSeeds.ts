export type CuratedSeed = {
  slug: string;
  displayName: string;
  description: string;
  tags: string[];
  aliases?: string[];
};

export const CURATED_SEEDS: CuratedSeed[] = [
  { slug: 'gotham-chaos', displayName: 'Gotham Chaos', description: 'A dark tactical setup with early queen pressure.', tags: ['chaos', 'tactical'], aliases: ['otham-chaos'] },
  { slug: 'boss-battle', displayName: 'Boss Battle', description: 'A direct challenge seed for competitive rematches.', tags: ['challenge', 'hard'] },
  { slug: 'rook-trap', displayName: 'Rook Trap', description: 'Rooks become tempting targets early.', tags: ['trap', 'rook'] },
  { slug: 'queen-rush', displayName: 'Queen Rush', description: 'Queen activity appears early, but greed can backfire.', tags: ['queen', 'fast'] },
  { slug: 'knight-panic', displayName: 'Knight Panic', description: 'Knight jumps create instant tactical threats.', tags: ['knight', 'tactics'] },
  { slug: 'bishop-storm', displayName: 'Bishop Storm', description: 'Diagonal pressure builds quickly.', tags: ['bishop', 'attack'] },
  { slug: 'pawn-wall', displayName: 'Pawn Wall', description: 'A cramped setup that rewards pawn timing.', tags: ['pawn', 'positional'] },
  { slug: 'tiny-war', displayName: 'Tiny War', description: 'A compact battlefield with no slow opening phase.', tags: ['fast', 'compact'] },
  { slug: 'mirror-madness', displayName: 'Mirror Madness', description: 'Same material, strange symmetry, sharp tactics.', tags: ['mirror', 'chaos'] },
  { slug: 'crown-hunt', displayName: 'Crown Hunt', description: 'The king becomes vulnerable faster than expected.', tags: ['king', 'attack'] },
  { slug: 'blitz-cave', displayName: 'Blitz Cave', description: 'A fast seed built for short tactical games.', tags: ['blitz', 'fast'] },
  { slug: 'trap-door', displayName: 'Trap Door', description: 'One careless capture opens the board.', tags: ['trap', 'tactical'] },
  { slug: 'fork-factory', displayName: 'Fork Factory', description: 'Knight and queen forks appear often.', tags: ['fork', 'tactics'] },
  { slug: 'check-rush', displayName: 'Check Rush', description: 'Early checks can snowball into mate threats.', tags: ['check', 'attack'] },
  { slug: 'queen-bait', displayName: 'Queen Bait', description: 'The queen looks powerful, but can become a target.', tags: ['queen', 'trap'] },
  { slug: 'rook-rumble', displayName: 'Rook Rumble', description: 'Rooks fight for open files quickly.', tags: ['rook', 'battle'] },
  { slug: 'bishop-bite', displayName: 'Bishop Bite', description: 'Diagonal captures decide the pace.', tags: ['bishop', 'capture'] },
  { slug: 'knight-cage', displayName: 'Knight Cage', description: 'Knight mobility is the key puzzle.', tags: ['knight', 'puzzle'] },
  { slug: 'pawn-break', displayName: 'Pawn Break', description: 'Pawn captures open dangerous lanes.', tags: ['pawn', 'tactical'] },
  { slug: 'royal-mess', displayName: 'Royal Mess', description: 'The king starts safe, but not for long.', tags: ['king', 'chaos'] },
  { slug: 'mini-mayhem', displayName: 'Mini Mayhem', description: 'A chaotic tiny-board fight.', tags: ['chaos', 'fast'] },
  { slug: 'sharp-corners', displayName: 'Sharp Corners', description: 'Edge squares matter more than they seem.', tags: ['board', 'tactics'] },
  { slug: 'center-crush', displayName: 'Center Crush', description: 'Control the center or get squeezed.', tags: ['center', 'positional'] },
  { slug: 'side-swipe', displayName: 'Side Swipe', description: 'Side attacks arrive faster on the 5x6 board.', tags: ['flank', 'attack'] },
  { slug: 'backrank-brawl', displayName: 'Backrank Brawl', description: 'Back-rank piece order creates immediate tension.', tags: ['backrank', 'battle'] },
  { slug: 'chaos-crown', displayName: 'Chaos Crown', description: 'A messy setup where king safety decides everything.', tags: ['chaos', 'king'] },
  { slug: 'silent-fork', displayName: 'Silent Fork', description: 'Quiet moves create brutal forks.', tags: ['fork', 'puzzle'] },
  { slug: 'fast-mate', displayName: 'Fast Mate', description: 'Built for players hunting quick checkmates.', tags: ['mate', 'fast'] },
  { slug: 'narrow-board', displayName: 'Narrow Board', description: 'The small width creates forced confrontations.', tags: ['compact', 'strategy'] },
  { slug: 'queen-corner', displayName: 'Queen Corner', description: 'Queen placement changes the whole opening fight.', tags: ['queen', 'positional'] },
  { slug: 'rook-road', displayName: 'Rook Road', description: 'Open lanes decide the winner.', tags: ['rook', 'lane'] },
  { slug: 'bishop-lane', displayName: 'Bishop Lane', description: 'Diagonal lanes are unusually important.', tags: ['bishop', 'lane'] },
  { slug: 'knight-jump', displayName: 'Knight Jump', description: 'Jump tactics appear almost immediately.', tags: ['knight', 'fast'] },
  { slug: 'pawn-chaos', displayName: 'Pawn Chaos', description: 'Pawns create messy tactical openings.', tags: ['pawn', 'chaos'] },
  { slug: 'king-sprint', displayName: 'King Sprint', description: 'The king may need to move earlier than expected.', tags: ['king', 'survival'] },
  { slug: 'tactical-tiny', displayName: 'Tactical Tiny', description: 'Small board, big tactical punishment.', tags: ['tactical', 'compact'] },
  { slug: 'daily-dragon', displayName: 'Daily Dragon', description: 'A spicy seed for daily challenge sharing.', tags: ['daily', 'attack'] },
  { slug: 'brain-brawl', displayName: 'Brain Brawl', description: 'A seed designed for score battles.', tags: ['challenge', 'score'] },
  { slug: 'no-book', displayName: 'No Book', description: 'Opening theory is useless here.', tags: ['anti-opening', 'tactical'] },
  { slug: 'fresh-opening', displayName: 'Fresh Opening', description: 'A new opening puzzle every time.', tags: ['opening', 'puzzle'] },
  { slug: 'seed-slayer', displayName: 'Seed Slayer', description: 'Built for beat-my-score sharing.', tags: ['challenge', 'viral'] },
  { slug: 'mate-hunter', displayName: 'Mate Hunter', description: 'Checkmate threats appear quickly.', tags: ['mate', 'attack'] },
  { slug: 'capture-race', displayName: 'Capture Race', description: 'Material swings fast.', tags: ['capture', 'score'] },
  { slug: 'score-chase', displayName: 'Score Chase', description: 'Optimized for chasing higher points.', tags: ['score', 'replay'] },
  { slug: 'friend-duel', displayName: 'Friend Duel', description: 'Best used as a direct friend challenge.', tags: ['friend', 'duel'] },
  { slug: 'revenge-seed', displayName: 'Revenge Seed', description: 'Lose once, replay, and send it back.', tags: ['rematch', 'challenge'] },
  { slug: 'tiny-tactics', displayName: 'Tiny Tactics', description: 'A clean tactical seed for quick games.', tags: ['tactics', 'fast'] },
  { slug: 'wild-mirror', displayName: 'Wild Mirror', description: 'Mirrored fairness with chaotic outcomes.', tags: ['mirror', 'chaos'] },
  { slug: 'opening-zero', displayName: 'Opening Zero', description: 'No memorized opening survives this setup.', tags: ['anti-opening', 'fresh'] },
  { slug: 'final-boss', displayName: 'Final Boss', description: 'A hard-looking seed made for bragging rights.', tags: ['hard', 'challenge'] },
];

export function normalizeSeedSlug(input: string): string {
  const raw = input.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const match = CURATED_SEEDS.find((seed) => seed.slug === raw || seed.aliases?.includes(raw));
  return match?.slug ?? raw;
}

export function getCuratedSeedBySlug(slug: string): CuratedSeed | null {
  const normalized = normalizeSeedSlug(slug);
  return CURATED_SEEDS.find((seed) => seed.slug === normalized) ?? null;
}

export function getSeedDisplayName(seedSlug: string): string {
  const seed = getCuratedSeedBySlug(seedSlug);
  if (seed) return seed.displayName;
  return normalizeSeedSlug(seedSlug).split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || seedSlug;
}
