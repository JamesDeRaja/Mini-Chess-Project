import type { VercelRequest, VercelResponse } from '@vercel/node';
import listScores from '../src/server/scores/list.js';
import submitScore from '../src/server/scores/submit.js';

function getAction(request: VercelRequest): string | null {
  const queryAction = typeof request.query.action === 'string' ? request.query.action : null;
  const bodyAction = typeof request.body?.action === 'string' ? request.body.action : null;
  return queryAction ?? bodyAction;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const action = getAction(request);
  if (action === 'list') return listScores(request, response);
  if (action === 'submit') return submitScore(request, response);

  response.status(400).send('Unknown leaderboard action');
}
