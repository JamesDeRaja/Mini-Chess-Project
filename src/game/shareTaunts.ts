export type TauntContext = 'generic' | 'highScore' | 'lowScore' | 'beatPrevious' | 'failedToBeatPrevious' | 'fastWin' | 'slowWin' | 'loss' | 'daily' | 'friendChallenge' | 'leaderboard' | 'revenge';
export type ShareMessageStyle = 'compact' | 'full' | 'trashTalk' | 'leaderboard' | 'daily';
export type ComparisonOutcome = 'beat' | 'failed' | 'tied' | 'fasterTie';

export const SHARE_TAUNTS: Record<TauntContext, string[]> = {
  generic: ['Same board. Same pieces. Fewer excuses.', 'I left a score here. Try not to trip over it.', 'This seed is available for public embarrassment.', 'Your move, if your confidence survived.', 'A tiny board, a tiny excuse window.', 'Opening theory is gone. Sadly, so are your excuses.', 'Beat this score or pretend your internet was bad.', 'This setup has been pre-heated for your downfall.', 'The board is small. The pressure is not.', 'I made the score. You bring the excuses.', 'Same seed, same chance, different coping mechanism.', 'This is not chess homework. It is a challenge.', 'Five files. Six ranks. Infinite ways to panic.', 'Try this seed before your confidence expires.', 'The pieces are shuffled. Your ego is next.', 'No openings. No theory. Just consequences.', 'I solved this seed. Your turn to explain yourself.', 'The board is waiting. It already looks disappointed.', 'This score is beatable. Technically.', 'Come for the chess. Stay for the scoreboard damage.'],
  highScore: ['This score is not impossible. Just inconvenient for you.', 'I raised the bar. Please do not crawl under it.', 'This score has entered the smug zone.', 'Bring your best moves. The scoreboard is judging.', 'I would say good luck, but the numbers are already rude.', 'This score is currently sitting with too much confidence.', 'You can beat this. Statistics are being generous today.', 'High score posted. Emotional support not included.', 'This is the part where you say it was luck.', 'A strong score on a tiny board. Annoying, but legal.'],
  lowScore: ['This score is low enough to be attacked directly.', 'I left the door open. Please do not still miss it.', 'This score is beatable by ambition and basic coordination.', 'Not my finest work. Still waiting to see yours.', 'This is a mercy challenge. Use it wisely.', 'I scored this with room for improvement and mild shame.', 'The bar is low. Try not to tunnel under it.', 'This score is basically a welcome mat.', 'I made mistakes so you could feel brave.', 'This challenge comes with training wheels.'],
  beatPrevious: ['The previous score has been quietly escorted out.', 'Someone just got removed from their own throne.', 'That score looked safe. Cute.', 'The leaderboard has been updated with disrespect.', 'A previous champion has been converted into history.', 'That was not a win. That was scoreboard vandalism.', 'The old score has been retired early.', 'Someone is about to call this luck.', 'The crown changed hands. No ceremony needed.', 'The previous score has left the chat.'],
  failedToBeatPrevious: ['You won the game, but not the argument.', 'The previous score survived. Annoying, but factual.', 'Close enough to be painful. Not enough to brag.', 'The throne remains occupied. Please try again.', 'You approached greatness and politely stopped.', 'The scoreboard respected your effort. Barely.', 'You did well. The previous score did better.', 'A noble attempt. The leaderboard yawned.', 'The old score is still standing there, smugly.', 'You almost had it. Almost is very loud today.'],
  fastWin: ['That was less a match and more a quick deletion.', 'Blink carefully. The game may already be over.', 'This seed was solved before the board got comfortable.', 'Fast win posted. Please arrive on time.', 'The pieces barely unpacked.', 'That checkmate came with express shipping.', 'A short game and a long excuse list.', 'This was a speedrun with chess pieces.', 'The board loaded. The result followed immediately.', 'That was quick enough to feel personal.'],
  slowWin: ['It took a while, but the scoreboard only remembers the score.', 'Slow cooking is still cooking.', 'This win arrived late but dressed properly.', 'Not fast, but annoyingly effective.', 'The game took its time. So did my genius.', 'Victory eventually found the address.', 'A slow win is still a win. Please complain quietly.', 'The route was scenic. The result was not.', 'It was not elegant. It counted.', 'The scoreboard does not ask for style points.'],
  loss: ['I lost this seed so someone else could feel useful.', 'This was a strategic donation to the challenge economy.', 'I have prepared a revenge seed by failing first.', 'The board won. I was also present.', 'I lost, but the seed is now emotionally interesting.', 'This score is not a flex. It is bait.', 'I made this beatable through generous decision-making.', 'The game humbled me. Your turn.', 'I lost so you can pretend this is easy.', 'This challenge starts with my pain. Enjoy responsibly.'],
  daily: ['Today’s tiny battlefield is open. Bring confidence or snacks.', 'Daily seed dropped. Excuses reset at midnight.', 'Everyone gets the same setup today. That includes your excuses.', 'Today’s board is fair. Your result may not be.', 'New daily seed. Same old overconfidence.', 'Today’s challenge is live. Opening theory has been deleted.', 'Daily shuffle ready. Try not to become a cautionary tale.', 'Same daily seed for everyone. Let the scoreboard expose us.', 'Today’s seed has no favorites, only victims.', 'Daily challenge posted. The board is already judging.'],
  friendChallenge: ['I challenged you because silence felt too peaceful.', 'This link is friendship with a scoreboard attached.', 'A normal friend says hello. I send a score to beat.', 'Your move, friend. The board has receipts.', 'I made this challenge personally inconvenient for you.', 'Friendship is temporary. Seed scores are archived.', 'Click this if your confidence has not logged out.', 'I brought the score. You bring the comeback story.', 'This is not peer pressure. It is tactical motivation.', 'I believe in you. Briefly.'],
  leaderboard: ['The leaderboard has room. Not necessarily for you.', 'Top score is waiting. Try not to make it feel too safe.', 'This leaderboard accepts results, not speeches.', 'Put your name here or admire mine quietly.', 'The scoreboard is public. Convenient and cruel.', 'A leaderboard is just a mirror with numbers.', 'Rankings update faster than excuses.', 'The top spot is available for qualified troublemakers.', 'Score first. Explain later.', 'The leaderboard is hungry. Feed it a better score.'],
  revenge: ['Revenge is available on the same seed.', 'Lose once, learn twice, share loudly.', 'The comeback link has been generated.', 'This seed remembers what happened. So should you.', 'Try again. The board is pretending not to laugh.', 'A rematch is just revenge with better branding.', 'You have unfinished business and very few squares.', 'This is your redemption arc, if the pawns cooperate.', 'Run it back before the confidence fully leaves.', 'The seed is unchanged. Hopefully your moves are not.'],
};

