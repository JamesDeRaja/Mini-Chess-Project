const playerIdKey = 'miniShuffleChess.playerId';
const displayNameKey = 'miniShuffleChess.displayName';

const friendlyDisplayNames = [
  'Amigo', 'Randomxo', 'Comrade', 'Buddy', 'Paloma', 'Chingu', 'Dost', 'Yaar', 'Sathi', 'Mitra',
  'Tomo', 'Tomodachi', 'Habibi', 'Habibti', 'Amica', 'Amico', 'Compadre', 'Compa', 'Parce', 'Kumpel',
  'Freund', 'Vriend', 'Kaveri', 'KaveriX', 'Sahib', 'Sahiba', 'Saheli', 'Sangi', 'Druzhok', 'Prijatelj',
  'Mafriend', 'Monami', 'AmiGoGo', 'LudoPal', 'RookAmigo', 'Knighto', 'Pawnbuddy', 'MateMigo', 'ShuffleMitra', 'TinyDost',
  'PocketPal', 'RandoMate', 'SeedSathi', 'BoardBuddy', 'ChessChingu', 'MiniAmigo', 'BlitzYaar', 'TempoTomo', 'ForkFriend', 'RookRafiq',
  'Rafiq', 'Sadiq', 'Zuma', 'Kito', 'Niko', 'Luma', 'Mika', 'Tavi', 'Kavi', 'Zuri',
  'Ayo', 'Bayo', 'Nia', 'Lio', 'Rio', 'Momo', 'Koko', 'Pipo', 'Tiko', 'Namu',
  'Sora', 'Yuki', 'Kuma', 'Hana', 'Lani', 'Noa', 'Iko', 'Oni', 'Pasha', 'Rumi',
  'Juno', 'Novi', 'Vela', 'Tala', 'Mira', 'Asha', 'Kira', 'Zeno', 'Beni', 'Dima',
  'Luka', 'Nuri', 'Sami', 'Tari', 'Omaro', 'Enzo', 'Mateo', 'Rico', 'SolMate', 'Wanderxo',
] as const;

const sarcasticChessDisplayNames = [
  'BlunderBaron', 'PawnShopGM', 'ForkedAgain', 'PinnedGenius', 'CastleLater', 'TempoTaxed', 'QueenOops', 'RookPaper', 'KnightmareFuel', 'BishopBother',
  'MateInMaybe', 'StalemateStan', 'CheckMeOut', 'EnPrisePrince', 'HangingHero', 'TheoryDodger', 'GambitGoblin', 'EndgameIntern', 'TacticTourist', 'PuzzlePeasant',
  'RookAndRoll', 'PawnziScheme', 'OopsAllPawns', 'KingOfCoping', 'DrawOfferDave', 'FlaggingPhD', 'BooklessBoss', 'TinyBoardTitan', 'RankAmateur', 'FileComplaint',
  'CheckPlease', 'MateInNever', 'DiagonalDenial', 'RookRookie', 'KnightShifted', 'QueenlessQuip', 'PawnIdentity', 'CastleCrisis', 'SkewerScholar', 'ForkForecast',
  'BlitzClown', 'TempoTantrum', 'MiscalcMage', 'PinnedByVibes', 'CheckChaser', 'BotezGambiter', 'D4Disaster', 'E4Excuse', 'FianchettoFail', 'ZugzwangZebra',
  'RookBottom', 'PawnAgain', 'KingSafetyCEO', 'MateMaybe', 'TacticTaxpayer', 'BoardGoblin', 'KnightNitpick', 'BishopOfOops', 'RookTherapist', 'QueenDrama',
  'EndgameTourist', 'CheckReceipt', 'PawnApologist', 'ForkMagnet', 'PinnedTweet', 'DrawishDuke', 'BlunderBishop', 'CastleCoward', 'TempoGremlin', 'MateCoupon',
  'NoBookNoodle', 'RankWrecker', 'FileFumbler', 'KinglyMistake', 'RookRegret', 'PawnSnob', 'KnightWrong', 'BishopBias', 'QueenSideEye', 'CheckBaggage',
  'ForkForksSake', 'PinCollector', 'SkewerMeTimbers', 'GambitGremlin', 'MateishMax', 'RooklessRoger', 'PawnHubris', 'CastleSkipped', 'TempoLeak', 'BlunderBuffet',
  'TinyBoardTroll', 'CheckDebt', 'EndgameEyeroll', 'KnightOfNope', 'BishopPlease', 'QueenBlunderella', 'PawnClown', 'RookSoup', 'KingInDenial', 'MatebaitManny',
] as const;

