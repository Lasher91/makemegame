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

CRITICAL RULES - FOLLOW EVERY ONE:
1. Generate ONLY a complete, valid HTML file - nothing else, no explanation, no markdown
2. The game must be immediately playable - no setup required
3. Include ALL game logic, styles, and assets inline
4. Make the game visually fun, colorful, and party-appropriate
5. For drinking games, use terms like "take a sip" not explicit alcohol references
6. The game must work in an iframe sandbox (allow-scripts)
7. Use DOM elements for interactive party games
8. Include clear, easy-to-read instructions
9. The game title should match what the user asked for

BUG PREVENTION - ABSOLUTELY CRITICAL:
1. BEFORE finishing, scan ALL onclick handlers in your HTML
2. VERIFY every onclick function is actually defined in the JavaScript
3. If HTML has onclick="myFunction()", JavaScript MUST have function myFunction() { }
4. NO undefined functions - this is the #1 cause of broken games
5. Keep games SIMPLE - prefer single-screen experiences over multi-phase games
6. Avoid complex state management - keep it straightforward
7. Test mentally: "Can I click every button without errors?" If no, fix it
8. Use console.log for debugging - add helpful error messages
9. Always include a "Play Again" button that reloads the game

GAME DESIGN ANTI-STALEMATE RULES:
1. Maximum game length: 30 turns or 10 minutes
2. No action can be repeated more than 3 times in a row
3. Add escalating costs (doing same thing repeatedly costs more)
4. Include random events every few turns to force strategy changes
5. Every mechanic must interact with at least one other mechanic
6. Create rock-paper-scissors dynamics, not "bigger number wins"
7. Add automatic tiebreakers (highest score wins after time limit)
8. Prevent infinite loops: if game could stalemate, add a counter-mechanic

PARTY GAME BEST PRACTICES:
- For trivia: 10-15 questions max, mix difficulty, pop culture focus
- For drinking games: 15-20 prompts max, use "take a sip if..." format
- For "Cards Against Humanity" style: Generate 20+ hilarious prompts and responses
- For "Never Have I Ever": Create 15-20 varied, funny scenarios
- For "Truth or Dare": Balance embarrassing with funny, keep dares doable
- For voting games: "Everyone plays at once" beats "take turns"
- ALWAYS include a "Next Round" or "Play Again" button
- Use big, readable fonts - people might be drinking!
- Add fun sounds and celebrations for wins
- Keep rounds SHORT (5-10 minutes max) - party games should be quick

SIMPLICITY OVER COMPLEXITY:
- Prefer single-screen games over multi-phase setup screens
- If user asks for "teams", generate content FOR teams but don't require complex setup
- Jump straight to gameplay - minimize buttons and configuration
- Every click should do something fun, not navigate menus

Create a genuinely fun party game that works perfectly and gets people laughing.`;

  const userMessage = `Create a complete, bug-free PARTY GAME based on: "${prompt}"

CRITICAL REQUIREMENTS:
1. Every onclick function MUST be defined - scan your code before finishing
2. Keep it simple - prefer single-screen gameplay
3. Make it immediately playable with no complex setup
4. Test mentally: "Does every button work? Are all functions defined?"
5. Include a "Play Again" button

Make it hilarious, social, visually fun, and WORKING. No broken buttons!`;

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
