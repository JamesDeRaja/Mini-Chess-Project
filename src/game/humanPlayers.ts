export const HUMAN_PLAYER_NAMES = [
  'Alex', 'Jordan', 'Sam', 'Riley', 'Morgan',
  'Casey', 'Avery', 'Taylor', 'Jamie', 'Skyler',
  'Drew', 'Quinn', 'Parker', 'Reese', 'Finley',
  'Charlie', 'Sage', 'Blake', 'Cameron', 'Dylan',
  'Hayden', 'Peyton', 'Rowan', 'Dakota', 'Lennon',
  'Phoenix', 'Emerson', 'Harper', 'Elliot', 'Wren',
  'Kai', 'Nova', 'Ash', 'River', 'Sable',
  'Remy', 'Indigo', 'Cedar', 'Lark', 'Flint',
  'Sterling', 'Briar', 'Cruz', 'Zephyr', 'Vale',
  'Shawn', 'Mika', 'Tobi', 'Chris', 'Dana',
  'Jesse', 'Rue', 'Ari', 'Noel', 'Kit',
  'Marley', 'Jude', 'Nico', 'Bex', 'Corin',
];

export function pickRandomPlayerName(exclude?: string): string {
  const pool = exclude ? HUMAN_PLAYER_NAMES.filter((n) => n !== exclude) : HUMAN_PLAYER_NAMES;
  return pool[Math.floor(Math.random() * pool.length)] ?? HUMAN_PLAYER_NAMES[0];
}

export function pickRandomPlayerNames(count: number, exclude?: readonly string[]): string[] {
  const pool = exclude ? HUMAN_PLAYER_NAMES.filter((n) => !exclude.includes(n)) : HUMAN_PLAYER_NAMES;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
