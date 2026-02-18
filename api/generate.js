// Vercel Serverless Function for game generation
// This handles the API calls to Claude so users don't need API keys

import { storage } from './storage.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the API key from environment variables
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error - no API key' });
  }

  // Get the prompt and optional roomCode from request
  const { prompt, roomCode } = req.body;
  
  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Game description is required' });
  }

  // Limit prompt length to prevent abuse
  if (prompt.length > 500) {
    return res.status(400).json({ error: 'Game description too long (max 500 characters)' });
  }

  const systemPrompt = `You are an expert party game developer who creates complete, playable browser games for social gatherings, parties, and group fun using HTML, CSS, and JavaScript in a single file.

CRITICAL RULES:
1. Generate ONLY a complete, valid HTML file - nothing else, no explanation, no markdown
2. The game must be immediately playable - no setup required
3. Include ALL game logic, styles, and assets inline
4. Make the game visually fun, colorful, and party-appropriate
5. For drinking games, use terms like "take a sip" not explicit alcohol references
6. Add score/points system, player turns, or voting mechanics as appropriate
7. The game must work in an iframe sandbox (allow-scripts)
8. Use DOM elements for interactive party games
9. Include clear, easy-to-read instructions
10. Make it social - encourage interaction, laughter, and conversation
11. Add fun sound effects using Web Audio API
12. The game title should match what the user asked for

PARTY GAME BEST PRACTICES:
- For trivia: Make questions fun, surprising, and conversation-starting
- For drinking games: Include "rules" like "take a sip if..." or "drink if you've never..."
- For "Cards Against Humanity" style: Generate hilarious, slightly edgy but not offensive prompts and responses
- For "Never Have I Ever": Create 15-20 varied, funny scenarios
- For "Truth or Dare": Balance embarrassing with funny, keep dares doable
- For voting games ("Most Likely To..."): Generate creative, funny scenarios
- Always include a "Next Round" or "Play Again" button
- Use big, readable fonts - people might be drinking!
- Add animations and celebrations for wins/funny moments

Create a genuinely fun party game that gets people laughing and talking.`;

  const userMessage = `Create a complete playable PARTY GAME for a social gathering based on this description: "${prompt}"

The game should be hilarious, social, and perfect for a party atmosphere. Make it visually fun with bright colors. Include clear instructions, easy navigation, and keep the energy high. If it's a drinking game, use phrases like "take a sip" or "drink if...". Make it memorable!`;

  try {
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API error:', error);
      return res.status(response.status).json({ 
        error: error.error?.message || 'Failed to generate game' 
      });
    }

    const data = await response.json();
    const gameCode = data.content[0].text;

    // Extract HTML if wrapped in markdown
    let html = gameCode;
    const htmlMatch = gameCode.match(/```html\n?([\s\S]*?)```/);
    if (htmlMatch) {
      html = htmlMatch[1];
    } else if (gameCode.includes('<!DOCTYPE') || gameCode.includes('<html')) {
      const start = gameCode.indexOf('<!DOCTYPE') !== -1 
        ? gameCode.indexOf('<!DOCTYPE') 
        : gameCode.indexOf('<html');
      html = gameCode.substring(start);
    }

    // If roomCode provided, save game to room
    if (roomCode) {
      const room = await storage.getRoom(roomCode);
      if (room) {
        room.gameHtml = html;
        await storage.setRoom(roomCode, room);
      }
    }

    // Return the game HTML
    return res.status(200).json({ 
      success: true,
      html: html 
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate game. Please try again.' 
    });
  }
}
