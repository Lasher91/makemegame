// Next round API - host advances to next question
import { storage } from './storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomCode, playerName } = req.body;

  if (!roomCode || !playerName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const room = await storage.getRoom(roomCode);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Verify player is host
  const player = room.players.find(p => p.name === playerName);
  if (!player || !player.isHost) {
    return res.status(403).json({ error: 'Only the host can advance rounds' });
  }

  if (!room.gameData) {
    return res.status(400).json({ error: 'Game not initialized' });
  }

  // Advance to next round
  const currentRound = room.currentRound || 0;
  const nextRound = currentRound + 1;
  const totalRounds = room.gameData.rounds?.length || 0;

  if (nextRound >= totalRounds) {
    // Game is complete
    room.gameComplete = true;
    
    // Calculate final scores if it's a player voting game
    const finalScores = {};
    room.players.forEach(p => {
      finalScores[p.name] = 0;
    });

    // Count votes across all rounds
    if (room.votes) {
      Object.values(room.votes).forEach(roundVotes => {
        Object.values(roundVotes).forEach(vote => {
          if (finalScores.hasOwnProperty(vote)) {
            finalScores[vote]++;
          }
        });
      });
    }

    room.finalScores = finalScores;
  } else {
    room.currentRound = nextRound;
    room.roundComplete = false;
  }

  await storage.setRoom(roomCode, room);

  return res.status(200).json({
    success: true,
    currentRound: room.currentRound,
    gameComplete: room.gameComplete || false,
    finalScores: room.finalScores || null
  });
}
