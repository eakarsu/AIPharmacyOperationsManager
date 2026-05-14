const https = require('https');
require('dotenv').config({ path: '../.env' });

async function callOpenRouter(prompt, systemPrompt = 'You are a pharmacy operations AI assistant. Provide professional, accurate, and helpful responses.', messages = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: messages || [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Pharmacy Operations Manager'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
          } else {
            reject(new Error('Unexpected API response'));
          }
        } catch (e) {
          reject(new Error('Failed to parse API response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 3-strategy JSON parser
function parseAIJson(text) {
  // Strategy 1: direct parse
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Strategy 2: extract JSON block from markdown
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (_) {}
  }

  // Strategy 3: find first { or [ to end
  const start = text.search(/[{[]/);
  if (start !== -1) {
    const sub = text.slice(start);
    const end = Math.max(sub.lastIndexOf('}'), sub.lastIndexOf(']'));
    if (end !== -1) {
      try {
        return JSON.parse(sub.slice(0, end + 1));
      } catch (_) {}
    }
  }

  // Return null if all strategies fail
  return null;
}

module.exports = { callOpenRouter, parseAIJson };