const funChessDisplayNames = [
  'JollyJadouble', 'Pawnicorn', 'RookRocket', 'KnightNoodle', 'BishopBubbles', 'QueenBean', 'KingCupcake', 'CastleCactus', 'TempoTaco', 'CheckChurro',
  'ForkFirefly', 'MateMuffin', 'GambitGummy', 'ShuffleSprout', 'TinyTactician', 'BoardBanana', 'RookRascal', 'PawnPancake', 'KnightKite', 'BishopBongo',
  'QueenQuokka', 'KingKiwi', 'CastleCookie', 'TempoTurtle', 'CheckCorgi', 'ForkFroggy', 'MateMarshmallow', 'GambitGuppy', 'SeedSparrow', 'PocketPenguin',
  'RookRainbow', 'PawnPogo', 'KnightNacho', 'BishopBiscuit', 'QueenQuesty', 'KingKazoo', 'CastleComet', 'TempoTwinkle', 'CheckChipmunk', 'ForkFalafel',
  'MateMango', 'GambitGiggle', 'ShuffleSalsa', 'BoardBumblebee', 'RookRavioli', 'PawnPapaya', 'KnightKetchup', 'BishopBagel', 'QueenQueso', 'KingKebab',
  'CastleConfetti', 'TempoPopcorn', 'CheckCupcake', 'ForkFandango', 'MateMochi', 'GambitGlowworm', 'SeedScooter', 'PocketPickle', 'RookRamen', 'PawnPretzel',
  'KnightNugget', 'BishopBurrito', 'QueenQuiche', 'KingKumquat', 'CastleCinnamon', 'TempoDoodle', 'CheckCoconut', 'ForkFritter', 'MateMacaron', 'GambitGazelle',
  'ShuffleSundae', 'BoardBiscotti', 'RookRaccoon', 'PawnPudding', 'KnightKoala', 'BishopBoba', 'QueenQuartz', 'KingKite', 'CastleClover', 'TempoTambourine',
  'CheckCheesecake', 'ForkFlamingo', 'MateMarmalade', 'GambitGiraffe', 'SeedSnickerdoodle', 'PocketPuffin', 'RookRhubarb', 'PawnPeach', 'KnightKoi', 'BishopBlueberry',
  'QueenQuokkaTwo', 'KingKettle', 'CastleCaramel', 'TempoTulip', 'CheckCinnamon', 'ForkFiesta', 'MateMoonbeam', 'GambitGingersnap', 'ShuffleSherbet', 'BoardBreezy',
] as const;

const angryChessDisplayNames = [
  'RageRook', 'FumingFile', 'TiltedKnight', 'AngryBishop', 'QueenOfRage', 'MadKing', 'PawnPuncher', 'CastleCrusher', 'TempoTyrant', 'CheckChomper',
  'ForkFury', 'MateMenace', 'GambitGrump', 'BoardBerserker', 'SeedSmasher', 'BlitzBruiser', 'RookRager', 'PawnPouncer', 'KnightKnuckle', 'BishopBrawler',
  'QueenQuarrel', 'KingKaboom', 'CastleClobber', 'TempoThunder', 'CheckCrusher', 'ForkFurnace', 'MateMarauder', 'GambitGrowler', 'RankRiot', 'FileFury',
  'RookRampage', 'PawnPanic', 'KnightRiot', 'BishopBoom', 'QueenQuake', 'KingKrakatoa', 'CastleCarnage', 'TempoTornado', 'CheckCyclone', 'ForkFlare',
  'MateMauler', 'GambitGnasher', 'BoardBrawler', 'SeedStorm', 'BlitzBlaster', 'RookRumble', 'PawnPummel', 'KnightKnockout', 'BishopBruise', 'QueenQuiver',
  'KingKicker', 'CastleCranky', 'TempoTremor', 'CheckCharger', 'ForkFeral', 'MateMayhem', 'GambitGnash', 'RankRavager', 'FileFang', 'RookRevenge',
  'PawnPunisher', 'KnightNuclear', 'BishopBite', 'QueenQuarrelsome', 'KingKombat', 'CastleClasher', 'TempoTorcher', 'CheckClobber', 'ForkFirestorm', 'MateMonster',
  'GambitGrouch', 'BoardBoiler', 'SeedScorcher', 'BlitzBully', 'RookRuckus', 'PawnRiot', 'KnightKillerBee', 'BishopBlast', 'QueenQuasarRage', 'KingKettleMad',
  'CastleCombust', 'TempoTsunami', 'CheckCannon', 'ForkFist', 'MateMangler', 'GambitGorilla', 'RankRage', 'FileFrenzy', 'RookRavager', 'PawnPow',
  'KnightKnock', 'BishopBarrage', 'QueenQuenchless', 'KingKablooey', 'CastleCudgel', 'TempoTerror', 'CheckFury', 'ForkWarpath', 'MateWrecker', 'GambitGrinder',
] as const;

const defaultDisplayNames = [
  ...friendlyDisplayNames,
  ...sarcasticChessDisplayNames,
  ...funChessDisplayNames,
  ...angryChessDisplayNames,
] as const;

function defaultNameIndex(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % defaultDisplayNames.length;
}

function createPlayerId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAnonymousPlayerId(): string {
  if (typeof localStorage === 'undefined') return createPlayerId();
  const existing = localStorage.getItem(playerIdKey);
  if (existing) return existing;
  const playerId = createPlayerId();
  localStorage.setItem(playerIdKey, playerId);
  return playerId;
}

export function getDefaultDisplayName(playerId = getAnonymousPlayerId()) {
  return defaultDisplayNames[defaultNameIndex(playerId)] ?? 'Amigo';
}

export function sanitizePlayerName(name: string): string {
  const withoutTags = name.replace(/<[^>]*>/g, '');
  const normalizedName = withoutTags.trim().replace(/\s+/g, ' ').slice(0, 20);
  return normalizedName || 'Anonymous Player';
}

export function getDisplayName(): string {
  if (typeof localStorage === 'undefined') return 'Anonymous Player';
  return localStorage.getItem(displayNameKey) || 'Anonymous Player';
}

export function saveDisplayName(name: string): string {
  const normalizedName = sanitizePlayerName(name);
  if (typeof localStorage !== 'undefined') localStorage.setItem(displayNameKey, normalizedName);
  return normalizedName;
}

export function hasCustomDisplayName(): boolean {
  return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(displayNameKey));
}
