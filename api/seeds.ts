import type { VercelRequest, VercelResponse } from '@vercel/node';
import createChallenge from '../src/server/challenges/create.js';
import getChallenge from '../src/server/challenges/get.js';
import seedLeaderboard from '../src/server/seeds/leaderboard.js';
import popularSeeds from '../src/server/seeds/popular.js';
import seedScore from '../src/server/seeds/score.js';

function getAction(request: VercelRequest): string | null {
  const queryAction = typeof request.query.action === 'string' ? request.query.action : null;
  const bodyAction = typeof request.body?.action === 'string' ? request.body.action : null;
  return queryAction ?? bodyAction;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const action = getAction(request);
  if (action === 'createChallenge') return createChallenge(request, response);
  if (action === 'getChallenge') return getChallenge(request, response);
  if (action === 'leaderboard') return seedLeaderboard(request, response);
  if (action === 'popular') return popularSeeds(request, response);
  if (action === 'score') return seedScore(request, response);

  response.status(400).send('Unknown seeds action');
}
