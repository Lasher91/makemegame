// Room creation API
import { storage } from './storage.js';

// Generate unique room code
function generateRoomCode() {
  const code = `PARTY-${Math.floor(1000 + Math.random() * 9000)}`;
  return storage.getRoom(code) ? generateRoomCode() : code;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  storage.cleanupOldRooms();

  const { playerName } = req.body;

  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  const roomCode = generateRoomCode();
  
  storage.setRoom(roomCode, {
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
