// Get votes API - retrieve voting results for current round
import { storage } from './storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomCode, roundIndex } = req.query;

  if (!roomCode || roundIndex === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const room = await storage.getRoom(roomCode);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const votes = room.votes?.[roundIndex] || {};
  const totalPlayers = room.players.length;
  const votesCount = Object.keys(votes).length;
  const allVoted = votesCount >= totalPlayers;

  // Calculate vote tallies
  const tallies = {};
  Object.values(votes).forEach(vote => {
    tallies[vote] = (tallies[vote] || 0) + 1;
  });

  return res.status(200).json({
    success: true,
    votes: votes,
    tallies: tallies,
    votesCount: votesCount,
    totalPlayers: totalPlayers,
    allVoted: allVoted,
    currentRound: room.currentRound || 0,
    roundComplete: room.roundComplete || false
  });
}
