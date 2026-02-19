// Submit vote API - players cast their votes
import { storage } from './storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomCode, playerName, vote, roundIndex } = req.body;

  if (!roomCode || !playerName || vote === undefined || roundIndex === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const room = await storage.getRoom(roomCode);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (!room.gameData) {
    return res.status(400).json({ error: 'Game not initialized' });
  }

  // Initialize votes structure if needed
  if (!room.votes) {
    room.votes = {};
  }

  if (!room.votes[roundIndex]) {
    room.votes[roundIndex] = {};
  }

  // Store the vote
  room.votes[roundIndex][playerName] = vote;

  // Check if everyone has voted
  const totalPlayers = room.players.length;
  const votesThisRound = Object.keys(room.votes[roundIndex]).length;
  const allVoted = votesThisRound >= totalPlayers;

  if (allVoted && !room.roundComplete) {
    room.roundComplete = true;
  }

  await storage.setRoom(roomCode, room);

  return res.status(200).json({
    success: true,
    allVoted: allVoted,
    votesCount: votesThisRound,
    totalPlayers: totalPlayers
  });
}
