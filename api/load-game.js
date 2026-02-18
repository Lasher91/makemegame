// Load game API - retrieve shared game by ID
import { storage } from './storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId } = req.query;

  if (!gameId) {
    return res.status(400).json({ error: 'Game ID is required' });
  }

  const game = await storage.getSavedGame(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found. It may have expired.' });
  }

  return res.status(200).json({
    success: true,
    html: game.html,
    title: game.title
  });
}
