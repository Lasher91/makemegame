// Join room API
import { storage } from './storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomCode, playerName } = req.body;

  if (!roomCode || !playerName) {
    return res.status(400).json({ error: 'Room code and player name are required' });
  }

  const room = storage.getRoom(roomCode);

  if (!room) {
    return res.status(404).json({ error: 'Room not found. Check the code and try again.' });
  }

  if (room.gameStarted) {
    return res.status(400).json({ error: 'Game already started. Cannot join now.' });
  }

  // Check if player name already exists in room
  const nameExists = room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (nameExists) {
    return res.status(400).json({ error: 'A player with that name is already in the room.' });
  }

  // Add player to room
  room.players.push({
    name: playerName.trim(),
    isHost: false,
    joinedAt: Date.now()
  });

  // Update room in storage
  storage.setRoom(roomCode, room);

  return res.status(200).json({
    success: true,
    players: room.players
  });
}