export const LANDING_TAUNTS = ['[Name] thinks this score is safe. That is adorable.', '[Name] left a number here and called it confidence.', 'Same setup. Same board. Time to make this personal.', '[Name] scored [score]. You have one job.', 'Beat [Name], then act casual.', '[Name] has challenged you using the ancient art of scoreboard pressure.', 'This seed is already solved, according to [Name]. Rude.', '[Name] says this is beatable. Mostly because they already did it.', 'The board is fair. The bragging rights are not.', '[Name] brought a score. You bring the response.', 'You were sent this link because peace was never an option.', '[Name] has opened a tiny tactical argument.', 'Beat the score or prepare a very believable excuse.', 'Same pieces. Same seed. Different ego.', '[Name] is currently ahead. Fix that.', 'This challenge has been personally delivered to your confidence.', 'There is a score to beat and no opening book to blame.', '[Name] survived this seed. Now it is your problem.', 'The scoreboard remembers. Make it remember you.', '[Name] started the chain. You can make it worse.'];

export const RESULT_COMPARISON_MESSAGES: Record<ComparisonOutcome, string[]> = {
  beat: ['You beat [Name] by [points] points.', '[Name] has been removed from the top by [points] points.', 'You passed [Name] by [points]. Very subtle. Very rude.', "[Name]'s score is now historical content.", 'You beat [Name]. The chain continues.'],
  failed: ['[Name] is still ahead by [points] points.', 'You finished, but [Name] remains annoyingly ahead.', "[Name]'s score survived this attempt.", 'Close, but the scoreboard is not sentimental.', 'You need [points] more points to pass [Name].'],
  tied: ['Same score. The seed refuses to pick a favorite.', 'You matched [Name]. Now fight over move count.', 'Tie score. Emotionally inconvenient.', 'Same score, same seed, same unresolved argument.', 'You tied [Name]. This is not over.'],
  fasterTie: ['You matched [Name] and won faster.', '[Name] got the score first; you got there cleaner.', 'Same score, fewer moves. The argument has evolved.', 'You tied the score and trimmed the route.', '[Name] has company at the same score now.'],
};

function pick(list: string[], previous?: string): string { if (list.length === 1) return list[0]; let next = list[Math.floor(Math.random() * list.length)] ?? list[0]; let guard = 0; while (next === previous && guard < 10) { next = list[Math.floor(Math.random() * list.length)] ?? list[0]; guard += 1; } return next; }
function fillTemplate(template: string, values: { name?: string; score?: number; points?: number }) { return template.replaceAll('[Name]', values.name ?? 'Anonymous Player').replaceAll('[score]', String(values.score ?? 0)).replaceAll('[points]', String(values.points ?? 0)); }

