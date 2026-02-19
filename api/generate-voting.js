// Generate voting game API - creates structured voting game data
import { storage } from './storage.js';

// Simple in-memory rate limiting
const rateLimitStore = new Map();
const RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000;

function getRateLimitKey(ip) {
  const date = new Date().toISOString().split('T')[0];
  return `${ip}_${date}`;
}

function checkRateLimit(ip) {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  
  for (const [k, v] of rateLimitStore.entries()) {
    if (now - v.timestamp > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(k);
    }
  }
  
  const record = rateLimitStore.get(key);
  
  if (!record) {
    rateLimitStore.set(key, { count: 1, timestamp: now });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.socket.remoteAddress || 
             'unknown';
  
  const rateLimit = checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: 'Daily limit reached. You can generate 3 games per day. Try again tomorrow or upgrade to unlimited!' 
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error - no API key' });
  }

  const { prompt, roomCode } = req.body;
  
  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Game description is required' });
  }

  if (prompt.length > 500) {
    return res.status(400).json({ error: 'Game description too long (max 500 characters)' });
  }

  const systemPrompt = `You are a party game designer creating voting games for groups. Generate a JSON structure for a multiplayer voting game.

CRITICAL: Output ONLY valid JSON, no explanation, no markdown, no backticks.

The JSON structure must be:
{
  "gameType": "voting",
  "title": "Game Title",
  "description": "Brief description",
  "rounds": [
    {
      "question": "Question text",
      "voteType": "players" OR "options",
      "options": ["Option 1", "Option 2"] // only if voteType is "options"
    }
  ]
}

VOTING TYPES:
- "players": Players vote for other players (Most Likely To, Who Would)
- "options": Players choose between given options (Would You Rather, This or That)

REQUIREMENTS:
- Generate 12-15 rounds
- Questions should be funny, slightly edgy but not offensive
- For "players" type: questions like "Most likely to survive a zombie apocalypse?"
- For "options" type: questions like "Would you rather..." with 2-4 options
- Mix both types for variety
- Keep questions party-appropriate and fun

Generate ONLY the JSON, nothing else.`;

  const userMessage = `Create a voting game based on: "${prompt}"

Output ONLY valid JSON with 12-15 rounds. No markdown, no explanation.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate game');
    }

    const data = await response.json();
    let gameDataText = data.content[0].text;

    // Clean up JSON if wrapped in markdown
    gameDataText = gameDataText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse the JSON
    const gameData = JSON.parse(gameDataText);

    // Validate structure
    if (!gameData.rounds || !Array.isArray(gameData.rounds) || gameData.rounds.length === 0) {
      throw new Error('Invalid game structure generated');
    }

    // If roomCode provided, save game data to room
    if (roomCode) {
      const room = await storage.getRoom(roomCode);
      if (room) {
        room.gameData = gameData;
        room.currentRound = 0;
        room.votes = {};
        room.roundComplete = false;
        room.gameComplete = false;
        await storage.setRoom(roomCode, room);
      }
    }

    return res.status(200).json({
      success: true,
      gameData: gameData,
      remaining: rateLimit.remaining
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate game. Please try again.' 
    });
  }
}
