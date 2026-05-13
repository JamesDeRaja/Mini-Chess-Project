import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOpponent } from '../../game/gameStatus.js';
import type { Color } from '../../game/types.js';
import { safeSupabaseUpdate } from '../../multiplayer/safeSupabaseUpdate.js';
import { assessGameLifecycle } from './lifecycle.js';
import { getServerSupabase } from '../supabase.js';

type GameRow = Record<string, unknown>;
type GameAction = 'resign' | 'request_draw' | 'accept_draw';

function parseAction(value: unknown): GameAction | null {
  return value === 'resign' || value === 'request_draw' || value === 'accept_draw' ? value : null;
}

function getPlayerColor(game: GameRow, playerId: string): Color | null {
  if (game.white_player_id === playerId) return 'white';
  if (game.black_player_id === playerId) return 'black';
  return null;
}

function getDrawOfferBy(game: GameRow): Color | null {
  if (game.draw_offer_by === 'white' || game.draw_offer_by === 'black') return game.draw_offer_by;
  if (typeof game.result_type !== 'string') return null;
  const [, offeredBy] = game.result_type.match(/^draw_offer:(white|black)$/) ?? [];
  return offeredBy === 'white' || offeredBy === 'black' ? offeredBy : null;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const gameId = typeof request.body?.gameId === 'string' ? request.body.gameId : null;
  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : null;
  const action = parseAction(request.body?.action);
  if (!gameId || !playerId || !action) {
    response.status(400).send('Missing gameId, playerId, or action');
    return;
  }

  const supabase = getServerSupabase();
  const { data: fetchedGame, error: fetchError } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (fetchError || !fetchedGame) {
    response.status(404).send(fetchError?.message ?? 'Game not found');
    return;
  }

  const game = await assessGameLifecycle(supabase, fetchedGame);
  if (game.status !== 'active') {
    response.status(200).json({ game });
    return;
  }

  const playerColor = getPlayerColor(game, playerId);
  if (!playerColor) {
    response.status(403).send('Player is not in this game');
    return;
  }

  const nowIso = new Date().toISOString();
  const updatePayload: Record<string, unknown> = { updated_at: nowIso };

  if (action === 'resign') {
    const winner = getOpponent(playerColor);
    updatePayload.status = winner === 'white' ? 'white_won' : 'black_won';
    updatePayload.winner = winner;
    updatePayload.result_type = 'resignation';
    updatePayload.draw_offer_by = null;
  } else if (action === 'request_draw') {
    updatePayload.result_type = `draw_offer:${playerColor}`;
    updatePayload.draw_offer_by = playerColor;
  } else {
    const offerBy = getDrawOfferBy(game);
    if (!offerBy || offerBy === playerColor) {
      response.status(400).send('No draw offer from opponent');
      return;
    }
    updatePayload.status = 'draw';
    updatePayload.winner = null;
    updatePayload.result_type = 'draw_agreement';
    updatePayload.draw_offer_by = null;
  }

  const { data: updatedGame, error: updateError } = await safeSupabaseUpdate(supabase, gameId, updatePayload);
  if (updateError || !updatedGame) {
    response.status(500).send(updateError?.message ?? 'Unable to update game');
    return;
  }

  response.status(200).json({ game: updatedGame });
}
