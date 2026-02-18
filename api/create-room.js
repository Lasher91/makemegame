// Room creation API
import { storage } from './storage.js';

// Generate unique room code
async function generateRoomCode() {
  const code = `PARTY-${Math.floor(1000 + Math.random() * 9000)}`;
  const existing = await storage.getRoom(code);
  return existing ? generateRoomCode() : code;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await storage.cleanupOldRooms();

  const { playerName } = req.body;

  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  const roomCode = await generateRoomCode();
  
  await storage.setRoom(roomCode, {
    players: [{ name: playerName.trim(), isHost: true, joinedAt: Date.now() }],
    gameHtml: null,
    gameStarted: false,
    createdAt: Date.now()
  });

  return res.status(200).json({ 
    roomCode,
    success: true
  });
}
