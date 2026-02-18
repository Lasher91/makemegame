// Save game API - create shareable link
import { nanoid } from 'nanoid';
import { storage } from './storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await storage.cleanupOldGames();

  const { gameHtml } = req.body;

  if (!gameHtml) {
    return res.status(400).json({ error: 'Game HTML is required' });
  }

  // Generate short, URL-friendly ID
  const gameId = nanoid(8);
  
  // Extract title from HTML
  const titleMatch = gameHtml.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : 'Party Game';

  await storage.setSavedGame(gameId, {
    html: gameHtml,
    title: title,
    createdAt: Date.now()
  });

  return res.status(200).json({
    success: true,
    gameId: gameId,
    shareUrl: `${req.headers.origin || 'https://makemegame.com'}/game/${gameId}`
  });
}
