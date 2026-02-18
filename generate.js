// Vercel Serverless Function for game generation
// This handles the API calls to Claude so users don't need API keys

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

  // Get the game prompt from the request
  const { prompt } = req.body;
  
  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Game description is required' });
  }

  // Limit prompt length to prevent abuse
  if (prompt.length > 500) {
    return res.status(400).json({ error: 'Game description too long (max 500 characters)' });
  }

  const systemPrompt = `You are an expert game developer who creates complete, playable browser games using HTML, CSS, and JavaScript in a single file.

RULES:
1. Generate ONLY a complete, valid HTML file - nothing else, no explanation, no markdown
2. The game must be immediately playable - no setup required
3. Include ALL game logic, styles, and assets inline
4. Make the game visually appealing with a dark theme
5. Add a score system where appropriate
6. Add clear instructions within the game UI
7. The game must work in an iframe sandbox (allow-scripts)
8. Use canvas or DOM elements - no external libraries
9. Make it fun and polished
10. Add sound effects using the Web Audio API where appropriate
11. The game title should match what the user asked for

Create a genuinely fun, complete game. Be creative with the mechanics.`;

  const userMessage = `Create a complete playable browser game based on this description: "${prompt}"

The game should be creative, fun, and immediately playable. Include a score system, lives/health if appropriate, and a game over screen with restart option. Make it visually polished with animations.`;

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
