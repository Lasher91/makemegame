// Room state API - get current room info
import { storage } from './storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomCode } = req.query;

  if (!roomCode) {
    return res.status(400).json({ error: 'Room code is required' });
  }

  const room = await storage.getRoom(roomCode);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  return res.status(200).json({
    players: room.players,
    gameStarted: room.gameStarted,
    gameHtml: room.gameHtml
  });
}
