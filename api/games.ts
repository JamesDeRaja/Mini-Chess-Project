import type { VercelRequest, VercelResponse } from '@vercel/node';
import createGame from '../src/server/games/create.js';
import createDailyGame from '../src/server/games/daily.js';
import createSeededGame from '../src/server/games/create-seeded.js';
import getGame from '../src/server/games/get.js';
import joinGame from '../src/server/games/join.js';
import moveGame from '../src/server/games/move.js';
import gameAction from '../src/server/games/action.js';
import findMatchmaking from '../src/server/matchmaking/find.js';
import cancelMatchmaking from '../src/server/matchmaking/cancel.js';

function getAction(request: VercelRequest): string | null {
  const queryAction = typeof request.query.action === 'string' ? request.query.action : null;
  const bodyAction = typeof request.body?.action === 'string' ? request.body.action : null;
  return queryAction ?? bodyAction;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const action = getAction(request);
  if (action === 'create') return createGame(request, response);
  if (action === 'daily') return createDailyGame(request, response);
  if (action === 'createSeeded') return createSeededGame(request, response);
  if (action === 'state' || action === 'get') return getGame(request, response);
  if (action === 'join') return joinGame(request, response);
  if (action === 'move') return moveGame(request, response);
  if (action === 'gameAction') {
    request.body = { ...request.body, action: request.body?.gameAction };
    return gameAction(request, response);
  }
  if (action === 'findMatch') return findMatchmaking(request, response);
  if (action === 'cancelMatch') return cancelMatchmaking(request, response);

  response.status(400).send('Unknown games action');
}