export function getRandomShareTaunt(context: TauntContext = 'generic', previousTaunt?: string): string { return pick(SHARE_TAUNTS[context]?.length ? SHARE_TAUNTS[context] : SHARE_TAUNTS.generic, previousTaunt); }
export function getRandomLandingTaunt(input: { challengerName?: string; score?: number }, previousTaunt?: string): string { return fillTemplate(pick(LANDING_TAUNTS, previousTaunt), { name: input.challengerName, score: input.score }); }
export function getRandomComparisonText(input: { outcome: ComparisonOutcome; previousPlayerName?: string; points?: number }, previousText?: string): string { return fillTemplate(pick(RESULT_COMPARISON_MESSAGES[input.outcome], previousText), { name: input.previousPlayerName, points: Math.abs(input.points ?? 0) }); }

export function getContextualTauntContext(input: { result: 'win' | 'loss' | 'stalemate'; score: number; moves: number; previousScore?: number; beatPrevious?: boolean; isDaily?: boolean; isLeaderboardShare?: boolean; wantsRevenge?: boolean; }): TauntContext {
  if (input.wantsRevenge) return 'revenge';
  if (input.isLeaderboardShare) return 'leaderboard';
  if (input.isDaily) return 'daily';
  if (input.beatPrevious === true) return 'beatPrevious';
  if (input.beatPrevious === false && input.previousScore != null) return 'failedToBeatPrevious';
  if (input.result === 'loss') return 'loss';
  if (input.result === 'win' && input.moves <= 10) return 'fastWin';
  if (input.result === 'win' && input.moves >= 25) return 'slowWin';
  if (input.score >= 150) return 'highScore';
  if (input.score < 80) return 'lowScore';
  return 'generic';
}

const SHARE_MESSAGE_TEMPLATES: Record<ShareMessageStyle, string[]> = {
  compact: [
    '[taunt]\n\n[playerName] left [score] points on [seedSlug]. Beat the tiny-board receipt:\n[challengeUrl]',
    '[taunt]\n\nSeed [seedSlug] is open for business. Target: [score]. Bring moves, not lore.\n[challengeUrl]',
    '[taunt]\n\n[playerName] made [seedSlug] somebody else’s problem. That somebody is probably you.\n[challengeUrl]',
  ],
  daily: [
    '[taunt]\n\nDaily seed: [seedSlug]\nSetup: [backRankCode]\n[playerName] posted [score] before the reset goblin arrives.\nCan you steal the day?\n\n[challengeUrl]',
    '[taunt]\n\nToday’s shared chaos is [seedSlug]. [playerName] scored [score], and the board is taking applications for a better hero.\n\n[challengeUrl]',
    '[taunt]\n\nSame daily setup for everyone, same tiny excuse budget.\nScore to annoy: [score]\nSeed: [seedSlug]\n\n[challengeUrl]',
  ],
  leaderboard: [
    '[taunt]\n\n[playerName] just made the [seedSlug] leaderboard weird with [score] points. Please investigate this crime.\n\n[challengeUrl]',
    '[taunt]\n\nLeaderboard flare-up on [seedSlug]: [score] points, [moves] moves, and several pawns filing complaints.\n\n[challengeUrl]',
    '[taunt]\n\nSeed [seedSlug] has a score wearing sunglasses: [score]. Knock them off.\n\n[challengeUrl]',
  ],
  full: [
    '[taunt]\n\n[playerName] escaped Pocket Shuffle Chess with [score] points in [moves] moves.\nSeed: [seedSlug]\nSetup: [backRankCode]\n\n[comparisonBlock]Replay the crime scene:\n[challengeUrl]',
    '[taunt]\n\nTiny board report:\n• Player: [playerName]\n• Score: [score]\n• Moves: [moves]\n• Seed: [seedSlug]\n• Setup: [backRankCode]\n\n[comparisonBlock]Your turn to improve the evidence:\n[challengeUrl]',
    '[taunt]\n\nI brought a score, a seed, and absolutely no opening theory.\n[playerName]: [score] in [moves]\nSeed [seedSlug] · Setup [backRankCode]\n\n[comparisonBlock]Accept the challenge:\n[challengeUrl]',
  ],
  trashTalk: [
    '[taunt]\n\nSame seed. Same setup. Different emotional damage.\n[playerName] scored [score] in [moves] moves on [seedSlug] ([backRankCode]).\n\n[comparisonBlock]Come fix the scoreboard:\n[challengeUrl]',
    '[taunt]\n\nI left [score] points on [seedSlug]. The back rank was [backRankCode], the excuses were underdeveloped.\nMoves: [moves]\n\n[comparisonBlock]Your move, alleged tactician:\n[challengeUrl]',
    '[taunt]\n\nChallenge packet: [seedSlug] · setup [backRankCode] · [score] points · [moves] moves.\nWarning: may contain forks, pins, and social consequences.\n\n[comparisonBlock]Play it here:\n[challengeUrl]',
    '[taunt]\n\n[playerName] has submitted a tiny-board brag for peer review: [score] points on [seedSlug].\n\n[comparisonBlock]Review with your pieces, not your mouth:\n[challengeUrl]',
  ],
};

