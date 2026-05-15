export const HUMAN_PLAYER_NAMES = [
  // Common first names
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James',
  'Isabella', 'Oliver', 'Mia', 'Elijah', 'Charlotte', 'Lucas', 'Amelia',
  'Mason', 'Ethan', 'Evelyn', 'Aiden', 'Abigail', 'Michael', 'Emily',
  'Matthew', 'Elizabeth', 'Daniel', 'Mila', 'Henry', 'Ella', 'Jackson',
  'Hannah', 'Sebastian', 'Lily', 'Jack', 'Nora', 'Luke', 'Zoe', 'Jayden',
  'Penelope', 'Carter', 'Grace', 'Wyatt', 'Chloe', 'Dylan', 'Layla',
  'Gabriel', 'Riley', 'Isaac', 'Zoey', 'Grayson', 'Natalie', 'Julian',
  'Victoria', 'Levi', 'Madison', 'Anthony', 'Aurora', 'Ezra', 'Savannah',
  'Aaron', 'Audrey', 'Thomas', 'Brooklyn', 'Charles', 'Bella', 'Caleb',
  'Claire', 'Ryan', 'Skylar', 'Nathan', 'Lucy', 'Adrian', 'Paisley',
  'Christian', 'Everly', 'Josiah', 'Anna', 'Andrew', 'Caroline', 'Sam',
  // Friendly casual names
  'Jake', 'Kate', 'Tom', 'Nick', 'Amy', 'Ben', 'Meg', 'Josh', 'Jess',
  'Matt', 'Lisa', 'Mark', 'Laura', 'Paul', 'Anna', 'Kevin', 'Maria',
  'Brian', 'Karen', 'Steven', 'Nancy', 'Eric', 'Beth', 'Alex', 'Jordan',
  'Morgan', 'Casey', 'Avery', 'Taylor', 'Jamie', 'Drew', 'Quinn', 'Parker',
  'Reese', 'Finley', 'Charlie', 'Sage', 'Blake', 'Cameron', 'Hayden',
  'Peyton', 'Rowan', 'Lennon', 'Phoenix', 'Emerson', 'Harper', 'Elliot',
  'Wren', 'Kai', 'Ash', 'River', 'Remy', 'Marley', 'Jude', 'Nico',
  'Jesse', 'Ari', 'Noel', 'Kit', 'Chris', 'Dana', 'Shawn', 'Mika',
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

/** Deterministically map a player ID to a name so the same player always gets the same name. */
export function getNameFromPlayerId(playerId: string): string {
  let hash = 5381;
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) + hash + playerId.charCodeAt(i)) >>> 0;
  }
  return HUMAN_PLAYER_NAMES[hash % HUMAN_PLAYER_NAMES.length];
}
