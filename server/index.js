const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.error('❌ Failed to load .env file:', dotenvResult.error.message);
  process.exit(1);
}
console.log("Current working directory:", process.cwd()); 
console.log('Loaded OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/generate-ui', async (req, res) => {
  console.log('Received request to /api/generate-ui with body:', req.body);
  const prompt = req.body.prompt;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!prompt) {
    console.error('No prompt provided in request');
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!apiKey) {
    console.error('OpenAI API key is missing');
    return res.status(500).json({ error: 'OpenAI API key is missing' });
  }

  try {
    console.log('Sending request to OpenAI API');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Changed to gpt-3.5-turbo for broader access
        messages: [
          {
            role: 'user',
            content: `
Generate a React UI description as JSON ONLY (no explanation, no extra text, no markdown). 
Each element must have "type", optional "props", and optional "children".
Example:
{
  "type": "div",
  "props": { "style": { "padding": "20px" } },
  "children": [
    { "type": "h1", "props": { "children": "Hello World" } },
    { "type": "button", "props": { "children": "Click me", "onClick": "You clicked!" } }
  ]
}
Now, generate the JSON UI for this prompt: "${prompt}"
            `.trim(),
          },
        ],
      }),
    });

    console.log('OpenAI API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return res.status(500).json({ error: 'OpenAI API request failed', details: errorText });
    }

    const data = await response.json();

    if (!data.choices || !data.choices.length) {
      console.error('No choices in OpenAI response:', data);
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    let content = data.choices[0].message.content.trim();
    console.log('Raw OpenAI response content:', content);
    if (content.startsWith('```')) {
      content = content.replace(/```json?\n?/, '').replace(/```$/, '');
    }

    try {
      const parsed = JSON.parse(content); // Validate JSON
      console.log('Sending UI JSON to client:', parsed);
      res.json({ ui: parsed }); // <-- Send parsed JSON, not string
    } catch (error) {
      console.error('Failed to parse OpenAI response as JSON:', content, error);
      res.status(500).json({ error: 'Invalid JSON from OpenAI', details: error.message });
    }
  } catch (error) {
    console.error('Error in /api/generate-ui:', error);
    res.status(500).json({ error: 'OpenAI API call failed', details: error.message });
  }
});

const PORT = 5000;
try {
  app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