function fillShareTemplate(template: string, input: { taunt: string; playerName: string; score: number; moves: number; seedSlug: string; backRankCode: string; challengeUrl: string; comparisonText?: string; }): string {
  const comparisonBlock = input.comparisonText ? `${input.comparisonText}\n\n` : '';
  return template
    .replaceAll('[taunt]', input.taunt)
    .replaceAll('[playerName]', input.playerName)
    .replaceAll('[score]', String(input.score))
    .replaceAll('[moves]', String(input.moves))
    .replaceAll('[seedSlug]', input.seedSlug)
    .replaceAll('[backRankCode]', input.backRankCode)
    .replaceAll('[challengeUrl]', input.challengeUrl)
    .replaceAll('[comparisonBlock]', comparisonBlock);
}

export function buildShareMessage(input: { style?: ShareMessageStyle; taunt: string; playerName: string; score: number; moves: number; seedSlug: string; backRankCode: string; challengeUrl: string; comparisonText?: string; }): string {
  const style = input.style ?? 'trashTalk';
  return fillShareTemplate(pick(SHARE_MESSAGE_TEMPLATES[style]), input);
}

export type SeedShareStyle = 'dailySeed' | 'randomSeed' | 'popularSeed';

const SEED_SHARE_TEMPLATES: Record<SeedShareStyle, string[]> = {
  dailySeed: [
    '[taunt]\n\nToday’s Pocket Shuffle Chess chaos is [seedSlug] with setup [backRankCode].[scoreLine]\nEveryone gets the same board; only the excuses vary.\n\n[challengeUrl]',
    '[taunt]\n\nDaily tiny-board bulletin: seed [seedSlug], back rank [backRankCode].[scoreLine]\nCome collect your tactics, your bragging rights, or a very educational blunder.\n\n[challengeUrl]',
    '[taunt]\n\nThe daily seed is live: [seedSlug] ([backRankCode]).[scoreLine]\nNo opening book. No hiding. Just 5x6 consequences.\n\n[challengeUrl]',
  ],
  randomSeed: [
    '[taunt]\n\nRandom seed discovered: [seedSlug]\nBack rank: [backRankCode]\nI am not saying the position is cursed, but the pawns asked for a union rep.\n\n[challengeUrl]',
    '[taunt]\n\nI rolled [seedSlug] and got setup [backRankCode].\nThis is either a tactical gem or a tiny board prank. Please find out loudly.\n\n[challengeUrl]',
    '[taunt]\n\nFresh shuffle alert: [seedSlug] · [backRankCode]\nSame pieces, suspicious vibes, immediate bragging rights.\n\n[challengeUrl]',
  ],
  popularSeed: [
    '[taunt]\n\nSeed [seedSlug] is on the menu with setup [backRankCode].\nPlay it, share it, then pretend your first blunder was “research.”\n\n[challengeUrl]',
    '[taunt]\n\nPopular seed briefing: [seedSlug] · [backRankCode]\nThe board is compact, the tactics are not, and the scoreboard has opinions.\n\n[challengeUrl]',
    '[taunt]\n\nTry [seedSlug] on Pocket Shuffle Chess. Setup [backRankCode].\nWarning: tiny boards can still hurt large egos.\n\n[challengeUrl]',
  ],
};

export function buildSeedShareMessage(input: { style: SeedShareStyle; taunt: string; seedSlug: string; backRankCode: string; challengeUrl: string; score?: number | null; }): string {
  const scoreLine = typeof input.score === 'number' ? `\nScore to beat: ${input.score}.` : '';
  return pick(SEED_SHARE_TEMPLATES[input.style])
    .replaceAll('[taunt]', input.taunt)
    .replaceAll('[seedSlug]', input.seedSlug)
    .replaceAll('[backRankCode]', input.backRankCode)
    .replaceAll('[challengeUrl]', input.challengeUrl)
    .replaceAll('[scoreLine]', scoreLine);
}
