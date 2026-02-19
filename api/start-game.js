// Start game API - only host can start
import { storage } from './storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomCode, playerName } = req.body;

  if (!roomCode) {
    return res.status(400).json({ error: 'Room code is required' });
  }

  const room = await storage.getRoom(roomCode);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Verify player is host
  const player = room.players.find(p => p.name === playerName);
  if (!player || !player.isHost) {
    return res.status(403).json({ error: 'Only the host can start the game' });
  }

  // Check if game is ready (either HTML or gameData for voting)
  if (!room.gameHtml && !room.gameData) {
    return res.status(400).json({ error: 'Game not generated yet' });
  }

  room.gameStarted = true;
  await storage.setRoom(roomCode, room);

  return res.status(200).json({
    success: true,
    gameHtml: room.gameHtml,
    gameData: room.gameData
  });
}
